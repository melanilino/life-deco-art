let headerObserver=null;

// Usa la altura completa del encabezado, también si Inicio está desplazado.
export function syncPanelLayout(root=document){
 headerObserver?.disconnect();headerObserver=null;
 const header=root.querySelector('.home-header');if(!header)return;
 const update=()=>{const height=header.getBoundingClientRect().height;if(height>0)root.documentElement.style.setProperty('--hub-current-header-height',`${height}px`);};
 update();
 if(typeof ResizeObserver!=='undefined'){headerObserver=new ResizeObserver(update);headerObserver.observe(header);}
}
// A return link replaces the subtitle only on pages that already provide one.
export function syncReturnHeader(root) {
  const welcome = root?.querySelector('.section-action-header .home-welcome');
  const main = root?.querySelector('main');
  if (!welcome || !main) return;
  let back = welcome.querySelector('a.sales-back');
  const bodyBack = main.querySelector('a.sales-back');
  if (!back && bodyBack) {
    back = bodyBack;
    welcome.append(back);
    back.classList.remove('auto-back');
  } else if (back && bodyBack && back.getAttribute('href') === bodyBack.getAttribute('href')) {
    bodyBack.remove();
  }
  if (back) welcome.querySelector(':scope > p')?.remove();
}
