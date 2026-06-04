/* ============================================================
   router.js — Hash-based SPA router
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const ROUTES = {
    feed:           { file: 'feed.html',           module: 'FeedModule' },
    bikes:          { file: 'bikes.html',          module: 'BikesModule' },
    recommendation: { file: 'recommendation.html', module: 'RecoModule' },
    trip:           { file: 'trip.html',           module: 'TripModule' },
    profile:        { file: 'profile.html',        module: 'ProfileModule' }
  };

  const DEFAULT_ROUTE = 'feed';
  const PAGE_PATHS = {
    feed:           './pages/feed.html',
    bikes:          './pages/bikes.html',
    recommendation: './pages/recommendation.html',
    trip:           './pages/trip.html',
    profile:        './pages/profile.html'
  };

  let currentModuleTeardown = null;
  let isLoading = false;
  let pendingRoute = null;

  function parseHash() {
    let h = (global.location && global.location.hash) || '';
    if (h.charAt(0) === '#') h = h.slice(1);
    const queryIndex = h.indexOf('?');
    if (queryIndex >= 0) h = h.slice(0, queryIndex);
    return h || '';
  }

  function setActiveNav(route) {
    const navLinks = document.querySelectorAll('.nav-link[data-route]');
    navLinks.forEach(function (link) {
      if (link.getAttribute('data-route') === route) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) {
      const labels = {
        feed: 'Feed',
        bikes: 'Bikes',
        recommendation: 'AI Picks',
        trip: 'Trip Planner',
        profile: 'Profile'
      };
      titleEl.textContent = labels[route] || 'Bikers Portal';
    }
  }

  function setLoading(loading) {
    const mount = document.getElementById('page-content');
    if (!mount) return;
    if (loading && !mount.firstChild) {
      mount.innerHTML =
        '<div class="card" aria-busy="true" style="display:flex;flex-direction:column;gap:12px;">' +
          '<div style="display:flex;gap:12px;align-items:center;">' +
            '<div class="skeleton skeleton--avatar" style="width:48px;height:48px;border-radius:50%;"></div>' +
            '<div style="flex:1;">' +
              '<div class="skeleton skeleton--title"></div>' +
              '<div class="skeleton skeleton--text" style="width:30%;"></div>' +
            '</div>' +
          '</div>' +
          '<div class="skeleton skeleton--text"></div>' +
          '<div class="skeleton skeleton--text" style="width:80%;"></div>' +
        '</div>';
    }
  }

  function teardown() {
    if (typeof currentModuleTeardown === 'function') {
      try { currentModuleTeardown(); } catch (e) { console.warn('teardown error', e); }
    }
    currentModuleTeardown = null;
  }

  async function loadFragment(route) {
    const path = PAGE_PATHS[route];
    if (!path) throw new Error('Unknown route: ' + route);

    const response = await fetch(path, { cache: 'no-cache', credentials: 'omit' });
    if (!response.ok) {
      throw new Error('Failed to load page: ' + path + ' (status ' + response.status + ')');
    }
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const fragment = doc.getElementById('page-content');

    if (!fragment) {
      throw new Error('Page fragment missing #page-content in ' + path);
    }
    return {
      innerHTML: fragment.innerHTML,
      scripts: Array.from(doc.querySelectorAll('script')).map(function (s) { return s.textContent; }),
      styles: Array.from(doc.querySelectorAll('style')).map(function (s) { return s.textContent; })
    };
  }

  function applyFragment(result) {
    const mount = document.getElementById('page-content');
    if (!mount) return;

    if (result.styles && result.styles.length) {
      const existing = document.getElementById('page-styles');
      if (existing) existing.parentNode.removeChild(existing);
      const styleEl = document.createElement('style');
      styleEl.id = 'page-styles';
      styleEl.textContent = result.styles.join('\n');
      document.head.appendChild(styleEl);
    }

    mount.innerHTML = result.innerHTML;

    if (result.scripts && result.scripts.length) {
      result.scripts.forEach(function (src) {
        try {
          const wrapped = '(function(){\n"use strict";\n' + src + '\n})();';
          (new Function(wrapped))();
        } catch (e) {
          console.error('Fragment script error', e);
        }
      });
    }
  }

  async function renderRoute(route) {
    if (isLoading) {
      pendingRoute = route;
      return;
    }

    const cfg = ROUTES[route];
    if (!cfg) {
      if (route !== 'login') {
        console.warn('Unknown route:', route);
        global.location.hash = '#' + DEFAULT_ROUTE;
      }
      return;
    }

    if (!global.auth || !global.auth.isLoggedIn()) {
      return;
    }

    isLoading = true;
    setActiveNav(route);
    setLoading(true);
    global.AppState.currentRoute = route;
    global.routerActive = true;

    try {
      teardown();
      const result = await loadFragment(route);
      applyFragment(result);

      const Module = global[cfg.module];
      if (Module && typeof Module.init === 'function') {
        try {
          const maybeTeardown = Module.init();
          if (typeof maybeTeardown === 'function') {
            currentModuleTeardown = maybeTeardown;
          } else if (Module && typeof Module.destroy === 'function') {
            currentModuleTeardown = function () {
              try { Module.destroy(); } catch (e) { /* noop */ }
            };
          }
        } catch (e) {
          console.error('Module init error for ' + route, e);
          if (global.utils && global.utils.showToast) {
            global.utils.showToast('Failed to load page: ' + (e.message || 'unknown error'), 'error');
          }
        }
      } else {
        console.warn('Module not found:', cfg.module);
      }
    } catch (e) {
      console.error('Route load error', e);
      const mount = document.getElementById('page-content');
      if (mount) {
        mount.innerHTML =
          '<div class="card">' +
            '<div class="alert alert--error">' +
              '<div class="alert__content">' +
                '<div class="alert__title">Failed to load page</div>' +
                '<div class="alert__message">' + (global.utils ? global.utils.escHtml(e.message || 'Unknown error') : e.message) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
      if (global.utils && global.utils.showToast) {
        global.utils.showToast('Failed to load page', 'error');
      }
    } finally {
      isLoading = false;
      if (pendingRoute && pendingRoute !== route) {
        const next = pendingRoute;
        pendingRoute = null;
        renderRoute(next);
      }
    }
  }

  function handleHashChange() {
    const route = parseHash();
    if (!route || route === 'login' || route === 'splash') return;
    if (!ROUTES[route]) {
      global.location.hash = '#' + DEFAULT_ROUTE;
      return;
    }
    if (!global.auth || !global.auth.isLoggedIn()) return;
    renderRoute(route);
  }

  function start() {
    global.addEventListener('hashchange', handleHashChange);

    const initial = parseHash();
    if (!initial) {
      global.location.hash = '#' + DEFAULT_ROUTE;
    } else if (ROUTES[initial] && global.auth && global.auth.isLoggedIn()) {
      renderRoute(initial);
    }
  }

  function navigate(route) {
    if (!ROUTES[route]) return;
    global.location.hash = '#' + route;
  }

  function getCurrentRoute() {
    return ROUTES[parseHash()] ? parseHash() : null;
  }

  global.router = {
    start: start,
    navigate: navigate,
    render: renderRoute,
    getCurrentRoute: getCurrentRoute,
    ROUTES: ROUTES
  };

  global.routerActive = true;
})(window);
