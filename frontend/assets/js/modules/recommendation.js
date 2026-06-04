/* ============================================================
   modules/recommendation.js — RecoModule
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const u = global.utils;
  const api = global.apiFetch;

  const STYLES = ['Road', 'MTB', 'Commute', 'Touring', 'Casual'];
  const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
  const TERRAINS = ['Flat', 'Hilly', 'Mixed'];

  const state = {
    submitting: false,
    form: {
      style: 'Road',
      budget: 60000,
      experience: 'Beginner',
      terrain: 'Flat',
      hoursPerWeek: 4,
      notes: ''
    }
  };

  function el(id) { return document.getElementById(id); }

  function recoCard(item, index) {
    const rankClass = index === 0 ? 'reco-card__rank--gold' : (index === 1 ? 'reco-card__rank--silver' : (index === 2 ? 'reco-card__rank--bronze' : ''));
    const match = Math.max(0, Math.min(100, Math.round(item.matchScore || item.score || 0)));
    const price = item.priceRange || (item.bike && (item.bike.priceRange));
    const id = item.bikeId || (item.bike && (item.bike.id || item.bike._id));

    return [
      '<article class="card reco-card">',
      '  <div class="reco-card__rank ' + rankClass + '">' + (index + 1) + '</div>',
      '  <div class="reco-card__body">',
      '    <div class="reco-card__name">' + u.escHtml(item.bikeName || (item.bike && item.bike.name) || 'Recommendation') + '</div>',
      '    <div class="reco-card__match">',
      '      <span class="reco-card__match-pct">' + match + '%</span>',
      '      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + match + '">',
      '        <div class="progress__bar" style="width:' + match + '%;"></div>',
      '      </div>',
      '    </div>',
      '    <div class="reco-card__why">' + u.escHtml(item.explanation || item.reason || 'A solid match for your riding preferences.') + '</div>',
      '    <div class="reco-card__meta">',
      '      <div class="reco-card__price">Price: <span class="reco-card__price-amount">' + u.escHtml(price || '—') + '</span></div>',
      '      <button type="button" class="btn btn--primary btn--sm" data-view-bike="' + u.escHtml(id || '') + '">',
      '        View Bikes',
      '        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
      '      </button>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join('\n');
  }

  function buildPayload() {
    return {
      style: state.form.style,
      budget: Number(state.form.budget) || 0,
      experience: state.form.experience,
      terrain: state.form.terrain,
      hoursPerWeek: Number(state.form.hoursPerWeek) || 0,
      notes: state.form.notes || ''
    };
  }

  function bindForm() {
    const form = el('reco-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    const styleWrap = el('reco-style');
    if (styleWrap) {
      styleWrap.innerHTML = STYLES.map(function (s) {
        return '<button type="button" class="chip" data-reco-style="' + s + '" aria-pressed="' + (state.form.style === s ? 'true' : 'false') + '">' + s + '</button>';
      }).join('');
      styleWrap.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-reco-style]');
        if (!btn) return;
        const s = btn.getAttribute('data-reco-style');
        state.form.style = s;
        styleWrap.querySelectorAll('[data-reco-style]').forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-reco-style') === s ? 'true' : 'false');
        });
      });
    }

    const terrainWrap = el('reco-terrain');
    if (terrainWrap) {
      terrainWrap.innerHTML = TERRAINS.map(function (t) {
        return '<button type="button" class="chip" data-reco-terrain="' + t + '" aria-pressed="' + (state.form.terrain === t ? 'true' : 'false') + '">' + t + '</button>';
      }).join('');
      terrainWrap.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-reco-terrain]');
        if (!btn) return;
        const t = btn.getAttribute('data-reco-terrain');
        state.form.terrain = t;
        terrainWrap.querySelectorAll('[data-reco-terrain]').forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-reco-terrain') === t ? 'true' : 'false');
        });
      });
    }

    const expSelect = el('reco-experience');
    if (expSelect) {
      expSelect.innerHTML = EXPERIENCE.map(function (e) {
        return '<option value="' + e + '"' + (state.form.experience === e ? ' selected' : '') + '>' + e + '</option>';
      }).join('');
      expSelect.addEventListener('change', function () { state.form.experience = expSelect.value; });
    }

    const slider = el('reco-budget-slider');
    const number = el('reco-budget-number');
    const updateBudget = function (v) {
      const n = Math.max(5000, Math.min(200000, Number(v) || 0));
      state.form.budget = n;
      if (slider && Number(slider.value) !== n) slider.value = String(n);
      if (number && Number(number.value) !== n) number.value = String(n);
      const out = el('reco-budget-display');
      if (out) out.textContent = u.formatPrice(n);
    };

    if (slider) {
      slider.min = '5000';
      slider.max = '200000';
      slider.step = '1000';
      slider.value = String(state.form.budget);
      slider.addEventListener('input', function () { updateBudget(slider.value); });
    }
    if (number) {
      number.min = '5000';
      number.max = '200000';
      number.step = '1000';
      number.value = String(state.form.budget);
      number.addEventListener('input', function () { updateBudget(number.value); });
    }
    updateBudget(state.form.budget);

    const hours = el('reco-hours');
    if (hours) {
      hours.value = String(state.form.hoursPerWeek);
      hours.addEventListener('input', function () {
        state.form.hoursPerWeek = Math.max(0, Math.min(40, Number(hours.value) || 0));
      });
    }

    const notes = el('reco-notes');
    if (notes) {
      notes.addEventListener('input', function () { state.form.notes = notes.value; });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm();
    });
  }

  function setLoading(loading) {
    const btn = el('reco-submit-btn');
    const results = el('reco-results');
    if (btn) {
      btn.disabled = loading;
      btn.innerHTML = loading
        ? '<span class="btn-spinner"></span> Finding matches...'
        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg> Get Recommendations';
    }
    if (results && loading) {
      results.innerHTML =
        '<div class="card reco-loading">' +
          '<div class="spinner spinner--lg" aria-hidden="true"></div>' +
          '<div>AI is analysing your preferences…</div>' +
          '<div class="text-muted" style="font-size:var(--text-sm);">Crunching data from thousands of bikes</div>' +
        '</div>';
    }
  }

  async function submitForm() {
    if (state.submitting) return;
    state.submitting = true;
    setLoading(true);

    try {
      const response = await api('/api/recommend', { method: 'POST', body: buildPayload() });
      const results = (response && (response.results || response.recommendations || response.data || response)) || [];
      renderResults(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error('submitForm', e);
      const results = el('reco-results');
      if (results) {
        results.innerHTML = '<div class="card"><div class="alert alert--error"><div class="alert__content">' +
          '<div class="alert__title">Could not fetch recommendations</div>' +
          '<div class="alert__message">' + u.escHtml(e.message || 'Please try again') + '</div>' +
          '</div></div></div>';
      }
      u.showToast('Failed to get recommendations', 'error');
    } finally {
      state.submitting = false;
      setLoading(false);
    }
  }

  function renderResults(results) {
    const wrap = el('reco-results');
    if (!wrap) return;
    if (!results.length) {
      wrap.innerHTML = u.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
        title: 'No matches yet',
        message: 'Try widening your budget or adjusting your riding style to see more options.',
        actionLabel: 'Refine preferences'
      });
      return;
    }
    wrap.innerHTML = results.map(recoCard).join('');
    wrap.querySelectorAll('[data-view-bike]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-view-bike') || '';
        const hash = '#bikes' + (id ? '?focus=' + encodeURIComponent(id) : '');
        global.location.hash = hash;
      });
    });
  }

  function init() {
    const results = el('reco-results');
    if (results) results.innerHTML = '';
    bindForm();
  }

  global.RecoModule = { init: init };
})(window);
