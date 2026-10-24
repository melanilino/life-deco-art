// Datos sintéticos: solo scripts/panel-dev-server.mjs --fixtures sirve este adaptador.
import {emptyState,applyCommand} from '/panel/domain.mjs';
let state=emptyState();const logs=[];let index=0;
function run(cmd){const change=applyCommand(state,cmd,{id:`test-${++index}`,at:'2026-09-07T14:00:00Z'});state=change.state;logs.push(change.history);return change;}
run({action:'save',kind:'clients',data:{name:'Cliente de prueba',email:'prueba@example.invalid'}});
run({action:'save',kind:'materials',data:{name:'Papel de prueba',unit:'hojas',packageUnits:20,packageCost:200,track:true,minimum:5}});
run({action:'save',kind:'calculations',data:{name:'Cálculo de prueba',units:2,hours:1,hourly:200,other:0,packaging:20,mode:'margin',margin:40,feePercent:0,materials:[{materialId:'test-2',description:'Papel de prueba',quantity:2,unitCost:10}]}});
run({action:'save',kind:'quotes',data:{name:'Trabajo de prueba',clientId:'test-1',date:'2026-09-07',validUntil:'2026-09-30',lines:[{description:'Pieza de prueba',quantity:2,price:200}]}});
run({action:'save',kind:'tasks',data:{name:'Revisar materiales de prueba',date:'2026-09-07',priority:'alta',status:'pendiente',repeat:'semanal'}});
run({action:'adjustStock',materialId:'test-2',quantity:10,reason:'Existencias de prueba'});
run({action:'save',kind:'resources',data:{name:'Imagen con error simulado',path:'panel-private/fixture-only/error',mime:'image/png',role:'referencia',visibility:'interno'}});
if(new URLSearchParams(location.search).has('statistics-fixture')){
 run({action:'save',kind:'clients',id:'test-1',data:{source:'Referido',ageRange:'25–34',gender:'Mujer'}});
 for(const [date,description,quantity,price] of [['2025-03-05','Pieza de prueba',1,100],['2026-03-05','Pieza de prueba',2,200],['2026-06-05','Servicio de prueba',1,700],['2026-09-05','Pieza de prueba',4,200]]){
 const invoice=run({action:'save',kind:'invoices',data:{name:description,clientId:'test-1',date,lines:[{description,quantity,price}]}});
 run({action:'issue',id:invoice.result});
 }
}
if(new URLSearchParams(location.search).has('content-fixture')){
 for(let i=0;i<12;i++)run({action:'save',kind:'content',data:{name:'Contenido de prueba '+String(i+1).padStart(2,'0'),format:i%2?'Carrusel':'Video',stage:['idea','en preparación','listo'][i%3],publications:i===0?[]:[{id:'instagram',platform:'Instagram',date:'2026-10-12',time:'19:00',status:i===3?'publicado':'pendiente',actualDate:i===3?'2026-10-10':''},{id:'tiktok',platform:'TikTok',date:'2026-10-14',time:'18:00',status:'pendiente',actualDate:''}]}});
 run({action:'save',kind:'content',data:{name:'Contenido antiguo de prueba',channel:'Instagram',status:'programado',date:'2026-10-16',copy:'Texto anterior'}});
}
if(new URLSearchParams(location.search).has('agenda-fixture')){
 for(const [name,start,end] of [['Actividad de prueba 1','2026-10-24T09:15','2026-10-24T10:00'],['Actividad simultánea','2026-10-24T09:30','2026-10-24T10:30']])run({action:'agenda-save',data:{name,start,end,recordType:'activity',status:'pendiente',priority:'media'}});
 for(const [name,date,status] of [['Tarea vencida','2026-10-22','pendiente'],['Tarea de hoy','2026-10-24','pendiente'],['Tarea futura','2026-10-28','en curso'],['Tarea sin fecha','','pendiente'],['Tarea completada','','completada']])run({action:'agenda-save',data:{name,date,status,recordType:'task',priority:'media'}});
 run({action:'save',kind:'orders',data:{name:'Entrega de prueba',clientId:'test-1',due:'2026-10-24'}});
 run({action:'save',kind:'content',data:{name:'Publicación de prueba',stage:'listo',publications:[{id:'ig',platform:'Instagram',date:'2026-10-24',time:'11:15',status:'pendiente'}]}});
 const saved=sessionStorage.getItem('agenda-fixture-state');if(saved){state=JSON.parse(saved);index=Math.max(index,...Object.keys(state.records).map(id=>Number(id.replace('test-',''))||0));}
}
export const observeAuth=fn=>{queueMicrotask(()=>fn({uid:'fixture-only'}));return ()=>{};};
export const load=async()=>structuredClone(state);
let failSchedule=new URLSearchParams(location.search).has('agenda-failure');
export const commit=async cmd=>{if(failSchedule&&cmd.action==='agenda-schedule'){failSchedule=false;throw Error('Fallo de guardado simulado.');}const r=run(cmd);if(new URLSearchParams(location.search).has('agenda-fixture'))sessionStorage.setItem('agenda-fixture-state',JSON.stringify(state));return r;};
export const history=async()=>logs;
export const logout=async()=>location.reload();
export const login=async()=>{};
export const resetPassword=async()=>{};
export const upload=async()=>{throw Error('Los archivos se verifican contra Firebase privado, no en esta prueba local.');};
export const downloadFile=async()=>{throw Error('Sin archivos de prueba.');};
export const exportBackup=async()=>({format:'life-deco-art-panel',schema:1,state});
export const restoreBackup=async()=>{throw Error('La recuperación se verifica con pruebas de almacenamiento.');};
