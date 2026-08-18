"use strict";

(() => {
  const STYLE_ID = "lda-accessibility-css";
  const MAIN_ID = "contenido-principal";
  let cmsPageContent = null;
  let cmsGlobalContent = null;

  function ensureFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/svg+xml";
    icon.href = "/favicon.svg";
    document.head.appendChild(icon);
  }

  function addAccessibilityStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .lda-skip-link {
        position: fixed;
        top: 8px;
        left: 8px;
        z-index: 2147483647;
        padding: 12px 16px;
        border-radius: 4px;
        background: #000;
        color: #fff;
        font: 600 14px/1.2 Montserrat, Arial, sans-serif;
        text-decoration: none;
        transform: translateY(-160%);
        transition: transform .2s ease;
      }
      .lda-skip-link:focus { transform: translateY(0); }
      :where(a, button, input, textarea, select, summary, [tabindex]):focus-visible {
        outline: 3px solid #8B795E !important;
        outline-offset: 3px !important;
      }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto !important; }
        *, *::before, *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function addSkipLink() {
    if (document.querySelector(".lda-skip-link")) return;
    const link = document.createElement("a");
    link.className = "lda-skip-link";
    link.href = `#${MAIN_ID}`;
    link.textContent = "Saltar al contenido principal";
    document.body.prepend(link);
  }

  function enhanceContent() {
    const main = document.querySelector("main, [role=\"main\"], #dc-root > .sc-host > section, section")
      || document.querySelector("h1")?.parentElement;
    if (main && !main.id) {
      main.id = MAIN_ID;
      main.tabIndex = -1;
      if (main.tagName !== "MAIN") main.setAttribute("role", "main");
    }

    const canonicalPath = document.querySelector('link[rel="canonical"]')?.href;
    const currentPath = new URL(canonicalPath || window.location.href).pathname.replace(/\/$/, "") || "/";
    document.querySelectorAll("nav a[href]").forEach((link) => {
      if (link.closest("nav")?.querySelector("a") === link) return;
      const linkPath = new URL(link.href, window.location.origin).pathname.replace(/\/$/, "") || "/";
      if (linkPath === currentPath) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    document.querySelectorAll("details.lda-mobile").forEach((details, index) => {
      const summary = details.querySelector("summary");
      const panel = details.querySelector(".lda-mobile-panel");
      if (!summary || !panel) return;
      if (!panel.id) panel.id = `lda-mobile-menu-${index + 1}`;
      summary.setAttribute("aria-controls", panel.id);
      const syncState = () => {
        summary.setAttribute("aria-expanded", String(details.open));
        summary.setAttribute("aria-label", details.open ? "Cerrar menú" : "Abrir menú");
      };
      if (!details.dataset.ldaAccessible) {
        details.dataset.ldaAccessible = "true";
        details.addEventListener("toggle", syncState);
        details.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && details.open) {
            details.open = false;
            summary.focus();
          }
        });
      }
      syncState();
    });

    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      link.setAttribute("rel", [...rel].join(" "));
    });

    document.querySelectorAll("label:not([for])").forEach((label, index) => {
      const control = label.parentElement?.querySelector("input, select, textarea");
      if (!control) return;
      if (!control.id) control.id = `lda-field-${index + 1}`;
      label.htmlFor = control.id;
    });

    document.querySelectorAll("input, select, textarea").forEach((control) => {
      if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
      if (control.id && [...document.querySelectorAll("label[for]")].some((label) => label.htmlFor === control.id)) return;
      const placeholder = control.getAttribute("placeholder");
      if (placeholder) control.setAttribute("aria-label", placeholder);
    });

    document.querySelectorAll('[onclick]:not(a):not(button):not(input):not(select):not(textarea)').forEach((control) => {
      if (control.getAttribute("role") === "dialog" || control.closest('[role="dialog"]') === control) return;
      if (!control.hasAttribute("role")) control.setAttribute("role", "button");
      if (!control.hasAttribute("tabindex")) control.tabIndex = 0;
      if (!control.dataset.ldaKeyboard) {
        control.dataset.ldaKeyboard = "true";
        control.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          control.click();
        });
      }
    });
  }

  function addPageUrlMetadata() {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      canonical.href = `${window.location.origin}${window.location.pathname}`;
      document.head.appendChild(canonical);
    }
    if (document.querySelector('meta[property="og:url"]')) return;
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:url");
    meta.content = canonical.href;
    document.head.appendChild(meta);
  }

  function updateDynamicMetadata() {
    const dynamicPage = /^\/(tienda\/(producto|[^/]+)|aprende\/(curso|taller|recurso|cursos\/[^/]+|talleres\/[^/]+|gratis\/[^/]+))$/.test(window.location.pathname);
    if (!dynamicPage) return;
    const heading = document.querySelector("h1");
    const title = heading?.textContent?.trim();
    if (!title || title.includes("{{")) return;
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const description = Array.from(document.querySelectorAll("p"))
      .map((item) => item.textContent.trim())
      .find((text) => text && !text.includes("{{"));
    document.title = `${title} | Life Deco Art`;
    const setMeta = (selector, attribute, value) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
        if (match) element.setAttribute(match[1], match[2]);
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = url;
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:title"]', "content", document.title);
    if (description) {
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:description"]', "content", description);
    }
  }

  function currentCmsPageId() {
    const path = window.location.pathname;
    if (path === '/') return 'inicio';
    if (path === '/sobre-mi') return 'sobremi';
    if (path === '/tienda') return 'tienda';
    if (path === '/aprende') return 'aprende';
    if (path === '/contacto') return 'contacto';
    if (path === '/encargo-personalizado') return 'encargos';
    if (path === '/politica-de-privacidad') return 'privacidad';
    if (path === '/terminos-y-condiciones') return 'terminos';
    return null;
  }

  function applyCmsDomContent() {
    const page = cmsPageContent || {};
    document.querySelectorAll('[data-cms-text]').forEach((element) => {
      const value = page[element.dataset.cmsText];
      if (value !== undefined && value !== null && String(value).trim() && element.textContent !== String(value)) element.textContent = value;
    });
    document.querySelectorAll('[data-cms-html]').forEach((element) => {
      const value = page[element.dataset.cmsHtml];
      if (value !== undefined && value !== null && String(value).trim() && element.innerHTML !== String(value)) element.innerHTML = value;
    });
    document.querySelectorAll('[data-cms-href]').forEach((element) => {
      const value = page[element.dataset.cmsHref];
      if (value) element.setAttribute('href', value);
    });
    const global = cmsGlobalContent || {};
    if (global.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.href = global.faviconUrl;
    }
    if (page.seoTitle) document.title = page.seoTitle;
    const description = page.seoDescription;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = description;
      const og = document.querySelector('meta[property="og:description"]');
      if (og) og.content = description;
    }
    if (page.searchVisibility === 'No indexar') {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
      robots.content = 'noindex, nofollow';
    }
  }

  async function loadCmsDomContent() {
    const pageId = currentCmsPageId();
    try {
      const cms = await import('/cms.js');
      const [page, global] = await Promise.all([
        pageId ? cms.getPageContent(pageId) : Promise.resolve({}),
        cms.getPageContent('global'),
      ]);
      cmsPageContent = page || {};
      cmsGlobalContent = global || {};
      applyCmsDomContent();
    } catch (_) {}
  }

  function init() {
    ensureFavicon();
    addAccessibilityStyles();
    addSkipLink();
    addPageUrlMetadata();
    enhanceContent();
    updateDynamicMetadata();
    loadCmsDomContent();
    const observer = new MutationObserver(() => {
      enhanceContent();
      updateDynamicMetadata();
      applyCmsDomContent();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
