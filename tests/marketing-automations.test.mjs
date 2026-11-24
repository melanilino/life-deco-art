import test from 'node:test';
import assert from 'node:assert/strict';
import { automations } from '../marketing/automations.cjs';
import { service } from '../marketing/service.cjs';
import core from '../marketing/core.cjs';
import { starter, flowChecks, normalizeFlow } from '../panel/automation-model.mjs';

const secret = 'sequence-tests-private-key';
const site = 'https://lifedecoart.com';
const uid = 'owner';
test('el programador respeta la hora opcional del correo sin adelantar ni duplicar',async()=>{
  const x=fixture(true);
  await x.publish('welcome',flow=>flow.steps.unshift({id:'wait-at',kind:'wait',duration:1,unit:'days',time:'11:30'}));
  const subscriber=x.contact();await x.api.subscription({source:'footer'},subscriber);
  assert.equal(x.messages.length,0);
  assert.equal(x.scheduled.at(-1).job.dueAt,'2026-11-23T15:30:00.000Z');
  x.advance(99000000-60000);await x.fresh().drain();assert.equal(x.messages.length,0);
  x.advance(60000);await x.fresh().drain();await x.fresh().drain();assert.equal(x.messages.length,1);
});
function fixture(withScheduler = false) {
  let time = new Date('2026-11-22T12:00:00Z');
  const documents = new Map();
  const domain = [];
  const messages = [];
  const db = {
    async read(path) { return documents.has(path) ? { data: structuredClone(documents.get(path)) } : null; },
    async update(path, change) {
      const next = change(structuredClone(documents.get(path)));
      if (next) documents.set(path, structuredClone(next));
      return next;
    },
    async list(path) {
      return { rows: [...documents].filter(([key])=>key.startsWith(path+'/')&&key.split('/').length===path.split('/').length+1)
        .map(([key,data])=>({id:key.split('/').at(-1),data:structuredClone(data)})), next:'' };
    },
    async nativeList() { return structuredClone(domain); },
  };
  const mail = { configured:()=>true, send:async message=>{messages.push(message);return {status:'sent',messageId:String(messages.length)};} };
  const scheduled = [];
  const scheduler = withScheduler ? { configured:()=>true,schedule:async(jobId,job,epoch)=>{scheduled.push({jobId,job:structuredClone(job),epoch});return {scheduleTime:job.dueAt};} } : null;
  const fresh = () => automations(db,mail,secret,site,()=>time,scheduler);
  const api = fresh();
  function contact(email='ana@example.org') {
    const id=core.digest(secret,`subscriber:${email}`);
    documents.set('marketingSubscribers/'+id,core.subscribe(null,{email,name:'Ana',surname:'Prueba',source:'footer',consentVersion:core.consentVersion},null,time.toISOString()));
    return id;
  }
  async function publish(kind='welcome', change=()=>{}) {
    const draft=starter(kind,kind,'mail-one');
    change(draft);
    const saved=await api.save(kind,draft,uid,0);
    return api.activate(kind,uid,saved.version);
  }
  return { api, db, scheduler, scheduled, fresh, documents, domain, messages, contact, publish, mail, advance:milliseconds=>{time=new Date(time.getTime()+milliseconds);} };
}

test('los borradores incompletos se guardan y retoman, pero no se activan',async()=>{
  const x=fixture(),draft=starter('blank','flow','mail-one');
  draft.stage=3;
  const saved=await x.api.save('flow',draft,uid,0);
  assert.equal(saved.draft.stage,3);
  assert.equal((await x.api.list()).find(row=>row.id==='flow').draft.selectedMail,'mail-one');
  await assert.rejects(x.api.activate('flow',uid,saved.version),/obligatorios/);
  await assert.rejects(x.api.save('flow',draft,uid,0),/otra ventana/);
});

test('preheader es advertencia y los enlaces son obligatorios',()=>{
  const draft=normalizeFlow(starter('welcome','flow','mail-one'));
  assert.equal(flowChecks(draft).filter(c=>!c.ok&&!c.warning).length,0);
  assert.equal(flowChecks(draft).find(c=>c.key==='preheader').warning,true);
  draft.steps[0].template.blocks.push({kind:'button',text:'Tienda',url:''});
  assert.equal(flowChecks(draft).find(c=>c.key==='links').ok,false);
});

test('los dos orígenes y los reintentos concurrentes generan un solo correo por persona y flujo',async()=>{
  const x=fixture();
  await x.publish('welcome',flow=>{flow.steps[0].template.blocks[0].text='Gracias, {{nombre}}';});
  const subscriber=x.contact();
  await Promise.all([x.api.subscription({source:'footer'},subscriber),x.api.subscription({source:'community'},subscriber)]);
  await x.api.subscription({source:'footer'},subscriber);
  await x.api.drain();
  assert.equal(x.messages.length,1);
  assert.match(x.messages[0].html,/Cancelar suscripción/);
  assert.match(x.messages[0].html,/Gracias, Ana/);
  assert.doesNotMatch(x.messages[0].html,/Hola, Ana/);
});

test('se filtra el formulario de origen y se recuperan altas pendientes',async()=>{
  const x=fixture();
  await x.publish('welcome',flow=>{flow.origins=['community'];});
  const subscriber=x.contact();
  await x.api.subscription({source:'footer'},subscriber);
  assert.equal(x.messages.length,0);
  x.documents.get('marketingSubscribers/'+subscriber).consents.community={source:'community',acceptedAt:'2026-11-22T12:00:00Z'};
  await x.api.drain();
  assert.equal(x.messages.length,1);
});

test('las esperas se respetan y una baja cancela todos los pasos pendientes',async()=>{
  const x=fixture();
  await x.publish('welcome',flow=>{
    flow.steps.push({id:'wait',kind:'wait',duration:2,unit:'hours'},
      {...structuredClone(flow.steps[0]),id:'mail-two'});
  });
  const subscriber=x.contact();
  await x.api.subscription({source:'footer'},subscriber);
  await x.api.drain();
  assert.equal(x.messages.length,1);
  x.advance(7199000);
  await x.api.drain();
  assert.equal(x.messages.length,1);
  x.documents.get('marketingSubscribers/'+subscriber).status='cancelled';
  x.advance(2000);
  await x.api.drain();
  assert.equal(x.messages.length,1);
  assert.equal([...x.documents].find(([path])=>path.startsWith('marketingSequences/'))[1].status,'cancelled');
});

test('al finalizar la espera, se envía el segundo correo una sola vez',async()=>{
  const x=fixture();
  await x.publish('welcome',flow=>flow.steps.push({id:'wait',kind:'wait',duration:1,unit:'days'},{...structuredClone(flow.steps[0]),id:'mail-two'}));
  const subscriber=x.contact();
  await x.api.subscription({source:'footer'},subscriber);
  x.advance(86400000);
  await Promise.all([x.api.drain(),x.api.drain()]);
  assert.equal(x.messages.length,2);
});

test('pausar conserva las esperas y bloquea nuevos envíos',async()=>{
  const x=fixture();
  const active=await x.publish('welcome',flow=>flow.steps.unshift({id:'wait',kind:'wait',duration:1,unit:'hours'}));
  const subscriber=x.contact();
  await x.api.subscription({source:'footer'},subscriber);
  await x.api.pause('welcome',uid,active.version);
  x.advance(7200000);
  await x.api.drain();
  assert.equal(x.messages.length,0);
});

test('la migración no repite la bienvenida anterior y nunca activa con solo guardar',async()=>{
  const x=fixture();
  x.documents.set('marketingSettings/welcome',{enabled:false,draft:core.defaultDraft});
  const saved=await x.api.save('welcome',starter('welcome','welcome','mail-one'),uid,0);
  assert.equal(saved.status,'draft');
  const subscriber=x.contact();
  x.documents.get('marketingSubscribers/'+subscriber).welcome={status:'sent'};
  await x.api.activate('welcome',uid,saved.version);
  await x.api.subscription({source:'footer'},subscriber);
  assert.equal(x.messages.length,0);
  assert.equal(x.documents.get('marketingSettings/welcome').enabled,false);
});

test('las compras y las entregas leen eventos reales del Hub solo para contactos activos',async()=>{
  const x=fixture();
  await x.publish('purchase');
  await x.publish('review');
  x.contact();
  x.domain.push({id:'client',kind:'clients',email:'ana@example.org'},
    {id:'invoice',kind:'invoices',clientId:'client',status:'pendiente',issuedAt:'2026-11-22T12:01:00Z'},
    {id:'order',kind:'orders',clientId:'client',stage:'entregado',deliveredAt:'2026-11-22T12:01:00Z'});
  x.advance(120000);
  await x.api.drain();
  await x.api.drain();
  assert.equal(x.messages.length,2);
});

test('cumpleaños e inactividad entran una vez cuando los datos cumplen las condiciones',async()=>{
  const x=fixture();
  await x.publish('welcome',flow=>{flow.trigger='birthday';});
  await x.publish('purchase',flow=>{flow.trigger='inactive';});
  x.contact();
  x.domain.push({id:'client',kind:'clients',email:'ana@example.org',birthday:'2000-11-22'},
    {id:'old',kind:'invoices',clientId:'client',status:'pagada',issuedAt:'2026-08-01T12:00:00Z'});
  await x.api.drain();
  await x.api.drain();
  assert.equal(x.messages.length,2);
});

test('las métricas usan envíos y píxeles firmados, y no inventan canjes',async()=>{
  const x=fixture();
  await x.publish();
  await x.api.subscription({source:'footer'},x.contact());
  const pixel=x.messages[0].html.match(/<img src="([^"]+)"/)[1].replaceAll('&amp;','&');
  const url=new URL(pixel);
  await x.api.open(url.searchParams.get('job'),url.searchParams.get('step'),'0'.repeat(64));
  assert.equal((await x.api.metrics('welcome')).opens,0);
  await x.api.open(url.searchParams.get('job'),url.searchParams.get('step'),url.searchParams.get('token'));
  await x.api.open(url.searchParams.get('job'),url.searchParams.get('step'),url.searchParams.get('token'));
  assert.deepEqual(await x.api.metrics('welcome'),{sent:1,opens:1,codeUses:null,pending:0,review:0});
});

test('un envío de resultado incierto queda en revisión y no se repite',async()=>{
  const x=fixture();
  x.mail.send=async()=>{throw Error('timeout');};
  await x.publish();
  await x.api.subscription({source:'footer'},x.contact());
  x.advance(86400000);
  await x.api.drain();
  assert.equal((await x.api.metrics('welcome')).review,1);
});

test('pausar la bienvenida migrada también detiene el envío heredado',async()=>{
  const x=fixture();
  x.documents.set('marketingSettings/welcome',{enabled:true,draft:core.defaultDraft});
  const legacy=(await x.api.list()).find(row=>row.id==='welcome');
  const saved=await x.api.save('welcome',legacy.draft,uid,0);
  await x.api.pause('welcome',uid,saved.version);
  assert.equal(x.documents.get('marketingSettings/welcome').enabled,false);
  assert.equal((await x.api.list()).find(row=>row.id==='welcome').status,'paused');
});

test('editar el borrador no cambia un correo ya inscrito y una baja no revive al volver a suscribirse',async()=>{
  const x=fixture();
  const active=await x.publish('welcome',flow=>flow.steps.unshift({id:'wait-first',kind:'wait',duration:1,unit:'hours'}));
  const subscriber=x.contact();
  await x.api.subscription({source:'footer'},subscriber);
  const draft=structuredClone(active.draft);
  draft.steps[1].template.subject='Un asunto diferente';
  await x.api.save('welcome',draft,uid,active.version);
  x.advance(3600000);
  await x.api.drain();
  assert.equal(x.messages[0].subject,active.draft.steps[1].template.subject);
  await x.api.cancel(subscriber);
  await x.api.subscription({source:'community'},subscriber);
  assert.equal(x.messages.length,1);
});

test('el recorrido de ambos formularios comparte secuencia y la baja retira el segundo correo',async()=>{
  const x=fixture();
  await x.publish('welcome',flow=>flow.steps.push({id:'wait',kind:'wait',duration:1,unit:'hours'},
    {...structuredClone(flow.steps[0]),id:'second-mail'}));
  const marketing=service(x.db,x.mail,secret,site,x.api);
  const base={email:'recorrido@example.org',name:'',surname:'',consentVersion:core.consentVersion};
  await marketing.signUp({...base,source:'footer'});
  await marketing.signUp({...base,source:'community',name:'Ana',surname:'Prueba'});
  const id=core.digest(secret,`subscriber:${base.email}`);
  const contact=x.documents.get('marketingSubscribers/'+id);
  assert.equal(contact.name,'Ana');
  assert.equal(Object.keys(contact.consents).length,2);
  assert.equal(x.messages.length,1);
  assert.equal(await marketing.unsubscribe(core.unsubscribeToken(secret,id,contact)),true);
  x.advance(3600000);
  await x.api.drain();
  assert.equal(x.messages.length,1);
  assert.equal((await x.api.metrics('welcome')).pending,0);
});

test('Cloud Tasks despierta el correo al vencer la espera, sin cron y sin duplicados',async()=>{
  const x=fixture(true);
  await x.publish('welcome',flow=>flow.steps.unshift({id:'wait',kind:'wait',duration:1,unit:'hours'}));
  await x.api.subscription({source:'footer'},x.contact());
  assert.equal(x.scheduled.length,1);
  assert.equal(x.scheduled[0].job.dueAt,'2026-11-22T13:00:00.000Z');
  assert.equal(x.messages.length,0);
  x.advance(3600000);
  await Promise.all([x.fresh().wake(x.scheduled[0].jobId),x.fresh().wake(x.scheduled[0].jobId)]);
  assert.equal(x.messages.length,1);
  await x.fresh().wake(x.scheduled[0].jobId);
  assert.equal(x.messages.length,1);
});

test('una pausa bloquea la tarea y reanudar crea otra programación para el mismo vencimiento',async()=>{
  const x=fixture(true);
  const active=await x.publish('welcome',flow=>flow.steps.unshift({id:'wait',kind:'wait',duration:1,unit:'hours'}));
  await x.api.subscription({source:'footer'},x.contact());
  const paused=await x.api.pause('welcome',uid,active.version);
  x.advance(3600000);
  await x.fresh().wake(x.scheduled[0].jobId);
  assert.equal(x.messages.length,0);
  await x.fresh().activate('welcome',uid,paused.version);
  assert.equal(x.scheduled.length,2);
  assert.notEqual(x.scheduled[0].epoch,x.scheduled[1].epoch);
  await x.fresh().wake(x.scheduled[1].jobId);
  assert.equal(x.messages.length,1);
});

test('una baja entre programar y ejecutar impide el envío',async()=>{
  const x=fixture(true);
  await x.publish('welcome',flow=>flow.steps.unshift({id:'wait',kind:'wait',duration:1,unit:'hours'}));
  const subscriber=x.contact();
  await x.api.subscription({source:'footer'},subscriber);
  await x.api.cancel(subscriber);
  x.advance(3600000);
  await x.fresh().wake(x.scheduled[0].jobId);
  assert.equal(x.messages.length,0);
});

test('la prueba usa el motor real, pausa el flujo y no altera las métricas de suscriptores',async()=>{
  const x=fixture(true);
  const saved=await x.api.save('welcome',starter('welcome','welcome','mail'),uid,0);
  const result=await x.api.testWait('welcome',uid,saved.version,saved.draft.steps[0].template,{email:'admin@example.org',name:'Administradora'});
  assert.equal(result.row.status,'paused');
  assert.equal(result.test.scheduledFor,'2026-11-22T12:01:00.000Z');
  assert.equal(x.messages.length,0);
  await assert.rejects(x.api.testStatus(result.test.id,'otra-cuenta'),/no disponible/);
  x.advance(60000);
  await x.fresh().wake(result.test.id);
  assert.equal(x.messages.length,1);
  assert.equal(x.messages[0].to,'admin@example.org');
  assert.match(x.messages[0].subject,/Prueba de espera/);
  assert.equal((await x.api.testStatus(result.test.id,uid)).status,'done');
  assert.equal((await x.api.metrics('welcome')).sent,0);
});

test('un fallo al programar conserva la espera y se recupera sin duplicar la entrega',async()=>{
  const x=fixture(true),schedule=x.scheduler.schedule;
  x.scheduler.schedule=async()=>{throw Error('Cola no disponible');};
  await x.publish('welcome',flow=>flow.steps.unshift({id:'wait',kind:'wait',duration:1,unit:'hours'}));
  await assert.rejects(x.api.subscription({source:'footer'},x.contact()),/no disponible/);
  const [path,record]=[...x.documents].find(([key])=>key.startsWith('marketingSequences/'));
  assert.equal(record.index,1);
  assert.match(record.schedulingError,/no disponible/);
  x.scheduler.schedule=schedule;
  await x.fresh().drain();
  assert.equal(x.scheduled.length,1);
  x.advance(3600000);
  await x.fresh().wake(path.split('/').at(-1));
  assert.equal(x.messages.length,1);
});

test('borrar retira el borrador y una pestaña anterior no puede recuperarlo al guardar o activar',async()=>{
  const x=fixture();
  const row=await x.api.save('accidental',starter('blank','accidental','mail'),uid,0);
  await assert.rejects(x.api.remove(row.id,'otra-cuenta',row.version),/Recarga/);
  await assert.rejects(x.api.remove(row.id,uid,0),/Recarga/);
  const deleted=await x.api.remove(row.id,uid,row.version);
  assert.equal((await x.api.list()).some(entry=>entry.id===row.id),false);
  assert.equal((await x.api.list()).some(entry=>entry.id==='welcome'),true);
  await assert.rejects(x.api.save(row.id,row.draft,uid,deleted.version),/otra ventana/);
  await assert.rejects(x.api.activate(row.id,uid,deleted.version),/Recarga/);
  await assert.rejects(x.api.pause(row.id,uid,deleted.version),/Recarga/);
});

test('borrar un flujo con una espera programada cancela el envío y conserva su historial',async()=>{
  const x=fixture(true);
  const active=await x.publish('welcome',flow=>flow.steps.push({id:'wait',kind:'wait',duration:1,unit:'hours'},
    {...structuredClone(flow.steps[0]),id:'second'}));
  await x.api.subscription({source:'footer'},x.contact());
  await x.api.remove('welcome',uid,active.version);
  x.advance(3600000);
  await x.fresh().wake(x.scheduled[0].jobId);
  assert.equal(x.messages.length,1);
  assert.equal((await x.api.metrics('welcome')).pending,0);
  assert.equal((await x.api.metrics('welcome')).sent,1);
  assert.equal((await x.api.list()).some(entry=>entry.id==='welcome'),false);
});

test('borrar la bienvenida heredada la deshabilita y no recrea una fila virtual',async()=>{
  const x=fixture();
  x.documents.set('marketingSettings/welcome',{enabled:true,draft:core.defaultDraft});
  const virtual=(await x.api.list()).find(row=>row.id==='welcome');
  const saved=await x.api.save('welcome',virtual.draft,uid,0);
  await x.api.remove('welcome',uid,saved.version);
  assert.equal(x.documents.get('marketingSettings/welcome').enabled,false);
  assert.equal((await x.api.list()).length,0);
});
