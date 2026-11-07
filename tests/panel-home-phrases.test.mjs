import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyPhrase,normalizePhrases,phraseDate,homePhrasesHtml,bindHomePhrases,phraseCards} from '../panel/home-phrases.mjs';
import {applyCommand,emptyState} from '../panel/domain.mjs';

test('Frases rota por día local, permanece durante el día y reinicia la lista',()=>{
 const settings={timezone:'America/Santo_Domingo',homePhrases:{items:['A','B'],startDate:'2026-11-07'}};
 assert.equal(dailyPhrase(settings,new Date('2026-11-07T04:00:00Z')),'A');
 assert.equal(dailyPhrase(settings,new Date('2026-11-08T03:59:00Z')),'A');
 assert.equal(dailyPhrase(settings,new Date('2026-11-08T04:00:00Z')),'B');
 assert.equal(dailyPhrase(settings,new Date('2026-11-09T04:00:00Z')),'A');
 assert.equal(phraseDate(new Date('2026-11-08T03:00:00Z'),'America/Santo_Domingo'),'2026-11-07');
 assert.equal(dailyPhrase({}), '');
});
test('Guardar frases conserva datos del negocio y archiva líneas retiradas',()=>{
 const initial=emptyState();
 let state=applyCommand(initial,{action:'home-phrases',text:' Uno \n\nDos\nUno'},{id:'first',at:'2026-11-07T14:00:00Z'}).state;
 assert.deepEqual(state.settings.homePhrases.items,['Uno','Dos']);
 assert.deepEqual(state.settings.currency,initial.settings.currency);
 state=applyCommand(state,{action:'home-phrases',text:'Dos\nTres'},{id:'second',at:'2026-11-08T14:00:00Z'}).state;
 assert.deepEqual(state.settings.homePhrases.archived,['Uno']);
 assert.equal(state.settings.homePhrases.startDate,'2026-11-07');
 assert.deepEqual(initial.settings.homePhrases,undefined);
 assert.equal(dailyPhrase(JSON.parse(JSON.stringify(state)).settings,new Date('2026-11-08T14:00:00Z')),'Tres');
});
test('Frases valida límites y muestra el contenido como texto seguro',()=>{
 assert.throws(()=>normalizePhrases('a'.repeat(301)));
 assert.throws(()=>normalizePhrases(Array.from({length:101},(_,i)=>String(i)).join('\n')));
 assert.match(homePhrasesHtml({homePhrases:{items:['</textarea><script>bad</script>'],startDate:'2026-11-07'}}),/&lt;\/textarea&gt;&lt;script&gt;/);
 assert.deepEqual(normalizePhrases('  \n'),[]);
});

test('Panel de frases conserva el texto al fallar, evita doble envío y Cancelar descarta',async()=>{
 const node=()=>({handlers:{},disabled:false,textContent:'',value:'',attrs:{},addEventListener(event,fn){this.handlers[event]=fn;},setAttribute(key,value){this.attrs[key]=value;},focus(){this.focused=true;}});
 const trigger=node(),panel=node(),close=node(),cancel=node(),message=node(),input=node(),save=node(),phrase=node(),form=node(),search=node(),results=node(),label=node();
 panel.querySelector=selector=>selector==='[type=search]'?search:selector==='.home-phrase-results'?results:close;panel.showModal=()=>panel.open=true;panel.close=()=>{panel.open=false;panel.handlers.close();};panel.querySelectorAll=()=>[input,cancel,save,search,close];
 form.elements={phrases:input};form.closest=()=>panel;form.querySelector=selector=>selector==='[role=status]'?message:selector==='[data-phrase-label]'?label:cancel;
 const oldDocument=globalThis.document;
 globalThis.document={querySelector:selector=>selector==='#home-phrases-form'?form:selector==='.home-phrases-trigger'?trigger:phrase};
 let calls=0,fail=true,resolveSave;
 const settings={homePhrases:{items:[]}};
 try{
  bindHomePhrases({getSettings:()=>settings,execute:async command=>{calls++;if(fail)throw Error('Sin conexión');await new Promise(resolve=>resolveSave=resolve);settings.homePhrases={items:normalizePhrases(command.text),startDate:phraseDate()};},notice:()=>{}});
  trigger.handlers.click();assert.equal(panel.open,true);assert.equal(input.focused,true);
  input.value='Mi frase';input.handlers.input();
  const event={preventDefault(){},stopPropagation(){}};
  await form.handlers.submit(event);assert.equal(message.textContent,'Sin conexión');assert.equal(input.value,'Mi frase');assert.equal(panel.open,true);assert.equal(input.disabled,false);
  fail=false;const saving=form.handlers.submit(event);await form.handlers.submit(event);assert.equal(calls,2);assert.equal(input.disabled,true);resolveSave();await saving;
  assert.equal(panel.open,true);assert.equal(phrase.textContent,'Mi frase');assert.equal(input.value,'');assert.match(results.innerHTML,/Mi frase/);
  input.value='Sin guardar';input.handlers.input();cancel.handlers.click();assert.equal(input.value,'');assert.equal(panel.open,false);
 }finally{globalThis.document=oldDocument;}
});

test('Guardar una frase agrega sin sustituir las anteriores y editar conserva el orden',()=>{
 let state=emptyState();state.settings.homePhrases={items:['Frase anterior'],startDate:'2026-11-07',archived:['Conservada']};
 state=applyCommand(state,{action:'home-phrase-save',text:'Nueva frase',index:null},{id:'a'}).state;
 assert.deepEqual(state.settings.homePhrases.items,['Frase anterior','Nueva frase']);
 state=applyCommand(state,{action:'home-phrase-save',text:'Frase editada',index:0,originalText:'Frase anterior'},{id:'b'}).state;
 assert.deepEqual(state.settings.homePhrases.items,['Frase editada','Nueva frase']);
 assert.equal(state.settings.homePhrases.startDate,'2026-11-07');
 assert.deepEqual(state.settings.homePhrases.archived,['Conservada']);
 assert.throws(()=>applyCommand(state,{action:'home-phrase-save',text:'Nueva frase'}),/ya está guardada/);
 assert.throws(()=>applyCommand(state,{action:'home-phrase-save',text:'Cambio',index:0,originalText:'Valor antiguo'}),/cambió/);
 assert.throws(()=>applyCommand(state,{action:'home-phrase-save',text:'  '}),/Escribe/);
 assert.deepEqual(state.settings.homePhrases.items,['Frase editada','Nueva frase']);
});

test('Buscar frases ignora acentos, conserva índices y escapa el texto de las tarjetas',()=>{
 const settings={homePhrases:{items:['Crear con intención','Otro día','<script>texto</script>']}};
 assert.match(phraseCards(settings,'INTENCION'),/Crear con intención/);
 assert.doesNotMatch(phraseCards(settings,'INTENCION'),/Otro día/);
 assert.match(phraseCards(settings,'día'),/data-phrase-edit="1"/);
 assert.match(phraseCards(settings,'script'),/&lt;script&gt;/);
 assert.match(phraseCards(settings,'ninguna'),/No hay frases que coincidan/);
});
