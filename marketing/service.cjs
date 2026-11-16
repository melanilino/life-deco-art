const { randomUUID } = require('node:crypto');
const core = require('./core.cjs');

const settingsPath = 'marketingSettings/welcome';
const subscribers = 'marketingSubscribers';
const subscriberPath = id => `${subscribers}/${id}`;

function service(db, mail, secret, site) {
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
  }

  async function unsubscribe(token) {
    const id = token.split('.')[0];
    if (!/^[a-f0-9]{64}$/.test(id)) return false;
    let valid = false;
    await db.update(subscriberPath(id), record => {
      valid = core.validUnsubscribe(secret, id, record, token);
      if (!valid || record.status === 'cancelled') return null;
      const welcome = ['queued', 'retry'].includes(record.welcome.status)
        ? { ...record.welcome, status: 'cancelled' } : record.welcome;
      return { ...record, status: 'cancelled', cancelledAt: new Date().toISOString(), welcome };
    });
    return valid;
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

  return { signUp, unsubscribe, drain };
}

module.exports = { service, settingsPath, subscribers };
