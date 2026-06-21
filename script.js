/* ════════════════════════════════════════════
   LIFE DECO ART — script.js
   Lógica compartida por todas las páginas.
   ════════════════════════════════════════════ */

/* ── COLOR DE ACENTO SEGÚN LA PÁGINA ──
   Cada página define su tema con una clase en <body>
   (via-estudio, via-escuela, via-sobremi, via-contacto).
   Aquí solo sincronizamos el color del cursor con ese tema. */
(function () {
  var body = document.body;
  if (body.classList.contains('via-estudio')) {
    document.documentElement.style.setProperty('--cursor-color', 'var(--rosa)');
  } else if (body.classList.contains('via-escuela')) {
    document.documentElement.style.setProperty('--cursor-color', 'var(--cyan)');
  } else {
    document.documentElement.style.setProperty('--cursor-color', 'var(--tierra)');
  }
})();

/* ── ESCUELA HUB (solo existe en /aprende) ── */
var escuelaDatos = {
  cursos:    { titulo: 'Aprende lettering a tu propio ritmo', sub: 'Técnica real, práctica constante y resultados visibles desde el primer módulo. Sin necesitar talento previo.' },
  talleres:  { titulo: 'Talleres en vivo para crear juntas', sub: 'Sesiones abiertas, privadas o corporativas — donde practicamos, nos inspiramos y salimos con algo hecho con nuestras manos.' },
  gratis:    { titulo: 'Recursos gratuitos descarga directa', sub: 'Guías y plantillas para que empieces a practicar hoy mismo, sin costo y sin excusas.' },
  blog:      { titulo: 'El blog creativo de Life Deco Art', sub: 'Técnica, materiales e ideas reales para mantener viva tu práctica. Sin perfección, con propósito.' },
  comunidad: { titulo: 'Únete a la comunidad', sub: 'Tips creativos, acceso anticipado a talleres y contenido exclusivo que no existe en ningún otro lugar.' }
};

function switchEscuela(panel, btn) {
  document.querySelectorAll('.escuela-panel').forEach(function(p){ p.classList.remove('escuela-panel-active'); });
  document.querySelectorAll('.escuela-tab').forEach(function(b){ b.classList.remove('escuela-tab-active'); });
  document.getElementById('panel-'+panel).classList.add('escuela-panel-active');
  if(btn) btn.classList.add('escuela-tab-active');
  var tEl = document.getElementById('escuela-hero-titulo');
  var sEl = document.getElementById('escuela-hero-sub');
  if(tEl && sEl && escuelaDatos[panel]) {
    tEl.style.opacity = '0'; sEl.style.opacity = '0';
    setTimeout(function(){
      tEl.innerHTML = escuelaDatos[panel].titulo;
      sEl.textContent = escuelaDatos[panel].sub;
      tEl.style.opacity = '1'; sEl.style.opacity = '1';
    }, 350);
  }
}

/* ── FILTRO TIENDA (solo existe en /tienda) ── */
var tiendaDatos = {
  todos:          { titulo: 'Objetos de papel, tinta y textil', sub: 'Cada pieza es una edición limitada o un objeto único hecho bajo procesos de encuadernación artesanal tradicionales y rotulación a mano.' },
  personalizados: { titulo: 'Piezas personalizadas', sub: 'Bandejas, cuadros, sombreros y más — con tu nombre, tu frase, tu historia. Hechas a mano, una por una.' },
  digitales:      { titulo: 'Productos digitales', sub: 'Plantillas y recursos descargables para practicar lettering o decorar tus proyectos desde casa, a tu ritmo.' },
  colecciones:    { titulo: 'Colecciones de temporada', sub: 'Piezas especiales diseñadas para cada momento del año — con la estética, el cuidado y la intención de siempre.' },
  souvenirs:      { titulo: 'Souvenirs y corporativos', sub: 'Detalles personalizados para bodas, eventos, ferias y lanzamientos. Cotización por volumen disponible.' }
};

var tiendaSubcats = {
  personalizados: ['Cuadros','Llaveros','Bandejas','Cajas sorpresa','Detalles especiales'],
  digitales:      ['Plantillas','Guías','Ebooks','Recursos imprimibles'],
  colecciones:    ['San Valentín','Día de las Madres','Navidad','Ocasiones especiales'],
  souvenirs:      ['Eventos','Bodas','Quinceañeras','Graduaciones','Cumpleaños','Bebés & Revelación','Corporativos']
};

var _tiendaMain = 'todos';
var _tiendaSub  = 'todos';

function tiendaFiltrarMain(btn, cat) {
  document.querySelectorAll('#tienda-productos .escuela-tab').forEach(function(b){ b.classList.remove('escuela-tab-active'); });
  btn.classList.add('escuela-tab-active');
  _tiendaMain = cat;
  _tiendaSub  = 'todos';

  var subNav = document.getElementById('tienda-sub-nav');
  if (cat === 'todos' || !tiendaSubcats[cat]) {
    subNav.innerHTML = '';
    subNav.classList.remove('visible');
  } else {
    subNav.innerHTML = tiendaSubcats[cat].map(function(s, i) {
      var slug = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[&]/g,'-').replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
      return '<button class="sub-tab" onclick="tiendaFiltrarSub(this,\'' + slug + '\')">' + s + '</button>';
    }).join('');
    subNav.classList.add('visible');
  }

  tiendaAplicarFiltro();
  tiendaActualizarHero(cat);
}

function tiendaFiltrarSub(btn, sub) {
  document.querySelectorAll('#tienda-sub-nav .sub-tab').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  _tiendaSub = sub;
  tiendaAplicarFiltro();
}

function tiendaAplicarFiltro() {
  document.querySelectorAll('.shop-item').forEach(function(item) {
    var mainOk = _tiendaMain === 'todos' || item.dataset.cat === _tiendaMain;
    var subOk  = _tiendaSub  === 'todos' || item.dataset.sub === _tiendaSub;
    item.style.display = (mainOk && subOk) ? '' : 'none';
  });
}

function tiendaActualizarHero(cat) {
  var tEl = document.getElementById('estudio-hero-titulo');
  var sEl = document.getElementById('estudio-hero-sub');
  if(tEl && sEl && tiendaDatos[cat]) {
    tEl.style.opacity = '0'; sEl.style.opacity = '0';
    setTimeout(function(){
      tEl.innerHTML = tiendaDatos[cat].titulo;
      sEl.textContent = tiendaDatos[cat].sub;
      tEl.style.opacity = '1'; sEl.style.opacity = '1';
    }, 350);
  }
}

function filtrarTienda(cat, btn) {
  tiendaFiltrarMain(btn, cat);
}

/* ── FAQ (acordeón, usado en /tienda y /aprende) ── */
function toggleFaq(trigger) {
  const content = trigger.nextElementSibling;
  trigger.classList.toggle('active');
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
  }
}

/* ── BARRA DE PROGRESO DE SCROLL (todas las páginas) ── */
window.addEventListener('scroll',()=>{
  const st=window.scrollY;
  const total=document.body.scrollHeight-window.innerHeight;
  const progEl = document.getElementById('prog');
  if(progEl && total > 0) progEl.style.setProperty('--p',Math.round(st/total*100)+'%');
},{passive:true});

/* ── MENÚ MÓVIL BURGER (todas las páginas) ── */
const burger=document.getElementById('burger');
const mobileMenu=document.getElementById('mobileMenu');
function closeMobileMenu(){
  if(burger && mobileMenu) {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow='';
  }
}
if(burger && mobileMenu) {
  burger.addEventListener('click',()=>{
    const isOpen=burger.classList.toggle('open');
    mobileMenu.classList.toggle('open',isOpen);
    document.body.style.overflow=isOpen?'hidden':'';
  });
}

/* ── CURSOR ELÁSTICO (LÁPIZ) (todas las páginas) ── */
const cursor=document.getElementById('custom-cursor');
let cx=0,cy=0,tx=0,ty=0,lx=0;
window.addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;});
(function loop(){
  if(cursor) {
    cx+=(tx-cx)*.22;cy+=((ty-24)-cy)*.22;
    const tilt=Math.min(Math.max((tx-lx)*.5,-15),15);
    cursor.style.transform=`translate3d(${cx}px,${cy}px,0) rotate(${tilt}deg)`;
    lx=tx;
  }
  requestAnimationFrame(loop);
})();
document.querySelectorAll('a,button,.shop-item,.aprende-item,.occ-pill,.fp,.faq-trigger').forEach(el=>{
  el.addEventListener('mouseenter',()=>document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-hover'));
});

/* ── SCROLL REVEAL OBSERVER (todas las páginas) ── */
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});
},{threshold:0.08,rootMargin:'0px 0px -20px 0px'});
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>obs.observe(el));
document.querySelectorAll('#inicio .reveal').forEach(el=>setTimeout(()=>el.classList.add('visible'),220));

/* ── SOBRE MÍ: STICKY + ANIMACIONES DE SCROLL (solo existe en /sobre-mi) ── */
(function(){
  var melaniSection=document.getElementById('melani');
  if(!melaniSection) return;
  var foto=melaniSection.querySelector('.melani-foto img');
  var chunks=melaniSection.querySelectorAll('.melani-chunk');

  if(chunks[0]) chunks[0].classList.add('mc-visible');

  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting) e.target.classList.add('mc-visible');});
    },{threshold:0.12,rootMargin:'0px 0px -60px 0px'});
    chunks.forEach(function(c){io.observe(c);});
  } else {
    chunks.forEach(function(c){c.classList.add('mc-visible');});
  }

  if(foto){
    window.addEventListener('scroll',function(){
      var rect=melaniSection.getBoundingClientRect();
      var progress=Math.max(0,Math.min(1,-rect.top/Math.max(rect.height,1)));
      foto.style.transform='scale('+(1+progress*0.06)+')';
    },{passive:true});
  }
})();
