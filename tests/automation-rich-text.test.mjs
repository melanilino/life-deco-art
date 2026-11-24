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

test('las automatizaciones parten del contenido escrito sin saludo automático',()=>{
  const flow=starter('blank','custom-flow','custom-mail');
  flow.steps[0].template.subject='Contenido propio';
  flow.steps[0].template.blocks[0].text='Bienvenida, {{nombre}}';
  flow.steps[0].template.blocks.push({kind:'image',url:'https://example.invalid/imagen.png',alt:'Imagen propia'});
  const template=core.templateOf(normalizeFlow(flow).steps[0].template);
  const email=core.renderEmail(template,{name:'Ana'},'https://example.invalid/baja');
  assert.equal(template.hideGreeting,true);
  assert.doesNotMatch(email.html,/Hola, Ana|¡Hola!/);
  assert.match(email.html,/Bienvenida, Ana/);
  assert.match(email.html,/src="https:\/\/example.invalid\/imagen.png"/);
  assert.match(email.html,/alt="Imagen propia"/);
  assert.match(email.html,/Cancelar suscripción/);
  assert.match(core.renderEmail(core.templateOf({subject:'Otro editor',blocks:[{kind:'text',text:'Contenido'}]}),{name:'Ana'}).html,/Hola, Ana/);
});

test('cabecera con imagen conserva orden, enlaces y baja sin el nombre fijo de marca',()=>{
 const flow=starter('blank','header-flow','header-mail'),mail=flow.steps[0];
 mail.template.subject='Cabecera propia';mail.template.hideBrandName=true;
 mail.template.blocks=[{kind:'image',url:'https://example.invalid/logo.png',alt:'Mi logo'},{kind:'text',text:'Texto propio'},{kind:'button',text:'Abrir',url:'https://example.invalid/tienda'}];
 const normalized=normalizeFlow(flow),template=core.templateOf(normalized.steps[0].template),email=core.renderEmail(template,{},'https://example.invalid/baja');
 assert.equal(template.hideBrandName,true);assert.doesNotMatch(email.html,/>Life Deco Art</);
 assert.ok(email.html.indexOf('logo.png')<email.html.indexOf('Texto propio'));
 assert.ok(email.html.indexOf('Texto propio')<email.html.indexOf('https://example.invalid/tienda'));
 assert.match(email.html,/Cancelar suscripción/);
});
