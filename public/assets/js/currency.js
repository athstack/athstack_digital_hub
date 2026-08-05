/* ============================================================
 * Client-side currency support.
 *
 * Responsibilities:
 *  - Persist the user's chosen currency to localStorage.
 *  - Enforce a stored preference on page load (if the server could
 *    not see it yet, e.g. cookie cleared), without ever forcing it.
 *  - Wire up the currency selector dropdown (keyboard accessible).
 *
 * Server-side rendering always converts prices to the active currency,
 * so a currency change persists the choice (localStorage + cookie) and
 * then lets the server re-render the page in the new currency.
 * ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'km_currency';

  function getDocumentCurrency() {
    return (document.documentElement.getAttribute('data-currency') || 'USD').toUpperCase();
  }

  function switchCurrency(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* private mode */ }
    var redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = '/set-currency?currency=' + encodeURIComponent(code) + '&redirect=' + redirect;
  }

  function initCurrencySelector() {
    var options = document.querySelectorAll('.currency-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function (e) {
        var code = this.getAttribute('data-currency');
        if (!code) return;
        e.preventDefault();
        switchCurrency(code);
      });
    }
  }

  function enforceStoredPreference() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    var current = getDocumentCurrency();

    if (stored && stored !== current) {
      // The server rendered a different currency than the stored preference
      // (e.g. cookie was cleared). Re-persist to the cookie and reload so the
      // user's manual choice always wins.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/set-currency?currency=' + encodeURIComponent(stored) +
        '&redirect=' + encodeURIComponent(window.location.pathname + window.location.search), true);
      xhr.onload = function () { window.location.reload(); };
      xhr.onerror = function () { window.location.reload(); };
      xhr.send();
    } else if (!stored) {
      // First visit: adopt whatever the server rendered as the stable preference.
      try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    enforceStoredPreference();
    initCurrencySelector();
  });
})();
