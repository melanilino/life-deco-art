const project = 'lifedecoart-hub';
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
let cachedToken;

async function accessToken(identity) {
  const audience = process.env.MARKETING_FIREBASE_PROVIDER;
  if (typeof identity !== 'string' || !identity || !audience) throw new Error('Marketing storage is not configured');
  if (cachedToken?.identity === identity && cachedToken.audience === audience && cachedToken.expires > Date.now()) {
    return cachedToken.value;
  }
  const response = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    body: new URLSearchParams({
      audience,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: identity,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Marketing storage authentication failed');
  const token = await response.json();
  if (!token.access_token) throw new Error('Marketing storage credentials missing');
  cachedToken = { audience, identity, value: token.access_token, expires: Date.now() + (token.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function request(identity, path, options = {}) {
  return fetch(root + path, {
    ...options,
    headers: { Authorization: `Bearer ${await accessToken(identity)}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
}

async function read(identity, path) {
  const response = await request(identity, '/' + path);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Marketing storage read failed');
  const doc = await response.json();
  return { data: doc.fields.record ? JSON.parse(doc.fields.record.stringValue) : doc.fields,
    version: doc.updateTime, id: doc.name.split('/').at(-1) };
}

async function write(identity, path, data, version) {
  const condition = version ? `updateTime=${encodeURIComponent(version)}` : 'exists=false';
  const response = await request(identity, `/${path}?currentDocument.${condition}`, {
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

async function update(identity, path, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const doc = await read(identity, path);
    const next = change(doc?.data);
    if (!next || await write(identity, path, next, doc?.version)) return next;
  }
  throw new Error('Concurrent marketing updates');
}

async function list(identity, collection, pageToken = '', pageSize = 50) {
  const query = new URLSearchParams({ pageSize: String(pageSize) });
  if (pageToken) query.set('pageToken', pageToken);
  const response = await request(identity, `/${collection}?${query}`);
  if (!response.ok) throw new Error('Marketing storage list failed');
  const page = await response.json();
  return { rows: (page.documents || []).map(doc => ({
    data: JSON.parse(doc.fields.record.stringValue), id: doc.name.split('/').at(-1),
  })), next: page.nextPageToken || '' };
}

function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, field]) => [key, decodeValue(field)]));
  return null;
}

async function nativeList(identity, collection) {
  const rows = [];
  let token = '';
  do {
    const params = new URLSearchParams({ pageSize: '300' });
    if (token) params.set('pageToken', token);
    const response = await request(identity, `/${collection}?${params}`);
    if (!response.ok) throw Error('No se pudieron consultar los eventos del Hub.');
    const page = await response.json();
    rows.push(...(page.documents || []).map(doc => ({
      ...Object.fromEntries(Object.entries(doc.fields || {}).map(([key, field]) => [key, decodeValue(field)])),
      id: doc.name.split('/').at(-1),
    })));
    token = page.nextPageToken || '';
    if (rows.length > 5000) throw Error('Hay demasiados registros para una sola revisión.');
  } while (token);
  return rows;
}

async function queue(identity, status) {
  const response = await request(identity, ':runQuery', {
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

function forIdentity(identity) {
  return {
    read: path => read(identity, path),
    update: (path, change) => update(identity, path, change),
    list: (collection, pageToken, pageSize) => list(identity, collection, pageToken, pageSize),
    queue: status => queue(identity, status),
    nativeList: collection => nativeList(identity, collection),
  };
}

module.exports = { project, forIdentity, accessToken };
