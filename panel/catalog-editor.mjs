export function createCatalogGuard({ask,getHash,setHash}){
 let forms=new Map(),active=null,current='',restoring=false;
 const key=form=>getHash()+'|'+form.id+'|'+(form.dataset.kind||'');
 const fingerprint=form=>JSON.stringify([...form.querySelectorAll('input,select,textarea')].map(el=>[el.name,el.type,el.type==='checkbox'?el.checked:el.value]));
 const dirty=()=>[...forms.values()].some(entry=>fingerprint(entry.form)!==entry.baseline);
 const guard={get dirty(){return dirty();},capture(form){if(form&&active===form)forms.set(current,{form,baseline:forms.get(current)?.baseline??fingerprint(form)});},bind(form){if(!form){active=null;return;}current=key(form);const kept=forms.get(current);if(kept){form.replaceWith(kept.form);active=kept.form;}else{active=form;forms.set(current,{form,baseline:fingerprint(form)});}},saved(){forms.clear();if(active)forms.set(current,{form:active,baseline:fingerprint(active)});},async canLeave(){if(!dirty())return true;if(!await ask('Tienes cambios sin guardar en Catálogo. ¿Salir sin guardarlos?'))return false;forms.clear();active=null;return true;},async guardHash(){if(restoring){restoring=false;return false;}const previous=current.split('|')[0];if(dirty()&&getHash()!==previous&&!await guard.canLeave()){restoring=true;setHash(previous);return false;}if(getHash()!==previous){forms.clear();active=null;}return true;}};return guard;
}
export async function saveCatalogForm(form,command,execute){
 if(form.dataset.saved)return null;
 const controls=[...form.querySelectorAll('input,select,textarea')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
 try{const result=await execute(command);form.dataset.id=result.result||form.dataset.id||'';form.dataset.saved='true';return result;}finally{controls.forEach(([el,disabled])=>el.disabled=disabled);}
}
