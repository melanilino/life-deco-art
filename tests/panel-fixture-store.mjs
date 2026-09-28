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
export const observeAuth=fn=>{queueMicrotask(()=>fn({uid:'fixture-only'}));return ()=>{};};
export const load=async()=>structuredClone(state);
export const commit=async cmd=>run(cmd);
export const history=async()=>logs;
export const logout=async()=>location.reload();
export const login=async()=>{};
export const resetPassword=async()=>{};
export const upload=async()=>{throw Error('Los archivos se verifican contra Firebase privado, no en esta prueba local.');};
export const downloadFile=async()=>{throw Error('Sin archivos de prueba.');};
export const exportBackup=async()=>({format:'life-deco-art-panel',schema:1,state});
export const restoreBackup=async()=>{throw Error('La recuperación se verifica con pruebas de almacenamiento.');};
