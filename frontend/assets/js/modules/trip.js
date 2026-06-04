/* ============================================================
   modules/trip.js — TripModule
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const u = global.utils;
  const api = global.apiFetch;

  const STATUSES = ['All', 'Upcoming', 'Active', 'Completed'];

  const state = {
    page: 1,
    limit: 20,
    items: [],
    total: 0,
    hasMore: true,
    loading: false,
    filter: 'All',
    activeTripId: null
  };

  function el(id) { return document.getElementById(id); }

  function statusBadge(status) {
    const s = (status || 'Planned').toLowerCase();
    if (s === 'active') return '<span class="badge badge--primary badge--dot">Active</span>';
    if (s === 'completed') return '<span class="badge badge--success badge--dot">Completed</span>';
    if (s === 'cancelled') return '<span class="badge badge--error badge--dot">Cancelled</span>';
    return '<span class="badge badge--warning badge--dot">Upcoming</span>';
  }

  function tripCardHTML(trip) {
    const id = trip.id || trip._id;
    const name = u.escHtml(trip.name || 'Untitled trip');
    const date = u.formatDate(trip.plannedDate || trip.startDate);
    const start = u.escHtml(trip.startLocation || '—');
    const end = u.escHtml(trip.endLocation || '—');
    const distance = trip.distance != null ? trip.distance + ' km' : '—';
    const duration = trip.duration || '—';
    const status = trip.status || 'Planned';
    const isActive = state.activeTripId === id;

    let actionHtml = '';
    if (status === 'Planned' || status === 'Upcoming') {
      actionHtml =
        '<button type="button" class="btn btn--primary btn--sm" data-trip-start="' + u.escHtml(id) + '">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start</button>' +
        '<button type="button" class="btn btn--secondary btn--sm" data-trip-view="' + u.escHtml(id) + '">View</button>';
    } else if (status === 'Active') {
      actionHtml =
        '<button type="button" class="btn btn--primary btn--sm" data-trip-complete="' + u.escHtml(id) + '">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> Complete</button>' +
        '<button type="button" class="btn btn--secondary btn--sm" data-trip-view="' + u.escHtml(id) + '">View</button>';
    } else {
      actionHtml = '<button type="button" class="btn btn--secondary btn--sm" data-trip-view="' + u.escHtml(id) + '">View</button>';
    }
    actionHtml += '<button type="button" class="btn btn--ghost btn--sm" data-trip-delete="' + u.escHtml(id) + '" aria-label="Delete trip">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>' +
      '</button>';

    return [
      '<article class="card trip-card' + (isActive ? ' is-active' : '') + '" data-trip-id="' + u.escHtml(id) + '">',
      '  <div class="trip-card__head">',
      '    <div>',
      '      <div class="trip-card__title">' + name + '</div>',
      '      <div class="trip-card__route">' +
            '<strong>' + start + '</strong>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
            '<strong>' + end + '</strong>' +
          '</div>',
      '    </div>',
        statusBadge(status),
      '  </div>',
      '  <div class="trip-card__stats">',
      '    <span class="trip-card__stat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            date +
          '</span>',
      '    <span class="trip-card__stat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
            distance +
          '</span>',
      '    <span class="trip-card__stat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            duration +
          '</span>',
      '  </div>',
      '  <div class="trip-card__actions">' + actionHtml + '</div>',
      '</article>'
    ].join('\n');
  }

  function renderSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html +=
        '<div class="card trip-card">' +
          '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;">' +
            '<div style="flex:1;"><div class="skeleton skeleton--title"></div><div class="skeleton skeleton--text" style="width:60%;"></div></div>' +
            '<div class="skeleton" style="width:80px;height:24px;border-radius:9999px;"></div>' +
          '</div>' +
          '<div style="display:flex;gap:12px;">' +
            '<div class="skeleton skeleton--text" style="width:25%;"></div>' +
            '<div class="skeleton skeleton--text" style="width:25%;"></div>' +
            '<div class="skeleton skeleton--text" style="width:25%;"></div>' +
          '</div>' +
        '</div>';
    }
    return html;
  }

  function renderTrips(trips, replace) {
    const list = el('trips-list');
    if (!list) return;
    if (replace) {
      list.innerHTML = trips.length
        ? trips.map(tripCardHTML).join('\n')
        : u.emptyState({
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/></svg>',
            title: 'No trips yet',
            message: 'Plan your first ride and start logging your adventures.',
            actionLabel: 'Plan a trip'
          });
    } else {
      list.insertAdjacentHTML('beforeend', trips.map(tripCardHTML).join('\n'));
    }
    bindTripCards(list);
  }

  function bindTripCards(scope) {
    const root = scope || document;
    root.querySelectorAll('[data-trip-id]').forEach(function (card) {
      const id = card.getAttribute('data-trip-id');
      card.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        viewTrip(id);
      });
      card.querySelectorAll('[data-trip-start]').forEach(function (b) {
        if (b.dataset.bound) return;
        b.dataset.bound = '1';
        b.addEventListener('click', function (e) { e.stopPropagation(); startTrip(id); });
      });
      card.querySelectorAll('[data-trip-complete]').forEach(function (b) {
        if (b.dataset.bound) return;
        b.dataset.bound = '1';
        b.addEventListener('click', function (e) { e.stopPropagation(); completeTrip(id); });
      });
      card.querySelectorAll('[data-trip-view]').forEach(function (b) {
        if (b.dataset.bound) return;
        b.dataset.bound = '1';
        b.addEventListener('click', function (e) { e.stopPropagation(); viewTrip(id); });
      });
      card.querySelectorAll('[data-trip-delete]').forEach(function (b) {
        if (b.dataset.bound) return;
        b.dataset.bound = '1';
        b.addEventListener('click', function (e) { e.stopPropagation(); deleteTrip(id, card); });
      });
    });
  }

  async function loadTrips() {
    if (state.loading) return;
    state.loading = true;
    const list = el('trips-list');
    if (list) list.setAttribute('aria-busy', 'true');

    try {
      const params = new URLSearchParams();
      params.set('page', String(state.page));
      params.set('limit', String(state.limit));
      if (state.filter && state.filter !== 'All') params.set('status', state.filter);

      const response = await api('/api/trips?' + params.toString());
      const items = (response && (response.items || response.trips || response.data || response)) || [];
      const total = (response && response.total) || 0;
      const hasMore = (response && typeof response.hasMore === 'boolean') ? response.hasMore : (items.length === state.limit);

      state.items = state.page === 1 ? items : state.items.concat(items);
      state.total = total;
      state.hasMore = hasMore;

      renderTrips(items, state.page === 1);
    } catch (e) {
      console.error('loadTrips', e);
      if (list) {
        list.innerHTML = '<div class="card"><div class="alert alert--error"><div class="alert__content">' +
          '<div class="alert__title">Could not load trips</div>' +
          '<div class="alert__message">' + u.escHtml(e.message || 'Network error') + '</div>' +
          '</div></div></div>';
      }
      u.showToast('Failed to load trips', 'error');
    } finally {
      state.loading = false;
      if (list) list.removeAttribute('aria-busy');
    }
  }

  function viewTrip(id) {
    state.activeTripId = id;
    document.querySelectorAll('.trip-card').forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-trip-id') === id);
    });
    const trip = state.items.find(function (t) { return (t.id || t._id) === id; });
    if (trip) renderTripDetail(trip);
  }

  function renderTripDetail(trip) {
    const panel = el('trip-detail');
    if (!panel) return;
    const id = trip.id || trip._id;
    const status = (trip.status || 'Planned').toLowerCase();

    panel.innerHTML = [
      '<div class="card">',
      '  <div class="card__header">',
      '    <div>',
      '      <div class="trip-detail__title">' + u.escHtml(trip.name || 'Trip') + '</div>',
      '      <div class="trip-detail__route">' +
            '<strong>' + u.escHtml(trip.startLocation || '—') + '</strong>' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
            '<strong>' + u.escHtml(trip.endLocation || '—') + '</strong>' +
          '</div>',
      '    </div>',
        statusBadge(trip.status),
      '  </div>',
      '  <div class="trip-detail__stats">',
      '    <div class="trip-stat"><div class="trip-stat__label">Date</div><div class="trip-stat__value">' + u.escHtml(u.formatDate(trip.plannedDate)) + '</div></div>',
      '    <div class="trip-stat"><div class="trip-stat__label">Distance</div><div class="trip-stat__value">' + (trip.distance || '—') + ' km</div></div>',
      '    <div class="trip-stat"><div class="trip-stat__label">Avg Speed</div><div class="trip-stat__value">' + (trip.avgSpeed || '18') + ' km/h</div></div>',
      '    <div class="trip-stat"><div class="trip-stat__label">Calories</div><div class="trip-stat__value">' + (trip.calories || '—') + '</div></div>',
      '  </div>',
      '  <h4 style="font-family:var(--font-display); font-size:var(--text-md); margin-bottom:var(--space-2); text-transform:uppercase; letter-spacing:0.04em;">Status</h4>',
      '  <div class="trip-timeline">',
      '    <div class="timeline-step is-done"><div class="timeline-step__dot">1</div><div class="timeline-step__label">Planned</div></div>',
      '    <div class="timeline-step ' + (status === 'active' || status === 'completed' ? 'is-done' : (status === 'planned' || status === 'upcoming' ? 'is-active' : '')) + '"><div class="timeline-step__dot">2</div><div class="timeline-step__label">Active</div></div>',
      '    <div class="timeline-step ' + (status === 'completed' ? 'is-done' : '') + '"><div class="timeline-step__dot">3</div><div class="timeline-step__label">Completed</div></div>',
      '  </div>',
        (trip.notes ? '<p class="text-muted" style="margin:var(--space-3) 0; font-size:var(--text-sm);">' + u.escHtml(trip.notes) + '</p>' : ''),
      '  <div style="display:flex; gap:var(--space-2); margin-top:var(--space-4); flex-wrap:wrap;">',
        (status === 'planned' || status === 'upcoming' ? '<button type="button" class="btn btn--primary" data-detail-start="' + u.escHtml(id) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Trip</button>' : ''),
        (status === 'active' ? '<button type="button" class="btn btn--primary" data-detail-complete="' + u.escHtml(id) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> Mark Complete</button>' : ''),
      '  </div>',
      '</div>'
    ].join('\n');

    const startBtn = panel.querySelector('[data-detail-start]');
    if (startBtn) startBtn.addEventListener('click', function () { startTrip(id); });
    const completeBtn = panel.querySelector('[data-detail-complete]');
    if (completeBtn) completeBtn.addEventListener('click', function () { completeTrip(id); });
  }

  function applyFilter(filter) {
    state.filter = filter;
    state.page = 1;
    state.items = [];
    state.hasMore = true;
    const list = el('trips-list');
    if (list) list.innerHTML = renderSkeletons(4);
    document.querySelectorAll('[data-trip-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-trip-filter') === filter ? 'true' : 'false');
    });
    loadTrips();
  }

  function bindFilters() {
    const wrap = el('trip-filters');
    if (!wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = '1';
    wrap.innerHTML = STATUSES.map(function (s) {
      return '<button type="button" class="chip chip--ghost" data-trip-filter="' + s + '" aria-pressed="' + (state.filter === s ? 'true' : 'false') + '">' + s + '</button>';
    }).join('');
    wrap.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-trip-filter]');
      if (!btn) return;
      applyFilter(btn.getAttribute('data-trip-filter'));
    });
  }

  function bindPlanTripModal() {
    const open = el('open-plan-trip');
    if (open && !open.dataset.bound) {
      open.dataset.bound = '1';
      open.addEventListener('click', function () {
        const form = el('plan-trip-form');
        if (form) form.reset();
        const date = el('trip-date');
        if (date) {
          const d = new Date(); d.setDate(d.getDate() + 1);
          date.value = d.toISOString().slice(0, 10);
          date.min = new Date().toISOString().slice(0, 10);
        }
        const alertEl = el('plan-trip-alert');
        if (alertEl) alertEl.innerHTML = '';
        u.openModal('plan-trip-modal');
      });
    }
    const modal = el('plan-trip-modal');
    if (modal) u.setupModalClose(modal);

    const form = el('plan-trip-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', function (e) { e.preventDefault(); submitPlanTrip(); });
    }
    const saveBtn = el('plan-trip-save');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', function (e) { e.preventDefault(); submitPlanTrip(); });
    }
  }

  async function submitPlanTrip() {
    const name = el('trip-name');
    const start = el('trip-start');
    const end = el('trip-end');
    const date = el('trip-date');
    const distance = el('trip-distance');
    const notes = el('trip-notes');
    const saveBtn = el('plan-trip-save');
    const alertEl = el('plan-trip-alert');

    if (!name || !start || !end || !date) return;
    if (!(name.value || '').trim()) { showPlanAlert('Please enter a trip name', 'error'); return; }
    if (!(start.value || '').trim() || !(end.value || '').trim()) { showPlanAlert('Please add start and end locations', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';
    if (alertEl) alertEl.innerHTML = '';

    try {
      const payload = {
        name: name.value.trim(),
        startLocation: start.value.trim(),
        endLocation: end.value.trim(),
        plannedDate: date.value,
        distance: Number(distance && distance.value) || 0,
        notes: (notes && notes.value) || ''
      };
      const created = await api('/api/trips', { method: 'POST', body: payload });
      u.showToast('Trip planned!', 'success');
      u.closeModal('plan-trip-modal');
      if (form) form.reset();
      state.page = 1;
      state.items = [];
      state.hasMore = true;
      const list = el('trips-list');
      if (list) list.innerHTML = renderSkeletons(4);
      loadTrips();
    } catch (e) {
      showPlanAlert(e.message || 'Failed to save trip', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Trip';
    }
  }

  function showPlanAlert(msg, type) {
    const alertEl = el('plan-trip-alert');
    if (!alertEl) return;
    const cls = type === 'success' ? 'alert--success' : 'alert--error';
    alertEl.innerHTML = '<div class="alert ' + cls + '"><div class="alert__content">' + u.escHtml(msg) + '</div></div>';
  }

  async function startTrip(id) {
    try {
      await api('/api/trips/' + encodeURIComponent(id) + '/start', { method: 'PATCH' });
      u.showToast('Trip started — enjoy the ride!', 'success');
      const trip = state.items.find(function (t) { return (t.id || t._id) === id; });
      if (trip) trip.status = 'Active';
      renderTrips(state.items, true);
      if (state.activeTripId === id) viewTrip(id);
    } catch (e) {
      u.showToast('Could not start trip: ' + (e.message || ''), 'error');
    }
  }

  async function completeTrip(id) {
    try {
      await api('/api/trips/' + encodeURIComponent(id) + '/complete', { method: 'PATCH' });
      u.showToast('Trip completed — well ridden!', 'success');
      const trip = state.items.find(function (t) { return (t.id || t._id) === id; });
      if (trip) trip.status = 'Completed';
      renderTrips(state.items, true);
      if (state.activeTripId === id) viewTrip(id);
    } catch (e) {
      u.showToast('Could not complete trip: ' + (e.message || ''), 'error');
    }
  }

  async function deleteTrip(id, card) {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await api('/api/trips/' + encodeURIComponent(id), { method: 'DELETE' });
      state.items = state.items.filter(function (t) { return (t.id || t._id) !== id; });
      if (card && card.parentNode) {
        card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(-6px)';
        setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 200);
      }
      if (state.activeTripId === id) {
        const panel = el('trip-detail');
        if (panel) panel.innerHTML = '<div class="card"><div class="empty-state"><div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/></svg></div><div class="empty-state__title">Select a trip</div><div class="empty-state__message">Pick a trip from the list to see its details.</div></div></div>';
        state.activeTripId = null;
      }
      u.showToast('Trip deleted', 'success');
    } catch (e) {
      u.showToast('Failed to delete trip', 'error');
    }
  }

  function init() {
    const list = el('trips-list');
    if (list) list.innerHTML = renderSkeletons(4);
    const detail = el('trip-detail');
    if (detail) {
      detail.innerHTML = '<div class="card"><div class="empty-state"><div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/></svg></div><div class="empty-state__title">Select a trip</div><div class="empty-state__message">Pick a trip from the list to see its details, status and stats.</div></div></div>';
    }
    state.page = 1;
    state.items = [];
    state.hasMore = true;
    state.activeTripId = null;
    bindFilters();
    bindPlanTripModal();
    loadTrips();
  }

  global.TripModule = { init: init };
})(window);
