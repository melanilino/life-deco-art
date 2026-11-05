import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyCommand,cashflow,balance,get,list} from '../panel/domain.mjs';
import {financeData,financeCsv} from '../panel/finance.mjs';

function setup(){let state=emptyState(),sequence=0;return {get state(){return state;},run(cmd){const result=applyCommand(state,cmd,{id:`financial-test-${++sequence}`});state=result.state;return result.result;}};}
const expense=(extra={})=>({action:'finance-entry',data:{name:'Gasto ficticio',category:'Prueba',amount:100,direction:'expense',date:'2026-10-01',paymentState:'pending',...extra}});
const payment=(target,amount,date,extra={})=>({action:'payment',target,amount,date,method:'Efectivo',...extra});

test('rechaza fechas imposibles en ingresos, gastos, pagos y previsiones sin mutar el estado',()=>{
 const x=setup(),pending=x.run(expense());
 for(const date of ['fecha-invalida','2026-02-30','2026-04-31','2026-13-01','0000-01-01','2026-2-01','']){
  for(const cmd of [expense({date}),expense({paymentState:'paid',paymentDate:date,method:'Efectivo'}),expense({expectedDate:date||'2026-02-30'}),{...expense(),data:{...expense().data,direction:'income',method:'Efectivo',date}},payment(pending,10,date)]){
   const before=JSON.stringify(x.state);assert.throws(()=>x.run(cmd),/Fecha|fecha/);assert.equal(JSON.stringify(x.state),before);
  }
 }
 x.run(expense({date:'2024-02-29'}));assert.throws(()=>x.run(expense({date:'2025-02-29'})),/fecha válida/);
});

test('reembolso exige pago original, fecha coherente y límite acumulado; afecta su mes efectivo',()=>{
 const x=setup(),id=x.run(expense()),original=x.run(payment(id,60,'2026-10-10'));
 const before=JSON.stringify(x.state);assert.throws(()=>x.run(payment(id,10,'2026-10-09',{type:'refund',originalId:original,reason:'Prueba'})),/anterior/);assert.equal(JSON.stringify(x.state),before);
 const first=x.run(payment(id,20,'2026-11-01',{type:'refund',originalId:original,reason:'Prueba'}));
 x.run(payment(id,40,'2026-11-02',{type:'refund',originalId:original,reason:'Prueba'}));
 assert.equal(balance(x.state,get(x.state,id)),10000);assert.equal(cashflow(x.state,'2026-10-01','2026-10-31').expense,6000);assert.equal(cashflow(x.state,'2026-11-01','2026-11-30').expense,-6000);
 assert.throws(()=>x.run(payment(id,1,'2026-11-03',{type:'refund',originalId:original,reason:'Prueba'})),/supera/);
 assert.throws(()=>x.run(payment(id,1,'2026-11-03',{type:'refund',originalId:first,reason:'Prueba'})),/original/);
});

test('factura aplica anticipo una vez, pago parcial y devolución mantienen el saldo y el efectivo separados',()=>{
 const x=setup(),clientId=x.run({action:'save',kind:'clients',data:{name:'Cliente ficticio'}}),data={name:'Encargo ficticio',clientId,date:'2026-10-01',lines:[{description:'Concepto ficticio',quantity:1,price:200}]};
 const quote=x.run({action:'save',kind:'quotes',data});x.run({action:'issue',id:quote});x.run({action:'approve',id:quote});assert.equal(cashflow(x.state).income,0);
 const order=x.run({action:'convert',id:quote,kind:'orders'}),advance=x.run(payment(order,50,'2026-10-15')),invoice=x.run({action:'convert',id:quote,kind:'invoices'});
 assert.equal(cashflow(x.state).receivable,0);x.run({action:'issue',id:invoice});assert.equal(cashflow(x.state).receivable,15000);
 x.run(payment(invoice,150,'2026-11-01'));x.run(payment(order,20,'2026-11-02',{type:'refund',originalId:advance,reason:'Prueba'}));
 const flow=financeData(x.state,'2026-11');assert.equal(flow.income,13000);assert.equal(flow.receivable,2000);assert.equal(balance(x.state,get(x.state,invoice)),2000);assert.equal(flow.entries.length,2);assert.equal(cashflow(x.state).income,18000);
 assert.equal(list(x.state,'payments',true).length,3);assert.throws(()=>x.run(payment(order,1,'2026-11-03')),/Ventas/);assert.throws(()=>x.run({action:'convert',id:quote,kind:'invoices'}),/Ya existe/);
});

test('compras y gastos pendientes suman deudas globales y sus pagos se cuentan una vez por mes',async()=>{
 const x=setup(),debt=x.run(expense()),materialId=x.run({action:'save',kind:'materials',data:{name:'Material ficticio',packageUnits:1}}),purchase=x.run({action:'save',kind:'purchases',data:{name:'Compra ficticia',date:'2026-10-01',total:200,materialId,quantity:1}});
 assert.equal(financeData(x.state,'2026-11').payable,30000);assert.equal(cashflow(x.state).entries.length,0);
 const p1=x.run(payment(debt,40,'2026-11-10')),p2=x.run(payment(purchase,50,'2026-11-11'));
 assert.equal(financeData(x.state,'2026-11').expense,9000);assert.equal(financeData(x.state,'2026-10').expense,0);
 x.run(payment(debt,10,'2026-12-01',{type:'refund',originalId:p1,reason:'Prueba'}));x.run(payment(purchase,20,'2026-12-02',{type:'refund',originalId:p2,reason:'Prueba'}));
 for(const month of ['2026-10','2026-11','2026-12'])assert.equal(financeData(x.state,month).payable,24000);
 const filtered=financeData(x.state,'2026-11','Compra ficticia','expense');assert.equal(filtered.entries.length,1);assert.equal(filtered.expense,9000);assert.equal(filtered.payable,24000);
 const csv=await financeCsv(filtered.entries).text();assert.match(csv,/Compra ficticia/);assert.doesNotMatch(csv,/Gasto ficticio/);assert.equal(financeData(x.state,'2026-12').expense,-3000);
});

test('pago final cierra saldo y rechaza exceso; anular factura conserva cobros efectivos',()=>{
 const x=setup(),id=x.run(expense());x.run(payment(id,25,'2026-10-01'));x.run(payment(id,75,'2026-11-01'));assert.equal(cashflow(x.state).payable,0);assert.throws(()=>x.run(payment(id,0.01,'2026-11-02')),/supera/);
 const clientId=x.run({action:'save',kind:'clients',data:{name:'Cliente ficticio'}}),invoice=x.run({action:'save',kind:'invoices',data:{name:'Factura ficticia',clientId,lines:[{description:'Concepto ficticio',quantity:1,price:100}]}});x.run({action:'issue',id:invoice});x.run(payment(invoice,40,'2026-11-01'));x.run({action:'status',id:invoice,status:'anulada',reason:'Prueba'});
 assert.equal(cashflow(x.state).receivable,0);assert.equal(financeData(x.state,'2026-11').income,4000);assert.throws(()=>x.run(payment(invoice,1,'2026-11-02')),/anulada/);
});
