const { randomUUID } = require('node:crypto');
const core = require('./core.cjs');
const model = import('../panel/automation-model.mjs');
const collection = 'marketingAutomations';
const jobs = 'marketingSequences';
const legacyPath = 'marketingSettings/welcome';
const subscribers = 'marketingSubscribers';
const validId = id => typeof id === 'string' && /^[\w-]{1,80}$/.test(id);
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit' });

async function all(db, path) {
  const rows = [];
  let cursor = '';
  do {
    const page = await db.list(path, cursor, 100);
    rows.push(...page.rows);
    cursor = page.next;
    if (rows.length > 5000) throw Error('Hay demasiados registros para procesar en una sola revisión.');
  } while (cursor);
  return rows;
}

function automations(db, mail, secret, site, now = () => new Date(), scheduler = null) {
  const path = id => `${collection}/${id}`;
  const timestamp = () => now().toISOString();
  let processed = 0;

  async function list() {
    const rows = (await all(db, collection)).map(({ id, data }) => ({ ...data, id }));
    if (!rows.some(row => row.id === 'welcome')) {
      const legacy = (await db.read(legacyPath))?.data;
      const draft = { ...((await model).starter('welcome', 'welcome', 'welcome-mail')) };
      if (legacy?.draft) draft.steps[0].template = legacy.draft;
      rows.unshift({ id: 'welcome', draft, status: legacy?.enabled ? 'active' : 'draft', legacy: true });
    }
    return rows;
  }

  async function save(id, input, uid, version) {
    if (!validId(id)) throw Error('Identificador de automatización no válido.');
    const draft = (await model).normalizeFlow(input);
    const legacy = id === 'welcome' ? (await db.read(legacyPath))?.data : null;
    let conflict = false;
    const record = await db.update(path(id), previous => {
      if (previous && previous.ownerUid !== uid) { conflict = true; return null; }
      if (previous && Number(version) !== previous.version) { conflict = true; return null; }
      return { ...previous, ownerUid: uid, draft, status: previous?.status || (legacy?.enabled ? 'active' : 'draft'), createdAt: previous?.createdAt || timestamp(),
        savedAt: timestamp(), version: (previous?.version || 0) + 1 };
    });
    if (conflict || !record) throw Error('La automatización cambió en otra ventana. Recarga para recuperar la versión guardada.');
    return { ...record, id };
  }

  async function activate(id, uid, version) {
    const { flowChecks } = await model;
    let error = '';
    const record = await db.update(path(id), previous => {
      if (!previous || previous.ownerUid !== uid || previous.version !== version) { error = 'Recarga el borrador antes de activarlo.'; return null; }
      if (!mail.configured()) { error = 'Configura el buzón antes de activar.'; return null; }
      if (scheduler && !scheduler.configured() && previous.draft.steps.some(step => step.kind === 'wait')) {
        error = 'Conecta Cloud Tasks antes de activar una secuencia con esperas.'; return null;
      }
      if (flowChecks(previous.draft).some(check => !check.ok && !check.warning)) { error = 'Completa los puntos obligatorios antes de activar.'; return null; }
      const published = { ...previous.draft, publishedAt: timestamp() };
      return { ...previous, published, status: 'active', activatedAt: previous.activatedAt || timestamp(), acceptFrom: timestamp(), savedAt: timestamp(), version: previous.version + 1 };
    });
    if (!record) throw Error(error);
    // The existing welcome route is retired only when its replacement is explicitly activated.
    if (record.published.trigger === 'subscription') {
      await db.update(legacyPath, previous => ({ ...previous, enabled: false, draft: previous?.draft || core.defaultDraft, managedBySequences: true }));
    }
    // A paused task may have been acknowledged already. A fresh activation epoch
    // gives pending jobs new task names without changing their original deadlines.
    for (const { id: jobId, data } of await all(db,jobs)) {
      if (data.automationId === id && !data.test && ['queued','retry'].includes(data.status)) await ensureScheduled(jobId);
    }
    return { ...record, id };
  }

  async function pause(id, uid, version) {
    let error = false;
    const record = await db.update(path(id), previous => {
      if (!previous || previous.ownerUid !== uid || previous.version !== version) { error = true; return null; }
      return { ...previous, status: 'paused', savedAt: timestamp(), version: previous.version + 1 };
    });
    if (error) throw Error('Recarga la automatización antes de pausarla.');
    if (id === 'welcome') {
      await db.update(legacyPath, previous => previous ? { ...previous, enabled: false } : null);
    }
    return { ...record, id };
  }

  async function enroll(id, automation, subscriberId, eventKey, occurredAt) {
    const published = automation.published;
    if (automation.status !== 'active' || !published || Date.parse(occurredAt) < Date.parse(automation.acceptFrom || automation.activatedAt)) return;
    const subscriber = (await db.read(`${subscribers}/${subscriberId}`))?.data;
    if (subscriber?.status !== 'active') return;
    // A person who already received the old welcome must not receive it a second time.
    if (id === 'welcome' && published.trigger === 'subscription' && ['sent','sending','queued','retry','review'].includes(subscriber.welcome?.status)) return;
    const jobId = core.digest(secret, `sequence:${id}:${subscriberId}:${eventKey}`);
    await db.update(`${jobs}/${jobId}`, previous => previous || ({
      automationId: id, subscriberId, eventKey, sequence: published.steps, index: 0,
      status: 'queued', dueAt: timestamp(), createdAt: timestamp(), deliveries: [], attempts: 0,
    }));
    await run(jobId);
  }

  async function subscription(signup, subscriberId) {
    for (const { id, data } of await all(db, collection)) {
      if (data.status === 'active' && data.published?.trigger === 'subscription' && data.published.origins.includes(signup.source)) {
        await enroll(id, data, subscriberId, 'subscription', timestamp());
      }
    }
  }

  async function ensureScheduled(jobId) {
    if (!scheduler?.configured()) return;
    const record = (await db.read(`${jobs}/${jobId}`))?.data;
    if (!record || !['queued','retry'].includes(record.status)) return;
    const automation = (await db.read(path(record.automationId)))?.data;
    if (!automation || automation.status !== (record.test ? 'paused' : 'active')) return;
    const epoch = record.test ? record.createdAt : automation.acceptFrom || automation.activatedAt;
    const key = `${record.index}:${record.dueAt}:${epoch}`;
    if (record.scheduleKey === key) return;
    try {
      const scheduled = await scheduler.schedule(jobId,record,epoch);
      await db.update(`${jobs}/${jobId}`, current => current?.index === record.index && current.dueAt === record.dueAt
        && ['queued','retry'].includes(current.status) ? { ...current, scheduleKey:key, scheduledFor:scheduled.scheduleTime, schedulingError:'' } : null);
    } catch (error) {
      await db.update(`${jobs}/${jobId}`, current => current?.index === record.index && current.dueAt === record.dueAt
        ? { ...current, schedulingError:error.message } : null);
      throw error;
    }
  }

  async function wake(jobId) {
    const record = (await db.read(`${jobs}/${jobId}`))?.data;
    if (!record) return;
    if (['queued','retry'].includes(record.status) && Date.parse(record.dueAt) > now().getTime()
      && Date.parse(record.dueAt)-now().getTime() < 15000) throw Error('La espera todavía no ha vencido.');
    if (record.status === 'sending') {
      if (Date.parse(record.claimedAt) >= now().getTime()-300000) throw Error('El envío todavía se está procesando.');
      await db.update(`${jobs}/${jobId}`, current => current?.claim === record.claim
        ? { ...current, status:'review', claim:'', reason:'Envío sin confirmación' } : null);
      return;
    }
    await db.update(`${jobs}/${jobId}`, current => current && ['queued','retry'].includes(current.status) ? { ...current, scheduleKey:'' } : null);
    await run(jobId);
  }

  async function run(jobId) {
    if (processed >= 12) { await ensureScheduled(jobId); return; }
    const docPath = `${jobs}/${jobId}`;
    const initial = (await db.read(docPath))?.data;
    if (!initial || !['queued','retry'].includes(initial.status)) return;
    if (Date.parse(initial.dueAt) > now().getTime()) { await ensureScheduled(jobId); return; }
    const automation = (await db.read(path(initial.automationId)))?.data;
    if (automation?.status !== (initial.test ? 'paused' : 'active') || !mail.configured()) return;
    if (!initial.test && automation.published?.trigger === 'subscription' && (await db.read(legacyPath))?.data.enabled) return;
    let subscriber = initial.test ? { ...initial.testRecipient,status:'active' } : (await db.read(`${subscribers}/${initial.subscriberId}`))?.data;
    if (subscriber?.status !== 'active') {
      await db.update(docPath, current => ['queued','retry'].includes(current?.status) ? { ...current, status: 'cancelled' } : null);
      return;
    }
    const claim = randomUUID();
    const record = await db.update(docPath, current => {
      if (!current || !['queued','retry'].includes(current.status) || Date.parse(current.dueAt) > now().getTime()) return null;
      return { ...current, status: 'sending', claim, claimedAt: timestamp() };
    });
    if (!record) return;
    processed++;
    const step = record.sequence[record.index];
    if (!step) {
      await db.update(docPath, current => current?.claim === claim ? { ...current, status: 'done', claim: '' } : null);
      return;
    }
    if (step.kind === 'wait') {
      const dueAt = new Date(now().getTime() + (await model).waitMilliseconds(step)).toISOString();
      await db.update(docPath, current => current?.claim === claim
        ? { ...current, index: current.index + 1, status: 'queued', claim: '', dueAt } : null);
      await ensureScheduled(jobId);
      return;
    }
    subscriber = record.test ? { ...record.testRecipient,status:'active' } : (await db.read(`${subscribers}/${record.subscriberId}`))?.data;
    const currentAutomation = (await db.read(path(record.automationId)))?.data;
    if (subscriber?.status !== 'active' || currentAutomation?.status !== (record.test ? 'paused' : 'active')) {
      await db.update(docPath, current => current?.claim === claim
        ? { ...current, status: subscriber?.status === 'active' ? 'queued' : 'cancelled', claim: '' } : null);
      return;
    }
    const unsubscribe = record.test ? `${site}/api/marketing?action=test-unsubscribe`
      : `${site}/api/marketing?action=unsubscribe&token=${core.unsubscribeToken(secret, record.subscriberId, subscriber)}`;
    const draft = core.templateOf(step.template);
    let outcome;
    try {
      if (!draft) throw Error('Contenido de correo inválido');
      const rendered = core.renderEmail(draft, subscriber, unsubscribe);
      const signature = core.digest(secret, `open:${jobId}:${step.id}`);
      const pixel = `${site}/api/marketing?action=open&job=${jobId}&step=${step.id}&token=${signature}`;
      rendered.html = rendered.html.replace('</body>', `<img src="${pixel.replaceAll('&','&amp;')}" width="1" height="1" alt="" style="display:block;border:0"></body>`);
      outcome = await mail.send({ to: subscriber.email, subject: (record.test ? '[Prueba de espera] ' : '') + core.personalize(draft.subject, subscriber), ...rendered, unsubscribe });
    } catch { outcome = { status: 'review', reason: 'Envío sin confirmación. Revisa el buzón antes de reintentar.' }; }
    await db.update(docPath, current => {
      if (current?.claim !== claim) return null;
      if (outcome.status === 'sent') {
        return { ...current, index: current.index + 1, attempts: 0, status: current.index + 1 >= current.sequence.length ? 'done' : 'queued',
          claim: '', dueAt: timestamp(), deliveries: [...current.deliveries, { stepId: step.id, sentAt: timestamp(), messageId: outcome.messageId || '' }] };
      }
      const attempts = current.attempts + 1;
      return { ...current, status: outcome.status === 'retry' && attempts < 4 ? 'retry' : outcome.status === 'retry' ? 'failed' : outcome.status,
        claim: '', attempts, dueAt: new Date(now().getTime() + 300000 * attempts).toISOString(), reason: outcome.reason || '' };
    });
    if (outcome.status === 'sent' && record.index + 1 < record.sequence.length) await run(jobId);
    else if (outcome.status === 'retry') await ensureScheduled(jobId);
  }

  async function testWait(id, uid, version, template, person) {
    if (!scheduler?.configured()) throw Error('Cloud Tasks todavía no está conectado.');
    if (!mail.configured()) throw Error('Configura el buzón antes de probar la espera.');
    const draft = core.templateOf(template);
    if (!draft || !core.emailOf(person.email)) throw Error('Completa el correo antes de probar la espera.');
    // Tests run through the same wait and delivery engine without enrolling subscribers.
    const row = await pause(id,uid,version);
    const pending = (await all(db,jobs)).find(entry => entry.data.test && entry.data.automationId === id
      && entry.data.ownerUid === uid && ['queued','retry'].includes(entry.data.status));
    const jobId = pending?.id || core.digest(secret,`wait-test:${randomUUID()}`);
    if (!pending) await db.update(`${jobs}/${jobId}`,() => ({ automationId:id,ownerUid:uid,test:true,
      testRecipient:{email:person.email,name:person.name},sequence:[{id:'test-wait',kind:'wait',duration:1,unit:'minutes'},
        {id:'test-mail',kind:'mail',template:draft}],index:0,status:'queued',dueAt:timestamp(),createdAt:timestamp(),deliveries:[],attempts:0 }));
    try { await run(jobId); } catch { /* Keep the test ID and scheduling error available for retry. */ }
    return { row, test:await testStatus(jobId,uid) };
  }

  async function testStatus(jobId,uid) {
    if (!/^[a-f0-9]{64}$/.test(jobId||'')) throw Error('Selecciona una prueba válida.');
    const record = (await db.read(`${jobs}/${jobId}`))?.data;
    if (!record?.test || record.ownerUid !== uid) throw Error('Prueba no disponible.');
    return { id:jobId,status:record.status,dueAt:record.dueAt,scheduledFor:record.scheduledFor,
      sentAt:record.deliveries[0]?.sentAt || '',messageId:record.deliveries[0]?.messageId || '',
      error:record.schedulingError || record.reason || '' };
  }

  async function open(jobId, stepId, token) {
    if (!/^[a-f0-9]{64}$/.test(jobId) || !validId(stepId) || !/^[a-f0-9]{64}$/.test(token)) return;
    if (token !== core.digest(secret, `open:${jobId}:${stepId}`)) return;
    await db.update(`${jobs}/${jobId}`, current => {
      if (!current?.sequence.some(step => step.id === stepId && step.kind === 'mail')) return null;
      return { ...current, opens: { ...current.opens, [stepId]: current.opens?.[stepId] || timestamp() } };
    });
  }

  async function cancel(subscriberId) {
    for (const { id, data } of await all(db, jobs)) {
      if (data.subscriberId !== subscriberId) continue;
      await db.update(`${jobs}/${id}`, current => current?.subscriberId === subscriberId && ['queued','retry','sending'].includes(current.status)
        ? { ...current, status: 'cancelled', claim: '' } : null);
    }
  }

  async function metrics(id) {
    const rows = (await all(db, jobs)).filter(row => row.data.automationId === id && !row.data.test).map(row => row.data);
    const legacySent = id === 'welcome' ? (await all(db, subscribers)).filter(row => row.data.welcome?.status === 'sent').length : 0;
    return { sent: legacySent + rows.reduce((sum, row) => sum + row.deliveries.length, 0),
      opens: rows.reduce((sum, row) => sum + row.deliveries.filter(delivery => row.opens?.[delivery.stepId]).length, 0),
      codeUses: null, pending: rows.filter(row => ['queued','retry','sending'].includes(row.status)).length,
      review: rows.filter(row => ['review','failed'].includes(row.status)).length };
  }

  async function scanDomain() {
    const flows = (await all(db, collection)).filter(row => row.data.status === 'active' && row.data.published?.trigger !== 'subscription');
    const owners = [...new Set(flows.map(row => row.data.ownerUid))];
    for (const owner of owners) {
      if (!/^[\w-]+$/.test(owner || '')) continue;
      const records = await db.nativeList(`panelData/${owner}/records`);
      const clients = records.filter(row => row.kind === 'clients' && !row.archived);
      const purchases = records.filter(row => row.kind === 'invoices' && !['borrador','anulada'].includes(row.status) && row.issuedAt);
      for (const client of clients) {
        const email = core.emailOf(client.email);
        if (!email) continue;
        const subscriberId = core.digest(secret, `subscriber:${email}`);
        const history = purchases.filter(row => row.clientId === client.id);
        for (const { id, data } of flows.filter(row => row.data.ownerUid === owner)) {
          const trigger = data.published.trigger;
          const events = trigger === 'purchase' ? history.map(row => [`purchase:${row.id}`, row.issuedAt])
            : trigger === 'delivered' ? records.filter(row => row.kind === 'orders' && row.clientId === client.id && row.stage === 'entregado' && row.deliveredAt).map(row => [`delivered:${row.id}`, row.deliveredAt]) : [];
          const today = dayFormat.format(now());
          const birthday = String(client.birthday || client.dateOfBirth || '').match(/(?:^|\d{4}-)(\d{2}-\d{2})$/)?.[1];
          if (trigger === 'birthday' && birthday === today.slice(5)) events.push([`birthday:${today.slice(0,4)}`, timestamp()]);
          if (trigger === 'inactive' && history.length) {
            const last = history.map(row => row.issuedAt).sort().at(-1);
            if (now().getTime() - Date.parse(last) >= data.published.inactiveDays * 86400000) events.push([`inactive:${last}`, timestamp()]);
          }
          for (const [key, at] of events) await enroll(id, data, subscriberId, key, at);
        }
      }
    }
  }

  async function drain() {
    const subscriptionFlows = (await all(db, collection)).filter(row => row.data.status === 'active' && row.data.published?.trigger === 'subscription');
    if (subscriptionFlows.length) {
      for (const { id: subscriberId, data } of await all(db, subscribers)) {
        if (data.status !== 'active') continue;
        for (const { id, data: flow } of subscriptionFlows) {
          const consent = Object.values(data.consents || {}).find(entry => flow.published.origins.includes(entry.source) && Date.parse(entry.acceptedAt) >= Date.parse(flow.acceptFrom || flow.activatedAt));
          if (consent) await enroll(id, flow, subscriberId, 'subscription', consent.acceptedAt);
        }
      }
    }
    await scanDomain();
    const rows = await all(db, jobs);
    for (const { id, data } of rows) {
      if (data.status === 'sending' && Date.parse(data.claimedAt) < now().getTime() - 300000) {
        await db.update(`${jobs}/${id}`, current => current?.claim === data.claim
          ? { ...current, status: 'review', claim: '', reason: 'Envío sin confirmación' } : null);
      } else if (['queued','retry'].includes(data.status)) await run(id);
    }
  }
  return { list, save, activate, pause, subscription, drain, metrics, open, cancel, wake, testWait, testStatus };
}

module.exports = { automations, validId };
