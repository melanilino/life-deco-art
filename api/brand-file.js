const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const fileIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const allowedType = /^(?:image\/(?:png|jpeg|webp|gif)|application\/pdf)$/;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).end();
  const token = req.headers.authorization?.match(/^Bearer ([\w.-]+)$/)?.[1];
  if (!token || token.length > 5000) return res.status(401).end();
  const file = new URL(req.url, 'https://lifedecoart.com').searchParams.get('file');
  if (!fileIdPattern.test(file || '')) return res.status(400).end();
  try {
    const { firebaseConfig } = await import('../panel/firebase-config.mjs');
    const accountResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!accountResponse.ok) return res.status(accountResponse.status < 500 ? 403 : 502).end();
    const account = (await accountResponse.json()).users?.[0];
    if (!/^[\w-]{1,128}$/.test(account?.localId || '') || account.disabled) return res.status(403).end();
    const path = encodeURIComponent(`panel-private/${account.localId}/${file}`);
    const url = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${path}?alt=media`;
    const upstream = await fetch(url, { headers: { Authorization: `Firebase ${token}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    const type = upstream.headers.get('content-type')?.split(';')[0];
    if (!upstream.ok || !upstream.body || !allowedType.test(type || '')) {
      await upstream.body?.cancel();
      return res.status([401, 403, 404].includes(upstream.status) ? upstream.status : 502).end();
    }
    res.setHeader('Content-Type', type);
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    if (!res.headersSent && !res.destroyed) res.status(502).end();
  }
};
