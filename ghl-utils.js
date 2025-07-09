// ghl-utils.js
// == GHL Utility Kit v1.1 ==
// Generic DOM + GSAP helpers for GoHighLevel

class GHLUtility {
  // ─────────── Core DOM Helpers ───────────

  static getById(id) {
    return document.getElementById(id);
  }

  static getByClass(className) {
    return document.getElementsByClassName(className);
  }

  static getNestedElement(parentSelector, childTag) {
    const parent = typeof parentSelector === 'string'
      ? this.getById(parentSelector) || document.querySelector(parentSelector)
      : parentSelector;
    return parent ? parent.querySelector(childTag) : null;
  }

  static applyStyles(el, styles) {
    if (el && styles) Object.assign(el.style, styles);
  }

  static addEvent(el, event, cb) {
    if (el && event && typeof cb === 'function') el.addEventListener(event, cb);
  }

  static setContent(el, content, isHTML = false) {
    if (!el) return;
    isHTML ? (el.innerHTML = content) : (el.textContent = content);
  }

  static toggleVisibility(el) {
    if (!el) return;
    el.style.display = el.style.display === 'none' ? '' : 'none';
  }

  static addClass(el, cls) {
    if (el && cls) el.classList.add(cls);
  }

  static removeClass(el, cls) {
    if (el && cls) el.classList.remove(cls);
  }

  static inspectStructure() {
    return {
      sections: document.querySelectorAll('.c-section'),
      rows:     document.querySelectorAll('.c-row'),
      wrappers: document.querySelectorAll('.c-wrapper')
    };
  }

  // ─────────── GHL-Specific Helpers ───────────

  /** Fires cb on initial load and every SPA nav change in GoHighLevel */
  static onGHLPageLoad(cb) {
    let last = location.href;
    const obs = new MutationObserver(() => {
      if (location.href !== last) {
        last = location.href;
        setTimeout(cb, 300);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // initial run
    setTimeout(cb, 500);
  }

  /** Wraps all top-level <div>s into a smoother wrapper for GSAP ScrollSmoother */
  static wrapGHLPageContent({
    wrapperId      = 'smooth-wrapper',
    contentId      = 'smooth-content',
    targetSelector = `body > div:not(script):not(style):not(#${wrapperId}):not(#${contentId})`
  } = {}) {
    if (this.getById(wrapperId)) return;
    const w = document.createElement('div'); w.id = wrapperId;
    const c = document.createElement('div'); c.id = contentId;
    const els = Array.from(document.querySelectorAll(targetSelector));
    if (!els.length) {
      console.warn(`[GHLUtility] wrap: no elements matched ${targetSelector}`);
      return;
    }
    els.forEach(el => c.appendChild(el));
    w.appendChild(c);
    document.body.appendChild(w);
  }

  /** Polls until selector matches an element, then fires cb(el) */
  static waitForEl(selector, cb, timeout = 7000) {
    const start = Date.now();
    const iv = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(iv);
        cb(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(iv);
      }
    }, 100);
  }

  /** Injects a <style id="id">…css…</style> if not already present */
  static injectCSS(id, css) {
    if (this.getById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /** Watches for newly-added nodes matching selector and fires cb(node) */
  static observeMutations(selector, cb) {
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1 && n.matches(selector)) cb(n);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /** Initializes GSAP ScrollSmoother with optional hooks */
  static initSmoothScroll({
    wrapperOptions  = {},
    smootherOptions = {},
    postInit        = null
  } = {}) {
    // ensure GSAP plugins registered
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    this.wrapGHLPageContent(wrapperOptions);

    ScrollSmoother.create(Object.assign({
      wrapper:      "#smooth-wrapper",
      content:      "#smooth-content",
      smooth:       5,
      effects:      true,
      smoothTouch: 0.1
    }, smootherOptions));

    if (typeof postInit === 'function') postInit();
  }
}
