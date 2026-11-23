const { randomUUID } = require('node:crypto');
const core = require('./core.cjs');

const settingsPath = 'marketingSettings/welcome';
const subscribers = 'marketingSubscribers';
const subscriberPath = id => `${subscribers}/${id}`;
function cancelRecord(record, source) {
  if (record.status === 'cancelled') return record;
  const cancelledAt = new Date().toISOString();
  const welcome = ['queued', 'retry'].includes(record.welcome.status)
    ? { ...record.welcome, status: 'cancelled', updatedAt: cancelledAt } : record.welcome;
  return { ...record, status: 'cancelled', cancelledAt, cancelledSource: source, welcome };
}
const subscriberMonth = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit',
});

async function subscriberSummary(db, now = new Date(), includeMail = false) {
  const currentMonth = subscriberMonth.format(now);
  const totals = { total: 0, active: 0, cancelled: 0, newThisMonth: 0 };
  const mail = { sentThisMonth: 0, lastSent: '' };
  let cursor = '';
  do {
    const page = await db.list(subscribers, cursor, 300);
    totals.total += page.rows.length;
    for (const { data } of page.rows) {
      if (data.status === 'active') totals.active++;
      if (data.status === 'cancelled') totals.cancelled++;
      const registered = new Date(data.createdAt);
      if (Number.isFinite(registered.getTime()) && subscriberMonth.format(registered) === currentMonth) totals.newThisMonth++;
      if (includeMail && data.welcome?.status === 'sent') {
        const sent = new Date(data.welcome.updatedAt);
        if (!Number.isFinite(sent.getTime())) continue;
        const sentAt = sent.toISOString();
        if (sentAt > mail.lastSent) mail.lastSent = sentAt;
        if (subscriberMonth.format(sent) === currentMonth) mail.sentThisMonth++;
      }
    }
    cursor = page.next;
  } while (cursor);
  return includeMail ? mail : totals;
}

function service(db, mail, secret, site, sequences) {
  async function attemptWelcome(id) {
    const settings = (await db.read(settingsPath))?.data;
    if (!settings?.enabled || !mail.configured()) return;
    const claim = randomUUID();
    const time = new Date().toISOString();
    const record = await db.update(subscriberPath(id), current => {
      const job = current?.welcome;
      if (current?.status !== 'active' || !['queued', 'retry'].includes(job?.status) || job.retryAt > time) return null;
      return { ...current, welcome: { ...job, status: 'sending', claim, claimedAt: time, attempts: job.attempts + 1 } };
    });
    if (!record) return;
    const current = (await db.read(subscriberPath(id)))?.data;
    if (current?.status !== 'active' || current.welcome.claim !== claim) return;
    const unsubscribe = `${site}/api/marketing?action=unsubscribe&token=${core.unsubscribeToken(secret, id, current)}`;
    const { template } = record.welcome;
    const result = await mail.send({ to: record.email, subject: template.subject,
      ...core.renderEmail(template, current, unsubscribe), unsubscribe });
    await db.update(subscriberPath(id), latest => {
      if (latest?.welcome.claim !== claim) return null;
      const status = result.status === 'retry' && record.welcome.attempts >= 4 ? 'failed' : result.status;
      return { ...latest, welcome: { ...latest.welcome, ...result, status, claim: '',
        retryAt: status === 'retry' ? new Date(Date.now() + 60000 * 5 ** record.welcome.attempts).toISOString() : '',
        updatedAt: new Date().toISOString() } };
    });
  }

  async function signUp(signup) {
    const id = core.digest(secret, `subscriber:${signup.email}`);
    const settings = (await db.read(settingsPath))?.data;
    const now = new Date().toISOString();
    const record = await db.update(subscriberPath(id), previous => core.subscribe(previous, signup, settings, now));
    if (['queued', 'retry'].includes(record.welcome.status)) {
      try { await attemptWelcome(id); } catch { /* The stored job remains available for review or retry. */ }
    }
    if (sequences) {
      try { await sequences.subscription(signup, id); } catch { /* The periodic scan recovers missed enrollments. */ }
    }
  }

  async function unsubscribe(token) {
    const id = token.split('.')[0];
    if (!/^[a-f0-9]{64}$/.test(id)) return false;
    let valid = false;
    await db.update(subscriberPath(id), record => {
      valid = core.validUnsubscribe(secret, id, record, token);
      if (!valid || record.status === 'cancelled') return null;
      return cancelRecord(record, 'email');
    });
    if (valid && sequences) await sequences.cancel(id);
    return valid;
  }

  function editSubscriber(id, name, surname) {
    return db.update(subscriberPath(id), record => record ? { ...record, name, surname } : null);
  }

  async function cancelSubscriber(id) {
    let previous;
    const updated = await db.update(subscriberPath(id), record => {
      previous = record;
      return record && record.status !== 'cancelled' ? cancelRecord(record, 'hub') : null;
    });
    if (previous && sequences) await sequences.cancel(id);
    return updated || previous;
  }

  async function drain() {
    const staleBefore = Date.now() - 5 * 60 * 1000;
    const oldClaims = await db.queue('sending');
    await Promise.all(oldClaims.map(id => db.update(subscriberPath(id), record => {
      if (record?.welcome.status !== 'sending' || Date.parse(record.welcome.claimedAt) > staleBefore) return null;
      return { ...record, welcome: { ...record.welcome, status: 'review', claim: '', reason: 'Envío sin confirmación' } };
    })));
    for (const status of ['queued', 'retry']) {
      const ids = await db.queue(status);
      await Promise.allSettled(ids.map(attemptWelcome));
    }
  }

  return { signUp, unsubscribe, drain, editSubscriber, cancelSubscriber };
}

module.exports = { service, settingsPath, subscribers, subscriberSummary };
