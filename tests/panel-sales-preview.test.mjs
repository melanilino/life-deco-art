import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyState,totals,list} from '../panel/domain.mjs';
import {salesPreviewRecord,salesPreviewHtml} from '../panel/sales-preview.mjs';
import {clientPageRows} from '../panel/client-model.mjs';
test('vista previa usa datos sin guardar y no asigna número ni modifica el estado',()=>{
 const state=emptyState();state.records.c={name:'Cliente <ficticio>',phone:'8090000000'};state.settings.name='Negocio ficticio';const before=JSON.stringify(state),data={clientId:'c',name:'Proyecto sin guardar',date:'2026-11-02',lines:[{description:'Pieza <especial>',quantity:1,price:100,composition:{cost:99999}}],discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,terms:'Primera línea\nSegunda línea',notes:'Nota & detalle'};
 const record=salesPreviewRecord(state,'quotes',data),html=salesPreviewHtml(record);assert.equal(totals(record).total,12620);assert.equal(totals(record).advance,6310);assert.equal(record.number,'Sin número asignado');assert.ok(html.includes('RD$126.20'));assert.ok(html.includes('RD$63.10'));assert.ok(html.includes('Pieza &lt;especial&gt;'));assert.ok(html.includes('Primera línea\nSegunda línea'));assert.ok(!html.includes('99999'));assert.equal(JSON.stringify(state),before);record.client.name='Cambio';assert.equal(state.records.c.name,'Cliente <ficticio>');
});
test('vista previa conserva número y versión del borrador, usando condiciones actuales del editor',()=>{
 const state=emptyState(),record=salesPreviewRecord(state,'invoices',{name:'Trabajo revisado',clientId:'c',terms:'Condiciones nuevas',lines:[]},{number:'FAC-010',revision:2,name:'Anterior',terms:'Anteriores'}),html=salesPreviewHtml(record);assert.ok(html.includes('FAC-010 · Versión 2'));assert.ok(html.includes('Condiciones nuevas'));assert.ok(html.includes('Factura sin comprobante fiscal'));assert.ok(!html.includes('Anteriores'));
});
test('paginación real de ventas conserva todos los resultados para CSV y limita cada página',()=>{
 const source=fs.readFileSync(new URL('../panel/app.mjs',import.meta.url),'utf8'),line=source.split('\n').find(l=>l.startsWith('function salesTable(')),footer=source.split('\n').find(l=>l.startsWith('function salesFooter('));let pageNumber=3;const rows=Array.from({length:23},(_,i)=>({id:'q'+i,number:'COT-'+i,kind:'quotes',name:'Trabajo '+i,clientId:'c',lines:[]}));
 const render=new Function('clientPageRows','salesRows','state','esc','money','totals','salesDateLabel','salesStatus','salesStatusLabel','paid','balance','downloadIcon',`let route='quotes',salesPageNumber=${pageNumber},search='',filter='',salesDate='all';${footer}\n${line};return salesTable();`);const html=render(clientPageRows,()=>rows,{records:{c:{name:'Cliente'}}},String,String,()=>({total:0}),()=>'',()=>'',String,()=>0,()=>0,'');assert.equal((html.match(/<tr>/g)||[]).length,4);assert.ok(html.includes('Mostrando 21–23 de 23 cotizaciones'));assert.ok(html.includes('data-action="sales-page"'));assert.ok(html.includes('aria-current="page"'));assert.ok(html.includes('data-action="sales-csv"'));assert.equal(rows.length,23);assert.equal(clientPageRows([],9).page,1);
});
