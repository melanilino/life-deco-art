import test from 'node:test';
import assert from 'node:assert/strict';
import {tasks} from '../marketing/tasks.cjs';

const secret='tasks-private-test-secret';
const queue='projects/lifedecoart-hub/locations/us-east4/queues/hub-marketing-waits';
function setup(status=200) {
  const calls=[];
  const api=tasks('identity',secret,'https://lifedecoart.com',{
    queue,now:()=>new Date('2026-11-22T12:00:00Z'),tokenProvider:async()=>'temporary-test-token',
    fetcher:async(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return {ok:status===200,status};},
  });
  return {api,calls};
}
const jobId='a'.repeat(64);

test('programa la hora exacta con identidad federada y una carga sin datos personales',async()=>{
  const x=setup();
  await x.api.schedule(jobId,{index:1,dueAt:'2026-11-22T13:00:00Z'},'epoch');
  const call=x.calls[0],task=call.body.task;
  assert.equal(call.url,`https://cloudtasks.googleapis.com/v2/${queue}/tasks`);
  assert.equal(task.scheduleTime,'2026-11-22T13:00:00.000Z');
  assert.equal(task.httpRequest.url,'https://lifedecoart.com/api/marketing?action=task-wake');
  assert.equal(call.options.headers.Authorization,'Bearer temporary-test-token');
  const body=JSON.parse(Buffer.from(task.httpRequest.body,'base64'));
  assert.deepEqual(Object.keys(body).sort(),['jobId','token']);
  assert.equal(x.api.validWake(body),true);
  assert.equal(x.api.validWake({...body,jobId:'b'.repeat(64)}),false);
  assert.equal(x.api.validWake({...body,token:'invalid'}),false);
});

test('la misma espera tiene un nombre idempotente y una reactivación usa otro',async()=>{
  const x=setup(409),job={index:2,dueAt:'2026-11-22T13:00:00Z'};
  await x.api.schedule(jobId,job,'one');
  await x.api.schedule(jobId,job,'one');
  await x.api.schedule(jobId,job,'two');
  assert.equal(x.calls[0].body.task.name,x.calls[1].body.task.name);
  assert.notEqual(x.calls[0].body.task.name,x.calls[2].body.task.name);
});

test('las esperas largas usan un punto de control dentro del límite de 30 días',async()=>{
  const x=setup();
  await x.api.schedule(jobId,{index:1,dueAt:'2027-04-01T13:00:00Z'},'epoch');
  assert.equal(x.calls[0].body.task.scheduleTime,'2026-12-20T12:00:00.000Z');
});

test('los rechazos de permisos se muestran y no se confunden con una espera programada',async()=>{
  const x=setup(403);
  await assert.rejects(x.api.schedule(jobId,{index:1,dueAt:'2026-11-22T13:00:00Z'},'epoch'),/403/);
});
