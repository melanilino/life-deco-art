import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../panel/domain.mjs';
import {createStatisticsSelection,statisticsPage,bindStatistics} from '../panel/statistics.mjs';

function mount(selection,state=emptyState()){
 const nodes={'#stats-from':{value:selection.from},'#stats-to':{value:selection.to},'#stats-compare':{value:selection.compare},'#stats-results':{innerHTML:''},'#stats-error':{hidden:true}},events={};
 const root={querySelector:selector=>nodes[selector],addEventListener:(event,fn)=>events[event]=fn};
 const previous=globalThis.document;globalThis.document={querySelector:()=>root};
 try{bindStatistics(state,()=>'',selection);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
 return {nodes,change:()=>events.change(),sort:mode=>events.click({target:{closest:()=>({dataset:{statsSort:mode}})}})};
}

test('período, comparación e importe sobreviven a reconstruir la pantalla con datos actualizados',()=>{
 const selection=createStatisticsSelection('2026-11-04'),first=mount(selection);
 first.nodes['#stats-from'].value='2026-03';first.nodes['#stats-to'].value='2026-06';first.nodes['#stats-compare'].value='previous';first.change();first.sort('amount');
 assert.deepEqual(selection,{from:'2026-03',to:'2026-06',compare:'previous',mode:'amount'});
 const page=statisticsPage(selection);assert.match(page,/value="2026-03"/);assert.match(page,/value="2026-06"/);assert.match(page,/value="previous" selected/);
 const updated=emptyState();updated.records.sale={id:'sale',kind:'invoices',status:'pendiente',date:'2026-04-01',lines:[{description:'Prueba ficticia',quantity:1,price:100}]};
 const second=mount(selection,updated);assert.match(second.nodes['#stats-results'].innerHTML,/RD\$100\.00/);assert.match(second.nodes['#stats-results'].innerHTML,/data-stats-sort="amount" aria-pressed="true"/);assert.match(second.nodes['#stats-results'].innerHTML,/Comparación:/);
});

test('rango incompleto conserva el error y una sesión nueva comienza con valores predeterminados',()=>{
 const selection=createStatisticsSelection('2026-11-04'),first=mount(selection);first.nodes['#stats-from'].value='';first.change();assert.equal(first.nodes['#stats-error'].hidden,false);assert.equal(first.nodes['#stats-results'].innerHTML,'');
 const second=mount(selection);assert.equal(second.nodes['#stats-from'].value,'');assert.equal(second.nodes['#stats-error'].hidden,false);
 assert.deepEqual(createStatisticsSelection('2027-01-02'),{from:'2027-01',to:'2027-01',compare:'none',mode:'quantity'});
});
