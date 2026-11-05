import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinanceGuard,saveFinanceForm} from '../panel/finance-editor.mjs';

const form=()=>({dataset:{direction:'income'},fields:[{name:'name',type:'text',value:'',disabled:false},{name:'receipt',type:'file',files:[],disabled:false}],get elements(){return {receipt:this.fields[1]};},querySelectorAll(){return this.fields;}});
test('movimiento conserva campos, tipo y archivo al redibujar y permite cancelar la salida',async()=>{
 let hash='#finance/registrar',answer=false,prompts=0;const guard=createFinanceGuard({getHash:()=>hash,setHash:v=>hash=v,ask:async()=>{prompts++;return answer;}}),original=form();
 guard.bind(original);assert.equal(guard.dirty,false);original.dataset.direction='expense';assert.equal(guard.dirty,true);
 original.fields[0].value='Prueba';original.fields[1].files=[{name:'prueba.pdf',size:20,lastModified:1}];let restored;
 guard.bind({...form(),replaceWith:n=>restored=n});assert.equal(restored,original);assert.equal(restored.elements.receipt.files.length,1);
 hash='#finance';assert.equal(await guard.guardHash(),false);assert.equal(hash,'#finance/registrar');assert.equal(await guard.guardHash(),false);assert.equal(prompts,1);
 answer=true;hash='#finance';assert.equal(await guard.guardHash(),true);assert.equal(guard.dirty,false);
});
test('no se sale mientras guarda; al terminar no pide descartar el movimiento guardado',async()=>{
 let hash='#finance/registrar';const guard=createFinanceGuard({getHash:()=>hash,setHash:v=>hash=v,ask:async()=>{throw Error('No debe preguntar');}}),f=form();guard.bind(f);f.fields[0].value='Prueba';f.dataset.saving='true';assert.equal(await guard.canLeave(),false);delete f.dataset.saving;guard.saved();hash='#finance';assert.equal(await guard.guardHash(),true);
});
test('fallo conserva formulario y comprobante para reintentar, éxito bloquea duplicados',async()=>{
 const f=form(),file={name:'prueba.pdf',size:10,type:'application/pdf'};f.elements.receipt.files=[file];f.fields[0].disabled=true;
 let uploads=0,attempts=0;const options={read:()=>({name:'Prueba',receipt:file}),upload:async()=>{uploads++;return {path:'synthetic/path'};},execute:async cmd=>{assert.equal(f.dataset.saving,'true');assert.equal(f.fields[1].disabled,true);assert.equal(cmd.data.receipt.path,'synthetic/path');if(++attempts===1)throw Error('Fallo ficticio');return {result:'saved'};}};
 await assert.rejects(saveFinanceForm(f,options));assert.equal(f.dataset.saved,undefined);assert.equal(f.dataset.saving,undefined);assert.equal(f.fields[0].disabled,true);assert.equal(f.fields[1].disabled,false);
 await saveFinanceForm(f,options);assert.equal(uploads,1);assert.equal(attempts,2);assert.equal(await saveFinanceForm(f,options),null);
});
test('envíos simultáneos y comprobantes inválidos no crean registros adicionales',async()=>{
 const f=form();let release,calls=0;const pending=new Promise(resolve=>release=resolve),options={read:()=>({name:'Prueba'}),execute:async()=>{calls++;await pending;return {result:'saved'};}};
 const first=saveFinanceForm(f,options);assert.equal(await saveFinanceForm(f,options),null);release();await first;assert.equal(calls,1);
 const invalid=form();invalid.elements.receipt.files=[{size:11*1024*1024,type:'application/pdf'}];await assert.rejects(saveFinanceForm(invalid,options),/hasta 10 MB/);assert.equal(calls,1);
});
