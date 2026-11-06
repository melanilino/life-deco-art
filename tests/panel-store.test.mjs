import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import * as domain from '../panel/domain.mjs';import * as recovery from '../panel/recovery.mjs';

async function harness({changeUserOnUpload=false}={}){
 const docs=new Map([['panelAccess/owner',{enabled:true}]]);let fail=false;let listener;const user={uid:'owner'};
 const snap=path=>({exists:()=>docs.has(path),data:()=>structuredClone(docs.get(path))});
 const firestore={getFirestore:()=>({}),doc:(_,...parts)=>parts.join('/'),collection:(_,...parts)=>parts.join('/'),getDoc:async path=>snap(path),getDocs:async path=>({docs:[...docs].filter(([p])=>p.startsWith(path+'/')).map(([p,v])=>({id:p.split('/').at(-1),data:()=>structuredClone(v)}))}),runTransaction:async(_db,fn)=>{const writes=[];await fn({get:async path=>snap(path),set:(path,value)=>writes.push([path,structuredClone(value)])});if(fail)throw Error('NETWORK_TEST');for(const [p,v]of writes)docs.set(p,v);}};
 const ctx=vm.createContext({console,structuredClone,TextEncoder,crypto,navigator:{onLine:true},Blob,File,fetch});
 const exports={app:{initializeApp:()=>({}),getApps:()=>[]},auth:{getAuth:()=>({}),signInWithEmailAndPassword:async()=>{},signOut:async()=>listener(null),onAuthStateChanged:(_a,fn)=>{listener=fn;fn(user);return ()=>{};},sendPasswordResetEmail:async()=>{}},firestore,storage:{getStorage:()=>({}),ref:(_s,p)=>p,uploadBytes:async()=>{if(changeUserOnUpload)listener({uid:"other-owner"});},getBlob:async()=>new Blob(['test'],{type:'image/png'})},domain,recovery,config:{firebaseConfig:{}}};
 const source=await fs.readFile(new URL('../panel/store.mjs',import.meta.url),'utf8');const module=new vm.SourceTextModule(source,{context:ctx});
 await module.link(async spec=>{const group=spec.includes('firebase-app')?'app':spec.includes('firebase-auth')?'auth':spec.includes('firebase-firestore')?'firestore':spec.includes('firebase-storage')?'storage':spec.includes('domain.mjs')?'domain':spec.includes('recovery.mjs')?'recovery':'config';const values=exports[group];return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context:ctx});});await module.evaluate();module.namespace.observeAuth(()=>{});
 return {store:module.namespace,docs,set fail(value){fail=value;}};
}
test('transacción conserva registro, secuencia e historial juntos',async()=>{const h=await harness();await h.store.load();await h.store.commit({action:'save',kind:'clients',data:{name:'Prueba'}});assert.equal(h.docs.get('panelData/owner/meta/state').version,1);assert.equal([...h.docs.keys()].filter(k=>k.includes('/records/')).length,1);assert.equal([...h.docs.keys()].filter(k=>k.includes('/history/')).length,1);});
test('fallo de transacción no guarda parcialmente ni adelanta la vista',async()=>{const h=await harness();await h.store.load();h.fail=true;await assert.rejects(h.store.commit({action:'save',kind:'clients',data:{name:'Prueba'}}),/NETWORK_TEST/);assert.equal(h.docs.size,1);h.fail=false;const r=await h.store.commit({action:'save',kind:'clients',data:{name:'Prueba'}});assert.equal(r.state.version,1);});
test('pestaña obsoleta no sobrescribe otra sesión',async()=>{const h=await harness();await h.store.load();h.docs.set('panelData/owner/meta/state',{...domain.emptyState(),version:5});await assert.rejects(h.store.commit({action:'save',kind:'clients',data:{name:'Prueba'}}),/otra ventana/);assert.equal(h.docs.get('panelData/owner/meta/state').version,5);});
test('usuario no habilitado no carga el panel',async()=>{const h=await harness();h.docs.set('panelAccess/owner',{enabled:false});await assert.rejects(h.store.load(),/PANEL_ACCESS_PENDING/);});

test('avance y espera del pedido se guardan juntos y un fallo no deja una etapa parcial',async()=>{
 const h=await harness();await h.store.load();const client=await h.store.commit({action:'save',kind:'clients',data:{name:'Cliente ficticio'}}),order=await h.store.commit({action:'save',kind:'orders',data:{name:'Pedido ficticio',clientId:client.result,due:'2026-11-05'}}),before=h.docs.get('panelData/owner/records/'+order.result),logs=[...h.docs.keys()].filter(p=>p.includes('/history/')).length;
 h.fail=true;await assert.rejects(h.store.commit({action:'order-progress',id:order.result,stage:'producción',waiting:true}),/NETWORK_TEST/);assert.deepEqual(h.docs.get('panelData/owner/records/'+order.result),before);
 h.fail=false;const result=await h.store.commit({action:'order-progress',id:order.result,stage:'producción',waiting:true});assert.equal(result.state.records[order.result].stage,'producción');assert.equal(result.state.records[order.result].condition,'esperando cliente');assert.equal([...h.docs.keys()].filter(p=>p.includes('/history/')).length,logs+1);
});

test('registro financiero y pago se guardan juntos o ninguno ante un fallo',async()=>{
 const h=await harness();await h.store.load();const cmd={action:'finance-entry',data:{name:'Ingreso atómico',direction:'income',category:'Prueba',amount:100,date:'2026-09-26',method:'Efectivo'}};
 h.fail=true;await assert.rejects(h.store.commit(cmd),/NETWORK_TEST/);assert.equal(h.docs.size,1);
 h.fail=false;const result=await h.store.commit(cmd);assert.equal(domain.list(result.state,'expenses').length,1);assert.equal(domain.list(result.state,'payments').length,1);assert.equal(domain.cashflow(result.state).entries.length,1);assert.equal([...h.docs.keys()].filter(k=>k.includes('/history/')).length,1);
});

test('cobro de suscripción se guarda completo y con autor, o no se guarda nada',async()=>{const h=await harness();await h.store.load();const created=await h.store.commit({action:'admin-subscription',data:{name:'Suscripción de prueba',cost:100,currency:'DOP',frequency:'mensual',status:'activo',renewal:'2026-10-28'}});const before=[...h.docs].length;h.fail=true;await assert.rejects(h.store.commit({action:'admin-charge',id:created.result,data:{mode:'new',period:'2026-10-28',date:'2026-10-28',amount:100,method:'Tarjeta'}}),/NETWORK_TEST/);assert.equal(h.docs.size,before);h.fail=false;const result=await h.store.commit({action:'admin-charge',id:created.result,data:{mode:'new',period:'2026-10-28',date:'2026-10-28',amount:100,method:'Tarjeta'}});assert.equal(domain.list(result.state,'payments').length,1);const logs=[...h.docs].filter(([p])=>p.includes('/history/')).map(([,v])=>v);assert.ok(logs.every(h=>h.actor.uid==='owner'));});

test('recuperación se detiene si cambia la cuenta durante una subida',async()=>{
 const h=await harness({changeUserOnUpload:true});
 const path='panel-private/owner/old-file';
 const state=domain.emptyState();
 state.records.r={id:'r',kind:'resources',name:'Adjunto ficticio',path};
 const backup={format:'life-deco-art-panel',schema:1,owner:'owner',state,files:[{resourceId:'r',path,fileName:'archivo.png',data:'data:image/png;base64,AA=='}]};
 await assert.rejects(h.store.restoreBackup(backup),/La sesión cambió/);
 assert.equal([...h.docs.keys()].filter(key=>key.startsWith('panelData/')).length,0);
});
