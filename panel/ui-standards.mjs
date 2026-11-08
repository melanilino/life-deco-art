// Conserva los selects originales: formularios, validación y eventos usan su valor real.
let observer, popup, owner, serial=0;
const controls=new WeakMap();
const formHelp={
 'catalog-item-form':['Portafolio','Guarda los datos del producto o servicio. Puedes completar su costo desde el portafolio.'],
 'catalog-material-form':['Inventario','Define la presentación de compra y su rendimiento para controlar el consumo del material.'],
 'catalog-supplier-form':['Proveedor','Conserva los datos de contacto para relacionarlos con tus compras.'],
 'finance-form':['Movimiento independiente','Los cobros de facturas se registran desde Ventas; los anticipos, desde Pedidos; y los pagos de compras, desde la compra.'],
 'content-form':['Contenido','Organiza la preparación y las publicaciones de cada plataforma. Listo indica preparado; Publicado requiere confirmar la publicación.'],
 'agenda-form':['Agenda y tareas','Vincula el registro con el trabajo correspondiente. Los horarios reservan tiempo en el calendario.']
};
function close(restore=false){
 if(!popup)return;
 popup.remove();popup=null;
 const previous=owner;owner=null;
 controls.get(previous)?.button.setAttribute('aria-expanded','false');
 if(restore&&previous?.isConnected)controls.get(previous)?.button.focus();
}
function labelFor(select){
 return select.getAttribute('aria-label')||select.labels?.[0]?.querySelector('span')?.textContent?.trim()||select.name||'Seleccionar';
}
function refresh(select){
 const control=controls.get(select);if(!control)return;
 const text=select.selectedOptions[0]?.textContent||'Seleccionar';
 if(control.text.textContent!==text)control.text.textContent=text;
 const disabled=select.disabled||Boolean(select.closest('fieldset[disabled]'));
 if(control.button.disabled!==disabled)control.button.disabled=disabled;
 if(control.button.parentElement.hidden!==select.hidden)control.button.parentElement.hidden=select.hidden;
 control.button.setAttribute('aria-label',`${labelFor(select)}: ${text}`);
 control.button.setAttribute('aria-required',String(select.required));
}
function open(select){
 close();refresh(select);const control=controls.get(select);if(control.button.disabled)return;
 owner=select;popup=document.createElement('div');popup.className='hub-select-menu';
 popup.id=control.button.getAttribute('aria-controls');popup.setAttribute('role','listbox');popup.setAttribute('aria-label',labelFor(select));
 Array.from(select.options).forEach((option,index)=>{
  if(option.hidden)return;
  const item=document.createElement('button');item.type='button';item.role='option';item.textContent=option.textContent;
  item.setAttribute('aria-selected',String(option.selected));item.disabled=option.disabled||option.parentElement.disabled;
  item.dataset.index=index;item.tabIndex=-1;
  item.addEventListener('click',()=>{select.selectedIndex=index;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));refresh(select);close(true);});
  popup.append(item);
 });
 document.body.append(popup);control.button.setAttribute('aria-expanded','true');
 const box=control.button.getBoundingClientRect(),width=Math.min(Math.max(box.width,180),innerWidth-24);
 popup.style.width=`${width}px`;popup.style.left=`${Math.max(12,Math.min(box.left,innerWidth-width-12))}px`;
 const below=innerHeight-box.bottom-12,above=box.top-12;
 popup.style.maxHeight=`${Math.max(80,Math.min(300,Math.max(below,above)))}px`;
 if(below<160&&above>below)popup.style.bottom=`${innerHeight-box.top+4}px`;else popup.style.top=`${box.bottom+4}px`;
 const enabled=[...popup.children].filter(b=>!b.disabled);(enabled.find(b=>b.getAttribute('aria-selected')==='true')||enabled[0])?.focus();
 popup.addEventListener('keydown',event=>{
  const items=[...popup.children].filter(b=>!b.disabled),current=items.indexOf(document.activeElement);
  let index;
  if(event.key==='ArrowDown')index=(current+1)%items.length;
  if(event.key==='ArrowUp')index=(current-1+items.length)%items.length;
  if(event.key==='Home')index=0;if(event.key==='End')index=items.length-1;
  if(index!==undefined){event.preventDefault();items[index]?.focus();}
  if(event.key==='Escape'){event.preventDefault();close(true);}
  if(event.key==='Tab')close();
  if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){const candidates=items.slice(current+1).concat(items.slice(0,current+1));candidates.find(b=>b.textContent.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()))?.focus();}
 });
}
function enhanceSelect(select){
 if(select.multiple||select.size>1)return;
 if(controls.has(select)){refresh(select);return;}
 const wrapper=document.createElement('span');wrapper.className='hub-select';
 const button=document.createElement('button');button.type='button';button.className='hub-select-trigger';
 button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',`hub-options-${++serial}`);
 const text=document.createElement('span'),arrow=document.createElement('span');arrow.className='hub-select-arrow';arrow.setAttribute('aria-hidden','true');
 button.append(text,arrow);select.before(wrapper);wrapper.append(select,button);
 select.classList.add('hub-select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 controls.set(select,{button,text});refresh(select);
 button.addEventListener('click',event=>{event.preventDefault();owner===select?close(true):open(select);});
 button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(select);}});
 select.addEventListener('change',()=>refresh(select));
 select.addEventListener('invalid',()=>{button.focus();button.setAttribute('aria-invalid','true');},true);
 select.addEventListener('change',()=>button.removeAttribute('aria-invalid'));
 select.addEventListener('focus',()=>button.focus());
}
function enhanceForms(root){
 root.querySelectorAll('form').forEach(form=>{
  const help=formHelp[form.id]||(form.matches('[data-admin-form="subscription"]')?['Suscripción','La renovación prevista no registra un pago. Confirma el cobro desde la suscripción para vincularlo a Finanzas.']:null);
  if(!help||form.closest('.hub-form-layout'))return;
  const layout=document.createElement('div');layout.className='hub-form-layout';
  const aside=document.createElement('aside');aside.className='hub-form-summary';
  const title=document.createElement('h2'),copy=document.createElement('p');title.textContent=help[0];copy.textContent=help[1];aside.append(title,copy);
  form.before(layout);layout.append(form,aside);
 });
}
export function syncHubUI(root=document){
 if(owner&&!owner.isConnected)close();
 enhanceForms(root);root.querySelectorAll('select').forEach(enhanceSelect);
 if(!observer){
  let pending=false;
  observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;syncHubUI();});});
  observer.observe(document.querySelector('#app'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','required','selected','hidden']});
  document.addEventListener('pointerdown',event=>{if(popup&&!popup.contains(event.target)&&!controls.get(owner)?.button.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
  addEventListener('resize',()=>close());
  document.addEventListener('scroll',event=>{if(popup&&!popup.contains(event.target))close();},true);
  document.addEventListener('reset',event=>{setTimeout(()=>event.target.querySelectorAll('select').forEach(refresh));});
 }
}
