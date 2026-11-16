const sourceLabel = { footer: 'Footer', community: 'Comunidad' };
const jobLabel = { queued: 'En cola', sending: 'Enviando', sent: 'Aceptado por Gmail', retry: 'Reintento pendiente',
  review: 'Por revisar', failed: 'Falló', inactive: 'Automatización inactiva', cancelled: 'Cancelado' };
const blockLabels = { text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Separador', columns: 'Columnas' };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const format = date => date ? new Date(date).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const normalize = value => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function marketingView(view) {
  const pages = {
    marketing: ['Suscriptores', 'Gestiona las suscripciones de la comunidad.'],
    'marketing-automation': ['Automatizaciones', 'Configura el correo de bienvenida de la comunidad.'],
  };
  return pages[view];
}

export function bindMarketing(view, user) {
  const root = document.querySelector('#marketing-view');
  if (!root) return;
  const result = root.querySelector('[data-marketing-result]');
  const feedback = root.querySelector('[role=status]');
  async function request(action, body, page = '') {
    const token = await user.getIdToken();
    const p = new URLSearchParams({ action });
    if (page) p.set('page', page);
    const response = await fetch(`/api/marketing?${p}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  }

  function report(message) {
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  if (view === 'marketing') {
    let rows = [];
    let next = '';
    let busy = false;
    const search = root.querySelector('[type=search]');
    const status = root.querySelector('[name=status]');
    const source = root.querySelector('[name=source]');
    function show() {
      const filtered = rows.filter(row => (!status.value || row.status === status.value)
        && (!source.value || row.consents.some(entry => entry.source === source.value))
        && normalize([row.name, row.surname, row.email].join(' ')).includes(normalize(search.value.trim())));
      result.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Suscriptor</th><th>Origen inicial</th><th>Registro</th><th>Estado</th><th>Bienvenida</th></tr></thead><tbody>${filtered.map(row => `<tr><td><details><summary>${escape([row.name, row.surname].filter(Boolean).join(' ') || row.email)}</summary><p>${escape(row.email)}</p><ul>${row.consents.map(entry => `<li>${escape(sourceLabel[entry.source])} · ${escape(format(entry.acceptedAt))} · ${escape(entry.version)}</li>`).join('')}</ul>${row.cancelledAt ? `<p>Baja · ${escape(format(row.cancelledAt))}</p>` : ''}</details></td><td>${escape(sourceLabel[row.firstSource])}</td><td>${escape(format(row.createdAt))}</td><td>${row.status === 'active' ? 'Activa' : 'Cancelada'}</td><td>${escape(jobLabel[row.welcome.status])}${row.welcome.reason ? `<br><small>${escape(row.welcome.reason)}</small>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No hay suscriptores para mostrar.</td></tr>'}</tbody></table></div>${next ? '<div class="content-footer"><span>Filtros aplicados a los contactos cargados</span><button type="button" data-marketing-more>Cargar más</button></div>' : ''}`;
      result.querySelector('[data-marketing-more]')?.addEventListener('click', load);
    }
    async function load() {
      if (busy) return;
      busy = true;
      report('Cargando suscriptores…');
      try {
        const page = await request('subscribers', null, next);
        rows = rows.concat(page.rows);
        next = page.next;
        show();
        report('');
      } catch (error) { report(error.message); }
      finally { busy = false; }
    }
    search.addEventListener('input', show);
    status.addEventListener('change', show);
    source.addEventListener('change', show);
    load();
    return;
  }

  let settings;
  let template;
  let previous;
  let busy = false;
  let copies = [];
  let copiesNext = '';
  const settingsLine = root.querySelector('[data-marketing-state]');
  function display() {
    settingsLine.textContent = `${settings.enabled ? 'Activa' : 'Pausada'} · ${settings.published ? 'Plantilla publicada' : 'Plantilla por publicar'}${settings.mailReady ? '' : ' · Buzón pendiente de configurar'}`;
    const options = (values, selected) => values.map(([value, label]) =>
      `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
    const input = (label, field, value, type = 'text') => `<label>${label}<input type="${type}" data-field="${field}" value="${escape(value)}"></label>`;
    const area = (label, field, value) => `<label>${label}<textarea data-field="${field}" rows="2">${escape(value)}</textarea></label>`;
    result.innerHTML = `<label>Asunto<input type="text" maxlength="150" data-subject value="${escape(template.subject)}"></label>
      <div class="section-space"><h3>Bloques del correo</h3>
      ${template.blocks.map((block, index) => `<fieldset class="section-space" data-block="${index}"><legend>${blockLabels[block.kind]}</legend>
      <div class="form-grid">
      ${['text', 'button', 'columns'].includes(block.kind) ? area(block.kind === 'button' ? 'Texto del botón' : 'Texto', 'text', block.text) : ''}
      ${block.kind === 'columns' ? area('Segunda columna', 'secondary', block.secondary) : ''}
      ${['image', 'button'].includes(block.kind) ? input('Enlace HTTPS', 'url', block.url, 'url') : ''}
      ${block.kind === 'image' ? input('Texto alternativo', 'alt', block.alt) : ''}
      ${input('Color', 'color', block.color || '#1c1a17', 'color')}
      <label>Alineación<select data-field="align">${options([['left','Izquierda'],['center','Centro'],['right','Derecha']],block.align)}</select></label>
      <label>Tipografía<select data-field="font">${options([['Arial','Arial'],['Georgia','Georgia']], block.font?.startsWith('Georgia') ? 'Georgia' : 'Arial')}</select></label>
      <label>Espacio inferior<select data-field="space">${options([['8','8 px'],['16','16 px'],['24','24 px'],['32','32 px']], String(block.space || 16))}</select></label>
      </div><div class="actions"><button type="button" data-edit="up" ${index === 0 ? 'disabled' : ''}>Subir</button><button type="button" data-edit="down" ${index === template.blocks.length - 1 ? 'disabled' : ''}>Bajar</button><button type="button" data-edit="remove">Eliminar bloque</button></div></fieldset>`).join('')}
      <div class="actions section-space"><label>Tipo de bloque<select data-block-type>${options(Object.entries(blockLabels))}</select></label><button type="button" data-edit="add">Agregar bloque</button><button type="button" data-edit="undo" ${!previous ? 'disabled' : ''}>Deshacer</button></div></div>
      <div class="actions section-space"><label><input type="checkbox" data-sample-name> Ejemplo con nombre</label><button type="button" data-preview="desktop">Vista previa en escritorio</button><button type="button" data-preview="mobile">Vista previa en móvil</button><button type="button" data-request="test">Enviar prueba al buzón corporativo</button></div>
      <div data-preview-area hidden></div>
      <div class="actions section-space"><label>Nombre de la copia<input type="text" maxlength="100" data-copy-name></label><button type="button" data-request="copy">Guardar como plantilla</button>
      <label>Plantilla guardada<select data-copy-select><option value="">Selecciona una plantilla</option>${copies.map((copy, index) => `<option value="${index}">${escape(copy.name)}</option>`).join('')}</select></label><button type="button" data-edit="reuse">Usar plantilla</button>${copiesNext ? '<button type="button" data-request="template-page">Cargar más plantillas</button>' : ''}</div>
      <div class="actions section-space"><button type="button" data-request="draft">Guardar borrador</button><button type="button" class="primary" data-request="publish">Publicar plantilla</button><button type="button" data-request="toggle">${settings.enabled ? 'Pausar bienvenida' : 'Activar bienvenida'}</button><button type="button" data-request="retry">Procesar envíos pendientes</button></div>`;
  }
  async function load() {
    report('Cargando automatización…');
    try {
      settings = await request('settings');
      const page = await request('templates');
      copies = page.rows;
      copiesNext = page.next;
      template = structuredClone(settings.draft);
      display();
      report('');
    } catch (error) { report(error.message); }
  }
  result.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-subject]')) template.subject = target.value;
    if (target.dataset.field) template.blocks[Number(target.closest('[data-block]').dataset.block)][target.dataset.field] = target.value;
  });
  result.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || busy) return;
    const edit = button.dataset.edit;
    if (edit) {
      if (edit === 'undo') { template = previous; previous = null; }
      else {
        const chosen = result.querySelector('[data-copy-select]').value;
        if (edit === 'reuse' && chosen === '') { report('Selecciona una plantilla.'); return; }
        previous = structuredClone(template);
        const index = Number(button.closest('[data-block]')?.dataset.block);
        if (edit === 'add') template.blocks.push({ kind: result.querySelector('[data-block-type]').value, align: 'left' });
        if (edit === 'remove') template.blocks.splice(index, 1);
        if (edit === 'reuse') template = structuredClone(copies[Number(chosen)].template);
        if (edit === 'up' || edit === 'down') {
          const [block] = template.blocks.splice(index, 1);
          template.blocks.splice(index + (edit === 'up' ? -1 : 1), 0, block);
        }
      }
      display();
      return;
    }
    const action = button.dataset.preview ? 'preview' : button.dataset.request;
    if (!action) return;
    busy = true;
    button.disabled = true;
    const withName = result.querySelector('[data-sample-name]').checked;
    const data = action === 'toggle' ? { enabled: !settings.enabled } :
      { template, withName, name: result.querySelector('[data-copy-name]').value };
    report('Procesando…');
    try {
      const response = action === 'template-page' ? await request('templates', null, copiesNext) : await request(action, data);
      if (action === 'preview') {
        const preview = result.querySelector('[data-preview-area]');
        const frame = document.createElement('iframe');
        frame.title = 'Vista previa de la bienvenida';
        frame.setAttribute('sandbox', '');
        frame.style.cssText = `display:block;width:min(100%,${button.dataset.preview === 'mobile' ? 360 : 640}px);height:380px;margin:20px auto;border:1px solid var(--border)`;
        frame.srcdoc = response.html;
        preview.replaceChildren(frame);
        preview.hidden = false;
      } else if (action === 'publish' || action === 'toggle') {
        settings = await request('settings');
        display();
      } else if (action === 'copy' || action === 'template-page') {
        const page = action === 'copy' ? await request('templates') : response;
        copies = action === 'copy' ? page.rows : copies.concat(page.rows);
        copiesNext = page.next;
        display();
      }
      report({ test:'Prueba aceptada por Gmail.', draft:'Borrador guardado.', publish:'Plantilla publicada.', toggle:'Automatización actualizada.', retry:'Envíos pendientes revisados.', copy:'Plantilla guardada.' }[action] || '');
    } catch (error) { report(error.message); }
    finally { busy = false; button.disabled = false; }
  });
  load();
}

export function marketingPage(view) {
  const content = view === 'marketing'
    ? `<div class="toolbar"><input type="search" aria-label="Buscar suscriptor" placeholder="Buscar por nombre o correo"><select name="status" aria-label="Estado"><option value="">Todos los estados</option><option value="active">Activas</option><option value="cancelled">Canceladas</option></select><select name="source" aria-label="Origen"><option value="">Todos los orígenes</option><option value="footer">Footer</option><option value="community">Comunidad</option></select></div>`
    : '<h2>Bienvenida a la comunidad</h2><p class="muted" data-marketing-state></p>';
  return `<section class="card" id="marketing-view">${content}<p class="muted" role="status" hidden></p><div data-marketing-result></div></section>`;
}
