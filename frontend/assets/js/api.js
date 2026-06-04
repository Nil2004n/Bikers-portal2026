/* ============================================================
   api.js — fetch() wrapper that attaches Bearer JWT
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  const BASE_URL = 'http://localhost:8080';

  function describeError(url, method, cause) {
    /* When the browser blocks a request, `cause` is usually a TypeError
       ("Failed to fetch") with no further detail. We surface the most
       likely cause so the user knows what to fix. */
    const msg = (cause && cause.message) || String(cause || 'Unknown error');
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return 'Cannot reach ' + url + '. The backend is not reachable or ' +
             'CORS is blocking the request. Make sure Spring Boot is ' +
             'running on ' + BASE_URL + ' and allows CORS from this origin.';
    }
    if (/timeout/i.test(msg)) {
      return 'Request to ' + url + ' timed out.';
    }
    return msg;
  }

  async function apiFetch(path, options = {}) {
    const opts = Object.assign({ method: 'GET' }, options);
    const token = (global.AppState && global.AppState.token) || null;

    const headers = Object.assign(
      { Accept: 'application/json' },
      opts.headers || {}
    );

    if (token) headers['Authorization'] = 'Bearer ' + token;

    let body = opts.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      body = JSON.stringify(body);
    }

    const url = path.startsWith('http') ? path : BASE_URL + path;

    let response;
    try {
      response = await fetch(url, {
        method: opts.method,
        headers,
        body,
        credentials: 'omit',
        mode: 'cors'
      });
    } catch (networkError) {
      /* Always log the technical details — they're invisible in the UI
         but crucial for debugging. */
      console.error('[api] ' + opts.method + ' ' + url + ' failed:', networkError);

      const err = new Error(describeError(url, opts.method, networkError));
      err.status = 0;
      err.cause = networkError;
      err.path = path;
      err.method = opts.method;
      err.url = url;
      throw err;
    }

    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      try { data = await response.json(); } catch (e) { data = null; }
    } else {
      try { data = await response.text(); } catch (e) { data = null; }
    }

    if (!response.ok) {
      const err = new Error(
        (data && (data.message || data.error)) || response.statusText || 'Request failed'
      );
      err.status = response.status;
      err.data = data;
      err.path = path;
      err.method = opts.method;
      err.url = url;
      throw err;
    }

    return data;
  }

  /* Quick connectivity probe — useful for the auth screen to tell
     the user *before* they hit submit that the backend is down. */
  async function ping() {
    try {
      const res = await fetch(BASE_URL + '/api/health', { method: 'GET', mode: 'cors' });
      return res.ok || res.status === 401 || res.status === 404;
    } catch (e) {
      return false;
    }
  }

  global.apiFetch = apiFetch;
  global.apiPing = ping;
  global.API_BASE = BASE_URL;
})(window);
