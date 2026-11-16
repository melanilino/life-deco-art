const { createSign } = require('node:crypto');

const project = 'lifedecoart-hub';
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
let cachedToken;

async function accessToken() {
  if (cachedToken?.expires > Date.now()) return cachedToken.value;
  const issuer = process.env.MARKETING_FIREBASE_CLIENT_EMAIL;
  const key = process.env.MARKETING_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!issuer || !key) throw new Error('Marketing storage is not configured');
  const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const endpoint = 'https://oauth2.googleapis.com/token';
  const assertion = [
    encode({ alg: 'RS256', typ: 'JWT' }),
    encode({ iss: issuer, aud: endpoint, iat: now, exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/datastore' }),
  ].join('.');
  const signature = createSign('RSA-SHA256').update(assertion).sign(key, 'base64url');
  const response = await fetch(endpoint, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${assertion}.${signature}` }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Marketing storage authentication failed');
  const token = await response.json();
  cachedToken = { value: token.access_token, expires: Date.now() + (token.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function request(path, options = {}) {
  return fetch(root + path, {
    ...options,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
}

async function read(path) {
  const response = await request('/' + path);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Marketing storage read failed');
  const doc = await response.json();
  return { data: doc.fields.record ? JSON.parse(doc.fields.record.stringValue) : doc.fields,
    version: doc.updateTime, id: doc.name.split('/').at(-1) };
}

async function write(path, data, version) {
  const condition = version ? `updateTime=${encodeURIComponent(version)}` : 'exists=false';
  const response = await request(`/${path}?currentDocument.${condition}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: {
      record: { stringValue: JSON.stringify(data) },
      ...(data.welcome ? { queueStatus: { stringValue: data.welcome.status } } : {}),
    } }),
  });
  if ([409, 412].includes(response.status)) return false;
  if (response.status === 400 && (await response.json()).error?.status === 'FAILED_PRECONDITION') return false;
  if (!response.ok) throw new Error('Marketing storage write failed');
  return true;
}

async function update(path, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const doc = await read(path);
    const next = change(doc?.data);
    if (!next || await write(path, next, doc?.version)) return next;
  }
  throw new Error('Concurrent marketing updates');
}

async function list(collection, pageToken = '') {
  const query = new URLSearchParams({ pageSize: '50' });
  if (pageToken) query.set('pageToken', pageToken);
  const response = await request(`/${collection}?${query}`);
  if (!response.ok) throw new Error('Marketing storage list failed');
  const page = await response.json();
  return { rows: (page.documents || []).map(doc => ({
    data: JSON.parse(doc.fields.record.stringValue), id: doc.name.split('/').at(-1),
  })), next: page.nextPageToken || '' };
}

async function queue(status) {
  const response = await request(':runQuery', {
    method: 'POST',
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'marketingSubscribers' }],
      select: { fields: [{ fieldPath: 'queueStatus' }] },
      where: { fieldFilter: { field: { fieldPath: 'queueStatus' }, op: 'EQUAL', value: { stringValue: status } } },
      limit: 10,
    } }),
  });
  if (!response.ok) throw new Error('Marketing queue read failed');
  return (await response.json()).flatMap(row => row.document ? [row.document.name.split('/').at(-1)] : []);
}

module.exports = { project, read, update, list, queue };
