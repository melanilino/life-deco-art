"use strict";

(() => {
  const STYLE_ID = "lda-accessibility-css";
  const MAIN_ID = "contenido-principal";
  let cmsPageContent = null;
  let cmsGlobalContent = null;
  let revealObserver = null;
  let revealSweepScheduled = false;

  function revealElement(el) {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    el.setAttribute("data-revealed", "1");
  }

  function revealVisibleElements() {
    revealSweepScheduled = false;
    const viewportBuffer = Math.max(100, window.innerHeight * 0.16);
    document.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight + viewportBuffer && rect.bottom >= -viewportBuffer) {
        revealElement(el);
        if (revealObserver) revealObserver.unobserve(el);
      }
    });
  }

  function scheduleRevealSweep() {
    if (revealSweepScheduled) return;
    revealSweepScheduled = true;
    requestAnimationFrame(revealVisibleElements);
  }

  function observeRevealElements() {
    const elements = document.querySelectorAll("[data-reveal]:not([data-revealed]):not([data-reveal-observed])");
    if (!elements.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach(revealElement);
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealElement(entry.target);
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.01, rootMargin: "0px 0px 14% 0px" });
    }
    elements.forEach((el) => {
      el.setAttribute("data-reveal-observed", "1");
      revealObserver.observe(el);
    });
    scheduleRevealSweep();
  }

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
      html { scroll-behavior: smooth; }
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
        outline: none !important;
        outline-offset: 0 !important;
        box-shadow: none !important;
      }
      :where(a, button, summary, [tabindex]):focus-visible {
        filter: brightness(.9);
      }
      [data-reveal] {
        transition-duration: .72s !important;
        transition-timing-function: cubic-bezier(.16, 1, .3, 1) !important;
        will-change: transform;
      }
      [data-reveal]:not([data-revealed]) {
        opacity: .72 !important;
        transform: translateY(14px) !important;
      }
      [data-reveal][data-revealed] {
        transform: translateY(0) !important;
      }
      .lda-motion-card {
        transition: opacity .68s cubic-bezier(.16, 1, .3, 1), transform .3s cubic-bezier(.16, 1, .3, 1) !important;
        box-shadow: none !important;
      }
      .lda-motion-card[data-reveal]:not([data-revealed]) {
        opacity: .78 !important;
        transform: translateY(12px) !important;
      }
      .lda-motion-card[data-reveal][data-revealed] { opacity: 1 !important; }
      .lda-card-grid > .lda-motion-card:nth-child(2) { transition-delay: .05s !important; }
      .lda-card-grid > .lda-motion-card:nth-child(3) { transition-delay: .1s !important; }
      .lda-card-grid > .lda-motion-card:nth-child(4) { transition-delay: .15s !important; }
      .lda-editorial-media image-slot {
        display: block;
        clip-path: inset(0 0 7% 0 round 8px);
        transform: scale(1.035);
        transform-origin: center center;
        transition: clip-path .9s cubic-bezier(.16, 1, .3, 1), transform 1.05s cubic-bezier(.16, 1, .3, 1) !important;
      }
      .lda-editorial-media[data-revealed] image-slot,
      [data-revealed] .lda-editorial-media image-slot {
        clip-path: inset(0 0 0 0 round 8px);
        transform: scale(1);
      }
      .lda-script-accent {
        display: inline-block;
        position: relative;
        font-family: 'Homemade Apple', cursive !important;
      }
      .lda-script-accent::after {
        content: "";
        position: absolute;
        left: 3%;
        right: -3%;
        bottom: -.12em;
        height: 1px;
        background: currentColor;
        opacity: .48;
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform .8s cubic-bezier(.16, 1, .3, 1) .12s;
      }
      [data-revealed] .lda-script-accent::after,
      .lda-script-accent.lda-script-ready::after { transform: scaleX(1); }
      @media (max-width: 859px) {
        [data-reveal]:not([data-revealed]) { opacity: .88 !important; transform: translateY(7px) !important; }
        .lda-motion-card[data-reveal]:not([data-revealed]) { transform: translateY(6px) !important; }
        .lda-motion-card { transition-delay: 0s !important; }
        .lda-editorial-media image-slot { clip-path: inset(0 0 4% 0 round 8px); transform: scale(1.018); }
      }
      @media (min-width: 860px) and (hover: hover) {
        .lda-motion-card[data-revealed]:hover,
        .lda-motion-card:not([data-reveal]):hover {
          transform: translateY(-4px) !important;
          box-shadow: none !important;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto !important; }
        *, *::before, *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
          scroll-behavior: auto !important;
        }
        .lda-motion-card { transition-delay: 0s !important; }
        [data-reveal] { opacity: 1 !important; transform: none !important; }
        .lda-editorial-media image-slot { clip-path: none !important; transform: none !important; }
        .lda-script-accent::after { transform: scaleX(1) !important; }
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

    if (main) {
      Array.from(main.children).forEach((section) => {
        if (!section.matches("div, section, article") || section.hasAttribute("data-reveal")) return;
        if (section.closest("nav, footer") || window.getComputedStyle(section).position === "fixed") return;
        if (!section.querySelector("h1, h2, h3, image-slot, .lda-motion-card")) return;
        section.setAttribute("data-reveal", "");
      });
      main.querySelectorAll(".lda-motion-card:not([data-reveal])").forEach((card) => card.setAttribute("data-reveal", ""));
    }

    document.querySelectorAll("main [data-reveal], [role=main] [data-reveal]").forEach((element) => {
      if (element.querySelector("image-slot")) element.classList.add("lda-editorial-media");
    });

    document.querySelectorAll(":is(main, [role=main]) h1 span, :is(main, [role=main]) h2 span, :is(main, [role=main]) h3 span, :is(main, [role=main]) [data-reveal] span").forEach((accent) => {
      const family = accent.style.fontFamily || "";
      if (!family.toLowerCase().includes("homemade apple")) return;
      const parentSize = parseFloat(window.getComputedStyle(accent.parentElement || accent).fontSize) || 0;
      if (parentSize < 22) return;
      accent.classList.add("lda-script-accent");
      const revealParent = accent.closest("[data-reveal]");
      if (!revealParent) requestAnimationFrame(() => accent.classList.add("lda-script-ready"));
    });

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
    const dynamicPage = /^\/(tienda\/(producto|[^/]+)|aprende\/(curso|taller|recurso|cursos\/[^/]+|talleres\/[^/]+|gratis\/[^/]+)|blog|servicios\/[^/]+)$/.test(window.location.pathname);
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
      setMeta('meta[name="twitter:description"]', "content", description);
    }
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", document.title);
    const mainImage = document.querySelector('image-slot[priority="high"], image-slot');
    const imageUrl = mainImage?.getAttribute('src');
    if (imageUrl && !imageUrl.includes('{{')) {
      const absoluteImage = new URL(imageUrl, window.location.origin).href;
      setMeta('meta[property="og:image"]', "content", absoluteImage);
      setMeta('meta[name="twitter:image"]', "content", absoluteImage);
    }
    const path = window.location.pathname;
    let schemaType = 'WebPage';
    if (path.startsWith('/tienda/')) schemaType = 'Product';
    else if (path.startsWith('/blog')) schemaType = 'BlogPosting';
    else if (path.includes('/curso')) schemaType = 'Course';
    else if (path.includes('/taller')) schemaType = 'Event';
    else if (path.includes('/recurso') || path.includes('/gratis/')) schemaType = 'DigitalDocument';
    else if (path.startsWith('/servicios/')) schemaType = 'Service';
    let structured = document.getElementById('lda-dynamic-structured-data');
    if (!structured) { structured = document.createElement('script'); structured.id = 'lda-dynamic-structured-data'; structured.type = 'application/ld+json'; document.head.appendChild(structured); }
    structured.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': schemaType, name: title, description: description || undefined, url, image: imageUrl ? new URL(imageUrl, window.location.origin).href : undefined, provider: { '@type': 'Organization', name: 'Life Deco Art', url: window.location.origin } });
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
    document.querySelectorAll('#lda-whatsapp-fab, #lda-whatsapp-fab-static').forEach((floatingButton) => {
      const number = String(global.whatsappFloatingNumber || global.whatsappNumber || '18495390410').replace(/\D/g, '');
      const message = String(global.whatsappInitialMessage || '').trim();
      floatingButton.href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
      floatingButton.style.display = global.whatsappFloatingVisible === false ? 'none' : 'flex';
    });
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
    observeRevealElements();
    updateDynamicMetadata();
    loadCmsDomContent();
    window.addEventListener("scroll", scheduleRevealSweep, { passive: true });
    window.addEventListener("resize", scheduleRevealSweep, { passive: true });
    setTimeout(scheduleRevealSweep, 250);
    setTimeout(scheduleRevealSweep, 900);
    const observer = new MutationObserver(() => {
      enhanceContent();
      observeRevealElements();
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
