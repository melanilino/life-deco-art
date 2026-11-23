import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as flush } from 'node:timers/promises';
import { bindAutomations } from '../panel/automation-editor.mjs';
import { starter } from '../panel/automation-model.mjs';

async function navigationFixture(run, { fail = false, gate = false } = {}) {
  const original = new Map();
  const install = (key,value) => { original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}); };
  const listeners = {}, storage = new Map(), requests = [], errors = [];
  let release;
  const delay = gate ? new Promise(resolve=>{release=resolve;}) : null;
  const flow = starter('welcome','paused-flow','mail-one');flow.stage=0;
  let row = { id:flow.id,draft:flow,status:'paused',version:1,savedAt:'2026-11-23T12:00:00Z' };
  const result = { innerHTML:'',querySelector:()=>null,addEventListener:(type,fn)=>{listeners[type]=fn;} };
  const workspace = { querySelector:()=>null,addEventListener:(type,fn)=>{listeners['workspace-'+type]=fn;},removeEventListener(){},scrollIntoView(){} };
  const root = { isConnected:true,parentNode:{},querySelector:()=>result,closest:()=>workspace };
  install('location',{hash:'#marketing-automation/paused-flow'});
  install('window',{addEventListener(){},removeEventListener(){}});
  install('localStorage',{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)});
  install('MutationObserver',class{observe(){}disconnect(){}});
  install('setTimeout',()=>1);
  install('clearTimeout',()=>{});
  try {
    bindAutomations(root,async(action,body)=>{
      if(action==='automations')return {rows:[structuredClone(row)],mailReady:true};
      assert.equal(action,'flow-save','salir del editor solo puede guardar el borrador');
      requests.push(structuredClone(body));
      if(delay && requests.length===1)await delay;
      if(fail)throw Error('No se pudo guardar.');
      row={...row,draft:structuredClone(body.flow),version:row.version+1};
      return {row:structuredClone(row)};
    },(message,isError)=>{if(isError)errors.push(message);},()=>{}, {user:{uid:'owner'},icon:()=>'',getState:()=>({}),blockLabels:{text:'Texto'}});
    await flush();
    const edit = name => listeners.input({target:{dataset:{flow:'name'},value:name,hasAttribute:()=>false,matches:selector=>selector==='[data-flow],[data-mail],[data-block-field],[data-wait-duration]'}});
    let prevented=false;
    const back = () => listeners.click({target:{closest:selector=>selector==='a[href="#marketing-automation"]'?{}:null},preventDefault:()=>{prevented=true;}});
    const headerBack = () => listeners['workspace-click']({target:{closest:selector=>selector==='.section-action-header a[href="#marketing-automation"]'?{}:null},preventDefault:()=>{prevented=true;}});
    await run({edit,back,headerBack,requests,errors,release,row:()=>row,prevented:()=>prevented});
  } finally {
    for(const [key,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
}

test('volver a la lista guarda la edición inmediata y conserva la pausa', async()=>{
  await navigationFixture(async f=>{
    f.edit('Cambio inmediato');
    await f.back();
    assert.equal(f.prevented(),true);
    assert.equal(f.requests.length,1);
    assert.equal(f.row().draft.name,'Cambio inmediato');
    assert.equal(f.row().status,'paused');
    assert.equal(location.hash,'#marketing-automation');
  });
});

test('el retorno bajo el título guarda antes de salir y conserva la pausa',async()=>{
  await navigationFixture(async f=>{
    f.edit('Edición desde el encabezado');
    await f.headerBack();
    assert.equal(f.prevented(),true);
    assert.equal(f.row().draft.name,'Edición desde el encabezado');
    assert.equal(f.row().status,'paused');
    assert.equal(location.hash,'#marketing-automation');
  });
});

test('el retorno del encabezado permanece en el editor si no puede guardar',async()=>{
  await navigationFixture(async f=>{
    f.edit('Cambio pendiente del encabezado');
    await f.headerBack();
    assert.equal(location.hash,'#marketing-automation/paused-flow');
    assert.ok(f.errors.includes('No se pudo guardar.'));
  },{fail:true});
});

test('un fallo de guardado conserva el editor y la copia local al volver',async()=>{
  await navigationFixture(async f=>{
    f.edit('Borrador pendiente');
    await f.back();
    assert.equal(location.hash,'#marketing-automation/paused-flow');
    assert.equal(JSON.parse(localStorage.getItem('lda-automation-draft:owner')).flow.name,'Borrador pendiente');
    assert.equal(f.row().status,'paused');
    assert.ok(f.errors.includes('No se pudo guardar.'));
  },{fail:true});
});

test('volver espera también los cambios escritos durante el guardado',async()=>{
  await navigationFixture(async f=>{
    f.edit('Primera edición');
    const leaving=f.back();
    await flush();
    assert.equal(location.hash,'#marketing-automation/paused-flow');
    f.edit('Última edición');
    f.release();
    await leaving;
    assert.equal(f.requests.length,2);
    assert.equal(f.row().draft.name,'Última edición');
    assert.equal(f.row().status,'paused');
    assert.equal(location.hash,'#marketing-automation');
  },{gate:true});
});
