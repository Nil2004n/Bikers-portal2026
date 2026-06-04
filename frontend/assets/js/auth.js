/* ============================================================
   auth.js — login, register, logout, getToken
   Bikers Portal • frontend
   ============================================================ */
(function (global) {
  'use strict';

  async function login(email, password) {
    const data = await global.apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (data && data.token) {
      global.AppState.token = data.token;
      if (data.user) {
        global.AppState.user = data.user;
        if (data.user.avatarColor) {
          global.setAvatarColor(data.user.avatarColor);
        }
      }
    }
    return data;
  }

  async function register(payload) {
    const data = await global.apiFetch('/api/auth/register', {
      method: 'POST',
      body: payload
    });

    if (data && data.token) {
      global.AppState.token = data.token;
      if (data.user) global.AppState.user = data.user;
      if (data.user && data.user.avatarColor) {
        global.setAvatarColor(data.user.avatarColor);
      }
    }
    return data;
  }

  function logout() {
    global.AppState.user = null;
    global.AppState.token = null;
    global.AppState.activeTripId = null;
    try { window.location.hash = '#login'; } catch (e) { /* noop */ }
  }

  function getToken() {
    return (global.AppState && global.AppState.token) || null;
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function getCurrentUser() {
    return (global.AppState && global.AppState.user) || null;
  }

  function getUserId() {
    const u = getCurrentUser();
    return u ? (u.id || u._id || u.userId) : null;
  }

  function getUserName() {
    const u = getCurrentUser();
    if (!u) return 'Rider';
    return u.name || u.username || (u.email ? u.email.split('@')[0] : 'Rider');
  }

  function getUserInitial() {
    const name = getUserName();
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  global.auth = {
    login,
    register,
    logout,
    getToken,
    isLoggedIn,
    getCurrentUser,
    getUserId,
    getUserName,
    getUserInitial
  };
})(window);
