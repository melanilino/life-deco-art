const { project, forIdentity } = require('../marketing/firestore.cjs');
const gmail = require('../marketing/gmail.cjs');
const core = require('../marketing/core.cjs');
const { service, settingsPath, subscribers } = require('../marketing/service.cjs');

const site = 'https://lifedecoart.com';
const unsubscribePattern = /^[a-f0-9]{64}\.[a-f0-9]{64}$/;

async function owner(req, db) {
  const idToken = req.headers.authorization?.match(/^Bearer ([\w.-]+)$/)?.[1];
  if (!idToken || idToken.length > 5000) return false;
  let claims;
  try { claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url')); }
  catch { return false; }
  if (claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}`) return false;
  const { firebaseConfig } = await import('../panel/firebase-config.mjs');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return false;
  const account = (await response.json()).users?.[0];
  if (!account || account.disabled || account.localId !== claims.sub || !/^[\w-]+$/.test(account.localId || '')) return false;
  const access = await db.read(`panelAccess/${account.localId}`);
  return access?.data.enabled?.booleanValue === true;
}

function publicPage(res, title, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  return res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{background:#f5efe5;color:#1c1a17;font:16px system-ui;margin:0;padding:24px}main{max-width:480px;margin:10vh auto;background:white;padding:28px;border-radius:8px}button{background:#1c1a17;color:white;border:0;border-radius:6px;padding:12px 18px;cursor:pointer;font:inherit}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`);
}

async function admin(req, res, url, action, marketing, db) {
  if (!await owner(req, db)) return res.status(403).json({ error: 'Inicia sesión con una cuenta autorizada del Hub.' });
  if (req.method === 'GET' && action === 'subscribers') {
    const page = await db.list(subscribers, url.searchParams.get('page') || '');
    return res.json({ next: page.next, rows: page.rows.map(({ data }) => ({
      email: data.email, name: data.name, surname: data.surname, status: data.status,
      firstSource: data.firstSource, lastSource: data.lastSource, createdAt: data.createdAt,
      cancelledAt: data.cancelledAt, consents: Object.values(data.consents),
      welcome: { status: data.welcome.status, updatedAt: data.welcome.updatedAt, reason: data.welcome.reason },
    })) });
  }
  if (req.method === 'GET' && action === 'settings') {
    const settings = (await db.read(settingsPath))?.data;
    return res.json({ ...(settings || { enabled: false, draft: core.defaultDraft }), mailReady: gmail.configured() });
  }
  if (req.method === 'GET' && action === 'templates') {
    const page = await db.list('marketingTemplates', url.searchParams.get('page') || '');
    return res.json({ next: page.next, rows: page.rows.map(({ data }) => data) });
  }
  if (req.method !== 'POST') return res.status(405).end();
  const { body } = req;
  if (['draft', 'publish', 'preview', 'test', 'copy'].includes(action)) {
    const draft = core.templateOf(body?.template);
    if (!draft) return res.status(400).json({ error: 'Revisa el asunto, los bloques y los enlaces HTTPS.' });
    if (action === 'preview') return res.json(core.renderEmail(draft, body.withName ? { name: 'Ana' } : {}));
    if (action === 'copy') {
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
      if (!name) return res.status(400).json({ error: 'Escribe el nombre de la plantilla.' });
      const id = require('node:crypto').randomUUID();
      await db.update(`marketingTemplates/${id}`, () => ({ name, template: draft, createdAt: new Date().toISOString() }));
      return res.json({ ok: true });
    }
    if (action === 'test') {
      if (!gmail.configured()) return res.status(503).json({ error: 'El buzón corporativo todavía necesita configuración.' });
      const result = await gmail.send({ to: process.env.MARKETING_GMAIL_FROM, subject: `[Prueba] ${draft.subject}`,
        ...core.renderEmail(draft, body.withName ? { name: 'Ana' } : {}) });
      return result.status === 'sent' ? res.json({ ok: true })
        : res.status(502).json({ error: 'El buzón no confirmó el envío de prueba.' });
    }
    await db.update(settingsPath, previous => ({ enabled: false, ...previous, draft,
      ...(action === 'publish' ? { published: { ...draft, publishedAt: new Date().toISOString() } } : {}) }));
    return res.json({ ok: true });
  }
  if (action === 'toggle' && typeof body?.enabled === 'boolean') {
    const settings = await db.update(settingsPath, previous => {
      if (body.enabled && (!previous?.published || !gmail.configured())) return null;
      return { draft: core.defaultDraft, ...previous, enabled: body.enabled };
    });
    return settings ? res.json({ ok: true }) : res.status(409).json({ error: 'Publica una plantilla y configura el buzón antes de activar.' });
  }
  if (action === 'retry') {
    await marketing.drain();
    return res.json({ ok: true });
  }
  return res.status(404).end();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const url = new URL(req.url, site);
    const action = url.searchParams.get('action');
    const secret = process.env.MARKETING_SECRET;
    if (!secret || secret.length < 32) return res.status(503).json({ error: 'Marketing todavía necesita configuración.' });
    const db = forIdentity(req.headers['x-vercel-oidc-token']);
    const marketing = service(db, gmail, secret, site);
    if (action === 'subscribe') {
      if (req.method !== 'POST') return res.status(405).end();
      if (req.headers.origin !== site) return res.status(403).end();
      const { body } = req;
      if (body?.website) return res.status(202).json({ ok: true });
      const signup = core.subscription(body || {});
      if (!signup) return res.status(400).json({ error: 'Escribe un correo válido y acepta recibir comunicaciones.' });
      const ip = req.headers['x-forwarded-for'];
      if (typeof ip !== 'string' || !ip.length) return res.status(503).end();
      const rateId = core.digest(secret, `rate:${ip.split(',')[0].trim()}`);
      const now = Date.now();
      const rate = await db.update(`marketingRate/${rateId}`, entry => {
        if (!entry || entry.expiresAt <= now) return { count: 1, expiresAt: now + 3600000 };
        return entry.count >= 10 ? null : { ...entry, count: entry.count + 1 };
      });
      if (!rate) return res.status(429).json({ error: 'Espera un momento antes de volver a intentar.' });
      const day = new Date(now).toISOString().slice(0, 10);
      const daily = await db.update('marketingRate/daily', entry => {
        if (!entry || entry.day !== day) return { day, count: 1 };
        return entry.count >= 100 ? null : { ...entry, count: entry.count + 1 };
      });
      if (!daily) return res.status(429).json({ error: 'El registro está temporalmente indisponible.' });
      await marketing.signUp(signup);
      return res.status(202).json({ ok: true });
    }
    if (action === 'unsubscribe') {
      const token = url.searchParams.get('token') || '';
      if (!unsubscribePattern.test(token)) return res.status(400).end();
      if (req.method === 'GET') return publicPage(res, 'Cancelar suscripción',
        '<p>Confirma que quieres dejar de recibir correos de la comunidad de Life Deco Art.</p><form method="post"><button>Cancelar suscripción</button></form>');
      if (req.method !== 'POST') return res.status(405).end();
      const removed = await marketing.unsubscribe(token);
      return removed ? publicPage(res, 'Suscripción cancelada', '<p>Tu solicitud quedó registrada.</p>')
        : publicPage(res.status(400), 'Enlace de baja no disponible', '<p>Usa el enlace del correo más reciente.</p>');
    }
    if (action === 'queue') {
      if (req.method !== 'GET' || !process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(403).end();
      await marketing.drain();
      return res.json({ ok: true });
    }
    return await admin(req, res, url, action, marketing, db);
  } catch {
    return res.status(503).json({ error: 'No pudimos completar la operación. Inténtalo nuevamente.' });
  }
};
