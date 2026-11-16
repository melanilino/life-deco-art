const sourceLabel = { footer: 'Footer', community: 'Comunidad' };
const jobLabel = { queued: 'En cola', sending: 'Enviando', sent: 'Aceptado por Gmail', retry: 'Reintento pendiente',
  review: 'Por revisar', failed: 'Falló', inactive: 'Sin envío', cancelled: 'Cancelado' };
const blockLabels = { text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Separador', columns: 'Columnas' };
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

export function marketingPage(view) {
  const contacts = view === 'marketing' ? `<div class="mkt-contact-controls">
    <div class="mkt-tabs" role="group" aria-label="Estado de suscripción">
      <button type="button" data-status="" aria-pressed="true">Todos</button>
      <button type="button" data-status="active" aria-pressed="false">Activos</button>
      <button type="button" data-status="cancelled" aria-pressed="false">Bajas</button>
    </div>
    <div class="mkt-filters">
      <input type="search" aria-label="Buscar suscriptor" placeholder="Buscar por nombre o correo">
      <select name="source" aria-label="Origen"><option value="">Todos los orígenes</option>${options(Object.entries(sourceLabel))}</select>
    </div></div><dialog class="mkt-contact-dialog" aria-labelledby="mkt-contact-title"></dialog>` : '';
  return `<link rel="stylesheet" href="/panel/marketing.css?v=20261116-editor">
    <section id="marketing-view"${view === 'marketing' ? ' class="mkt-contacts"' : ''}>${contacts}
    <p class="mkt-feedback" role="status" hidden></p><div data-marketing-result></div></section>`;
}

export function bindMarketing(view, user) {
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
  if (view === 'marketing') bindContacts(root, result, request, report);
  else bindWelcome(result, request, report);
}

function bindContacts(root, result, request, report) {
  const search = root.querySelector('[type=search]');
  const source = root.querySelector('[name=source]');
  const dialog = root.querySelector('dialog');
  const rows = [];
  let status = '', next = '', loading = false;
  const origins = row => [...new Set(row.consents.map(entry => sourceLabel[entry.source]).filter(Boolean))];

  function show() {
    const query = normalize(search.value.trim());
    const filtered = rows.filter(row => (!status || row.status === status)
      && (!source.value || row.consents.some(entry => entry.source === source.value))
      && normalize(`${nameOf(row)} ${row.email}`).includes(query));
    result.innerHTML = `<div class="mkt-table-scroll"><table class="mkt-table">
      <thead><tr><th scope="col">Suscriptor</th><th scope="col">Estado</th><th scope="col">Origen</th><th scope="col">Registro</th><th scope="col">Bienvenida</th></tr></thead>
      <tbody>${filtered.map(row => `<tr>
        <td><button class="mkt-contact-name" type="button" data-contact="${rows.indexOf(row)}">${escape(nameOf(row) || row.email)}</button>
        ${nameOf(row) ? `<span class="mkt-email">${escape(row.email)}</span>` : ''}</td>
        <td>${statusBadge(stateLabel(row.status === 'active'), row.status === 'active')}</td>
        <td>${escape(origins(row).join(' · ') || sourceLabel[row.firstSource] || '—')}</td>
        <td>${escape(format(row.createdAt))}</td><td>${escape(jobLabel[row.welcome.status] || '—')}</td></tr>`).join('')
        || `<tr><td colspan="5" class="mkt-table-empty">${rows.length ? 'No hay coincidencias con estos filtros.' : 'Los registros del footer y Comunidad aparecerán aquí.'}</td></tr>`}</tbody>
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

  root.querySelector('.mkt-tabs').addEventListener('click', event => {
    const tab = event.target.closest('[data-status]');
    if (!tab) return;
    status = tab.dataset.status;
    for (const button of root.querySelectorAll('[data-status]')) button.setAttribute('aria-pressed', button === tab);
    if (result.querySelector('table')) show();
  });
  search.addEventListener('input', () => { if (result.querySelector('table')) show(); });
  source.addEventListener('change', () => { if (result.querySelector('table')) show(); });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close-contact]')) dialog.close();
  });
  result.addEventListener('click', event => {
    if (event.target.closest('[data-more]')) { load(); return; }
    const button = event.target.closest('[data-contact]');
    if (!button) return;
    const row = rows[Number(button.dataset.contact)];
    dialog.innerHTML = `<header><button type="button" data-close-contact>Cerrar</button></header>
      <h2 id="mkt-contact-title">${escape(nameOf(row) || row.email)}</h2>
      ${nameOf(row) ? `<p class="mkt-email">${escape(row.email)}</p>` : ''}
      <dl class="mkt-contact-data"><div><dt>Estado</dt><dd>${statusBadge(stateLabel(row.status === 'active'), row.status === 'active')}</dd></div>
      <div><dt>Origen inicial</dt><dd>${escape(sourceLabel[row.firstSource] || '—')}</dd></div>
      <div><dt>Fecha de registro</dt><dd>${escape(format(row.createdAt))}</dd></div>
      <div><dt>Bienvenida</dt><dd>${escape(jobLabel[row.welcome.status] || '—')}${row.welcome.reason ? `<small>${escape(row.welcome.reason)}</small>` : ''}</dd></div>
      ${row.cancelledAt ? `<div><dt>Fecha de baja</dt><dd>${escape(format(row.cancelledAt))}</dd></div>` : ''}</dl>
      <h3>Consentimientos</h3><ul class="mkt-consents">${row.consents.map(entry => `<li><strong>${escape(sourceLabel[entry.source] || entry.source)}</strong>
      <span>${escape(format(entry.acceptedAt))}</span><small>${escape(entry.version)}</small></li>`).join('')}</ul>`;
    dialog.showModal();
  });
  load();
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
