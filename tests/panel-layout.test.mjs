import test from 'node:test';
import assert from 'node:assert/strict';
import {syncPanelLayout} from '../panel/panel-layout.mjs';

test('Paneles conservan la altura de Inicio al redimensionar y reemplazar encabezados',()=>{
 const original=globalThis.ResizeObserver,observers=[],values=[];
 globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(header){this.header=header;}disconnect(){this.disconnected=true;}};
 let height=100;
 const header={getBoundingClientRect:()=>({height,bottom:-300})},root={querySelector:()=>header,documentElement:{style:{setProperty:(name,value)=>values.push([name,value])}}};
 try{
  syncPanelLayout(root);assert.deepEqual(values.at(-1),['--hub-current-header-height','100px']);
  height=153.6;observers[0].callback();assert.equal(values.at(-1)[1],'153.6px');
  syncPanelLayout(root);assert.equal(observers[0].disconnected,true);assert.equal(observers[1].header,header);
  height=0;observers[1].callback();assert.equal(values.at(-1)[1],'153.6px');
 }finally{globalThis.ResizeObserver=original;}
});
