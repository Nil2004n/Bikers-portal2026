/* ============================================================
   modules/bikes.js — BikesModule
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const u = global.utils;
  const api = global.apiFetch;

  const TYPES = ['Road', 'MTB', 'Electric', 'Hybrid', 'Fixed Gear'];
  const MODES = ['Rent', 'Buy', 'Both'];

  const state = {
    page: 1,
    limit: 12,
    items: [],
    total: 0,
    hasMore: true,
    loading: false,
    filters: {
      search: '',
      type: 'All',
      mode: 'All',
      minPrice: '',
      maxPrice: ''
    },
    view: 'grid',
    activeBikeId: null
  };

  function el(id) { return document.getElementById(id); }

  function bikeCardHTML(bike) {
    const id = bike.id || bike._id;
    const name = u.escHtml(bike.name || 'Bike');
    const type = u.escHtml(bike.type || 'Bike');
    const mode = (bike.mode || 'Rent').toLowerCase();
    const isAvailable = bike.available !== false;
    const image = bike.image || bike.imageUrl;
    const priceRent = bike.pricePerDay != null ? bike.pricePerDay : bike.rentPrice;
    const priceBuy = bike.price != null ? bike.price : bike.buyPrice;

    let priceLabel = '';
    if (mode === 'rent' || mode === 'both') {
      priceLabel = u.formatPrice(priceRent) + '<span class="bike-card__price-unit">/day</span>';
    } else {
      priceLabel = u.formatPrice(priceBuy);
    }

    const btn = (mode === 'buy')
      ? '<button type="button" class="btn btn--primary btn--sm" data-buy-bike="' + u.escHtml(id) + '">Buy Now</button>'
      : (mode === 'both'
          ? '<button type="button" class="btn btn--primary btn--sm" data-rent-bike="' + u.escHtml(id) + '">Rent</button>' +
            '<button type="button" class="btn btn--secondary btn--sm" data-buy-bike="' + u.escHtml(id) + '">Buy</button>'
          : '<button type="button" class="btn btn--primary btn--sm" data-rent-bike="' + u.escHtml(id) + '">Rent Now</button>');

    let mediaHtml = '';
    if (image) {
      mediaHtml = '<img src="' + u.escHtml(image) + '" alt="' + name + '" loading="lazy" width="400" height="300">';
    } else {
      mediaHtml =
        '<div class="img-placeholder" style="width:100%;height:100%;" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6l-3 7 4 4M5.5 17.5L9 9h3.5"/></svg>' +
        '</div>';
    }

    return [
      '<article class="card card--hoverable bike-card" data-bike-id="' + u.escHtml(id) + '">',
      '  <div class="bike-card__media">',
      '    ' + mediaHtml,
      '    <div class="bike-card__media-badges">',
      '      <span class="badge badge--primary">' + type + '</span>',
      '      <span class="badge ' + (isAvailable ? 'badge--success' : 'badge--error') + ' badge--dot">' + (isAvailable ? 'Available' : 'Rented') + '</span>',
      '    </div>',
      '  </div>',
      '  <div class="bike-card__body">',
      '    <div class="bike-card__type">' + u.escHtml(mode) + '</div>',
      '    <div class="bike-card__name">' + name + '</div>',
      '    <div class="bike-card__price"><span class="bike-card__price-amount">' + priceLabel + '</span></div>',
      '  </div>',
      '  <div class="bike-card__actions">' + btn + '</div>',
      '</article>'
    ].join('\n');
  }

  function renderSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html +=
        '<div class="card bike-card" style="padding:0;">' +
          '<div class="skeleton" style="aspect-ratio:4/3;border-radius:0;"></div>' +
          '<div style="padding:var(--space-4);display:flex;flex-direction:column;gap:8px;">' +
            '<div class="skeleton skeleton--text" style="width:40%;"></div>' +
            '<div class="skeleton skeleton--title"></div>' +
            '<div class="skeleton skeleton--text" style="width:60%;"></div>' +
          '</div>' +
        '</div>';
    }
    return html;
  }

  function appendBikes(bikes, replace) {
    const grid = el('bikes-grid');
    if (!grid) return;

    if (replace) {
      grid.innerHTML = bikes.length
        ? bikes.map(bikeCardHTML).join('\n')
        : u.emptyState({
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6l-3 7 4 4M5.5 17.5L9 9h3.5"/></svg>',
            title: 'No bikes match',
            message: 'Try adjusting your filters or search for something different.',
            actionLabel: 'Reset filters'
          });
    } else {
      grid.insertAdjacentHTML('beforeend', bikes.map(bikeCardHTML).join('\n'));
    }

    bindBikeCards(grid);
  }

  function bindBikeCards(scope) {
    const root = scope || document;
    root.querySelectorAll('[data-bike-id]').forEach(function (card) {
      const id = card.getAttribute('data-bike-id');
      const rentBtn = card.querySelector('[data-rent-bike]');
      if (rentBtn && !rentBtn.dataset.bound) {
        rentBtn.dataset.bound = '1';
        rentBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openRentModal(id);
        });
      }
      const buyBtn = card.querySelector('[data-buy-bike]');
      if (buyBtn && !buyBtn.dataset.bound) {
        buyBtn.dataset.bound = '1';
        buyBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          handleBuy(id);
        });
      }
    });
  }

  async function loadBikes() {
    if (state.loading || !state.hasMore) return;
    state.loading = true;

    const grid = el('bikes-grid');
    const loadMore = el('bikes-load-more');
    const endMsg = el('bikes-end');
    const count = el('bikes-count');

    if (loadMore) loadMore.disabled = true;

    try {
      const params = new URLSearchParams();
      params.set('page', String(state.page));
      params.set('limit', String(state.limit));
      if (state.filters.type && state.filters.type !== 'All') params.set('type', state.filters.type);
      if (state.filters.mode && state.filters.mode !== 'All') params.set('mode', state.filters.mode);
      if (state.filters.minPrice !== '') params.set('minPrice', String(state.filters.minPrice));
      if (state.filters.maxPrice !== '') params.set('maxPrice', String(state.filters.maxPrice));
      if (state.filters.search) params.set('search', state.filters.search);

      const response = await api('/api/bikes?' + params.toString());
      const items = (response && (response.items || response.bikes || response.data || response)) || [];
      const total = (response && response.total) || 0;
      const hasMore = (response && typeof response.hasMore === 'boolean') ? response.hasMore : (items.length === state.limit);

      state.items = state.page === 1 ? items : state.items.concat(items);
      state.total = total;
      state.hasMore = hasMore;

      appendBikes(items, state.page === 1);

      if (count) count.textContent = state.total ? (state.total + ' bikes') : (state.items.length + ' bikes');
      if (endMsg) endMsg.hidden = state.hasMore;
      if (loadMore) loadMore.hidden = !state.hasMore;
    } catch (e) {
      console.error('loadBikes error', e);
      if (grid) {
        grid.innerHTML = '<div class="card"><div class="alert alert--error"><div class="alert__content">' +
          '<div class="alert__title">Could not load bikes</div>' +
          '<div class="alert__message">' + u.escHtml(e.message || 'Network error') + '</div>' +
          '</div></div></div>';
      }
      u.showToast('Failed to load bikes', 'error');
    } finally {
      state.loading = false;
      if (loadMore) loadMore.disabled = false;
    }
  }

  function applyFilters() {
    state.page = 1;
    state.items = [];
    state.hasMore = true;
    const grid = el('bikes-grid');
    if (grid) grid.innerHTML = renderSkeletons(6);
    loadBikes();
  }

  function resetFilters() {
    state.filters = { search: '', type: 'All', mode: 'All', minPrice: '', maxPrice: '' };
    const search = el('bike-search');
    const min = el('bike-min-price');
    const max = el('bike-max-price');
    if (search) search.value = '';
    if (min) min.value = '';
    if (max) max.value = '';

    document.querySelectorAll('[data-type-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-type-filter') === 'All' ? 'true' : 'false');
    });
    document.querySelectorAll('[data-mode-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode-filter') === 'All' ? 'true' : 'false');
    });
    applyFilters();
  }

  function bindFilters() {
    const search = el('bike-search');
    if (search && !search.dataset.bound) {
      search.dataset.bound = '1';
      search.addEventListener('input', u.debounce(function () {
        state.filters.search = (search.value || '').trim();
        applyFilters();
      }, 300));
    }

    const typeWrap = el('bikes-type-filters');
    if (typeWrap && !typeWrap.dataset.bound) {
      typeWrap.dataset.bound = '1';
      typeWrap.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-type-filter]');
        if (!btn) return;
        const t = btn.getAttribute('data-type-filter');
        state.filters.type = t;
        typeWrap.querySelectorAll('[data-type-filter]').forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-type-filter') === t ? 'true' : 'false');
        });
        applyFilters();
      });
    }

    const modeWrap = el('bikes-mode-filters');
    if (modeWrap && !modeWrap.dataset.bound) {
      modeWrap.dataset.bound = '1';
      modeWrap.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mode-filter]');
        if (!btn) return;
        const m = btn.getAttribute('data-mode-filter');
        state.filters.mode = m;
        modeWrap.querySelectorAll('[data-mode-filter]').forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-mode-filter') === m ? 'true' : 'false');
        });
        applyFilters();
      });
    }

    const minP = el('bike-min-price');
    const maxP = el('bike-max-price');
    if (minP && !minP.dataset.bound) {
      minP.dataset.bound = '1';
      minP.addEventListener('input', u.debounce(function () {
        state.filters.minPrice = minP.value;
        applyFilters();
      }, 400));
    }
    if (maxP && !maxP.dataset.bound) {
      maxP.dataset.bound = '1';
      maxP.addEventListener('input', u.debounce(function () {
        state.filters.maxPrice = maxP.value;
        applyFilters();
      }, 400));
    }

    const apply = el('bikes-apply-filters');
    if (apply && !apply.dataset.bound) {
      apply.dataset.bound = '1';
      apply.addEventListener('click', applyFilters);
    }
    const reset = el('bikes-reset-filters');
    if (reset && !reset.dataset.bound) {
      reset.dataset.bound = '1';
      reset.addEventListener('click', resetFilters);
    }

    const loadMore = el('bikes-load-more');
    if (loadMore && !loadMore.dataset.bound) {
      loadMore.dataset.bound = '1';
      loadMore.addEventListener('click', function () {
        if (!state.loading && state.hasMore) {
          state.page += 1;
          loadBikes();
        }
      });
    }

    const viewBtns = document.querySelectorAll('[data-bikes-view]');
    viewBtns.forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const v = btn.getAttribute('data-bikes-view');
        state.view = v;
        const grid = el('bikes-grid');
        if (grid) grid.classList.toggle('is-list', v === 'list');
        viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-bikes-view') === v ? 'true' : 'false'); });
      });
    });
  }

  async function openRentModal(bikeId) {
    state.activeBikeId = bikeId;
    const modal = el('rent-modal');
    if (!modal) return;

    const nameEl = el('rent-bike-name');
    const imgEl = el('rent-bike-image');
    const startInput = el('rent-start');
    const endInput = el('rent-end');
    const insurance = el('rent-insurance');
    const alertEl = el('rent-alert');
    const confirmBtn = el('rent-confirm-btn');
    const totalEl = el('rent-total');

    if (alertEl) alertEl.innerHTML = '';
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = 'Confirm Booking'; }

    let bike = state.items.find(function (b) { return (b.id || b._id) === bikeId; });
    if (!bike) {
      try {
        bike = await api('/api/bikes/' + encodeURIComponent(bikeId));
      } catch (e) { bike = null; }
    }
    if (bike) {
      if (nameEl) nameEl.textContent = bike.name || 'Bike';
      if (imgEl) {
        if (bike.image || bike.imageUrl) {
          imgEl.src = bike.image || bike.imageUrl;
          imgEl.alt = bike.name || 'Bike';
          imgEl.style.display = 'block';
        } else {
          imgEl.style.display = 'none';
        }
      }
      state.activeBike = bike;
    } else {
      if (nameEl) nameEl.textContent = 'Bike';
    }

    const today = new Date();
    const fmt = function (d) { return d.toISOString().slice(0, 10); };
    if (startInput) {
      startInput.value = fmt(today);
      startInput.min = fmt(today);
    }
    if (endInput) {
      const t2 = new Date(); t2.setDate(t2.getDate() + 1);
      endInput.value = fmt(t2);
      endInput.min = fmt(today);
    }
    if (insurance) insurance.checked = false;

    updateRentTotal();

    u.openModal('rent-modal');
  }

  function daysBetween(startStr, endStr) {
    if (!startStr || !endStr) return 0;
    const a = new Date(startStr);
    const b = new Date(endStr);
    const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  function updateRentTotal() {
    const start = el('rent-start');
    const end = el('rent-end');
    const totalEl = el('rent-total');
    const daysEl = el('rent-days');
    const insurance = el('rent-insurance');
    const bike = state.activeBike;

    if (!start || !end || !totalEl) return;
    const days = daysBetween(start.value, end.value);
    if (daysEl) daysEl.textContent = String(days);

    const price = (bike && (bike.pricePerDay != null ? bike.pricePerDay : bike.rentPrice)) || 0;
    const insuranceFee = (insurance && insurance.checked) ? 99 : 0;
    const total = (price * days) + insuranceFee;
    totalEl.textContent = u.formatPrice(total);
  }

  async function handleInsuranceToggle() {
    const insurance = el('rent-insurance');
    if (!insurance) return;
    if (insurance.checked) {
      try {
        await api('/api/payments', { method: 'POST', body: { type: 'insurance', amount: 99 } });
        u.showToast('Insurance added (₹99)', 'success', 1500);
      } catch (e) {
        insurance.checked = false;
        u.showToast('Insurance unavailable: ' + (e.message || ''), 'error');
        return;
      }
    }
    updateRentTotal();
  }

  async function confirmRental() {
    const start = el('rent-start');
    const end = el('rent-end');
    const insurance = el('rent-insurance');
    const alertEl = el('rent-alert');
    const confirmBtn = el('rent-confirm-btn');
    if (!start || !end || !confirmBtn) return;

    const days = daysBetween(start.value, end.value);
    if (days <= 0) {
      if (alertEl) alertEl.innerHTML = '<div class="alert alert--error"><div class="alert__content">End date must be after start date.</div></div>';
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-spinner"></span> Confirming...';
    if (alertEl) alertEl.innerHTML = '';

    try {
      const payload = {
        bikeId: state.activeBikeId,
        startDate: start.value,
        endDate: end.value,
        insurance: !!(insurance && insurance.checked)
      };
      await api('/api/rentals', { method: 'POST', body: payload });
      if (alertEl) alertEl.innerHTML = '<div class="alert alert--success"><div class="alert__content">Booking confirmed! Check your rentals in Profile.</div></div>';
      u.showToast('Bike booked!', 'success');
      const bike = state.items.find(function (b) { return (b.id || b._id) === state.activeBikeId; });
      if (bike) bike.available = false;
      setTimeout(function () { u.closeModal('rent-modal'); }, 800);
    } catch (e) {
      if (alertEl) alertEl.innerHTML = '<div class="alert alert--error"><div class="alert__content">' + u.escHtml(e.message || 'Failed to book') + '</div></div>';
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'Confirm Booking';
    }
  }

  function bindRentModal() {
    const start = el('rent-start');
    const end = el('rent-end');
    const insurance = el('rent-insurance');
    if (start && !start.dataset.bound) {
      start.dataset.bound = '1';
      start.addEventListener('change', updateRentTotal);
    }
    if (end && !end.dataset.bound) {
      end.dataset.bound = '1';
      end.addEventListener('change', updateRentTotal);
    }
    if (insurance && !insurance.dataset.bound) {
      insurance.dataset.bound = '1';
      insurance.addEventListener('change', handleInsuranceToggle);
    }
    const confirmBtn = el('rent-confirm-btn');
    if (confirmBtn && !confirmBtn.dataset.bound) {
      confirmBtn.dataset.bound = '1';
      confirmBtn.addEventListener('click', confirmRental);
    }
    const modal = el('rent-modal');
    if (modal) u.setupModalClose(modal);
  }

  async function handleBuy(bikeId) {
    try {
      await api('/api/payments', { method: 'POST', body: { type: 'bike-purchase', bikeId: bikeId } });
      u.showToast('Purchase initiated!', 'success');
    } catch (e) {
      u.showToast('Purchase failed: ' + (e.message || ''), 'error');
    }
  }

  function init() {
    const grid = el('bikes-grid');
    if (grid) grid.innerHTML = renderSkeletons(6);
    state.page = 1;
    state.items = [];
    state.hasMore = true;
    bindFilters();
    bindRentModal();
    loadBikes();
  }

  global.BikesModule = { init: init };
})(window);
