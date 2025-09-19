// main.js (complete)
// ------------------
// Contains small visibility perf trick, plus review UI + API integration.

// Perf: pause background animation when tab hidden (safe snippet)
(function () {
  const docEl = document.documentElement;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      docEl.style.setProperty('--bg-anim-pause', 'paused');
    } else {
      docEl.style.removeProperty('--bg-anim-pause');
    }
  });
})();

// Reviews UI logic (self-contained)
(function () {
  // escape HTML to prevent injection
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
  }

  // Render reviews into container
  function renderReviewsList(container, reviews) {
    container.innerHTML = '';
    if (!reviews || reviews.length === 0) {
      const p = document.createElement('p');
      p.className = 'no-reviews';
      p.textContent = 'No reviews yet. Be the first!';
      container.appendChild(p);
      return;
    }

    reviews.forEach(r => {
      const card = document.createElement('div');
      card.className = 'review-card';

      const sentimentClass = r.sentiment === 'positive' ? 'sent-positive' :
                             r.sentiment === 'negative' ? 'sent-negative' : 'sent-neutral';

      const metaHtml = `<div class="review-meta">
          <span class="review-sent ${sentimentClass}">${r.sentiment || 'neutral'}</span>
          ${r.rating ? `<span class="review-rating-display">★ ${r.rating}</span>` : ''}
        </div>`;

      const textHtml = `<div class="review-text-display">${escapeHtml(r.text)}</div>`;

      card.innerHTML = metaHtml + textHtml;
      container.appendChild(card);
    });
  }

  // Create and attach review form to root element inside card
  function createReviewForm(expId, rootEl) {
    rootEl.innerHTML = `
      <div class="review-form" data-exp="${expId}">
        <textarea class="review-text" placeholder="Write your review..." rows="3"></textarea>
        <div class="review-actions">
          <input type="number" class="review-rating" min="1" max="5" placeholder="Rating (1-5)" />
          <button class="review-submit">Submit Review</button>
        </div>
        <div class="review-feedback" aria-live="polite"></div>
        <div class="reviews-list"></div>
      </div>
    `;
    const formEl = rootEl.querySelector('.review-form');
    const submitBtn = formEl.querySelector('.review-submit');
    const feedbackEl = formEl.querySelector('.review-feedback');
    const reviewsListEl = formEl.querySelector('.reviews-list');
    const textEl = formEl.querySelector('.review-text');
    const ratingEl = formEl.querySelector('.review-rating');

    // Load existing reviews
    fetch(`/api/experiences/${expId}/reviews`)
      .then(r => r.json())
      .then(d => {
        if (d.reviews) renderReviewsList(reviewsListEl, d.reviews);
      })
      .catch(err => console.warn('Could not load reviews', err));

    // Submit handler
    submitBtn.addEventListener('click', async () => {
      const text = (textEl.value || '').trim();
      const rating = ratingEl.value ? Number(ratingEl.value) : null;

      if (!text) {
        feedbackEl.textContent = 'Please write a review before submitting.';
        return;
      }

      submitBtn.disabled = true;
      feedbackEl.textContent = 'Submitting...';

      try {
        const res = await fetch(`/api/experiences/${expId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, rating })
        });
        const d = await res.json();
        if (!res.ok) {
          feedbackEl.textContent = d.error || 'Failed to submit review';
          return;
        }
        // Clear inputs and show updated reviews (server returns updated list)
        textEl.value = '';
        ratingEl.value = '';
        feedbackEl.textContent = 'Thanks — your review was added.';
        if (d.reviews) renderReviewsList(reviewsListEl, d.reviews);
      } catch (err) {
        console.error(err);
        feedbackEl.textContent = 'Network error';
      } finally {
        submitBtn.disabled = false;
        setTimeout(() => { feedbackEl.textContent = ''; }, 2500);
      }
    });
  }

  // Attach forms to each experience card on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.experience-card');
    cards.forEach(card => {
      const id = card.getAttribute('data-exp-id');
      const root = card.querySelector('.reviews-root');
      if (!id || !root) return;
      createReviewForm(id, root);
    });
  });
})();
