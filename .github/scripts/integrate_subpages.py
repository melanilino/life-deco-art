from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        print(f"SKIP {label}: pattern not found")
        return False
    s = s.replace(old, new, 1)
    p.write_text(s)
    print(f"OK {label}")
    return True


# Tienda: product detail link + custom order CTA.
replace_once(
    "Tienda.dc.html",
    '<div class="lda-product-title" style="font-size:15px;font-weight:400;color:#000000;">{{ p.displayName }}</div>',
    '<a href="{{ p.detailHref }}" class="lda-product-title" style="font-size:15px;font-weight:400;color:#000000;text-decoration:none;">{{ p.displayName }}</a>',
    "tienda product title link",
)
replace_once(
    "Tienda.dc.html",
    "return { ...p, displayName: titleUpgrades[p.name] || p.name, displayPrice: /^pr[oó]ximamente$/i.test(String(p.price || '').trim()) ? 'Próx.' : p.price, whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` };",
    "return { ...p, displayName: titleUpgrades[p.name] || p.name, displayPrice: /^pr[oó]ximamente$/i.test(String(p.price || '').trim()) ? 'Próx.' : p.price, detailHref: `/tienda/producto?id=${encodeURIComponent(p.id)}`, whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` };",
    "tienda product mapping",
)
replace_once(
    "Tienda.dc.html",
    '<a href="https://wa.me/18495390410" style="text-decoration:none;background:#000000;color:#FFFFFF;padding:{{ ctaWaPad }};border-radius:{{ ctaWaRadius }};font-size:{{ ctaWaSize }};font-weight:500;transition:transform .25s ease;" style-hover="transform:translateY(-3px);">WhatsApp</a>',
    '<a href="/encargo-personalizado" style="text-decoration:none;background:#000000;color:#FFFFFF;padding:{{ ctaWaPad }};border-radius:{{ ctaWaRadius }};font-size:{{ ctaWaSize }};font-weight:500;transition:transform .25s ease;" style-hover="transform:translateY(-3px);">Crear encargo</a>',
    "tienda custom order CTA",
)

# Aprende: detail links.
replace_once(
    "Aprende.dc.html",
    '<div style="font-size:{{ courseNameSize }};font-weight:400;color:#000000;margin-top:10px;">{{ c.name }}</div>',
    '<a href="{{ c.detailHref }}" style="display:block;font-size:{{ courseNameSize }};font-weight:400;color:#000000;margin-top:10px;text-decoration:none;">{{ c.name }}</a>',
    "course title link",
)
replace_once(
    "Aprende.dc.html",
    '<div style="font-size:{{ workshopNameSize }};font-weight:400;color:#000;margin-top:8px;">{{ w.name }}</div>',
    '<a href="{{ w.detailHref }}" style="display:block;font-size:{{ workshopNameSize }};font-weight:400;color:#000;margin-top:8px;text-decoration:none;">{{ w.name }}</a>',
    "workshop title link",
)
replace_once(
    "Aprende.dc.html",
    '<a href="#" onClick="{{ item.onPreview }}" style="text-decoration: none; color: #8B795E; font-size: 12px; font-weight: 400">Vista previa</a>',
    '<a href="{{ item.detailHref }}" style="text-decoration:none;color:#8B795E;font-size:12px;font-weight:400">Ver detalle</a>',
    "freebie detail link",
)
replace_once(
    "Aprende.dc.html",
    "const courses = (isCursos ? coursesSource : []).map(c => ({ ...c, whatsappUrl:",
    "const courses = (isCursos ? coursesSource : []).map((c,i) => ({ ...c, detailHref:`/aprende/curso?id=${encodeURIComponent(c.id || ('cu'+(i+1)))}`, whatsappUrl:",
    "course mapping detail href",
)
replace_once(
    "Aprende.dc.html",
    "workshops: (live.talleres || this.WORKSHOPS).map(w => ({ placeholder:",
    "workshops: (live.talleres || this.WORKSHOPS).map((w,i) => ({ detailHref:`/aprende/taller?id=${encodeURIComponent(w.id || ('w'+(i+1)))}`, placeholder:",
    "workshop mapping detail href",
)
replace_once(
    "Aprende.dc.html",
    "freebies: (live.gratis || this.FREEBIES).map(item => {",
    "freebies: (live.gratis || this.FREEBIES).map((item,i) => {",
    "freebie mapping index",
)
replace_once(
    "Aprende.dc.html",
    "downloadHref: hasFile ? item.fileUrl : '#',",
    "detailHref:`/aprende/recurso?id=${encodeURIComponent(item.id || ('g'+(i+1)))}`,\n          downloadHref: hasFile ? item.fileUrl : '#',",
    "freebie detail href",
)

# Aprende Detalle: choose type from route/query, then overlay live item from CMS.
replace_once(
    "Aprende Detalle.dc.html",
    "state = { isMobile: typeof window !== 'undefined' && window.innerWidth < 860, faqOpen: 0 };",
    "state = { isMobile: typeof window !== 'undefined' && window.innerWidth < 860, faqOpen: 0, liveItem: null };",
    "learn detail state",
)
replace_once(
    "Aprende Detalle.dc.html",
    """componentDidMount() {
    const check = () => this.setState({ isMobile: window.innerWidth < 860 });
    check();
    window.addEventListener('resize', check);
  }""",
    """async componentDidMount() {
    const check = () => this.setState({ isMobile: window.innerWidth < 860 });
    check();
    window.addEventListener('resize', check);
    try {
      const cms = await import('./cms.js');
      const data = await cms.getPageContent('aprende');
      const qs = new URLSearchParams(window.location.search);
      const type = window.location.pathname.includes('/taller') || qs.get('type') === 'taller' ? 'taller' : 'curso';
      const id = qs.get('id');
      const list = type === 'taller' ? (data.talleres || []) : (data.cursos || []);
      const liveItem = list.find(x => x.id === id) || null;
      if (liveItem) this.setState({ liveItem });
    } catch (e) {}
  }""",
    "learn detail live load",
)
replace_once(
    "Aprende Detalle.dc.html",
    """const type = this.props.type === 'taller' ? 'taller' : 'curso';
    const d = type === 'taller' ? this.TALLER : this.CURSO;""",
    """const qs = new URLSearchParams(window.location.search);
    const type = window.location.pathname.includes('/taller') || qs.get('type') === 'taller' ? 'taller' : 'curso';
    const base = type === 'taller' ? this.TALLER : this.CURSO;
    const li = this.state.liveItem;
    const d = li ? {
      ...base,
      title: li.name || base.title,
      tagline: li.desc || base.tagline,
      summary: li.desc || base.summary,
      price: li.price || base.price,
      heroImage: li.imageUrl || '',
      infoRows: type === 'taller'
        ? [{ label:'Fecha / nivel', value:li.dateLevel || '' }, { label:'Ubicación', value:li.location || '' }, { label:'Precio', value:li.price || '' }]
        : [{ label:'Nivel / modalidad', value:li.level || '' }, { label:'Precio', value:li.price || '' }]
    } : base;""",
    "learn detail dynamic item",
)
replace_once(
    "Aprende Detalle.dc.html",
    "heroImage: '', heroPlaceholder:",
    "heroImage: d.heroImage || '', heroPlaceholder:",
    "learn detail hero image",
)

# Recursos: selected CMS item.
replace_once(
    "Recursos.dc.html",
    'src="" placeholder="portada / vista previa del recurso"',
    'src="{{ resource.imageUrl }}" placeholder="portada / vista previa del recurso"',
    "resource image",
)
replace_once(
    "Recursos.dc.html",
    '>Plantilla de Trazos Básicos</h1>',
    '>{{ resource.title }}</h1>',
    "resource title",
)
replace_once(
    "Recursos.dc.html",
    '>PDF</div>',
    '>{{ resource.format }}</div>',
    "resource format",
)
replace_once(
    "Recursos.dc.html",
    "state = { isMobile: typeof window !== 'undefined' && window.innerWidth < 860 };",
    "state = { isMobile: typeof window !== 'undefined' && window.innerWidth < 860, resource: null };",
    "resource state",
)
replace_once(
    "Recursos.dc.html",
    """componentDidMount() {
    const check = () => this.setState({ isMobile: window.innerWidth < 860 });
    check();
    window.addEventListener('resize', check);
  }""",
    """async componentDidMount() {
    const check = () => this.setState({ isMobile: window.innerWidth < 860 });
    check();
    window.addEventListener('resize', check);
    try {
      const cms = await import('./cms.js');
      const data = await cms.getPageContent('aprende');
      const id = new URLSearchParams(window.location.search).get('id');
      const list = data.gratis || [];
      const resource = list.find(x => x.id === id) || list[0] || null;
      if (resource) this.setState({ resource });
    } catch (e) {}
  }""",
    "resource live load",
)
replace_once(
    "Recursos.dc.html",
    "const m = this.state.isMobile;\n    return {",
    "const m = this.state.isMobile;\n    const resource = this.state.resource || { title:'Plantilla de Trazos Básicos', format:'PDF', imageUrl:'', fileUrl:'#' };\n    return {",
    "resource render object",
)
replace_once(
    "Recursos.dc.html",
    "downloadUrl: '#',",
    "resource,\n      downloadUrl: resource.fileUrl || '#',",
    "resource download",
)

# Services: route query selects correct service.
replace_once(
    "Servicios.dc.html",
    "const data = this.SERVICES[this.props.service] || this.SERVICES.rotulacion;",
    "const qs = new URLSearchParams(window.location.search); const key = qs.get('service') || this.props.service || 'rotulacion'; const data = this.SERVICES[key] || this.SERVICES.rotulacion;",
    "service route selector",
)

# Home: make each service card clickable in desktop and mobile.
p = Path("Inicio.dc.html")
s = p.read_text()
for sid, href in [
    ("serv-personalizados", "/servicios/personalizados"),
    ("serv-rotulacion", "/servicios/rotulacion"),
    ("serv-packaging", "/servicios/packaging"),
    ("serv-souvenirs", "/servicios/souvenirs"),
]:
    needle = f'<image-slot id="{sid}"'
    pos = 0
    while True:
        pos = s.find(needle, pos)
        if pos < 0:
            break
        end = s.find('</image-slot>', pos)
        if end < 0:
            break
        end += len('</image-slot>')
        overlay = f'<a href="{href}" aria-label="Ver servicio" style="position:absolute;inset:0;z-index:3;"></a>'
        if overlay not in s[end:end + len(overlay) + 30]:
            s = s[:end] + overlay + s[end:]
            pos = end + len(overlay)
        else:
            pos = end
p.write_text(s)
print("OK home service overlays")
