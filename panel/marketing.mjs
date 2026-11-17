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
    'marketing-automation': ['Automatizaciones', 'Gestiona los correos que se envían automáticamente.'],
    'marketing-brand': ['Marca', 'Toda la identidad visual de Life Deco Art en un solo lugar.'],
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
  return `<section id="marketing-view">${contacts}
    <p class="mkt-feedback" role="status" hidden></p><div data-marketing-result></div>${contacts ? '</section>' : ''}</section>`;
}

export function bindMarketing(view, user, ask, context) {
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
  else if (view === 'marketing-brand') bindBrand(result, report, user, context);
  else bindWelcome(result, request, report, ask, context);
}

function bindContacts(root, result, request, report, ask) {
  const search = root.querySelector('[type=search]');
  const source = root.querySelector('[name=source]');
  const status = root.querySelector('[name=status]');
  const dialog = root.querySelector('dialog');
  const rows = [];
  let next = '', loading = false;
  let contactIndex = -1, saving = false, summaryRequest = 0;
  let editingContact = false;
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
    dialog.innerHTML = `<header class="mkt-contact-head">
      <button type="button" data-close-contact aria-label="Cerrar ficha" autofocus><span aria-hidden="true">×</span></button></header>
      <div class="quick-notes-scroll mkt-contact-scroll">
        <div class="mkt-contact-identity">
          <h2 id="mkt-contact-title">${escape(nameOf(row) || 'Suscriptor')}</h2>
          <p>${escape(row.email)}</p>
        </div>
        ${editingContact ? `<form id="mkt-contact-form" aria-label="Datos del suscriptor">
          <div class="mkt-contact-fields"><label>Nombre<input name="name" autocomplete="off" maxlength="100" value="${escape(row.name)}"></label>
          <label>Apellido<input name="surname" autocomplete="off" maxlength="100" value="${escape(row.surname)}"></label></div>
        </form>` : ''}
        <section aria-label="Historial">
          <dl class="mkt-contact-data">
            <div><dt>Estado</dt><dd>${statusBadge(stateLabel(active), active)}</dd></div>
            <div><dt>Origen inicial</dt><dd>${escape(sourceLabel[row.firstSource] || '—')}</dd></div>
            <div><dt>Fecha de registro</dt><dd>${escape(format(row.createdAt))}</dd></div>
            <div><dt>Bienvenida</dt><dd>${escape(jobLabel[row.welcome.status] || '—')}${row.welcome.reason ? `<small>${escape(row.welcome.reason)}</small>` : ''}</dd></div>
            ${row.cancelledAt ? `<div><dt>Última baja</dt><dd>${escape(format(row.cancelledAt))}${cancellation ? `<small>${cancellation}</small>` : ''}</dd></div>` : ''}
          </dl>
          ${row.consents.length ? `<h3>Consentimientos</h3><ul class="mkt-consents">${row.consents.map(entry => `<li><strong>${escape(sourceLabel[entry.source] || entry.source)}</strong>
          <span>${escape(format(entry.acceptedAt))}</span><small>${escape(consentLabel[entry.version] || entry.version)}</small></li>`).join('')}</ul>` : ''}
        </section>
      </div>
      <footer class="mkt-contact-footer">
        <p role="status" data-contact-feedback></p>
        <div class="mkt-contact-buttons">${editingContact
          ? '<button type="button" data-form-action="secondary" data-discard-contact>Cancelar</button><button type="submit" class="primary" data-form-action="primary" form="mkt-contact-form" disabled>Guardar cambios</button>'
          : `${active ? '<button type="button" data-form-action="secondary" data-cancel-subscription>Dar de baja</button>' : ''}<button type="button" class="primary" data-form-action="primary" data-edit-contact>Editar</button>`}</div>
      </footer>`;
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
      editingContact = false;
      show();
      renderContact();
      const cancelled = action === 'subscriber-cancel';
      dialog.querySelector('[data-contact-feedback]').textContent = cancelled ? 'Suscripción cancelada.' : 'Cambios guardados.';
      dialog.querySelector(cancelled ? '[data-close-contact]' : '[data-edit-contact]').focus();
      if (cancelled) refreshSummary();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add('is-error');
      for (const button of dialog.querySelectorAll('button, input')) button.disabled = false;
      activeElement?.focus();
    } finally { saving = false; }
  }

  dialog.addEventListener('input', event => {
    const form = event.target.closest('#mkt-contact-form');
    if (!form) return;
    const data = new FormData(form);
    const row = rows[contactIndex];
    dialog.querySelector('[type=submit]').disabled = ['name', 'surname'].every(
      field => data.get(field).trim() === (row[field] || '').trim()
    );
  });
  dialog.addEventListener('submit', event => {
    if (!event.target.matches('#mkt-contact-form')) return;
    event.preventDefault();
    event.stopPropagation();
    if (dialog.querySelector('[type=submit]').disabled) return;
    const data = new FormData(event.target);
    updateContact('subscriber-profile', { name: data.get('name'), surname: data.get('surname') });
  });
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    (result.querySelector(`[data-contact="${contactIndex}"]`) || search).focus({ preventScroll: true });
  });
  dialog.addEventListener('click', async event => {
    if (event.target.closest('[data-close-contact]')) dialog.close();
    if (event.target.closest('[data-edit-contact], [data-discard-contact]')) {
      editingContact = Boolean(event.target.closest('[data-edit-contact]'));
      renderContact();
      dialog.querySelector(editingContact ? 'input[name="name"]' : '[data-edit-contact]').focus();
    }
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
    editingContact = false;
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
const welcomeName = 'Bienvenida a la comunidad';
const emailFonts = [['Arial','Arial'], ['Georgia','Georgia']];
function bindBrand(result, report, user, { getState, execute, store, download, icon, assetUrl }) {
  let busy = false;
  let files = [];
  const previews = new Map();
  function readFile(file) {
    if (!previews.has(file.path)) {
      const pending = user.getIdToken().then(async token => {
        const query = new URLSearchParams({ file: file.path.split('/').at(-1) });
        const response = await fetch(`/api/brand-file?${query}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw Error('No se pudo abrir el archivo.');
        return response.blob();
      }).catch(error => { previews.delete(file.path); throw error; });
      previews.set(file.path, pending);
    }
    return previews.get(file.path);
  }
  const getBrand = () => getState().settings.marketingBrand || {};
  const upload = (role, label, accept, accessibleName = label) => `<button type="button" class="mkt-soft-button" data-brand-upload="${role}" aria-label="${accessibleName}">${label}</button>
    <input hidden type="file" data-brand-file="${role}" accept="${accept}">`;
  const card = (title, symbol, html, action = '') => `<section class="mkt-brand-card"><header><span class="mkt-round">${symbol}</span><h2>${title}</h2>${action ? `<div class="mkt-brand-tools">${action}</div>` : ''}</header>${html}</section>`;
  const removeButton = (kind, value, label) => `<button type="button" class="mkt-brand-remove" data-brand-remove="${kind}" data-brand-value="${escape(value)}" aria-label="${escape(label)}" title="${escape(label)}"><span aria-hidden="true">×</span></button>`;
  const asset = (file, image = false) => {
    const index = files.indexOf(file);
    const name = file.fileName || file.name;
    const action = (kind, label, symbol) => `<button type="button" class="mkt-brand-icon" data-brand-${kind}="${index}" title="${escape(label)}" aria-label="${escape(label)}">${icon(symbol)}</button>`;
    return `<div class="mkt-brand-item${image ? ' mkt-logo-item' : ''}">
      <button type="button" class="mkt-brand-asset" data-brand-preview="${index}" aria-label="Ver ${escape(name)}">
        ${image ? `<img alt="" data-brand-image="${index}" hidden><span data-brand-image-fallback>${escape(name)}</span>` : `${icon('doc')}<span>${escape(name)}</span>`}</button>
      <div class="mkt-brand-item-actions">${image ? '' : action('preview', `Vista previa de ${name}`, 'eye')}
        ${action('download', `Descargar ${name}`, 'download')}${removeButton('file', file.id, `Eliminar ${name}`)}</div></div>`;
  };
  const fontRow = (key, label, value) => `<div><dt>${label}</dt><dd><span>${escape(value || 'Sin configurar')}</span>${value ? removeButton('font', key, `Quitar tipografía de ${label.toLowerCase()}`) : ''}</dd></div>`;
  function render() {
    const brand = getBrand();
    const colors = brand.colors || [];
    const manual = safeUrl(brand.manual);
    files = Object.values(getState().records)
      .filter(record => record.kind === 'resources' && record.brandAsset && !record.archived && record.path)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const logo = files.find(file => file.brandAsset === 'primary');
    const variants = files.filter(file => file !== logo && ['primary', 'variant'].includes(file.brandAsset));
    const manuals = files.filter(file => file.brandAsset === 'manual');
    const palettes = colors.map((color, i) =>
      `<div class="mkt-swatch-item"><button type="button" class="mkt-swatch" data-brand-color="${i}" aria-label="Editar color ${escape(color)}"><span style="background:${safeColor(color)}"></span>${escape(color)}</button>
      ${removeButton('color', color, `Eliminar color ${color}`)}</div>`).join('');
    const images = 'image/png,image/jpeg,image/webp,image/gif';
    result.innerHTML = `<div class="mkt-brand-grid">
      ${card('Colores', icon('drop'), colors.length ? `<div class="mkt-swatches">${palettes}</div>`
        : '<p class="mkt-muted">Todavía no hay colores guardados.</p>',
        `<button type="button" class="mkt-soft-button" data-brand-color="new">${icon('plus')} Agregar color</button>`)}
      ${card('Tipografías', '<span aria-hidden="true">Aa</span>',
        `<dl class="mkt-font-list">${fontRow('headingFont', 'Títulos', brand.headingFont)}${fontRow('bodyFont', 'Texto', brand.bodyFont)}</dl>`,
        `<button type="button" class="mkt-soft-button" data-brand-edit="fonts">${icon('plus')} ${brand.headingFont || brand.bodyFont ? 'Editar tipografías' : 'Agregar tipografía'}</button>`)}
      ${card('Logotipos', icon('image'), `<div class="mkt-brand-logos"><div><h3>Logo principal</h3>
        ${logo ? asset(logo, true) : `<div class="mkt-upload-box">${upload('primary', 'Subir', images, 'Subir logo principal')}</div>`}</div>
        <div><h3>Versiones adicionales</h3><div class="mkt-brand-variants">${variants.map(file => asset(file, true)).join('')}
        <div class="mkt-upload-box">${upload('variant', 'Subir', images, 'Subir versión adicional')}</div></div></div></div>`)}
      ${card('Documentos', icon('doc'), `${manuals.length || manual ? '' : '<p class="mkt-muted">Adjunta un documento o añade un enlace</p>'}
        ${manuals.map(file => asset(file)).join('')}${manual ? `<div class="mkt-brand-item"><a class="mkt-brand-link" href="${escape(manual)}" title="Abrir enlace" target="_blank" rel="noopener noreferrer">${icon('link')} ${escape(new URL(manual).hostname)}</a>${removeButton('link', '', 'Eliminar enlace')}</div>` : ''}`,
        `${upload('manual', 'Adjuntar archivo', 'application/pdf')}
        <button type="button" class="mkt-brand-link-button" data-brand-edit="manual" aria-label="${manual ? 'Editar enlace' : 'Añadir enlace'}" title="${manual ? 'Editar enlace' : 'Añadir enlace'}">${icon('link')}</button>`)}
      </div><p class="mkt-brand-note">Usa los estilos de Marca al diseñar tus correos.</p>
      <dialog class="confirm-dialog mkt-brand-dialog" aria-labelledby="mkt-brand-dialog-title"></dialog>
      <dialog class="confirm-dialog mkt-brand-preview" aria-labelledby="mkt-brand-preview-title">
        <header><h2 id="mkt-brand-preview-title"></h2><button type="button" class="mkt-brand-remove" data-brand-close aria-label="Cerrar vista previa">×</button></header>
        <div data-brand-preview-body></div>
      </dialog>`;
    for (const img of result.querySelectorAll('[data-brand-image]')) {
      readFile(files[Number(img.dataset.brandImage)]).then(blob => {
        if (!img.isConnected) return;
        img.addEventListener('load', () => { img.hidden = false; img.nextElementSibling.hidden = true; }, { once: true });
        img.src = assetUrl(blob);
      }).catch(() => {});
    }
  }
  async function showFile(file) {
    const dialog = result.querySelector('.mkt-brand-preview');
    const body = dialog.querySelector('[data-brand-preview-body]');
    const name = file.fileName || file.name;
    dialog.querySelector('h2').textContent = name;
    body.textContent = 'Cargando vista previa…';
    dialog.showModal();
    try {
      const blob = await readFile(file);
      if (!dialog.open || !dialog.isConnected) return;
      const preview = document.createElement(blob.type === 'application/pdf' ? 'iframe' : 'img');
      preview.title = name;
      if (preview.tagName === 'IMG') preview.alt = name;
      preview.src = assetUrl(blob);
      body.replaceChildren(preview);
    } catch (error) { body.textContent = error.message; }
  }
  function open(key, index) {
    const brand = getBrand();
    const dialog = result.querySelector('dialog');
    const titles = { color: index === 'new' ? 'Agregar color' : 'Editar color', fonts: 'Tipografías', manual: 'Enlace del documento' };
    const fields = {
      color: `<label>Código hexadecimal<input name="color" maxlength="7" pattern="#[0-9A-Fa-f]{6}" placeholder="#RRGGBB" value="${escape(brand.colors?.[index])}" required></label>`,
      fonts: [['headingFont','Títulos'],['bodyFont','Texto']].map(([name,label]) =>
        `<label>${label}<select name="${name}">${options([['','Sin configurar'], ...emailFonts], brand[name] || '')}</select></label>`).join(''),
      manual: `<label>Enlace HTTPS<input type="url" name="manual" maxlength="1200" value="${escape(brand.manual)}" required></label>`,
    };
    dialog.innerHTML = `<form data-brand-form="${key}" data-index="${escape(index)}"><h2 id="mkt-brand-dialog-title">${titles[key]}</h2>
      <div class="mkt-fields">${fields[key]}</div><p role="status" data-brand-status></p><footer class="mkt-brand-actions">
        <button type="button" data-brand-close data-form-action="secondary">Cancelar</button>
        <button type="submit" data-form-action="primary">Guardar</button></footer></form>`;
    dialog.showModal();
  }
  result.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || busy) return;
    const { brandColor, brandEdit, brandUpload, brandDownload, brandPreview } = button.dataset;
    if (button.hasAttribute('data-brand-remove')) { await removeItem(button); return; }
    if (button.hasAttribute('data-brand-close')) button.closest('dialog').close();
    if (brandColor !== undefined) open('color', brandColor);
    if (brandEdit) open(brandEdit);
    if (brandUpload) result.querySelector(`[data-brand-file="${brandUpload}"]`).click();
    if (brandPreview !== undefined) { await showFile(files[Number(brandPreview)]); return; }
    if (brandDownload !== undefined) {
      const file = files[Number(brandDownload)];
      try { download(await readFile(file), file.fileName || file.name); }
      catch { report('No se pudo descargar el archivo.', true); }
    }
  });
  result.addEventListener('change', async event => {
    const { brandFile } = event.target.dataset;
    const file = event.target.files?.[0];
    if (!brandFile || !file || busy) return;
    if (brandFile === 'manual' ? file.type !== 'application/pdf' : !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      event.target.value = '';
      report(brandFile === 'manual' ? 'Selecciona un archivo PDF.' : 'Selecciona una imagen PNG, JPG, WebP o GIF.', true);
      return;
    }
    busy = true;
    report('');
    try {
      const attachment = await store.upload(file);
      await execute({ action: 'save', kind: 'resources', data: { ...attachment, name: attachment.fileName, brandAsset: brandFile, visibility: 'interno' } });
      render();
    } catch (error) { event.target.value = ''; report(error.message, true); }
    finally { busy = false; }
  });
  async function removeItem(button) {
    const { brandRemove: kind, brandValue: value } = button.dataset;
    const previousColors = getBrand().colors || [];
    const data = {
      color: { colors: previousColors.filter(color => color !== value), previousColors },
      font: { [value]: '' },
      link: { manual: '' },
    }[kind];
    const role = files.find(file => file.id === value)?.brandAsset;
    const target = { color: '[data-brand-color="new"]', font: '[data-brand-edit="fonts"]', link: '[data-brand-edit="manual"]',
      file: `[data-brand-upload="${role}"]` }[kind];
    busy = true;
    button.disabled = true;
    report('');
    try {
      if (kind === 'file') await execute({ action: 'remove-brand-asset', id: value });
      else await execute({ action: 'marketing-brand', data });
      render();
      result.querySelector(target)?.focus();
    } catch (error) { report(error.message, true); }
    finally { busy = false; button.disabled = false; }
  }
  async function saveBrand(form) {
    const values = Object.fromEntries(new FormData(form));
    let patch = values;
    const status = form.querySelector('[data-brand-status]');
    if (form.dataset.brandForm === 'color') {
      const previousColors = getBrand().colors || [];
      const colors = [...previousColors];
      colors[form.dataset.index === 'new' ? colors.length : Number(form.dataset.index)] = values.color.toUpperCase();
      patch = { colors, previousColors };
    }
    if ('manual' in patch && !safeUrl(patch.manual)) { status.textContent = 'Escribe un enlace HTTPS válido.'; return; }
    busy = true;
    const buttons = form.querySelectorAll('button');
    for (const button of buttons) button.disabled = true;
    report('');
    try {
      await execute({ action: 'marketing-brand', data: patch });
      form.closest('dialog').close();
      render();
      if (form.dataset.brandForm === 'color') result.querySelector('[data-brand-color="new"]')?.focus();
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; for (const button of buttons) button.disabled = false; }
  }
  result.addEventListener('submit', event => {
    if (!event.target.matches('[data-brand-form]')) return;
    event.preventDefault();
    event.stopPropagation();
    if (!busy) saveBrand(event.target);
  });
  render();
}
const contentOf = (block, kind, brandColors) => {
  const text = escape(block.text || blockLabels[kind]);
  if (kind === 'divider') return '<span class="mkt-divider"></span>';
  if (kind === 'image') {
    const url = safeUrl(block.url);
    return url ? `<img src="${escape(url)}" alt="${escape(block.alt)}" referrerpolicy="no-referrer">`
      : '<span class="mkt-image-empty">Agrega el enlace de la imagen</span>';
  }
  if (kind === 'button') {
    const color = safeColor(block.color);
    const light = color.slice(1).match(/.{2}/g).map(pair => parseInt(pair, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const ink = brandColors && .2126 * light[0] + .7152 * light[1] + .0722 * light[2] > .179 ? '#000' : '#fff';
    return `<span class="mkt-email-button" style="background:${color};color:${ink}">${text}</span>`;
  }
  if (kind === 'columns') return `<span class="mkt-columns"><span>${escape(block.text || 'Primera columna')}</span>
    <span>${escape(block.secondary || 'Segunda columna')}</span></span>`;
  return text;
};

function bindWelcome(result, request, report, ask, { icon, getState }) {
  let settings, template, previous, copies = [], copiesNext = '';
  let metrics, newEditor = false, editorTab = 'content';
  let query = '', filter = '';
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
    recipient.innerHTML = `<div class="mkt-email-intro"><span class="mkt-email-title"${template.headingFont === 'Georgia' ? ' style="font-family:Georgia,serif"' : ''}>Life Deco Art</span><p>${greeting()}</p></div>
      ${template.blocks.map((block, index) => `<button type="button" data-select="${index}" draggable="true"
        aria-label="Editar ${blockLabels[block.kind]}, bloque ${index + 1}" aria-pressed="${index === selected}"
        class="mkt-block is-${block.kind}" style="color:${safeColor(block.color)};text-align:${['center','right'].includes(block.align) ? block.align : 'left'};
        font-family:${block.font?.startsWith('Georgia') ? 'Georgia, serif' : 'Arial, sans-serif'};margin-bottom:${[8,16,24,32].includes(Number(block.space)) ? Number(block.space) : 16}px">${contentOf(block, block.kind, template.brandColors)}</button>`).join('')}
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
    const name = template.name || welcomeName;
    const state = settings.enabled ? 'Activa' : settings.published ? 'Pausada' : 'Borrador';
    if (!editing) {
      result.innerHTML = `<section class="sales-metrics" aria-label="Resumen de automatizaciones">${[
        ['flow', 'Total', 1], ['check', 'Activas', Number(settings.enabled)], ['doc', 'Borradores', Number(state === 'Borrador')],
        ['mail', 'Correos enviados este mes', metrics?.sentThisMonth ?? '—']
      ].map(([symbol, label, value]) => `<article class="sales-metric"><span>${icon(symbol)}</span><div><small>${label}</small><strong>${value}</strong></div></article>`).join('')}</section>
      <section class="sales-panel mkt-automation-list" aria-label="Listado de automatizaciones">
        <div class="mkt-filters"><label class="sales-search">${icon('search')}<input type="search" data-automation-search aria-label="Buscar automatización" placeholder="Buscar automatización" value="${escape(query)}"></label>
          <select data-automation-status aria-label="Estado">${options([['','Todos los estados'],['Activa','Activas'],['Borrador','Borradores'],['Pausada','Pausadas']],filter)}</select>
          <button type="button" class="mkt-soft-button" data-edit="new">${icon('plus')} Nueva automatización</button></div>
        <div class="mkt-table-scroll"><table class="sales-table mkt-automation-table">
          <thead><tr><th scope="col">Automatización</th><th scope="col">Disparador</th><th scope="col">Estado</th><th scope="col">Último envío</th><th scope="col" aria-label="Acciones"></th></tr></thead>
          <tbody><tr data-automation-row><td><button type="button" data-edit="open">${escape(name)}</button><small>Email · 1 correo</small></td>
          <td>Nueva suscripción</td><td>${statusBadge(state, settings.enabled)}</td><td>${escape(format(metrics?.lastSent))}</td>
          <td><button class="mkt-automation-open" type="button" data-edit="open" aria-label="Abrir ${escape(name)}">${icon('chevron')}</button></td></tr>
          <tr data-automation-empty hidden><td colspan="5" class="mkt-table-empty">No hay coincidencias con esos filtros.</td></tr></tbody>
        </table></div></section>`;
      filterList();
      return;
    }
    result.innerHTML = `<section class="mkt-editor" aria-label="Editor del correo de bienvenida">
      <button type="button" class="mkt-editor-back" data-edit="back">← Automatizaciones</button>
      <header class="mkt-editor-header"><div><div class="mkt-editor-title"><h1 tabindex="-1">${newEditor ? 'Nueva automatización' : escape(name)}</h1>${statusBadge(state, settings.enabled)}</div>
        <p>Configura el correo de bienvenida para nuevos suscriptores.</p></div>
        <div class="mkt-editor-actions"><button type="button" data-request="test" data-form-action="text" ${settings.mailReady ? '' : 'disabled'}>Enviar prueba</button>
          <button type="button" data-request="draft" data-form-action="secondary">Guardar borrador</button>
          <button type="button" data-request="${settings.enabled ? 'publish' : 'activate'}" data-form-action="primary" ${settings.enabled || settings.mailReady ? '' : 'disabled'}>${settings.enabled ? 'Publicar cambios' : 'Activar'}</button></div></header>
      <ol class="mkt-steps" aria-label="Flujo de bienvenida"><li><span class="mkt-round">1</span><div><strong>Nueva suscripción</strong><p>Pie de página o Comunidad</p></div></li>
        <li><span class="mkt-round">2</span><div><strong>Enviar correo de bienvenida</strong><p>Un correo por contacto</p></div></li></ol>
      <div class="mkt-editor-grid">
        <aside class="mkt-palette">
          <div class="mkt-editor-tabs" role="group" aria-label="Ajustes del correo">
            <button type="button" data-editor-tab="content" aria-pressed="${editorTab === 'content'}">Contenido</button>
            <button type="button" data-editor-tab="design" aria-pressed="${editorTab === 'design'}">Diseño</button>
          </div>
          <div ${editorTab === 'content' ? '' : 'hidden'}>
            <div class="mkt-fields"><label>Nombre de la automatización<input maxlength="100" data-meta="name" value="${escape(name)}"></label>
              <label>Asunto<input maxlength="150" data-meta="subject" value="${escape(template.subject)}"></label>
              <label>Texto de vista previa<input maxlength="150" data-meta="preheader" value="${escape(template.preheader)}"></label></div>
            <div class="mkt-palette-actions">${['text','image','button'].map(kind => `<button type="button" draggable="true" data-add="${kind}" ${template.blocks.length >= 30 ? 'disabled' : ''}>${icon({text:'doc',image:'image',button:'link'}[kind])}${blockLabels[kind]}</button>`).join('')}</div>
            <button type="button" data-edit="brand">Usar estilos de Marca</button>
          </div>
          <div ${editorTab === 'design' ? '' : 'hidden'}><section class="mkt-inspector" data-inspector aria-label="Ajustes del bloque"></section>
            <div class="mkt-block-actions">${['divider','columns'].map(kind => `<button type="button" draggable="true" data-add="${kind}" ${template.blocks.length >= 30 ? 'disabled' : ''}>${blockLabels[kind]}</button>`).join('')}
              <button type="button" data-edit="undo" ${previous ? '' : 'disabled'}>Deshacer cambio</button></div></div>
        </aside>
        <section class="mkt-preview"><div class="mkt-preview-tools"><h3>Vista previa del correo</h3><div role="group" aria-label="Tamaño de vista previa">
          <button type="button" data-device="desktop" aria-pressed="${!mobile}">Escritorio</button>
          <button type="button" data-device="mobile" aria-pressed="${mobile}">Móvil</button></div></div>
          <div class="mkt-stage-scroll"><div class="mkt-email-paper" data-canvas></div></div>
          <div class="mkt-stage-footer"><label><input type="checkbox" data-sample-name ${withName ? 'checked' : ''}> Ejemplo con nombre</label>
          <button type="button" data-request="preview">Ver correo final</button></div>
        </section>
      </div>
      ${!settings.mailReady ? '<p class="mkt-muted">El buzón corporativo está pendiente de configurar.</p>' : ''}
      ${settings.enabled ? '<div class="mkt-brand-actions"><button type="button" data-request="toggle">Pausar bienvenida</button><button type="button" data-request="retry">Procesar envíos pendientes</button></div>' : ''}
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

  function filterList() {
    const match = (!filter || filter === (settings.enabled ? 'Activa' : settings.published ? 'Pausada' : 'Borrador'))
      && normalize(template.name || welcomeName).includes(normalize(query.trim()));
    result.querySelector('[data-automation-row]').hidden = !match;
    result.querySelector('[data-automation-empty]').hidden = match;
  }

  function changeSelection(index, focus = false) {
    selected = index;
    editorTab = 'design';
    render();
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
    editorTab = 'design';
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
      [settings, metrics] = await Promise.all([request('settings'), request('automation-summary').catch(() => null), refreshCopies()]);
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
    if (target.dataset.meta) { template[target.dataset.meta] = target.value; dirty = true; }
    if (target.matches('[data-automation-search]')) { query = target.value; filterList(); }
    if (target.matches('[data-sample-name]')) { withName = target.checked; canvas(); }
    if (target.dataset.field && template.blocks[selected]) {
      template.blocks[selected][target.dataset.field] = target.value;
      dirty = true;
      canvas();
    }
  });
  result.addEventListener('change', event => {
    if (!event.target.matches('[data-automation-status]')) return;
    filter = event.target.value;
    filterList();
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
    if (button.dataset.editorTab) {
      editorTab = button.dataset.editorTab; render();
      result.querySelector(`[data-editor-tab="${editorTab}"]`).focus();
      return;
    }
    if (edit === 'brand') {
      const brand = getState().settings.marketingBrand || {};
      if (!brand.headingFont && !brand.bodyFont && !brand.colors?.length) { report('Agrega colores o tipografías en Marca para usarlos aquí.', true); return; }
      editBlock(() => {
        if (brand.headingFont) template.headingFont = brand.headingFont;
        if (brand.colors?.length) template.brandColors = true;
        for (const block of template.blocks) {
          if (brand.bodyFont && ['text','columns'].includes(block.kind)) block.font = brand.bodyFont;
          if (brand.colors?.length && block.kind === 'button') block.color = brand.colors[0];
        }
      });
      report('Estilos de Marca aplicados al borrador.');
      return;
    }
    if (['open','new','back'].includes(edit)) {
      editing = edit !== 'back';
      if (editing) { newEditor = edit === 'new'; editorTab = 'content'; }
      render();
      result.querySelector(editing ? '.mkt-editor-title h1' : '[data-edit="new"]')?.focus();
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
    if (action === 'activate' && !await ask('¿Publicar esta plantilla y activar el correo de bienvenida para nuevas suscripciones?')) return;
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
        if (['draft','publish','toggle','activate'].includes(action)) {
          settings = await request('settings');
          if (action !== 'toggle' && JSON.stringify(template) === JSON.stringify(snapshot)) dirty = false;
          if (action === 'toggle' || action === 'activate') render();
        }
        if (action === 'copy') {
          await refreshCopies();
          render();
          result.querySelector('.mkt-templates').open = true;
        }
      }
      report({ test:'Prueba aceptada por Gmail.', draft:'Borrador guardado.', publish:'Plantilla publicada.', toggle:'Automatización actualizada.', activate:'Automatización activada.',
        retry:'Envíos pendientes revisados.', copy:'Copia guardada.' }[action] || '');
    } catch (error) { report(error.message, true); }
    finally { busy = false; button.disabled = false; }
  });
  load();
}
