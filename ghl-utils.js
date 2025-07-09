// ghl-utils.js
// == GHL Utility Kit v1.11 ==
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

  /**
   * Tell ScrollTrigger to use a custom smooth-scroll instance instead of window.scrollY,
   * and push ScrollTrigger.update() on each frame.
   *
   * @param {object} customScroll   Your CustomSmoothScroll instance
   */
  static initScrollTriggerProxy(customScroll) {
    if (!gsap || !gsap.ScrollTrigger) return;

    // Proxy window scroll calls to your custom scroll
    gsap.ScrollTrigger.scrollerProxy(window, {
      scrollTop(value) {
        if (arguments.length) {
          customScroll.restart(value);
        }
        return customScroll.currentScroll;
      },
      getBoundingClientRect() {
        return {
          top:    0,
          left:   0,
          width:  window.innerWidth,
          height: window.innerHeight
        };
      }
    });

    // Monkey-patch the smoothScrollLoop to also call ScrollTrigger.update()
    const originalLoop = customScroll.smoothScrollLoop.bind(customScroll);
    customScroll.smoothScrollLoop = function() {
      originalLoop();
      gsap.ScrollTrigger.update();
    };
  }

  /**
 * A simple “JS‐driven” smooth scroll that hijacks wheel/touch
 */
class CustomSmoothScroll {
  constructor() {
    this.currentScroll = 0;
    this.targetScroll  = 0;
    this.smoothness    = window.innerWidth < 750 ? 0.03 : 0.056;
    this._binded       = {};
    this.init();
  }
  init() {
    document.body.style.overflow = 'hidden';
    this._binded.onWheel = e => { 
      e.preventDefault(); 
      this.targetScroll = Math.max(0, Math.min(this.targetScroll + e.deltaY, document.body.scrollHeight - window.innerHeight));
    };
    window.addEventListener('wheel', this._binded.onWheel, { passive: false });
    this.lastTime = performance.now();
    this.loop();
  }
  loop() {
    const now = performance.now();
    const dt  = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const t = 1 - Math.pow(1 - this.smoothness, dt * 60);
    this.currentScroll += (this.targetScroll - this.currentScroll) * t;
    window.scrollTo(0, this.currentScroll);
    requestAnimationFrame(this.loop.bind(this));
  }
  restart(pos = 0) {
    this.targetScroll = this.currentScroll = pos;
    window.scrollTo(0, pos);
  }
  destroy() {
    window.removeEventListener('wheel', this._binded.onWheel);
    document.body.style.overflow = '';
  }
}

// expose it globally
window.CustomSmoothScroll = CustomSmoothScroll;

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
