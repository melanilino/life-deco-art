export function composerHtml({id,title,content,search='',open=false}){
 return `<section class="panel-composer" id="${id}"><div class="panel-tools">${search}<button type="button" data-composer-toggle aria-expanded="${open}" aria-controls="${id}-body"><span class="composer-title composer-field-label">${title}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><path class="composer-plus-vertical" d="M12 4v16"/></svg></button></div><div id="${id}-body" data-composer-body${open?'':' hidden'}>${content}</div></section>`;
}
export const composerIsOpen=element=>!element.querySelector('[data-composer-body]').hidden;
export function setComposerOpen(element,open){element.querySelector('[data-composer-body]').hidden=!open;element.querySelector('[data-composer-toggle]').setAttribute('aria-expanded',String(open));}
export function bindComposers(scope=document){scope.querySelectorAll('[data-composer-toggle]').forEach(button=>button.addEventListener('click',()=>{const composer=button.closest('.panel-composer'),open=!composerIsOpen(composer);setComposerOpen(composer,open);if(open)composer.querySelector('textarea,input:not([type=search])')?.focus();}));}
