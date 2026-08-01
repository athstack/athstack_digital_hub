/* ============================================================
 * Client-side i18n support.
 *
 * Responsibilities:
 *  - Persist the user's chosen language to localStorage.
 *  - Enforce a stored preference on page load (if the server could
 *    not see it yet, e.g. cookie cleared), without ever forcing it.
 *  - Wire up the language selector dropdown (keyboard accessible).
 *
 * Server-side rendering always applies the active language, so a
 * language change persists the choice (localStorage + cookie) and
 * then lets the server re-render the page in the new language.
 * ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'km_lang';

  function getDocumentLang() {
    return (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
  }

  function switchLanguage(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* private mode */ }
    var redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = '/set-language?lang=' + encodeURIComponent(code) + '&redirect=' + redirect;
  }

  function initLanguageSelector() {
    var options = document.querySelectorAll('.language-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function (e) {
        var code = this.getAttribute('data-lang');
        if (!code) return;
        e.preventDefault();
        switchLanguage(code);
      });
    }
  }

  function enforceStoredPreference() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    var current = getDocumentLang();

    if (stored && stored !== current) {
      // The server rendered a different language than the stored preference
      // (e.g. cookie was cleared). Re-persist to the cookie and reload so the
      // user's manual choice always wins over automatic detection.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/set-language?lang=' + encodeURIComponent(stored) +
        '&redirect=' + encodeURIComponent(window.location.pathname + window.location.search), true);
      xhr.onload = function () { window.location.reload(); };
      xhr.onerror = function () { window.location.reload(); };
      xhr.send();
    } else if (!stored) {
      // First visit: adopt whatever the server detected (browser language or
      // manual cookie) as the stable preference.
      try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    enforceStoredPreference();
    initLanguageSelector();
  });
})();
