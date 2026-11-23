const { timingSafeEqual } = require('node:crypto');
const { accessToken } = require('./firestore.cjs');
const { digest } = require('./core.cjs');

function tasks(identity, secret, site, { fetcher = fetch, now = () => new Date(), queue = process.env.MARKETING_TASKS_QUEUE,
  tokenProvider = () => accessToken(identity) } = {}) {
  const configured = () => /^projects\/lifedecoart-hub\/locations\/[a-z0-9-]+\/queues\/[a-z0-9-]+$/.test(queue || '');
  const signature = id => digest(secret, `task-wake:${id}`);
  const validWake = body => /^[a-f0-9]{64}$/.test(body?.jobId || '') && /^[a-f0-9]{64}$/.test(body?.token || '') &&
    timingSafeEqual(Buffer.from(signature(body.jobId)), Buffer.from(body.token));
  async function schedule(jobId, job, epoch) {
    if (!configured()) throw Error('La cola de esperas necesita configuración.');
    const due = Date.parse(job.dueAt);
    if (!Number.isFinite(due)) throw Error('La espera no tiene una fecha válida.');
    // Cloud Tasks accepts at most 30 days ahead. Longer waits wake at checkpoints.
    const horizon = now().getTime() + 28 * 86400000;
    const checkpoint = due > horizon ? new Date(horizon).toISOString().slice(0,10) : 'final';
    const scheduleTime = new Date(Math.min(due,horizon)).toISOString();
    const id = digest(secret, `scheduled:${jobId}:${job.index}:${job.dueAt}:${epoch}:${checkpoint}`);
    const response = await fetcher(`https://cloudtasks.googleapis.com/v2/${queue}/tasks`, {
      method: 'POST', headers: { Authorization: `Bearer ${await tokenProvider()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: { name: `${queue}/tasks/${id}`, scheduleTime, dispatchDeadline:'180s',
        httpRequest: { httpMethod:'POST', url:`${site}/api/marketing?action=task-wake`,
          headers:{'Content-Type':'application/json'},
          body:Buffer.from(JSON.stringify({jobId,token:signature(jobId)})).toString('base64') } } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok && response.status !== 409) throw Error(`No se pudo programar la espera en Cloud Tasks (${response.status}).`);
    return { scheduleTime };
  }
  return { configured, validWake, schedule };
}
module.exports = { tasks };
