/* ============================================================
   feed.js — Module 1.0: Media Feed
   Routes: #feed
   API:
     GET  /api/feed                 paginated posts (page, limit)
     POST /api/feed                 create post
     POST /api/feed/:id/like        toggle like
     POST /api/feed/:id/comments    add comment
     GET  /api/feed/:id/comments    fetch comments
     DELETE /api/feed/:id          delete own post
   ============================================================ */

window.FeedModule = (() => {

  /* ── State ────────────────────────────────────────────── */
  let posts       = [];
  let page        = 1;
  let hasMore     = true;
  let loading     = false;
  let likedIds    = new Set();

  /* ── Shell ────────────────────────────────────────────── */
  function renderShell() {
    return `
    <div class="feed-layout">
      <!-- Feed column -->
      <div>
        <div class="page-header" style="margin-bottom:var(--space-5);">
          <div class="page-header__text">
            <h1 class="page-title">Community Feed</h1>
            <p class="page-subtitle">Stories, tips and rides from the biker community.</p>
          </div>
        </div>

        <!-- Compose card -->
        <div class="card" id="compose-card" style="margin-bottom:var(--space-5);">
          <div style="display:flex;gap:var(--space-3);align-items:flex-start;">
            <div class="avatar avatar-md" id="compose-avatar" style="background:var(--color-primary-highlight);color:var(--color-primary);flex-shrink:0;">R</div>
            <textarea id="compose-text" class="form-control"
              rows="2" placeholder="Share a ride, tip or photo…"
              style="resize:none;flex:1;"
              maxlength="1000" aria-label="Write a post"></textarea>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-3);flex-wrap:wrap;gap:var(--space-3);">
            <div style="display:flex;gap:var(--space-2);">
              <label class="btn btn-ghost btn-sm" style="cursor:pointer;" title="Attach image">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Photo
                <input type="file" id="compose-image" accept="image/*" style="display:none;" />
              </label>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              <span id="compose-char" style="font-size:var(--text-xs);color:var(--color-text-faint);">0 / 1000</span>
              <button class="btn btn-primary btn-sm" id="post-submit-btn" disabled>Post</button>
            </div>
          </div>
          <div id="compose-preview" style="display:none;margin-top:var(--space-3);position:relative;">
            <img id="compose-preview-img" src="" alt="Preview" style="max-height:200px;border-radius:var(--radius-md);object-fit:cover;width:100%;" />
            <button id="compose-remove-img" style="position:absolute;top:var(--space-2);right:var(--space-2);" class="btn btn-ghost btn-icon btn-sm" aria-label="Remove image">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div id="compose-alert" class="alert alert-error" style="display:none;margin-top:var(--space-3);" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
            <span id="compose-alert-msg"></span>
          </div>
        </div>

        <!-- Post list -->
        <div id="feed-list" aria-live="polite" aria-label="Community posts"></div>

        <!-- Load more -->
        <div id="feed-load-more" style="text-align:center;margin-top:var(--space-6);display:none;">
          <button class="btn btn-outline" id="load-more-btn">Load More</button>
        </div>

        <!-- End of feed -->
        <div id="feed-end" style="text-align:center;padding:var(--space-8);color:var(--color-text-faint);font-size:var(--text-sm);display:none;">
          You've reached the end of the feed.
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="feed-sidebar">
        <!-- Trending tags -->
        <div class="card" style="margin-bottom:var(--space-5);">
          <div class="card-header">
            <h2 class="card-title" style="font-size:var(--text-base);">Trending Tags</h2>
          </div>
          <div id="trending-tags" style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-2);">
            ${['#MTBLife','#RoadCycling','#EBike','#CyclingIndia','#FixedGear','#BikePacking']
              .map(t => `<span class="filter-chip" style="cursor:pointer;">${t}</span>`).join('')}
          </div>
        </div>

        <!-- Who to follow placeholder -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title" style="font-size:var(--text-base);">Active Riders</h2>
          </div>
          <div id="active-riders">
            ${[
              {name:'Priya S.',   handle:'@priya_mtb',   rides:142},
              {name:'Raj Kumar',  handle:'@rajrides',    rides:98},
              {name:'Anita D.',   handle:'@anitacycles',  rides:77},
            ].map(r => `
            <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-divider);">
              <div class="avatar avatar-sm" style="background:var(--color-primary-highlight);color:var(--color-primary);flex-shrink:0;">${r.name[0]}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted);">${r.rides} rides</div>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </aside>
    </div>

    <!-- Comments Modal -->
    <div class="modal-backdrop" id="comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-modal-title">
      <div class="modal" style="max-width:520px;">
        <div class="modal-header">
          <h2 class="modal-title" id="comments-modal-title">Comments</h2>
          <button class="modal-close btn btn-ghost btn-icon" id="comments-modal-close" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div id="comments-list" style="max-height:320px;overflow-y:auto;margin-bottom:var(--space-4);"></div>
          <div class="form-group">
            <textarea id="comment-text" class="form-control" rows="2" placeholder="Write a comment…" maxlength="500"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="comments-close-2">Cancel</button>
          <button class="btn btn-primary" id="comment-submit-btn">Comment</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Post card ────────────────────────────────────────── */
  function postCard(p) {
    const liked    = likedIds.has(p.id);
    const timeAgo  = relativeTime(p.createdAt);
    const user     = p.user || {};
    const initial  = (user.name || 'R')[0].toUpperCase();
    const isOwn    = window.AppState?.user?.id === user.id;

    return `
    <article class="card post-card" data-post-id="${p.id}" style="margin-bottom:var(--space-4);">
      <div class="post-card__header">
        <div class="avatar avatar-md" style="background:var(--color-primary-highlight);color:var(--color-primary);flex-shrink:0;">${initial}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:var(--text-sm);color:var(--color-text);">${escHtml(user.name || 'Rider')}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);">${timeAgo}</div>
        </div>
        ${isOwn ? `
        <div class="dropdown">
          <button class="btn btn-ghost btn-icon btn-sm post-menu-btn" aria-label="Post options" aria-haspopup="true" aria-expanded="false" data-post-id="${p.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item danger delete-post-btn" data-post-id="${p.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete post
            </button>
          </div>
        </div>` : ''}
      </div>

      <div class="post-card__content">${escHtml(p.content || '')}</div>

      ${p.imageUrl ? `<img class="post-card__image" src="${escHtml(p.imageUrl)}" alt="Post image" loading="lazy" width="560" height="315" onerror="this.style.display='none'" />` : ''}

      ${(p.tags||[]).length ? `
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3);">
        ${p.tags.map(t=>`<span class="badge badge-neutral">${escHtml(t)}</span>`).join('')}
      </div>` : ''}

      <div class="post-card__actions">
        <button class="post-card__action-btn like-btn${liked?' liked':''}" data-post-id="${p.id}" aria-pressed="${liked}" aria-label="Like post">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span class="like-count">${p.likeCount || 0}</span>
        </button>
        <button class="post-card__action-btn comment-btn" data-post-id="${p.id}" aria-label="View comments">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>${p.commentCount || 0}</span>
        </button>
        <button class="post-card__action-btn share-btn" data-post-id="${p.id}" aria-label="Share post" style="margin-left:auto;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
      </div>
    </article>`;
  }

  /* ── Comment item ─────────────────────────────────────── */
  function commentItem(c) {
    const initial = (c.user?.name || 'R')[0].toUpperCase();
    return `
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);">
      <div class="avatar avatar-sm" style="background:var(--color-surface-offset);color:var(--color-text-muted);flex-shrink:0;">${initial}</div>
      <div style="flex:1;">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text);">${escHtml(c.user?.name||'Rider')}</div>
        <div style="font-size:var(--text-sm);color:var(--color-text);margin-top:2px;line-height:1.55;">${escHtml(c.content||'')}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:4px;">${relativeTime(c.createdAt)}</div>
      </div>
    </div>`;
  }

  /* ── Load feed ────────────────────────────────────────── */
  async function loadFeed(reset = false) {
    if (loading) return;
    loading = true;

    if (reset) { page = 1; hasMore = true; posts = []; }

    const list = document.getElementById('feed-list');
    if (!list) { loading = false; return; }

    if (page === 1) list.innerHTML = skeletonFeed(3);

    try {
      const res = await window.AppApi.get(`/feed?page=${page}&limit=10`);
      const newPosts = res.data || res.posts || res || [];
      if (reset || page === 1) { posts = newPosts; list.innerHTML = ''; }
      else posts = [...posts, ...newPosts];

      if (!newPosts.length || newPosts.length < 10) hasMore = false;

      if (!posts.length) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <h3>No posts yet</h3>
            <p>Be the first to share a ride or tip with the community.</p>
          </div>`;
      } else if (page === 1) {
        list.innerHTML = posts.map(postCard).join('');
        bindPostEvents(list);
      } else {
        const frag = document.createElement('div');
        frag.innerHTML = newPosts.map(postCard).join('');
        while (frag.firstChild) list.appendChild(frag.firstChild);
        bindPostEvents(list);
      }

      const loadMore = document.getElementById('feed-load-more');
      const endEl    = document.getElementById('feed-end');
      if (loadMore) loadMore.style.display = hasMore ? 'block' : 'none';
      if (endEl)    endEl.style.display    = !hasMore && posts.length ? 'block' : 'none';

      page++;
    } catch {
      if (page === 1) list.innerHTML = `<div class="alert alert-error"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>Could not load feed. Please try again.</div>`;
    }
    loading = false;
  }

  /* ── Bind events on rendered posts ───────────────────── */
  function bindPostEvents(container) {
    // Like buttons
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleLike(btn));
    });
    // Comment buttons
    container.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', () => openComments(btn.dataset.postId));
    });
    // Share buttons
    container.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(window.location.href + '?post=' + btn.dataset.postId)
          .then(() => window.showToast('Link copied!', 'success'))
          .catch(() => window.showToast('Could not copy link.', 'error'));
      });
    });
    // Post dropdown menus
    container.querySelectorAll('.post-menu-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const dd = btn.nextElementSibling;
        const open = dd.classList.toggle('active');
        // Reuse dropdown open class by toggling parent
        btn.closest('.dropdown').classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    // Delete post
    container.querySelectorAll('.delete-post-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePost(btn.dataset.postId));
    });
    document.addEventListener('click', () => {
      container.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    });
  }

  /* ── Toggle like ──────────────────────────────────────── */
  async function toggleLike(btn) {
    const id      = btn.dataset.postId;
    const countEl = btn.querySelector('.like-count');
    const liked   = likedIds.has(id);
    // Optimistic update
    if (liked) { likedIds.delete(id); btn.classList.remove('liked'); btn.setAttribute('aria-pressed','false'); countEl.textContent = Math.max(0, +countEl.textContent - 1); }
    else        { likedIds.add(id);    btn.classList.add('liked');    btn.setAttribute('aria-pressed','true');  countEl.textContent = +countEl.textContent + 1; }
    btn.querySelector('svg').setAttribute('fill', likedIds.has(id) ? 'currentColor' : 'none');
    try {
      const res = await window.AppApi.post(`/feed/${id}/like`, {});
      if (typeof res.likeCount === 'number') countEl.textContent = res.likeCount;
    } catch { /* revert silently */ }
  }

  /* ── Comments modal ───────────────────────────────────── */
  let activePostId = null;
  async function openComments(postId) {
    activePostId = postId;
    const modal  = document.getElementById('comments-modal');
    const list   = document.getElementById('comments-list');
    const textIn = document.getElementById('comment-text');
    textIn.value = '';
    list.innerHTML = skeletonComments(3);
    modal.classList.add('open');
    try {
      const res  = await window.AppApi.get(`/feed/${postId}/comments`);
      const cmts = res.data || res.comments || res || [];
      list.innerHTML = cmts.length
        ? cmts.map(commentItem).join('')
        : '<p style="color:var(--color-text-muted);font-size:var(--text-sm);text-align:center;padding:var(--space-6) 0;">No comments yet. Be the first!</p>';
    } catch { list.innerHTML = '<p style="color:var(--color-error);font-size:var(--text-sm);">Could not load comments.</p>'; }
  }

  function closeComments() {
    document.getElementById('comments-modal').classList.remove('open');
    activePostId = null;
  }

  async function submitComment() {
    const textIn = document.getElementById('comment-text');
    const text   = textIn.value.trim();
    if (!text) return;
    const btn = document.getElementById('comment-submit-btn');
    btn.classList.add('loading'); btn.disabled = true;
    try {
      await window.AppApi.post(`/feed/${activePostId}/comments`, { content: text });
      textIn.value = '';
      window.showToast('Comment added.', 'success');
      // Refresh comments in modal
      const res  = await window.AppApi.get(`/feed/${activePostId}/comments`);
      const cmts = res.data || res.comments || res || [];
      document.getElementById('comments-list').innerHTML = cmts.map(commentItem).join('');
      // Update count in post card
      const countEl = document.querySelector(`.comment-btn[data-post-id="${activePostId}"] span`);
      if (countEl) countEl.textContent = cmts.length;
    } catch (err) {
      window.showToast(err.message || 'Could not post comment.', 'error');
    } finally { btn.classList.remove('loading'); btn.disabled = false; }
  }

  /* ── Submit new post ──────────────────────────────────── */
  async function submitPost() {
    const text  = document.getElementById('compose-text').value.trim();
    const imgIn = document.getElementById('compose-image');
    const alert = document.getElementById('compose-alert');
    const msg   = document.getElementById('compose-alert-msg');
    const btn   = document.getElementById('post-submit-btn');
    alert.style.display = 'none';

    if (!text) { msg.textContent = 'Post cannot be empty.'; alert.style.display='flex'; return; }

    btn.classList.add('loading'); btn.disabled = true;
    try {
      const body = { content: text };
      // Image: in production, upload to Supabase Storage first and send URL
      await window.AppApi.post('/feed', body);
      document.getElementById('compose-text').value = '';
      document.getElementById('compose-char').textContent = '0 / 1000';
      clearImagePreview();
      window.showToast('Post published!', 'success');
      loadFeed(true);
    } catch (err) {
      msg.textContent  = err.message || 'Could not publish post.';
      alert.style.display = 'flex';
    } finally { btn.classList.remove('loading'); btn.disabled = false; }
  }

  /* ── Delete post ──────────────────────────────────────── */
  async function deletePost(id) {
    if (!confirm('Delete this post?')) return;
    try {
      await window.AppApi.delete(`/feed/${id}`);
      window.showToast('Post deleted.', 'info');
      loadFeed(true);
    } catch (err) { window.showToast(err.message || 'Could not delete post.', 'error'); }
  }

  /* ── Image preview ────────────────────────────────────── */
  function clearImagePreview() {
    const prev = document.getElementById('compose-preview');
    const img  = document.getElementById('compose-preview-img');
    if (prev) prev.style.display = 'none';
    if (img)  img.src = '';
    const inp = document.getElementById('compose-image');
    if (inp)  inp.value = '';
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function skeletonFeed(n) {
    return Array.from({length:n}, () => `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-4);">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex:1;"><div class="skeleton skeleton-text" style="width:40%;"></div><div class="skeleton skeleton-text" style="width:25%;"></div></div>
        </div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-image" style="margin-top:var(--space-3);"></div>
      </div>`).join('');
  }
  function skeletonComments(n) {
    return Array.from({length:n}, () => `
      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex:1;"><div class="skeleton skeleton-text" style="width:35%;"></div><div class="skeleton skeleton-text"></div></div>
      </div>`).join('');
  }
  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
    if (d > 30)  return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    if (d >= 1)  return `${d}d ago`;
    if (h >= 1)  return `${h}h ago`;
    if (m >= 1)  return `${m}m ago`;
    return 'just now';
  }
  function escHtml(s) { const d=document.createElement('div'); d.textContent=String(s||''); return d.innerHTML; }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    document.getElementById('page-content').innerHTML = renderShell();

    // Compose avatar
    const user = window.AppState?.user;
    if (user) {
      const av = document.getElementById('compose-avatar');
      if (av) av.textContent = (user.name || user.email || 'R')[0].toUpperCase();
    }

    // Char counter + enable/disable post button
    const textArea = document.getElementById('compose-text');
    const charEl   = document.getElementById('compose-char');
    const submitBtn = document.getElementById('post-submit-btn');
    textArea.addEventListener('input', () => {
      const len = textArea.value.length;
      charEl.textContent = `${len} / 1000`;
      submitBtn.disabled = len === 0;
    });

    // Image preview
    document.getElementById('compose-image').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('compose-preview-img').src = ev.target.result;
        document.getElementById('compose-preview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('compose-remove-img').addEventListener('click', clearImagePreview);

    // Post submit
    submitBtn.addEventListener('click', submitPost);
    textArea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitPost();
    });

    // Load more
    document.getElementById('load-more-btn').addEventListener('click', () => loadFeed());

    // Comments modal
    document.getElementById('comments-modal-close').addEventListener('click', closeComments);
    document.getElementById('comments-close-2').addEventListener('click', closeComments);
    document.getElementById('comments-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeComments(); });
    document.getElementById('comment-submit-btn').addEventListener('click', submitComment);

    // Trending tag chips (filter by tag)
    document.querySelectorAll('#trending-tags .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => window.showToast(`Filtered by ${chip.textContent}`, 'info'));
    });

    loadFeed(true);
  }

  return { init };
})();
