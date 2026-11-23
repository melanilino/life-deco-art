import { triggerOptions, originOptions, flowStages, starterOptions, starter, emptyMail, normalizeFlow, flowChecks, sequenceLabel } from './automation-model.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const dateLabel = value => value ? new Date(value).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit', timeZone:'America/Santo_Domingo' }) : '';
const testTime = value => `<time datetime="${escape(value || '')}">${value ? escape(new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Santo_Domingo'})) : '—'}</time>`;
const triggerLabel = flow => triggerOptions.find(([key]) => key === flow.trigger)?.[1] || '';
const stateLabel = row => ({ active:'Activa', paused:'Pausada', draft:'Borrador' })[row?.status] || 'Borrador';
const id = () => crypto.randomUUID();
const originText = key => originOptions.find(([value]) => key === value)?.[1] || key;
const selectOptions = (values, selected) => values.map(([value, label]) => `<option value="${escape(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escape(label)}</option>`).join('');

export function bindAutomations(root, request, report, ask, { user, icon, getState, contentOf, blockLabels }) {
  const result = root.querySelector('[data-marketing-result]');
  const key = `lda-automation-draft:${user.uid}`;
  const editorId = location.hash.slice(1).split('/')[1] || '';
  const editing = Boolean(editorId);
  let rows = [], current = null, flow = null, stage = 0, selectedBlock = 0;
  let mobile = false, sampleName = '', mailReady = false, metric = null, confirmation = false;
  let revision = 0, savedRevision = 0, timer, saving, busy = false, loadFailed = false;
  let previousTemplate = null, copies = [], templatesLoaded = false, templatesOpen = false, search = '', stateFilter = '';
  let conflict = false, loading = true;
  let taskScheduling = false, waitTest = null;
  const journal = () => {
    try { localStorage.setItem(key, JSON.stringify({ id: current?.id, version: current?.version || 0, flow, stage, waitTest, dirty: revision !== savedRevision })); }
    catch { /* Server saving remains available when browser storage is full. */ }
  };
  const badge = () => `<span class="mkt-status${current?.status === 'active' ? ' is-active' : ''}">${stateLabel(current)}</span>`;
  const selectedMail = () => flow?.steps.find(step => step.id === flow.selectedMail && step.kind === 'mail');
  const mails = () => flow?.steps.filter(step => step.kind === 'mail') || [];
  const header = () => {
    const workspace = root.closest('.home-workspace');
    const title = workspace?.querySelector('.section-action-header .home-welcome h1');
    const description = workspace?.querySelector('.section-action-header .home-welcome p');
    if (title) title.textContent = !editing ? 'Automatizaciones' : !flow ? 'Nueva automatización' : confirmation ? 'Automatización activa' : stage === 4 ? 'Revisar y activar' : flow.name || 'Nueva automatización';
    if (description) description.textContent = !editing ? 'Gestiona los correos que se envían automáticamente.' : !flow ? 'Elige cómo quieres empezar.' : confirmation ? 'Consulta los resultados y gestiona el flujo.' : triggerLabel(flow);
  };
  function savedStatus(message) {
    const status = result.querySelector('[data-auto-saved]');
    if (status) status.textContent = message;
  }
  function change() {
    revision++;
    journal();
    savedStatus('Cambios pendientes');
    clearTimeout(timer);
    timer = setTimeout(() => save().catch(() => {}), 1000);
  }
  async function save() {
    clearTimeout(timer);
    if (conflict) throw Error('Recarga esta automatización para recuperar su versión actual.');
    if (saving) await saving;
    if (!flow || !current || savedRevision === revision && current.version) return;
    const capturedRevision = revision, snapshot = structuredClone(flow), recordId = current.id, version = current.version || 0;
    savedStatus('Guardando borrador…');
    saving = (async () => {
      try {
        const { row } = await request('flow-save', { id: recordId, version, flow: snapshot });
        if (current?.id !== recordId) return;
        current = { ...row, draft: snapshot };
        savedRevision = capturedRevision;
        const index = rows.findIndex(entry => entry.id === recordId);
        if (index >= 0) rows[index] = row;
        else rows.push(row);
        journal();
        savedStatus(`Borrador guardado ${dateLabel(row.savedAt)}`);
        report('');
      } catch (error) {
        if (/otra ventana|Recarga/.test(error.message)) conflict = true;
        savedStatus('Borrador pendiente de guardar');
        report(error.message, true);
        throw error;
      } finally { saving = null; }
    })();
    await saving;
    if (savedRevision !== revision) await save();
  }
  const panel = (title, body, extra = '') => `<section class="auto-panel ${extra}">${title ? `<h2>${title}</h2>` : ''}${body}</section>`;
  const button = (label, action, primary = false, attributes = '') => `<button type="button" data-auto="${action}" ${primary ? 'data-form-action="primary"' : 'data-form-action="secondary"'} ${attributes}>${label}</button>`;
  const stepper = () => `<nav class="auto-stepper" aria-label="Pasos de la automatización">${flowStages.map((label, index) =>
    `<button type="button" data-stage="${index}" aria-label="${index + 1}. ${label}" ${stage === index ? 'aria-current="step"' : ''} ${!flow && index ? 'disabled' : ''}><span class="auto-step-number" aria-hidden="true">${index + 1}</span><span>${label}</span></button>`).join('')}</nav>`;
  function home() {
    const list = rows.filter(row => (!stateFilter || row.status === stateFilter)
      && (row.draft?.name || '').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
    return `${panel('', `<div class="auto-list-filters"><label class="sales-search">${icon('search')}<input type="search" data-list-search aria-label="Buscar automatización" placeholder="Buscar automatización" value="${escape(search)}"></label>
        <select data-list-status aria-label="Estado">${selectOptions([['','Todos los estados'],['draft','Borradores'],['active','Activas'],['paused','Pausadas']],stateFilter)}</select>
        <button type="button" class="finance-register" data-auto="new" ${loadFailed || loading ? 'disabled' : ''}>${icon('plus')} Nueva automatización</button></div>
        <div class="mkt-table-scroll" aria-busy="${loading}"><table class="sales-table auto-list"><thead><tr><th>Automatización</th><th>Disparador</th><th>Pasos</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          ${list.map(row => `<tr><td><button type="button" data-open="${row.id}">${escape(row.draft.name || 'Sin nombre')}</button></td><td>${triggerLabel(row.draft)}</td>
            <td>${row.draft.steps.length}</td><td>${stateLabel(row)}</td><td><button type="button" class="mkt-contact-actions" data-actions="${row.id}" popovertarget="auto-actions-${row.id}" aria-expanded="false" aria-label="Acciones de ${escape(row.draft.name || 'Sin nombre')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
            <div popover id="auto-actions-${row.id}" class="auto-actions-menu" aria-label="Acciones de ${escape(row.draft.name || 'Sin nombre')}"><button type="button" data-open="${row.id}">Editar</button><button type="button" data-delete="${row.id}">Eliminar</button></div></td></tr>`).join('') ||
          (loading ? '' : `<tr><td colspan="5">${loadFailed ? 'No se pudieron cargar las automatizaciones.' : 'No hay automatizaciones con estos filtros.'}</td></tr>`)}</tbody></table></div>
        ${loadFailed ? button('Volver a intentar', 'reload') : ''}`)}`;
  }
  function startScreen() {
    if (flow) return `<section class="auto-start-screen" aria-label="Inicio de la automatización"><header class="auto-start-heading"><h2>Inicio</h2>${badge()}</header><label class="auto-field">Nombre de la automatización<input data-flow="name" maxlength="100" value="${escape(flow.name)}"></label></section>`;
    if (editorId !== 'new') return panel('', loading ? '' : `<p>Esta automatización no está disponible.</p>`);
    return `<section class="auto-start-screen" aria-label="Elegir cómo empezar"><header class="auto-start-heading"><h2>Elige cómo empezar</h2></header><h3 class="auto-start-label">Plantillas</h3><div class="auto-template-list" role="group" aria-label="Plantillas de automatización">${starterOptions.filter(([kind])=>kind!=='blank').map(([kind, name, trigger]) =>
        `<button type="button" data-starter="${kind}" ${loadFailed || loading ? 'disabled' : ''}><span class="auto-template-icon" aria-hidden="true">${icon({welcome:'mail',purchase:'doc',review:'check'}[kind])}</span><span class="auto-template-copy"><strong>${name}</strong><span>${triggerLabel({trigger})}</span></span><span class="auto-template-next" aria-hidden="true">${icon('chevron')}</span></button>`).join('')}</div>
        <button type="button" class="auto-from-scratch" data-starter="blank" ${loadFailed || loading ? 'disabled' : ''}><span class="auto-template-icon" aria-hidden="true">${icon('plus')}</span><span class="auto-template-copy"><strong>Desde cero</strong><span>Elegir disparador y contenido</span></span><span class="auto-template-next" aria-hidden="true">${icon('chevron')}</span></button>
        <p class="auto-start-note">Ninguna opción activa el envío automáticamente.</p></section>`;
  }
  function triggerScreen() {
    const details = {
      subscription: 'Cada dirección entra una vez en este flujo.',
      purchase: 'Se detectan las facturas emitidas del Hub. El contacto debe tener una suscripción activa.',
      delivered: 'Se detectan los pedidos marcados como entregados en el Hub. El contacto debe tener una suscripción activa.',
      birthday: 'Solo entran clientas con una fecha de cumpleaños registrada. El formulario actual de Clientes aún no recoge ese dato.',
      inactive: 'Se revisa la última factura emitida de clientas con suscripción activa.',
    };
    return `<section class="auto-trigger-screen" aria-label="Disparador de la automatización"><header class="auto-trigger-heading"><h2>Disparador</h2>${badge()}</header><label class="auto-field auto-trigger-name">Nombre de la automatización<input data-flow="name" maxlength="100" value="${escape(flow.name)}"></label>
      <fieldset class="auto-triggers" aria-describedby="auto-trigger-description"><legend>¿Qué activa esta automatización?</legend><div class="auto-trigger-options">${triggerOptions.map(([value,label]) =>
        `<label><input type="radio" name="auto-trigger" value="${value}" ${flow.trigger === value ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>
      <p class="auto-muted auto-trigger-description" id="auto-trigger-description">${details[flow.trigger]}</p>
      ${flow.trigger === 'subscription' ? `<fieldset class="auto-origins" aria-describedby="auto-origins-description"><legend>Orígenes de suscripción</legend><p class="auto-muted" id="auto-origins-description">Puedes elegir uno o ambos formularios.</p><div class="auto-origin-options">${originOptions.map(([value,label]) => {
        const [place, name] = label.split(' «');
        return `<label><input type="checkbox" aria-label="${escape(label)}" data-origin="${value}" ${flow.origins.includes(value) ? 'checked' : ''}><span><strong>${escape(place)}</strong><span>${name ? '«'+escape(name) : ''}</span></span></label>`;
      }).join('')}</div>${!flow.origins.length ? '<p class="auto-origin-warning" role="status">Elige al menos un origen para activar esta automatización.</p>' : ''}</fieldset>` : ''}
      ${flow.trigger === 'inactive' ? `<label class="auto-field auto-trigger-inactive">Días sin comprar<input type="number" data-flow="inactiveDays" min="1" max="730" value="${flow.inactiveDays}"></label>` : ''}</section>`;
  }
  function timeline(editable = true) {
    return `<ol class="auto-timeline${editable ? ' auto-sequence-list' : ''}" ${editable ? 'aria-label="Orden de la secuencia"' : ''}><li>${editable ? `<span class="auto-sequence-marker" aria-hidden="true">${icon('flow')}</span><div class="auto-node-head"><strong>${triggerLabel(flow)}</strong><span class="auto-sequence-type">Disparador</span></div>` : `<strong>${triggerLabel(flow)}</strong>`}<p>${flow.trigger === 'subscription' ? flow.origins.map(originText).join(' · ') || 'Elige al menos un origen' : 'Contacto con suscripción activa'}</p></li>
      ${flow.steps.map((step, index) => `<li class="${step.kind === 'wait' ? 'auto-wait' : ''}">${editable ? `<span class="auto-sequence-marker" aria-hidden="true">${index+1}</span>` : ''}<div class="auto-node-head"><strong>${step.kind === 'wait' ? 'Espera' : escape(step.name || 'Correo')}</strong></div>
        ${step.kind === 'wait' ? editable ? `<div class="auto-wait-fields"><label class="auto-field">Duración<input type="number" aria-label="Duración de la espera ${index + 1}" min="1" max="365" data-wait-duration="${index}" value="${step.duration}"></label>
          <label class="auto-field">Unidad<select aria-label="Unidad de la espera ${index + 1}" data-wait-unit="${index}">${selectOptions([['minutes','Minutos'],['hours','Horas'],['days','Días']],step.unit)}</select></label></div>` :
          `<p>${step.duration} ${(step.duration === 1 ? {minutes:'minuto',hours:'hora',days:'día'} : {minutes:'minutos',hours:'horas',days:'días'})[step.unit]}</p>` : `<p${editable ? ' class="auto-sequence-subject"' : ''}>${editable ? '<span>Asunto</span>' : ''}${escape(step.template.subject || 'Asunto pendiente')}</p>`}
        ${editable ? `<div class="auto-sequence-actions"><button type="button" data-remove-step="${index}" data-form-action="secondary" aria-label="Eliminar ${step.kind === 'wait' ? 'espera' : 'correo'}, paso ${index+1}">Eliminar</button>${step.kind === 'mail' ? `<button type="button" data-edit-mail="${step.id}" data-form-action="primary" aria-label="Editar correo, paso ${index+1}">Editar</button>` : ''}</div>` : ''}</li>`).join('')}</ol>`;
  }
  function sequenceScreen() {
    return `<section class="auto-sequence-screen" aria-label="Secuencia de la automatización"><header class="auto-sequence-heading"><h2>Secuencia</h2>${badge()}</header>${timeline()}<div class="auto-sequence-add" role="group" aria-label="Añadir un paso">${button(`${icon('plus')} Añadir espera`,'add-wait')}${button(`${icon('plus')} Añadir correo`,'add-mail',true)}</div></section>`;
  }
  function mailPaper(mail) {
    const greeting = sampleName ? `Hola, ${escape(sampleName)}.` : '¡Hola!';
    const personalize = value => String(value || '').replace(/\{\{\s*(nombre|name|codigo)\s*\}\}/g, (_all, variable) => variable === 'codigo' ? 'LDA10' : sampleName);
    return `<div class="mkt-email-paper auto-paper ${mobile ? 'is-mobile' : ''}"><div class="mkt-email-intro"><span class="mkt-email-title">Life Deco Art</span><p>${greeting}</p></div>
      ${mail.template.blocks.map((block,index) => `<button type="button" class="mkt-block" data-block="${index}" aria-label="Editar ${blockLabels[block.kind]}, bloque ${index + 1}" aria-pressed="${index === selectedBlock}"
        style="color:${block.color};text-align:${block.align};margin-bottom:${block.space || 16}px">${contentOf({...block,text:personalize(block.text),secondary:personalize(block.secondary)},block.kind,mail.template.brandColors)}</button>`).join('')}
      <div class="mkt-email-footer">Cancelar suscripción</div></div>`;
  }
  function inspector(mail) {
    const block = mail.template.blocks[selectedBlock];
    if (!block) return '<p class="auto-muted">Agrega un bloque para editar su contenido.</p>';
    const field = (label, key, type = 'text') => `<label class="auto-field">${label}<input type="${type}" data-block-field="${key}" value="${escape(block[key] || '')}"></label>`;
    return `<div class="auto-block-editor"><h3>Editar ${blockLabels[block.kind].toLowerCase()}</h3>
      ${['text','button','columns'].includes(block.kind) ? `<label class="auto-field">${block.kind === 'button' ? 'Texto del botón' : 'Texto'}<textarea data-block-field="text" maxlength="3000">${escape(block.text)}</textarea></label>` : ''}
      ${block.kind === 'columns' ? `<label class="auto-field">Segunda columna<textarea data-block-field="secondary" maxlength="3000">${escape(block.secondary)}</textarea></label>` : ''}
      ${['image','button'].includes(block.kind) ? field('Enlace HTTPS','url','url') : ''}${block.kind === 'image' ? field('Texto alternativo','alt') : ''}
      <div class="auto-block-controls">${block.kind !== 'divider' ? field('Color','color','color') : ''}
        <label class="auto-field">Alineación<select data-block-field="align" aria-label="Alineación">${selectOptions([['left','Izquierda'],['center','Centro'],['right','Derecha']],block.align)}</select></label>
        <label class="auto-field">Espacio inferior<select data-block-field="space" aria-label="Espacio inferior">${selectOptions([[8,'8 px'],[16,'16 px'],[24,'24 px'],[32,'32 px']],block.space || 16)}</select></label></div>
      <div class="auto-inline-actions"><button type="button" data-auto="block-up" ${selectedBlock === 0 ? 'disabled' : ''}>Subir</button><button type="button" data-auto="block-down" ${selectedBlock >= mail.template.blocks.length - 1 ? 'disabled' : ''}>Bajar</button>
        <button type="button" data-auto="block-delete">Eliminar bloque</button>${previousTemplate ? '<button type="button" data-auto="undo">Deshacer</button>' : ''}</div></div>`;
  }
  function mailScreen() {
    const mail = selectedMail();
    if (!mail) return panel('Correo', `<p>Agrega un correo a la secuencia para editarlo.</p>${button('Ir a Secuencia','sequence')}`);
    return `<section class="auto-mail-screen" aria-label="Editor de correo"><h2>Correo</h2><div class="auto-mail-meta"><label class="auto-field">Correo de la secuencia<select data-mail-select aria-label="Correo de la secuencia">${selectOptions(mails().map(step => [step.id,step.name || 'Correo']),mail.id)}</select></label>
      <label class="auto-field">Nombre del correo<input maxlength="100" data-mail="name" value="${escape(mail.name)}"></label>
      <label class="auto-field">Asunto<input maxlength="150" data-mail="subject" value="${escape(mail.template.subject)}"></label>
      <div><label class="auto-field">Texto de vista previa<input maxlength="150" data-mail="preheader" value="${escape(mail.template.preheader)}"></label>
      <div class="auto-chips auto-preheader-suggestions" aria-label="Sugerencias de vista previa">${['Ideas y novedades de Life Deco Art','Gracias por ser parte de nuestra comunidad.'].map(text => `<button type="button" data-suggestion="${escape(text)}">${text}</button>`).join('')}</div></div></div>
      <div class="auto-mail-grid"><section class="auto-mail-settings" aria-label="Contenido del correo"><h3 class="auto-mail-section-title">Contenido del correo</h3>
      <div class="mkt-palette-actions auto-mail-add-blocks">${['text','image','button'].map(kind => `<button type="button" data-add-block="${kind}">${icon({text:'doc',image:'image',button:'link'}[kind])}${blockLabels[kind]}</button>`).join('')}</div>
      <ol class="auto-mail-blocks" aria-label="Bloques del correo">${mail.template.blocks.map((block,index)=>`<li><button type="button" data-block="${index}" aria-label="Seleccionar ${blockLabels[block.kind]}, bloque ${index+1}" aria-pressed="${index===selectedBlock}"><span>${index+1}.</span> ${blockLabels[block.kind]}</button></li>`).join('')}</ol>
      <div class="auto-chips" aria-label="Insertar en el correo">${[['name','Nombre'],['code','Código LDA10'],['shop','Botón tienda'],['whatsapp','Botón WhatsApp']].map(([key,label]) =>
        `<button type="button" data-insert="${key}">+ ${label}</button>`).join('')}</div>
      <div data-auto-inspector>${inspector(mail)}</div>
      <div class="auto-inline-actions auto-mail-brand"><button type="button" data-auto="brand">Usar estilos de Marca</button></div>
      <details class="auto-saved-templates" ${templatesOpen ? 'open' : ''}><summary>Plantillas guardadas</summary><div class="auto-inline-actions">
        ${!templatesLoaded ? '<button type="button" data-auto="load-templates">Cargar plantillas</button>' : copies.length ? `<select data-copy aria-label="Plantilla guardada">${selectOptions(copies.map((copy,index) => [index,copy.name]),'0')}</select><button type="button" data-auto="reuse">Usar plantilla</button>` : '<p>No hay plantillas guardadas.</p>'}
        <button type="button" data-auto="save-copy">Guardar este correo como plantilla</button></div></details></section>
      <section class="auto-preview" aria-label="Vista previa del correo"><header class="auto-preview-heading"><h3 class="auto-mail-section-title">Vista previa del correo</h3><div class="auto-inline-actions auto-preview-size" role="group" aria-label="Tamaño de vista previa"><button type="button" data-device="desktop" aria-pressed="${!mobile}">Escritorio</button>
        <button type="button" data-device="mobile" aria-pressed="${mobile}">Móvil</button></div></header><div class="mkt-stage-scroll" data-auto-paper>${mailPaper(mail)}</div>
        <p class="auto-muted">Ejemplo con ${escape(sampleName || 'saludo sin nombre')}. Cada persona recibe su propio saludo.</p>
        <div class="auto-inline-actions auto-mail-final">${button('Ver correo final','preview')}</div></section></div></section>`;
  }
  function reviewScreen() {
    const checks = flowChecks(flow);
    const pending = checks.some(check => !check.ok && !check.warning);
    const readiness = !mailReady ? 'El buzón necesita configuración antes de activar.' : pending ? 'Completa las comprobaciones pendientes antes de activar.'
      : current.status === 'active' ? 'Los cambios están listos para publicar.' : `Todo está listo para activar. El envío ${current.status === 'paused' ? 'seguirá pausado' : 'seguirá desactivado'} hasta que pulses Activar.`;
    return `<section class="auto-review-screen" aria-label="Revisión de la automatización"><header class="auto-review-heading"><div><h2>Resumen de la secuencia</h2><p class="auto-muted">${escape(flow.name)}</p></div>${badge()}</header>
      <div class="auto-review-overview">${timeline(false)}</div>
      <p class="auto-muted auto-review-timing">${taskScheduling ? 'Cada espera programa el siguiente correo para cuando venza el plazo. Puede haber un pequeño retraso de procesamiento. Los eventos del Hub mantienen su revisión diaria.' : 'Conecta Cloud Tasks para programar las esperas. La recuperación y los eventos del Hub mantienen su revisión diaria.'}</p>
      <div class="auto-review-grid"><section class="auto-review-checklist" aria-label="Comprobaciones"><h3>Comprobaciones</h3><ul class="auto-checks">${checks.map(check =>
      `<li class="${check.ok ? 'is-ok' : check.warning ? 'is-warning' : 'is-error'}"><span role="img" aria-label="${check.ok ? 'Completado' : check.warning ? 'Opcional' : 'Pendiente'}">${check.ok ? icon('check') : '!'}</span><div>${check.label}${!check.ok && check.warning ? '<small class="auto-check-note">Opcional · no impide activar</small>' : ''}</div>${!check.ok ? `<button type="button" data-stage="${check.stage}">Revisar</button>` : ''}</li>`).join('')}</ul>
      <p class="auto-review-readiness" role="status">${readiness}</p></section>
      <section class="auto-review-testing" aria-label="Pruebas del correo"><h3>Pruebas del correo</h3><div class="auto-review-mail"><label class="auto-field">Correo a revisar<select data-mail-select aria-label="Correo de la secuencia">${selectOptions(mails().map(mail => [mail.id,mail.name || mail.template.subject || 'Correo']),flow.selectedMail)}</select></label>
        <button type="button" data-auto="preview" data-form-action="text" ${selectedMail() ? '' : 'disabled'}>Ver correo final</button></div>
        <div class="auto-review-test-send">${button('Enviar prueba','test',false,mailReady && selectedMail() ? '' : 'disabled')}
        <p class="auto-muted">La prueba se envía al correo de tu cuenta administradora.</p></div>
        ${taskScheduling ? `<div class="auto-wait-test">${button('Probar espera de 1 minuto','wait-test',false,mailReady && selectedMail() ? '' : 'disabled')}
          <p class="auto-muted">Esta prueba pausa la automatización y solo envía a tu correo.</p>
          ${waitTest ? `<p role="status">${waitTest.status === 'done' ? `Programada: ${testTime(waitTest.scheduledFor)}. Enviada: ${testTime(waitTest.sentAt)}.` : waitTest.error ? escape(waitTest.error) : `Prueba ${waitTest.status === 'review' ? 'por revisar' : waitTest.status === 'failed' ? 'fallida' : 'programada'} para ${testTime(waitTest.scheduledFor || waitTest.dueAt)}.`}</p>${button('Actualizar prueba','wait-test-status')}` : ''}</div>` : ''}
        ${!mailReady ? '<p role="status">El buzón necesita configuración para enviar correos.</p>' : ''}
        <p class="auto-muted auto-review-event-note">Cumpleaños usa fechas registradas. Los eventos comerciales envían solo a contactos suscritos.</p></section></div></section>`;
  }
  function confirmedScreen() {
    return panel(stateLabel(current) === 'Activa' ? 'Automatización activa' : stateLabel(current), `<p>${escape(flow.name)}</p>
      <p class="auto-muted">${escape(sequenceLabel(flow))}</p>
      <div class="auto-result-metrics">${[['Enviados',metric?.sent],['Aperturas registradas',metric?.opens],['Usos de LDA10',metric?.codeUses]].map(([label,value]) =>
        `<div><span>${label}</span><strong>${value === null ? 'Sin conexión' : value === undefined ? 'Cargando…' : value === 0 ? 'Sin registros aún' : value}</strong></div>`).join('')}</div>
      <p class="auto-muted">Las aperturas dependen de la carga de imágenes del correo. Los usos de LDA10 requieren un registro de canjes.</p>
      ${metric?.review ? `<p role="status">${metric.review} envío(s) requieren revisión en el buzón. No se reenviarán automáticamente.</p>` : ''}
      <div class="auto-inline-actions">${button('Ver mis automatizaciones','home')}${button('Actualizar resultados','metrics')}${button('Procesar pendientes','process')}
      ${current?.status === 'active' ? button('Pausar y editar','pause',true) : button('Editar borrador','edit',true)}</div>`);
  }
  function render() {
    if (!root.isConnected) return;
    header();
    const screen = !editing ? home() : confirmation ? confirmedScreen() : stage === 0 ? startScreen()
      : stage === 1 ? triggerScreen() : stage === 2 ? sequenceScreen() : stage === 3 ? mailScreen() : reviewScreen();
    result.innerHTML = `<section class="auto-workspace">${editing ? `<a class="sales-back auto-back" href="#marketing-automation">← Volver a automatizaciones</a><div class="auto-editor-layout">${stepper()}<div class="auto-editor-content">${screen}</div></div>` : screen}
      ${editing && flow && !confirmation ? `<footer class="auto-footer">${stage > 0 ? `<button type="button" data-stage="${stage-1}" data-form-action="text">Atrás</button>` : '<a href="#marketing-automation" data-form-action="text">Volver a la lista</a>'}
        <span role="status" data-auto-saved>${revision === savedRevision && current.savedAt ? `Borrador guardado ${dateLabel(current.savedAt)}` : 'Cambios pendientes'}</span>
        <div>${button('Guardar borrador','save')}
        ${stage < 4 ? `<button type="button" data-stage="${stage+1}" data-form-action="primary">Continuar</button>` :
          button(current.status === 'active' ? 'Publicar cambios' : 'Activar', 'activate', true, !mailReady || flowChecks(flow).some(c=>!c.ok&&!c.warning) ? 'disabled' : '')}</div></footer>` : ''}
      <dialog class="confirm-dialog auto-final-preview" aria-label="Vista final del correo"><button type="button" data-auto="close-preview" aria-label="Cerrar vista previa">×</button><div data-final-mail></div></dialog></section>`;
    const navigation = result.querySelector('.auto-stepper');
    const activeStep = navigation?.querySelector('[aria-current=step]');
    if (activeStep && navigation.scrollWidth > navigation.clientWidth) {
      navigation.scrollLeft += activeStep.getBoundingClientRect().left - navigation.getBoundingClientRect().left
        - (navigation.clientWidth - activeStep.offsetWidth) / 2;
    }
  }
  async function go(next) {
    if (!flow && next) return;
    if (flow) { stage = next; flow.stage = next; change(); await save(); }
    else stage = next;
    confirmation = false;
    render();
    root.closest('.home-workspace')?.scrollIntoView({ block: 'start' });
  }
  async function create(kind) {
    if (flow) await save();
    flow = starter(kind,id(),id());
    current = { id:flow.id, version:0, status:'draft' };
    stage = 1; revision = 1; savedRevision = 0; confirmation = false; conflict = false; selectedBlock = 0; waitTest = null;
    change();
    await save();
    location.hash = `#marketing-automation/${current.id}`;
  }
  async function open(row) {
    if (flow) await save();
    location.hash = `#marketing-automation/${row.id}`;
  }
  async function loadMetrics() {
    metric = await request('flow-metrics', null, '', { id: current.id });
    render();
  }
  function mutateMail(changeMail) {
    const mail = selectedMail();
    if (!mail) return;
    previousTemplate = structuredClone(mail.template);
    changeMail(mail);
    change(); render();
  }
  async function load() {
    loading = true;
    render();
    report('');
    try {
      const response = await request('automations');
      rows = response.rows; mailReady = response.mailReady; sampleName = response.sampleName || ''; taskScheduling = response.scheduler === 'tasks';
      loadFailed = false; loading = false;
      let pending;
      try { pending = JSON.parse(localStorage.getItem(key)); } catch { /* A damaged local draft cannot replace the server copy. */ }
      const row = editing && editorId !== 'new' ? rows.find(entry => entry.id === editorId) : null;
      if (row) {
        const local = pending?.id === row.id && pending.version === row.version ? pending : null;
        current = row; flow = normalizeFlow(local?.dirty ? local.flow : row.draft); flow.id = row.id;
        confirmation = row.status === 'active' && !local?.dirty;
        waitTest = local?.waitTest || null;
        stage = confirmation ? 4 : flow.stage; revision = local?.dirty ? 1 : 0; savedRevision = 0;
        if (revision) timer = setTimeout(()=>save().catch(()=>{}),1000);
      }
      render(); report('');
      if (confirmation) await loadMetrics();
    } catch (error) { loading = false; loadFailed = true; render(); report(error.message,true); }
  }
  result.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-list-search]')) {
      search = target.value;
      const table = result.querySelector('.auto-list');
      for (const row of table.querySelectorAll('tbody tr')) row.hidden = !row.textContent.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'));
      return;
    }
    if (!flow) return;
    if (target.dataset.flow) flow[target.dataset.flow] = target.value;
    if (target.dataset.mail) {
      const mail = selectedMail();
      if (target.dataset.mail === 'name') mail.name = target.value;
      else mail.template[target.dataset.mail] = target.value;
    }
    if (target.dataset.blockField) {
      const block = selectedMail()?.template.blocks[selectedBlock];
      if (block) block[target.dataset.blockField] = target.value;
      const paper = result.querySelector('[data-auto-paper]');
      if (paper) paper.innerHTML = mailPaper(selectedMail());
    }
    if (target.hasAttribute('data-wait-duration')) {
      const value = Number(target.value);
      if (Number.isInteger(value) && value >= 1 && value <= 365) flow.steps[Number(target.dataset.waitDuration)].duration = value;
    }
    if (target.matches('[data-flow],[data-mail],[data-block-field],[data-wait-duration]')) change();
  });
  result.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-list-status]')) { stateFilter = target.value; render(); return; }
    if (!flow) return;
    if (target.matches('[name=auto-trigger]')) { flow.trigger = target.value; change(); render(); }
    if (target.dataset.origin) {
      flow.origins = target.checked ? [...new Set([...flow.origins,target.dataset.origin])] : flow.origins.filter(origin=>origin!==target.dataset.origin);
      change(); render(); result.querySelector(`[data-origin="${target.dataset.origin}"]`)?.focus();
    }
    if (target.matches('[data-mail-select]')) { flow.selectedMail = target.value; selectedBlock = 0; change(); render(); }
    if (target.hasAttribute('data-wait-unit')) { flow.steps[Number(target.dataset.waitUnit)].unit = target.value; change(); }
  });
  result.addEventListener('click', async event => {
    const homeLink = event.target.closest('a[href="#marketing-automation"]');
    if (homeLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (busy) return;
      busy = true;
      try { await save(); location.hash = '#marketing-automation'; }
      catch (error) { report(error.message,true); }
      finally { busy = false; }
      return;
    }
    const target = event.target.closest('button');
    if (!target || target.disabled || busy) return;
    if (target.dataset.actions) {
      const menu = result.querySelector(`#auto-actions-${target.dataset.actions}`), bounds = target.getBoundingClientRect();
      menu.style.left = `${Math.max(12,Math.min(bounds.right-160,innerWidth-172))}px`;
      menu.style.top = `${Math.max(12,bounds.bottom+6+104>innerHeight ? bounds.top-110 : bounds.bottom+6)}px`;
      return;
    }
    try {
      target.closest('[popover]')?.hidePopover();
      const action = target.dataset.auto;
      if (target.dataset.device) { mobile = target.dataset.device === 'mobile'; render(); return; }
      if (target.hasAttribute('data-block')) { selectedBlock = Number(target.dataset.block); render(); result.querySelector('[data-block-field]')?.focus(); return; }
      busy = true;
      if (target.hasAttribute('data-stage')) await go(Number(target.dataset.stage));
      else if (target.dataset.starter) await create(target.dataset.starter);
      else if (target.dataset.open) await open(rows.find(row=>row.id===target.dataset.open));
      else if (target.dataset.delete) {
        const row=rows.find(row=>row.id===target.dataset.delete);
        if(!await ask(`¿Eliminar «${row.draft.name || 'Sin nombre'}»? Se detendrán sus envíos pendientes.`))return;
        const version=row.version || (await request('flow-save',{id:row.id,version:0,flow:row.draft})).row.version;
        await request('flow-delete',{id:row.id,version});rows=rows.filter(entry=>entry.id!==row.id);render();
      }
      else if (target.dataset.editMail) { flow.selectedMail = target.dataset.editMail; selectedBlock = 0; await go(3); }
      else if (target.hasAttribute('data-remove-step')) {
        const index = Number(target.dataset.removeStep);
        flow.steps.splice(index,1); flow.selectedMail = mails()[0]?.id || ''; change(); render();
      } else if (target.dataset.suggestion) { selectedMail().template.preheader=target.dataset.suggestion; change(); render(); }
      else if (target.dataset.addBlock) mutateMail(mail => {
        if(mail.template.blocks.length>=30)throw Error('Cada correo admite hasta 30 bloques.');
        mail.template.blocks.push({kind:target.dataset.addBlock,text:'',url:'',color:'#1c1a17',align:'left',space:16,font:'Montserrat'});
        selectedBlock=mail.template.blocks.length-1;
      });
      else if (target.dataset.insert) mutateMail(mail => {
        const kind=target.dataset.insert;
        if (mail.template.blocks.length>=30)throw Error('Cada correo admite hasta 30 bloques.');
        if (['shop','whatsapp'].includes(kind)) {
          mail.template.blocks.push({kind:'button',text:kind==='shop'?'Ver la tienda':'WhatsApp',url:kind==='shop'?'https://lifedecoart.com/productos':'https://wa.me/18495390410',color:'#1c1a17',align:'center',space:16});
          selectedBlock=mail.template.blocks.length-1;
        } else {
          let block=mail.template.blocks[selectedBlock];
          if(!block||!['text','columns'].includes(block.kind)){block={kind:'text',text:'',color:'#1c1a17',space:16};mail.template.blocks.push(block);selectedBlock=mail.template.blocks.length-1;}
          block.text=(block.text||'')+(kind==='name'?' {{nombre}}':' {{codigo}}');
        }
      });
      else if (action==='reload') await load();
      else if (action==='new') { if(flow)await save();location.hash='#marketing-automation/new'; }
      else if (action==='home') { if(flow)await save();location.hash='#marketing-automation'; }
      else if (action==='sequence') await go(2);
      else if (action==='edit') { confirmation=false; await go(flow.stage||1); }
      else if (action==='save') await save();
      else if (action==='add-wait'||action==='add-mail') {
        if(flow.steps.length>=30)throw Error('La secuencia admite hasta 30 pasos.');
        const step = action==='add-wait'?{id:id(),kind:'wait',duration:2,unit:'days'}:emptyMail(id());
        if(step.kind==='mail')step.name=`Correo ${mails().length+1}`;
        flow.steps.push(step);
        change(); render();
      } else if(action==='brand') mutateMail(mail=>{
        const brand=getState().settings.marketingBrand||{};
        const color=brand.colors?.[0];
        mail.template.headingFont='Montserrat';
        if(color){mail.template.brandColors=true;for(const block of mail.template.blocks)if(block.kind==='button')block.color=color;}
        for(const block of mail.template.blocks)block.font='Montserrat';
      });
      else if (action==='undo'&&previousTemplate) {
        selectedMail().template=previousTemplate;previousTemplate=null;selectedBlock=0;change();render();
      } else if (['block-up','block-down','block-delete'].includes(action)) mutateMail(mail=>{
        if(action==='block-delete'){mail.template.blocks.splice(selectedBlock,1);selectedBlock=Math.max(0,selectedBlock-1);}
        else {const index=selectedBlock+(action==='block-up'?-1:1);[mail.template.blocks[index],mail.template.blocks[selectedBlock]]=[mail.template.blocks[selectedBlock],mail.template.blocks[index]];selectedBlock=index;}
      });
      else if (action==='load-templates') { const response=await request('templates');copies=response.rows;templatesLoaded=true;render(); }
      else if (action==='reuse') mutateMail(mail=>{const index=Number(result.querySelector('[data-copy]').value);mail.template=normalizeFlow({...flow,steps:[{...mail,template:copies[index].template}]}).steps[0].template;selectedBlock=0;});
      else if (action==='save-copy') { await save(); await request('copy',{name:selectedMail().name||flow.name,template:selectedMail().template});report('Plantilla guardada.'); }
      else if (action==='metrics') await loadMetrics();
      else if (action==='wait-test') {
        await save();
        if(!await ask('¿Pausar esta automatización y enviar solo a tu correo una prueba después de un minuto?'))return;
        const response=await request('flow-wait-test',{id:current.id,version:current.version,template:selectedMail().template});
        current=response.row;rows[rows.findIndex(row=>row.id===current.id)]=current;waitTest=response.test;journal();render();
      }
      else if (action==='wait-test-status') { waitTest=await request('flow-wait-test-status',null,'',{id:waitTest.id});journal();render(); }
      else if (action==='process') { await request('flow-process',{});await loadMetrics(); }
      else if (action==='pause') { await save();const response=await request('flow-pause',{id:current.id,version:current.version});current=response.row;const idx=rows.findIndex(row=>row.id===current.id);rows[idx]=current;confirmation=false;stage=1;flow.stage=1;journal();render(); }
      else if (action==='activate') {
        await save();
        if(!await ask('¿Activar esta secuencia para los nuevos contactos que cumplan el disparador?'))return;
        const response=await request('flow-activate',{id:current.id,version:current.version});
        current=response.row;rows[rows.findIndex(row=>row.id===current.id)]=current;confirmation=true;metric=null;journal();render();await loadMetrics();
      } else if (action==='preview'||action==='test') {
        await save();
        const response=await request(action==='test'?'flow-test':'flow-preview',{template:selectedMail().template});
        if(action==='test')report('Prueba aceptada por Gmail.');
        else {const dialog=result.querySelector('dialog');const frame=document.createElement('iframe');frame.title='Correo final';frame.setAttribute('sandbox','');frame.srcdoc=response.html;dialog.querySelector('[data-final-mail]').replaceChildren(frame);dialog.showModal();}
      } else if (action==='close-preview') target.closest('dialog').close();
    } catch (error) { report(error.message,true); }
    finally { busy=false; }
  });
  result.addEventListener('toggle', event => {
    if (event.target.matches('.auto-saved-templates')) { templatesOpen = event.target.open; return; }
    if (!event.target.matches('.auto-actions-menu')) return;
    result.querySelector(`[popovertarget="${event.target.id}"]`)?.setAttribute('aria-expanded',String(event.newState === 'open'));
  }, true);
  const unload = event => { if(root.isConnected&&revision!==savedRevision){journal();event.preventDefault();event.returnValue='';} };
  window.addEventListener('beforeunload',unload);
  const cleanup = new MutationObserver(()=>{if(!root.isConnected){window.removeEventListener('beforeunload',unload);clearTimeout(timer);cleanup.disconnect();}});
  cleanup.observe(root.parentNode,{childList:true});
  load();
}
