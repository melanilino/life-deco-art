const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Mismo trazado del favicon; el color y grosor los aporta el control del Hub.
export const phrasePencilIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg>';
let draft=null;
if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(draft?.dirty){event.preventDefault();event.returnValue='';}});

export function phraseDate(now=new Date(),timezone='America/Santo_Domingo'){
 let formatter;
 try{formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'});}catch{formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'});}
 const parts=Object.fromEntries(formatter.formatToParts(now).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function normalizePhrases(text){
 if(typeof text!=='string'||text.length>50000)throw Error('Utiliza hasta 100 frases de 300 caracteres cada una.');
 const phrases=[...new Set(text.split(/\r?\n/).map(value=>value.trim()).filter(Boolean))];
 if(phrases.length>100||phrases.some(value=>value.length>300))throw Error('Utiliza hasta 100 frases de 300 caracteres cada una.');
 return phrases;
}
export function singlePhrase(text){
 if(typeof text!=='string'||!text.trim())throw Error('Escribe una frase antes de guardar.');
 const value=text.trim();if(value.length>300)throw Error('La frase debe tener hasta 300 caracteres.');return value;
}
const searchText=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function phraseCards(settings,query=''){
 const items=settings.homePhrases?.items||[],needle=searchText(query.trim()),rows=items.map((text,index)=>({text,index})).filter(row=>searchText(row.text).includes(needle));
 return rows.length?rows.map(({text,index})=>`<article class="home-phrase-card"><p>${escapeHtml(text)}</p><button type="button" data-phrase-edit="${index}" aria-label="Editar frase ${index+1}">Editar</button></article>`).join(''):`<p class="quick-notes-empty">${needle?'No hay frases que coincidan con la búsqueda.':'Todavía no has guardado frases.'}</p>`;
}
export function dailyPhrase(settings,now=new Date()){
 const config=settings.homePhrases,items=config?.items||[];
 if(!items.length)return '';
 const date=phraseDate(now,settings.timezone),anchor=config.startDate||date;
 const elapsed=Math.max(0,Math.floor((Date.parse(date+'T12:00:00Z')-Date.parse(anchor+'T12:00:00Z'))/86400000));
 return items[elapsed%items.length];
}
export function homePhrasesHtml(settings){
 return `<section class="home-phrases" aria-label="Frase del día"><p class="home-daily-phrase" aria-live="polite">${escapeHtml(dailyPhrase(settings))}</p><button type="button" class="home-phrases-trigger" aria-label="Administrar" aria-haspopup="dialog" aria-controls="home-phrases-panel" aria-expanded="false">${phrasePencilIcon}</button></section><dialog id="home-phrases-panel" class="quick-notes-panel home-phrases-panel" aria-labelledby="home-phrases-title"><div class="quick-notes-head"><div><h2 id="home-phrases-title">Mis frases</h2></div><button type="button" data-phrases-close aria-label="Cerrar frases">×</button></div><div class="quick-notes-scroll"><form id="home-phrases-form"><label class="field"><span data-phrase-label>Nueva frase</span><textarea name="phrases" rows="3" maxlength="300" required aria-describedby="home-phrases-help" placeholder="Escribe una frase…"></textarea></label><p id="home-phrases-help">Las frases guardadas se muestran en Inicio, una cada día.</p><div class="actions"><button type="button" data-phrases-cancel>Cancelar</button><button type="submit" class="primary">Guardar</button></div><p class="home-phrases-status" role="status"></p></form><section class="home-phrase-library" aria-label="Frases guardadas"><label class="home-phrase-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="Buscar frases" placeholder="Buscar frases…"></label><div class="home-phrase-results" aria-live="polite">${phraseCards(settings)}</div></section></div></dialog>`;
}
export function bindHomePhrases({getSettings,execute,notice,onOpen=()=>{}}){
 const form=document.querySelector('#home-phrases-form');if(!form)return;
 const panel=form.closest('dialog'),trigger=document.querySelector('.home-phrases-trigger'),message=form.querySelector('[role=status]'),search=panel.querySelector('[type=search]'),results=panel.querySelector('.home-phrase-results'),label=form.querySelector('[data-phrase-label]');
 let editingIndex=draft?.dirty?draft.index:null,originalText=draft?.dirty?draft.originalText:'';
 if(draft?.dirty)form.elements.phrases.value=draft.text;
 const refresh=()=>{results.innerHTML=phraseCards(getSettings(),search.value);};
 const reset=()=>{draft=null;editingIndex=null;originalText='';form.elements.phrases.value='';label.textContent='Nueva frase';message.textContent='';};
 if(editingIndex!==null)label.textContent='Editar frase';
 trigger.addEventListener('click',()=>{onOpen();refresh();panel.showModal();trigger.setAttribute('aria-expanded','true');form.elements.phrases.focus();});
 panel.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus();});
 panel.querySelector('[data-phrases-close]').addEventListener('click',()=>{if(!saving)panel.close();});
 panel.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
 form.elements.phrases.addEventListener('input',()=>{draft={text:form.elements.phrases.value,index:editingIndex,originalText,dirty:form.elements.phrases.value!==originalText};});
 let saving=false;
 const setBusy=value=>{saving=value;panel.querySelectorAll('button,textarea,input').forEach(node=>node.disabled=value);};
 search.addEventListener('input',refresh);
 results.addEventListener('click',event=>{const edit=event.target.closest('[data-phrase-edit]');if(!edit||saving)return;editingIndex=Number(edit.dataset.phraseEdit);originalText=getSettings().homePhrases.items[editingIndex];form.elements.phrases.value=originalText;draft=null;label.textContent='Editar frase';message.textContent='';form.elements.phrases.focus();});
 form.querySelector('[data-phrases-cancel]').addEventListener('click',()=>{const wasEditing=editingIndex!==null;reset();if(!wasEditing)panel.close();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopPropagation();if(saving)return;
  try{const text=singlePhrase(form.elements.phrases.value);setBusy(true);message.setAttribute('role','status');message.textContent='Guardando…';await execute({action:'home-phrase-save',text,index:editingIndex,originalText});reset();search.value='';refresh();document.querySelector('.home-daily-phrase').textContent=dailyPhrase(getSettings());notice('Frase guardada.');}
  catch(error){message.textContent=error.message;message.setAttribute('role','alert');}
  finally{setBusy(false);}
 });
}
