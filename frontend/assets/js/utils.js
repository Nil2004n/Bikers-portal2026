/* ============================================================
   utils.js — escHtml, relativeTime, showToast, debounce, skeleton
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escHtml(input) {
    if (input === null || input === undefined) return '';
    return String(input).replace(/[&<>"']/g, function (c) {
      return HTML_ESCAPES[c];
    });
  }

  function relativeTime(isoDate) {
    if (!isoDate) return '';
    const date = (isoDate instanceof Date) ? isoDate : new Date(isoDate);
    if (isNaN(date.getTime())) return '';

    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    if (diff < 2592000) return Math.floor(diff / 604800) + 'w ago';

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDate(isoDate, opts) {
    if (!isoDate) return '';
    const date = (isoDate instanceof Date) ? isoDate : new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const o = Object.assign({ day: 'numeric', month: 'short', year: 'numeric' }, opts || {});
    return date.toLocaleDateString('en-IN', o);
  }

  function formatPrice(n) {
    if (n === null || n === undefined || n === '') return '₹0';
    const num = Number(n);
    if (isNaN(num)) return '₹0';
    try {
      return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    } catch (e) {
      return '₹' + Math.round(num);
    }
  }

  function debounce(fn, ms) {
    let t = null;
    return function debounced() {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
    };
  }

  function debounceImmediate(fn, ms) {
    let t = null;
    return function debounced() {
      const args = arguments;
      const ctx = this;
      if (t) clearTimeout(t);
      const callNow = !t;
      t = setTimeout(function () { t = null; }, ms || 250);
      if (callNow) fn.apply(ctx, args);
    };
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function createEl(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'dataset') Object.assign(el.dataset, attrs[k]);
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(el.style, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k in el) {
          try { el[k] = attrs[k]; } catch (e) { el.setAttribute(k, attrs[k]); }
        } else {
          el.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        if (typeof c === 'string' || typeof c === 'number') {
          el.appendChild(document.createTextNode(String(c)));
        } else {
          el.appendChild(c);
        }
      });
    }
    return el;
  }

  /* ----- Toast ----- */
  function ensureToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      document.body.appendChild(c);
    }
    return c;
  }

  const TOAST_ICONS = {
    success: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    error:   '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info:    '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };

  function showToast(message, type = 'info', duration = 3000) {
    const container = ensureToastContainer();
    const t = (type || 'info').toLowerCase();
    const iconHtml = TOAST_ICONS[t] || TOAST_ICONS.info;
    const safeMsg = escHtml(message);

    const toast = document.createElement('div');
    toast.className = 'toast toast--' + t;
    toast.setAttribute('role', t === 'error' ? 'alert' : 'status');
    toast.innerHTML =
      iconHtml +
      '<div class="toast__body">' + safeMsg + '</div>' +
      '<button type="button" class="toast__close" aria-label="Dismiss notification">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>';

    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });

    const close = function () {
      toast.classList.remove('is-visible');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    toast.querySelector('.toast__close').addEventListener('click', close);
    setTimeout(close, duration);
    return { close: close };
  }

  /* ----- Modal helpers ----- */
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return null;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusable = m.querySelector('input, textarea, select, button');
    if (focusable) setTimeout(function () { focusable.focus(); }, 100);
    return m;
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function setupModalClose(modalEl) {
    if (!modalEl) return;
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) {
        closeModal(modalEl.id);
      }
    });
    modalEl.querySelectorAll('[data-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(modalEl.id); });
    });
  }

  /* ----- Skeleton builders ----- */
  function skeletonCard(hasImage) {
    let img = '';
    if (hasImage) {
      img = '<div class="skeleton skeleton--image" aria-hidden="true"></div>';
    }
    return [
      '<div class="skeleton-card" aria-hidden="true">',
      '  <div class="skeleton-card__head">',
      '    <div class="skeleton skeleton--avatar" style="width:44px;height:44px;border-radius:50%;"></div>',
      '    <div class="skeleton-card__lines">',
      '      <div class="skeleton skeleton--title" style="width:35%;"></div>',
      '      <div class="skeleton skeleton--text" style="width:20%;"></div>',
      '    </div>',
      '  </div>',
      '  <div class="skeleton skeleton--text" style="width:95%;"></div>',
      '  <div class="skeleton skeleton--text" style="width:80%;"></div>',
        img,
      '  <div class="skeleton skeleton--text" style="width:40%; height:32px; border-radius:8px;"></div>',
      '</div>'
    ].join('\n');
  }

  function skeletonPostCard() { return skeletonCard(true); }
  function skeletonBikeCard() { return skeletonCard(false); }

  /* ----- Empty state helper ----- */
  function emptyState(opts) {
    const o = opts || {};
    const icon = o.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
    return [
      '<div class="empty-state">',
      '  <div class="empty-state__icon" aria-hidden="true">' + icon + '</div>',
        o.title ? '  <h3 class="empty-state__title">' + escHtml(o.title) + '</h3>' : '',
        o.message ? '  <p class="empty-state__message">' + escHtml(o.message) + '</p>' : '',
        o.actionLabel ? '  <button type="button" class="btn btn--primary empty-state__action" data-empty-action>' + escHtml(o.actionLabel) + '</button>' : '',
      '</div>'
    ].join('\n');
  }

  /* ----- File to base64 ----- */
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  /* ----- Misc ----- */
  function initialsFromName(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function pluralize(n, one, many) {
    return n + ' ' + (Math.abs(n) === 1 ? one : (many || one + 's'));
  }

  function uniqueId(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function getQueryParam(key) {
    const h = (global.location && global.location.hash) || '';
    const i = h.indexOf('?');
    if (i < 0) return null;
    const params = new URLSearchParams(h.slice(i + 1));
    return params.get(key);
  }

  function setQueryParam(key, value) {
    const h = (global.location && global.location.hash) || '';
    const hashIndex = h.indexOf('?');
    const base = hashIndex >= 0 ? h.slice(0, hashIndex) : h;
    const params = new URLSearchParams(hashIndex >= 0 ? h.slice(hashIndex + 1) : '');
    if (value === null || value === undefined) params.delete(key);
    else params.set(key, value);
    const q = params.toString();
    global.location.hash = base + (q ? '?' + q : '');
  }

  global.utils = {
    escHtml: escHtml,
    relativeTime: relativeTime,
    formatDate: formatDate,
    formatPrice: formatPrice,
    debounce: debounce,
    debounceImmediate: debounceImmediate,
    $: $,
    $$: $$,
    createEl: createEl,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    setupModalClose: setupModalClose,
    skeletonCard: skeletonCard,
    skeletonPostCard: skeletonPostCard,
    skeletonBikeCard: skeletonBikeCard,
    emptyState: emptyState,
    fileToBase64: fileToBase64,
    initialsFromName: initialsFromName,
    pluralize: pluralize,
    uniqueId: uniqueId,
    getQueryParam: getQueryParam,
    setQueryParam: setQueryParam
  };
})(window);
