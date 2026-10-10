import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyCommand,events} from '../panel/domain.mjs';
import {contentStatus,publications,nextPublication,filterContent,contentCsv} from '../panel/content-model.mjs';
const publication=(id,platform,date,status='pendiente')=>({id,platform,date,time:'19:00',status,actualDate:status==='publicado'?date:'',text:'Texto adaptado',url:''});
test('una idea requiere solo título; fechas previstas no significan publicado',()=>{
 const {state,result}=applyCommand(emptyState(),{action:'save',kind:'content',data:{name:'Idea',stage:'idea',publications:[]}},{id:'idea'});
 assert.equal(result,'idea');assert.equal(contentStatus(state.records.idea),'idea');assert.equal(events(state).length,0);
 const r={name:'Pieza',stage:'listo',publications:[publication('p','Instagram','2020-01-01')]};assert.equal(contentStatus(r),'listo');assert.equal(nextPublication(r).date,'2020-01-01');
});
test('publicación parcial conserva próximas fechas y Agenda usa el mismo registro',()=>{
 let {state}=applyCommand(emptyState(),{action:'save',kind:'content',data:{name:'Dos plataformas',stage:'listo',publications:[publication('a','Instagram','2026-10-02','publicado'),publication('b','TikTok','2026-10-08')]}},{id:'piece'});
 assert.equal(contentStatus(state.records.piece),'parcial');assert.equal(nextPublication(state.records.piece).date,'2026-10-08');assert.equal(events(state).length,1);assert.equal(events(state)[0].href,'#content/piece/publication-b');
 state=applyCommand(state,{action:'save',kind:'content',id:'piece',data:{publications:[publication('a','Instagram','2026-10-02','publicado'),publication('b','TikTok','2026-10-12')]}}).state;
 assert.equal(events(state)[0].eventDate,'2026-10-12');assert.equal(Object.keys(state.records).length,1);
 state=applyCommand(state,{action:'save',kind:'content',id:'piece',data:{publications:[publication('a','Instagram','2026-10-02','publicado'),publication('b','TikTok','2026-10-12','publicado')]}}).state;
 assert.equal(contentStatus(state.records.piece),'publicado');assert.equal(nextPublication(state.records.piece).label,'Completado');assert.equal(events(state).length,0);
});
test('publicar exige fecha real; no permite saltarse publicaciones con un estado global',()=>{
 const state=applyCommand(emptyState(),{action:'save',kind:'content',data:{name:'Pieza',stage:'idea',publications:[]}},{id:'piece'}).state;
 assert.throws(()=>applyCommand(state,{action:'save',kind:'content',id:'piece',data:{publications:[{...publication('a','Instagram','2026-10-08','publicado'),actualDate:''}]}}),/fecha real/);
 assert.throws(()=>applyCommand(state,{action:'status',id:'piece',status:'publicado'}),/publicaciones/);
 assert.throws(()=>applyCommand(state,{action:'save',kind:'content',id:'piece',data:{publications:[publication('a','Instagram','2026-02-30')]}}),/fechas/);
});
test('filtros combinados buscan textos, archivo conserva historial y CSV exporta selección',async()=>{
 let state=applyCommand(emptyState(),{action:'save',kind:'content',data:{name:'Pieza',stage:'listo',publications:[publication('a','Instagram','2026-10-08')]}},{id:'piece'}).state;
 const filtered=filterContent(Object.values(state.records),{query:'adaptado',platform:'Instagram',status:'listo'});assert.equal(filtered.length,1);assert.equal(filterContent(Object.values(state.records),{platform:'TikTok'}).length,0);assert.match(await contentCsv(filtered).text(),/Pieza/);
 state=applyCommand(state,{action:'archive',id:'piece'}).state;assert.equal(filterContent(Object.values(state.records)).length,0);assert.equal(filterContent(Object.values(state.records),{status:'archived'}).length,1);assert.equal(publications(state.records.piece).length,1);assert.equal(events(state).length,0);
});
test('registros anteriores mantienen su canal, texto, fecha y estado',()=>{
 const old={kind:'content',id:'old',name:'Anterior',channel:'Instagram',date:'2026-10-08',copy:'Texto anterior',status:'programado'};
 assert.equal(publications(old)[0].text,'Texto anterior');assert.equal(contentStatus(old),'listo');assert.equal(events({...emptyState(),records:{old}})[0].eventDate,'2026-10-08');
});
