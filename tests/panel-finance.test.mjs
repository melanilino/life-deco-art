import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyCommand} from '../panel/domain.mjs';
import {financeData,financeCsv} from '../panel/finance.mjs';

test('mes, búsqueda y tipo filtran movimientos sin alterar saldos globales ni métricas del mes',()=>{
 let state=emptyState();let id=0;const run=data=>{state=applyCommand(state,{action:'finance-entry',data},{id:`finance-${++id}`}).state;};
 run({name:'Cobro anterior',category:'Prueba',direction:'income',amount:20,date:'2026-08-01',method:'Efectivo'});
 run({name:'Cobro actual',category:'Prueba',direction:'income',amount:40,date:'2026-09-01',method:'Transferencia'});
 run({name:'Pago actual',category:'Prueba',direction:'expense',amount:10,date:'2026-08-01',paymentState:'paid',paymentDate:'2026-09-02',method:'Efectivo'});
 run({name:'Deuda anterior',category:'Prueba',direction:'expense',amount:75,date:'2026-07-01',paymentState:'pending'});
 const all=financeData(state,'2026-09');assert.equal(all.entries.length,2);assert.equal(all.income,4000);assert.equal(all.expense,1000);assert.equal(all.payable,7500);
 const filtered=financeData(state,'2026-09','Transferencia','income');assert.equal(filtered.entries.length,1);assert.equal(filtered.entries[0].concept,'Cobro actual');assert.equal(filtered.expense,1000);assert.equal(filtered.payable,7500);
 const empty=financeData(state,'2026-10','sin coincidencia','expense');assert.equal(empty.entries.length,0);assert.equal(empty.income,0);assert.equal(empty.payable,7500);
});


test('CSV contiene columnas legibles, importes numéricos y encabezados aun vacío',async()=>{
 const text=await financeCsv([{date:'2026-09-26',concept:'=formula, "prueba"',origin:'expenses',direction:'expense',method:'Efectivo',signed:-4000}]).text();
 assert.match(text,/Fecha,Concepto,Origen,Método,Importe/);assert.match(text,/-40.00$/);assert.ok(text.includes(`"'=formula, ""prueba"""`));assert.match(text,/Gasto independiente/);
 assert.equal(await financeCsv([]).text(),'Fecha,Concepto,Origen,Método,Importe\r\n');
});
