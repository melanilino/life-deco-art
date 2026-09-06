from pathlib import Path
import re

preload = '<link rel="preload" as="script" href="/vendor/react-18.3.1.production.min.js">\n<link rel="preload" as="script" href="/vendor/react-dom-18.3.1.production.min.js">\n'
changed=[]
for p in Path('.').glob('*.dc.html'):
    if p.name == 'Inicio.dc.html':
        continue
    s=p.read_text()
    old=s
    if '/vendor/react-18.3.1.production.min.js' not in s:
        anchor='<link rel="preconnect" href="https://unpkg.com" crossorigin>\n'
        if anchor in s:
            s=s.replace(anchor, anchor+preload, 1)
        else:
            anchor='<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            if anchor not in s:
                raise SystemExit(f'No preload insertion point in {p.name}')
            s=s.replace(anchor, anchor+preload, 1)
    s=re.sub(r'<script src="(?:\./|/)support\.js\?v=[^"]+" defer></script>', '<script src="/support.js?v=20260906boot2" defer></script>', s, count=1)
    if s != old:
        p.write_text(s)
        changed.append(p.name)
print('Updated:', ', '.join(changed))