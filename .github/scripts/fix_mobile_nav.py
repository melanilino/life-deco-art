from pathlib import Path
import re

# Remove the cross-document transition experiments from every public page.
for p in Path('.').glob('*.dc.html'):
    s = p.read_text()
    s = re.sub(r'\n?<!-- LDA persistent navigation transition -->.*?<!-- /LDA persistent navigation transition -->\n?', '\n', s, flags=re.S)
    s = re.sub(r'\n?<!-- LDA cross-document navigation continuity -->.*?<!-- /LDA cross-document navigation continuity -->\n?', '\n', s, flags=re.S)
    p.write_text(s)

p = Path('site-enhancements.js')
s = p.read_text()

# Close the mobile menu before the browser starts changing documents.
marker = '''      syncState();
    });

    document.querySelectorAll('a[target="_blank"]').forEach((link) => {'''
insert = '''      syncState();

      if (!details.dataset.ldaCloseBeforeNav) {
        details.dataset.ldaCloseBeforeNav = "true";
        const closeBeforeNavigation = (event) => {
          const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
          if (!link || !details.contains(link) || !details.open) return;
          details.open = false;
          syncState();
        };
        panel.addEventListener("pointerdown", closeBeforeNavigation, { passive: true });
        panel.addEventListener("touchstart", closeBeforeNavigation, { passive: true });
        panel.addEventListener("click", closeBeforeNavigation);
      }
    });

    document.querySelectorAll('a[target="_blank"]').forEach((link) => {'''
if 'ldaCloseBeforeNav' not in s:
    if marker not in s:
        raise SystemExit('Mobile menu insertion point not found')
    s = s.replace(marker, insert, 1)

# Remove the site's explicit internal-document prefetcher. It warmed every nav
# destination (and touch targets) before navigation, producing the behavior
# the owner describes as page preloading.
s = re.sub(r'\n?/\* LDA_INTERNAL_PAGE_PREFETCH \*/\n\(\(\) => \{.*?\n\}\)\(\);\s*$', '\n', s, flags=re.S)

p.write_text(s)
