document.addEventListener('DOMContentLoaded', () => {
  document.body.style.overflow = '';
  initLiveSearch();
  initMobileDrawer();
  initMobileSearch();
  initFlashDismiss();
  initAutoAlertDismiss();
  initFormValidation();
  initImagePreview();
  initFileUpload();
  initConfirmDialogs();
  initQuantityButtons();
  initScrollAnimations();
  initBackToTop();
  initNavbarScroll();
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

            // TODO: Replace with imageUrl() helper when available client-side
            const imgSrc = item.main_image ? '/uploads/products/' + item.main_image : '/uploads/products/product-placeholder.svg';
            const html = '<a href="/shop/' + item.slug + '" class="search-suggestion-item">' +
              // TODO: Replace onerror placeholder path with imageUrl() helper when available
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
// Image preview for file inputs (legacy — only for bare inputs)
// ---------------------------------------------------------------------------
function initImagePreview() {
  document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
    if (input.closest('.file-upload-wrapper')) return;
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
// Styled File Upload (custom fileUpload partial)
// ---------------------------------------------------------------------------
function initFileUpload() {
  document.querySelectorAll('.file-upload-wrapper').forEach(wrapper => {
    const input = wrapper.querySelector('.file-upload-input');
    const zone = wrapper.querySelector('.file-upload-zone');
    const preview = wrapper.querySelector('.file-upload-preview');
    const previewImg = preview?.querySelector('img');
    const filenameEl = wrapper.querySelector('.file-upload-filename');
    const filesizeEl = wrapper.querySelector('.file-upload-filesize');
    const removeBtn = wrapper.querySelector('.file-upload-remove');
    const currentEl = wrapper.querySelector('.file-upload-current');

    if (!input || !preview) return;

    // File selected → show preview
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;

      showPreview(file);
    });

    // Remove button → reset input
    removeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      resetUpload();
    });

    function showPreview(file) {
      if (previewImg) {
        const reader = new FileReader();
        reader.onload = (ev) => { previewImg.src = ev.target.result; };
        reader.readAsDataURL(file);
      }
      if (filenameEl) filenameEl.textContent = file.name;
      if (filesizeEl) filesizeEl.textContent = formatFileSize(file.size);

      zone?.classList.add('d-none');
      preview?.classList.remove('d-none');
      if (currentEl) currentEl.classList.add('d-none');
    }

    function resetUpload() {
      input.value = '';
      if (previewImg) previewImg.src = '';
      if (filenameEl) filenameEl.textContent = 'No file selected';
      if (filesizeEl) filesizeEl.textContent = '';

      zone?.classList.remove('d-none');
      preview?.classList.add('d-none');
      if (currentEl) currentEl.classList.remove('d-none');
    }
  });

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}

// ---------------------------------------------------------------------------
// Confirm dialogs for destructive actions
// ---------------------------------------------------------------------------
function initConfirmDialogs() {
  document.querySelectorAll('[data-confirm]').forEach(el => {
    if (el.tagName === 'FORM') {
      el.addEventListener('submit', (e) => {
        if (!confirm(el.dataset.confirm || 'Are you sure?')) {
          e.preventDefault();
        }
      });
    } else {
      el.addEventListener('click', (e) => {
        if (!confirm(el.dataset.confirm || 'Are you sure?')) {
          e.preventDefault();
        }
      });
    }
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

// ---------------------------------------------------------------------------
// Scroll-triggered animations using IntersectionObserver
// ---------------------------------------------------------------------------
function initScrollAnimations() {
  var elements = document.querySelectorAll('[data-aos]');

  // Mark all elements as hidden initially (unless already visible)
  elements.forEach(function(el) {
    var rect = el.getBoundingClientRect();
    var winHeight = window.innerHeight || document.documentElement.clientHeight;
    // If element is already on screen, show immediately
    if (rect.top < winHeight && rect.bottom > 0) {
      el.classList.remove('aos-hidden');
    } else {
      el.classList.add('aos-hidden');
    }
  });

  // Use IntersectionObserver for scroll-triggered reveal
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('aos-hidden');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -50px 0px'
    });
    elements.forEach(function(el) { observer.observe(el); });
  } else {
    // Fallback for browsers without IntersectionObserver: show all
    elements.forEach(function(el) { el.classList.remove('aos-hidden'); });
  }
}

// ---------------------------------------------------------------------------
// Back to top button
// ---------------------------------------------------------------------------
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------------------------------------------------------------------------
// Navbar scroll effect
// ---------------------------------------------------------------------------
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar-custom');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ---------------------------------------------------------------------------
// Mobile Drawer
// ---------------------------------------------------------------------------
function initMobileDrawer() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  const closeBtn = document.getElementById('mobileDrawerClose');
  const menuIcon = document.getElementById('mobileMenuIcon');
  const navLinks = drawer ? drawer.querySelectorAll('.mobile-nav-item') : [];
  const body = document.body;

  if (!toggleBtn || !drawer || !overlay || !closeBtn) return;

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
    if (menuIcon) {
      menuIcon.className = 'fa-solid fa-times fs-5';
    }
    toggleBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }

  function closeDrawer() {
    try {
      drawer.classList.remove('open');
      overlay.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      if (menuIcon) {
        menuIcon.className = 'fa-solid fa-bars fs-5';
      }
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
    } catch (e) {}
    body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      e.preventDefault();
      closeDrawer();
    }
  });

  navLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      body.style.overflow = '';
    });
  });
}

// ---------------------------------------------------------------------------
// Mobile Search (routes to desktop live search)
// ---------------------------------------------------------------------------
function initMobileSearch() {
  var mobileInput = document.getElementById('mobileSearchInput');
  var desktopInput = document.getElementById('globalLiveSearch');
  if (!mobileInput) return;

  mobileInput.addEventListener('input', function() {
    if (desktopInput) {
      desktopInput.value = this.value;
      desktopInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  mobileInput.addEventListener('focus', function() {
    this.parentElement.classList.add('focused');
  });
  mobileInput.addEventListener('blur', function() {
    this.parentElement.classList.remove('focused');
  });

  mobileInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && this.value.trim()) {
      window.location.href = '/shop?search=' + encodeURIComponent(this.value.trim());
    }
    if (e.key === 'Escape') {
      this.blur();
    }
  });

  if (desktopInput) {
    desktopInput.addEventListener('input', function() {
      if (document.activeElement !== mobileInput) {
        mobileInput.value = this.value;
      }
    });
  }
}
