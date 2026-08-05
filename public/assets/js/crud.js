/**
 * TechBridge CRUD library — reusable client for every admin/technician/marketing
 * CRUD module. Provides a JSON API wrapper, global toasts, a unified confirm
 * dialog, Bootstrap modal helpers, multipart form submission with per-field
 * validation, image-upload previews, and a delegated table-toolbar that
 * re-fetches a server-rendered fragment so tables refresh without a page load.
 *
 * Exposed globally as window.Crud.
 *
 * i18n: reads window.CRUD_I18N (injected server-side in footer.ejs).
 * CSRF: reads window.CRUD_CSRF (server-side csrfToken local).
 */
(function () {
  'use strict';

  var I18N = (window.CRUD_I18N) || {};
  var CSRF = window.CRUD_CSRF || '';

  function esc(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return div.innerHTML;
  }

  function t(key, fallback) {
    return I18N[key] || fallback || key;
  }

  // ---------------------------------------------------------------------------
  // JSON API wrapper
  // ---------------------------------------------------------------------------

  function ApiError(status, data) {
    this.name = 'ApiError';
    this.status = status;
    this.data = data || {};
    this.message = (data && data.message) || 'HTTP ' + status;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function api(method, url, body, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    var csrf = window.CRUD_CSRF || CSRF;
    if (csrf) headers['X-CSRF-Token'] = csrf;

    var payload = null;
    if (body !== undefined && body !== null) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        payload = body;
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }

    return fetch(url, {
      method: method,
      headers: headers,
      body: payload,
      credentials: 'same-origin'
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); } catch (e) { data = null; }
        }
        if (!res.ok) throw new ApiError(res.status, data);
        return data;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Toast notifications
  // ---------------------------------------------------------------------------

  var TOAST_ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  function toastStack() {
    var stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'crud-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type) {
    type = type || 'success';
    var el = document.createElement('div');
    el.className = 'crud-toast crud-toast--' + type;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="crud-toast__icon"><i class="fa-solid ' + (TOAST_ICONS[type] || TOAST_ICONS.info) + '"></i></span>' +
      '<span class="crud-toast__msg">' + esc(message) + '</span>' +
      '<button type="button" class="crud-toast__close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>';
    el.querySelector('.crud-toast__close').addEventListener('click', dismiss);
    toastStack().appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    var timer = setTimeout(dismiss, type === 'error' ? 6000 : 4000);

    function dismiss() {
      clearTimeout(timer);
      if (!el.isConnected) return;
      el.classList.remove('is-visible');
      setTimeout(function () { el.remove(); }, 250);
    }
    return el;
  }

  // ---------------------------------------------------------------------------
  // Unified confirm dialog (reuses the existing .modal-overlay design)
  // ---------------------------------------------------------------------------

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay crud-confirm';
      overlay.style.display = 'flex';
      overlay.innerHTML =
        '<div class="modal-dialog">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title"><i class="fa-solid ' + esc(opts.icon || 'fa-triangle-exclamation') +
                (opts.iconClass ? ' ' + esc(opts.iconClass) : ' text-danger') + ' me-2"></i>' + esc(opts.title || t('confirmTitle', 'Are you sure?')) + '</h5>' +
              '<button type="button" class="modal-close" data-crud-confirm-close aria-label="Close">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<p class="mb-0">' + (opts.messageHtml || esc(opts.message || '')) + '</p>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-premium-outline" data-crud-confirm-cancel>' + esc(opts.cancelText || t('cancel', 'Cancel')) + '</button>' +
              '<button type="button" class="btn ' + esc(opts.okClass || 'btn-danger') + '" data-crud-confirm-ok>' +
                '<i class="fa-solid ' + esc(opts.okIcon || 'fa-trash') + ' me-1"></i>' + esc(opts.confirmText || t('delete', 'Delete')) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      function close() {
        overlay.style.display = 'none';
        setTimeout(function () { overlay.remove(); }, 200);
      }
      function done(val) { close(); resolve(val); }

      overlay.querySelector('[data-crud-confirm-close]').addEventListener('click', function () { done(false); });
      overlay.querySelector('[data-crud-confirm-cancel]').addEventListener('click', function () { done(false); });
      overlay.querySelector('[data-crud-confirm-ok]').addEventListener('click', function () { done(true); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) done(false); });

      document.body.appendChild(overlay);
      var okBtn = overlay.querySelector('[data-crud-confirm-ok]');
      if (okBtn) okBtn.focus();
    });
  }

  // ---------------------------------------------------------------------------
  // Modal helpers (Bootstrap 5 with a fallback for the custom overlay)
  // ---------------------------------------------------------------------------

  function openModal(el) {
    if (window.bootstrap && bootstrap.Modal) {
      return bootstrap.Modal.getOrCreateInstance(el).show();
    }
    el.classList.add('show');
    el.style.display = 'block';
    return el;
  }

  function closeModal(el) {
    if (!el) return;
    if (window.bootstrap && bootstrap.Modal) {
      var inst = bootstrap.Modal.getInstance(el);
      if (inst) inst.hide();
      return;
    }
    el.classList.remove('show');
    el.style.display = 'none';
  }

  // ---------------------------------------------------------------------------
  // Form validation helpers
  // ---------------------------------------------------------------------------

  function clearErrors(form) {
    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    form.querySelectorAll('.invalid-feedback').forEach(function (el) { el.remove(); });
  }

  function showErrors(form, errors) {
    clearErrors(form);
    Object.keys(errors || {}).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      var msg = errors[name];
      if (!input || !msg) return;
      input.classList.add('is-invalid');
      var fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      fb.textContent = msg;
      var parent = input.closest('.mb-3') || input.parentElement;
      if (parent) parent.appendChild(fb);
    });
  }

  // ---------------------------------------------------------------------------
  // AJAX form submission (multipart-safe, CSRF-aware)
  // ---------------------------------------------------------------------------

  function submitForm(form, opts) {
    opts = opts || {};
    var method = String(form.method || 'POST').toUpperCase();
    var action = form.getAttribute('action');
    if (!action) return Promise.reject(new Error('Form has no action'));

    var submitBtn = form.querySelector('[type="submit"]');
    var originalHtml = submitBtn ? submitBtn.innerHTML : null;

    function restoreButton() {
      if (submitBtn && originalHtml !== null) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    }

    var formData = new FormData(form);
    var tokenInput = formData.get('csrf_token');
    if (!CSRF && tokenInput) {
      CSRF = String(tokenInput);
      window.CRUD_CSRF = CSRF;
    }

    if (submitBtn) { submitBtn.disabled = true; }
    clearErrors(form);

    return api(method, action, formData)
      .then(function (data) {
        restoreButton();
        if (opts.onSuccess) opts.onSuccess(data, form);
        return data;
      })
      .catch(function (err) {
        restoreButton();
        if (err instanceof ApiError) {
          if (err.data && err.data.errors) showErrors(form, err.data.errors);
          var msg = (err.data && err.data.message) || opts.errorMessage || t('requestFailed', 'Request failed. Please try again.');
          var handled = opts.onError ? opts.onError(err, form) : undefined;
          if (handled !== false) toast(msg, 'error');
        } else {
          toast(opts.networkMessage || t('networkError', 'Network error. Please try again.'), 'error');
          if (opts.onError) opts.onError(err, form);
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Image uploader: instant previews + light type validation
  // ---------------------------------------------------------------------------

  function initImageUploader(input, container) {
    if (!input || typeof FileReader === 'undefined') return;
    container = container || input.closest('.crud-uploader');
    if (!container) return;

    input.addEventListener('change', function () {
      container.querySelectorAll('.crud-uploader__preview').forEach(function (p) { p.remove(); });
      var files = input.files;
      if (!files || !files.length) return;

      Array.prototype.forEach.call(files, function (file) {
        if (file.type && file.type.indexOf('image/') !== 0) return;
        var wrap = document.createElement('div');
        wrap.className = 'crud-uploader__preview';
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.title = file.name;
        wrap.appendChild(img);
        container.appendChild(wrap);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Server-rendered fragment refresh (no page reload)
  // ---------------------------------------------------------------------------

  function refreshTable(options) {
    options = options || {};
    var wrap = options.wrap || document.querySelector('[data-crud-table]');
    var baseUrl = options.url || (wrap && wrap.getAttribute('data-crud-url')) || window.location.pathname;
    if (!wrap) return Promise.reject(new Error('No table container found'));

    var params = new URLSearchParams(window.location.search);
    params.set('fragment', '1');

    if (options.params) {
      Object.keys(options.params).forEach(function (key) {
        var val = options.params[key];
        if (val === null || val === undefined || val === '') params.delete(key);
        else params.set(key, val);
      });
    }

    var refreshBtn = wrap.querySelector('[data-crud-refresh]');
    var original = refreshBtn ? refreshBtn.innerHTML : null;
    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
    wrap.classList.add('crud-table--loading');

    return api('GET', baseUrl + '?' + params.toString())
      .then(function (data) {
        if (data && data.html) {
          wrap.innerHTML = data.html;
          if (options.onRefresh) options.onRefresh(wrap);
        }
        return data;
      })
      .catch(function (err) {
        if (err instanceof ApiError) {
          toast((err.data && err.data.message) || t('loadFailed', 'Failed to load data.'), 'error');
        } else {
          toast(t('networkError', 'Network error. Please try again.'), 'error');
        }
        throw err;
      })
      .then(function (data) {
        wrap.classList.remove('crud-table--loading');
        if (refreshBtn && original !== null) { refreshBtn.disabled = false; refreshBtn.innerHTML = original; }
        return data;
      });
  }

  // ---------------------------------------------------------------------------
  // Delegated table toolbar: search / filters / pagination / refresh.
  // Any element inside the container with:
  //   data-crud-search      -> free-text search input  (param: search)
  //   data-crud-filter      -> filter control; param is its name (or data-crud-param)
  //   data-crud-refresh     -> manual refresh button
  //   data-crud-page        -> pagination button/link; param is data-crud-param or "page"
  // Triggers a fragment re-fetch and swaps the container innerHTML.
  // ---------------------------------------------------------------------------

  function initTable(container, opts) {
    opts = opts || {};
    container = container || document.querySelector('[data-crud-table]');
    if (!container) return null;
    var baseUrl = container.getAttribute('data-crud-url') || window.location.pathname;

    function collectParams(page) {
      var params = {};
      container.querySelectorAll('[data-crud-search]').forEach(function (el) {
        var val = el.value != null ? String(el.value).trim() : '';
        var param = el.getAttribute('data-crud-param') || 'search';
        if (val) params[param] = val;
      });
      container.querySelectorAll('[data-crud-filter]').forEach(function (el) {
        var val = el.value != null ? String(el.value).trim() : '';
        var param = el.getAttribute('data-crud-param') || el.name;
        if (param && val) params[param] = val;
      });
      if (page && page > 1) params.page = page;
      return params;
    }

    var searchTimer = null;
    function refresh(page) {
      if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
      return refreshTable({ wrap: container, url: baseUrl, params: collectParams(page) })
        .then(function () {
          if (opts.onRefresh) opts.onRefresh(container);
        })
        .catch(function () { /* toast already shown */ });
    }

    container.addEventListener('click', function (e) {
      var pageEl = e.target.closest('[data-crud-page]');
      if (pageEl) {
        e.preventDefault();
        var page = parseInt(pageEl.getAttribute('data-crud-page'), 10) || 1;
        var param = pageEl.getAttribute('data-crud-param') || 'page';
        var params = collectParams(page);
        if (param !== 'page') params[param] = page;
        refreshTable({ wrap: container, url: baseUrl, params: params })
          .then(function () { if (opts.onRefresh) opts.onRefresh(container); })
          .catch(function () {});
        return;
      }
      var refreshEl = e.target.closest('[data-crud-refresh]');
      if (refreshEl) {
        e.preventDefault();
        refresh();
      }
    });

    container.addEventListener('input', function (e) {
      if (!e.target.closest('[data-crud-search]')) return;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { refresh(1); }, 350);
    });

    container.addEventListener('change', function (e) {
      if (!e.target.closest('[data-crud-filter]')) return;
      refresh(1);
    });

    return container;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.Crud = {
    I18N: I18N,
    api: api,
    get: function (url, opts) { return api('GET', url, null, opts); },
    post: function (url, body, opts) { return api('POST', url, body, opts); },
    put: function (url, body, opts) { return api('PUT', url, body, opts); },
    del: function (url, opts) { return api('DELETE', url, null, opts); },
    ApiError: ApiError,
    esc: esc,
    toast: toast,
    confirm: confirmDialog,
    openModal: openModal,
    closeModal: closeModal,
    clearErrors: clearErrors,
    showErrors: showErrors,
    submitForm: submitForm,
    initImageUploader: initImageUploader,
    refreshTable: refreshTable,
    initTable: initTable
  };
})();
