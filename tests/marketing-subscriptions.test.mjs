import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../marketing/core.cjs';
import { service, settingsPath } from '../marketing/service.cjs';

const secret = 'only used by the local marketing tests';
const consent = { consent: true, consentVersion: core.consentVersion };
const origin = 'https://lifedecoart.com';

function fixture(send) {
  const rows = new Map([[settingsPath, { enabled: true, published: core.templateOf(core.defaultDraft) }]]);
  const db = {
    async read(path) { return rows.has(path) ? { data: structuredClone(rows.get(path)) } : null; },
    async update(path, change) {
      const next = change(structuredClone(rows.get(path)));
      if (next) rows.set(path, structuredClone(next));
      return next;
    },
    async queue(status) {
      return [...rows].filter(([, row]) => row.welcome?.status === status).map(([path]) => path.split('/')[1]);
    },
  };
  return { rows, ...service(db, { configured: () => true, send }, secret, origin) };
}

test('los dos formularios comparten suscriptor y bienvenida incluso si llegan a la vez', async () => {
  const calls = [];
  const app = fixture(async message => {
    calls.push(message);
    await new Promise(resolve => setImmediate(resolve));
    return { status: 'sent', messageId: 'test' };
  });
  const footer = core.subscription({ ...consent, email: ' ANA@example.org ', source: 'footer' });
  const community = core.subscription({ ...consent, email: 'ana@example.org', source: 'community', name: 'Ana', surname: 'Pérez' });
  await Promise.all([app.signUp(footer), app.signUp(community)]);
  const [record] = [...app.rows.values()].filter(row => row.email);
  assert.equal(app.rows.size, 2);
  assert.equal(record.name, 'Ana');
  assert.equal(record.surname, 'Pérez');
  assert.equal(Object.values(record.consents).length, 2);
  assert.equal(record.welcome.status, 'sent');
  assert.equal(calls.length, 1);
  assert.match(calls[0].unsubscribe, /^https:\/\/lifedecoart\.com\/api\/marketing/);
});

test('una baja es idempotente y una nueva alta conserva el historial y la bienvenida', async () => {
  const footer = core.subscription({ ...consent, email: 'ana@example.org', source: 'footer' });
  const calls = [];
  const app = fixture(async message => { calls.push(message); return { status: 'sent' }; });
  await app.signUp(footer);
  const token = new URL(calls[0].unsubscribe).searchParams.get('token');
  assert.equal(await app.unsubscribe(token + '0'), false);
  assert.equal(await app.unsubscribe(token), true);
  assert.equal(await app.unsubscribe(token), true);
  await app.signUp(footer);
  assert.equal(calls.length, 1);
  const [subscriber] = [...app.rows.values()].filter(row => row.email);
  assert.equal(subscriber.status, 'active');
  assert.equal(Object.values(subscriber.consents).length, 2);
  assert.equal(await app.unsubscribe(token), true);
});

test('consentimiento requerido, saludo sin nombre y HTML seguro', () => {
  assert.equal(core.subscription({ email: 'ana@example.org', source: 'footer' }), null);
  const template = core.templateOf({ subject: 'Bienvenida', blocks: [{ kind: 'text', text: '<script>test</script>' }] });
  assert.match(core.renderEmail(template).html, /¡Hola!/);
  assert.match(core.renderEmail(template, { name: '<Ana>' }).html, /Hola, &lt;Ana&gt;/);
  assert.doesNotMatch(core.renderEmail(template).html, /<script>/);
  assert.equal(core.templateOf({ subject: 'Bienvenida', blocks: [{ kind: 'button', url: 'javascript:alert(1)' }] }), null);
});

test('un resultado incierto queda para revisión y nunca se reenvía automáticamente', async () => {
  let attempts = 0;
  const app = fixture(async () => { attempts++; return { status: 'review' }; });
  const footer = core.subscription({ ...consent, email: 'ana@example.org', source: 'footer' });
  await app.signUp(footer);
  await app.signUp(footer);
  await app.drain();
  assert.equal(attempts, 1);
});
