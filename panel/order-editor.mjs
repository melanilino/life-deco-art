import {totals} from './domain.mjs';
export function readOrderDraft(form,old={}){
 const fd=new FormData(form),data={...old};
 for(const key of ['name','clientId','quoteId','due','responsible','description'])if(fd.has(key))data[key]=String(fd.get(key)||'').trim();
 data.lines=[...form.querySelectorAll('.order-material-row')].map(row=>{
  const value=key=>row.querySelector(`[data-order-line="${key}"]`)?.value;
  let original={};try{original=JSON.parse(value('snapshot')||'{}');}catch{throw Error('No se pudo leer el artículo. Conserva el formulario y vuelve a intentarlo.');}
  return {...original,description:String(value('description')||'').trim(),quantity:Number(value('quantity')??1),price:Number(value('price')??0)};
 });
 return data;
}
export function orderSaveData(state,data,old,intent){
 if(!data.name)throw Error('Escribe el nombre del proyecto.');
 if(!data.clientId)throw Error('Selecciona un cliente.');
 if(intent==='create'&&!data.due)throw Error('Selecciona la fecha de entrega prevista.');
 const quote=data.quoteId&&state.records[data.quoteId];
 if(data.quoteId&&(!quote||quote.kind!=='quotes'||quote.clientId!==data.clientId))throw Error('La cotización debe pertenecer al mismo cliente del pedido.');
 const commercial=quote&&old?.quoteId!==data.quoteId?quote:old||quote||{};
 const result={...data};
 for(const key of ['notes','terms','discountType','discount','shipping','taxPercent','advanceType','advance'])result[key]=commercial[key]??(['notes','terms'].includes(key)?'':key.endsWith('Type')?'amount':0);
 const draft=!old||old.status==='borrador';
 result.status=draft?(intent==='draft'?'borrador':'pendiente'):old.status;
 result.stage=draft?result.status:old.stage||old.status;
 result.condition=old?.condition||'';
 // Validate amounts before uploading any references.
 if(result.lines.length)totals(result);
 return result;
}
export async function saveOrderDraft(form,data,execute,upload){
 if(form.dataset.saved)return null;
 const controls=[...form.querySelectorAll('input,select,textarea')].map(el=>[el,el.disabled]),files=[...form.querySelector('[name=references]').files];
 controls.forEach(([el])=>el.disabled=true);
 try{
  const attachments=[...(data.attachments||[])];form.orderUploads||=new Map();
  for(const file of files){if(!form.orderUploads.has(file))form.orderUploads.set(file,await upload(file));attachments.push(form.orderUploads.get(file));}
  const result=await execute({action:'save',kind:'orders',id:form.dataset.id||undefined,data:{...data,attachments}});
  form.dataset.id=result.result;form.dataset.saved='true';return result;
 }finally{controls.forEach(([el,disabled])=>el.disabled=disabled);}
}
export function createOrderGuard({ask,getHash,setHash}){
 let active=null,kept=null,parked=null,hash='',baseline='',restoring=false;
 const fingerprint=form=>JSON.stringify({fields:[...new FormData(form).entries()].map(([key,value])=>[key,typeof value==='string'?value:value.name?[value.name,value.size,value.lastModified]:null]),lines:[...form.querySelectorAll('[data-order-line]')].map(el=>[el.dataset.orderLine,el.value])});
 const dirty=()=>Boolean(active&&fingerprint(active)!==baseline);
 const guard={
  get dirty(){return dirty()||Boolean(parked);},
  capture(form){kept=form&&hash===getHash()?form:null;},
  bind(form){if(!form){active=null;kept=null;hash='';return;}if(parked&&parked.hash===getHash()){form.replaceWith(parked.form);active=parked.form;baseline=parked.baseline;hash=parked.hash;parked=null;kept=null;return;}if(kept&&hash===getHash()){form.replaceWith(kept);active=kept;}else{active=form;baseline=fingerprint(form);}kept=null;hash=getHash();},
  park(){parked={form:active,hash,baseline};active=null;kept=null;},
  discardParked(){parked=null;},
  saved(){if(active)baseline=fingerprint(active);kept=null;},
  async canLeave(){if(!dirty()&&!parked)return true;if(!await ask('Tienes cambios sin guardar en el pedido. ¿Salir sin guardarlos?'))return false;guard.saved();parked=null;return true;},
  async guardHash(){if(restoring){restoring=false;return false;}if(dirty()&&getHash()!==hash&&!await guard.canLeave()){restoring=true;setHash(hash);return false;}return true;}
 };return guard;
}
