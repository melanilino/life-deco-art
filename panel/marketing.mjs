const sourceLabel = { footer: 'Footer', community: 'Comunidad' };
const consentLabel = { 'community-email-v1': 'Casilla de suscripción', 'community-email-v2': 'Botón para unirse' };
const jobLabel = { queued: 'En cola', sending: 'Enviando', sent: 'Aceptado por Gmail', retry: 'Reintento pendiente',
  review: 'Por revisar', failed: 'Falló', inactive: 'Sin envío', cancelled: 'Cancelado' };
const blockLabels = { text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Separador', columns: 'Columnas' };
const subscriberMetrics = [
  ['people', 'Total', 'total', 'Contactos registrados'],
  ['check', 'Activos', 'active', 'Suscripciones vigentes'],
  ['doc', 'Cancelados', 'cancelled', 'Contactos que se dieron de baja'],
  ['calendar', 'Nuevos este mes', 'newThisMonth', 'Primeras suscripciones del mes'],
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const format = date => date ? new Date(date).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const normalize = value => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const nameOf = row => [row.name, row.surname].filter(Boolean).join(' ');
const options = (values, selected) => values.map(([value, label]) =>
  `<option value="${escape(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escape(label)}</option>`).join('');
const stateLabel = active => active ? 'Activa' : 'Cancelada';
const statusBadge = (label, active = false) => `<span class="mkt-status${active ? ' is-active' : ''}">${label}</span>`;
const control = (label, field, value, type = 'text') => `<label>${label}<input type="${type}" data-field="${field}" value="${escape(value)}"></label>`;
const area = (label, field, value) => `<label>${label}<textarea data-field="${field}" rows="4">${escape(value)}</textarea></label>`;
const select = (label, field, values, value) => `<label>${label}<select data-field="${field}">${options(values, value)}</select></label>`;

export function marketingView(view) {
  return {
    marketing: ['Suscriptores', 'Consulta los contactos y sus preferencias de suscripción.'],
    'marketing-automation': ['Automatizaciones', 'Gestiona el correo que reciben los nuevos suscriptores.'],
  }[view];
}

export function marketingPage(view, icon) {
  const contacts = view === 'marketing' ? `<section class="sales-metrics" aria-label="Resumen de suscriptores">
    ${subscriberMetrics.map(([symbol, title, key, description]) => `<article class="sales-metric">
      <span>${icon(symbol)}</span><div><small>${title}</small><strong data-metric="${key}">—</strong><p>${description}</p></div></article>`).join('')}
    </section><section class="sales-panel mkt-contacts" aria-label="Listado de suscriptores">
    <div class="mkt-filters">
      <label class="sales-search">${icon('search')}<input type="search" aria-label="Buscar por suscriptor o correo electrónico" placeholder="Buscar por suscriptor o correo"></label>
      <select name="source" aria-label="Origen"><option value="">Todos los orígenes</option>${options(Object.entries(sourceLabel))}</select>
      <select name="status" aria-label="Estado"><option value="">Todos los estados</option><option value="active">Activos</option><option value="cancelled">Cancelados</option></select>
    </div><dialog class="mkt-contact-dialog" aria-labelledby="mkt-contact-title"></dialog>` : '';
  return `<link rel="stylesheet" href="/panel/marketing.css?v=20261117-subscriber-panel">
    <section id="marketing-view">${contacts}
    <p class="mkt-feedback" role="status" hidden></p><div data-marketing-result></div>${contacts ? '</section>' : ''}</section>`;
}

export function bindMarketing(view, user, ask) {
  const root = document.querySelector('#marketing-view');
  if (!root) return;
  const result = root.querySelector('[data-marketing-result]');
  const feedback = root.querySelector('[role=status]');
  async function request(action, body, page = '') {
    const token = await user.getIdToken();
    const params = new URLSearchParams({ action });
    if (page) params.set('page', page);
    const response = await fetch(`/api/marketing?${params}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  }
  function report(message, error = false) {
    feedback.textContent = message;
    feedback.hidden = !message;
    feedback.classList.toggle('is-error', error);
  }
  if (view === 'marketing') bindContacts(root, result, request, report, ask);
  else bindWelcome(result, request, report);
}

function bindContacts(root, result, request, report, ask) {
  const search = root.querySelector('[type=search]');
  const source = root.querySelector('[name=source]');
  const status = root.querySelector('[name=status]');
  const dialog = root.querySelector('dialog');
  const rows = [];
  let next = '', loading = false;
  let contactIndex = -1, saving = false, summaryRequest = 0;
  const origins = row => [...new Set(row.consents.map(entry => sourceLabel[entry.source]).filter(Boolean))];

  function show() {
    const query = normalize(search.value.trim());
    const filtered = rows.filter(row => (!status.value || row.status === status.value)
      && (!source.value || row.consents.some(entry => entry.source === source.value))
      && normalize(`${nameOf(row)} ${row.email}`).includes(query));
    result.innerHTML = `<div class="sales-table-wrap mkt-table-scroll"><table class="sales-table mkt-table">
      <thead><tr><th scope="col">Suscriptor</th><th scope="col">Correo electrónico</th><th scope="col">Origen</th><th scope="col">Registro</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
      <tbody>${filtered.map(row => `<tr>
        <td>${escape(nameOf(row) || '—')}</td><td>${escape(row.email)}</td>
        <td>${escape(origins(row).join(' · ') || sourceLabel[row.firstSource] || '—')}</td>
        <td>${escape(format(row.createdAt))}</td><td>${statusBadge(stateLabel(row.status === 'active'), row.status === 'active')}</td>
        <td><button class="mkt-contact-actions" type="button" data-contact="${rows.indexOf(row)}" aria-haspopup="dialog" aria-label="Acciones de ${escape(nameOf(row) || row.email)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button></td></tr>`).join('')
        || `<tr><td colspan="6" class="mkt-table-empty">${rows.length ? 'No hay coincidencias con estos filtros.' : 'Todavía no hay suscriptores.'}</td></tr>`}</tbody>
      </table></div><div class="mkt-table-footer"><span>${filtered.length} ${filtered.length === 1 ? 'contacto visible' : 'contactos visibles'}</span>
      ${next ? '<button type="button" data-more>Cargar más</button>' : ''}</div>`;
  }

  async function load() {
    if (loading) return;
    loading = true;
    const more = result.querySelector('[data-more]');
    if (more) more.disabled = true;
    report('Cargando suscriptores…');
    try {
      const page = await request('subscribers', null, next);
      rows.push(...page.rows);
      next = page.next;
      show();
      report('');
    } catch (error) {
      report(error.message, true);
      if (more) more.disabled = false;
      else result.innerHTML = '<button class="mkt-reload" type="button" data-more>Volver a intentar</button>';
    } finally { loading = false; }
  }

  search.addEventListener('input', () => { if (result.querySelector('table')) show(); });
  source.addEventListener('change', () => { if (result.querySelector('table')) show(); });
  status.addEventListener('change', () => { if (result.querySelector('table')) show(); });
  const summaryError = document.createElement('p');
  summaryError.className = 'mkt-feedback is-error';
  summaryError.setAttribute('role', 'status');
  summaryError.hidden = true;
  summaryError.textContent = 'No se pudieron cargar los totales.';
  root.querySelector('.sales-metrics').after(summaryError);

  async function refreshSummary() {
    const current = ++summaryRequest;
    try {
      const summary = await request('subscriber-summary');
      if (current !== summaryRequest) return;
      for (const element of root.querySelectorAll('[data-metric]')) {
        element.textContent = new Intl.NumberFormat('es-DO').format(summary[element.dataset.metric]);
      }
      summaryError.hidden = true;
    } catch {
      if (current !== summaryRequest) return;
      for (const element of root.querySelectorAll('[data-metric]')) element.textContent = '—';
      summaryError.hidden = false;
    }
  }

  function renderContact() {
    const row = rows[contactIndex];
    const active = row.status === 'active';
    const cancellation = { hub: 'Desde el Hub', email: 'Desde el enlace de un correo' }[row.cancelledSource];
    dialog.innerHTML = `<header class="quick-notes-head mkt-contact-head">
      <div><h2 id="mkt-contact-title">Suscriptor</h2><p>${escape(row.email)}</p></div>
      <button type="button" data-close-contact aria-label="Cerrar ficha" autofocus>×</button></header>
      <div class="quick-notes-scroll mkt-contact-scroll">
        <form class="mkt-contact-card" data-contact-form aria-label="Datos del suscriptor">
          <div class="mkt-contact-fields"><label>Nombre<input name="name" autocomplete="off" maxlength="100" value="${escape(row.name)}"></label>
          <label>Apellido<input name="surname" autocomplete="off" maxlength="100" value="${escape(row.surname)}"></label></div>
          <div class="mkt-contact-save"><p role="status" data-contact-feedback></p><button type="submit" class="primary">Guardar cambios</button></div>
        </form>
        <section class="mkt-contact-card" aria-label="Historial"><h3>Historial</h3>
          <dl class="mkt-contact-data">
            <div><dt>Registro inicial</dt><dd>${escape(format(row.createdAt))}</dd></div>
            <div><dt>Bienvenida</dt><dd>${escape(jobLabel[row.welcome.status] || '—')}${row.welcome.reason ? `<small>${escape(row.welcome.reason)}</small>` : ''}</dd></div>
            ${row.cancelledAt ? `<div><dt>Última baja</dt><dd>${escape(format(row.cancelledAt))}${cancellation ? `<small>${cancellation}</small>` : ''}</dd></div>` : ''}
          </dl>
          ${row.consents.length ? `<h4>Consentimientos</h4><ul class="mkt-consents">${row.consents.map(entry => `<li><strong>${escape(sourceLabel[entry.source] || entry.source)}</strong>
          <span>${escape(format(entry.acceptedAt))}</span><small>${escape(consentLabel[entry.version] || entry.version)}</small></li>`).join('')}</ul>` : ''}
        </section>
      </div>
      <footer class="mkt-contact-footer">${statusBadge(stateLabel(active), active)}
        ${active ? '<button type="button" class="mkt-cancel-subscription" data-cancel-subscription>Dar de baja</button>' : ''}</footer>`;
  }

  async function updateContact(action, fields = {}) {
    if (saving) return;
    saving = true;
    const activeElement = document.activeElement;
    for (const button of dialog.querySelectorAll('button, input')) button.disabled = true;
    const feedback = dialog.querySelector('[data-contact-feedback]');
    feedback.textContent = 'Guardando…';
    feedback.classList.remove('is-error');
    try {
      const { row } = await request(action, { id: rows[contactIndex].id, ...fields });
      rows[contactIndex] = row;
      show();
      renderContact();
      const cancelled = action === 'subscriber-cancel';
      dialog.querySelector('[data-contact-feedback]').textContent = cancelled ? 'Suscripción cancelada.' : 'Cambios guardados.';
      dialog.querySelector(cancelled ? '[data-close-contact]' : '[type=submit]').focus();
      if (cancelled) refreshSummary();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add('is-error');
      for (const button of dialog.querySelectorAll('button, input')) button.disabled = false;
      activeElement?.focus();
    } finally { saving = false; }
  }

  dialog.addEventListener('submit', event => {
    if (!event.target.matches('[data-contact-form]')) return;
    event.preventDefault();
    event.stopPropagation();
    const data = new FormData(event.target);
    updateContact('subscriber-profile', { name: data.get('name'), surname: data.get('surname') });
  });
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    (result.querySelector(`[data-contact="${contactIndex}"]`) || search).focus({ preventScroll: true });
  });
  dialog.addEventListener('click', async event => {
    if (event.target.closest('[data-close-contact]')) dialog.close();
    if (!event.target.closest('[data-cancel-subscription]') || saving) return;
    if (await ask(`¿Dar de baja a ${rows[contactIndex].email}? Dejará de recibir correos de la comunidad.`)) {
      updateContact('subscriber-cancel');
    }
  });
  result.addEventListener('click', event => {
    if (event.target.closest('[data-more]')) { load(); return; }
    const button = event.target.closest('[data-contact]');
    if (!button) return;
    contactIndex = Number(button.dataset.contact);
    renderContact();
    dialog.showModal();
  });
  load();
  refreshSummary();
}

const safeColor = color => /^#[\da-f]{6}$/i.test(color || '') ? color : '#1c1a17';
const safeUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
};
const contentOf = (block, kind) => {
  const text = escape(block.text || blockLabels[kind]);
  if (kind === 'divider') return '<span class="mkt-divider"></span>';
  if (kind === 'image') {
    const url = safeUrl(block.url);
    return url ? `<img src="${escape(url)}" alt="${escape(block.alt)}" referrerpolicy="no-referrer">`
      : '<span class="mkt-image-empty">Agrega el enlace de la imagen</span>';
  }
  if (kind === 'button') return `<span class="mkt-email-button" style="background:${safeColor(block.color)}">${text}</span>`;
  if (kind === 'columns') return `<span class="mkt-columns"><span>${escape(block.text || 'Primera columna')}</span>
    <span>${escape(block.secondary || 'Segunda columna')}</span></span>`;
  return text;
};

function bindWelcome(result, request, report) {
  let settings, template, previous, copies = [], copiesNext = '';
  let editing = false, selected = 0, withName = false, mobile = false;
  let busy = false, dirty = false, dragIndex = null;
  const refreshCopies = async (page = '') => {
    const response = await request('templates', null, page);
    copies = page ? copies.concat(response.rows) : response.rows;
    copiesNext = response.next;
  };
  const greeting = () => withName ? 'Hola, Ana.' : '¡Hola!';

  function canvas() {
    const recipient = result.querySelector('[data-canvas]');
    recipient.classList.toggle('is-mobile', mobile);
    recipient.innerHTML = `<div class="mkt-email-intro">Life Deco Art<p>${greeting()}</p></div>
      ${template.blocks.map((block, index) => `<button type="button" data-select="${index}" draggable="true"
        aria-label="Editar ${blockLabels[block.kind]}, bloque ${index + 1}" aria-pressed="${index === selected}"
        class="mkt-block is-${block.kind}" style="color:${safeColor(block.color)};text-align:${['center','right'].includes(block.align) ? block.align : 'left'};
        font-family:${block.font?.startsWith('Georgia') ? 'Georgia, serif' : 'Arial, sans-serif'};margin-bottom:${[8,16,24,32].includes(Number(block.space)) ? Number(block.space) : 16}px">${contentOf(block, block.kind)}</button>`).join('')}
      <div class="mkt-email-footer">Cancelar suscripción</div>`;
  }

  function inspector() {
    const block = template.blocks[selected];
    result.querySelector('[data-inspector]').innerHTML = block ? `<h3>${blockLabels[block.kind]}</h3>
      <div class="mkt-fields">
      ${['text', 'button', 'columns'].includes(block.kind) ? area(block.kind === 'button' ? 'Texto del botón' : block.kind === 'columns' ? 'Primera columna' : 'Texto', 'text', block.text) : ''}
      ${block.kind === 'columns' ? area('Segunda columna', 'secondary', block.secondary) : ''}
      ${['image','button'].includes(block.kind) ? control('Enlace HTTPS', 'url', block.url, 'url') : ''}
      ${block.kind === 'image' ? control('Texto alternativo', 'alt', block.alt) : ''}
      ${['text','button','columns'].includes(block.kind) ? control('Color', 'color', safeColor(block.color), 'color') : ''}
      ${block.kind !== 'divider' ? select('Alineación', 'align', [['left','Izquierda'],['center','Centro'],['right','Derecha']], block.align || 'left') : ''}
      ${['text','columns'].includes(block.kind) ? select('Tipografía','font',[['Arial','Arial'],['Georgia','Georgia']],block.font?.startsWith('Georgia') ? 'Georgia' : 'Arial') : ''}
      ${select('Espacio inferior','space',[[8,'8 px'],[16,'16 px'],[24,'24 px'],[32,'32 px']],block.space || 16)}</div>
      <div class="mkt-block-actions"><button type="button" data-edit="up" ${selected === 0 ? 'disabled' : ''}>Subir</button>
      <button type="button" data-edit="down" ${selected === template.blocks.length - 1 ? 'disabled' : ''}>Bajar</button>
      <button type="button" data-edit="remove" ${template.blocks.length === 1 ? 'disabled' : ''}>Eliminar</button></div>`
      : '<h3>Ajustes del bloque</h3><p>Agrega un bloque para empezar.</p>';
  }

  function render() {
    if (!editing) {
      result.innerHTML = `<article class="mkt-overview"><header><div><h2>Bienvenida a la comunidad</h2>
        <p>${settings.published ? 'Plantilla publicada' : 'Plantilla por publicar'}${settings.mailReady ? '' : ' · Buzón pendiente de configurar'}</p></div>
        ${statusBadge(settings.enabled ? 'Activa' : 'Pausada', settings.enabled)}</header>
        <ol class="mkt-flow" aria-label="Flujo de bienvenida">
          <li><span class="mkt-flow-mark"></span><div><strong>Alta de suscripción</strong><p>Footer o Aprende → Comunidad</p></div></li>
          <li><span class="mkt-flow-mark"></span><div><strong>Correo de bienvenida</strong><p>${escape(template.subject)}</p></div><button type="button" class="primary" data-edit="open">Editar correo</button></li>
        </ol><footer><button type="button" data-request="toggle" ${!settings.enabled && (!settings.published || !settings.mailReady) ? 'disabled' : ''}>${settings.enabled ? 'Pausar bienvenida' : 'Activar bienvenida'}</button>
        ${settings.enabled ? '<button type="button" data-request="retry">Procesar envíos pendientes</button>' : ''}</footer></article>`;
      return;
    }
    result.innerHTML = `<section class="mkt-editor" aria-label="Editor del correo de bienvenida">
      <header class="mkt-editor-header"><button type="button" data-edit="back">Volver al flujo</button>
        <div class="mkt-editor-actions"><button type="button" data-request="test" ${settings.mailReady ? '' : 'disabled'}>Enviar prueba</button>
          <button type="button" data-request="draft">Guardar borrador</button><button type="button" class="primary" data-request="publish">Publicar plantilla</button></div></header>
      <label class="mkt-subject">Asunto<input maxlength="150" data-subject value="${escape(template.subject)}"></label>
      <div class="mkt-editor-grid">
        <aside class="mkt-palette"><h3>Agregar bloque</h3><div class="mkt-palette-actions">${Object.entries(blockLabels).map(([kind,label]) => `<button type="button" draggable="true" data-add="${kind}" ${template.blocks.length >= 30 ? 'disabled' : ''}>${label}</button>`).join('')}</div>
          <button type="button" data-edit="undo" ${previous ? '' : 'disabled'}>Deshacer cambio</button>
        </aside>
        <div class="mkt-stage"><div class="mkt-preview-tools"><div role="group" aria-label="Tamaño de vista previa">
          <button type="button" data-device="desktop" aria-pressed="${!mobile}">Escritorio</button>
          <button type="button" data-device="mobile" aria-pressed="${mobile}">Móvil</button></div>
          <label><input type="checkbox" data-sample-name ${withName ? 'checked' : ''}> Ejemplo con nombre</label></div>
          <div class="mkt-stage-scroll"><div class="mkt-email-paper" data-canvas></div></div>
          <div class="mkt-stage-footer"><button type="button" data-request="preview">Ver correo final</button></div>
        </div>
        <aside class="mkt-inspector" data-inspector aria-label="Ajustes del bloque"></aside>
      </div>
      <details class="mkt-templates"><summary>Plantillas guardadas</summary>
        <div class="mkt-template-tools"><label>Nombre de la copia<input maxlength="100" data-copy-name></label><button type="button" data-request="copy">Guardar copia</button>
        <label>Usar una plantilla<select data-copy-select><option value="">Selecciona una plantilla</option>
        ${options(copies.map((copy, index) => [index, copy.name]))}</select></label><button type="button" data-edit="reuse">Usar plantilla</button>
        ${copiesNext ? '<button type="button" data-request="template-page">Cargar más</button>' : ''}</div>
      </details>
      <dialog class="confirm-dialog mkt-preview-dialog" aria-label="Vista previa del correo"><header><button type="button" data-close-preview>Cerrar</button></header><div data-mail-frame></div></dialog>
      </section>`;
    canvas();
    inspector();
  }

  function changeSelection(index, focus = false) {
    selected = index;
    canvas();
    inspector();
    if (focus) result.querySelector(`[data-select="${selected}"]`)?.focus();
  }

  function editBlock(change) {
    previous = structuredClone(template);
    change();
    dirty = true;
    render();
  }

  function add(kind, index = template.blocks.length) {
    if (!Object.hasOwn(blockLabels, kind) || template.blocks.length >= 30) return;
    editBlock(() => {
      template.blocks.splice(index, 0, { kind, align: 'left' });
      selected = index;
    });
    result.querySelector('[data-inspector] textarea, [data-inspector] input, [data-inspector] select')?.focus();
  }

  function move(from, to) {
    if (!Number.isInteger(from) || from < 0 || from >= template.blocks.length || from === to || to < 0 || to >= template.blocks.length) return;
    editBlock(() => {
      const [block] = template.blocks.splice(from, 1);
      template.blocks.splice(to, 0, block);
      selected = to;
    });
    result.querySelector(`[data-select="${selected}"]`)?.focus();
  }

  function showPreview(html) {
    const dialog = result.querySelector('.mkt-preview-dialog');
    const frame = document.createElement('iframe');
    frame.title = 'Vista previa de la bienvenida';
    frame.setAttribute('sandbox', '');
    frame.classList.toggle('is-mobile', mobile);
    frame.srcdoc = html;
    dialog.querySelector('[data-mail-frame]').replaceChildren(frame);
    dialog.showModal();
  }

  async function load() {
    report('Cargando automatización…');
    try {
      settings = await request('settings');
      await refreshCopies();
      template = structuredClone(settings.draft);
      render();
      report('');
    } catch (error) {
      report(error.message, true);
      result.innerHTML = '<button type="button" data-edit="reload">Volver a intentar</button>';
    }
  }

  result.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-subject]')) { template.subject = target.value; dirty = true; }
    if (target.matches('[data-sample-name]')) { withName = target.checked; canvas(); }
    if (target.dataset.field && template.blocks[selected]) {
      template.blocks[selected][target.dataset.field] = target.value;
      dirty = true;
      canvas();
    }
  });
  result.addEventListener('dragstart', event => {
    if (busy) { event.preventDefault(); return; }
    const block = event.target.closest('[data-select]');
    const item = event.target.closest('[data-add]');
    if (!block && !item) return;
    dragIndex = block ? Number(block.dataset.select) : null;
    event.dataTransfer.setData('application/x-lda-block', item?.dataset.add || 'move');
    event.dataTransfer.effectAllowed = item ? 'copy' : 'move';
  });
  result.addEventListener('dragover', event => {
    if (event.target.closest('[data-canvas]') && event.dataTransfer.types.includes('application/x-lda-block')) event.preventDefault();
  });
  result.addEventListener('drop', event => {
    if (!event.target.closest('[data-canvas]')) return;
    const kind = event.dataTransfer.getData('application/x-lda-block');
    if (!kind) return;
    event.preventDefault();
    const block = event.target.closest('[data-select]');
    const index = block ? Number(block.dataset.select) : template.blocks.length;
    if (kind === 'move') move(dragIndex, Math.min(index, template.blocks.length - 1));
    else add(kind, index);
    dragIndex = null;
  });

  result.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || busy) return;
    if (button.hasAttribute('data-close-preview')) { button.closest('dialog').close(); return; }
    const { edit, request: action, device } = button.dataset;
    if (edit === 'reload') { load(); return; }
    if (button.hasAttribute('data-select')) { changeSelection(Number(button.dataset.select), true); return; }
    if (button.dataset.add) { add(button.dataset.add); return; }
    if (device) {
      mobile = device === 'mobile';
      for (const control of result.querySelectorAll('[data-device]')) control.setAttribute('aria-pressed', control === button);
      canvas();
      return;
    }
    if (edit === 'open' || edit === 'back') {
      editing = edit === 'open';
      render();
      result.querySelector(editing ? '[data-subject]' : '[data-edit="open"]')?.focus();
      report(!editing && dirty ? 'Hay cambios sin guardar en el correo.' : '');
      return;
    }
    if (edit === 'up' || edit === 'down') { move(selected, selected + (edit === 'up' ? -1 : 1)); return; }
    if (edit === 'remove') {
      editBlock(() => { template.blocks.splice(selected, 1); selected = Math.min(selected, template.blocks.length - 1); });
      result.querySelector(`[data-select="${selected}"]`)?.focus();
      return;
    }
    if (edit === 'undo') {
      template = previous; previous = null; selected = Math.min(selected, template.blocks.length - 1);
      dirty = true; render();
      result.querySelector(`[data-select="${selected}"]`)?.focus();
      return;
    }
    if (edit === 'reuse') {
      const chosen = result.querySelector('[data-copy-select]').value;
      if (chosen === '') { report('Selecciona una plantilla.', true); return; }
      editBlock(() => { template = structuredClone(copies[Number(chosen)].template); selected = 0; });
      report('Plantilla cargada en el editor.');
      return;
    }
    if (!action) return;
    if (action === 'toggle' && !settings.enabled && !window.confirm('¿Activar el correo de bienvenida para nuevas suscripciones?')) return;
    busy = true;
    button.disabled = true;
    const name = result.querySelector('[data-copy-name]')?.value;
    const snapshot = structuredClone(template);
    report('Procesando…');
    try {
      if (action === 'template-page') {
        await refreshCopies(copiesNext);
        render();
        result.querySelector('.mkt-templates').open = true;
      } else {
        const response = await request(action, action === 'toggle' ? { enabled: !settings.enabled } : { template: snapshot, name, withName });
        if (action === 'preview') showPreview(response.html);
        if (['draft','publish','toggle'].includes(action)) {
          settings = await request('settings');
          if (action !== 'toggle' && JSON.stringify(template) === JSON.stringify(snapshot)) dirty = false;
          if (action === 'toggle') render();
        }
        if (action === 'copy') {
          await refreshCopies();
          render();
          result.querySelector('.mkt-templates').open = true;
        }
      }
      report({ test:'Prueba aceptada por Gmail.', draft:'Borrador guardado.', publish:'Plantilla publicada.', toggle:'Automatización actualizada.',
        retry:'Envíos pendientes revisados.', copy:'Copia guardada.' }[action] || '');
    } catch (error) { report(error.message, true); }
    finally { busy = false; button.disabled = false; }
  });
  load();
}
