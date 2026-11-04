import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clientPageRows} from '../panel/client-model.mjs';
test('listado de pedidos limita las filas y mantiene el total y los controles reales',()=>{
 const source=fs.readFileSync(new URL('../panel/app.mjs',import.meta.url),'utf8'),footer=source.split('\n').find(l=>l.startsWith('function orderFooter(')),view=source.split('\n').find(l=>l.startsWith('function orderListView(')),rows=Array.from({length:23},(_,i)=>({id:'p'+i,number:'PED-'+i,name:'Pedido ficticio',clientId:'c'}));
 const render=new Function('clientPageRows','state','esc','salesDateLabel','orderStage','orderStageLabel','orderCondition','orderIsLate','orderIsWaiting','today','downloadIcon','rows',"let orderPage=3,search='',filter='',orderDate='all';"+footer+';'+view+';return orderListView(rows);');
 const html=render(clientPageRows,{records:{c:{name:'Cliente ficticio'}}},String,()=>'',()=> 'pendiente',String,()=> 'en proceso',()=>false,()=>false,()=> '2026-11-04','',rows);assert.equal((html.match(/<tr>/g)||[]).length,4);assert.ok(html.includes('Mostrando 21–23 de 23 pedidos'));assert.ok(html.includes('data-action="order-page"'));assert.ok(html.includes('aria-current="page"'));assert.equal(rows.length,23);
});
