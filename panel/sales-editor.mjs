// Preserve fields outside the visible editor; do not replace them with empty values.
export function readSalesDraft(form,fields){
 const fd=new FormData(form),data={};
 for(const field of fields){
  if(field.type==='file'||!fd.has(field.key))continue;
  data[field.key]=field.type==='number'?Number(fd.get(field.key)||0):String(fd.get(field.key)||'').trim();
 }
 data.lines=[...form.querySelectorAll('.sales-line-row')].map(row=>{
  const line=Object.fromEntries([...row.querySelectorAll('[data-line]')].map(el=>[el.dataset.line,el.type==='number'?Number(el.value):el.value]));
  if(line.composition){try{line.composition=JSON.parse(line.composition);}catch{throw Error('No se pudo leer la composición del artículo. Conserva el borrador y vuelve a abrirlo.');}}
  return line;
 });
 return data;
}
export function createSalesGuard({ask,getHash,setHash}){
 let active=null,kept=null,hash='',baseline='',restoring=false;
 const fingerprint=form=>JSON.stringify({fields:[...new FormData(form).entries()],lines:[...form.querySelectorAll('[data-line]')].map(el=>[el.dataset.line,el.value])});
 const dirty=()=>Boolean(active&&fingerprint(active)!==baseline);
 return {
  get dirty(){return dirty();},
  capture(form){kept=form&&hash===getHash()?form:null;},
  bind(form){if(!form){active=null;kept=null;hash='';return;}if(kept&&hash===getHash()){form.replaceWith(kept);active=kept;}else{active=form;baseline=fingerprint(form);}kept=null;hash=getHash();},
  saved(){if(active)baseline=fingerprint(active);kept=null;},
  async canLeave(){if(!dirty())return true;if(!await ask('Tienes cambios sin guardar en el documento. ¿Salir sin guardarlos?'))return false;this.saved();return true;},
  async guardHash(){if(restoring){restoring=false;return false;}if(dirty()&&getHash()!==hash&&!await this.canLeave()){restoring=true;setHash(hash);return false;}return true;}
 };
}
export async function saveSalesDraft(form,kind,data,intent,execute){
 if(form.dataset.saved)return null;
 const controls=[...form.querySelectorAll('input,select,textarea')].map(el=>[el,el.disabled]);
 controls.forEach(([el])=>el.disabled=true);
 try{
  const result=await execute({action:'save',kind,id:form.dataset.id||undefined,data});
  // Retain the committed id before attempting emission, including if Notes rerenders the form.
  form.dataset.id=result.result;
  if(intent==='issue'){
   try{await execute({action:'issue',id:result.result});}
   catch(error){throw Error('El borrador quedó guardado. No se pudo emitir: '+error.message+' Puedes volver a intentarlo aquí; se usará el mismo documento.',{cause:error});}
  }
  form.dataset.saved='true';return result;
 }finally{controls.forEach(([el,disabled])=>el.disabled=disabled);}
}
