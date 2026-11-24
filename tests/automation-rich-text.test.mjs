import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../marketing/core.cjs';
import { starter, normalizeFlow } from '../panel/automation-model.mjs';

test('el formato se conserva entre borrador, normalización y correo personalizado',()=>{
  const flow=starter('welcome','rich-flow','rich-mail');
  const block=flow.steps[0].template.blocks[0];
  block.text='Hola {{nombre}}, visita la tienda';
  block.runs=[{text:'Hola {{nombre}}',bold:true},{text:', ',italic:true},{text:'visita la tienda',url:'https://lifedecoart.com'}];
  const normalized=normalizeFlow(flow),template=core.templateOf(normalized.steps[0].template);
  assert.deepEqual(template.blocks[0].runs,normalized.steps[0].template.blocks[0].runs);
  const mail=core.renderEmail(template,{name:'Ana <script>'},'https://example.invalid/baja');
  assert.match(mail.html,/<strong>Hola Ana &lt;script&gt;<\/strong>/);
  assert.match(mail.html,/<em>, <\/em>/);
  assert.match(mail.html,/<a href="https:\/\/lifedecoart.com\/">visita la tienda<\/a>/);
  assert.match(mail.text,/Hola Ana <script>, visita la tienda/);
});

test('el formato no permite HTML ni enlaces ejecutables',()=>{
  const draft={subject:'Prueba',blocks:[{kind:'text',text:'<img onerror=x>',runs:[{text:'<img onerror=x>',bold:true,url:'javascript:alert(1)'}]}]};
  const template=core.templateOf(draft),mail=core.renderEmail(template,{},'https://example.invalid/baja');
  assert.equal(template.blocks[0].runs[0].url,undefined);
  assert.match(mail.html,/<strong>&lt;img onerror=x&gt;<\/strong>/);
  assert.doesNotMatch(mail.html,/<img onerror|javascript:/);
});

test('las ediciones antiguas de texto no recuperan un formato desactualizado',()=>{
  const flow=starter('welcome','rich-flow','rich-mail');
  const block=flow.steps[0].template.blocks[0];block.runs=[{text:'Texto anterior',bold:true}];
  assert.equal(normalizeFlow(flow).steps[0].template.blocks[0].runs,undefined);
  assert.equal(core.templateOf(flow.steps[0].template).blocks[0].runs,undefined);
});

test('espacios exteriores y saltos de línea no pierden el formato',()=>{
  const template=core.templateOf({subject:'Prueba',blocks:[{kind:'text',text:' Hola\nMundo ',runs:[{text:' Hola\n',bold:true},{text:'Mundo ',italic:true}]}]});
  assert.equal(template.blocks[0].text,'Hola\nMundo');
  const mail=core.renderEmail(template);
  assert.match(mail.html,/<strong>Hola<br><\/strong><em>Mundo<\/em>/);
});
