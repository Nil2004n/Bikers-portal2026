/* ============================================================
   modules/profile.js — ProfileModule
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const u = global.utils;
  const api = global.apiFetch;

  const TABS = ['overview', 'edit', 'rentals', 'posts'];
  const COLORS = [1, 2, 3, 4, 5, 6];

  const state = {
    user: null,
    rentals: [],
    posts: [],
    activeTab: 'overview',
    avatarColor: 1
  };

  function el(id) { return document.getElementById(id); }

  function getInitial(name) { return u.initialsFromName(name); }

  function renderHero(user) {
    const hero = el('profile-hero');
    if (!hero || !user) return;
    const name = user.name || user.username || 'Rider';
    const username = user.username ? '@' + user.username : '';
    const location = user.location || '';
    const joined = u.formatDate(user.createdAt || user.joinedAt, { month: 'long', year: 'numeric' });
    const color = user.avatarColor || 1;
    const stats = user.stats || {};

    hero.innerHTML = [
      '<div class="profile-hero__inner">',
      '  <div class="profile-hero__avatar" data-color="' + color + '">' + u.escHtml(getInitial(name)) + '</div>',
      '  <div class="profile-hero__info">',
      '    <div class="profile-hero__name">' + u.escHtml(name) + '</div>',
      '    <div class="profile-hero__username">' + u.escHtml(username) + '</div>',
      '    <div class="profile-hero__meta">',
            location ? '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + u.escHtml(location) + '</span>' : '',
            joined ? '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Joined ' + u.escHtml(joined) + '</span>' : '',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="profile-hero__stats">',
      '  <div class="profile-hero__stat"><div class="profile-hero__stat-value">' + (stats.totalRides != null ? stats.totalRides : (user.totalRides || 0)) + '</div><div class="profile-hero__stat-label">Total Rides</div></div>',
      '  <div class="profile-hero__stat"><div class="profile-hero__stat-value">' + (stats.totalDistance != null ? stats.totalDistance : (user.totalDistance || 0)) + '</div><div class="profile-hero__stat-label">Distance (km)</div></div>',
      '  <div class="profile-hero__stat"><div class="profile-hero__stat-value">' + (stats.bikesRented != null ? stats.bikesRented : (user.bikesRented || 0)) + '</div><div class="profile-hero__stat-label">Bikes Rented</div></div>',
      '  <div class="profile-hero__stat"><div class="profile-hero__stat-value">' + (stats.postsCount != null ? stats.postsCount : (user.postsCount || 0)) + '</div><div class="profile-hero__stat-label">Posts</div></div>',
      '</div>'
    ].join('\n');
  }

  function renderOverview(user) {
    const panel = el('tab-overview');
    if (!panel) return;
    const bio = user.bio || 'Cyclist, ride tinkerer and weekend explorer. Always looking for the next climb.';
    const bikeTypes = (user.preferredBikeTypes && user.preferredBikeTypes.length)
      ? user.preferredBikeTypes
      : ['Road', 'Touring'];

    const recent = (user.recentActivity || []).slice(0, 5);

    let activityHtml = '';
    if (recent.length) {
      activityHtml = recent.map(function (item) {
        return '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--color-divider);">' +
          '<div class="avatar avatar--sm" data-color="' + ((item.color || 1)) + '">' + u.escHtml((item.title || '?').charAt(0).toUpperCase()) + '</div>' +
          '<div style="flex:1; min-width:0;">' +
            '<div style="font-size:var(--text-sm); font-weight:600;">' + u.escHtml(item.title || 'Activity') + '</div>' +
            '<div style="font-size:var(--text-xs); color:var(--color-text-muted);">' + u.escHtml(item.subtitle || '') + '</div>' +
          '</div>' +
          '<span class="text-muted" style="font-size:var(--text-xs);">' + u.escHtml(u.relativeTime(item.time || new Date().toISOString())) + '</span>' +
        '</div>';
      }).join('');
    } else {
      activityHtml = '<p class="text-muted" style="font-size:var(--text-sm);">No recent activity yet.</p>';
    }

    panel.innerHTML = [
      '<div class="profile-bio">' + u.escHtml(bio) + '</div>',
      '<h4 style="font-family:var(--font-display); font-size:var(--text-md); margin-bottom:var(--space-2); text-transform:uppercase; letter-spacing:0.04em;">Preferred Bikes</h4>',
      '<div class="profile-preferences">' +
        bikeTypes.map(function (t) { return '<span class="tag">' + u.escHtml(t) + '</span>'; }).join('') +
      '</div>',
      '<h4 style="font-family:var(--font-display); font-size:var(--text-md); margin: var(--space-5) 0 var(--space-2); text-transform:uppercase; letter-spacing:0.04em;">Recent Activity</h4>',
      activityHtml
    ].join('\n');
  }

  function renderEditForm(user) {
    const form = el('edit-profile-form');
    if (!form) return;
    form.querySelector('[name="name"]').value = user.name || '';
    form.querySelector('[name="username"]').value = user.username || '';
    form.querySelector('[name="email"]').value = user.email || '';
    form.querySelector('[name="location"]').value = user.location || '';
    form.querySelector('[name="bio"]').value = user.bio || '';
    form.querySelector('[name="preferredTypes"]').value = (user.preferredBikeTypes || []).join(', ');

    const picker = el('avatar-color-picker');
    if (picker) {
      const current = user.avatarColor || 1;
      picker.innerHTML = COLORS.map(function (c) {
        return '<button type="button" class="color-swatch" data-color="' + c + '" aria-pressed="' + (c === current ? 'true' : 'false') + '" aria-label="Avatar color ' + c + '"></button>';
      }).join('');
      picker.querySelectorAll('[data-color]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const c = Number(btn.getAttribute('data-color'));
          picker.querySelectorAll('[data-color]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          state.avatarColor = c;
          const av = document.querySelector('.profile-hero__avatar');
          if (av) av.setAttribute('data-color', String(c));
        });
      });
    }
  }

  function renderRentals() {
    const panel = el('rental-history');
    if (!panel) return;
    if (!state.rentals.length) {
      panel.innerHTML = u.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6l-3 7 4 4M5.5 17.5L9 9h3.5"/></svg>',
        title: 'No rentals yet',
        message: 'Once you book a bike, you\'ll see the full history here.',
        actionLabel: 'Browse bikes'
      });
      const btn = panel.querySelector('[data-empty-action]');
      if (btn) btn.addEventListener('click', function () { global.location.hash = '#bikes'; });
      return;
    }
    let rows = '';
    state.rentals.forEach(function (r) {
      const bike = (r.bike && (r.bike.name || r.bike.title)) || r.bikeName || 'Bike';
      const start = u.formatDate(r.startDate);
      const end = u.formatDate(r.endDate);
      const dur = r.duration || (r.startDate && r.endDate
        ? Math.max(1, Math.round((new Date(r.endDate) - new Date(r.startDate)) / 86400000)) + ' days'
        : '—');
      const cost = u.formatPrice(r.cost != null ? r.cost : r.totalCost);
      const status = r.status || 'Confirmed';
      const badgeCls = status.toLowerCase() === 'cancelled' ? 'badge--error'
        : status.toLowerCase() === 'completed' ? 'badge--success'
        : status.toLowerCase() === 'active' ? 'badge--primary'
        : 'badge--warning';
      rows += '<tr>' +
        '<td><strong>' + u.escHtml(bike) + '</strong></td>' +
        '<td>' + u.escHtml(start) + '</td>' +
        '<td>' + u.escHtml(end) + '</td>' +
        '<td>' + u.escHtml(dur) + '</td>' +
        '<td>' + u.escHtml(cost) + '</td>' +
        '<td><span class="badge ' + badgeCls + '">' + u.escHtml(status) + '</span></td>' +
      '</tr>';
    });

    panel.innerHTML = [
      '<div class="table--responsive">',
      '<table class="table">',
      '<thead><tr><th>Bike</th><th>Start date</th><th>End date</th><th>Duration</th><th>Cost</th><th>Status</th></tr></thead>',
      '<tbody>' + rows + '</tbody>',
      '</table>',
      '</div>'
    ].join('\n');
  }

  function renderMyPosts() {
    const panel = el('my-posts');
    if (!panel) return;
    if (!state.posts.length) {
      panel.innerHTML = u.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
        title: 'You haven\'t posted yet',
        message: 'Share your rides, photos and stories with the community.',
        actionLabel: 'Create a post'
      });
      const btn = panel.querySelector('[data-empty-action]');
      if (btn) btn.addEventListener('click', function () { global.location.hash = '#feed'; });
      return;
    }
    panel.innerHTML = state.posts.map(function (post) {
      const name = (post.user && (post.user.name || post.user.username)) || 'You';
      const initial = getInitial(name);
      const content = u.escHtml(post.content || '');
      const time = u.relativeTime(post.createdAt || post.timestamp);
      const colorIdx = state.avatarColor || 1;
      const image = post.image || post.imageBase64 || post.imageUrl;
      const id = post.id || post._id;

      let imageHtml = '';
      if (image) {
        imageHtml = '<img class="post-card__image" src="' + u.escHtml(image) + '" alt="Post image" loading="lazy" width="800" height="480">';
      }

      return [
        '<article class="card post-card" data-my-post="' + u.escHtml(id) + '">',
        '  <header class="post-card__head">',
        '    <div class="avatar" data-color="' + colorIdx + '">' + u.escHtml(initial) + '</div>',
        '    <div class="post-card__user">',
        '      <div class="post-card__name">' + u.escHtml(name) + '</div>',
        '      <div class="post-card__meta"><span>' + time + '</span></div>',
        '    </div>',
        '    <button type="button" class="icon-btn" data-delete-my-post="' + u.escHtml(id) + '" aria-label="Delete post">',
        '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
        '    </button>',
        '  </header>',
        '  <div class="post-card__content">' + content + '</div>',
          imageHtml,
        '</article>'
      ].join('\n');
    }).join('');

    panel.querySelectorAll('[data-delete-my-post]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-delete-my-post');
        if (!confirm('Delete this post?')) return;
        api('/api/feed/' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function () {
            state.posts = state.posts.filter(function (p) { return (p.id || p._id) !== id; });
            renderMyPosts();
            u.showToast('Post deleted', 'success');
          })
          .catch(function () { u.showToast('Failed to delete post', 'error'); });
      });
    });
  }

  function switchTab(tab) {
    if (TABS.indexOf(tab) === -1) return;
    state.activeTab = tab;
    document.querySelectorAll('[data-profile-tab]').forEach(function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-profile-tab') === tab ? 'true' : 'false');
    });
    TABS.forEach(function (t) {
      const panel = el('tab-' + t);
      if (panel) panel.hidden = t !== tab;
    });
  }

  function bindTabs() {
    const tabs = el('profile-tabs');
    if (!tabs || tabs.dataset.bound) return;
    tabs.dataset.bound = '1';
    tabs.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-profile-tab]');
      if (!btn) return;
      switchTab(btn.getAttribute('data-profile-tab'));
    });
  }

  function bindEditForm() {
    const form = el('edit-profile-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', function (e) { e.preventDefault(); submitEdit(); });
    const saveBtn = el('profile-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', function (e) { e.preventDefault(); submitEdit(); });
  }

  async function submitEdit() {
    const form = el('edit-profile-form');
    const alertEl = el('edit-profile-alert');
    const saveBtn = el('profile-save-btn');
    if (!form) return;

    const fd = new FormData(form);
    const payload = {
      name: (fd.get('name') || '').toString().trim(),
      username: (fd.get('username') || '').toString().trim(),
      location: (fd.get('location') || '').toString().trim(),
      bio: (fd.get('bio') || '').toString(),
      preferredBikeTypes: (fd.get('preferredTypes') || '').toString()
        .split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      avatarColor: state.avatarColor
    };

    if (!payload.name) { showEditAlert('Name cannot be empty', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';
    if (alertEl) alertEl.innerHTML = '';

    try {
      const userId = global.auth.getUserId();
      const updated = await api('/api/users/' + encodeURIComponent(userId), { method: 'PUT', body: payload });
      if (updated) {
        state.user = Object.assign({}, state.user, updated);
        global.AppState.user = state.user;
        global.setAvatarColor(updated.avatarColor || state.avatarColor);
        renderHero(state.user);
        renderOverview(state.user);
        showEditAlert('Profile saved successfully', 'success');
        u.showToast('Profile updated', 'success');
      }
    } catch (e) {
      showEditAlert(e.message || 'Failed to save profile', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Changes';
    }
  }

  function showEditAlert(msg, type) {
    const alertEl = el('edit-profile-alert');
    if (!alertEl) return;
    const cls = type === 'success' ? 'alert--success' : 'alert--error';
    alertEl.innerHTML = '<div class="alert ' + cls + '"><div class="alert__content">' + u.escHtml(msg) + '</div></div>';
    if (type === 'success') {
      setTimeout(function () { alertEl.innerHTML = ''; }, 4000);
    }
  }

  async function loadProfile() {
    const hero = el('profile-hero');
    if (hero) hero.setAttribute('aria-busy', 'true');

    const userId = global.auth.getUserId() || 'me';
    try {
      const user = await api('/api/users/' + encodeURIComponent(userId));
      state.user = user;
      state.avatarColor = user.avatarColor || 1;
      global.setAvatarColor(state.avatarColor);
      renderHero(user);
      renderOverview(user);
      renderEditForm(user);
      switchTab('overview');
    } catch (e) {
      console.error('loadProfile', e);
      const user = global.AppState.user || {};
      state.user = user;
      renderHero(user);
      renderOverview(user);
      renderEditForm(user);
      if (hero) {
        hero.insertAdjacentHTML('afterend', '<div class="card"><div class="alert alert--error"><div class="alert__content">' +
          '<div class="alert__title">Could not load full profile</div>' +
          '<div class="alert__message">' + u.escHtml(e.message || 'Showing cached data') + '</div>' +
          '</div></div></div>');
      }
    } finally {
      if (hero) hero.removeAttribute('aria-busy');
    }
  }

  async function loadRentals() {
    const panel = el('rental-history');
    if (panel) panel.setAttribute('aria-busy', 'true');
    if (panel) {
      panel.innerHTML =
        '<div class="skeleton skeleton--text" style="width:80%;"></div>' +
        '<div class="skeleton skeleton--text" style="width:60%;"></div>' +
        '<div class="skeleton skeleton--text" style="width:70%;"></div>';
    }
    const userId = global.auth.getUserId() || 'me';
    try {
      const response = await api('/api/users/' + encodeURIComponent(userId) + '/rentals');
      state.rentals = (response && (response.items || response.rentals || response.data || response)) || [];
    } catch (e) {
      console.error('loadRentals', e);
      state.rentals = [];
    } finally {
      if (panel) panel.removeAttribute('aria-busy');
      renderRentals();
    }
  }

  async function loadMyPosts() {
    const panel = el('my-posts');
    if (panel) {
      panel.setAttribute('aria-busy', 'true');
      panel.innerHTML = u.skeletonPostCard() + u.skeletonPostCard();
    }
    const userId = global.auth.getUserId() || 'me';
    try {
      const response = await api('/api/feed?userId=' + encodeURIComponent(userId));
      state.posts = (response && (response.items || response.posts || response.data || response)) || [];
    } catch (e) {
      console.error('loadMyPosts', e);
      state.posts = [];
    } finally {
      if (panel) panel.removeAttribute('aria-busy');
      renderMyPosts();
    }
  }

  function init() {
    bindTabs();
    bindEditForm();
    switchTab('overview');
    loadProfile();
    loadRentals();
    loadMyPosts();
  }

  global.ProfileModule = { init: init };
})(window);
