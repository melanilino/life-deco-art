import {kinds,finite,totals,calculate} from './domain.mjs';
import {schemas} from './schema.mjs';

export function planRecovery(current,backup,owner){
 if(backup?.format!=='life-deco-art-panel'||backup.schema!==1||backup.owner!==owner||!backup.state?.records||Array.isArray(backup.state.records))throw Error('Este archivo no es una copia válida de tu panel.');
 const records=[];
 for(const [key,source]of Object.entries(backup.state.records)){
  if(!source||key!==source.id||!/^[a-zA-Z0-9-]+$/.test(key)||!kinds.includes(source.kind)||JSON.stringify(source).length>350000)throw Error('La copia contiene un registro no válido.');
  const r=structuredClone(source);for(const f of schemas[r.kind]?.fields||[]){if(f.type==='number'&&r[f.key]!==undefined)r[f.key]=finite(r[f.key]);if(['text','textarea','date','time','email','url','ref','select'].includes(f.type)&&r[f.key]!==undefined&&typeof r[f.key]!=='string')throw Error('La copia contiene un campo de texto no válido.');}
  if(['quotes','invoices','orders'].includes(r.kind)){if(!Array.isArray(r.lines))throw Error('Faltan los conceptos del documento.');for(const l of r.lines){l.quantity=finite(l.quantity);l.price=finite(l.price);if(typeof l.description!=='string')throw Error('Descripción no válida.');}totals(r);}
  if(r.kind==='calculations')calculate(r);
  if(r.kind==='payments'){if(!Number.isSafeInteger(r.amount)||r.amount<=0||!['payment','refund'].includes(r.type)||!['income','expense'].includes(r.direction))throw Error('La copia contiene un pago no válido.');}
  if(r.kind==='movements'&&(!Number.isFinite(r.quantity)||!r.materialId))throw Error('La copia contiene un movimiento no válido.');
  for(const key of ['revision','actualMaterials','actualOther','actualHours','actualHourly'])if(r[key]!==undefined)r[key]=finite(r[key]);
  if(r.path&&(!r.path.startsWith(`panel-private/${owner}/`)||r.path.split('/').length!==3))throw Error('Un adjunto pertenece a otro espacio.');
  if(!current.records[r.id])records.push(r);
 }
 if(records.length>400)throw Error('Esta copia necesita una restauración administrativa por su tamaño.');
 const counters={...current.counters};for(const kind of Object.keys(counters)){const value=finite(backup.state.counters?.[kind]);if(!Number.isSafeInteger(value))throw Error('Numeración no válida en la copia.');counters[kind]=Math.max(counters[kind],value);}
 for(const r of records){if(['quotes','invoices','orders'].includes(r.kind)){const number=Number(String(r.number).split('-').pop());if(!Number.isSafeInteger(number)||number<1)throw Error('Documento sin número válido.');counters[r.kind]=Math.max(counters[r.kind],number);}}
 const files=[];for(const file of backup.files||[]){const r=records.find(r=>r.id===file.resourceId);if(!r)continue;if(file.path!==r.path||!/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(file.data)||file.data.length>21*1024*1024)throw Error('Un adjunto de la copia no es válido.');files.push(file);}
 const combined={...current.records,...Object.fromEntries(records.map(r=>[r.id,r]))};for(const r of records){for(const refKey of ['clientId','materialId','quoteId','orderId','target','originalId','calculationId','campaignId','contentId'])if(r[refKey]&&!combined[r[refKey]])throw Error('La copia contiene referencias incompletas; requiere revisión administrativa.');}
 return {records,counters,files};
}
