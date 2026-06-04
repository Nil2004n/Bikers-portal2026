/* ============================================================
   modules/feed.js — FeedModule
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const u = global.utils;
  const api = global.apiFetch;

  const TRENDING_TAGS = [
    { tag: '#MTBLife',        count: 1284 },
    { tag: '#RoadCycling',    count: 982  },
    { tag: '#EBike',          count: 1617 },
    { tag: '#CyclingIndia',   count: 2403 },
    { tag: '#FixedGear',      count: 421  },
    { tag: '#BikePacking',    count: 738  },
    { tag: '#CyclingTips',    count: 514  },
    { tag: '#SunriseRide',    count: 296  }
  ];

  const ACTIVE_RIDERS = [
    { name: 'Aarav Sharma',  rides: 42, initial: 'A' },
    { name: 'Priya Iyer',    rides: 38, initial: 'P' },
    { name: 'Karan Patel',   rides: 27, initial: 'K' },
    { name: 'Neha Kapoor',   rides: 19, initial: 'N' }
  ];

  const state = {
    page: 1,
    limit: 10,
    posts: [],
    loading: false,
    hasMore: true,
    total: 0,
    activeTag: null,
    currentPostId: null,
    attachedImage: null
  };

  function el(id) { return document.getElementById(id); }

  function initialsOf(name) {
    return u.initialsFromName(name);
  }

  function postCardHTML(post) {
    const name = (post.user && (post.user.name || post.user.username)) || post.author || 'Rider';
    const initial = initialsOf(name);
    const colorIdx = post.user && post.user.avatarColor ? post.user.avatarColor : ((post._id || post.id || '').toString().charCodeAt(0) % 6) + 1;
    const content = u.escHtml(post.content || '');
    const image = post.image || post.imageBase64 || post.imageUrl;
    const time = u.relativeTime(post.createdAt || post.timestamp);
    const likes = post.likesCount != null ? post.likesCount : (post.likes && post.likes.length) || 0;
    const comments = post.commentsCount != null ? post.commentsCount : (post.comments && post.comments.length) || 0;
    const liked = post.liked || (post.likes && post.likes.indexOf(global.auth.getUserId()) !== -1);
    const tagsArr = (post.tags && post.tags.length) ? post.tags : [];
    const postId = post.id || post._id;
    const isOwn = post.userId === global.auth.getUserId() || (post.user && (post.user.id || post.user._id) === global.auth.getUserId());

    let tagsHtml = '';
    if (tagsArr.length) {
      tagsHtml = '<div class="post-card__tags">' +
        tagsArr.map(function (t) { return '<span class="tag">#' + u.escHtml(t.replace(/^#/, '')) + '</span>'; }).join('') +
        '</div>';
    }

    let imageHtml = '';
    if (image) {
      imageHtml = '<img class="post-card__image" src="' + u.escHtml(image) + '" alt="Post image" loading="lazy" width="800" height="480">';
    }

    let menuHtml = '';
    if (isOwn) {
      menuHtml =
        '<div class="menu" data-menu>' +
          '<button class="icon-btn" aria-label="Post options" data-menu-toggle>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>' +
          '</button>' +
          '<div class="menu__panel" role="menu">' +
            '<button type="button" class="menu__item menu__item--danger" role="menuitem" data-delete-post="' + u.escHtml(postId) + '">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>' +
              'Delete post' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    return [
      '<article class="card post-card" data-post-id="' + u.escHtml(postId) + '">',
      '  <header class="post-card__head">',
      '    <div class="avatar" data-color="' + colorIdx + '">' + u.escHtml(initial) + '</div>',
      '    <div class="post-card__user">',
      '      <div class="post-card__name">' + u.escHtml(name) + '</div>',
      '      <div class="post-card__meta">' +
            '<span>' + time + '</span>' +
            (post.location ? '<span aria-hidden="true">·</span><span>' + u.escHtml(post.location) + '</span>' : '') +
          '</div>',
      '    </div>',
        menuHtml,
      '  </header>',
      '  <div class="post-card__content">' + content + '</div>',
        imageHtml,
        tagsHtml,
      '  <div class="post-card__actions">',
      '    <button type="button" class="post-action" data-like-btn aria-pressed="' + (liked ? 'true' : 'false') + '">',
      '      <svg class="post-action__icon" viewBox="0 0 24 24" fill="' + (liked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>',
      '      </svg>',
      '      <span class="post-action__count" data-like-count>' + likes + '</span>',
      '      <span>Like</span>',
      '    </button>',
      '    <button type="button" class="post-action" data-comments-btn>',
      '      <svg class="post-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
      '      </svg>',
      '      <span class="post-action__count" data-comments-count>' + comments + '</span>',
      '      <span>Comment</span>',
      '    </button>',
      '    <button type="button" class="post-action" data-share-btn>',
      '      <svg class="post-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>',
      '        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
      '      </svg>',
      '      <span>Share</span>',
      '    </button>',
      '  </div>',
      '</article>'
    ].join('\n');
  }

  function renderSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) html += u.skeletonPostCard();
    return html;
  }

  function renderTrending() {
    const wrap = el('trending-tags');
    if (!wrap) return;
    wrap.innerHTML = TRENDING_TAGS.map(function (t) {
      return '<button type="button" class="chip chip--ghost" data-tag="' + u.escHtml(t.tag) + '" aria-pressed="' + (state.activeTag === t.tag ? 'true' : 'false') + '">' +
        u.escHtml(t.tag) + ' <span style="color:var(--color-text-faint);font-size:var(--text-xs);margin-left:4px;">' + t.count + '</span>' +
      '</button>';
    }).join('');

    wrap.querySelectorAll('[data-tag]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const tag = btn.getAttribute('data-tag');
        state.activeTag = (state.activeTag === tag) ? null : tag;
        state.page = 1;
        state.posts = [];
        state.hasMore = true;
        const list = el('feed-list');
        if (list) list.innerHTML = renderSkeletons(3);
        loadFeed();
      });
    });
  }

  function renderActiveRiders() {
    const wrap = el('active-riders');
    if (!wrap) return;
    wrap.innerHTML = ACTIVE_RIDERS.map(function (r, i) {
      return [
        '<div class="rider">',
        '  <div class="avatar avatar--md" data-color="' + ((i % 6) + 1) + '">' + u.escHtml(r.initial) + '</div>',
        '  <div class="rider__info">',
        '    <div class="rider__name">' + u.escHtml(r.name) + '</div>',
        '    <div class="rider__stat">' + r.rides + ' rides</div>',
        '  </div>',
        '  <button class="btn btn--sm btn--secondary" data-follow-rider="' + u.escHtml(r.name) + '">Follow</button>',
        '</div>'
      ].join('\n');
    }).join('');

    wrap.querySelectorAll('[data-follow-rider]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const name = btn.getAttribute('data-follow-rider');
        const following = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', following ? 'false' : 'true');
        btn.textContent = following ? 'Follow' : 'Following';
        u.showToast((following ? 'Unfollowed ' : 'Following ') + name, 'success', 2000);
      });
    });
  }

  function appendPosts(posts, replace) {
    const list = el('feed-list');
    if (!list) return;

    if (replace) {
      list.innerHTML = posts.length ? posts.map(postCardHTML).join('\n') : u.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
        title: 'No posts yet',
        message: 'Be the first to share something with the community.',
        actionLabel: 'Write a post'
      });
    } else {
      list.insertAdjacentHTML('beforeend', posts.map(postCardHTML).join('\n'));
    }

    bindPostCards(list);
  }

  function bindPostCards(scope) {
    const root = scope || document;
    root.querySelectorAll('[data-post-id]').forEach(function (card) {
      const id = card.getAttribute('data-post-id');
      const likeBtn = card.querySelector('[data-like-btn]');
      if (likeBtn && !likeBtn.dataset.bound) {
        likeBtn.dataset.bound = '1';
        likeBtn.addEventListener('click', function () { toggleLike(id, card, likeBtn); });
      }
      const cmtBtn = card.querySelector('[data-comments-btn]');
      if (cmtBtn && !cmtBtn.dataset.bound) {
        cmtBtn.dataset.bound = '1';
        cmtBtn.addEventListener('click', function () { openComments(id, card); });
      }
      const shareBtn = card.querySelector('[data-share-btn]');
      if (shareBtn && !shareBtn.dataset.bound) {
        shareBtn.dataset.bound = '1';
        shareBtn.addEventListener('click', function () { sharePost(id); });
      }
      const deleteBtn = card.querySelector('[data-delete-post]');
      if (deleteBtn && !deleteBtn.dataset.bound) {
        deleteBtn.dataset.bound = '1';
        deleteBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          const menuEl = deleteBtn.closest('.menu');
          if (menuEl) menuEl.classList.remove('is-open');
          deletePost(id, card);
        });
      }
      const menuToggle = card.querySelector('[data-menu-toggle]');
      const menu = card.querySelector('[data-menu]');
      if (menuToggle && menu && !menuToggle.dataset.bound) {
        menuToggle.dataset.bound = '1';
        menuToggle.addEventListener('click', function (e) {
          e.stopPropagation();
          document.querySelectorAll('.menu.is-open').forEach(function (m) { if (m !== menu) m.classList.remove('is-open'); });
          menu.classList.toggle('is-open');
        });
      }
    });
  }

  async function loadFeed() {
    if (state.loading || !state.hasMore) return;
    state.loading = true;

    const list = el('feed-list');
    const loadMore = el('feed-load-more');
    const endMsg = el('feed-end');

    if (loadMore) loadMore.disabled = true;

    try {
      const params = new URLSearchParams();
      params.set('page', String(state.page));
      params.set('limit', String(state.limit));
      if (state.activeTag) params.set('tag', state.activeTag);

      const response = await api('/api/feed?' + params.toString());
      const items = (response && (response.items || response.posts || response.data || response)) || [];
      const total = (response && response.total) || 0;
      const hasMore = (response && typeof response.hasMore === 'boolean') ? response.hasMore : (items.length === state.limit);

      state.posts = state.page === 1 ? items : state.posts.concat(items);
      state.total = total;
      state.hasMore = hasMore;

      appendPosts(items, state.page === 1);
    } catch (e) {
      console.error('loadFeed error', e);
      if (list) {
        list.innerHTML = '<div class="card">' +
          '<div class="alert alert--error"><div class="alert__content">' +
          '<div class="alert__title">Could not load feed</div>' +
          '<div class="alert__message">' + u.escHtml(e.message || 'Network error') + '</div>' +
          '</div></div></div>';
      }
      if (global.utils && global.utils.showToast) u.showToast('Failed to load feed', 'error');
    } finally {
      state.loading = false;
      if (loadMore) loadMore.disabled = false;
      if (endMsg) endMsg.hidden = state.hasMore;
      if (loadMore) loadMore.hidden = !state.hasMore;
    }
  }

  async function submitPost() {
    const textEl = el('compose-text');
    const btn = el('post-submit-btn');
    const alertEl = el('compose-alert');
    if (!textEl || !btn) return;

    const content = (textEl.value || '').trim();
    if (!content) {
      showComposeAlert('Please write something before posting.', 'error');
      return;
    }
    if (content.length > 1000) {
      showComposeAlert('Posts are limited to 1000 characters.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Posting...';
    if (alertEl) alertEl.innerHTML = '';

    try {
      const body = { content: content };
      if (state.attachedImage) body.imageBase64 = state.attachedImage;

      const tags = extractHashtags(content);
      if (tags.length) body.tags = tags;

      const newPost = await api('/api/feed', { method: 'POST', body: body });
      if (newPost && (newPost.id || newPost._id)) {
        const list = el('feed-list');
        if (list) {
          const empty = list.querySelector('.empty-state');
          if (empty) list.innerHTML = '';
          list.insertAdjacentHTML('afterbegin', postCardHTML(newPost));
          bindPostCards(list);
        }
      } else {
        state.page = 1;
        state.hasMore = true;
        const list = el('feed-list');
        if (list) list.innerHTML = renderSkeletons(3);
        await loadFeed();
      }

      textEl.value = '';
      updateCharCounter();
      removeAttachedImage();
      u.showToast('Post shared with the community!', 'success');
    } catch (e) {
      console.error('submitPost error', e);
      showComposeAlert(e.message || 'Failed to publish post', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        ' Post';
    }
  }

  function extractHashtags(text) {
    const re = /#([a-zA-Z0-9_]+)/g;
    const tags = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      const tag = m[1];
      if (tag.length <= 30 && tags.indexOf(tag) === -1) tags.push(tag);
    }
    return tags;
  }

  function showComposeAlert(msg, type) {
    const alertEl = el('compose-alert');
    if (!alertEl) return;
    const cls = (type === 'success') ? 'alert--success' : 'alert--error';
    alertEl.innerHTML = '<div class="alert ' + cls + '"><div class="alert__content">' + u.escHtml(msg) + '</div></div>';
  }

  function updateCharCounter() {
    const textEl = el('compose-text');
    const counter = el('compose-char');
    const btn = el('post-submit-btn');
    if (!textEl || !counter) return;
    const len = (textEl.value || '').length;
    counter.textContent = len + ' / 1000';
    counter.style.color = len > 950 ? 'var(--color-warning)' : (len > 990 ? 'var(--color-error)' : 'var(--color-text-muted)');
    if (btn) btn.disabled = len === 0;
  }

  function attachImage() {
    const input = el('compose-image');
    const preview = el('compose-preview');
    const imgEl = el('compose-preview-img');
    if (!input || !input.files || !input.files[0]) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      showComposeAlert('Please choose an image file', 'error');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showComposeAlert('Image must be smaller than 5 MB', 'error');
      input.value = '';
      return;
    }

    u.fileToBase64(file).then(function (b64) {
      state.attachedImage = b64;
      if (imgEl) imgEl.src = b64;
      if (preview) preview.hidden = false;
    }).catch(function (err) {
      showComposeAlert('Failed to read image: ' + err.message, 'error');
    });
  }

  function removeAttachedImage() {
    state.attachedImage = null;
    const input = el('compose-image');
    const preview = el('compose-preview');
    const imgEl = el('compose-preview-img');
    if (input) input.value = '';
    if (imgEl) imgEl.src = '';
    if (preview) preview.hidden = true;
  }

  async function toggleLike(postId, card, btn) {
    const countEl = card.querySelector('[data-like-count]');
    let count = parseInt((countEl && countEl.textContent) || '0', 10) || 0;
    const wasLiked = btn.getAttribute('aria-pressed') === 'true';

    btn.setAttribute('aria-pressed', wasLiked ? 'false' : 'true');
    if (countEl) countEl.textContent = wasLiked ? Math.max(0, count - 1) : count + 1;
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', wasLiked ? 'none' : 'currentColor');

    try {
      await api('/api/feed/' + encodeURIComponent(postId) + '/like', { method: 'POST' });
    } catch (e) {
      btn.setAttribute('aria-pressed', wasLiked ? 'true' : 'false');
      if (countEl) countEl.textContent = String(count);
      if (svg) svg.setAttribute('fill', wasLiked ? 'currentColor' : 'none');
      u.showToast('Could not update like', 'error');
    }
  }

  async function deletePost(postId, card) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api('/api/feed/' + encodeURIComponent(postId), { method: 'DELETE' });
      if (card && card.parentNode) {
        card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(-6px)';
        setTimeout(function () { card.parentNode.removeChild(card); }, 200);
      }
      u.showToast('Post deleted', 'success');
    } catch (e) {
      console.error('deletePost', e);
      u.showToast('Failed to delete post', 'error');
    }
  }

  async function openComments(postId, card) {
    state.currentPostId = postId;
    const modal = el('comments-modal');
    const list = el('comments-list');
    const name = (card && card.querySelector('.post-card__name') || {}).textContent || 'post';
    if (!modal || !list) return;

    list.innerHTML = '<div class="skeleton skeleton--text" style="width:80%;"></div>' +
                     '<div class="skeleton skeleton--text" style="width:60%;"></div>';
    u.openModal('comments-modal');
    const subtitle = el('comments-modal-subtitle');
    if (subtitle) subtitle.textContent = 'Comments on ' + name + "'s post";

    try {
      const response = await api('/api/feed/' + encodeURIComponent(postId) + '/comments');
      const items = (response && (response.items || response.comments || response.data || response)) || [];
      renderComments(items);
    } catch (e) {
      console.error('openComments', e);
      list.innerHTML = '<div class="alert alert--error"><div class="alert__content">' + u.escHtml(e.message || 'Failed to load comments') + '</div></div>';
    }
  }

  function renderComments(items) {
    const list = el('comments-list');
    if (!list) return;
    if (!items || !items.length) {
      list.innerHTML = '<div class="text-muted" style="padding:var(--space-4); text-align:center;">No comments yet. Be the first!</div>';
      return;
    }
    list.innerHTML = items.map(function (c) {
      const name = (c.user && (c.user.name || c.user.username)) || c.author || 'Rider';
      const initial = initialsOf(name);
      const time = u.relativeTime(c.createdAt || c.timestamp);
      const colorIdx = (c.user && c.user.avatarColor) ? c.user.avatarColor : ((c._id || c.id || '').toString().charCodeAt(0) % 6) + 1;
      return [
        '<div class="comment">',
        '  <div class="avatar avatar--sm" data-color="' + colorIdx + '">' + u.escHtml(initial) + '</div>',
        '  <div class="comment__body">',
        '    <div class="comment__head"><span class="comment__name">' + u.escHtml(name) + '</span><span class="comment__time">' + time + '</span></div>',
        '    <div class="comment__text">' + u.escHtml(c.content || c.text || '') + '</div>',
        '  </div>',
        '</div>'
      ].join('\n');
    }).join('');
  }

  async function submitComment() {
    const textEl = el('comment-text');
    const btn = el('comment-submit-btn');
    if (!textEl || !btn || !state.currentPostId) return;

    const content = (textEl.value || '').trim();
    if (!content) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>';

    try {
      const created = await api('/api/feed/' + encodeURIComponent(state.currentPostId) + '/comments', {
        method: 'POST',
        body: { content: content }
      });
      const list = el('comments-list');
      if (list) {
        const empty = list.querySelector('.text-muted');
        if (empty) list.innerHTML = '';
        if (created) {
          const name = (created.user && (created.user.name || created.user.username)) || global.auth.getUserName();
          const initial = initialsOf(name);
          const time = u.relativeTime(created.createdAt || new Date().toISOString());
          list.insertAdjacentHTML('beforeend',
            '<div class="comment">' +
            '  <div class="avatar avatar--sm" data-color="' + global.getAvatarColor() + '">' + u.escHtml(initial) + '</div>' +
            '  <div class="comment__body">' +
            '    <div class="comment__head"><span class="comment__name">' + u.escHtml(name) + '</span><span class="comment__time">' + time + '</span></div>' +
            '    <div class="comment__text">' + u.escHtml(content) + '</div>' +
            '  </div>' +
            '</div>');
          list.scrollTop = list.scrollHeight;
        }
      }
      textEl.value = '';
      const card = document.querySelector('[data-post-id="' + CSS.escape(state.currentPostId) + '"]');
      if (card) {
        const cmtCount = card.querySelector('[data-comments-count]');
        if (cmtCount) {
          const n = parseInt(cmtCount.textContent, 10) || 0;
          cmtCount.textContent = String(n + 1);
        }
      }
    } catch (e) {
      u.showToast('Failed to post comment', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        ' Comment';
    }
  }

  function sharePost(postId) {
    const url = global.location.origin + global.location.pathname + '#feed?post=' + encodeURIComponent(postId);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        u.showToast('Link copied to clipboard', 'success', 2000);
      }).catch(function () {
        u.showToast('Share: ' + url, 'info', 4000);
      });
    } else {
      u.showToast('Share: ' + url, 'info', 4000);
    }
  }

  function bindCompose() {
    const textEl = el('compose-text');
    const btn = el('post-submit-btn');
    const fileInput = el('compose-image');
    const removeBtn = el('compose-remove-img');
    const photoLabel = document.querySelector('[data-trigger="compose-image"]');
    const loadMore = el('feed-load-more');

    if (textEl && !textEl.dataset.bound) {
      textEl.dataset.bound = '1';
      const av = global.auth.getUserInitial();
      const av2 = global.getAvatarColor();
      const avEl = el('compose-avatar');
      if (avEl) {
        avEl.textContent = av;
        avEl.setAttribute('data-color', String(av2));
      }
      textEl.addEventListener('input', updateCharCounter);
      textEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submitPost();
        }
      });
    }

    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', submitPost);
    }

    if (fileInput && !fileInput.dataset.bound) {
      fileInput.dataset.bound = '1';
      fileInput.addEventListener('change', attachImage);
    }

    if (removeBtn && !removeBtn.dataset.bound) {
      removeBtn.dataset.bound = '1';
      removeBtn.addEventListener('click', removeAttachedImage);
    }

    if (loadMore && !loadMore.dataset.bound) {
      loadMore.dataset.bound = '1';
      loadMore.addEventListener('click', function () {
        if (!state.loading && state.hasMore) {
          state.page += 1;
          loadFeed();
        }
      });
    }

    const commentForm = el('comment-form');
    if (commentForm && !commentForm.dataset.bound) {
      commentForm.dataset.bound = '1';
      commentForm.addEventListener('submit', function (e) { e.preventDefault(); submitComment(); });
    }
    const cmtBtn = el('comment-submit-btn');
    if (cmtBtn && !cmtBtn.dataset.bound) {
      cmtBtn.dataset.bound = '1';
      cmtBtn.addEventListener('click', function (e) { e.preventDefault(); submitComment(); });
    }
  }

  function bindGlobalDismiss() {
    if (global.__feedDismissBound) return;
    global.__feedDismissBound = true;
    document.addEventListener('click', function (e) {
      const openMenus = document.querySelectorAll('.menu.is-open');
      openMenus.forEach(function (m) {
        if (!m.contains(e.target)) m.classList.remove('is-open');
      });
    });
  }

  function init() {
    const list = el('feed-list');
    if (list) list.innerHTML = renderSkeletons(3);

    const endMsg = el('feed-end');
    if (endMsg) endMsg.hidden = true;

    renderTrending();
    renderActiveRiders();
    bindCompose();
    bindGlobalDismiss();
    state.page = 1;
    state.posts = [];
    state.hasMore = true;
    loadFeed();

    return function destroy() {
      state.currentPostId = null;
    };
  }

  global.FeedModule = { init: init };
})(window);
