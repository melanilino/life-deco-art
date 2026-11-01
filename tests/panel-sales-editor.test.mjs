import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyCommand,totals} from '../panel/domain.mjs';
import {schemas} from '../panel/schema.mjs';
import {readSalesDraft,createSalesGuard,saveSalesDraft} from '../panel/sales-editor.mjs';
const datasetForm=()=>({dataset:{},controls:[{disabled:false},{disabled:true}],querySelectorAll(){return this.controls;}});
test('fallo al emitir conserva id y reintento no duplica documento ni numeración',async()=>{
 let state=emptyState(),index=0,failIssue=true;state.records.c={id:'c',kind:'clients',name:'Cliente ficticio'};
 const execute=async cmd=>{if(cmd.action==='issue'&&failIssue){failIssue=false;throw Error('Conexión simulada.');}const result=applyCommand(state,cmd,{id:'doc-'+(++index)});state=result.state;return result;};
 const data={name:'Trabajo de prueba',clientId:'c',date:'2026-11-01',due:'2026-11-02',lines:[{description:'Pieza',quantity:1,price:100}],discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,terms:'Condición personalizada de prueba'},form=datasetForm();
 await assert.rejects(saveSalesDraft(form,'invoices',data,'issue',execute),/borrador quedó guardado/);assert.equal(form.dataset.id,'doc-1');assert.equal(state.counters.invoices,1);assert.equal(state.records['doc-1'].status,'borrador');assert.deepEqual(form.controls.map(c=>c.disabled),[false,true]);
 await saveSalesDraft(form,'invoices',data,'issue',execute);assert.equal(Object.keys(state.records).filter(id=>state.records[id].kind==='invoices').length,1);assert.equal(state.counters.invoices,1);assert.equal(state.records['doc-1'].status,'pendiente');assert.equal(totals(state.records['doc-1']).total,12620);assert.equal(state.records['doc-1'].terms,data.terms);assert.equal(await saveSalesDraft(form,'invoices',data,'issue',execute),null);
});
test('fallo al guardar no marca éxito y deja los campos disponibles para reintentar',async()=>{const form=datasetForm();await assert.rejects(saveSalesDraft(form,'quotes',{},'draft',async()=>{throw Error('Fallo simulado');}),/Fallo/);assert.equal(form.dataset.id,undefined);assert.equal(form.dataset.saved,undefined);assert.deepEqual(form.controls.map(c=>c.disabled),[false,true]);});
test('serialización conserva importes y no vacía campos que no aparecen en el formulario',()=>{
 const real=globalThis.FormData;const fd=new real();for(const [key,value]of Object.entries({name:'Prueba',clientId:'c',date:'2026-11-01',discountType:'amount',discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,terms:'Texto personalizado\nCon segunda línea'}))fd.set(key,String(value));
 const elements=[{dataset:{line:'description'},value:'Pieza'},{dataset:{line:'quantity'},type:'number',value:'1'},{dataset:{line:'price'},type:'number',value:'100'},{dataset:{line:'composition'},value:'{"recipe":[{"materialId":"m","quantity":2}]}'}];
 globalThis.FormData=class{constructor(){return fd;}};try{const form={querySelectorAll:()=>[{querySelectorAll:()=>elements}]},data=readSalesDraft(form,schemas.quotes.fields);assert.equal(totals(data).total,12620);assert.equal(totals(data).advance,6310);assert.equal(data.terms,'Texto personalizado\nCon segunda línea');assert.equal('due'in data,false);assert.equal('calculationId'in data,false);assert.deepEqual(data.lines[0].composition.recipe,[{materialId:'m',quantity:2}]);}finally{globalThis.FormData=real;}
});
test('protección detecta artículos, conserva el nodo al guardar Notas y permite cancelar la salida',async()=>{
 const real=globalThis.FormData;globalThis.FormData=class{constructor(form){this.form=form;}entries(){return Object.entries(this.form.fields);}};
 let hash='#quotes/new',answer=false;const guard=createSalesGuard({ask:async()=>answer,getHash:()=>hash,setHash:value=>hash=value});
 try{const form={fields:{name:'Prueba'},lines:[{dataset:{line:'price'},value:'100'}],querySelectorAll(){return this.lines;}};guard.bind(form);assert.equal(guard.dirty,false);form.lines[0].value='200';assert.equal(guard.dirty,true);guard.capture(form);let kept;guard.bind({replaceWith:node=>kept=node});assert.equal(kept,form);assert.equal(guard.dirty,true);hash='#invoices';assert.equal(await guard.guardHash(),false);assert.equal(hash,'#quotes/new');assert.equal(await guard.guardHash(),false);assert.equal(guard.dirty,true);guard.saved();assert.equal(guard.dirty,false);form.lines.push({dataset:{line:'description'},value:'Otra pieza'});assert.equal(guard.dirty,true);answer=true;assert.equal(await guard.canLeave(),true);assert.equal(guard.dirty,false);}finally{globalThis.FormData=real;}
});
import fs from 'node:fs';
import {list,get} from '../panel/domain.mjs';
test('el formulario real representa los importes y condiciones guardados y conserva el cliente archivado',()=>{
 const state=emptyState();state.records.c={id:'c',kind:'clients',name:'Cliente de prueba',archived:true};state.records.i={id:'i',kind:'invoices',status:'borrador',name:'Trabajo',clientId:'c',lines:[],discountType:'percent',discount:10,shipping:20,taxPercent:18,advanceType:'percent',advance:50,terms:'Condición personalizada <prueba>'};
 const source=fs.readFileSync(new URL('../panel/app.mjs',import.meta.url),'utf8'),editor=source.split('\n').find(l=>l.startsWith('function salesEditor('));
 const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const render=new Function('state','get','list','today','esc','head','salesLineRow','icon',editor+';return salesEditor');const html=render(state,get,list,()=> '2026-11-01',esc,()=>{},()=>'',()=> '')('invoices','i');
 const values=Object.fromEntries([...html.matchAll(/type="hidden" name="([^"]+)" value="([^"]*)"/g)].map(m=>[m[1],m[2]]));assert.deepEqual(values,{discountType:'percent',discount:'10',shipping:'20',taxPercent:'18',advanceType:'percent',advance:'50'});assert.ok(html.includes('<option value="Condición personalizada &lt;prueba&gt;" selected>'));assert.ok(html.includes('<option value="c" selected>Cliente de prueba</option>'));
});
