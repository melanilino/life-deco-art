import {planRecovery} from '/panel/recovery.mjs';
// Datos sintéticos: solo scripts/panel-dev-server.mjs --fixtures sirve este adaptador.
import {emptyState,applyCommand,today} from '/panel/domain.mjs';
let state=emptyState();const logs=[];let index=0;
function run(cmd){const change=applyCommand(state,cmd,{id:`test-${++index}`,at:'2026-09-07T14:00:00Z'});state=change.state;logs.push(change.history);return change;}
run({action:'save',kind:'clients',data:{name:'Cliente de prueba',email:'prueba@example.invalid'}});
run({action:'save',kind:'materials',data:{name:'Papel de prueba',unit:'hojas',packageUnits:20,packageCost:200,track:true,minimum:5}});
run({action:'save',kind:'calculations',data:{name:'Cálculo de prueba',units:2,hours:1,hourly:200,other:0,packaging:20,mode:'margin',margin:40,feePercent:0,materials:[{materialId:'test-2',description:'Papel de prueba',quantity:2,unitCost:10}]}});
run({action:'save',kind:'quotes',data:{name:'Trabajo de prueba',clientId:'test-1',date:'2026-09-07',validUntil:'2026-09-30',lines:[{description:'Pieza de prueba',quantity:2,price:200}]}});
run({action:'save',kind:'tasks',data:{name:'Revisar materiales de prueba',date:'2026-09-07',priority:'alta',status:'pendiente',repeat:'semanal'}});
run({action:'adjustStock',materialId:'test-2',quantity:10,reason:'Existencias de prueba'});
run({action:'save',kind:'resources',data:{name:'Imagen con error simulado',path:'panel-private/fixture-only/error',mime:'image/png',role:'referencia',visibility:'interno'}});
if(new URLSearchParams(location.search).has('catalog-pages-fixture')){
 for(let i=1;i<=23;i++){run({action:'save',kind:'products',data:{name:'Producto ficticio '+String(i).padStart(2,'0'),itemType:i%2?'producto':'servicio',price:100+i}});run({action:'save',kind:'materials',data:{name:'Material ficticio '+i,packageUnits:1}});const supplier=run({action:'save',kind:'suppliers',data:{name:'Proveedor ficticio '+i}}).result;run({action:'save',kind:'purchases',data:{name:'Compra ficticia '+i,supplierId:supplier,items:[{materialId:'test-2',quantity:1,subtotal:100}],total:100}});}
}
if(new URLSearchParams(location.search).has('orders-progress-fixture')){
 const date=today(),before=new Date(date+'T12:00:00Z');before.setUTCDate(before.getUTCDate()-2);const due=before.toISOString().slice(0,10),data={name:'Pedido ficticio esperando y atrasado',clientId:'test-1',due,lines:[{description:'Pieza ficticia',quantity:1,price:100}]};
 const waiting=run({action:'save',kind:'orders',data}).result;run({action:'order-progress',id:waiting,stage:'producción',waiting:true});
 const canceled=run({action:'save',kind:'orders',data:{...data,name:'Pedido ficticio cancelado'}}).result;run({action:'status',id:canceled,status:'cancelado',reason:'Cancelación ficticia'});state.records[canceled].stage='diseño';state.records[canceled].condition='esperando cliente';
 const delivered=run({action:'save',kind:'orders',data:{...data,name:'Pedido ficticio entregado'}}).result;run({action:'order-progress',id:delivered,stage:'entregado',waiting:true});
}
if(new URLSearchParams(location.search).has('orders-fixture')){
 const quote=run({action:'save',kind:'quotes',data:{name:'Proyecto ficticio con cotización',clientId:'test-1',date:today(),lines:[{description:'Pieza con composición ficticia',quantity:1,price:100,productId:'producto-ficticio',composition:{recipe:[{materialId:'test-2',quantity:2}]}}],discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,terms:'Condiciones ficticias que deben conservarse',notes:'Notas ficticias'}}).result;
 run({action:'issue',id:quote});run({action:'approve',id:quote});const order=run({action:'convert',id:quote,kind:'orders'}).result;
 run({action:'save',kind:'orders',id:order,data:{due:today(),description:'Detalle de producción ficticio'}});
 const saved=sessionStorage.getItem('orders-fixture-state');if(saved){state=JSON.parse(saved);index=Math.max(index,...Object.keys(state.records).map(id=>Number(id.replace('test-',''))||0));}
}
if(new URLSearchParams(location.search).has('sales-pages-fixture')){
 for(const kind of ['quotes','invoices'])for(let i=1;i<=22;i++)run({action:'save',kind,data:{name:i===1?'Proyecto ficticio con un título muy extenso para comprobar que el contenido de las tablas se mantiene legible sin desbordar el espacio disponible':'Trabajo ficticio '+String(i).padStart(2,'0'),clientId:'test-1',date:today(),due:today(),validUntil:today(),lines:[{description:'Artículo ficticio',quantity:1,price:100+i}]}});
}
if(new URLSearchParams(location.search).has('clients-fixture')){
 for(let i=1;i<=22;i++)run({action:'save',kind:'clients',data:{name:i===1?'Empresa de prueba con un nombre comercial extenso para comprobar los espacios y la lectura en el listado':'Cliente de prueba '+String(i).padStart(2,'0'),clientType:i%2?'company':'person',phone:'809555'+String(i).padStart(4,'0'),email:'cliente'+i+'@example.invalid',tags:i%3?'Frecuente':'Taller'}});
 const old=run({action:'save',kind:'orders',data:{name:'Pedido anterior actualizado',clientId:'test-1',lines:[],status:'pendiente'}}).result;
 const recent=run({action:'save',kind:'orders',data:{name:'Pedido más reciente',clientId:'test-1',lines:[],status:'pendiente'}}).result;
 state.records[old].createdAt='2026-09-01T14:00:00Z';state.records[old].updatedAt='2026-10-31T14:00:00Z';state.records[recent].createdAt='2026-10-01T14:00:00Z';
}
if(new URLSearchParams(location.search).has('sales-metrics-fixture')){
 const date=today(),after=new Date(date+'T12:00:00Z'),before=new Date(date.slice(0,7)+'-01T12:00:00Z');after.setUTCDate(after.getUTCDate()+3);before.setUTCDate(before.getUTCDate()-1);const valid=after.toISOString().slice(0,10),previous=before.toISOString().slice(0,10);
 const proposal=(name,price,until=valid)=>{const id=run({action:'save',kind:'quotes',data:{name,clientId:'test-1',date,validUntil:until,lines:[{description:'Pieza ficticia',quantity:1,price}]}}).result;run({action:'issue',id});return id;};
 const root=proposal('Propuesta ficticia versionada',100),revision=run({action:'revise',id:root}).result;run({action:'save',kind:'quotes',id:revision,data:{validUntil:valid,lines:[{description:'Pieza ficticia revisada',quantity:1,price:200}]}});run({action:'issue',id:revision});run({action:'revise',id:revision});
 const accepted=proposal('Propuesta ficticia aceptada sin convertir',150);run({action:'approve',id:accepted});
 const converted=proposal('Propuesta ficticia convertida',500);run({action:'approve',id:converted});run({action:'convert',id:converted,kind:'orders'});
 proposal('Propuesta ficticia vencida',300,previous);
 const cancelled=proposal('Propuesta ficticia cancelada',400);run({action:'status',id:cancelled,status:'cancelada',reason:'Comprobación ficticia'});
 const invoice=(name,price,when=date,orderId='')=>{const id=run({action:'save',kind:'invoices',data:{name,clientId:'test-1',date:when,due:when,orderId,lines:[{description:'Pieza ficticia',quantity:1,price}]}}).result;run({action:'issue',id});return id;};
 const direct=invoice('Factura ficticia con pago parcial',200),payment=run({action:'payment',target:direct,amount:50,date}).result;run({action:'payment',target:direct,type:'refund',originalId:payment,amount:10,date,reason:'Prueba'});
 const order=run({action:'save',kind:'orders',data:{name:'Pedido ficticio con anticipo anterior',clientId:'test-1',lines:[{description:'Pieza',quantity:1,price:100}]}}).result,advance=run({action:'payment',target:order,amount:30,date:previous}).result;invoice('Factura ficticia con anticipo aplicado',100,date,order);run({action:'payment',target:order,type:'refund',originalId:advance,amount:5,date,reason:'Prueba'});
 const unbilled=run({action:'save',kind:'orders',data:{name:'Pedido ficticio sin facturar',clientId:'test-1',lines:[{description:'Pieza',quantity:1,price:100}]}}).result;run({action:'payment',target:unbilled,amount:20,date});
 const voided=invoice('Factura ficticia anulada',300);run({action:'status',id:voided,status:'anulada',reason:'Prueba'});invoice('Factura ficticia de otro mes',400,previous);run({action:'save',kind:'invoices',data:{name:'Factura ficticia en borrador',clientId:'test-1',date,lines:[{description:'Pieza',quantity:1,price:999}]}});
 run({action:'finance-entry',data:{direction:'income',name:'Ingreso independiente ficticio',category:'Prueba',amount:99,date,method:'Efectivo'}});
}
if(new URLSearchParams(location.search).has('sales-fixture')){
 run({action:'save',kind:'quotes',id:'test-4',data:{discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,due:'2026-11-10',terms:'Condición de prueba: conservar el texto acordado.'}});
 const c=run({action:'save',kind:'clients',data:{name:'Cliente archivado de prueba',phone:'8095550199'}}).result;
 run({action:'save',kind:'invoices',data:{name:'Factura de prueba con ajustes',clientId:c,date:'2026-11-01',due:'2026-11-10',lines:[{description:'Pieza de prueba',quantity:1,price:100}],discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,terms:'Condición personalizada de prueba: dos pagos acordados.'}});
 run({action:'archive',id:c});
 const saved=sessionStorage.getItem('sales-fixture-state');if(saved){state=JSON.parse(saved);index=Math.max(index,...Object.keys(state.records).map(id=>Number(id.replace('test-',''))||0));}
}
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
if(new URLSearchParams(location.search).has('admin-fixture')){
 run({action:'admin-subscription',data:{name:'Plataforma de prueba',usage:'Diseño de prueba',plan:'Plan de prueba',cost:1200,currency:'DOP',frequency:'anual',renewal:'2026-10-28',status:'activo'}});
 run({action:'admin-subscription',data:{name:'Servicio de prueba en USD',usage:'Almacenamiento de prueba',plan:'Plan de prueba',cost:10,currency:'USD',frequency:'mensual',renewal:'2026-10-30',status:'activo'}});
 const saved=sessionStorage.getItem('admin-fixture-state');if(saved){state=JSON.parse(saved);index=Math.max(index,...Object.keys(state.records).map(id=>Number(id.replace('test-',''))||0));}
}
export const observeAuth=fn=>{queueMicrotask(()=>fn({uid:'fixture-only',email:'prueba@example.invalid',providerData:[{providerId:'password'}]}));return ()=>{};};
export const load=async()=>structuredClone(state);
let failSchedule=new URLSearchParams(location.search).has('agenda-failure');
let failOrderProgress=new URLSearchParams(location.search).has('orders-progress-failure');
let failOrder=new URLSearchParams(location.search).has('orders-failure');
let failSales=new URLSearchParams(location.search).get('sales-failure');
export const commit=async cmd=>{if(failOrderProgress&&cmd.action==='order-progress'){failOrderProgress=false;throw Error('Fallo de avance ficticio.');}if(failOrder&&cmd.action==='save'&&cmd.kind==='orders'){failOrder=false;throw Error('Fallo de guardado ficticio.');}if(failSales&&(cmd.action==='issue'&&failSales==='issue'||cmd.action==='save'&&['quotes','invoices'].includes(cmd.kind)&&failSales==='save')){failSales='';throw Error('Fallo de prueba en '+cmd.action+'.');}if(failSchedule&&cmd.action==='agenda-schedule'){failSchedule=false;throw Error('Fallo de guardado simulado.');}const r=run(cmd);if(new URLSearchParams(location.search).has('orders-fixture'))sessionStorage.setItem('orders-fixture-state',JSON.stringify(state));if(new URLSearchParams(location.search).has('sales-fixture'))sessionStorage.setItem('sales-fixture-state',JSON.stringify(state));if(new URLSearchParams(location.search).has('agenda-fixture'))sessionStorage.setItem('agenda-fixture-state',JSON.stringify(state));if(new URLSearchParams(location.search).has('admin-fixture'))sessionStorage.setItem('admin-fixture-state',JSON.stringify(state));return r;};
export const history=async()=>logs;
export const logout=async()=>location.reload();
export const login=async()=>{};
export const resetPassword=async()=>{};
export const upload=async()=>{throw Error('Los archivos se verifican contra Firebase privado, no en esta prueba local.');};
export const downloadFile=async()=>{throw Error('Sin archivos de prueba.');};
export const exportBackup=async includeFiles=>({format:'life-deco-art-panel',schema:1,owner:'fixture-only',state:structuredClone(state),includesFiles:includeFiles,files:[],history:logs,exportedAt:new Date().toISOString()});
export const restoreBackup=async backup=>{if(!new URLSearchParams(location.search).has('admin-fixture'))throw Error('La recuperación se verifica con pruebas de almacenamiento.');const plan=planRecovery(state,backup,'fixture-only');state={...state,counters:plan.counters,version:state.version+1,records:{...state.records,...Object.fromEntries(plan.records.map(r=>[r.id,r]))}};sessionStorage.setItem('admin-fixture-state',JSON.stringify(state));return {count:plan.records.length,state:structuredClone(state)};};

run({action:'save',kind:'resources',data:{name:'Nota ficticia',title:'Nota ficticia',note:'Texto de prueba para comprobar estabilidad.',recordType:'quick-note',status:'activo'}});
state.settings.homePhrases={items:['Frase ficticia para comprobar estabilidad.'],startDate:'2026-11-07'};
