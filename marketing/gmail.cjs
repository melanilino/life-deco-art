const { randomUUID } = require('node:crypto');

const names = ['MARKETING_GMAIL_CLIENT_ID', 'MARKETING_GMAIL_CLIENT_SECRET', 'MARKETING_GMAIL_REFRESH_TOKEN', 'MARKETING_GMAIL_FROM'];
const configured = () => names.every(name => process.env[name]);
let cachedToken;

async function accessToken() {
  if (cachedToken?.expires > Date.now()) return cachedToken.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token', client_id: process.env.MARKETING_GMAIL_CLIENT_ID,
      client_secret: process.env.MARKETING_GMAIL_CLIENT_SECRET, refresh_token: process.env.MARKETING_GMAIL_REFRESH_TOKEN,
    }),
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error('Gmail authorization failed');
  const data = await response.json();
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

const encode = value => Buffer.from(value).toString('base64');
const mimeBody = value => (encode(value).match(/.{1,76}/g) || []).join('\r\n');

async function send({ to, subject, html, text, unsubscribe }) {
  const from = process.env.MARKETING_GMAIL_FROM;
  if (!/^[\w.+-]+@lifedecoart\.com$/i.test(from || '')) return { status: 'retry', reason: 'Remitente pendiente' };
  let token;
  try { token = await accessToken(); }
  catch { return { status: 'retry', reason: 'Autorización de Gmail pendiente' }; }
  const boundary = randomUUID();
  const headers = [
    `From: Life Deco Art <${from}>`, `To: ${to}`, `Subject: =?UTF-8?B?${encode(subject)}?=`,
    'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (unsubscribe) headers.push(`List-Unsubscribe: <${unsubscribe}>`, 'List-Unsubscribe-Post: List-Unsubscribe=One-Click');
  const part = (type, body) => [`--${boundary}`, `Content-Type: text/${type}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64', '', mimeBody(body)];
  const raw = Buffer.from([...headers, '', ...part('plain', text), ...part('html', html), `--${boundary}--`, ''].join('\r\n')).toString('base64url');
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }), signal: AbortSignal.timeout(5500),
    });
    if (response.ok) return { status: 'sent', messageId: (await response.json()).id };
    if (response.status === 401) cachedToken = null;
    if ([401, 403, 429].includes(response.status)) return { status: 'retry', reason: `Gmail HTTP ${response.status}` };
    return { status: response.status >= 500 ? 'review' : 'failed', reason: `Gmail HTTP ${response.status}` };
  } catch {
    return { status: 'review', reason: 'Gmail no confirmó la recepción' };
  }
}

module.exports = { configured, send };
