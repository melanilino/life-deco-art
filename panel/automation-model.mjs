export const triggerOptions = [
  ['subscription', 'Nueva suscripción'],
  ['purchase', 'Nueva compra'],
  ['delivered', 'Pedido entregado'],
  ['birthday', 'Cumpleaños'],
  ['inactive', 'Clienta inactiva'],
];
export const originOptions = [
  ['community', 'Formulario celeste «Suscríbete gratis»'],
  ['footer', 'Pie de página «Comunidad»'],
];
export const flowStages = ['Inicio', 'Disparador', 'Secuencia', 'Correo', 'Revisar y activar'];
export const starterOptions = [
  ['welcome', 'Bienvenida a la comunidad', 'subscription'],
  ['purchase', 'Gracias por tu compra', 'purchase'],
  ['review', 'Pide tu reseña', 'delivered'],
  ['blank', 'Desde cero', 'subscription'],
];
const text = (value, size) => typeof value === 'string' ? value.slice(0, size) : '';
export function https(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}
export function emptyMail(id) {
  return { id, kind: 'mail', name: 'Correo', template: { subject: '', preheader: '', blocks: [{ kind: 'text', text: '', color: '#1c1a17', align: 'left', font: 'Arial', space: 16 }] } };
}
export function starter(kind, id, mailId) {
  const option = starterOptions.find(row => row[0] === kind) || starterOptions[3];
  const mail = emptyMail(mailId);
  if (kind !== 'blank') {
    mail.name = option[1];
    mail.template.subject = kind === 'welcome' ? 'Te damos la bienvenida a Life Deco Art' : option[1];
    mail.template.blocks[0].text = { welcome: 'Gracias por unirte a nuestra comunidad.',
      purchase: 'Gracias por tu compra en Life Deco Art.', review: 'Nos gustaría conocer tu experiencia con tu pedido.' }[kind];
  }
  return { id, name: kind === 'blank' ? 'Nueva automatización' : option[1], trigger: option[2],
    origins: ['community', 'footer'], inactiveDays: 60, steps: [mail], stage: 1, selectedMail: mailId };
}
export function normalizeFlow(input) {
  if (!input || typeof input !== 'object') throw Error('Revisa la automatización.');
  if (JSON.stringify(input).length > 500000) throw Error('El contenido de esta automatización es demasiado grande.');
  if (!Array.isArray(input.steps) || input.steps.length > 30) throw Error('La secuencia admite hasta 30 pasos.');
  const ids = new Set();
  const steps = input.steps.map(step => {
    const id = text(step?.id, 80);
    if (!/^[\w-]{1,80}$/.test(id) || ids.has(id)) throw Error('Cada paso debe tener un identificador único.');
    ids.add(id);
    if (step.kind === 'wait') {
      const duration = Number(step.duration);
      if (!Number.isInteger(duration) || duration < 1 || duration > 365 || !['minutes','hours','days'].includes(step.unit)) throw Error('Revisa la duración de la espera.');
      return { id, kind: 'wait', duration, unit: step.unit };
    }
    if (step.kind !== 'mail' || !Array.isArray(step.template?.blocks) || step.template.blocks.length > 30) throw Error('Revisa los pasos de correo.');
    const blocks = step.template.blocks.map(block => {
      if (!['text','image','button','divider','columns'].includes(block.kind)) throw Error('Tipo de bloque no válido.');
      return { kind: block.kind, text: text(block.text, 3000), secondary: text(block.secondary, 3000), url: text(block.url, 1200),
        alt: text(block.alt, 150), color: /^#[a-f0-9]{6}$/i.test(block.color) ? block.color : '#1c1a17',
        align: ['center','right'].includes(block.align) ? block.align : 'left',
        font: ['Arial','Arial, sans-serif','Montserrat','Montserrat, Arial, sans-serif'].includes(block.font) ? block.font : 'Arial',
        space: [8,16,24,32].includes(Number(block.space)) ? Number(block.space) : 16 };
    });
    return { id, kind: 'mail', name: text(step.name, 100), template: {
      subject: text(step.template.subject, 150), preheader: text(step.template.preheader, 150), blocks,
      headingFont: 'Montserrat', brandColors: step.template.brandColors === true,
    } };
  });
  if (!triggerOptions.some(([key]) => key === input.trigger)) throw Error('Selecciona un disparador válido.');
  const stage = Number(input.stage);
  return { name: text(input.name, 100), trigger: input.trigger,
    origins: ['community','footer'].filter(source => input.origins?.includes(source)),
    inactiveDays: Math.max(1, Math.min(730, Math.round(Number(input.inactiveDays) || 60))), steps,
    stage: Number.isInteger(stage) && stage >= 0 && stage <= 4 ? stage : 1,
    selectedMail: steps.some(step => step.kind === 'mail' && step.id === input.selectedMail) ? input.selectedMail : steps.find(step => step.kind === 'mail')?.id || '' };
}
export function flowChecks(flow) {
  const mails = flow.steps.filter(step => step.kind === 'mail');
  return [
    { key: 'name', ok: !!flow.name.trim(), label: 'Nombre de la automatización', stage: 1 },
    { key: 'origin', ok: flow.trigger !== 'subscription' || flow.origins.length > 0, label: 'Disparador y orígenes seleccionados', stage: 1 },
    { key: 'mail', ok: mails.length > 0, label: 'Al menos un correo en la secuencia', stage: 2 },
    { key: 'subject', ok: mails.length > 0 && mails.every(mail => mail.template.subject.trim() && !/[\r\n]/.test(mail.template.subject)), label: 'Asunto en cada correo', stage: 3 },
    { key: 'preheader', ok: mails.every(mail => mail.template.preheader.trim()), warning: true, label: 'Texto de vista previa en cada correo', stage: 3 },
    { key: 'blocks', ok: mails.every(mail => mail.template.blocks.length && mail.template.blocks.some(block => block.kind === 'image' || block.text?.trim())),
      label: 'Contenido en cada correo', stage: 3 },
    { key: 'links', ok: mails.every(mail => mail.template.blocks.every(block => !['image','button'].includes(block.kind) || !!https(block.url))), label: 'Botones e imágenes con enlaces HTTPS válidos', stage: 3 },
    { key: 'unsubscribe', ok: true, label: 'Enlace de cancelar suscripción incluido automáticamente', stage: 4 },
  ];
}
export function waitMilliseconds(step) {
  return step.duration * { minutes: 60000, hours: 3600000, days: 86400000 }[step.unit];
}
export function mailTiming(steps, index) {
  let minutes = 0, previous = index - 1;
  while (previous >= 0 && steps[previous].kind === 'wait') {
    minutes += waitMilliseconds(steps[previous]) / 60000;
    previous--;
  }
  if (!minutes) return previous < 0 ? 'Al instante' : 'Sin espera adicional';
  const unit = minutes % 1440 === 0 ? 'día' : minutes % 60 === 0 ? 'hora' : 'minuto';
  const duration = minutes / (unit === 'día' ? 1440 : unit === 'hora' ? 60 : 1);
  return `Después de ${duration} ${unit}${duration === 1 ? '' : 's'}`;
}
export function sequenceLabel(flow) {
  return flow.steps.map(step => step.kind === 'wait' ? `Espera ${step.duration} ${{minutes:'min',hours:'h',days:'días'}[step.unit]}` : step.name || 'Correo').join(' → ');
}
