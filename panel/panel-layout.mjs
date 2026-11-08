let headerObserver=null;

// Usa la altura completa del encabezado, también si Inicio está desplazado.
export function syncPanelLayout(root=document){
 headerObserver?.disconnect();headerObserver=null;
 const header=root.querySelector('.home-header');if(!header)return;
 const update=()=>{const height=header.getBoundingClientRect().height;if(height>0)root.documentElement.style.setProperty('--hub-current-header-height',`${height}px`);};
 update();
 if(typeof ResizeObserver!=='undefined'){headerObserver=new ResizeObserver(update);headerObserver.observe(header);}
}
