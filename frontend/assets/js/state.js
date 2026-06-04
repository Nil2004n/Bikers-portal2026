/* ============================================================
   state.js — Global in-memory AppState
   Bikers Portal • frontend
   ============================================================ */
(function () {
  'use strict';

  if (typeof window.AppState !== 'undefined') return;

  window.AppState = {
    user: null,
    token: null,
    theme: 'light',
    avatarColor: 1,
    currentRoute: null,
    activeTripId: null
  };

  window.AvatarColor = window.AvatarColor || 1;

  window.setAvatarColor = function (color) {
    const n = Number(color);
    if (n >= 1 && n <= 6) {
      window.AvatarColor = n;
      window.AppState.avatarColor = n;
    }
  };

  window.getAvatarColor = function () {
    if (window.AppState && window.AppState.avatarColor) {
      return window.AppState.avatarColor;
    }
    return 1;
  };
})();
