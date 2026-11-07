const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
export function dailyPhrase(settings,now=new Date()){
 const config=settings.homePhrases,items=config?.items||[];
 if(!items.length)return '';
 const date=phraseDate(now,settings.timezone),anchor=config.startDate||date;
 const elapsed=Math.max(0,Math.floor((Date.parse(date+'T12:00:00Z')-Date.parse(anchor+'T12:00:00Z'))/86400000));
 return items[elapsed%items.length];
}
export function homePhrasesHtml(settings){
 return `<section class="home-phrases" aria-label="Frase del día"><p class="home-daily-phrase" aria-live="polite">${escapeHtml(dailyPhrase(settings))}</p><button type="button" class="home-phrases-trigger" aria-label="Administrar" aria-haspopup="dialog" aria-controls="home-phrases-panel" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z"/></svg></button></section><dialog id="home-phrases-panel" class="quick-notes-panel home-phrases-panel" aria-labelledby="home-phrases-title"><div class="quick-notes-head"><div><h2 id="home-phrases-title">Mis frases</h2></div><button type="button" data-phrases-close aria-label="Cerrar frases">×</button></div><div class="quick-notes-scroll"><form id="home-phrases-form"><label class="field"><span>Una frase por línea</span><textarea name="phrases" rows="8" maxlength="50000" aria-describedby="home-phrases-help">${escapeHtml((settings.homePhrases?.items||[]).join('\n'))}</textarea></label><p id="home-phrases-help">Se muestra una frase cada día, en este orden. Al terminar, vuelven a empezar. Puedes agregar o editar las líneas y cambiar su orden.</p><div class="actions"><button type="button" data-phrases-cancel>Cancelar</button><button type="submit" class="primary">Guardar frases</button></div><p class="home-phrases-status" role="status"></p></form></div></dialog>`;
}
export function bindHomePhrases({getSettings,execute,notice,onOpen=()=>{}}){
 const form=document.querySelector('#home-phrases-form');if(!form)return;
 const panel=form.closest('dialog'),trigger=document.querySelector('.home-phrases-trigger'),message=form.querySelector('[role=status]');
 if(draft?.dirty)form.elements.phrases.value=draft.text;
 trigger.addEventListener('click',()=>{onOpen();panel.showModal();trigger.setAttribute('aria-expanded','true');form.elements.phrases.focus();});
 panel.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus();});
 panel.querySelector('[data-phrases-close]').addEventListener('click',()=>{if(!saving)panel.close();});
 panel.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
 form.elements.phrases.addEventListener('input',()=>{draft={text:form.elements.phrases.value,dirty:form.elements.phrases.value!==(getSettings().homePhrases?.items||[]).join('\n')};});
 let saving=false;
 const setBusy=value=>{saving=value;form.querySelectorAll('button,textarea').forEach(node=>node.disabled=value);};
 form.querySelector('[data-phrases-cancel]').addEventListener('click',()=>{draft=null;form.elements.phrases.value=(getSettings().homePhrases?.items||[]).join('\n');message.textContent='';panel.close();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopPropagation();if(saving)return;
  try{normalizePhrases(form.elements.phrases.value);setBusy(true);message.setAttribute('role','status');message.textContent='Guardando…';await execute({action:'home-phrases',text:form.elements.phrases.value});draft=null;document.querySelector('.home-daily-phrase').textContent=dailyPhrase(getSettings());message.textContent='';panel.close();notice('Frases guardadas.');}
  catch(error){message.textContent=error.message;message.setAttribute('role','alert');}
  finally{setBusy(false);}
 });
}
