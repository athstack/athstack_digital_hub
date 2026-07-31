document.addEventListener('DOMContentLoaded', () => {
  initReviewModal();
  initReviewEditForm();
  initReviewFilters();
  initReviewHelpful();
  initReviewReport();
  initReviewLightbox();
});

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
          errors.push('Only JPG, PNG, WebP or GIF images are allowed.');
          return;
        }
        if (file.size > MAX_SIZE) {
          errors.push('Each photo must be 5MB or smaller.');
          return;
        }
        if (pendingFiles.length >= MAX_IMAGES) {
          errors.push('You can upload up to 5 photos.');
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
      removeBtn.setAttribute('aria-label', 'Remove photo ' + (i + 1));
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
      if (hint) hint.textContent = 'Please select a rating between 1 and 5.';
      return;
    }
    const len = commentInput ? commentInput.value.trim().length : 0;
    if (len < 20) {
      e.preventDefault();
      if (hint) hint.textContent = 'Please write at least 20 characters.';
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
      removeBtn.setAttribute('aria-label', 'Remove photo ' + (i + 1));
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
          if (hint) hint.textContent = 'Only JPG, PNG, WebP or GIF images are allowed.';
          return;
        }
        if (file.size > MAX_SIZE) {
          if (hint) hint.textContent = 'Each photo must be 5MB or smaller.';
          return;
        }
        if (pendingFiles.length >= MAX_IMAGES) {
          if (hint) hint.textContent = 'You can upload up to 5 photos.';
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
        if (hint) hint.textContent = 'Please select a rating between 1 and 5.';
        return;
      }
      const len = commentInput ? commentInput.value.trim().length : 0;
      if (len < 20) {
        e.preventDefault();
        if (hint) hint.textContent = 'Please write at least 20 characters.';
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
// ---------------------------------------------------------------------------
function initReviewFilters() {
  const container = document.getElementById('reviewListContainer');
  const list = document.getElementById('reviewList');
  const loadMoreBtn = document.getElementById('reviewLoadMoreBtn');
  const emptyState = document.getElementById('reviewEmptyState');
  const searchInput = document.getElementById('reviewSearchInput');
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
    hasMore: !!loadMoreBtn
  };

  function buildQuery(page) {
    const q = new URLSearchParams();
    q.set('page', page);
    if (state.sort) q.set('sort', state.sort);
    if (state.rating) q.set('rating', state.rating);
    if (state.hasPhotos) q.set('hasPhotos', '1');
    if (state.verified) q.set('verified', '1');
    if (state.search) q.set('search', state.search);
    return q.toString();
  }

  function setChips() {
    container.querySelectorAll('.review-chip').forEach(chip => {
      if (chip.hasAttribute('data-sort')) {
        chip.classList.toggle('active', chip.getAttribute('data-sort') === state.sort);
      } else if (chip.hasAttribute('data-has-photos')) {
        chip.classList.toggle('active', state.hasPhotos);
      } else if (chip.hasAttribute('data-verified')) {
        chip.classList.toggle('active', state.verified);
      }
    });
    container.querySelectorAll('[data-rating]').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-rating') === String(state.rating));
    });
  }

  async function load(page, append) {
    try {
      const res = await fetch('/api/reviews/product/' + productId + '?' + buildQuery(page));
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      state.page = data.page;
      state.hasMore = data.hasMore;

      if (append && list) {
        list.insertAdjacentHTML('beforeend', data.html);
      } else {
        if (data.total > 0) {
          if (!list) {
            const wrapper = document.createElement('div');
            wrapper.className = 'review-list';
            wrapper.id = 'reviewList';
            wrapper.innerHTML = data.html;
            container.insertBefore(wrapper, loadMoreBtn ? loadMoreBtn.closest('.review-load-more') : null);
            initReviewHelpful();
            initReviewReport();
            initReviewLightbox();
          } else {
            list.innerHTML = data.html;
            initReviewHelpful();
            initReviewReport();
            initReviewLightbox();
          }
          if (loadMoreBtn) loadMoreBtn.closest('.review-load-more').style.display = data.hasMore ? '' : 'none';
          if (emptyState) emptyState.style.display = 'none';
        } else {
          if (list) list.innerHTML = '';
          if (loadMoreBtn) loadMoreBtn.closest('.review-load-more').style.display = 'none';
          if (emptyState) {
            emptyState.style.display = '';
            emptyState.querySelector('p').textContent = state.search
              ? 'No reviews match your search.'
              : 'No reviews found for this filter.';
          }
        }
      }
    } catch (err) {
      console.error('Review load error:', err);
    }
  }

  container.querySelectorAll('.review-chip[data-sort]').forEach(chip => {
    chip.addEventListener('click', () => {
      state.sort = chip.getAttribute('data-sort');
      setChips();
      load(1, false);
    });
  });

  container.querySelectorAll('.review-chip[data-has-photos]').forEach(chip => {
    chip.addEventListener('click', () => {
      state.hasPhotos = !state.hasPhotos;
      setChips();
      load(1, false);
    });
  });

  container.querySelectorAll('.review-chip[data-verified]').forEach(chip => {
    chip.addEventListener('click', () => {
      state.verified = !state.verified;
      setChips();
      load(1, false);
    });
  });

  container.querySelectorAll('.review-bar-filter').forEach(bar => {
    bar.addEventListener('click', () => {
      state.rating = state.rating === bar.getAttribute('data-rating') ? null : bar.getAttribute('data-rating');
      setChips();
      load(1, false);
    });
  });

  if (searchInput) {
    let debounce = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.search = searchInput.value.trim();
        load(1, false);
      }, 400);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => load(state.page + 1, true));
  }
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
          throw new Error(data.error || 'Request failed');
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
        if (errorEl) errorEl.textContent = 'Please select a reason.';
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
          throw new Error(data.error || 'Request failed');
        }
        modal.hide();
        const reportBtn = document.querySelector('.report-btn[data-review-id="' + currentReviewId + '"]');
        if (reportBtn) {
          reportBtn.disabled = true;
          reportBtn.innerHTML = '<i class="fa-solid fa-check"></i> Reported';
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
