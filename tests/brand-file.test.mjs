import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import handler from '../api/brand-file.js';

const file = '00000000-0000-4000-8000-000000000001';

function response() {
  const headers = new Map();
  const chunks = [];
  const stream = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done(); } });
  stream.setHeader = (key, value) => headers.set(key, value);
  stream.status = code => { stream.statusCode = code; return stream; };
  return { stream, headers, chunks };
}

test('rechaza solicitudes de Marca sin sesión o con una ruta de archivo inválida', async () => {
  const missing = response();
  await handler({ method: 'GET', url: `/api/brand-file?file=${file}`, headers: {} }, missing.stream);
  assert.equal(missing.stream.statusCode, 401);
  const invalid = response();
  await handler({ method: 'GET', url: '/api/brand-file?file=otras%2Frutas', headers: { authorization: 'Bearer fake' } }, invalid.stream);
  assert.equal(invalid.stream.statusCode, 400);
});

test('sirve un PDF desde la carpeta de la cuenta autenticada sin guardarlo en caché', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (new URL(url).hostname === 'identitytoolkit.googleapis.com') {
      assert.deepEqual(JSON.parse(options.body), { idToken: 'fixture-token' });
      return Response.json({ users: [{ localId: 'fixture-user' }] });
    }
    assert.equal(new URL(url).hostname, 'firebasestorage.googleapis.com');
    assert.match(new URL(url).pathname, new RegExp(`panel-private%2Ffixture-user%2F${file}$`));
    assert.equal(options.headers.Authorization, 'Firebase fixture-token');
    return new Response('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
  });
  const { stream, headers, chunks } = response();
  await handler({ method: 'GET', url: `/api/brand-file?file=${file}`, headers: { authorization: 'Bearer fixture-token' } }, stream);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(headers.get('Cache-Control'), 'private, no-store');
  assert.equal(headers.get('Content-Type'), 'application/pdf');
  assert.equal(Buffer.concat(chunks).toString(), '%PDF-1.4');
});
