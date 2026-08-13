from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Missing expected block: {label} in {path}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


replace_once('Tienda.dc.html', '''          <div style="aspect-ratio:4/5;border-radius:6px;background:#F3EEE4;display:flex;align-items:center;justify-content:center;margin-bottom:18px;position:relative;overflow:hidden;">
            <image-slot id="tienda-{{ p.id }}" shape="rect" fit="cover" style="width:100%;height:100%;" src="{{ p.imageUrl }}" placeholder="foto del producto"></image-slot>
            <sc-if value="{{ p.tag }}" hint-placeholder-val="{{ false }}">
              <span style="position:absolute;top:14px;left:14px;font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;background:#F65091;color:#FFFFFF;padding:4px 10px;border-radius:3px;">{{ p.tag }}</span>
            </sc-if>
          </div>''', '''          <a href="{{ p.detailHref }}" aria-label="Ver detalle de {{ p.displayName }}" style="display:block;aspect-ratio:4/5;border-radius:6px;background:#F3EEE4;margin-bottom:18px;position:relative;overflow:hidden;text-decoration:none;cursor:pointer;">
            <image-slot id="tienda-{{ p.id }}" shape="rect" fit="cover" style="width:100%;height:100%;" src="{{ p.imageUrl }}" placeholder="foto del producto"></image-slot>
            <sc-if value="{{ p.tag }}" hint-placeholder-val="{{ false }}">
              <span style="position:absolute;top:14px;left:14px;font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;background:#F65091;color:#FFFFFF;padding:4px 10px;border-radius:3px;">{{ p.tag }}</span>
            </sc-if>
          </a>''', 'product image link')

replace_once('Tienda.dc.html', '''        <a href="/encargo-personalizado" style="text-decoration:none;background:#000000;color:#FFFFFF;padding:{{ ctaWaPad }};border-radius:{{ ctaWaRadius }};font-size:{{ ctaWaSize }};font-weight:500;transition:transform .25s ease;" style-hover="transform:translateY(-3px);">Crear encargo</a>''', '''        <a href="/encargo-personalizado" onClick="{{ openCustomOrder }}" style="text-decoration:none;background:#000000;color:#FFFFFF;padding:{{ ctaWaPad }};border-radius:{{ ctaWaRadius }};font-size:{{ ctaWaSize }};font-weight:500;transition:transform .25s ease;" style-hover="transform:translateY(-3px);">Crear encargo</a>''', 'custom order CTA')

replace_once('Tienda.dc.html', '''    const m = this.state.isMobile;
    return {''', '''    const openCustomOrder = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      window.location.assign('/encargo-personalizado');
    };
    const m = this.state.isMobile;
    return {''', 'custom order handler')

replace_once('Tienda.dc.html', '''      bannerImageUrl,
    };''', '''      bannerImageUrl,
      openCustomOrder,
    };''', 'custom order handler export')

replace_once('Aprende.dc.html', '''        <div style="aspect-ratio:4/3;background:#F3EEE4;overflow:hidden;">
          <image-slot id="aprende-course-{{ $index }}" shape="rect" fit="cover" style="width:100%;height:100%;" placeholder="{{ c.placeholder }}"></image-slot>
        </div>''', '''        <a href="{{ c.detailHref }}" aria-label="Ver detalle de {{ c.name }}" style="display:block;aspect-ratio:4/3;background:#F3EEE4;overflow:hidden;text-decoration:none;cursor:pointer;">
          <image-slot id="aprende-course-{{ $index }}" shape="rect" fit="cover" style="width:100%;height:100%;" placeholder="{{ c.placeholder }}"></image-slot>
        </a>''', 'course image link')

replace_once('Aprende.dc.html', '''            <div style="aspect-ratio:16/9;background:#F3EEE4;position:relative;overflow:hidden;">
              <image-slot id="aprende-workshop-{{ $index }}" shape="rect" fit="cover" style="width:100%;height:100%;" placeholder="{{ w.placeholder }}"></image-slot>
              <span style="position:absolute;top:14px;left:14px;background:{{ w.badgeBg }};color:#FFFFFF;font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:3px;">{{ w.badge }}</span>
            </div>''', '''            <a href="{{ w.detailHref }}" aria-label="Ver detalle de {{ w.name }}" style="display:block;aspect-ratio:16/9;background:#F3EEE4;position:relative;overflow:hidden;text-decoration:none;cursor:pointer;">
              <image-slot id="aprende-workshop-{{ $index }}" shape="rect" fit="cover" style="width:100%;height:100%;" placeholder="{{ w.placeholder }}"></image-slot>
              <span style="position:absolute;top:14px;left:14px;background:{{ w.badgeBg }};color:#FFFFFF;font-size:10px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:3px;">{{ w.badge }}</span>
            </a>''', 'workshop image link')

replace_once('Aprende.dc.html', '''              <div style="font-size:{{ freebieTitleSize }};color:#000;font-weight:400;margin-top:6px;">{{ item.title }}</div>''', '''              <a href="{{ item.detailHref }}" style="display:block;font-size:{{ freebieTitleSize }};color:#000;font-weight:400;margin-top:6px;text-decoration:none;">{{ item.title }}</a>''', 'resource title link')

for path in ['Tienda.dc.html', 'Aprende.dc.html']:
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    s = s.replace('./support.js?v=20260810p1', '/support.js?v=20260812-entryfix1')
    s = s.replace('./image-slot.js?v=20260810p1', '/image-slot.js?v=20260812-entryfix1')
    p.write_text(s, encoding='utf-8')
