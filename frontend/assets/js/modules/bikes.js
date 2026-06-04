/* ============================================================
   bikes.js — Module 2.0: Bike Rent / Buy
   Routes: #bikes
   API:
     GET  /api/bikes            list bikes (query params: type, available, search, page)
     GET  /api/bikes/:id        bike detail
     POST /api/rentals          create rental booking
     GET  /api/rentals/me       current user rentals
   ============================================================ */

window.BikesModule = (() => {

  /* ── Local state ──────────────────────────────────────── */
  let bikes        = [];
  let myRentals    = [];
  let currentPage  = 1;
  let totalPages   = 1;
  let activeFilter = 'all';
  let searchQuery  = '';
  let detailBike   = null;

  const FILTERS = [
    { key: 'all',       label: 'All' },
    { key: 'mountain',  label: 'Mountain' },
    { key: 'road',      label: 'Road' },
    { key: 'electric',  label: 'Electric' },
    { key: 'hybrid',    label: 'Hybrid' },
    { key: 'cruiser',   label: 'Cruiser' },
  ];

  /* ── Render shell ─────────────────────────────────────── */
  function renderShell() {
    return `
    <div class="page-section">
      <!-- Page header -->
      <div class="page-header">
        <div class="page-header__text">
          <h1 class="page-title">Bikes</h1>
          <p class="page-subtitle">Browse, rent or buy bikes near you.</p>
        </div>
        <div class="page-actions">
          <div class="input-group search-bar">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input id="bike-search" type="search" class="form-control" placeholder="Search bikes…" value="${escHtml(searchQuery)}" aria-label="Search bikes" style="border-radius:var(--radius-full);padding-left:var(--space-10);" />
          </div>
        </div>
      </div>

      <!-- My Rentals tab strip -->
      <div class="tabs" role="tablist" id="bikes-tabs">
        <button class="tab active" role="tab" aria-selected="true"  data-tab="browse" id="tab-browse">Browse</button>
        <button class="tab"        role="tab" aria-selected="false" data-tab="rentals" id="tab-rentals">My Rentals</button>
      </div>

      <!-- Browse panel -->
      <div id="bikes-browse-panel" role="tabpanel" aria-labelledby="tab-browse">
        <!-- Filters -->
        <div class="filter-bar" id="bike-filter-bar" role="group" aria-label="Filter by type">
          ${FILTERS.map(f => `
            <button class="filter-chip${activeFilter === f.key ? ' active' : ''}"
                    data-filter="${f.key}">${f.label}</button>
          `).join('')}
        </div>

        <!-- Grid -->
        <div id="bikes-grid" class="bike-grid" aria-live="polite" aria-label="Bike listings"></div>

        <!-- Pagination -->
        <div class="pagination" id="bikes-pagination" style="margin-top:var(--space-6);justify-content:center;"></div>
      </div>

      <!-- My Rentals panel -->
      <div id="bikes-rentals-panel" role="tabpanel" aria-labelledby="tab-rentals" style="display:none;">
        <div id="rentals-list"></div>
      </div>
    </div>

    <!-- Bike Detail Modal -->
    <div class="modal-backdrop" id="bike-modal" role="dialog" aria-modal="true" aria-labelledby="bike-modal-title">
      <div class="modal" style="max-width:620px;">
        <div class="modal-header">
          <h2 class="modal-title" id="bike-modal-title">Bike Details</h2>
          <button class="modal-close btn btn-ghost btn-icon" id="bike-modal-close" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="bike-modal-body"></div>
        <div class="modal-footer" id="bike-modal-footer"></div>
      </div>
    </div>

    <!-- Booking Modal -->
    <div class="modal-backdrop" id="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      <div class="modal" style="max-width:480px;">
        <div class="modal-header">
          <h2 class="modal-title" id="booking-modal-title">Book Bike</h2>
          <button class="modal-close btn btn-ghost btn-icon" id="booking-modal-close" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="booking-modal-body"></div>
        <div class="modal-footer" id="booking-modal-footer"></div>
      </div>
    </div>`;
  }

  /* ── Bike card ────────────────────────────────────────── */
  function bikeCard(b) {
    const available = b.available !== false;
    return `
    <article class="card bike-card" data-bike-id="${b.id}" role="button" tabindex="0"
             aria-label="View details for ${escHtml(b.name)}"
             style="cursor:pointer;">
      <img class="bike-card__image" src="${escHtml(b.imageUrl || fallbackBikeImg(b.type))}"
           alt="${escHtml(b.name)}" width="400" height="225" loading="lazy"
           onerror="this.src='${fallbackBikeImg()}'" />
      <div class="bike-card__body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2);">
          <h3 class="bike-card__name">${escHtml(b.name)}</h3>
          <span class="badge ${available ? 'badge-success' : 'badge-error'}">${available ? 'Available' : 'Booked'}</span>
        </div>
        <div class="bike-card__price">₹${fmtPrice(b.pricePerDay)}<span style="font-weight:400;font-size:var(--text-xs);color:var(--color-text-muted);"> /day</span></div>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);line-height:1.5;">${escHtml((b.description || '').slice(0,90))}${(b.description||'').length>90?'…':''}</p>
        <div class="bike-card__meta">
          <span class="badge badge-neutral">${escHtml(b.type || 'Bike')}</span>
          ${b.brand ? `<span class="badge badge-neutral">${escHtml(b.brand)}</span>` : ''}
          ${b.gearCount ? `<span class="badge badge-neutral">${b.gearCount} gears</span>` : ''}
        </div>
      </div>
    </article>`;
  }

  /* ── Rental row ───────────────────────────────────────── */
  function rentalRow(r) {
    const statusMap = { pending:'badge-warning', active:'badge-success', completed:'badge-neutral', cancelled:'badge-error' };
    return `
    <div class="card" style="padding:var(--space-4) var(--space-5);margin-bottom:var(--space-3);">
      <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <div style="font-family:var(--font-display);font-weight:700;font-size:var(--text-base);">${escHtml(r.bikeName || 'Bike')}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px;">
            ${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}
          </div>
        </div>
        <div style="font-weight:700;font-variant-numeric:tabular-nums;">₹${fmtPrice(r.totalCost)}</div>
        <span class="badge ${statusMap[r.status] || 'badge-neutral'} with-dot">${capitalize(r.status || 'pending')}</span>
        ${r.status === 'active' ? `<button class="btn btn-outline btn-sm" data-end-rental="${r.id}">End Rental</button>` : ''}
      </div>
    </div>`;
  }

  /* ── Bike detail modal body ───────────────────────────── */
  function bikeDetailBody(b) {
    return `
    <img src="${escHtml(b.imageUrl || fallbackBikeImg(b.type))}" alt="${escHtml(b.name)}"
         width="580" height="326" style="width:100%;border-radius:var(--radius-lg);object-fit:cover;background:var(--color-surface-offset);"
         onerror="this.src='${fallbackBikeImg()}'" loading="lazy"/>
    <div style="margin-top:var(--space-5);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;">
        <h3 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;">${escHtml(b.name)}</h3>
        <span class="badge ${b.available !== false ? 'badge-success' : 'badge-error'} with-dot">
          ${b.available !== false ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-2);line-height:1.6;">${escHtml(b.description || 'No description available.')}</p>
      <div class="stat-row" style="margin-top:var(--space-4);">
        <span class="stat-label">Type</span><span class="stat-value">${escHtml(b.type || '—')}</span>
      </div>
      <div class="stat-row"><span class="stat-label">Brand</span><span class="stat-value">${escHtml(b.brand || '—')}</span></div>
      <div class="stat-row"><span class="stat-label">Gears</span><span class="stat-value">${b.gearCount || '—'}</span></div>
      <div class="stat-row"><span class="stat-label">Location</span><span class="stat-value">${escHtml(b.location || '—')}</span></div>
      <div class="stat-row"><span class="stat-label">Rent / day</span><span class="stat-value" style="color:var(--color-primary);font-size:var(--text-base);">₹${fmtPrice(b.pricePerDay)}</span></div>
      ${b.purchasePrice ? `<div class="stat-row"><span class="stat-label">Buy price</span><span class="stat-value">₹${fmtPrice(b.purchasePrice)}</span></div>` : ''}
    </div>`;
  }

  /* ── Booking modal body ───────────────────────────────── */
  function bookingModalBody(b) {
    const today   = new Date().toISOString().split('T')[0];
    const tomorrow= new Date(Date.now()+86400000).toISOString().split('T')[0];
    return `
    <form id="booking-form" novalidate>
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5);padding:var(--space-3) var(--space-4);background:var(--color-surface-offset);border-radius:var(--radius-lg);">
        <div style="font-family:var(--font-display);font-weight:700;">${escHtml(b.name)}</div>
        <span style="margin-left:auto;color:var(--color-primary);font-weight:700;">₹${fmtPrice(b.pricePerDay)}/day</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label required" for="book-start">Start Date</label>
          <input type="date" id="book-start" class="form-control" min="${today}" value="${today}" required />
        </div>
        <div class="form-group">
          <label class="form-label required" for="book-end">End Date</label>
          <input type="date" id="book-end" class="form-control" min="${tomorrow}" value="${tomorrow}" required />
        </div>
      </div>
      <div class="form-group" style="margin-top:var(--space-4);">
        <label class="form-label" for="book-notes">Notes <span style="font-weight:400;color:var(--color-text-muted);">(optional)</span></label>
        <textarea id="book-notes" class="form-control" rows="2" placeholder="Any pickup instructions…"></textarea>
      </div>
      <div id="booking-cost-row" class="stat-row" style="margin-top:var(--space-4);font-size:var(--text-base);">
        <span class="stat-label">Estimated cost</span>
        <span class="stat-value" id="booking-cost-val" style="color:var(--color-primary);">₹${fmtPrice(b.pricePerDay)}</span>
      </div>
      <div id="book-alert" class="alert alert-error" style="display:none;margin-top:var(--space-3);" role="alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span id="book-alert-msg"></span>
      </div>
    </form>`;
  }

  /* ── Load bikes from API ──────────────────────────────── */
  async function loadBikes() {
    const grid = document.getElementById('bikes-grid');
    if (!grid) return;
    grid.innerHTML = skeletonGrid(6);

    try {
      const params = new URLSearchParams({ page: currentPage, limit: 12 });
      if (activeFilter !== 'all') params.set('type', activeFilter);
      if (searchQuery)            params.set('search', searchQuery);

      const res  = await window.AppApi.get(`/bikes?${params}`);
      bikes      = res.data || res.bikes || res || [];
      totalPages = res.totalPages || 1;

      renderBikes();
      renderPagination();
    } catch (err) {
      grid.innerHTML = errorState('Could not load bikes. Please try again.');
    }
  }

  /* ── Render bikes grid ────────────────────────────────── */
  function renderBikes() {
    const grid = document.getElementById('bikes-grid');
    if (!grid) return;
    if (!bikes.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state__icon"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V7l-2 2"/><path d="M8 12l4-4 4 4"/></svg></div>
          <h3>No bikes found</h3>
          <p>Try adjusting your filters or search term.</p>
          <button class="btn btn-outline" onclick="BikesModule.resetFilters()">Clear filters</button>
        </div>`;
      return;
    }
    grid.innerHTML = bikes.map(bikeCard).join('');
    // Attach click handlers
    grid.querySelectorAll('.bike-card').forEach(card => {
      card.addEventListener('click',   () => openBikeDetail(card.dataset.bikeId));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openBikeDetail(card.dataset.bikeId); });
    });
  }

  /* ── Pagination ───────────────────────────────────────── */
  function renderPagination() {
    const el = document.getElementById('bikes-pagination');
    if (!el || totalPages <= 1) { if(el) el.innerHTML=''; return; }
    let html = `<button class="page-btn" ${currentPage===1?'disabled':''} data-page="${currentPage-1}" aria-label="Previous">‹</button>`;
    for (let i=1; i<=totalPages; i++) {
      html += `<button class="page-btn ${i===currentPage?'active':''}" data-page="${i}" aria-label="Page ${i}" ${i===currentPage?'aria-current="page"':''}>${i}</button>`;
    }
    html += `<button class="page-btn" ${currentPage===totalPages?'disabled':''} data-page="${currentPage+1}" aria-label="Next">›</button>`;
    el.innerHTML = html;
    el.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => { currentPage = +btn.dataset.page; loadBikes(); });
    });
  }

  /* ── Load my rentals ──────────────────────────────────── */
  async function loadMyRentals() {
    const list = document.getElementById('rentals-list');
    if (!list) return;
    list.innerHTML = skeletonList(3);
    try {
      const res = await window.AppApi.get('/rentals/me');
      myRentals = res.data || res || [];
      if (!myRentals.length) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
            <h3>No rentals yet</h3>
            <p>Browse bikes and book your first ride.</p>
            <button class="btn btn-primary" onclick="document.getElementById('tab-browse').click()">Browse Bikes</button>
          </div>`;
        return;
      }
      list.innerHTML = myRentals.map(rentalRow).join('');
      list.querySelectorAll('[data-end-rental]').forEach(btn => {
        btn.addEventListener('click', () => endRental(btn.dataset.endRental));
      });
    } catch {
      list.innerHTML = errorState('Could not load your rentals.');
    }
  }

  /* ── Open bike detail modal ───────────────────────────── */
  function openBikeDetail(id) {
    detailBike = bikes.find(b => String(b.id) === String(id));
    if (!detailBike) return;
    const body   = document.getElementById('bike-modal-body');
    const footer = document.getElementById('bike-modal-footer');
    const title  = document.getElementById('bike-modal-title');
    title.textContent = detailBike.name;
    body.innerHTML    = bikeDetailBody(detailBike);
    footer.innerHTML  = `
      <button class="btn btn-ghost" id="bike-modal-close-2">Close</button>
      ${detailBike.available !== false
        ? `<button class="btn btn-primary" id="open-booking-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
             Book Now
           </button>`
        : `<span class="badge badge-error" style="padding:var(--space-2) var(--space-4);">Currently Unavailable</span>`
      }`;
    document.getElementById('bike-modal').classList.add('open');
    document.getElementById('bike-modal-close-2').addEventListener('click', closeBikeModal);
    document.getElementById('open-booking-btn')?.addEventListener('click', () => { closeBikeModal(); openBookingModal(detailBike); });
  }

  function closeBikeModal() {
    document.getElementById('bike-modal').classList.remove('open');
  }

  /* ── Booking modal ────────────────────────────────────── */
  function openBookingModal(b) {
    document.getElementById('booking-modal-title').textContent = `Book — ${b.name}`;
    document.getElementById('booking-modal-body').innerHTML = bookingModalBody(b);
    document.getElementById('booking-modal-footer').innerHTML = `
      <button class="btn btn-ghost" id="booking-modal-close-2">Cancel</button>
      <button class="btn btn-primary" id="confirm-booking-btn">Confirm Booking</button>`;
    document.getElementById('booking-modal').classList.add('open');
    document.getElementById('booking-modal-close-2').addEventListener('click', closeBookingModal);

    // Live cost calculation
    const startIn = document.getElementById('book-start');
    const endIn   = document.getElementById('book-end');
    const costEl  = document.getElementById('booking-cost-val');
    function updateCost() {
      const s = new Date(startIn.value), e = new Date(endIn.value);
      if (s && e && e > s) {
        const days = Math.ceil((e - s) / 86400000);
        costEl.textContent = `₹${fmtPrice(b.pricePerDay * days)} (${days} day${days>1?'s':''})`;
      } else { costEl.textContent = `₹${fmtPrice(b.pricePerDay)}`; }
    }
    startIn.addEventListener('change', updateCost);
    endIn.addEventListener('change', updateCost);

    document.getElementById('confirm-booking-btn').addEventListener('click', () => submitBooking(b));
  }

  function closeBookingModal() {
    document.getElementById('booking-modal').classList.remove('open');
  }

  /* ── Submit booking ───────────────────────────────────── */
  async function submitBooking(b) {
    const btn      = document.getElementById('confirm-booking-btn');
    const alertEl  = document.getElementById('book-alert');
    const alertMsg = document.getElementById('book-alert-msg');
    const start    = document.getElementById('book-start').value;
    const end      = document.getElementById('book-end').value;
    const notes    = document.getElementById('book-notes').value;

    alertEl.style.display = 'none';
    if (!start || !end || new Date(end) <= new Date(start)) {
      alertMsg.textContent  = 'Please select a valid date range.';
      alertEl.style.display = 'flex';
      return;
    }
    btn.classList.add('loading'); btn.disabled = true;
    try {
      await window.AppApi.post('/rentals', { bikeId: b.id, startDate: start, endDate: end, notes });
      closeBookingModal();
      window.showToast(`${b.name} booked successfully!`, 'success');
      loadBikes();
    } catch (err) {
      alertMsg.textContent  = err.message || 'Booking failed. Please try again.';
      alertEl.style.display = 'flex';
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  }

  /* ── End rental ───────────────────────────────────────── */
  async function endRental(id) {
    try {
      await window.AppApi.patch(`/rentals/${id}/end`, {});
      window.showToast('Rental ended.', 'info');
      loadMyRentals();
    } catch (err) {
      window.showToast(err.message || 'Could not end rental.', 'error');
    }
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function skeletonGrid(n) {
    return Array.from({length:n}, () => `
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="skeleton skeleton-image"></div>
        <div style="padding:var(--space-5);">
          <div class="skeleton skeleton-heading"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>`).join('');
  }
  function skeletonList(n) {
    return Array.from({length:n}, () => `
      <div class="card" style="margin-bottom:var(--space-3);padding:var(--space-4) var(--space-5);">
        <div class="skeleton skeleton-heading" style="width:50%;"></div>
        <div class="skeleton skeleton-text" style="width:30%;"></div>
      </div>`).join('');
  }
  function errorState(msg) {
    return `<div class="alert alert-error" style="grid-column:1/-1;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${msg}</div>`;
  }
  function fallbackBikeImg(type) {
    const seeds = { mountain:'mountain-bike', road:'road-bike', electric:'electric-bike', hybrid:'hybrid-bike', cruiser:'cruiser-bike' };
    return `https://picsum.photos/seed/${seeds[type]||'bicycle'}/400/225`;
  }
  function fmtPrice(n)  { return Number(n||0).toLocaleString('en-IN'); }
  function fmtDate(d)   { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'; }
  function capitalize(s){ return s ? s[0].toUpperCase() + s.slice(1) : ''; }
  function escHtml(s)   { const d=document.createElement('div'); d.textContent=String(s||''); return d.innerHTML; }

  /* ── Public API ───────────────────────────────────────── */
  function init() {
    const content = document.getElementById('page-content');
    content.innerHTML = renderShell();

    // Tab switching
    document.getElementById('tab-browse').addEventListener('click', () => {
      document.getElementById('tab-browse').classList.add('active');
      document.getElementById('tab-browse').setAttribute('aria-selected','true');
      document.getElementById('tab-rentals').classList.remove('active');
      document.getElementById('tab-rentals').setAttribute('aria-selected','false');
      document.getElementById('bikes-browse-panel').style.display  = '';
      document.getElementById('bikes-rentals-panel').style.display = 'none';
    });
    document.getElementById('tab-rentals').addEventListener('click', () => {
      document.getElementById('tab-rentals').classList.add('active');
      document.getElementById('tab-rentals').setAttribute('aria-selected','true');
      document.getElementById('tab-browse').classList.remove('active');
      document.getElementById('tab-browse').setAttribute('aria-selected','false');
      document.getElementById('bikes-rentals-panel').style.display = '';
      document.getElementById('bikes-browse-panel').style.display  = 'none';
      loadMyRentals();
    });

    // Filter chips
    document.getElementById('bike-filter-bar').addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      currentPage  = 1;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter));
      loadBikes();
    });

    // Search debounce
    let searchTimer;
    document.getElementById('bike-search').addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery  = e.target.value.trim();
        currentPage  = 1;
        loadBikes();
      }, 350);
    });

    // Modal close via backdrop
    document.getElementById('bike-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeBikeModal();
    });
    document.getElementById('bike-modal-close').addEventListener('click', closeBikeModal);
    document.getElementById('booking-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeBookingModal();
    });
    document.getElementById('booking-modal-close').addEventListener('click', closeBookingModal);

    loadBikes();
  }

  return { init, resetFilters() { activeFilter='all'; searchQuery=''; currentPage=1; loadBikes(); } };
})();
