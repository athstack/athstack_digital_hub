document.addEventListener('DOMContentLoaded', () => {
  initReviewModal();
  initReviewEditForm();
  initReviewFilters();
  initReviewHelpful();
  initReviewReport();
  initReviewLightbox();
});

function getString(key, fallback) {
  const s = window.i18nStrings || {};
  return s[key] || fallback;
}

// ---------------------------------------------------------------------------
// Review Modal: stars, char counter, multi-photo upload with previews
// ---------------------------------------------------------------------------
function initReviewModal() {
  const modal = document.getElementById('reviewModal');
  const form = document.getElementById('reviewForm');
  const starsContainer = document.getElementById('reviewModalStars');
  if (!modal || !form) return;

  let selectedRating = 5;
  let hoveredRating = -1;

  const ratingInput = document.getElementById('reviewModalRating');
  const hint = document.getElementById('reviewModalHint');
  const commentInput = document.getElementById('reviewCommentInput');
  const charCount = document.getElementById('reviewCommentCount');
  const fileInput = document.getElementById('reviewImagesInput');
  const previewsBox = document.getElementById('reviewUploadPreviews');
  const MAX_IMAGES = 5;
  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  let pendingFiles = [];

  function renderStars() {
    starsContainer.querySelectorAll('.review-star-btn').forEach((btn, i) => {
      const active = hoveredRating >= 0 ? i <= hoveredRating : i < selectedRating;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    if (ratingInput) ratingInput.value = selectedRating;
  }

  starsContainer.querySelectorAll('.review-star-btn').forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => { hoveredRating = i; renderStars(); });
    btn.addEventListener('mouseleave', () => { hoveredRating = -1; renderStars(); });
    btn.addEventListener('click', () => { selectedRating = i + 1; renderStars(); });
    btn.addEventListener('focus', () => { hoveredRating = i; renderStars(); });
    btn.addEventListener('blur', () => { hoveredRating = -1; renderStars(); });
  });

  modal.addEventListener('show.bs.modal', () => {
    selectedRating = 5;
    hoveredRating = -1;
    pendingFiles = [];
    renderStars();
    renderPreviews();
    if (commentInput) commentInput.value = '';
    updateCharCount();
    if (fileInput) fileInput.value = '';
  });

  if (commentInput && charCount) {
    commentInput.addEventListener('input', updateCharCount);
  }

  function updateCharCount() {
    if (!commentInput || !charCount) return;
    const len = commentInput.value.trim().length;
    charCount.textContent = len + ' / 1500 (min 20)';
    charCount.classList.toggle('text-warning', len > 0 && len < 20);
    charCount.classList.toggle('text-danger', len > 1500);
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      const errors = [];
      files.forEach(file => {
        if (!ALLOWED.includes(file.type)) {
          errors.push(getString('reviewInvalidImageType', 'Only JPG, PNG, WebP or GIF images are allowed.'));
          return;
        }
        if (file.size > MAX_SIZE) {
          errors.push(getString('reviewPhotoTooLarge', 'Each photo must be 5MB or smaller.'));
          return;
        }
        if (pendingFiles.length >= MAX_IMAGES) {
          errors.push(getString('reviewMaxPhotos', 'You can upload up to 5 photos.'));
          return;
        }
        pendingFiles.push(file);
      });
      if (errors.length && hint) hint.textContent = errors[0];
      else if (hint) hint.textContent = '';
      fileInput.value = '';
      renderPreviews();
    });
  }

  function renderPreviews() {
    if (!previewsBox) return;
    previewsBox.innerHTML = '';
    pendingFiles.forEach((file, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'review-upload-preview';
      const img = document.createElement('img');
      img.alt = 'Photo ' + (i + 1);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'review-upload-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', getString('reviewRemovePhoto', 'Remove photo {{count}}').replace('{{count}}', i + 1));
      removeBtn.addEventListener('click', () => {
        pendingFiles.splice(i, 1);
        renderPreviews();
      });
      const reader = new FileReader();
      reader.onload = (ev) => { img.src = ev.target.result; };
      reader.readAsDataURL(file);
      wrap.appendChild(img);
      wrap.appendChild(removeBtn);
      previewsBox.appendChild(wrap);
    });
    const zone = document.querySelector('.review-upload-zone');
    if (zone) {
      zone.classList.toggle('d-none', pendingFiles.length >= MAX_IMAGES);
    }
  }

  form.addEventListener('submit', (e) => {
    if (selectedRating < 1 || selectedRating > 5) {
      e.preventDefault();
      if (hint) hint.textContent = getString('reviewRatingHint', 'Please select a rating between 1 and 5.');
      return;
    }
    const len = commentInput ? commentInput.value.trim().length : 0;
    if (len < 20) {
      e.preventDefault();
      if (hint) hint.textContent = getString('reviewMinLength', 'Please write at least 20 characters.');
      return;
    }
    if (hint) hint.textContent = '';

    // Rebuild FileList onto the form
    if (pendingFiles.length) {
      const dt = new DataTransfer();
      pendingFiles.forEach(f => dt.items.add(f));
      fileInput.files = dt.files;
    }
  });
}

// ---------------------------------------------------------------------------
// Review edit form: stars, char counter, multi-photo upload with previews
// ---------------------------------------------------------------------------
function initReviewEditForm() {
  const starsContainer = document.querySelector('[data-review-stars]');
  if (!starsContainer) return;

  const ratingInput = document.getElementById(starsContainer.getAttribute('data-rating-input'));
  const hint = document.getElementById('reviewEditHint');
  const form = document.getElementById('reviewEditForm');
  const commentInput = document.getElementById('reviewEditComment');
  const charCount = document.getElementById('reviewEditCommentCount');
  const fileInput = document.getElementById('reviewEditImagesInput');
  const previewsBox = document.getElementById('reviewEditUploadPreviews');
  const MAX_IMAGES = 5;
  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  let selectedRating = parseInt(starsContainer.getAttribute('data-review-stars') || '5', 10);
  let hoveredRating = -1;
  let pendingFiles = [];

  function renderStars() {
    starsContainer.querySelectorAll('.review-star-btn').forEach((btn, i) => {
      const active = hoveredRating >= 0 ? i <= hoveredRating : i < selectedRating;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    if (ratingInput) ratingInput.value = selectedRating;
  }

  starsContainer.querySelectorAll('.review-star-btn').forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => { hoveredRating = i; renderStars(); });
    btn.addEventListener('mouseleave', () => { hoveredRating = -1; renderStars(); });
    btn.addEventListener('click', () => { selectedRating = i + 1; renderStars(); });
    btn.addEventListener('focus', () => { hoveredRating = i; renderStars(); });
    btn.addEventListener('blur', () => { hoveredRating = -1; renderStars(); });
  });

  renderStars();

  if (commentInput && charCount) {
    commentInput.addEventListener('input', () => {
      const len = commentInput.value.trim().length;
      charCount.textContent = len + ' / 1500 (min 20)';
      charCount.classList.toggle('text-warning', len > 0 && len < 20);
      charCount.classList.toggle('text-danger', len > 1500);
    });
  }

  function renderPreviews() {
    if (!previewsBox) return;
    previewsBox.innerHTML = '';
    pendingFiles.forEach((file, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'review-upload-preview';
      const img = document.createElement('img');
      img.alt = 'Photo ' + (i + 1);
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'review-upload-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', getString('reviewRemovePhoto', 'Remove photo {{count}}').replace('{{count}}', i + 1));
      removeBtn.addEventListener('click', () => {
        pendingFiles.splice(i, 1);
        renderPreviews();
      });
      const reader = new FileReader();
      reader.onload = (ev) => { img.src = ev.target.result; };
      reader.readAsDataURL(file);
      wrap.appendChild(img);
      wrap.appendChild(removeBtn);
      previewsBox.appendChild(wrap);
    });
    const zone = document.querySelector('.review-upload-zone');
    if (zone) zone.classList.toggle('d-none', pendingFiles.length >= MAX_IMAGES);
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      files.forEach(file => {
        if (!ALLOWED.includes(file.type)) {
          if (hint) hint.textContent = getString('reviewInvalidImageType', 'Only JPG, PNG, WebP or GIF images are allowed.');
          return;
        }
        if (file.size > MAX_SIZE) {
          if (hint) hint.textContent = getString('reviewPhotoTooLarge', 'Each photo must be 5MB or smaller.');
          return;
        }
        if (pendingFiles.length >= MAX_IMAGES) {
          if (hint) hint.textContent = getString('reviewMaxPhotos', 'You can upload up to 5 photos.');
          return;
        }
        pendingFiles.push(file);
      });
      fileInput.value = '';
      renderPreviews();
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      if (selectedRating < 1 || selectedRating > 5) {
        e.preventDefault();
        if (hint) hint.textContent = getString('reviewRatingHint', 'Please select a rating between 1 and 5.');
        return;
      }
      const len = commentInput ? commentInput.value.trim().length : 0;
      if (len < 20) {
        e.preventDefault();
        if (hint) hint.textContent = getString('reviewMinLength', 'Please write at least 20 characters.');
        return;
      }
      if (hint) hint.textContent = '';
      if (pendingFiles.length && fileInput) {
        const dt = new DataTransfer();
        pendingFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Review filters, search and load-more (AJAX)
//
// Filter state lives in a single `state` object (the only source of truth).
// Every interaction updates `state`, highlights the active controls, then
// re-fetches page 1 from the API with the current query. Load More re-uses
// the same state so filters/search are preserved while paginating.
// ---------------------------------------------------------------------------
function initReviewFilters() {
  const container = document.getElementById('reviewListContainer');
  const searchInput = document.getElementById('reviewSearchInput');
  const filterBar = document.querySelector('.review-filter-bar');
  const ratingBars = document.querySelectorAll('.review-bar-filter');
  if (!container) return;

  const productId = container.getAttribute('data-product-id');

  const state = {
    page: 1,
    sort: 'recent',
    rating: null,
    hasPhotos: false,
    verified: false,
    search: '',
    total: parseInt(container.getAttribute('data-total') || '0', 10) || 0,
    hasMore: false,
    loading: false,
    requestId: 0
  };

  let listEl = document.getElementById('reviewList');
  let emptyEl = document.getElementById('reviewEmptyState');
  let loadMoreBtn = document.getElementById('reviewLoadMoreBtn');
  let loadMoreWrap = loadMoreBtn ? loadMoreBtn.closest('.review-load-more') : null;

  function ensureListEl() {
    if (listEl) return listEl;
    listEl = document.createElement('div');
    listEl.className = 'review-list';
    listEl.id = 'reviewList';
    container.appendChild(listEl);
    return listEl;
  }

  function ensureEmptyEl() {
    if (emptyEl) return emptyEl;
    emptyEl = document.createElement('div');
    emptyEl.id = 'reviewEmptyState';
    emptyEl.className = 'review-empty';
    emptyEl.innerHTML = '<i class="fa-regular fa-comments"></i><p></p>';
    emptyEl.style.display = 'none';
    container.appendChild(emptyEl);
    return emptyEl;
  }

  function ensureLoadingEl() {
    let el = document.getElementById('reviewLoading');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'reviewLoading';
    el.className = 'review-loading';
    el.innerHTML = '<span class="review-loading-spinner" aria-hidden="true"></span><span>' + getString('reviewLoading', 'Loading reviews...') + '</span>';
    el.style.display = 'none';
    container.appendChild(el);
    return el;
  }

  function ensureStatusEl() {
    let el = document.getElementById('reviewStatusRegion');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'reviewStatusRegion';
    el.className = 'visually-hidden';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    container.appendChild(el);
    return el;
  }

  function announce(message) {
    ensureStatusEl().textContent = message;
  }

  function buildQuery(page) {
    const q = new URLSearchParams();
    q.set('page', page);
    q.set('sort', state.sort || 'recent');
    if (state.rating) q.set('rating', state.rating);
    if (state.hasPhotos) q.set('hasPhotos', '1');
    if (state.verified) q.set('verified', '1');
    if (state.search) q.set('search', state.search);
    return q.toString();
  }

  function hasActiveFilter() {
    return state.sort !== 'recent' || state.rating !== null || state.hasPhotos || state.verified || state.search !== '';
  }

  function updateActiveUI() {
    if (filterBar) {
      filterBar.querySelectorAll('.review-chip[data-sort]').forEach(chip => {
        const active = chip.getAttribute('data-sort') === state.sort;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      filterBar.querySelectorAll('.review-chip[data-has-photos]').forEach(chip => {
        chip.classList.toggle('active', state.hasPhotos);
        chip.setAttribute('aria-pressed', state.hasPhotos ? 'true' : 'false');
      });
      filterBar.querySelectorAll('.review-chip[data-verified]').forEach(chip => {
        chip.classList.toggle('active', state.verified);
        chip.setAttribute('aria-pressed', state.verified ? 'true' : 'false');
      });
    }
    ratingBars.forEach(bar => {
      const active = String(state.rating) === bar.getAttribute('data-rating');
      bar.classList.toggle('active', active);
      bar.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setLoading(on, append) {
    state.loading = on;
    container.setAttribute('aria-busy', on ? 'true' : 'false');

    if (on && append && loadMoreBtn) {
      loadMoreBtn.dataset.label = loadMoreBtn.innerHTML;
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = '<span class="review-loading-spinner" aria-hidden="true"></span> ' + getString('reviewLoadingMore', 'Loading...');
    } else {
      const loadingEl = ensureLoadingEl();
      loadingEl.style.display = on ? '' : 'none';
      if (on) {
        if (listEl) listEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';
        if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      }
    }

    if (!on && loadMoreBtn && loadMoreBtn.dataset.label) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = loadMoreBtn.dataset.label;
      delete loadMoreBtn.dataset.label;
    }

    if (filterBar) {
      filterBar.querySelectorAll('.review-chip').forEach(chip => { chip.disabled = on; });
    }
    ratingBars.forEach(bar => { bar.disabled = on; });
    if (loadMoreBtn) loadMoreBtn.disabled = on;
  }

  function renderResults(data) {
    state.page = data.page;
    state.hasMore = data.hasMore;
    state.total = data.total;

    const list = ensureListEl();
    const empty = ensureEmptyEl();

    list.innerHTML = data.html;
    list.style.display = data.total > 0 ? '' : 'none';
    empty.querySelector('p').textContent = hasActiveFilter()
      ? getString('reviewNoMatch', 'No reviews match your filters.')
      : getString('reviewEmpty', 'No reviews yet. Be the first to review this product!');
    empty.style.display = data.total > 0 ? 'none' : '';
    if (loadMoreWrap) loadMoreWrap.style.display = (data.total > 0 && data.hasMore) ? '' : 'none';

    if (data.total > 0) {
      initReviewHelpful();
      initReviewReport();
      initReviewLightbox();
      announce(data.total + (data.total === 1 ? ' review found.' : ' reviews found.'));
    } else {
      announce(getString('reviewNoMatch', 'No reviews match your filters.'));
    }
  }

  function renderAppend(data) {
    state.page = data.page;
    state.hasMore = data.hasMore;
    state.total = data.total;
    ensureListEl().insertAdjacentHTML('beforeend', data.html);
    if (loadMoreWrap) loadMoreWrap.style.display = data.hasMore ? '' : 'none';
    initReviewHelpful();
    initReviewReport();
    initReviewLightbox();
  }

  async function fetchReviews(page, append) {
    const requestId = ++state.requestId;
    setLoading(true, append);
    try {
      const res = await fetch('/api/reviews/product/' + productId + '?' + buildQuery(page));
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      if (requestId !== state.requestId) return;
      if (append) renderAppend(data);
      else renderResults(data);
    } catch (err) {
      if (requestId !== state.requestId) return;
      console.error('Review load error:', err);
      const list = ensureListEl();
      const empty = ensureEmptyEl();
      list.innerHTML = '';
      list.style.display = 'none';
      empty.querySelector('p').textContent = getString('reviewLoadFailed', 'Failed to load reviews. Please try again.');
      empty.style.display = '';
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      announce(getString('reviewLoadFailed', 'Failed to load reviews. Please try again.'));
    } finally {
      if (requestId === state.requestId) setLoading(false, append);
    }
  }

  function applyFilter() {
    updateActiveUI();
    fetchReviews(1, false);
  }

  if (filterBar) {
    filterBar.querySelectorAll('.review-chip[data-sort]').forEach(chip => {
      chip.addEventListener('click', () => {
        if (state.loading) return;
        state.sort = chip.getAttribute('data-sort');
        applyFilter();
      });
    });
    filterBar.querySelectorAll('.review-chip[data-has-photos]').forEach(chip => {
      chip.addEventListener('click', () => {
        if (state.loading) return;
        state.hasPhotos = !state.hasPhotos;
        applyFilter();
      });
    });
    filterBar.querySelectorAll('.review-chip[data-verified]').forEach(chip => {
      chip.addEventListener('click', () => {
        if (state.loading) return;
        state.verified = !state.verified;
        applyFilter();
      });
    });
  }

  ratingBars.forEach(bar => {
    bar.addEventListener('click', () => {
      if (state.loading) return;
      state.rating = state.rating === bar.getAttribute('data-rating') ? null : bar.getAttribute('data-rating');
      applyFilter();
    });
  });

  if (searchInput) {
    let debounce = null;
    searchInput.addEventListener('input', () => {
      if (state.loading) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.search = searchInput.value.trim();
        applyFilter();
      }, 400);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounce);
        state.search = searchInput.value.trim();
        applyFilter();
      }
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (state.loading) return;
      fetchReviews(state.page + 1, true);
    });
  }

  updateActiveUI();
}

// ---------------------------------------------------------------------------
// Helpful vote (AJAX toggle)
// ---------------------------------------------------------------------------
function initReviewHelpful() {
  document.querySelectorAll('.helpful-btn').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const reviewId = btn.getAttribute('data-review-id');
      const csrf = btn.getAttribute('data-csrf');
      try {
        const res = await fetch('/api/reviews/' + reviewId + '/helpful', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/auth/login';
            return;
          }
          throw new Error(data.error || getString('reviewRequestFailed', 'Request failed'));
        }
        btn.classList.toggle('active', data.helpful);
        const countEl = btn.querySelector('.helpful-count');
        if (countEl) {
          countEl.textContent = data.count;
          countEl.setAttribute('data-count', data.count);
        }
      } catch (err) {
        console.error('Helpful vote error:', err);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Report review (AJAX)
// ---------------------------------------------------------------------------
function initReviewReport() {
  const modalEl = document.getElementById('reportReviewModal');
  if (!modalEl) return;
  const modal = new bootstrap.Modal(modalEl);
  const submitBtn = document.getElementById('reportSubmitBtn');
  const errorEl = document.getElementById('reportFormError');
  let currentReviewId = null;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.report-btn');
    if (!btn) return;
    currentReviewId = btn.getAttribute('data-review-id');
    modalEl.querySelectorAll('input[name="reportReason"]').forEach(r => { r.checked = false; });
    if (errorEl) errorEl.textContent = '';
    modal.show();
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!currentReviewId) return;
      const reason = modalEl.querySelector('input[name="reportReason"]:checked');
      if (!reason) {
        if (errorEl) errorEl.textContent = getString('reviewSelectReason', 'Please select a reason.');
        return;
      }
      const btn = document.querySelector('.report-btn[data-review-id="' + currentReviewId + '"]');
      const csrf = btn ? btn.getAttribute('data-csrf') : '';
      try {
        const res = await fetch('/api/reviews/' + currentReviewId + '/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ reason: reason.value })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/auth/login';
            return;
          }
          throw new Error(data.error || getString('reviewRequestFailed', 'Request failed'));
        }
        modal.hide();
        const reportBtn = document.querySelector('.report-btn[data-review-id="' + currentReviewId + '"]');
        if (reportBtn) {
          reportBtn.disabled = true;
          reportBtn.innerHTML = '<i class="fa-solid fa-check"></i> ' + getString('reviewReported', 'Reported');
        }
        currentReviewId = null;
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Review photo lightbox
// ---------------------------------------------------------------------------
function initReviewLightbox() {
  const overlay = document.getElementById('reviewLightbox');
  if (!overlay) return;

  const img = document.getElementById('reviewLightboxImage');
  const counter = document.getElementById('reviewLightboxCounter');
  const closeBtn = document.getElementById('reviewLightboxClose');
  const prevBtn = document.getElementById('reviewLightboxPrev');
  const nextBtn = document.getElementById('reviewLightboxNext');
  let images = [];
  let currentIndex = 0;

  function openAt(index) {
    if (!images.length) return;
    currentIndex = Math.max(0, Math.min(index, images.length - 1));
    img.setAttribute('src', images[currentIndex]);
    counter.textContent = (currentIndex + 1) + ' / ' + images.length;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
    nextBtn.style.display = currentIndex < images.length - 1 ? 'flex' : 'none';
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const galleryThumb = e.target.closest('.review-gallery-thumb');
    if (galleryThumb) {
      images = Array.from(document.querySelectorAll('.review-gallery-thumb')).map(t => t.getAttribute('data-full')).filter(Boolean);
      openAt(parseInt(galleryThumb.getAttribute('data-gallery-index') || '0', 10));
      return;
    }
    const imageBtn = e.target.closest('.review-image-btn');
    if (imageBtn) {
      images = Array.from(document.querySelectorAll('.review-image-btn')).map(b => b.getAttribute('data-full')).filter(Boolean);
      const idx = images.indexOf(imageBtn.getAttribute('data-full'));
      openAt(idx);
    }
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => openAt(currentIndex - 1));
  nextBtn.addEventListener('click', () => openAt(currentIndex + 1));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') openAt(currentIndex - 1);
    if (e.key === 'ArrowRight') openAt(currentIndex + 1);
  });
}
