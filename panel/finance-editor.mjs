// Keep the actual form node, including its selected file, during local redraws.
export function createFinanceGuard({ask,getHash,setHash}){
 let active=null,baseline='',hash='',restoring=false;
 const fingerprint=form=>JSON.stringify([form.dataset.direction,...[...form.querySelectorAll('input,select,textarea')].map(el=>[el.name,el.type==='file'?[...el.files].map(f=>[f.name,f.size,f.lastModified]):el.type==='radio'||el.type==='checkbox'?el.checked:el.value])]);
 const dirty=()=>Boolean(active&&!active.dataset.saved&&fingerprint(active)!==baseline);
 const guard={get dirty(){return dirty();},capture(){},bind(form){
  if(!form){active=null;return null;}
  if(active&&hash===getHash()){form.replaceWith(active);return active;}
  active=form;hash=getHash();baseline=fingerprint(form);return active;
 },saved(){if(active){active.dataset.saved='true';baseline=fingerprint(active);}},async canLeave(){
  if(active?.dataset.saving)return false;
  if(dirty()&&!await ask('Tienes un movimiento sin guardar. ¿Salir sin guardarlo?'))return false;
  active=null;return true;
 },async guardHash(){
  if(restoring){restoring=false;return false;}
  if(active&&getHash()!==hash&&!await guard.canLeave()){restoring=true;setHash(hash);return false;}
  return true;
 }};return guard;
}

const uploads=new WeakMap();
export async function saveFinanceForm(form,{upload,execute,read=()=>Object.fromEntries(new FormData(form))}){
 if(form.dataset.saved||form.dataset.saving)return null;
 const data=read(),file=form.elements.receipt.files[0];delete data.receipt;data.direction=form.dataset.direction;
 if(file&&(file.size>10*1024*1024||!['image/png','image/jpeg','application/pdf'].includes(file.type)))throw Error('Selecciona un PNG, JPG o PDF de hasta 10 MB.');
 const controls=[...form.querySelectorAll('input,select,textarea')].map(el=>[el,el.disabled]);
 form.dataset.saving='true';controls.forEach(([el])=>el.disabled=true);
 try{
  if(file){let receipt=uploads.get(file);if(!receipt){receipt=await upload(file);uploads.set(file,receipt);}data.receipt=receipt;}
  const result=await execute({action:'finance-entry',data});form.dataset.saved='true';return {...result,direction:data.direction};
 }finally{delete form.dataset.saving;controls.forEach(([el,disabled])=>el.disabled=disabled);}
}
