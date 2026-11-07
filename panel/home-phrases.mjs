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
 return `<section class="home-phrases" aria-label="Frase del día"><p class="home-daily-phrase" aria-live="polite">${escapeHtml(dailyPhrase(settings))}</p><details class="home-phrases-editor"><summary>Administrar frases</summary><form id="home-phrases-form"><label class="field"><span>Mis frases · una por línea</span><textarea name="phrases" rows="6" maxlength="50000" aria-describedby="home-phrases-help">${escapeHtml((settings.homePhrases?.items||[]).join('\n'))}</textarea></label><p id="home-phrases-help">Se muestra una frase cada día, en este orden. Al terminar, vuelven a empezar. Puedes agregar o editar las líneas y cambiar su orden.</p><div class="actions"><button type="button" data-phrases-cancel>Cancelar</button><button type="submit" class="primary">Guardar frases</button></div><p class="home-phrases-status" role="status"></p></form></details></section>`;
}
export function bindHomePhrases({getSettings,execute,notice}){
 const form=document.querySelector('#home-phrases-form');if(!form)return;
 const details=form.closest('details'),message=form.querySelector('[role=status]');
 if(draft?.dirty){form.elements.phrases.value=draft.text;details.open=true;}
 form.elements.phrases.addEventListener('input',()=>{draft={text:form.elements.phrases.value,dirty:form.elements.phrases.value!==(getSettings().homePhrases?.items||[]).join('\n')};});
 let saving=false;
 const setBusy=value=>{saving=value;form.querySelectorAll('button,textarea').forEach(node=>node.disabled=value);};
 details.addEventListener('toggle',()=>{if(!details.open&&!saving&&!draft?.dirty){form.elements.phrases.value=(getSettings().homePhrases?.items||[]).join('\n');message.textContent='';}});
 form.querySelector('[data-phrases-cancel]').addEventListener('click',()=>{draft=null;form.elements.phrases.value=(getSettings().homePhrases?.items||[]).join('\n');details.open=false;});
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopPropagation();if(saving)return;
  try{normalizePhrases(form.elements.phrases.value);setBusy(true);message.setAttribute('role','status');message.textContent='Guardando…';await execute({action:'home-phrases',text:form.elements.phrases.value});draft=null;document.querySelector('.home-daily-phrase').textContent=dailyPhrase(getSettings());message.textContent='';details.open=false;notice('Frases guardadas.');}
  catch(error){message.textContent=error.message;message.setAttribute('role','alert');}
  finally{setBusy(false);}
 });
}
