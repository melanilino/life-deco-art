import test from 'node:test';
import assert from 'node:assert/strict';
import {mailTiming,waitDueAt,normalizeFlow,starter,flowStages} from '../panel/automation-model.mjs';

test('el resumen distingue el primer correo y los siguientes sin espera',()=>{
  const steps=[{kind:'mail'},{kind:'mail'}];
  assert.equal(mailTiming(steps,0),'Al instante');
  assert.equal(mailTiming(steps,1),'Sin espera adicional');
});

test('el flujo tiene cuatro pasos y recupera Inicio antiguo en Disparador',()=>{
  assert.deepEqual(flowStages,['Disparador','Secuencia','Contenido','Revisar y activar']);
  const flow=starter('blank','flow','mail');flow.stage=0;
  assert.equal(normalizeFlow(flow).stage,1);
});

test('la espera con hora usa el día local de República Dominicana',()=>{
  assert.equal(waitDueAt({duration:2,unit:'days',time:'10:00'},'2026-12-31T02:00:00Z'),'2027-01-01T14:00:00.000Z');
  assert.equal(waitDueAt({duration:1,unit:'hours'},'2026-11-23T23:30:00Z'),'2026-11-24T00:30:00.000Z');
});

test('la hora opcional se guarda y se rechazan horas o unidades incompatibles',()=>{
  const flow=starter('blank','flow','mail');flow.steps.unshift({id:'wait',kind:'wait',duration:1,unit:'days',time:'11:30'});
  assert.equal(normalizeFlow(flow).steps[0].time,'11:30');
  flow.steps[0].time='25:00';assert.throws(()=>normalizeFlow(flow),/hora/);
  flow.steps[0].time='11:30';flow.steps[0].unit='hours';assert.throws(()=>normalizeFlow(flow),/hora/);
});

test('el resumen suma esperas consecutivas y se reinicia después de cada correo',()=>{
  const steps=[{kind:'wait',duration:1,unit:'days'},{kind:'wait',duration:1,unit:'hours'},{kind:'mail'},{kind:'wait',duration:30,unit:'minutes'},{kind:'mail'}];
  assert.equal(mailTiming(steps,2),'Después de 25 horas');
  assert.equal(mailTiming(steps,4),'Después de 30 minutos');
  steps[3]={kind:'wait',duration:1,unit:'hours'};
  assert.equal(mailTiming(steps,4),'Después de 1 hora');
});
