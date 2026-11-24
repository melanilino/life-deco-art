const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto');

const consentVersion = 'community-email-v2';
const acceptedConsentVersions = new Set(['community-email-v1', consentVersion]);
const sources = new Set(['footer', 'community']);
const kinds = new Set(['text', 'image', 'button', 'divider', 'columns']);
const clean = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : '';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function emailOf(value) {
  const email = clean(value, 255).toLowerCase();
  if (email.length > 254 || !/^[^\s@<>,;:"\\()[\]]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email)) return '';
  return email;
}

function digest(key, value) {
  return createHmac('sha256', key).update(value).digest('hex');
}

function subscription(body) {
  const email = emailOf(body.email);
  if (!email || body.consent !== true || !acceptedConsentVersions.has(body.consentVersion) || !sources.has(body.source)) return null;
  return { email, source: body.source, consentVersion: body.consentVersion,
    name: body.source === 'community' ? clean(body.name, 100) : '',
    surname: body.source === 'community' ? clean(body.surname, 100) : '' };
}

function subscribe(current, signup, template, now) {
  const base = current || { email: signup.email, createdAt: now, firstSource: signup.source,
    consents: {}, welcome: { status: 'inactive' } };
  const wasActive = current?.status === 'active';
  const activationId = wasActive ? base.activationId : randomUUID();
  const key = `${activationId}-${signup.consentVersion}-${signup.source}`;
  const previousConsent = wasActive && base.consents[key];
  const consents = previousConsent ? base.consents : {
    ...base.consents, [key]: { source: signup.source, version: signup.consentVersion, acceptedAt: now },
  };
  let welcome = base.welcome;
  if (!current && template?.enabled && template.published) {
    welcome = { status: 'queued', template: template.published, attempts: 0, createdAt: now };
  }
  return { ...base, status: 'active', consents, welcome,
    name: base.name || signup.name, surname: base.surname || signup.surname,
    lastSource: signup.source, activatedAt: wasActive ? base.activatedAt : now,
    activationId, unsubscribeKey: base.unsubscribeKey || randomUUID() };
}

function unsubscribeToken(secret, id, record) {
  const signature = digest(secret, `unsubscribe:${id}:${record.unsubscribeKey}`);
  return `${id}.${signature}`;
}

function validUnsubscribe(secret, id, record, token) {
  if (!record || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(unsubscribeToken(secret, id, record)));
}

const defaultDraft = {
  subject: 'Te damos la bienvenida a Life Deco Art',
  blocks: [{ kind: 'text', text: 'Gracias por unirte a nuestra comunidad.' }],
};

function httpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}

function templateOf(input) {
  const subject = clean(input?.subject, 150);
  if (!subject || /[\r\n]/.test(subject) || !Array.isArray(input.blocks) || !input.blocks.length || input.blocks.length > 30) return null;
  const blocks = input.blocks.map(block => {
    if (!kinds.has(block?.kind)) return null;
    return { kind: block.kind, text: clean(block.text, 3000), secondary: clean(block.secondary, 3000),
      ...(block.kind==='text' && validRuns(block.runs,clean(block.text,3000))?{runs:validRuns(block.runs,clean(block.text,3000))}:{}),
      url: httpsUrl(clean(block.url, 1200)), alt: clean(block.alt, 150),
      color: /^#[0-9a-f]{6}$/i.test(block.color) ? block.color : '#1c1a17',
      align: ['left', 'center', 'right'].includes(block.align) ? block.align : 'left',
      font: typeof block.font === 'string' && block.font.startsWith('Georgia') ? 'Georgia, serif'
        : typeof block.font === 'string' && block.font.startsWith('Montserrat') ? 'Montserrat, Arial, sans-serif' : 'Arial, sans-serif',
      space: [8, 16, 24, 32].includes(Number(block.space)) ? Number(block.space) : 16 };
  });
  if (blocks.some(block => !block || (['image', 'button'].includes(block.kind) && !block.url))) return null;
  const name = clean(input.name, 100);
  const preheader = clean(input.preheader, 150).replace(/[\r\n]+/g, ' ');
  const headingFont = ['Arial', 'Georgia', 'Montserrat'].includes(input.headingFont) ? input.headingFont : '';
  return { subject, blocks, ...(name ? { name } : {}), ...(preheader ? { preheader } : {}),
    ...(input.hideGreeting===true?{hideGreeting:true}:{}),
    ...(input.hideBrandName===true?{hideBrandName:true}:{}),
    ...(headingFont ? { headingFont } : {}), ...(input.brandColors === true ? { brandColors: true } : {}) };
}

function buttonInk(color) {
  const channels = String(color).slice(1).match(/.{2}/g) || [];
  const light = channels.map(pair => parseInt(pair, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * light[0] + .7152 * light[1] + .0722 * light[2] > .179 ? '#000' : '#fff';
}

function validRuns(value, text) {
  if (!Array.isArray(value) || value.length>500) return undefined;
  const runs=value.map(run=>({text:typeof run?.text==='string'?run.text.slice(0,3000):'',...(run?.bold===true?{bold:true}:{}),...(run?.italic===true?{italic:true}:{}),...(httpsUrl(run?.url)?{url:httpsUrl(run.url)}:{})}));
  const full=runs.map(run=>run.text).join('');
  if(full.trim()!==text)return undefined;
  const start=full.length-full.trimStart().length,end=full.trimEnd().length;
  let offset=0;
  return runs.map(run=>{const from=offset;offset+=run.text.length;return {...run,text:run.text.slice(Math.max(0,start-from),Math.max(0,Math.min(run.text.length,end-from)))};}).filter(run=>run.text);
}

function personalize(value, person = {}) {
  return String(value || '').replace(/\{\{\s*(nombre|name|codigo)\s*\}\}/g, (_match, key) =>
    key === 'codigo' ? 'LDA10' : person.name || '');
}

function renderEmail(template, person = {}, unsubscribe = '') {
  template = { ...template, preheader: personalize(template.preheader, person),
    blocks: template.blocks.map(block => ({ ...block, text: personalize(block.text, person), secondary: personalize(block.secondary, person),
      ...(block.runs?{runs:block.runs.map(run=>({...run,text:personalize(run.text,person)}))}:{}) })) };
  const greeting = template.hideGreeting ? '' : person.name ? `Hola, ${person.name}.` : '¡Hola!';
  const paragraph = text => escape(text).replace(/\r?\n/g, '<br>');
  const rows = template.blocks.map(block => {
    let content;
    switch (block.kind) {
      case 'image': content = `<img src="${escape(block.url)}" alt="${escape(block.alt)}" width="552" style="display:inline-block;width:100%;max-width:552px;height:auto;border:0">`; break;
      case 'button': content = `<a href="${escape(block.url)}" style="display:inline-block;background:${block.color};padding:12px 20px;color:${template.brandColors ? buttonInk(block.color) : '#fff'};text-decoration:none">${paragraph(block.text)}</a>`; break;
      case 'divider': content = '<hr style="border:0;border-top:1px solid #ddd">'; break;
      case 'columns': content = `<table role="presentation" width="100%"><tr><td class="column" width="50%" valign="top">${paragraph(block.text)}</td><td class="column" width="50%" valign="top">${paragraph(block.secondary)}</td></tr></table>`; break;
      default: content = validRuns(block.runs,block.text)?.map(run=>{
        let value=paragraph(run.text);
        if(run.bold)value=`<strong>${value}</strong>`;
        if(run.italic)value=`<em>${value}</em>`;
        if(run.url)value=`<a href="${escape(run.url)}">${value}</a>`;
        return value;
      }).join('') || paragraph(block.text);
    }
    return `<tr><td style="padding:0 24px ${block.space}px;color:${block.color};text-align:${block.align};font-family:${block.font}">${content}</td></tr>`;
  }).join('');
  const link = unsubscribe ? `<a href="${escape(unsubscribe)}">Cancelar suscripción</a>` : 'Cancelar suscripción';
  const preheader = template.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(template.preheader)}</div>` : '';
  const titleFont = template.headingFont === 'Georgia' ? 'Georgia,serif' : template.headingFont === 'Montserrat' ? 'Montserrat,Arial,sans-serif' : 'Arial,sans-serif';
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media(max-width:520px){.column{display:block!important;width:100%!important;margin-bottom:12px}}</style></head><body style="margin:0;background:#f5efe5">${preheader}<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" style="width:100%;max-width:600px;background:#fff;font:16px/1.55 Arial,sans-serif;color:#1c1a17" cellspacing="0" cellpadding="0">${!template.hideBrandName || greeting ? `<tr><td style="padding:24px">${!template.hideBrandName ? `<span style="font-family:${titleFont}">Life Deco Art</span>` : ''}${greeting ? `<br><br>${paragraph(greeting)}` : ''}</td></tr>` : ''}${rows}<tr><td style="padding:0 24px 24px;font-size:13px">${link}</td></tr></table></td></tr></table></body></html>`;
  const text = [ 'Life Deco Art', greeting, ...template.blocks.flatMap(block => [block.text || block.alt, block.secondary, block.url]).filter(Boolean),
    unsubscribe ? `Cancelar suscripción: ${unsubscribe}` : '' ].filter(Boolean).join('\n\n');
  return { html, text };
}

module.exports = { consentVersion, emailOf, digest, subscription, subscribe, unsubscribeToken,
  validUnsubscribe, templateOf, renderEmail, defaultDraft, escape, personalize };
