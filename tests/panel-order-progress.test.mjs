import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyCommand,totals,paid,balance,cashflow,events} from '../panel/domain.mjs';
import {orderStageOf,orderConditionOf,orderIsWaiting,orderIsLate,orderOverview} from '../panel/order-state.mjs';
function setup(){let state=emptyState(),n=0;const x={get state(){return state;},run(cmd,at='2026-11-03T14:00:00Z'){const r=applyCommand(state,cmd,{id:'p'+(++n),at});state=r.state;return r;}};x.client=x.run({action:'save',kind:'clients',data:{name:'Cliente ficticio'}}).result;return x;}
const data=clientId=>({name:'Pedido ficticio',clientId,due:'2026-11-04',lines:[{description:'Pieza ficticia',quantity:2,price:100.25}]});
test('etapa y espera se guardan juntas; entregado elimina espera y conserva la fecha real',()=>{
 const x=setup(),id=x.run({action:'save',kind:'orders',data:data(x.client)}).result;
 const change=x.run({action:'order-progress',id,stage:'aprobación',waiting:true});assert.deepEqual(change.changed,[id]);assert.equal(change.state.records[id].stage,'aprobación');assert.equal(orderIsWaiting(change.state.records[id]),true);
 x.run({action:'order-progress',id,stage:'entregado',waiting:true});assert.equal(x.state.records[id].condition,'');assert.equal(orderConditionOf(x.state.records[id],'2026-11-10'),'entregado');assert.equal(events(x.state).length,0);const delivered=x.state.records[id].deliveredAt;x.run({action:'order-progress',id,stage:'entregado',waiting:false},'2026-11-05T14:00:00Z');assert.equal(x.state.records[id].deliveredAt,delivered);
 assert.throws(()=>x.run({action:'order-progress',id,stage:'diseño',waiting:false}),/reapertura/);x.run({action:'order-progress',id,stage:'diseño',waiting:false,reopen:true});assert.equal(x.state.records[id].deliveredAt,null);assert.equal(events(x.state).length,1);
});
test('cancelado bloquea reactivación por avance, estado y edición, conservando razón y anticipos',()=>{
 const x=setup(),id=x.run({action:'save',kind:'orders',data:data(x.client)}).result,payment=x.run({action:'payment',target:id,amount:50,date:'2026-11-03',method:'Efectivo'}).result;
 x.run({action:'order-progress',id,stage:'producción',waiting:true});assert.throws(()=>x.run({action:'order-progress',id,stage:'cancelado'}),/Motivo/);x.run({action:'status',id,status:'cancelado',reason:'Cancelación ficticia'});const before=JSON.stringify(x.state);
 for(const cmd of [{action:'order-progress',id,stage:'pendiente'},{action:'status',id,status:'pendiente'},{action:'save',kind:'orders',id,data:{status:'pendiente',stage:'pendiente'}},{action:'save',kind:'orders',id,data:{stage:'producción'}}])assert.throws(()=>x.run(cmd),/cancelado/);
 assert.equal(JSON.stringify(x.state),before);assert.equal(x.state.records[id].reason,'Cancelación ficticia');assert.equal(x.state.records[id].condition,'');assert.equal(cashflow(x.state).income,5000);assert.throws(()=>x.run({action:'payment',target:id,amount:5}),/válido/);
 x.run({action:'payment',target:id,type:'refund',originalId:payment,amount:20,reason:'Devolución ficticia',date:'2026-11-03'});assert.equal(paid(x.state,id),3000);assert.equal(cashflow(x.state).income,3000);assert.equal(x.state.records[id].status,'cancelado');
});
test('esperando cliente y atraso coinciden en indicadores y filtros, excluyendo terminales y archivo',()=>{
 const records=[{status:'producción',stage:'producción',condition:'esperando cliente',due:'2026-11-02'},{status:'esperando aprobación',due:'2026-11-04'},{status:'listo',due:'2026-11-05'},{status:'cancelado',stage:'diseño',condition:'esperando cliente',due:'2026-11-01'},{status:'entregado',condition:'esperando cliente',due:'2026-11-01'},{status:'borrador',stage:'pendiente',due:'2026-11-01'},{status:'producción',archived:true,due:'2026-11-01'}];
 assert.equal(orderIsWaiting(records[0]),true);assert.equal(orderIsLate(records[0],'2026-11-03'),true);assert.equal(orderConditionOf(records[0],'2026-11-03'),'esperando cliente');assert.equal(orderStageOf(records[1]),'aprobación');assert.equal(orderStageOf(records[3]),'cancelado');assert.equal(orderConditionOf(records[4],'2026-11-03'),'entregado');assert.equal(orderConditionOf(records[2],'2026-11-03'),'listo');assert.deepEqual(orderOverview(records,'2026-11-03'),{active:3,upcoming:2,approval:2,late:1});
});
test('pedido independiente: importes, anticipo y cobros de factura afectan Finanzas una sola vez',()=>{
 const x=setup(),id=x.run({action:'save',kind:'orders',data:{...data(x.client),discount:10,shipping:20,taxPercent:18}}).result;assert.equal(totals(x.state.records[id]).total,24479);
 x.run({action:'payment',target:id,amount:50.25,date:'2026-10-31',method:'Efectivo'});assert.equal(cashflow(x.state).receivable,0);assert.equal(cashflow(x.state).income,5025);
 const invoice=x.run({action:'save',kind:'invoices',data:{...data(x.client),orderId:id,discount:10,shipping:20,taxPercent:18,date:'2026-11-03'}}).result;x.run({action:'issue',id:invoice});assert.equal(paid(x.state,invoice),5025);assert.equal(balance(x.state,x.state.records[invoice]),19454);assert.equal(cashflow(x.state).entries.length,1);
 assert.throws(()=>x.run({action:'payment',target:id,amount:10}),/Ventas/);assert.throws(()=>x.run({action:'save',kind:'orders',id,data:{lines:[{description:'Pieza',quantity:1,price:300}]}}),/facturado/);
 x.run({action:'payment',target:invoice,amount:94.54,date:'2026-11-03',method:'Transferencia'});assert.equal(cashflow(x.state,'2026-11-01','2026-11-30').income,9454);assert.equal(cashflow(x.state).receivable,10000);x.run({action:'payment',target:invoice,amount:100,date:'2026-11-04',method:'Transferencia'});assert.equal(cashflow(x.state).receivable,0);assert.equal(paid(x.state,invoice),24479);assert.equal(cashflow(x.state).entries.length,3);
});
