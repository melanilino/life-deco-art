import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyPhrase,normalizePhrases,phraseDate,homePhrasesHtml} from '../panel/home-phrases.mjs';
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
