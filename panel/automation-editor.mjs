import { triggerOptions, originOptions, flowStages, starter, emptyMail, normalizeFlow, flowChecks, sequenceLabel, precedingWaits, deliveryTiming, https } from './automation-model.mjs';
import { syncReturnHeader } from './panel-layout.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const dateLabel = value => value ? new Date(value).toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit', timeZone:'America/Santo_Domingo' }) : '';
const testTime = value => `<time datetime="${escape(value || '')}">${value ? escape(new Date(value).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Santo_Domingo'})) : '—'}</time>`;
const triggerLabel = flow => triggerOptions.find(([key]) => key === flow.trigger)?.[1] || '';
const stateLabel = row => ({ active:'Activa', paused:'Pausada', draft:'Borrador' })[row?.status] || 'Borrador';
const id = () => crypto.randomUUID();
const originText = key => originOptions.find(([value]) => key === value)?.[1] || key;
const selectOptions = (values, selected) => values.map(([value, label]) => `<option value="${escape(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escape(label)}</option>`).join('');

export function bindAutomations(root, request, report, ask, { user, icon, getState, contentOf, blockLabels, store }) {
  const result = root.querySelector('[data-marketing-result]');
  const workspace = root.closest('.home-workspace');
  const headerReturn = event => {
    if (event.target.closest('.section-action-header a[href="#marketing-automation"]')) return returnToList(event);
  };
  workspace?.addEventListener('click', headerReturn);
  const key = `lda-automation-draft:${user.uid}`;
  const editorId = location.hash.slice(1).split('/')[1] || '';
  const editing = Boolean(editorId);
  let rows = [], current = null, flow = null, stage = 1, selectedBlock = 0;
  let mobile = false, sampleName = '', mailReady = false, metric = null, confirmation = false;
  let revision = 0, savedRevision = 0, timer, saving, busy = false, loadFailed = false;
  let previousTemplate = null, copies = [], templatesLoaded = false, templatesOpen = false, search = '', stateFilter = '';
  let conflict = false, loading = true;
  let taskScheduling = false, waitTest = null;
  let timingOpen = '';
  let testDetailsOpen = false;
  let mailTool = 'content', nameEditing = false;
  let richRange = null;
  let imageOpen = false;
  let uploadingImage = '';
  const journal = () => {
    try { localStorage.setItem(key, JSON.stringify({ id: current?.id, version: current?.version || 0, flow, stage, waitTest, dirty: revision !== savedRevision })); }
    catch { /* Server saving remains available when browser storage is full. */ }
  };
  const badge = () => !current || current.status === 'draft' ? '' : `<span class="mkt-status${current.status === 'active' ? ' is-active' : ''}">${stateLabel(current)}</span>`;
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
  const stepper = () => `<nav class="auto-stepper" aria-label="Pasos de la automatización">${flowStages.map((label,index)=>{
    const number=index+1;
    return `<button type="button" data-stage="${number}" aria-label="${number}. ${label}" ${stage===number?'aria-current="step"':''} ${!flow?'disabled':''}><span class="auto-step-number" aria-hidden="true">${number}</span><span>${label}</span></button>`;
  }).join('')}</nav>`;
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
  function triggerScreen() {
    const details = {
      subscription: '',
      purchase: 'Se detectan las facturas emitidas del Hub. El contacto debe tener una suscripción activa.',
      delivered: 'Se detectan los pedidos marcados como entregados en el Hub. El contacto debe tener una suscripción activa.',
      birthday: 'Solo entran clientas con una fecha de cumpleaños registrada. El formulario actual de Clientes aún no recoge ese dato.',
      inactive: 'Se revisa la última factura emitida de clientas con suscripción activa.',
    };
    return `<section class="auto-trigger-screen" aria-label="Disparador de la automatización"><header class="auto-trigger-heading"><h2>Disparador</h2>${badge()}</header><label class="auto-field auto-trigger-name">Nombre de la automatización<input data-flow="name" maxlength="100" value="${escape(flow.name)}"></label>
      <fieldset class="auto-triggers" ${details[flow.trigger]?'aria-describedby="auto-trigger-description"':''}><legend>¿Qué activa esta automatización?</legend><div class="auto-trigger-options">${triggerOptions.map(([value,label]) =>
        `<label><input type="radio" name="auto-trigger" value="${value}" ${flow.trigger === value ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>
      ${details[flow.trigger]?`<p class="auto-muted auto-trigger-description" id="auto-trigger-description">${details[flow.trigger]}</p>`:''}
      ${flow.trigger === 'subscription' ? `<fieldset class="auto-origins"><legend>Orígenes de suscripción</legend><div class="auto-origin-options">${originOptions.map(([value,label]) => {
        const [place, name] = label.split(' «');
        return `<label><input type="checkbox" aria-label="${escape(label)}" data-origin="${value}" ${flow.origins.includes(value) ? 'checked' : ''}><span><strong>${escape(place)}</strong><span>${name ? '«'+escape(name) : ''}</span></span></label>`;
      }).join('')}</div>${!flow.origins.length ? '<p class="auto-origin-warning" role="status">Elige al menos un origen para activar esta automatización.</p>' : ''}</fieldset>` : ''}
      ${flow.trigger === 'inactive' ? `<label class="auto-field auto-trigger-inactive">Días sin comprar<input type="number" data-flow="inactiveDays" min="1" max="730" value="${flow.inactiveDays}"></label>` : ''}</section>`;
  }
  function timeline() {
    const units={minutes:['minuto','minutos'],hours:['hora','horas'],days:['día','días']};
    return `<ol class="auto-flow-summary" aria-label="Resumen del flujo"><li><strong>${triggerLabel(flow)}</strong><p>${flow.trigger==='subscription'?flow.origins.map(originText).join(' · ')||'Elige al menos un origen':'Contacto con suscripción activa'}</p></li>${flow.steps.map(step=>step.kind==='wait'
      ? `<li class="auto-flow-wait"><strong>Esperar ${step.duration} ${units[step.unit][step.duration===1?0:1]}</strong>${step.time?`<p>A las ${escape(step.time)} · República Dominicana</p>`:''}</li>`
      : `<li><strong>${escape(step.name||'Correo')}</strong><p>${escape(step.template.subject||'Correo sin asunto')}</p></li>`).join('')}</ol>`;
  }
  function sequenceScreen() {
    return `<section class="auto-sequence-screen" aria-label="Secuencia de la automatización"><header class="auto-sequence-heading"><h2>Secuencia</h2>${badge()}</header>${sequenceTimeline()}<div class="auto-sequence-add">${button(`${icon('plus')} Añadir correo`,'add-mail')}</div></section>`;
  }
  function timingEditor(mail,index) {
    const waits=precedingWaits(flow.steps,index);
    return `<div class="auto-timing-editor" aria-label="Cuándo se envía ${escape(mail.name || 'el correo')}"><label class="auto-field">Cuándo sale<select data-timing-mode="${mail.id}" aria-label="Cuándo sale ${escape(mail.name||'el correo')}">${selectOptions([['now',waits.start===0?'Al instante':'Justo después del correo anterior'],['wait','Esperar…']],waits.steps.length?'wait':'now')}</select></label>${waits.steps.map((wait,offset)=>`<div class="auto-timing-fields"><label class="auto-field">Cantidad<input type="number" min="1" max="365" data-wait-duration="${waits.start+offset}" aria-label="Duración antes de ${escape(mail.name || 'correo')} ${offset+1}" value="${wait.duration}"></label><label class="auto-field">Unidad<select data-wait-unit="${waits.start+offset}" aria-label="Unidad antes de ${escape(mail.name || 'correo')} ${offset+1}">${selectOptions([['minutes','Minutos'],['hours','Horas'],['days','Días']],wait.unit)}</select></label>${wait.unit==='days'?`<label class="auto-field">A las (opcional)<input type="time" data-wait-time="${waits.start+offset}" value="${wait.time||''}"></label>`:''}</div>`).join('')}${waits.steps.some(wait=>wait.unit==='days')?'<p class="auto-muted">Hora de República Dominicana.</p>':''}<div class="auto-timing-actions">${button('Listo','timing-done')}</div></div>`;
  }
  function sequenceTimeline() {
    const mailSteps=mails();
    const lastMail=flow.steps.findLastIndex(step=>step.kind==='mail');
    const pending=flow.steps.slice(lastMail+1).filter(step=>step.kind==='wait');
    return `<ol class="auto-timeline auto-sequence-list" aria-label="Orden de la secuencia"><li><span class="auto-sequence-marker" aria-hidden="true">${icon('flow')}</span><strong>Disparador</strong><p>${triggerLabel(flow)}</p></li>${mailSteps.map((mail,number)=>{const index=flow.steps.indexOf(mail);return `<li class="auto-sequence-mail-group"><button type="button" class="auto-timing-toggle" data-timing="${mail.id}" aria-expanded="${timingOpen===mail.id}">${icon('clock')}<span data-mail-timing="${index}">${deliveryTiming(flow.steps,index)}</span>${icon('chevron')}</button>${timingOpen===mail.id?timingEditor(mail,index):''}<div class="auto-sequence-mail-card"><span class="auto-sequence-marker" aria-hidden="true">${number+1}</span><button type="button" class="auto-mail-card-target" data-edit-mail="${mail.id}" aria-label="Editar ${escape(mail.name||'correo')}"></button><div class="auto-node-head"><strong>${escape(mail.name||'Correo')}</strong>${!mail.template.subject.trim()?'<span class="auto-muted auto-mail-incomplete">Falta asunto</span>':''}<button type="button" class="mkt-contact-actions auto-step-actions" data-sequence-menu popovertarget="auto-mail-actions-${number}" aria-expanded="false" aria-label="Acciones de ${escape(mail.name||'correo')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button><div popover id="auto-mail-actions-${number}" class="auto-actions-menu"><button type="button" data-edit-mail="${mail.id}">Editar contenido</button><button type="button" data-duplicate-mail="${mail.id}">Duplicar</button>${mailSteps.length>1?`<button type="button" data-delete-mail="${mail.id}">Eliminar</button>`:''}</div></div><p>${escape(mail.template.subject||'Asunto pendiente')}</p></div></li>`}).join('')}${pending.length?`<li><strong>Espera pendiente</strong><p>${pending.map(wait=>`${wait.duration} ${{minutes:'minutos',hours:'horas',days:'días'}[wait.unit]}`).join(' + ')}</p><p class="auto-muted">Se aplicará al próximo correo que añadas.</p></li>`:''}</ol>`;
  }
  function refreshSequenceTiming() {
    for (const label of result.querySelectorAll('[data-mail-timing]')) label.textContent = deliveryTiming(flow.steps,Number(label.dataset.mailTiming));
  }
  function affectedMails(key) {
    return mails().filter(mail=>key==='subject'?!mail.template.subject.trim()||/[\r\n]/.test(mail.template.subject):key==='preheader'?!mail.template.preheader.trim():key==='blocks'?!mail.template.blocks.some(block=>block.kind==='image'||block.text?.trim()):key==='links'?mail.template.blocks.some(block=>['image','button'].includes(block.kind)&&!https(block.url)):false);
  }
  function mailPaper(mail) {
    const personalize = value => String(value || '').replace(/\{\{\s*(nombre|name|codigo)\s*\}\}/g, (_all, variable) => variable === 'codigo' ? 'LDA10' : '{{nombre}}');
    return `<div class="mkt-email-paper auto-paper ${mobile ? 'is-mobile' : ''}">${mail.template.hideBrandName?'':'<div class="mkt-email-intro"><span class="mkt-email-title">Life Deco Art</span></div>'}
      ${mail.template.blocks.map((block,index) => `<button type="button" class="mkt-block" data-block="${index}" aria-label="Editar ${blockLabels[block.kind]}, bloque ${index + 1}" aria-pressed="${index === selectedBlock}"
        style="color:${block.color};text-align:${block.align};margin-bottom:${block.space || 16}px">${block.kind==='text'?richHTML(block,personalize):contentOf({...block,text:personalize(block.text),secondary:personalize(block.secondary)},block.kind,mail.template.brandColors)}</button>`).join('')}
      <div class="mkt-email-footer">Cancelar suscripción</div></div>`;
  }
  function inspector(mail) {
    const block = mail.template.blocks[selectedBlock];
    if (!block) return '<p class="auto-muted">Agrega un bloque para editar su contenido.</p>';
    const field = (label, key, type = 'text') => `<label class="auto-field">${label}<input type="${type}" data-block-field="${key}" value="${escape(block[key] || '')}"></label>`;
    return `<div class="auto-block-editor"><h3>${mailTool==='design'?'Diseño del bloque:':'Editar bloque:'} ${blockLabels[block.kind]}</h3>
      <div ${mailTool==='design'?'hidden':''}>${['text','button','columns'].includes(block.kind) ? `<label class="auto-field">${block.kind === 'button' ? 'Texto del botón' : 'Texto'}<textarea data-block-field="text" maxlength="3000">${escape(block.text)}</textarea></label>` : ''}
      ${block.kind === 'columns' ? `<label class="auto-field">Segunda columna<textarea data-block-field="secondary" maxlength="3000">${escape(block.secondary)}</textarea></label>` : ''}
      ${['image','button'].includes(block.kind) ? field('Enlace HTTPS','url','url') : ''}${block.kind === 'image' ? field('Texto alternativo','alt') : ''}
      </div><div class="auto-block-controls" ${mailTool==='content'?'hidden':''}>${block.kind !== 'divider' ? field('Color','color','color') : ''}
        <label class="auto-field">Alineación<select data-block-field="align" aria-label="Alineación">${selectOptions([['left','Izquierda'],['center','Centro'],['right','Derecha']],block.align)}</select></label>
        <label class="auto-field">Espacio inferior<select data-block-field="space" aria-label="Espacio inferior">${selectOptions([[8,'8 px'],[16,'16 px'],[24,'24 px'],[32,'32 px']],block.space || 16)}</select></label></div>
      <div class="auto-inline-actions"><button type="button" data-auto="block-up" ${selectedBlock === 0 ? 'disabled' : ''}>Subir</button><button type="button" data-auto="block-down" ${selectedBlock >= mail.template.blocks.length - 1 ? 'disabled' : ''}>Bajar</button>
        <button type="button" data-auto="block-delete">Eliminar bloque</button>${previousTemplate ? '<button type="button" data-auto="undo">Deshacer</button>' : ''}</div></div>`;
  }
  const primaryText = mail => mail?.template.blocks.find(block=>block.kind==='text');
  const primaryButton = mail => mail?.template.blocks.find(block=>block.kind==='button');
  const primaryImage = mail => mail?.template.blocks[selectedBlock]?.kind==='image'?mail.template.blocks[selectedBlock]:mail?.template.blocks.find(block=>block.kind==='image');
  function richHTML(block, personalize=value=>value) {
    return (block?.runs || [{text:block?.text||''}]).map(run=>{
      let value=escape(personalize(run.text)).replace(/\n/g,'<br>');
      if(run.bold)value=`<strong>${value}</strong>`;
      if(run.italic)value=`<em>${value}</em>`;
      if(https(run.url))value=`<a href="${escape(https(run.url))}">${value}</a>`;
      return value;
    }).join('');
  }
  function readRichEditor(editor) {
    const runs=[];
    const visit=(node,style={})=>{
      if(node.nodeType===3){if(node.textContent)runs.push({text:node.textContent,...style});return;}
      if(node.nodeType!==1)return;
      if(node.tagName==='BR'){runs.push({text:'\n'});return;}
      const next={...style};
      if(['STRONG','B'].includes(node.tagName)||Number(node.style.fontWeight)>=600)next.bold=true;
      if(['EM','I'].includes(node.tagName)||node.style.fontStyle==='italic')next.italic=true;
      if(node.tagName==='A'&&https(node.getAttribute('href')))next.url=https(node.getAttribute('href'));
      if(['DIV','P'].includes(node.tagName)&&runs.length&&runs.at(-1).text.slice(-1)!=='\n')runs.push({text:'\n'});
      for(const child of node.childNodes)visit(child,next);
    };
    for(const child of editor.childNodes)visit(child);
    const text=runs.map(run=>run.text).join('');
    if(text.length>3000||runs.length>500){editor.innerHTML=richHTML(primaryText(selectedMail()));report('El texto admite hasta 3000 caracteres.',true);return;}
    const mail=selectedMail();let block=primaryText(mail);
    if(!block){if(mail.template.blocks.length>=30){report('Cada correo admite hasta 30 bloques.',true);return;}block={kind:'text',text:'',color:'#1c1a17',align:'left',space:16,font:'Montserrat'};mail.template.blocks.unshift(block);}
    block.text=text;block.runs=runs;change();
    const paper=result.querySelector('[data-auto-paper]');if(paper)paper.innerHTML=mailPaper(mail);
  }
  function mailScreen() {
    const mail=selectedMail();
    if(!mail)return panel('Contenido',`<p>Agrega un correo a la secuencia para editarlo.</p>${button('Ir a Secuencia','sequence')}`);
    const textBlock=primaryText(mail), cta=primaryButton(mail), picture=primaryImage(mail);
    const extras=mail.template.blocks.filter(block=>block!==textBlock&&block!==cta&&block!==picture);
    const uploadControl=(role,label)=>`<div class="auto-image-upload"><button type="button" data-auto="upload-image" data-upload-role="${role}" data-form-action="secondary" ${uploadingImage?'disabled':''}>${uploadingImage===role?'Subiendo imagen…':label}</button><input type="file" data-image-file="${role}" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>`;
    return `<section class="auto-mail-screen auto-compose" aria-label="Editor de correo"><h2>Contenido</h2>
      <div class="auto-compose-mails" role="group" aria-label="Correos de la secuencia">${mails().map((entry,index)=>`<button type="button" data-mail-tab="${entry.id}" aria-pressed="${entry.id===mail.id}">${index+1}. ${escape(entry.name||'Correo')}</button>`).join('')}</div>
      <div class="auto-compose-grid"><section class="auto-compose-fields" aria-label="Contenido del correo">
        <label class="auto-field">Asunto<input maxlength="150" data-mail="subject" value="${escape(mail.template.subject)}"></label>
        <label class="auto-field"><span>Texto de vista previa <span class="auto-muted">(opcional)</span></span><input maxlength="150" data-mail="preheader" value="${escape(mail.template.preheader)}"></label>
        <div class="auto-field"><label id="auto-text-label">Texto del correo</label><div class="auto-rich-shell"><div class="auto-rich-toolbar" role="toolbar" aria-label="Formato del texto"><button type="button" data-rich="bold" aria-label="Negrita"><strong>B</strong></button><button type="button" data-rich="italic" aria-label="Cursiva"><em>I</em></button><button type="button" data-rich="link" aria-label="Insertar enlace">${icon('link')}</button><button type="button" class="auto-insert-name" data-rich="name">Insertar nombre</button></div>
        <div class="auto-rich-link" hidden><label class="auto-field">Enlace HTTPS<input type="url" data-rich-url placeholder="https://"></label><button type="button" data-rich="apply-link">Aplicar</button><button type="button" data-rich="cancel-link">Cancelar</button></div>
        <div class="auto-rich-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="auto-text-label" data-rich-editor>${richHTML(textBlock)}</div></div></div>
        ${picture?`<section class="auto-compose-image" aria-label="Imagen del correo"><div class="auto-image-heading"><h3>Imagen <span class="auto-muted">(opcional)</span></h3><button type="button" data-auto="remove-image" data-form-action="text">Eliminar imagen</button></div>${uploadControl('content','Subir desde mi computadora')}<label class="auto-field">Enlace de la imagen<input type="url" maxlength="1200" data-simple-image="url" value="${escape(picture.url)}" placeholder="https://"></label><label class="auto-field">Texto alternativo<input maxlength="150" data-simple-image="alt" value="${escape(picture.alt||'')}"></label></section>`:''}
        <div class="auto-compose-button"><h3>Botón <span class="auto-muted">(opcional)</span></h3><div><label class="auto-field">Texto del botón<input maxlength="150" data-simple-button="text" value="${escape(cta?.text||'')}"></label><label class="auto-field">Enlace<input type="url" maxlength="1200" data-simple-button="url" value="${escape(cta?.url||'')}" placeholder="https://"></label></div></div>
        ${extras.length?`<details class="auto-compose-extras"><summary>Más contenido${icon('chevron')}</summary><ol class="auto-mail-blocks">${extras.map(block=>{const index=mail.template.blocks.indexOf(block);return `<li><button type="button" data-block="${index}">${blockLabels[block.kind]} ${index+1}</button></li>`}).join('')}</ol><div data-auto-inspector>${inspector(mail)}</div></details>`:''}
      </section><section class="auto-preview" aria-label="Vista previa del correo"><header class="auto-preview-heading"><h3>Vista previa</h3><div class="auto-inline-actions auto-preview-size" role="group" aria-label="Tamaño de vista previa"><button type="button" data-device="desktop" aria-pressed="${!mobile}">Escritorio</button><button type="button" data-device="mobile" aria-pressed="${mobile}">Móvil</button></div><button type="button" data-auto="preview" class="auto-icon-button" aria-label="Ampliar vista previa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg></button></header>
        <div class="mkt-stage-scroll" data-auto-paper>${mailPaper(mail)}</div>
      </section></div></section>`;
  }
  function reviewScreen() {
    const checks = flowChecks(flow);
    const required = checks.filter(check => !check.ok && !check.warning);
    const optional = checks.filter(check => !check.ok && check.warning);
    const checkLabels = {name:'Añadir nombre',origin:'Seleccionar orígenes',mail:'Añadir un correo',subject:'Añadir asunto',blocks:'Completar contenido',links:'Corregir enlaces'};
    const checkRows = entries => entries.map(check => `<li class="${check.ok?'is-ok':check.warning?'is-warning':'is-error'}"><span role="img" aria-label="${check.ok?'Completado':check.warning?'Opcional':'Pendiente'}">${check.ok?icon('check'):'!'}</span><div>${checkLabels[check.key]&&!check.ok?checkLabels[check.key]:check.label}${!check.ok&&affectedMails(check.key).length?`<small class="auto-check-note">${affectedMails(check.key).map(mail=>escape(mail.name||'Correo')).join(', ')}</small>`:''}${check.warning?'<small class="auto-check-note">Opcional · no impide activar</small>':''}</div>${!check.ok?`<button type="button" data-check="${check.key}" data-stage="${check.stage}">Corregir <span aria-hidden="true">→</span></button>`:''}</li>`).join('');
    const pending = checks.some(check => !check.ok && !check.warning);
    const readiness = !mailReady ? 'El buzón necesita configuración antes de activar.'
      : current.status === 'active' ? 'Los cambios están listos para publicar.' : `Todo está listo para activar. El envío ${current.status === 'paused' ? 'seguirá pausado' : 'seguirá desactivado'} hasta que pulses Activar.`;
    return `<section class="auto-review-screen" aria-label="Revisión de la automatización"><header class="auto-review-heading"><div><h2>Revisar y activar</h2><p class="auto-muted">${escape(flow.name)}</p></div>${badge()}</header>
      <div class="auto-review-overview"><h3>Resumen del flujo</h3>${timeline()}</div>
      <div class="auto-review-grid"><section class="auto-review-checklist" aria-label="Comprobaciones"><h3 class="auto-pending-heading">${required.length?'Pendiente para activar':'Todo listo para activar'}<span class="auto-pending-count">${required.length}</span></h3>
      <p class="auto-review-intro">${required.length?'Completa los datos pendientes para activar.':'Las comprobaciones obligatorias están completas.'}</p><ul class="auto-checks auto-pending-checks">${checkRows(required)}</ul>
      ${optional.length?`<div class="auto-review-optional"><ul class="auto-checks">${checkRows(optional)}</ul></div>`:''}
      <details class="auto-completed-checks"><summary>Comprobaciones completadas ${icon('chevron')}</summary><ul class="auto-checks">${checkRows(checks.filter(check=>check.ok))}</ul></details>
      ${!pending || !mailReady?`<p class="auto-review-readiness" role="status">${readiness}</p>`:''}</section>
      <section class="auto-review-testing" aria-label="Pruebas del correo"><h3>Revisar el correo</h3><div class="auto-review-mail" ${mails().length<=1?'hidden':''}><label class="auto-field">Correo a revisar<select data-mail-select aria-label="Correo de la secuencia">${selectOptions(mails().map(mail => [mail.id,mail.name || mail.template.subject || 'Correo']),flow.selectedMail)}</select></label>
        </div><div class="auto-review-test-actions">${button('Vista previa','preview',false,selectedMail() ? '' : 'disabled')}${button('Enviar prueba','test',false,mailReady && selectedMail() ? '' : 'disabled')}</div>
        <p class="auto-muted auto-review-test-note">Destino de prueba: tu correo de administración.</p>
        </section></div></section>`;
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
    const screen = !editing ? home() : !flow ? '' : confirmation ? confirmedScreen()
      : stage <= 1 ? triggerScreen() : stage === 2 ? sequenceScreen() : stage === 3 ? mailScreen() : reviewScreen();
    result.innerHTML = `<section class="auto-workspace">${editing ? `<a class="sales-back auto-back" href="#marketing-automation">← Volver a automatizaciones</a><div class="auto-editor-layout">${stepper()}<div class="auto-editor-content">${screen}</div></div>` : screen}
      ${editing && flow && !confirmation ? `<footer class="auto-footer">
        <span role="status" data-auto-saved>${revision === savedRevision && current.savedAt ? `Borrador guardado ${dateLabel(current.savedAt)}` : 'Cambios pendientes'}</span>
        <div>
        ${stage>1?`<button type="button" data-stage="${stage-1}" data-form-action="secondary">Atrás</button>`:button('Atrás','home')}
        ${stage < 4 ? `<button type="button" data-stage="${stage+1}" data-form-action="primary">Continuar</button>` :
          button(current.status === 'active' ? 'Publicar cambios' : 'Activar', 'activate', true, !mailReady || flowChecks(flow).some(c=>!c.ok&&!c.warning) ? 'disabled' : '')}</div></footer>` : ''}
      <dialog class="confirm-dialog auto-final-preview" aria-label="Vista final del correo"><button type="button" data-auto="close-preview" aria-label="Cerrar vista previa">×</button><div data-final-mail></div></dialog></section>`;
    syncReturnHeader(root.closest('.home-workspace'));
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
      if (editing && editorId === 'new') { await create('blank'); return; }
      let pending;
      try { pending = JSON.parse(localStorage.getItem(key)); } catch { /* A damaged local draft cannot replace the server copy. */ }
      const row = editing && editorId !== 'new' ? rows.find(entry => entry.id === editorId) : null;
      if (row) {
        const local = pending?.id === row.id && pending.version === row.version ? pending : null;
        current = row; flow = normalizeFlow(local?.dirty ? local.flow : row.draft); flow.id = row.id;
        confirmation = row.status === 'active' && !local?.dirty;
        waitTest = local?.waitTest || null;
        testDetailsOpen = Boolean(waitTest);
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
    if(target.matches('[data-rich-editor]')){readRichEditor(target);return;}
    if(target.dataset.simpleImage){
      const mail=selectedMail();let block=primaryImage(mail);
      if(!block){if(mail.template.blocks.length>=30){report('Cada correo admite hasta 30 bloques.',true);return;}block={kind:'image',url:'',alt:'',color:'#1c1a17',align:'center',space:16,font:'Montserrat'};const cta=primaryButton(mail);mail.template.blocks.splice(cta?mail.template.blocks.indexOf(cta):mail.template.blocks.length,0,block);}
      block[target.dataset.simpleImage]=target.value;
      change();const paper=result.querySelector('[data-auto-paper]');if(paper)paper.innerHTML=mailPaper(mail);return;
    }
    if(target.dataset.simpleButton){
      const mail=selectedMail();let block=primaryButton(mail);
      if(!block){if(mail.template.blocks.length>=30){report('Cada correo admite hasta 30 bloques.',true);return;}block={kind:'button',text:'',url:'',color:'#DCC9B4',align:'center',space:16,font:'Montserrat'};mail.template.brandColors=true;mail.template.blocks.push(block);}
      block[target.dataset.simpleButton]=target.value;
      if(!block.text.trim()&&!block.url.trim())mail.template.blocks.splice(mail.template.blocks.indexOf(block),1);
      change();const paper=result.querySelector('[data-auto-paper]');if(paper)paper.innerHTML=mailPaper(mail);return;
    }
    if (target.dataset.flow) flow[target.dataset.flow] = target.value;
    if (target.dataset.mail) {
      const mail = selectedMail();
      if (target.dataset.mail === 'name') mail.name = target.value;
      else mail.template[target.dataset.mail] = target.value;
    }
    if (target.dataset.blockField) {
      const block = selectedMail()?.template.blocks[selectedBlock];
      if (block) {block[target.dataset.blockField] = target.value;if(target.dataset.blockField==='text')delete block.runs;}
      const paper = result.querySelector('[data-auto-paper]');
      if (paper) paper.innerHTML = mailPaper(selectedMail());
    }
    if (target.hasAttribute('data-wait-duration')) {
      const value = Number(target.value);
      if (Number.isInteger(value) && value >= 1 && value <= 365) flow.steps[Number(target.dataset.waitDuration)].duration = value;
      refreshSequenceTiming();
    }
    if (target.hasAttribute('data-wait-time')) {
      flow.steps[Number(target.dataset.waitTime)].time=target.value;
      refreshSequenceTiming();change();
    }
    if (target.matches('[data-flow],[data-mail],[data-block-field],[data-wait-duration]')) change();
  });
  result.addEventListener('change', async event => {
    const target = event.target;
    if (target.matches('[data-list-status]')) { stateFilter = target.value; render(); return; }
    if (!flow) return;
    if(target.dataset.imageFile){
      const file=target.files?.[0],role=target.dataset.imageFile;
      if(!file||busy)return;
      if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>=15*1024*1024){target.value='';report('Selecciona una imagen PNG, JPG, WebP o GIF de menos de 15 MB.',true);return;}
      const mail=selectedMail();
      if((role==='header'||!primaryImage(mail))&&mail.template.blocks.length>=30){report('Cada correo admite hasta 30 bloques.',true);return;}
      busy=true;uploadingImage=role;report('');render();
      try{
        const asset=await store.uploadEmailImage(file);
        if(!https(asset.url))throw Error('No se pudo obtener el enlace de la imagen.');
        let picture=role==='header'?null:primaryImage(mail);
        if(!picture){picture={kind:'image',url:'',alt:'',align:'center',color:'#1c1a17',space:16,font:'Montserrat'};const cta=primaryButton(mail);mail.template.blocks.splice(role==='header'?0:cta?mail.template.blocks.indexOf(cta):mail.template.blocks.length,0,picture);}
        picture.url=asset.url;picture.alt=picture.alt||file.name.replace(/\.[^.]+$/,'').slice(0,150);
        selectedBlock=mail.template.blocks.indexOf(picture);imageOpen=true;
        if(role==='header')mail.template.hideBrandName=true;
        change();await save();
      }catch(error){report(error.message,true);}
      finally{busy=false;uploadingImage='';render();}
      return;
    }
    if(target.matches('[data-hide-brand]')){selectedMail().template.hideBrandName=!target.checked;change();render();return;}
    if (target.matches('[name=auto-trigger]')) { flow.trigger = target.value; change(); render(); }
    if (target.dataset.origin) {
      flow.origins = target.checked ? [...new Set([...flow.origins,target.dataset.origin])] : flow.origins.filter(origin=>origin!==target.dataset.origin);
      change(); render(); result.querySelector(`[data-origin="${target.dataset.origin}"]`)?.focus();
    }
    if (target.matches('[data-mail-select]')) { flow.selectedMail = target.value; selectedBlock = 0; change(); render(); }
    if (target.hasAttribute('data-wait-unit')) { const wait=flow.steps[Number(target.dataset.waitUnit)];wait.unit=target.value;if(wait.unit!=='days')delete wait.time;change(); render(); }
    if (target.hasAttribute('data-timing-mode')) {
      const index=flow.steps.findIndex(step=>step.id===target.dataset.timingMode), waits=precedingWaits(flow.steps,index);
      if(target.value==='now')flow.steps.splice(waits.start,index-waits.start);
      else if(!waits.steps.length){if(flow.steps.length>=30){report('La secuencia admite hasta 30 pasos.',true);return;}flow.steps.splice(index,0,{id:id(),kind:'wait',duration:2,unit:'days'});}
      change();render();
    }
  });
  async function returnToList(event) {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (busy) return;
      busy = true;
      try { await save(); location.hash = '#marketing-automation'; }
      catch (error) { report(error.message,true); }
      finally { busy = false; }
    }
  }
  const rememberRichSelection=()=>{
    const selection=window.getSelection(),editor=result.querySelector('[data-rich-editor]');
    if(editor&&selection?.rangeCount&&editor.contains(selection.anchorNode)&&editor.contains(selection.focusNode))richRange=selection.getRangeAt(0).cloneRange();
  };
  result.addEventListener('mouseup',rememberRichSelection);
  result.addEventListener('keyup',rememberRichSelection);
  result.addEventListener('mousedown',event=>{
    if(event.target.closest('[data-rich]')){rememberRichSelection();event.preventDefault();}
  });
  result.addEventListener('paste',event=>{
    if(!event.target.closest('[data-rich-editor]'))return;
    event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));
  });
  result.addEventListener('click', async event => {
    const homeLink = event.target.closest('a[href="#marketing-automation"]');
    if (homeLink) { await returnToList(event); return; }
    const target = event.target.closest('button');
    if (!target || target.disabled || busy) return;
    if(target.dataset.rich){
      const editor=result.querySelector('[data-rich-editor]'),kind=target.dataset.rich;
      const panel=result.querySelector('.auto-rich-link');
      if(kind==='cancel-link'){panel.hidden=true;return;}
      if(kind==='link'){panel.hidden=false;panel.querySelector('input').focus();return;}
      const url=kind==='apply-link'?https(result.querySelector('[data-rich-url]').value):'';
      if(kind==='apply-link'&&!url){report('Añade un enlace HTTPS válido.',true);return;}
      editor.focus();const selection=window.getSelection();
      if(richRange&&editor.contains(richRange.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(richRange);}
      if(!selection.rangeCount||!editor.contains(selection.anchorNode)){const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);selection.removeAllRanges();selection.addRange(range);}
      if(kind==='name')document.execCommand('insertText',false,'{{nombre}}');
      else if(kind==='apply-link'){if(selection.isCollapsed)document.execCommand('insertHTML',false,`<a href="${escape(url)}">${escape(url)}</a>`);else document.execCommand('createLink',false,url);panel.hidden=true;}
      else document.execCommand(kind,false,null);
      readRichEditor(editor);rememberRichSelection();return;
    }
    if (target.dataset.actions || target.hasAttribute('data-sequence-menu')) {
      const menu = result.querySelector(`#${target.getAttribute('popovertarget')}`), bounds = target.getBoundingClientRect();
      const height=menu.querySelectorAll('button').length*44+12;
      menu.style.left = `${Math.max(12,Math.min(bounds.right-160,innerWidth-172))}px`;
      menu.style.top = `${Math.max(12,bounds.bottom+6+height>innerHeight ? bounds.top-height-6 : bounds.bottom+6)}px`;
      return;
    }
    try {
      target.closest('[popover]')?.hidePopover();
      const action = target.dataset.auto;
      if(action==='upload-image'){result.querySelector(`[data-image-file="${target.dataset.uploadRole}"]`)?.click();return;}
      if(target.hasAttribute('data-edit-image')){selectedBlock=Number(target.dataset.editImage);imageOpen=true;render();result.querySelector('[data-simple-image=url]')?.focus();return;}
      if(action==='show-image'){imageOpen=true;render();result.querySelector('[data-simple-image=url]')?.focus();return;}
      if(action==='remove-image'){const mail=selectedMail(),picture=primaryImage(mail);if(picture){previousTemplate=structuredClone(mail.template);mail.template.blocks.splice(mail.template.blocks.indexOf(picture),1);change();}imageOpen=false;render();return;}
      if (target.dataset.device) { mobile = target.dataset.device === 'mobile'; render(); return; }
      if (target.dataset.mailTool) { mailTool=target.dataset.mailTool;render();return; }
      if (action==='rename-mail') { nameEditing=!nameEditing;render();if(nameEditing)result.querySelector('[data-mail=name]')?.focus();return; }
      if (target.hasAttribute('data-block')) { selectedBlock = Number(target.dataset.block); render(); result.querySelector('[data-block-field]')?.focus(); return; }
      busy = true;
      if(target.hasAttribute('data-move-block')){
        const index=Number(target.dataset.moveBlock),next=index+Number(target.dataset.direction);
        if(next<0||next>=selectedMail().template.blocks.length)return;
        mutateMail(mail=>{[mail.template.blocks[index],mail.template.blocks[next]]=[mail.template.blocks[next],mail.template.blocks[index]];if(selectedBlock===index)selectedBlock=next;else if(selectedBlock===next)selectedBlock=index;});
      }
      else if (target.hasAttribute('data-stage')) {
        const affected=affectedMails(target.dataset.check)[0];
        if(affected){flow.selectedMail=affected.id;selectedBlock=0;mailTool='content';}
        await go(Number(target.dataset.stage));
      }
      else if (target.dataset.timing) {timingOpen=timingOpen===target.dataset.timing?'':target.dataset.timing;render();}
      else if (target.dataset.mailTab) {flow.selectedMail=target.dataset.mailTab;selectedBlock=0;nameEditing=false;change();render();}
      else if (target.dataset.duplicateMail) {
        if(flow.steps.length+2>30)throw Error('La secuencia admite hasta 30 pasos.');
        const index=flow.steps.findIndex(step=>step.id===target.dataset.duplicateMail),copy=structuredClone(flow.steps[index]);
        copy.id=id();copy.name=(copy.name+' (copia)').slice(0,100);
        flow.steps.splice(index+1,0,{id:id(),kind:'wait',duration:2,unit:'days'},copy);change();render();
      }
      else if (target.dataset.deleteMail) {
        if(mails().length<2)return;
        const index=flow.steps.findIndex(step=>step.id===target.dataset.deleteMail),waits=precedingWaits(flow.steps,index);
        flow.steps.splice(waits.start,index-waits.start+1);
        if(flow.selectedMail===target.dataset.deleteMail)flow.selectedMail=mails()[0].id;
        timingOpen='';change();render();
      }
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
      else if (action==='timing-done') {await save();timingOpen='';render();}
      else if (action==='change-timing') {timingOpen=flow.selectedMail;await go(2);}
      else if (action==='add-mail') {
        const pending=flow.steps.at(-1)?.kind==='wait';
        const addWait=!pending&&mails().length>0;
        if(flow.steps.length+(addWait?2:1)>30)throw Error('La secuencia admite hasta 30 pasos.');
        const step=emptyMail(id());step.name=`Correo ${mails().length+1}`;
        if(addWait)flow.steps.push({id:id(),kind:'wait',duration:2,unit:'days',time:'10:00'});
        flow.steps.push(step);timingOpen=step.id;change();render();
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
      else if (action==='show-templates') { templatesOpen=!templatesOpen;if(templatesOpen&&!templatesLoaded){const response=await request('templates');copies=response.rows;templatesLoaded=true;}render(); }
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
        const response=await request(action==='test'?'flow-test':'flow-preview',{template:selectedMail().template,...(action==='preview'?{previewWithoutName:true}:{})});
        if(action==='test')report('Prueba aceptada por Gmail.');
        else {const dialog=result.querySelector('dialog');const frame=document.createElement('iframe');frame.title='Correo final';frame.setAttribute('sandbox','');frame.srcdoc=response.html;dialog.querySelector('[data-final-mail]').replaceChildren(frame);dialog.showModal();}
      } else if (action==='close-preview') target.closest('dialog').close();
    } catch (error) { report(error.message,true); }
    finally { busy=false; }
  });
  result.addEventListener('toggle', event => {
    if (event.target.matches('.auto-test-details')) { testDetailsOpen=event.target.open;return; }
    if (event.target.matches('.auto-saved-templates')) { templatesOpen = event.target.open; return; }
    if (!event.target.matches('.auto-actions-menu')) return;
    result.querySelector(`[popovertarget="${event.target.id}"]`)?.setAttribute('aria-expanded',String(event.newState === 'open'));
  }, true);
  const unload = event => { if(root.isConnected&&revision!==savedRevision){journal();event.preventDefault();event.returnValue='';} };
  window.addEventListener('beforeunload',unload);
  const cleanup = new MutationObserver(()=>{if(!root.isConnected){workspace?.removeEventListener('click',headerReturn);window.removeEventListener('beforeunload',unload);clearTimeout(timer);cleanup.disconnect();}});
  cleanup.observe(root.parentNode,{childList:true});
  load();
}
