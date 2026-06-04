/* ============================================================
   profile.js — Module 5.0: Profile
   Routes: #profile
   API:
     GET  /api/users/me              fetch own profile
     PUT  /api/users/me              update profile
     GET  /api/users/me/payments     payment history
     GET  /api/trips/me/stats        ride stats
     POST /api/users/me/avatar       upload avatar (multipart)
   ============================================================ */

window.ProfileModule = (() => {

  /* ── State ────────────────────────────────────────────── */
  let profile      = null;
  let payments     = [];
  let rideStats    = {};
  let activeTab    = 'info';
  let avatarDataUrl = null;

  /* ── Shell ────────────────────────────────────────────── */
  function renderShell() {
    return `
    <div class="page-section" style="max-width:860px;">
      <!-- Hero -->
      <div class="card" id="profile-hero" style="margin-bottom:var(--space-5);">
        <div class="skeleton skeleton-heading" style="width:60%;"></div>
        <div class="skeleton skeleton-text"    style="width:40%;margin-top:var(--space-2);"></div>
      </div>

      <!-- Tabs -->
      <div class="tabs" role="tablist" id="profile-tabs">
        <button class="tab active" role="tab" aria-selected="true"  data-tab="info"     id="tab-info">Personal Info</button>
        <button class="tab"        role="tab" aria-selected="false" data-tab="stats"    id="tab-stats">Ride Stats</button>
        <button class="tab"        role="tab" aria-selected="false" data-tab="payments" id="tab-payments">Payments</button>
        <button class="tab"        role="tab" aria-selected="false" data-tab="security" id="tab-security">Security</button>
      </div>

      <!-- Tab panels -->
      <div id="tab-panel-info"     role="tabpanel" aria-labelledby="tab-info"    ></div>
      <div id="tab-panel-stats"    role="tabpanel" aria-labelledby="tab-stats"    style="display:none;"></div>
      <div id="tab-panel-payments" role="tabpanel" aria-labelledby="tab-payments" style="display:none;"></div>
      <div id="tab-panel-security" role="tabpanel" aria-labelledby="tab-security" style="display:none;"></div>
    </div>

    <!-- Avatar crop modal -->
    <div class="modal-backdrop" id="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h2 class="modal-title" id="avatar-modal-title">Update Photo</h2>
          <button class="modal-close btn btn-ghost btn-icon" id="avatar-modal-close" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="text-align:center;">
          <img id="avatar-preview" src="" alt="Preview" style="width:120px;height:120px;border-radius:9999px;object-fit:cover;border:3px solid var(--color-primary);margin:0 auto var(--space-4);" />
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);">This photo will be visible to other riders.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="avatar-cancel">Cancel</button>
          <button class="btn btn-primary" id="avatar-confirm">Save Photo</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Profile hero ─────────────────────────────────────── */
  function renderHero(p) {
    const initial = (p.name || p.email || 'R')[0].toUpperCase();
    const joined  = p.createdAt
      ? new Date(p.createdAt).toLocaleDateString('en-IN',{month:'long',year:'numeric'})
      : '—';
    return `
    <div style="display:flex;align-items:flex-start;gap:var(--space-6);flex-wrap:wrap;">
      <div style="position:relative;flex-shrink:0;">
        <div class="avatar avatar-xl" id="hero-avatar"
             style="background:var(--color-primary-highlight);color:var(--color-primary);
                    width:88px;height:88px;font-size:var(--text-xl);">
          ${p.avatarUrl
            ? `<img src="${escHtml(p.avatarUrl)}" alt="${escHtml(p.name||'Avatar')}" style="width:100%;height:100%;object-fit:cover;" />`
            : initial}
        </div>
        <label for="avatar-file-input" class="btn btn-icon btn-sm"
               style="position:absolute;bottom:-4px;right:-4px;background:var(--color-primary);color:#fff;border:2px solid var(--color-surface);cursor:pointer;"
               aria-label="Change avatar" title="Change photo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <input type="file" id="avatar-file-input" accept="image/*" style="display:none;" />
        </label>
      </div>
      <div style="flex:1;min-width:180px;">
        <h2 style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;">${escHtml(p.name || 'Rider')}</h2>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:4px;">${escHtml(p.email || '')}</p>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-top:var(--space-4);">
          <span class="badge badge-neutral">Joined ${joined}</span>
          ${p.city ? `<span class="badge badge-neutral"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(p.city)}</span>` : ''}
          ${p.ridingStyle ? `<span class="badge badge-primary">${escHtml(p.ridingStyle)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ── Info tab ─────────────────────────────────────────── */
  function renderInfoPanel(p) {
    return `
    <div class="card" style="margin-top:var(--space-5);">
      <div class="card-header">
        <h3 class="card-title">Personal Information</h3>
        <button class="btn btn-outline btn-sm" id="edit-toggle-btn">Edit</button>
      </div>
      <form id="profile-form" novalidate>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4) var(--space-5);">
          <div class="form-group">
            <label class="form-label" for="pf-name">Full Name</label>
            <input type="text" id="pf-name" class="form-control" value="${escHtml(p.name||'')}" disabled required />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-email">Email</label>
            <input type="email" id="pf-email" class="form-control" value="${escHtml(p.email||'')}" disabled required />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-phone">Phone</label>
            <input type="tel" id="pf-phone" class="form-control" value="${escHtml(p.phone||'')}" placeholder="+91 XXXXXXXX" disabled />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-city">City</label>
            <input type="text" id="pf-city" class="form-control" value="${escHtml(p.city||'')}" placeholder="Kolkata" disabled />
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-style">Riding Style</label>
            <select id="pf-style" class="form-control" disabled>
              ${['','Mountain','Road','BMX','Touring','Commuter','Gravel'].map(s =>
                `<option value="${s}" ${p.ridingStyle===s?'selected':''}>${s||'Select…'}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-exp">Experience</label>
            <select id="pf-exp" class="form-control" disabled>
              ${['','Beginner','Intermediate','Advanced','Pro'].map(s =>
                `<option value="${s}" ${p.experience===s?'selected':''}>${s||'Select…'}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1;">
            <label class="form-label" for="pf-bio">Bio</label>
            <textarea id="pf-bio" class="form-control" rows="3" placeholder="Tell the community about yourself…" disabled>${escHtml(p.bio||'')}</textarea>
          </div>
        </div>
        <div id="profile-form-actions" style="display:none;margin-top:var(--space-5);display:flex;justify-content:flex-end;gap:var(--space-3);">
          <button type="button" class="btn btn-ghost"   id="cancel-edit-btn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-profile-btn">Save Changes</button>
        </div>
      </form>
    </div>`;
  }

  /* ── Stats tab ────────────────────────────────────────── */
  function renderStatsPanel(s) {
    const stats = [
      { label:'Total Trips',     value: s.totalTrips || 0,    unit: '',   icon: '🗺️' },
      { label:'Total Distance',  value: fmtNum(s.totalKm||0), unit:'km',  icon: '📏' },
      { label:'Total Duration',  value: fmtNum(s.totalHours||0), unit:'h', icon: '⏱️' },
      { label:'Avg Speed',       value: s.avgSpeed || 0,      unit:'km/h',icon: '⚡' },
      { label:'Bikes Rented',    value: s.bikesRented || 0,   unit: '',   icon: '🚲' },
      { label:'Favourite Route', value: escHtml(s.favouriteRoute||'—'), unit:'', icon:'❤️' },
    ];
    return `
    <div class="kpi-grid" style="margin-top:var(--space-5);">
      ${stats.map(st => `
      <div class="card kpi-card">
        <div class="kpi-card__label">${st.icon} ${st.label}</div>
        <div class="kpi-card__value">${st.value}${st.unit ? `<span style="font-size:var(--text-sm);font-weight:400;color:var(--color-text-muted);margin-left:4px;">${st.unit}</span>` : ''}</div>
      </div>`).join('')}
    </div>
    ${!s.totalTrips ? `
    <div class="empty-state" style="margin-top:var(--space-8);">
      <div class="empty-state__icon"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor"
