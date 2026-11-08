import test from 'node:test';import assert from 'node:assert/strict';import {emptyState,applyCommand,cashflow,list} from '../panel/domain.mjs';import {subscriptionMetrics,subscription,subscriptionCsv} from '../panel/admin-model.mjs';import {planRecovery} from '../panel/recovery.mjs';
function setup(){let state=emptyState(),i=0;return {get s(){return state},run(cmd){const r=applyCommand(state,cmd,{id:'record-'+(++i),at:'2026-10-24T12:'+String(i).padStart(2,'0')+':00Z'});state=r.state;return r.result;}};}
const sub=(extra={})=>({action:'admin-subscription',data:{name:'Prueba',usage:'Prueba local',plan:'Plan inicial',cost:'1200',currency:'DOP',frequency:'anual',renewal:'2026-10-28',status:'activo',...extra}});
test('suscripciones anuales se mensualizan; monedas separadas y renovación no es pago',()=>{const x=setup();x.run(sub());x.run(sub({cost:10,currency:'USD',frequency:'mensual'}));const m=subscriptionMetrics(x.s,'2026-10-24');assert.equal(m.monthly.DOP,100);assert.equal(m.monthly.USD,10);assert.equal(m.upcoming.DOP,1200);assert.equal(m.active,2);assert.equal(cashflow(x.s).expense,0);});
test('moneda o importe desconocidos no se mezclan y se conserva historial de planes',()=>{const x=setup(),id=x.run(sub());const edit=sub({cost:'2400',plan:'Nuevo plan'});edit.id=id;x.run(edit);assert.equal(x.s.records[id].planHistory.length,2);assert.equal(x.s.records[id].planHistory[0].cost,1200);x.run({...edit});assert.equal(x.s.records[id].planHistory.length,2);assert.throws(()=>x.run(sub({currency:'OTRA'})));x.run(sub({cost:'',frequency:'otro'}));assert.equal(subscriptionMetrics(x.s,'2026-10-24').unknown,1);});
test('cobro crea un gasto y pago atómicos; no admite el mismo período dos veces',()=>{const x=setup(),id=x.run(sub({frequency:'mensual',cost:100}));const cmd={action:'admin-charge',id,data:{mode:'new',period:'2026-10-28',date:'2026-10-28',amount:100,method:'Tarjeta'}};x.run(cmd);assert.equal(list(x.s,'expenses').length,1);assert.equal(list(x.s,'payments').length,1);assert.equal(cashflow(x.s).expense,10000);assert.equal(x.s.records[id].renewal,'2026-11-28');assert.throws(()=>x.run(cmd),/ya tiene un cobro/);});
test('divisa requiere conversión explícita identificada antes de entrar a Finanzas',()=>{const x=setup(),id=x.run(sub({cost:10,currency:'USD',frequency:'mensual'})),data={mode:'new',period:'2026-10-28',date:'2026-10-28',amount:10,method:'Tarjeta'};assert.throws(()=>x.run({action:'admin-charge',id,data}));assert.equal(list(x.s,'expenses').length,0);x.run({action:'admin-charge',id,data:{...data,rate:60,rateDate:'2026-10-28'}});assert.equal(cashflow(x.s).expense,60000);assert.equal(x.s.records[id].charges[0].currency,'USD');});
test('vincular gasto ya pagado conserva un único movimiento',()=>{const x=setup(),id=x.run(sub({cost:100,frequency:'mensual'})),expense=x.run({action:'finance-entry',data:{name:'Cobro de prueba',category:'Prueba',amount:100,direction:'expense',date:'2026-10-28',paymentState:'paid',paymentDate:'2026-10-28',method:'Tarjeta'}});x.run({action:'admin-charge',id,data:{mode:'existing',expenseId:expense,period:'2026-10-28',date:'2026-10-28',amount:100}});assert.equal(list(x.s,'payments').length,1);assert.equal(list(x.s,'expenses').length,1);assert.equal(x.s.records[expense].subscriptionId,id);});
test('costo sin configurar y cero explícito; bloques guardan solo sus claves',()=>{const x=setup();x.run({action:'admin-settings',group:'costs',data:{hourly:''}});assert.equal(x.s.settings.hourlyConfigured,false);x.run({action:'admin-settings',group:'costs',data:{hourly:0,name:'No cambiar'}});assert.equal(x.s.settings.hourlyConfigured,true);assert.equal(x.s.settings.hourly,0);assert.equal(x.s.settings.name,'Life Deco Art');});
test('configuración no altera documentos emitidos y se conserva el método/datos de pago',()=>{const x=setup(),client=x.run({action:'save',kind:'clients',data:{name:'Cliente prueba'}}),doc=x.run({action:'save',kind:'quotes',data:{name:'Prueba',clientId:client,lines:[{description:'Prueba',quantity:1,price:100}]}});x.run({action:'issue',id:doc});const snapshot=JSON.stringify(x.s.records[doc]);x.run({action:'admin-settings',group:'payments',data:{paymentMethods:'Transferencia',paymentDetails:'Datos de prueba',paymentInstructions:'Instrucción de prueba'}});x.run({action:'admin-settings',group:'business',data:{name:'Negocio de prueba'}});assert.equal(JSON.stringify(x.s.records[doc]),snapshot);assert.equal(x.s.settings.paymentDetails,'Datos de prueba');});
test('revisión de recuperación solo planifica faltantes y no muta ni sobrescribe',()=>{const x=setup(),id=x.run(sub()),backup={format:'life-deco-art-panel',schema:1,owner:'owner',state:structuredClone(x.s),files:[]};const state=emptyState();const plan=planRecovery(state,backup,'owner');assert.equal(plan.records.length,1);assert.equal(Object.keys(state.records).length,0);assert.equal(planRecovery(x.s,backup,'owner').records.length,0);assert.throws(()=>planRecovery(state,backup,'otro'));});

test('un cobro histórico conserva la renovación vigente',()=>{
 const x=setup(),id=x.run(sub({frequency:'mensual'}));
 const data={mode:'new',period:'2026-08-28',date:'2026-09-01',amount:1200,method:'Tarjeta'};
 assert.throws(()=>x.run({action:'admin-charge',id,data:{...data,nextRenewal:'2026-09-28'}}),/no puede retroceder/);
 assert.equal(list(x.s,'expenses').length,0);
 x.run({action:'admin-charge',id,data});
 assert.equal(x.s.records[id].renewal,'2026-10-28');
 assert.equal(x.s.records[id].charges.length,1);
});

test('vincular usa la fecha del pago en Finanzas y permite reintentar sin duplicados',()=>{
 const x=setup(),id=x.run(sub());
 const expenseId=x.run({action:'finance-entry',data:{name:'Gasto ficticio',category:'Prueba',amount:1200,direction:'expense',date:'2026-10-10',paymentState:'paid',paymentDate:'2026-10-28',method:'Tarjeta'}});
 const data={mode:'existing',expenseId,period:'2026-10-28',date:'2026-10-10',amount:1200};
 assert.throws(()=>x.run({action:'admin-charge',id,data}),/último pago.*2026-10-28/);
 assert.equal(x.s.records[expenseId].subscriptionId,undefined);
 x.run({action:'admin-charge',id,data:{...data,date:'2026-10-28'}});
 assert.equal(x.s.records[id].charges[0].date,'2026-10-28');
 assert.equal(list(x.s,'expenses').length,1);
 assert.equal(list(x.s,'payments').length,1);
});


test('categorías conservan uso legado y edición no altera historial de precios',async()=>{
 const x=setup(),id=x.run(sub({subscriptionCategory:'Diseño y contenido'}));
 assert.equal(x.s.records[id].subscriptionCategory,'Diseño y contenido');
 const count=x.s.records[id].planHistory.length;
 x.run({...sub({subscriptionCategory:'Web y tecnología'}),id});
 assert.equal(x.s.records[id].usage,'Prueba local');assert.equal(x.s.records[id].planHistory.length,count);
 x.run({...sub(),id});assert.equal(x.s.records[id].subscriptionCategory,'Web y tecnología');
 assert.equal(subscription({category:'Uso antiguo'}).usage,'Uso antiguo');assert.equal(subscription({category:'Uso antiguo'}).subscriptionCategory,'');
 assert.throws(()=>x.run(sub({subscriptionCategory:'Inventada'})),/categoría/);
 const csv=await subscriptionCsv([subscription(x.s.records[id])]).text();assert.match(csv,/Categoría/);assert.match(csv,/Web y tecnología/);
});
test('mayor gasto suma equivalentes por categoría y moneda, identifica empates y omisiones',()=>{
 const x=setup();x.run(sub({subscriptionCategory:'Diseño y contenido'}));
 x.run(sub({subscriptionCategory:'Diseño y contenido',cost:50,frequency:'mensual'}));
 x.run(sub({subscriptionCategory:'Web y tecnología',cost:150,frequency:'mensual'}));
 x.run(sub({subscriptionCategory:'Web y tecnología',cost:5,currency:'USD',frequency:'mensual'}));
 x.run(sub({cost:'',frequency:'otro'}));x.run(sub({cost:9000,status:'pausado'}));
 const m=subscriptionMetrics(x.s,'2026-10-24');assert.equal(m.monthly.DOP,300);assert.equal(m.monthly.USD,5);
 assert.deepEqual(m.topCategories.DOP,{categories:['Diseño y contenido','Web y tecnología'],amount:150});
 assert.deepEqual(m.topCategories.USD,{categories:['Web y tecnología'],amount:5});assert.equal(m.unknown,1);
 const y=setup();y.run(sub());assert.deepEqual(subscriptionMetrics(y.s,'2026-10-24').topCategories.DOP.categories,['Sin categorizar']);
 const z=setup();z.run(sub({frequency:'gratis',cost:''}));assert.equal(subscriptionMetrics(z.s,'2026-10-24').monthly.DOP,0);assert.deepEqual(subscriptionMetrics(z.s,'2026-10-24').topCategories,{});
});
test('renovaciones del mes cuenta solo pendientes desde hoy, incluso sin importe',()=>{
 const x=setup();for(const renewal of ['2026-10-23','2026-10-24','2026-10-31','2026-11-01'])x.run(sub({renewal,cost:''}));
 const id=x.run(sub({renewal:'2026-10-28',frequency:'gratis'}));
 x.s.records[id].charges=[{period:'2026-10-28'}];
 assert.equal(subscriptionMetrics(x.s,'2026-10-24').renewalsThisMonth,2);
 assert.equal(subscriptionMetrics(emptyState(),'2026-10-24').renewalsThisMonth,0);
});
