from pathlib import Path

p = Path('Productos.dc.html')
s = p.read_text()

if 'lda-mobile-timing' in s:
    raise SystemExit('Timing move already applied')

timing_text = 'Elaboración: 5-7 días'
idx = s.index(timing_text)
start = s.rfind('<div style=', 0, idx)
end = s.find('</div>', idx) + len('</div>')
timing = s[start:end]
desktop = timing.replace('<div style=', '<div class="lda-desktop-timing" style=', 1)
s = s[:start] + desktop + s[end:]

ship_text = 'Envío a todo el país'
ship_idx = s.index(ship_text)
ship_start = s.rfind('<div style=', 0, ship_idx)
mobile = timing.replace('<div style=', '<div class="lda-mobile-timing" style=', 1)
s = s[:ship_start] + mobile + '\n          ' + s[ship_start:]

anchor = '  a:hover { color: #000000; }'
css = '''  a:hover { color: #000000; }
  .lda-mobile-timing { display:none !important; }
  @media(max-width:859px){
    .lda-desktop-timing { display:none !important; }
    .lda-mobile-timing { display:flex !important; margin-top:26px; margin-bottom:14px; }
  }'''
s = s.replace(anchor, css, 1)
s = s.replace('/support.js?v=20260812-product-mobile3','/support.js?v=20260812-product-mobile4')
s = s.replace('/image-slot.js?v=20260812-product-mobile3','/image-slot.js?v=20260812-product-mobile4')
p.write_text(s)
