import test from 'node:test';
import assert from 'node:assert/strict';
import {mailTiming} from '../panel/automation-model.mjs';

test('el resumen distingue el primer correo y los siguientes sin espera',()=>{
  const steps=[{kind:'mail'},{kind:'mail'}];
  assert.equal(mailTiming(steps,0),'Al instante');
  assert.equal(mailTiming(steps,1),'Sin espera adicional');
});

test('el resumen suma esperas consecutivas y se reinicia después de cada correo',()=>{
  const steps=[{kind:'wait',duration:1,unit:'days'},{kind:'wait',duration:1,unit:'hours'},{kind:'mail'},{kind:'wait',duration:30,unit:'minutes'},{kind:'mail'}];
  assert.equal(mailTiming(steps,2),'Después de 25 horas');
  assert.equal(mailTiming(steps,4),'Después de 30 minutos');
  steps[3]={kind:'wait',duration:1,unit:'hours'};
  assert.equal(mailTiming(steps,4),'Después de 1 hora');
});
