from pathlib import Path
p=Path('Aprende Detalle.dc.html')
s=p.read_text()
old="""    const type = window.location.pathname.includes('/talleres/') || window.location.pathname.endsWith('/taller') ? 'taller' : 'curso';
    const d = type === 'taller' ? this.TALLER : this.CURSO;
    const faqs = d.faqs.map((f, i) => ({"""
new="""    const qs = new URLSearchParams(window.location.search);
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
        ? [{ label: 'Fecha / nivel', value: li.dateLevel || '' }, { label: 'Ubicación', value: li.location || '' }, { label: 'Precio', value: li.price || '' }]
        : [{ label: 'Nivel / modalidad', value: li.level || '' }, { label: 'Precio', value: li.price || '' }]
    } : base;
    const faqs = d.faqs.map((f, i) => ({"""
if old not in s:
    raise SystemExit('render block not found')
p.write_text(s.replace(old,new,1))
print('Aprende detail renderer now uses live CMS item')
