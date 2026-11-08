import {catalogCostOf} from './catalog-cost.mjs';
import {normalizePhrases,singlePhrase,phraseDate} from './home-phrases.mjs';
import {orderStageOf,orderProgressPatch} from './order-state.mjs';
import {adminMutation} from './admin-model.mjs';
import {agendaMutation,agendaEvents} from './agenda-model.mjs';
import {contentEvents,validateContent} from './content-model.mjs';
// Reglas del negocio compartidas por la interfaz y las pruebas. Importes en centavos.
export const kinds = ['clients','products','calculations','quotes','invoices','orders','materials','suppliers','purchases','movements','payments','expenses','campaigns','content','resources','accounts','tasks'];
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const money = cents => new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP'}).format((Number(cents)||0)/100);
export const cents = value => Math.round(finite(value)*100);
export function finite(v,min=0) { const n=Number(v||0); if(!Number.isFinite(n)||n<min||n>1e12) throw Error('Revisa los importes y cantidades: deben ser números válidos.'); return n; }
export function required(v,label='Nombre') { if(!String(v||'').trim()) throw Error(`${label} es obligatorio.`); return String(v).trim(); }
function financialDate(value,label='Fecha'){
 required(value,label);
 const date=new Date(`${value}T12:00:00Z`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000')||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value)throw Error(`${label}: selecciona una fecha válida.`);
 return value;
}
export function emptyState(){ return {version:0,counters:{quotes:0,orders:0,invoices:0,purchases:0},settings:{name:'Life Deco Art',currency:'DOP',timezone:'America/Santo_Domingo',dateFormat:'DD/MM/AAAA',validDays:0,hourly:0,terms:'',paymentInstructions:''},records:{}}; }
export function list(s,kind,archived=false){return Object.values(s.records).filter(r=>r.kind===kind&&!r.deleted&&(archived||!r.archived));}
export function get(s,id){const r=s.records[id];if(!r)throw Error('No se encontró el registro. Actualiza el panel.');return r;}
export function calculate(c){
 const units=finite(c.units)||1, hours=finite(c.hours), hourly=finite(c.hourly), other=finite(c.other), packaging=finite(c.packaging);
 const materialCost=(c.materials||[]).reduce((sum,r)=>sum+finite(r.quantity)*finite(r.unitCost),0);
 const cost=cents(materialCost+hours*hourly+other+packaging), fee=finite(c.feePercent)/100, margin=finite(c.margin)/100;
 if(fee>=1||margin>=1||fee+margin>=1)throw Error('El margen y la comisión sumados deben ser menores del 100 %.');
 const sale=c.mode==='margin'?Math.ceil(cost/(1-fee-margin)):cents(finite(c.sale)*units);
 const commission=Math.round(sale*fee), profit=sale-cost-commission;
 return {units,cost,unitCost:Math.ceil(cost/units),sale,unitSale:Math.ceil(sale/units),commission,feePercent:finite(c.feePercent),profit,margin:sale?profit/sale*100:0,markup:cost?profit/cost*100:0};
}
export function totals(d){
 const subtotal=(d.lines||[]).reduce((sum,l)=>sum+Math.round(finite(l.quantity)*cents(l.price)),0);
 const discount=d.discountType==='percent'?Math.round(subtotal*finite(d.discount)/100):cents(d.discount);
 if(discount>subtotal)throw Error('El descuento supera el subtotal.');
 const shipping=cents(d.shipping), tax=Math.round((subtotal-discount)*finite(d.taxPercent)/100),total=subtotal-discount+shipping+tax;
 const advance=d.advanceType==='percent'?Math.round(total*finite(d.advance)/100):cents(d.advance);
 if(advance>total)throw Error('El anticipo supera el total.');
 return {subtotal,discount,shipping,tax,total,advance};
}
export function paid(s,id){const r=s.records[id];return list(s,'payments',true).filter(p=>p.target===id||(r?.kind==='invoices'&&r.advanceOrderId&&p.target===r.advanceOrderId)).reduce((a,p)=>a+(p.type==='refund'?-p.amount:p.amount),0);}
export function balance(s,r){return (r.kind==='purchases'?cents(r.total):r.kind==='expenses'?cents(r.amount):totals(r).total)-paid(s,r.id);}
export function documentStatus(s,r,date=today()){
 if(r.status==='anulada'||r.status==='cancelado')return r.status;
 if(r.kind==='invoices'&&r.status!=='borrador'){if(balance(s,r)<=0)return 'pagada';return r.due&&r.due<date?'vencida':'pendiente';}
 if(r.kind==='quotes'&&['enviada','vencida'].includes(r.status)&&r.validUntil&&r.validUntil<date)return 'vencida';
 return r.status||'activo';
}
export function stock(s,id){return list(s,'movements',true).filter(m=>m.materialId===id).reduce((a,m)=>a+Number(m.quantity),0);}
export function nextDate(date,repeat){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(+d))throw Error('Define una fecha válida para repetir la tarea.');if(repeat==='semanal')d.setUTCDate(d.getUTCDate()+7);else if(repeat==='diaria')d.setUTCDate(d.getUTCDate()+1);else {const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));}return d.toISOString().slice(0,10);}
export function events(s){const services=list(s,'accounts').filter(r=>r.renewal&&r.status!=='cancelado'),renewals=services.map(r=>({...r,eventDate:r.renewal,name:`Renovación · ${r.name}`})),reminders=services.filter(r=>Number(r.reminderDays)>0).map(r=>{const date=new Date(r.renewal+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-Number(r.reminderDays));return {...r,eventDate:date.toISOString().slice(0,10),name:`Revisar renovación · ${r.name}`};}),noteReminders=list(s,'resources').filter(r=>r.recordType==='quick-note'&&r.reminderDate&&!r.taskId).map(r=>({...r,eventDate:r.reminderDate,name:`Recordatorio · ${r.title||r.name}`}));return [...agendaEvents(s).filter(e=>!['completada','cancelada'].includes(e.status)).map(e=>({...s.records[e.id],...e,href:e.type==='content'?`#content/${e.id}/publication-${e.publicationId}`:e.href,eventDate:e.date,publicationStatus:e.type==='content'?'pendiente':undefined})),...noteReminders,...renewals,...reminders].sort((a,b)=>a.eventDate.localeCompare(b.eventDate));}
function normalize(r){required(r.name);if(r.kind==='calculations')calculate(r);if(['quotes','invoices'].includes(r.kind)){if(!r.lines?.length)throw Error('Añade al menos un concepto.');r.lines.forEach(l=>{required(l.description,'Descripción del concepto');if(!finite(l.quantity))throw Error('La cantidad debe ser mayor que cero.');finite(l.price);});totals(r);}if(r.kind==='orders'&&r.lines?.length){r.lines.forEach(l=>{required(l.description,'Descripción del artículo');if(!finite(l.quantity))throw Error('La cantidad debe ser mayor que cero.');finite(l.price);});totals(r);}return r;}
export function applyCommand(state,cmd,{id=crypto.randomUUID(),at=new Date().toISOString()}={}){
 if(cmd.action==='catalog-save'){
  if(!['products','materials','suppliers','purchases'].includes(cmd.kind))throw Error('Registro de catálogo no válido.');
  const initial=finite(cmd.initialStock);if(cmd.id&&initial)throw Error('Las existencias iniciales solo se registran al crear el material.');
  const first=applyCommand(state,{action:'save',kind:cmd.kind,id:cmd.id,data:cmd.data},{id,at});let last=first;
  if(cmd.kind==='materials'&&initial&&cmd.data.track)last=applyCommand(first.state,{action:'adjustStock',materialId:first.result,quantity:initial,reason:'Existencia inicial'},{id:id+'-initial',at});
  if(cmd.kind==='purchases'&&cmd.receive)last=applyCommand(first.state,{action:'purchase',id:first.result},{id:id+'-receive',at});
  const changed=[...new Set([...first.changed,...last.changed])];last.state.version=state.version+1;
  return {state:last.state,changed,result:first.result,history:{id,action:cmd.action,target:first.result,at,changed,before:Object.fromEntries(changed.filter(k=>state.records[k]).map(k=>[k,state.records[k]])),after:Object.fromEntries(changed.map(k=>[k,last.state.records[k]]))}};
 }
 const s=structuredClone(state), changes=[], put=r=>{s.records[r.id]=r;changes.push(r.id);return r;};
 const create=(kind,data,recordId=id)=>put({...data,id:recordId,kind,createdAt:at,updatedAt:at});
 const update=(r,data)=>put({...r,...data,updatedAt:at});
 const number=kind=>{s.counters[kind]=(s.counters[kind]||0)+1;return `${({quotes:'COT',orders:'PED',invoices:'FAC',purchases:'COM'})[kind]}-${String(s.counters[kind]).padStart(4,'0')}`;};
 const snapshot=r=>({...r,issuer:{...structuredClone(s.settings),logoPath:s.records[s.settings.logoResourceId]?.path||''},client:structuredClone(s.records[r.clientId]||{}),estimate:r.estimate||((r.calculationId&&s.records[r.calculationId])?calculate(s.records[r.calculationId]):null)});
 let result;
 if(cmd.action.startsWith('admin-')){result=adminMutation(s,cmd,{put,at,id});
 }else if(cmd.action.startsWith('agenda-')){result=agendaMutation(s,cmd,{put,at,id,nextDate});
 }else if(cmd.action==='save'){
  if(!kinds.includes(cmd.kind)||['payments','movements'].includes(cmd.kind))throw Error('Tipo de registro no editable.');
  const old=cmd.id?get(s,cmd.id):null;
  if(old&&old.kind!==cmd.kind)throw Error('El registro pertenece a otra sección.');
  if(old&&['quotes','invoices'].includes(old.kind)&&old.status!=='borrador')throw Error('Crea una nueva versión o sustituye el documento emitido.');
  if(old?.kind==='purchases'&&(old.confirmed||paid(s,old.id)!==0))throw Error('La compra ya tiene movimientos; registra un ajuste.');
  if(old?.kind==='expenses'&&old.recordType==='finance-entry')throw Error('Conserva el registro financiero y corrige sus pagos desde el detalle.');
  const data=normalize({...old,...cmd.data,kind:cmd.kind});
  if(cmd.kind==='content')validateContent(data);
  if(old?.kind==='orders'&&paid(s,old.id)>0&&(old.quoteId!==data.quoteId||old.clientId!==data.clientId||totals(data).total<paid(s,old.id)))throw Error('Conserva el vínculo y el importe del pedido que tiene anticipos.');
  if(old?.kind==='orders'&&old.quoteId&&JSON.stringify(totals(old))!==JSON.stringify(totals(data)))throw Error('Este pedido procede de una cotización aprobada. Revisa la cotización antes de cambiar los importes.');
  if(data.clientId&&get(s,data.clientId).kind!=='clients')throw Error('Selecciona un cliente válido.');
  if(['quotes','invoices','orders'].includes(cmd.kind)&&!data.clientId)throw Error('Selecciona un cliente.');
  if(cmd.kind==='orders'){
   if(data.quoteId){const quote=get(s,data.quoteId);if(quote.kind!=='quotes'||quote.clientId!==data.clientId)throw Error('La cotización debe pertenecer al mismo cliente del pedido.');if(old?.quoteId!==data.quoteId&&(quote.status!=='aprobada'||quote.archived||quote.deleted))throw Error('Selecciona una cotización aprobada y disponible.');if(old?.quoteId!==data.quoteId&&list(s,'orders',true).some(o=>o.id!==old?.id&&o.quoteId===data.quoteId&&o.status!=='cancelado'))throw Error('Esta cotización ya tiene un pedido. Abre el pedido existente.');}
   if(old?.quoteId&&old.status!=='borrador'&&old.quoteId!==data.quoteId)throw Error('Conserva la cotización de origen del pedido activo.');
   if(data.status==='borrador'&&old&&old.status!=='borrador')throw Error('Un pedido activo no puede volver a borrador.');
   if(old?.status==='borrador'&&data.status!=='borrador'&&!data.due)throw Error('Selecciona la fecha de entrega prevista para crear el pedido.');
   if(old?.status==='cancelado'&&(data.status!==old.status||orderStageOf({status:data.stage||data.status})!==orderStageOf({status:old.stage||old.status})))throw Error('El pedido está cancelado y no admite cambios de etapa.');
   if(old&&old.status!=='borrador'&&(data.status!==old.status||orderStageOf({status:data.stage||data.status})!==orderStageOf({status:old.stage||old.status})))throw Error('Actualiza la etapa desde el control de avance del pedido.');
   if(old&&list(s,'invoices',true).some(i=>!['borrador','anulada'].includes(i.status)&&(i.advanceOrderId===old.id||i.orderId===old.id||old.quoteId&&i.quoteId===old.quoteId))&&(data.clientId!==old.clientId||data.quoteId!==old.quoteId||JSON.stringify(totals(data))!==JSON.stringify(totals(old))))throw Error('El pedido ya está facturado. Conserva su cliente y sus importes.');
   if(['borrador','cancelado','entregado'].includes(data.status))data.condition='';
   if(data.status==='borrador')data.stage='borrador';
  }
  if(cmd.kind==='invoices')for(const [key,kind]of [['quoteId','quotes'],['orderId','orders']]){if(data[key]){const source=get(s,data[key]);if(source.kind!==kind||source.clientId!==data.clientId)throw Error('El origen debe pertenecer al mismo cliente de la factura.');if(key==='orderId'&&data.quoteId&&source.quoteId!==data.quoteId)throw Error('El pedido y la cotización deben corresponder al mismo trabajo.');}}
  if(cmd.kind==='materials'){finite(data.packageCost);if(!finite(data.packageUnits))throw Error('Indica el rendimiento de la presentación.');if(data.supplierId&&get(s,data.supplierId).kind!=='suppliers')throw Error('Selecciona un proveedor válido.');
   if(old?.packageCost===undefined&&Number(old?.unitCost)>0&&!data.packageCost&&cmd.data.costKnown!==true)data.packageCost=Number(old.unitCost)*Number(old.packageUnits||1);data.costKnown=Boolean(data.costKnown||data.referencePurchaseId||Number(data.packageCost)>0);if(data.costKnown)data.unitCost=finite(data.packageCost)/finite(data.packageUnits);else data.unitCost=0;
   if(old&&(old.unitCost!==data.unitCost||Boolean(old.costKnown)!==data.costKnown))for(const product of list(s,'products',true).filter(p=>(p.recipe||[]).some(l=>l.materialId===old.id))){const previous=catalogCostOf(s.records,product);update(product,{priceReview:true,...(product.costSnapshot===undefined?{costSnapshot:previous.missing.length?null:cents(previous.cost)}:{})});}
  }
  if(cmd.kind==='suppliers'){required(data.name,'Nombre del proveedor');}
  if(cmd.kind==='products'){data.price=finite(data.price);data.otherCost=finite(data.otherCost);data.adPercent=finite(data.adPercent);data.markup=finite(data.markup);for(const line of data.recipe||[]){if(!line.materialId||get(s,line.materialId).kind!=='materials')throw Error('Selecciona un material válido.');if(!finite(line.quantity))throw Error('La cantidad de material debe ser mayor que cero.');}for(const task of data.labor||[]){required(task.name,'Nombre de la tarea');finite(task.hours);finite(task.rate);}data.priceHistory=Array.isArray(data.priceHistory)?data.priceHistory:[];}
  if(cmd.kind==='products'){
   const keys=['price','recipe','labor','otherCost','adPercent','markup'],changed=old&&keys.some(key=>JSON.stringify(old[key]??(['recipe','labor'].includes(key)?[]:0))!==JSON.stringify(data[key]??(['recipe','labor'].includes(key)?[]:0))),reviewed=cmd.data.costReviewed===true;
   data.costConfigured=Boolean(old?.costConfigured||data.recipe?.length||data.labor?.length||data.otherCost||reviewed);data.priceHistory=structuredClone(old?.priceHistory||[]);
   if(changed||old&&reviewed&&old.costSnapshot!==(catalogCostOf(s.records,data).missing.length?null:cents(catalogCostOf(s.records,data).cost))){const before=catalogCostOf(s.records,old);data.priceHistory.push({date:at.slice(0,10),at,price:old.price||0,cost:old.costSnapshot!==undefined?old.costSnapshot:before.missing.length?null:cents(before.cost),recipe:structuredClone(old.recipe||[]),labor:structuredClone(old.labor||[]),otherCost:old.otherCost||0,adPercent:old.adPercent||0,markup:old.markup||0});}
   if(!old||changed||reviewed){const next=catalogCostOf(s.records,data);data.costSnapshot=next.missing.length?null:cents(next.cost);data.suggestedPrice=next.missing.length?null:cents(next.suggested);data.costIncomplete=Boolean(next.missing.length);}
   data.priceReview=reviewed?data.costIncomplete:Boolean(old?.priceReview);delete data.costReviewed;
  }
  if(cmd.kind==='expenses'){finite(data.amount);required(data.date,'Fecha del gasto');}
  if(cmd.kind==='purchases'){finite(data.total);if(data.supplierId&&get(s,data.supplierId).kind!=='suppliers')throw Error('Selecciona un proveedor válido.');const items=data.items?.length?data.items:[{materialId:data.materialId,quantity:data.quantity,subtotal:data.total,usageUnits:data.quantity}];if(!items.length)throw Error('Añade por lo menos un material.');for(const item of items){if(!item.materialId||get(s,item.materialId).kind!=='materials'||!finite(item.quantity))throw Error('Selecciona un material y una cantidad mayor que cero.');finite(item.subtotal);}data.items=items;}
  if(cmd.kind==='tasks'&&data.repeat&&data.repeat!=='ninguna'&&!data.date)throw Error('La tarea recurrente necesita una fecha.');
  if(cmd.kind==='clients'&&data.clientType){if(!data.phone&&!data.email&&!data.instagram)throw Error('Añade por lo menos un medio de contacto.');if(!old)data.activity=[...(data.activity||[]),{label:'Cliente creado',at}];}
  if(cmd.kind==='resources'&&data.recordType==='quick-note'){required(data.note,'Nota');if(data.reminderDate&&!/^\d{4}-\d{2}-\d{2}$/.test(data.reminderDate))throw Error('Selecciona una fecha válida para el recordatorio.');if(data.relatedId){const related=get(s,data.relatedId);if(!['clients','orders','quotes','content'].includes(data.relatedKind)||related.kind!==data.relatedKind)throw Error('Selecciona un registro válido para vincular la nota.');}}
  if(cmd.kind==='orders'&&!old&&data.calculationId)data.estimate=calculate(get(s,data.calculationId));
  if(old?.kind==='tasks'&&old.status!==data.status)throw Error('Cambia el estado desde la ficha para conservar las recurrencias.');
  result=old?update(old,data):create(cmd.kind,{...data,...(['quotes','invoices','orders','purchases'].includes(cmd.kind)?{number:number(cmd.kind)}:{}),status:data.status||(['quotes','invoices'].includes(cmd.kind)?'borrador':cmd.kind==='orders'?'pendiente':cmd.kind==='purchases'?'por recibir':cmd.kind==='tasks'?'pendiente':'activo'),...(cmd.kind==='orders'?{stage:data.stage||'pendiente',condition:data.condition||''}:{})});
 }else if(cmd.action==='finance-entry'){
  const d=cmd.data||{},amount=cents(d.amount),direction=d.direction;
  if(!['income','expense'].includes(direction)||!amount)throw Error('Indica un importe mayor que cero.');
  required(d.name,'Concepto');required(d.category,'Categoría');required(d.date,'Fecha');
  financialDate(d.date);
  if(d.orderId&&get(s,d.orderId).kind!=='orders')throw Error('Selecciona un pedido válido.');
  const isPaid=direction==='income'||d.paymentState==='paid';
  if(direction==='expense'&&!['paid','pending'].includes(d.paymentState))throw Error('Selecciona el estado del pago.');
  if(isPaid){required(d.method,'Método');financialDate(direction==='income'?d.date:d.paymentDate,'Fecha de pago');}
  if(!isPaid&&d.expectedDate)financialDate(d.expectedDate,'Fecha prevista');
  result=create('expenses',{name:d.name.trim(),category:d.category.trim(),amount:amount/100,date:d.date,direction,recordType:'finance-entry',paymentState:isPaid?'paid':'pending',person:d.person||'',orderId:d.orderId||'',notes:d.notes||'',expectedDate:!isPaid?d.expectedDate||'':'',status:'activo'});
  if(d.receipt){const resource=create('resources',{...d.receipt,name:d.receipt.fileName,recordType:'finance-receipt',sourceId:result.id},`${id}-receipt`);update(result,{resourceIds:[resource.id]});}
  if(isPaid)create('payments',{name:d.name.trim(),target:result.id,type:'payment',direction,amount,date:direction==='income'?d.date:d.paymentDate,method:d.method,reference:''},`${id}-payment`);
 }else if(cmd.action==='home-phrase-delete'){
  const previous=s.settings.homePhrases||{},items=[...(previous.items||[])];
  if(!Number.isInteger(cmd.index)||cmd.index<0||items[cmd.index]!==cmd.originalText||typeof cmd.originalText!=='string')throw Error('Esta frase cambió. Vuelve a abrirla antes de eliminar.');
  const [removed]=items.splice(cmd.index,1);
  s.settings.homePhrases={...previous,items,archived:[...new Set([...(previous.archived||[]),removed])]};
 }else if(cmd.action==='home-phrase-save'){
  const text=singlePhrase(cmd.text),previous=s.settings.homePhrases||{},items=[...(previous.items||[])],editing=cmd.index!==null&&cmd.index!==undefined;
  if(editing&&(!Number.isInteger(cmd.index)||items[cmd.index]!==cmd.originalText))throw Error('Esta frase cambió. Vuelve a abrirla antes de guardar.');
  if(items.some((item,index)=>item===text&&(!editing||index!==cmd.index)))throw Error('Esta frase ya está guardada.');
  if(editing)items[cmd.index]=text;else{if(items.length>=100)throw Error('Puedes guardar hasta 100 frases.');items.push(text);}
  s.settings.homePhrases={...previous,items,startDate:previous.startDate||phraseDate(new Date(at),s.settings.timezone)};
 }else if(cmd.action==='home-phrases'){
  const items=normalizePhrases(cmd.text),previous=s.settings.homePhrases||{};
  s.settings.homePhrases={items,startDate:previous.startDate||phraseDate(new Date(at),s.settings.timezone),archived:[...new Set([...(previous.archived||[]),...(previous.items||[]).filter(text=>!items.includes(text))])].filter(text=>!items.includes(text))};
 }else if(cmd.action==='settings'){
  s.settings={...s.settings,...cmd.data,name:required(cmd.data.name),currency:'DOP'};finite(s.settings.hourly);finite(s.settings.validDays);
 }else if(cmd.action==='archive'){
  const r=get(s,cmd.id);if(['invoices','quotes','orders','purchases'].includes(r.kind))throw Error('Conserva los documentos y cambia su estado desde su ficha.');result=update(r,{archived:!r.archived});
 }else if(cmd.action==='issue'){
  const r=get(s,cmd.id);if(!['quotes','invoices'].includes(r.kind)||r.status!=='borrador')throw Error('Solo se pueden emitir borradores.');normalize(r);
  const matchingOrders=r.kind==='invoices'?list(s,'orders',true).filter(o=>r.quoteId&&o.quoteId===r.quoteId&&!['cancelado','borrador'].includes(o.status)):[];
  if(!r.advanceOrderId&&!r.orderId&&matchingOrders.length>1)throw Error('Selecciona el pedido correspondiente antes de emitir la factura.');
  const order=r.kind==='invoices'?(s.records[r.advanceOrderId||r.orderId]||matchingOrders[0]):null;
  if(order){if(order.kind!=='orders'||['borrador','cancelado'].includes(order.status)||order.clientId!==r.clientId)throw Error('Revisa el pedido relacionado.');if(list(s,'invoices',true).some(i=>i.id!==r.id&&i.advanceOrderId===order.id&&!['borrador','anulada'].includes(i.status)))throw Error('Este pedido ya está vinculado a una factura emitida.');if(paid(s,order.id)>totals(r).total)throw Error('El anticipo supera esta factura. Revisa los importes antes de emitirla.');}
  result=update(r,{...snapshot(r),...(order?{advanceOrderId:order.id}:{}),status:r.kind==='quotes'?'enviada':'pendiente',issuedAt:at});
 }else if(cmd.action==='approve'){
  const r=get(s,cmd.id);if(r.kind!=='quotes'||r.status!=='enviada'||documentStatus(s,r)==='vencida')throw Error('Emite o renueva la cotización antes de aprobarla.');result=update(r,{status:'aprobada',approvedAt:at});
 }else if(cmd.action==='revise'){
  const r=get(s,cmd.id);if(r.kind!=='quotes')throw Error('Solo las cotizaciones tienen versiones.');
  const root=r.rootId||r.id; const revision=Math.max(...list(s,'quotes',true).filter(q=>(q.rootId||q.id)===root).map(q=>q.revision||1))+1;
  result=create('quotes',{...r,rootId:root,revision,status:'borrador',issuedAt:null,approvedAt:null,estimate:null,validUntil:'',number:r.number},id);
 }else if(cmd.action==='duplicate'){
  const r=get(s,cmd.id);if(!['quotes','calculations','products'].includes(r.kind))throw Error('No se puede duplicar este registro.');
  result=create(r.kind,{...r,rootId:null,revision:1,status:r.kind==='quotes'?'borrador':'activo',number:r.kind==='quotes'?number('quotes'):null,name:`${r.name} · copia`,issuedAt:null,approvedAt:null},id);
 }else if(cmd.action==='convert'){
  const r=get(s,cmd.id);if(r.kind!=='quotes'||r.status!=='aprobada'||!['orders','invoices'].includes(cmd.kind))throw Error('Selecciona una cotización aprobada.');
  const existing=list(s,cmd.kind,true).find(x=>x.quoteId===r.id&&x.status!=='anulada');if(existing)throw Error(`Ya existe ${existing.number} para esta cotización.`);
  result=create(cmd.kind,{...snapshot(r),name:r.name,quoteId:r.id,number:number(cmd.kind),status:cmd.kind==='orders'?'pendiente':'borrador',stage:cmd.kind==='orders'?'pendiente':undefined,condition:'',rootId:null,revision:1,issuedAt:null,approvedAt:null,due:r.due||''});
 }else if(cmd.action==='order-progress'){
  const r=get(s,cmd.id);if(r.kind!=='orders')throw Error('Selecciona un pedido válido.');if(cmd.stage==='cancelado')required(cmd.reason,'Motivo');result=update(r,{...orderProgressPatch(r,cmd,at),reason:cmd.reason||r.reason||''});
 }else if(cmd.action==='status'){
  const r=get(s,cmd.id);if(r.kind==='orders'&&r.status==='borrador')throw Error('Completa el borrador desde Editar pedido antes de actualizar su avance.');const allowed={orders:['pendiente','diseño','aprobación','producción','listo','entregado','cancelado','en diseño','esperando aprobación','en producción','listo para entregar'],content:['idea','en preparación','listo','programado','publicado'],tasks:['pendiente','en curso','completada','cancelada'],quotes:['rechazada','cancelada'],invoices:['anulada']};
  if(r.kind==='content'&&Array.isArray(r.publications))throw Error('Edita la preparación y las publicaciones desde Contenido.');
  if(!allowed[r.kind]?.includes(cmd.status))throw Error('Estado no permitido.');
  if(['anulada','cancelado','cancelada'].includes(cmd.status))required(cmd.reason,'Motivo');
  if(r.kind==='quotes'&&cmd.status==='rechazada'&&r.status!=='enviada')throw Error('Solo se puede rechazar una cotización enviada.');
  result=update(r,r.kind==='orders'?{...orderProgressPatch(r,{stage:cmd.status,waiting:cmd.waiting,reopen:cmd.reopen},at),reason:cmd.reason||''}:{status:cmd.status,reason:cmd.reason||''});
  if(r.kind==='tasks'&&cmd.status==='completada'&&r.status!=='completada'&&r.repeat&&r.repeat!=='ninguna')create('tasks',{...r,status:'pendiente',date:nextDate(r.date,r.repeat),previousId:r.id},`${id}-next`);
 }else if(cmd.action==='replace'){
  const r=get(s,cmd.id);if(r.kind!=='invoices'||r.status!=='anulada')throw Error('Anula la factura antes de sustituirla.');
  result=create('invoices',{...r,number:number('invoices'),status:'borrador',replacesId:r.id,quoteId:null,issuedAt:null},id);
 }else if(cmd.action==='payment'){
  const target=get(s,cmd.target),amount=cents(cmd.amount);if(!amount)throw Error('El pago debe ser mayor que cero.');
  const paymentDate=financialDate(cmd.date===undefined?today():cmd.date,'Fecha de pago');
  if(!['invoices','purchases','orders','expenses'].includes(target.kind)||(target.status==='borrador'||target.status==='cancelado'&&cmd.type!=='refund'))throw Error('Selecciona un registro pendiente válido.');
  if(target.kind==='expenses'&&target.recordType!=='finance-entry')throw Error('Este gasto ya se registró como pagado.');
  if(target.kind==='orders'&&cmd.type!=='refund'&&list(s,'invoices',true).some(i=>!['borrador','anulada'].includes(i.status)&&(i.advanceOrderId===target.id||(target.quoteId&&i.quoteId===target.quoteId))))throw Error('El pedido ya tiene una factura. Registra el cobro desde Ventas.');
  if(cmd.type==='refund'){
   const original=get(s,cmd.originalId);if(original.kind!=='payments'||original.type==='refund'||original.target!==target.id)throw Error('Selecciona el pago original.');
   if(paymentDate<original.date)throw Error('La fecha del reembolso no puede ser anterior al pago original.');
   const refunded=list(s,'payments',true).filter(p=>p.originalId===original.id).reduce((a,p)=>a+p.amount,0);
   if(amount>original.amount-refunded)throw Error('El reembolso supera el importe disponible del pago.');required(cmd.reason,'Motivo');
  }else{if(target.status==='anulada')throw Error('No se pueden añadir pagos a una factura anulada.');if(amount>balance(s,target))throw Error('El pago supera el saldo pendiente.');}
  result=create('payments',{name:cmd.type==='refund'?'Reembolso':target.kind==='orders'?'Anticipo':'Pago',target:target.id,type:cmd.type==='refund'?'refund':'payment',direction:['invoices','orders'].includes(target.kind)||target.direction==='income'?'income':'expense',amount,date:paymentDate,method:cmd.method||'',reference:cmd.reference||'',reason:cmd.reason||'',originalId:cmd.originalId||null});
 }else if(cmd.action==='purchase'){
  const r=get(s,cmd.id);if(r.kind!=='purchases'||r.confirmed)throw Error('Esta compra ya fue registrada o no es válida.');
  const items=r.items?.length?r.items:[{materialId:r.materialId,quantity:r.quantity,subtotal:r.total}],base=items.reduce((sum,item)=>sum+finite(item.subtotal),0),shared=finite(r.shipping)+finite(r.other),allocations=[];let index=0;
  for(const item of items){const m=get(s,item.materialId);if(m.kind!=='materials')throw Error('Material no válido.');const packages=finite(item.quantity);if(!packages)throw Error('Cantidad no válida.');const usageUnits=item.usageUnits?finite(item.usageUnits):packages*finite(m.packageUnits),allocated=base?shared*finite(item.subtotal)/base:shared/items.length,acquisition=finite(item.subtotal)+allocated,unitCost=acquisition/usageUnits;if(m.track)create('movements',{name:'Compra recibida',materialId:m.id,quantity:usageUnits,sourceId:r.id,date:r.date||today(),unitCost},`${id}-movement-${index++}`);for(const product of list(s,'products',true).filter(p=>(p.recipe||[]).some(l=>l.materialId===m.id))){if(product.costSnapshot===undefined){const previous=catalogCostOf(s.records,product);update(product,{costSnapshot:previous.missing.length?null:cents(previous.cost)});}}update(m,{unitCost,costKnown:true,packageCost:acquisition/packages,referencePurchaseId:r.id,referenceSupplierId:r.supplierId||m.supplierId||'',referenceDate:r.date||today()});for(const product of list(s,'products',true)){if((product.recipe||[]).some(line=>line.materialId===m.id))update(product,{priceReview:true});}allocations.push({...item,allocatedShared:allocated,usageUnits,unitCost});}
  result=update(r,{confirmed:true,status:'recibida',allocations,receivedAt:at});
 }else if(cmd.action==='consume'){
  const r=get(s,cmd.id);if(r.kind!=='orders'||r.consumed)throw Error('El consumo inicial ya se confirmó. Usa un ajuste para registrar diferencias.');
  const amounts=new Map();for(const l of cmd.lines||[]){if(!l.materialId)throw Error('Selecciona cada material.');amounts.set(l.materialId,(amounts.get(l.materialId)||0)+finite(l.quantity));}
  if(!amounts.size)throw Error('Añade los materiales utilizados.');let real=0,i=0;
  for(const [materialId,quantity]of amounts){const m=get(s,materialId);real+=quantity*finite(m.unitCost);if(m.track){if(stock(s,m.id)<quantity)throw Error(`No hay existencias suficientes de ${m.name}.`);create('movements',{name:'Uso en trabajo',materialId:m.id,quantity:-quantity,sourceId:r.id,date:today()},`${id}-${i++}`);}}
  result=update(r,{consumed:true,actualMaterials:cents(real),consumption:cmd.lines});
 }else if(cmd.action==='adjustStock'){
  const m=get(s,cmd.materialId);if(m.kind!=='materials'||!m.track)throw Error('Este material no controla existencias.');const q=Number(cmd.quantity);if(!Number.isFinite(q)||!q)throw Error('Indica una cantidad distinta de cero.');if(stock(s,m.id)+q<0)throw Error('El ajuste dejaría existencias negativas.');
  result=create('movements',{name:required(cmd.reason,'Motivo'),materialId:m.id,quantity:q,sourceId:cmd.orderId||'',date:today()});
  if(cmd.orderId){const o=get(s,cmd.orderId);if(o.kind!=='orders')throw Error('Selecciona un pedido válido.');update(o,{actualMaterials:Math.max(0,(o.actualMaterials||0)-cents(q*finite(m.unitCost)))});}
 }else if(cmd.action==='actual'){
  const r=get(s,cmd.id);if(r.kind!=='orders')throw Error('Selecciona un pedido.');result=update(r,{actualHours:finite(cmd.hours),actualHourly:finite(cmd.hourly),actualOther:cents(cmd.other),actualComplete:!!cmd.complete});
  }else if(cmd.action==='note-task'){
   const note=get(s,cmd.id);if(note.kind!=='resources'||note.recordType!=='quick-note'||note.archived)throw Error('No se encontró esta nota.');
   if(note.taskId&&s.records[note.taskId]&&!s.records[note.taskId].archived)throw Error('Esta nota ya tiene una tarea vinculada.');
   const relationKey=({clients:'clientId',orders:'orderId',quotes:'quoteId',content:'contentId'})[note.relatedKind],relation=note.relatedId&&relationKey?{[relationKey]:note.relatedId}:{};
   const task=create('tasks',{name:note.title||note.name,description:note.note,date:note.reminderDate||today(),time:'',priority:note.pinned?'alta':'normal',status:'pendiente',scope:'negocio',repeat:'ninguna',noteId:note.id,...relation});
   update(note,{taskId:task.id});result=task;
  }else if(cmd.action==='attach'){
  const r=get(s,cmd.id),resource=get(s,cmd.resourceId);if(resource.kind!=='resources')throw Error('Selecciona un recurso.');result=update(r,{resourceIds:[...new Set([...(r.resourceIds||[]),resource.id])]});
 }else throw Error('Acción desconocida.');
 const unique=[...new Set(changes)];
 s.version++;return {state:s,changed:unique,result:result?.id||null,history:{id,action:cmd.action,target:cmd.id||cmd.target||result?.id||'',at,changed:unique,before:Object.fromEntries(unique.filter(k=>state.records[k]).map(k=>[k,state.records[k]])),after:Object.fromEntries(unique.map(k=>[k,s.records[k]]))}};
}
export function cashflow(s,from='',to='9999',clientId='',orderId=''){
 const invoices=list(s,'invoices',true),orders=list(s,'orders',true);
 const entries=[...list(s,'payments',true).map(p=>{const t=s.records[p.target];return {...p,concept:t?.name||p.name,origin:t?.kind||'payments',sourceNumber:t?.number||'',clientId:t?.clientId||'',orderId:t?.kind==='orders'?t.id:t?.orderId||t?.advanceOrderId||orders.find(o=>o.quoteId&&o.quoteId===t?.quoteId)?.id||'',signed:(p.direction==='income'?1:-1)*(p.type==='refund'?-1:1)*p.amount};}),...list(s,'expenses',true).filter(e=>e.recordType!=='finance-entry').map(e=>({...e,concept:e.name,origin:'expenses',direction:'expense',signed:-cents(e.amount)}))].filter(e=>(e.date||'')>=from&&(e.date||'')<=to&&(!clientId||e.clientId===clientId)&&(!orderId||e.orderId===orderId)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return {entries,income:entries.filter(e=>e.direction==='income').reduce((a,e)=>a+e.signed,0),expense:entries.filter(e=>e.direction==='expense').reduce((a,e)=>a-e.signed,0),receivable:invoices.filter(r=>!['borrador','anulada'].includes(r.status)).reduce((a,r)=>a+Math.max(0,balance(s,r)),0),payable:[...list(s,'purchases',true).filter(r=>!['anulada','cancelado'].includes(r.status)),...list(s,'expenses',true).filter(r=>r.recordType==='finance-entry'&&r.direction==='expense')].reduce((a,r)=>a+Math.max(0,balance(s,r)),0)};
}
