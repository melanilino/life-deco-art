from pathlib import Path
import re

HOLD_SCRIPT = '''<script id="lda-nav-hold-init">\ntry{\n  if(sessionStorage.getItem('lda-nav-hold')==='1' && location.pathname!=='/'){\n    document.documentElement.classList.add('lda-nav-hold');\n  }\n}catch(e){}\n</script>\n'''

for p in Path('.').glob('*.dc.html'):
    if p.name == 'Inicio.dc.html':
        continue
    s = p.read_text()
    if '<!DOCTYPE html>' not in s or '<head>' not in s:
        continue
    if 'id="lda-nav-hold-init"' not in s:
        anchor = '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        if anchor not in s:
            raise SystemExit(f'No viewport anchor in {p.name}')
        s = s.replace(anchor, anchor + HOLD_SCRIPT, 1)
        p.write_text(s)

# Add global hold-state CSS once.
p = Path('design-system.css')
s = p.read_text()
if 'LDA mobile navigation hold state' not in s:
    s += '''\n\n/* LDA mobile navigation hold state */\n@media (max-width: 859px) {\n  html.lda-nav-hold body > :not(#lda-static-nav) {\n    visibility: hidden !important;\n  }\n  html.lda-nav-hold #lda-static-nav {\n    visibility: visible !important;\n    background: #fff !important;\n  }\n  html.lda-nav-hold #lda-static-nav .lda-mobile {\n    display: block !important;\n  }\n  html.lda-nav-hold #lda-static-nav details.lda-mobile > .lda-mobile-panel {\n    display: block !important;\n    visibility: visible !important;\n    opacity: 1 !important;\n  }\n}\n'''
    p.write_text(s)

# Replace prior close-before-navigation behavior with a deliberate hold + warm navigation.
p = Path('site-enhancements.js')
s = p.read_text()
s = re.sub(r'''\n\s*if \(!details\.dataset\.ldaCloseBeforeNav\) \{.*?\n\s*\}\n''', '\n', s, flags=re.S)

needle = '      syncState();\n    });\n\n    document.querySelectorAll(\'a[target="_blank"]\').forEach((link) => {'
insert = '''      syncState();\n\n      if (!details.dataset.ldaHoldNavigation) {\n        details.dataset.ldaHoldNavigation = "true";\n        panel.addEventListener("click", (event) => {\n          const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;\n          if (!link || !details.contains(link)) return;\n          const url = new URL(link.href, location.href);\n          if (url.origin !== location.origin || url.pathname === '/' || link.target === '_blank') return;\n          event.preventDefault();\n          if (details.dataset.ldaNavigating === 'true') return;\n          details.dataset.ldaNavigating = 'true';\n          try { sessionStorage.setItem('lda-nav-hold', '1'); } catch (_) {}\n          const minWait = new Promise((resolve) => setTimeout(resolve, 220));\n          const warm = fetch(url.href, { credentials: 'same-origin', cache: 'no-cache' }).catch(() => null);\n          Promise.allSettled([minWait, warm]).then(() => { location.assign(url.href); });\n          setTimeout(() => { location.assign(url.href); }, 900);\n        });\n      }\n    });\n\n    document.querySelectorAll('a[target="_blank"]').forEach((link) => {'''
if 'ldaHoldNavigation' not in s:
    if needle not in s:
        raise SystemExit('Could not find mobile navigation insertion point')
    s = s.replace(needle, insert, 1)

# Release the destination only when the mounted page is visually ready, with a short maximum hold.
if 'function releaseHeldNavigation' not in s:
    marker = '  function init() {\n'
    release = '''  function releaseHeldNavigation() {\n    if (!document.documentElement.classList.contains("lda-nav-hold")) return;\n    const started = performance.now();\n    let finished = false;\n    const finish = () => {\n      if (finished) return;\n      finished = true;\n      try { sessionStorage.removeItem("lda-nav-hold"); } catch (_) {}\n      document.documentElement.classList.remove("lda-nav-hold");\n    };\n    const waitForReady = () => {\n      const mounted = !!document.querySelector("#dc-root .sc-host");\n      const streaming = document.documentElement.classList.contains("sc-dc-streaming");\n      const elapsed = performance.now() - started;\n      if ((mounted && !streaming && elapsed >= 180) || elapsed >= 1200) {\n        const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();\n        Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 180))]).then(() => requestAnimationFrame(() => requestAnimationFrame(finish)));\n        return;\n      }\n      requestAnimationFrame(waitForReady);\n    };\n    requestAnimationFrame(waitForReady);\n  }\n\n'''
    if marker not in s:
        raise SystemExit('init marker missing')
    s = s.replace(marker, release + marker, 1)

if 'releaseHeldNavigation();' not in s:
    s = s.replace('    loadCmsDomContent();\n', '    loadCmsDomContent();\n    releaseHeldNavigation();\n', 1)

p.write_text(s)
