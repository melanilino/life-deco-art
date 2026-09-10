// Reglas del negocio compartidas por la interfaz y las pruebas. Importes en centavos.
export const kinds = ['clients','products','calculations','quotes','invoices','orders','materials','purchases','movements','payments','expenses','campaigns','content','resources','accounts','tasks'];
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const money = cents => new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP'}).format((Number(cents)||0)/100);
export const cents = value => Math.round(finite(value)*100);
export function finite(v,min=0) { const n=Number(v||0); if(!Number.isFinite(n)||n<min||n>1e12) throw Error('Revisa los importes y cantidades: deben ser números válidos.'); return n; }
export function required(v,label='Nombre') { if(!String(v||'').trim()) throw Error(`${label} es obligatorio.`); return String(v).trim(); }
export function emptyState(){ return {version:0,counters:{quotes:0,orders:0,invoices:0},settings:{name:'Life Deco Art',currency:'DOP',validDays:0,hourly:0,terms:'',paymentInstructions:''},records:{}}; }
export function list(s,kind,archived=false){return Object.values(s.records).filter(r=>r.kind===kind&&(archived||!r.archived));}
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
export function paid(s,id){return list(s,'payments',true).filter(p=>p.target===id).reduce((a,p)=>a+(p.type==='refund'?-p.amount:p.amount),0);}
export function balance(s,r){return (r.kind==='purchases'?cents(r.total):totals(r).total)-paid(s,r.id);}
export function documentStatus(s,r,date=today()){
 if(r.status==='anulada'||r.status==='cancelado')return r.status;
 if(r.kind==='invoices'&&r.status!=='borrador'){if(balance(s,r)<=0)return 'pagada';return r.due&&r.due<date?'vencida':'pendiente';}
 if(r.kind==='quotes'&&['enviada','vencida'].includes(r.status)&&r.validUntil&&r.validUntil<date)return 'vencida';
 return r.status||'activo';
}
export function stock(s,id){return list(s,'movements',true).filter(m=>m.materialId===id).reduce((a,m)=>a+Number(m.quantity),0);}
export function nextDate(date,repeat){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(+d))throw Error('Define una fecha válida para repetir la tarea.');if(repeat==='semanal')d.setUTCDate(d.getUTCDate()+7);else if(repeat==='diaria')d.setUTCDate(d.getUTCDate()+1);else {const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));}return d.toISOString().slice(0,10);}
export function events(s){return [...list(s,'tasks').filter(r=>r.date&&!['completada','cancelada'].includes(r.status)).map(r=>({...r,eventDate:r.date})),...list(s,'orders').filter(r=>r.due&&!['entregado','cancelado'].includes(r.status)).map(r=>({...r,eventDate:r.due,name:`Entrega · ${r.number}`})),...list(s,'content').filter(r=>r.date&&r.status!=='publicado').map(r=>({...r,eventDate:r.date})),...list(s,'accounts').filter(r=>r.renewal).map(r=>({...r,eventDate:r.renewal,name:`Renovación · ${r.name}`}))].sort((a,b)=>a.eventDate.localeCompare(b.eventDate));}
function normalize(r){required(r.name);if(r.kind==='calculations')calculate(r);if(['quotes','invoices','orders'].includes(r.kind)){if(!r.lines?.length)throw Error('Añade al menos un concepto.');r.lines.forEach(l=>{required(l.description,'Descripción del concepto');if(!finite(l.quantity))throw Error('La cantidad debe ser mayor que cero.');finite(l.price);});totals(r);}return r;}
export function applyCommand(state,cmd,{id=crypto.randomUUID(),at=new Date().toISOString()}={}){
 const s=structuredClone(state), changes=[], put=r=>{s.records[r.id]=r;changes.push(r.id);return r;};
 const create=(kind,data,recordId=id)=>put({...data,id:recordId,kind,createdAt:at,updatedAt:at});
 const update=(r,data)=>put({...r,...data,updatedAt:at});
 const number=kind=>`${({quotes:'COT',orders:'PED',invoices:'FAC'})[kind]}-${String(++s.counters[kind]).padStart(4,'0')}`;
 const snapshot=r=>({...r,issuer:{...structuredClone(s.settings),logoPath:s.records[s.settings.logoResourceId]?.path||''},client:structuredClone(s.records[r.clientId]||{}),estimate:r.estimate||((r.calculationId&&s.records[r.calculationId])?calculate(s.records[r.calculationId]):null)});
 let result;
 if(cmd.action==='save'){
  if(!kinds.includes(cmd.kind)||['payments','movements'].includes(cmd.kind))throw Error('Tipo de registro no editable.');
  const old=cmd.id?get(s,cmd.id):null;
  if(old&&old.kind!==cmd.kind)throw Error('El registro pertenece a otra sección.');
  if(old&&['quotes','invoices'].includes(old.kind)&&old.status!=='borrador')throw Error('Crea una nueva versión o sustituye el documento emitido.');
  if(old?.kind==='purchases'&&(old.confirmed||paid(s,old.id)!==0))throw Error('La compra ya tiene movimientos; registra un ajuste.');
  const data=normalize({...old,...cmd.data,kind:cmd.kind});
  if(old?.kind==='orders'&&old.quoteId&&JSON.stringify(totals(old))!==JSON.stringify(totals(data)))throw Error('Este pedido procede de una cotización aprobada. Revisa la cotización antes de cambiar los importes.');
  if(data.clientId&&get(s,data.clientId).kind!=='clients')throw Error('Selecciona un cliente válido.');
  if(['quotes','invoices','orders'].includes(cmd.kind)&&!data.clientId)throw Error('Selecciona un cliente.');
  if(cmd.kind==='materials'){finite(data.packageCost);if(!finite(data.packageUnits))throw Error('Indica cuántas unidades contiene el paquete.');data.unitCost=finite(data.packageCost)/finite(data.packageUnits);}
  if(cmd.kind==='expenses'){finite(data.amount);required(data.date,'Fecha del gasto');}
  if(cmd.kind==='purchases'){finite(data.total);if(!data.materialId||!finite(data.quantity))throw Error('Selecciona un material y una cantidad mayor que cero.');if(get(s,data.materialId).kind!=='materials')throw Error('Selecciona un material válido.');}
  if(cmd.kind==='tasks'&&data.repeat&&data.repeat!=='ninguna'&&!data.date)throw Error('La tarea recurrente necesita una fecha.');
  if(cmd.kind==='orders'&&!old&&data.calculationId)data.estimate=calculate(get(s,data.calculationId));
  if(old?.kind==='tasks'&&old.status!==data.status)throw Error('Cambia el estado desde la ficha para conservar las recurrencias.');
  result=old?update(old,data):create(cmd.kind,{...data,...(['quotes','invoices','orders'].includes(cmd.kind)?{number:number(cmd.kind)}:{}),status:data.status||(['quotes','invoices'].includes(cmd.kind)?'borrador':cmd.kind==='orders'?'pendiente':cmd.kind==='tasks'?'pendiente':'activo')});
 }else if(cmd.action==='settings'){
  s.settings={...s.settings,...cmd.data,name:required(cmd.data.name),currency:'DOP'};finite(s.settings.hourly);finite(s.settings.validDays);
 }else if(cmd.action==='archive'){
  const r=get(s,cmd.id);if(['invoices','quotes','orders','purchases'].includes(r.kind))throw Error('Conserva los documentos y cambia su estado desde su ficha.');result=update(r,{archived:!r.archived});
 }else if(cmd.action==='issue'){
  const r=get(s,cmd.id);if(!['quotes','invoices'].includes(r.kind)||r.status!=='borrador')throw Error('Solo se pueden emitir borradores.');normalize(r);result=update(r,{...snapshot(r),status:r.kind==='quotes'?'enviada':'pendiente',issuedAt:at});
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
  result=create(cmd.kind,{...snapshot(r),name:r.name,quoteId:r.id,number:number(cmd.kind),status:cmd.kind==='orders'?'pendiente':'borrador',rootId:null,revision:1,issuedAt:null,approvedAt:null,due:r.due||''});
 }else if(cmd.action==='status'){
  const r=get(s,cmd.id),allowed={orders:['pendiente','en diseño','esperando aprobación','en producción','listo para entregar','entregado','cancelado'],content:['idea','en preparación','listo','programado','publicado'],tasks:['pendiente','en curso','completada','cancelada'],quotes:['rechazada'],invoices:['anulada']};
  if(!allowed[r.kind]?.includes(cmd.status))throw Error('Estado no permitido.');
  if(['anulada','cancelado'].includes(cmd.status))required(cmd.reason,'Motivo');
  if(r.kind==='quotes'&&r.status!=='enviada')throw Error('Solo se puede rechazar una cotización enviada.');
  result=update(r,{status:cmd.status,reason:cmd.reason||''});
  if(r.kind==='tasks'&&cmd.status==='completada'&&r.status!=='completada'&&r.repeat&&r.repeat!=='ninguna')create('tasks',{...r,status:'pendiente',date:nextDate(r.date,r.repeat),previousId:r.id},`${id}-next`);
 }else if(cmd.action==='replace'){
  const r=get(s,cmd.id);if(r.kind!=='invoices'||r.status!=='anulada')throw Error('Anula la factura antes de sustituirla.');
  result=create('invoices',{...r,number:number('invoices'),status:'borrador',replacesId:r.id,quoteId:null,issuedAt:null},id);
 }else if(cmd.action==='payment'){
  const target=get(s,cmd.target),amount=cents(cmd.amount);if(!amount)throw Error('El pago debe ser mayor que cero.');
  if(!['invoices','purchases'].includes(target.kind)||['borrador','cancelado'].includes(target.status))throw Error('Emite la factura o selecciona una compra.');
  if(cmd.type==='refund'){
   const original=get(s,cmd.originalId);if(original.kind!=='payments'||original.type==='refund'||original.target!==target.id)throw Error('Selecciona el pago original.');
   const refunded=list(s,'payments',true).filter(p=>p.originalId===original.id).reduce((a,p)=>a+p.amount,0);
   if(amount>original.amount-refunded)throw Error('El reembolso supera el importe disponible del pago.');required(cmd.reason,'Motivo');
  }else{if(target.status==='anulada')throw Error('No se pueden añadir pagos a una factura anulada.');if(amount>balance(s,target))throw Error('El pago supera el saldo pendiente.');}
  result=create('payments',{name:cmd.type==='refund'?'Reembolso':'Pago',target:target.id,type:cmd.type==='refund'?'refund':'payment',direction:target.kind==='invoices'?'income':'expense',amount,date:cmd.date||today(),method:cmd.method||'',reference:cmd.reference||'',reason:cmd.reason||'',originalId:cmd.originalId||null});
 }else if(cmd.action==='purchase'){
  const r=get(s,cmd.id);if(r.kind!=='purchases'||r.confirmed)throw Error('Esta compra ya fue registrada o no es válida.');
  const m=get(s,r.materialId);if(m.kind!=='materials')throw Error('Material no válido.');const quantity=finite(r.quantity);if(!quantity)throw Error('Cantidad no válida.');
  if(m.track)create('movements',{name:'Compra',materialId:m.id,quantity,sourceId:r.id,date:r.date||today()},`${id}-movement`);
  update(m,{unitCost:finite(r.total)/quantity,packageCost:finite(r.total)/quantity*finite(m.packageUnits)});result=update(r,{confirmed:true});
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
 }else if(cmd.action==='attach'){
  const r=get(s,cmd.id),resource=get(s,cmd.resourceId);if(resource.kind!=='resources')throw Error('Selecciona un recurso.');result=update(r,{resourceIds:[...new Set([...(r.resourceIds||[]),resource.id])]});
 }else throw Error('Acción desconocida.');
 const unique=[...new Set(changes)];
 s.version++;return {state:s,changed:unique,result:result?.id||null,history:{id,action:cmd.action,target:cmd.id||cmd.target||result?.id||'',at,changed:unique,before:Object.fromEntries(unique.filter(k=>state.records[k]).map(k=>[k,state.records[k]])),after:Object.fromEntries(unique.map(k=>[k,s.records[k]]))}};
}
export function cashflow(s,from='',to='9999',clientId='',orderId=''){
 const invoices=list(s,'invoices',true),orders=list(s,'orders',true);
 const entries=[...list(s,'payments',true).map(p=>{const t=s.records[p.target];return {...p,clientId:t?.clientId||'',orderId:orders.find(o=>o.quoteId&&o.quoteId===t?.quoteId)?.id||'',signed:(p.direction==='income'?1:-1)*(p.type==='refund'?-1:1)*p.amount};}),...list(s,'expenses',true).map(e=>({...e,signed:-cents(e.amount)}))].filter(e=>(e.date||'')>=from&&(e.date||'')<=to&&(!clientId||e.clientId===clientId)&&(!orderId||e.orderId===orderId));
 return {entries,income:entries.filter(e=>e.signed>0).reduce((a,e)=>a+e.signed,0),expense:-entries.filter(e=>e.signed<0).reduce((a,e)=>a+e.signed,0),receivable:invoices.filter(r=>!['borrador','anulada'].includes(r.status)).reduce((a,r)=>a+balance(s,r),0),payable:list(s,'purchases').reduce((a,r)=>a+balance(s,r),0)};
}
