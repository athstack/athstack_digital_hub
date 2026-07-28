document.addEventListener('DOMContentLoaded', () => {
  initLiveSearch();
  initFlashDismiss();
  initAutoAlertDismiss();
  initFormValidation();
  initImagePreview();
  initConfirmDialogs();
  initQuantityButtons();
});

// ---------------------------------------------------------------------------
// Live Search (Header)
// ---------------------------------------------------------------------------
function initLiveSearch() {
  const input = document.getElementById('globalLiveSearch');
  const tray = document.getElementById('searchSuggestionsBox');
  if (!input || !tray) return;

  let debounce = null;

  input.addEventListener('input', (e) => {
    clearTimeout(debounce);
    const q = e.target.value.trim();

    if (q.length < 2) {
      tray.style.display = 'none';
      tray.innerHTML = '';
      return;
    }

    debounce = setTimeout(() => {
      fetch('/api/search?term=' + encodeURIComponent(q))
        .then(res => {
          if (!res.ok) throw new Error('Search failed');
          return res.json();
        })
        .then(data => {
          tray.innerHTML = '';
          if (!data || data.length === 0) {
            tray.style.display = 'none';
            return;
          }

          data.forEach(item => {
            const price = item.discount_price && parseFloat(item.discount_price) < parseFloat(item.price)
              ? '<span class="text-primary fw-bold">$' + Number(item.discount_price).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span> <small class="text-muted text-decoration-line-through">$' + Number(item.price).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</small>'
              : '<span class="text-primary fw-bold">$' + Number(item.price).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span>';

            const imgSrc = item.main_image ? '/uploads/products/' + item.main_image : '/uploads/products/product-placeholder.svg';
            const html = '<a href="/shop/' + item.slug + '" class="search-suggestion-item">' +
              '<img src="' + imgSrc + '" alt="' + escapeHtml(item.name) + '" style="width:40px;height:40px;object-fit:cover;margin-right:12px;border-radius:4px;" onerror="this.onerror=null;this.src=\'/uploads/products/product-placeholder.svg\';">' +
              '<div>' +
              '<div class="fw-bold small text-white">' + escapeHtml(item.name) + '</div>' +
              '<div class="small">' + price + '</div>' +
              '</div></a>';
            tray.insertAdjacentHTML('beforeend', html);
          });
          tray.style.display = 'block';
        })
        .catch(err => {
          console.error('Search error:', err);
          tray.style.display = 'none';
        });
    }, 300);
  });

  input.addEventListener('focus', () => {
    if (tray.innerHTML.trim() && tray.children.length > 0) {
      tray.style.display = 'block';
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !tray.contains(e.target)) {
      tray.style.display = 'none';
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tray.style.display = 'none';
      input.blur();
    }
  });
}

// ---------------------------------------------------------------------------
// Auto-dismiss flash alerts after 5 seconds
// ---------------------------------------------------------------------------
function initAutoAlertDismiss() {
  document.querySelectorAll('.alert-dismissible').forEach(alert => {
    setTimeout(() => {
      const closeBtn = alert.querySelector('.btn-close');
      if (closeBtn) closeBtn.click();
    }, 5000);
  });
}

// ---------------------------------------------------------------------------
// Flash message dismiss on click
// ---------------------------------------------------------------------------
function initFlashDismiss() {
  document.querySelectorAll('.flash-overlay').forEach(el => {
    el.addEventListener('click', () => el.remove());
  });
}

// ---------------------------------------------------------------------------
// Form validation enhancements
// ---------------------------------------------------------------------------
function initFormValidation() {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      const requiredFields = form.querySelectorAll('[required]');
      let valid = true;

      requiredFields.forEach(field => {
        field.classList.remove('is-invalid');
        if (!field.value.trim()) {
          field.classList.add('is-invalid');
          valid = false;
        }
      });

      if (!valid) {
        e.preventDefault();
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
      }
    });

    form.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('input', () => {
        if (field.value.trim()) {
          field.classList.remove('is-invalid');
        }
      });
    });
  });

  document.querySelectorAll('input[type="email"]').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        field.classList.add('is-invalid');
      } else {
        field.classList.remove('is-invalid');
      }
    });
  });

  document.querySelectorAll('input[type="password"]').forEach(field => {
    if (field.name === 'confirm_password') {
      const pwField = field.form.querySelector('input[name="password"]');
      if (pwField) {
        field.addEventListener('input', () => {
          if (field.value !== pwField.value) {
            field.classList.add('is-invalid');
          } else {
            field.classList.remove('is-invalid');
          }
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Image preview for file inputs
// ---------------------------------------------------------------------------
function initImagePreview() {
  document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      let preview = input.closest('.col-md-6, .col-md-12, .col-12')?.querySelector('.image-preview-container');
      if (!preview) {
        preview = document.createElement('div');
        preview.className = 'image-preview-container mt-2';
        preview.innerHTML = '<img class="img-fluid rounded" style="max-height:120px;object-fit:contain;">';
        input.parentNode.appendChild(preview);
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.querySelector('img').src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
}

// ---------------------------------------------------------------------------
// Confirm dialogs for destructive actions
// ---------------------------------------------------------------------------
function initConfirmDialogs() {
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!confirm(el.dataset.confirm || 'Are you sure?')) {
        e.preventDefault();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Quantity +/- buttons for cart
// ---------------------------------------------------------------------------
function initQuantityButtons() {
  document.querySelectorAll('.qty-btn-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = btn.closest('.input-group')?.querySelector('input[name="quantity"], span.form-control');
      if (input && input.tagName === 'INPUT') {
        const val = parseInt(input.value) || 1;
        if (val > 1) input.value = val - 1;
      }
    });
  });

  document.querySelectorAll('.qty-btn-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = btn.closest('.input-group')?.querySelector('input[name="quantity"]');
      if (input) {
        const val = parseInt(input.value) || 0;
        input.value = val + 1;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Utility: Escape HTML to prevent XSS in search results
// ---------------------------------------------------------------------------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
