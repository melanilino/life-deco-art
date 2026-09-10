import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore,doc,collection,getDoc,getDocs,runTransaction} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {getStorage,ref,uploadBytes,getBlob} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import {emptyState,applyCommand} from './domain.mjs';
import {planRecovery} from './recovery.mjs';
import {firebaseConfig} from './firebase-config.mjs';

const app=getApps().find(app=>app.name==='life-deco-art-hub')||initializeApp(firebaseConfig,'life-deco-art-hub'),db=getFirestore(app),auth=getAuth(app),storage=getStorage(app);
let user=null,current=null,session=0;
export const observeAuth=callback=>onAuthStateChanged(auth,u=>{session++;user=u;current=null;callback(u);});
export const login=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const logout=()=>signOut(auth);
export const resetPassword=email=>sendPasswordResetEmail(auth,email);
function root(){if(!user)throw Error('Inicia sesión para continuar.');return `panelData/${user.uid}`;}
export async function load(){
 const active=session,base=root(),uid=user.uid;
 const access=await getDoc(doc(db,'panelAccess',uid));
 if(active!==session)throw Error('La sesión cambió. Vuelve a iniciar sesión.');
 if(!access.exists()||access.data().enabled!==true)throw Error('PANEL_ACCESS_PENDING');
 // Meta is read before and after the records: reject torn snapshots across concurrent commits.
 for(let attempt=0;attempt<3;attempt++){
  const before=await getDoc(doc(db,base,'meta','state'));
  const records=await getDocs(collection(db,base,'records'));
  const after=await getDoc(doc(db,base,'meta','state'));
  if(active!==session)throw Error('La sesión cambió. Vuelve a iniciar sesión.');
  if((before.data()?.version||0)!==(after.data()?.version||0))continue;
  current={...emptyState(),...after.data(),records:Object.fromEntries(records.docs.map(d=>[d.id,d.data()]))};return current;
 }
 throw Error('Los datos están cambiando en otra ventana. Vuelve a actualizar.');
}
export async function commit(cmd){
 if(!navigator.onLine)throw Error('No hay conexión. Conserva el formulario y vuelve a intentar cuando regrese internet.');
 if(!current)throw Error('Espera a que terminen de cargar tus datos.');
 const active=session,base=root(),previous=current,id=crypto.randomUUID(),change=applyCommand(previous,cmd,{id});
 if(new TextEncoder().encode(JSON.stringify(change.history)).length>850000)throw Error('Esta operación es demasiado grande para conservar su historial. Divídela en operaciones menores.');
 if(change.changed.length>450)throw Error('Esta operación contiene demasiados registros. Divídela en operaciones menores.');
 await runTransaction(db,async tx=>{
  const metaRef=doc(db,base,'meta','state'),meta=await tx.get(metaRef);
  if(active!==session)throw Error('La sesión cambió. Vuelve a iniciar sesión.');
  if((meta.data()?.version||0)!==previous.version)throw Error('Los datos cambiaron en otra ventana. Actualiza el panel antes de guardar.');
  const {records,...head}=change.state;tx.set(metaRef,head);
  for(const key of change.changed)tx.set(doc(db,base,'records',key),records[key]);
  tx.set(doc(db,base,'history',id),change.history);
 });
 if(active!==session)throw Error('La sesión cambió. Comprueba el último cambio al volver a entrar.');
 current=change.state;return change;
}
export async function history(){const rows=await getDocs(collection(db,root(),'history'));return rows.docs.map(d=>d.data()).sort((a,b)=>b.at.localeCompare(a.at));}
export async function upload(file){
 if(!file||file.size>15*1024*1024)throw Error('El archivo debe pesar como máximo 15 MB.');
 if(!/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|application\/pdf)$/.test(file.type))throw Error('Utiliza una imagen PNG, JPG, WebP o GIF, video MP4/WebM o PDF.');
 const path=`panel-private/${user.uid}/${crypto.randomUUID()}`;
 await uploadBytes(ref(storage,path),file,{contentType:file.type,customMetadata:{originalName:file.name}});
 return {path,fileName:file.name,mime:file.type,size:file.size};
}
export const downloadFile=path=>{if(!path.startsWith(`panel-private/${user.uid}/`))throw Error('El archivo no pertenece a tu panel.');return getBlob(ref(storage,path),15*1024*1024);};
export async function exportBackup(includeFiles=true){
 const state=await load(),logs=await history(),files=[];
 if(includeFiles)for(const r of Object.values(state.records).filter(r=>r.path)){
  const blob=await downloadFile(r.path),data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
  files.push({resourceId:r.id,path:r.path,fileName:r.fileName,mime:r.mime,data});
 }
 return {format:'life-deco-art-panel',schema:1,owner:user.uid,exportedAt:new Date().toISOString(),includesFiles:includeFiles,state,history:logs,files};
}
export async function restoreBackup(backup){
 // Restore missing records only: never overwrite current invoices or financial history.
 const state=await load(),plan=planRecovery(state,backup,user.uid),missing=plan.records;
 // Each restored blob receives a new private path: current files are never overwritten.
 const restoredPaths=new Map();for(const f of plan.files){const blob=await(await fetch(f.data)).blob(),uploaded=await upload(new File([blob],f.fileName||'archivo',{type:blob.type}));Object.assign(missing.find(r=>r.id===f.resourceId),uploaded);restoredPaths.set(f.path,uploaded.path);}
 for(const r of missing)if(r.issuer?.logoPath&&restoredPaths.has(r.issuer.logoPath))r.issuer.logoPath=restoredPaths.get(r.issuer.logoPath);
 await runTransaction(db,async tx=>{
  const metaRef=doc(db,root(),'meta','state'),meta=await tx.get(metaRef);if((meta.data()?.version||0)!==state.version)throw Error('Los datos cambiaron. Repite la recuperación.');
  const {records,...head}=state;tx.set(metaRef,{...head,counters:plan.counters,version:state.version+1});
  for(const r of missing)tx.set(doc(db,root(),'records',r.id),r);
  const id=crypto.randomUUID();tx.set(doc(db,root(),'history',id),{id,at:new Date().toISOString(),action:'restore-missing',target:'',changed:missing.map(r=>r.id)});
 });return {count:missing.length,state:await load()};
}
