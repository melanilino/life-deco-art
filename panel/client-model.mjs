import {list} from './domain.mjs';
export function clientFormValues(record={}){
 const company=record.clientType==='company';
 return {...record,clientType:company?'company':'person',personName:company?'':record.name||'',personPhone:company?'':record.phone||'',personEmail:company?'':record.email||'',companyName:company?record.name||record.companyName||'':'',companyPhone:company?record.phone||'':'',companyEmail:company?record.email||'':'',interests:Array.isArray(record.interests)?record.interests:String(record.interests||'').split(',').map(v=>v.trim()).filter(Boolean)};
}
export function findClientDuplicate(state,values,excludeId=''){
 const phone=String(values.phone||'').replace(/\D/g,''),email=String(values.email||'').trim().toLocaleLowerCase('es');
 if(!phone&&!email)return null;
 for(const client of list(state,'clients',true)){
  if(client.id===excludeId)continue;
  const fields=[];
  if(phone&&String(client.phone||'').replace(/\D/g,'')===phone)fields.push('teléfono');
  if(email&&String(client.email||'').trim().toLocaleLowerCase('es')===email)fields.push('correo');
  if(fields.length)return {client,fields};
 }
 return null;
}
export function clientData(fd){
 const value=key=>String(fd.get(key)||'').trim(),type=value('clientType')==='company'?'company':'person',company=type==='company';
 const name=value(company?'companyName':'personName'),phone=value(company?'companyPhone':'personPhone'),email=value(company?'companyEmail':'personEmail');
 if(!name)throw Error(company?'Escribe el nombre de la empresa.':'Escribe el nombre completo.');
 if(!phone)throw Error('Añade el teléfono o WhatsApp del cliente.');
 const data={name,clientType:type,phone,email,companyName:company?name:'',ageRange:company?'':value('ageRange'),gender:company?'':value('gender'),interests:fd.getAll('interests')};
 for(const key of ['contactName','role','instagram','rnc','source','preferredChannel','tags','observations','identityNumber','address','sector','city','deliveryReference','deliveryPreference'])data[key]=value(key);
 if(fd.has('notes'))data.notes=value('notes');
 return data;
}
export function createClientGuard({ask,getHash,setHash}){
 let dirty=false,hash='',kept=null,restoring=false,baseline='';const bound=new WeakSet();
 const fingerprint=form=>JSON.stringify([...new FormData(form).entries()]);
 return {
  bind(form){if(!form){kept=null;dirty=false;hash='';return null;}if(kept&&hash===getHash()){form.replaceWith(kept);form=kept;}else{baseline=fingerprint(form);dirty=false;}kept=null;hash=getHash();const changed=()=>dirty=fingerprint(form)!==baseline;if(!bound.has(form)){form.addEventListener('input',changed);form.addEventListener('change',changed);bound.add(form);}return form;},
  capture(form){kept=form&&hash===getHash()?form:null;},
  saved(){dirty=false;kept=null;baseline='';},
  get dirty(){return dirty;},
  async canLeave(){if(!dirty)return true;if(!await ask('Tienes cambios sin guardar en el cliente. ¿Salir sin guardarlos?'))return false;dirty=false;kept=null;return true;},
  async guardHash(){if(restoring){restoring=false;return false;}if(dirty&&getHash()!==hash&&!await this.canLeave()){restoring=true;setHash(hash);return false;}return true;}
 };
}

// History includes archived documents; active work excludes archived or closed orders.
export function clientOverview(state,id){
 const records=Object.values(state.records).filter(r=>!r.deleted);
 const stamp=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?n:0;};
 const created=r=>stamp(r.createdAt||r.date);
 const orders=records.filter(r=>r.kind==='orders'&&r.clientId===id).sort((a,b)=>created(b)-created(a)||String(b.id).localeCompare(String(a.id)));
 const related=records.filter(r=>r.id===id||['orders','quotes','invoices'].includes(r.kind)&&r.clientId===id);
 const targets=new Set(related.filter(r=>['orders','invoices'].includes(r.kind)).map(r=>r.id));
 const activity=[...related,...records.filter(r=>r.kind==='payments'&&targets.has(r.target))];
 const dates=activity.flatMap(r=>[r.createdAt,r.updatedAt,r.issuedAt,r.deliveredAt,...(r.kind==='payments'&&!r.createdAt&&!r.updatedAt?[r.date]:[])]).filter(v=>stamp(v)>0).sort((a,b)=>stamp(b)-stamp(a));
 return {lastOrder:orders[0]||null,activeOrders:orders.filter(r=>!r.archived&&!['entregado','cancelado','borrador'].includes(r.status)&&!['entregado','cancelado','borrador'].includes(r.stage)).length,lastActivity:dates[0]||''};
}
export function clientPageRows(rows,page=1,size=10){
 const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.max(1,Math.min(pages,Math.trunc(Number(page))||1)),start=(current-1)*size;
 return {rows:rows.slice(start,start+size),page:current,pages,total:rows.length,from:rows.length?start+1:0,to:Math.min(start+size,rows.length)};
}
export function clientDateLabel(value,today){
 if(!value)return 'Sin actividad';
 const d=new Date(value);if(!Number.isFinite(+d))return 'Sin fecha';
 const date=String(value).length===10?value:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 const days=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);
 if(days===0)return 'Hoy';if(days===1)return 'Hace 1 día';if(days>1&&days<30)return `Hace ${days} días`;
 return new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
}
