import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Star, RefreshCw, CheckCircle, Search, Frown, Trash2 } from 'lucide-react';
import './ManageReviews.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/* ── Stars Display Component ────────────────────────────────── */
function Stars({ rating = 0 }) {
  return (
    <span className="mr-stars" aria-label={`${rating} out of 5 stars`} style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star 
          key={s} 
          size={16} 
          color={rating >= s ? '#f5a623' : 'rgba(255, 255, 255, 0.15)'} 
          fill={rating >= s ? '#f5a623' : 'transparent'} 
        />
      ))}
    </span>
  );
}

/* ── Delete Confirmation Modal ────────────────────────────── */
function DeleteModal({ review, onConfirm, onClose, loading }) {
  return (
    <div className="mr-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm review deletion" onClick={onClose}>
      <div className="mr-modal" onClick={(e) => e.stopPropagation()}>
        <span className="mr-modal__icon" aria-hidden="true"><AlertTriangle size={32} /></span>
        <h2 className="mr-modal__title">Delete this review?</h2>
        <p className="mr-modal__desc">
          Are you sure you want to delete the review by <strong>{review.name}</strong> for product <strong>{review.productName}</strong>? This action cannot be undone.
        </p>
        <div className="mr-modal__actions">
          <button className="mr-modal__btn mr-modal__btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="mr-modal__btn mr-modal__btn--confirm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MANAGE REVIEWS PAGE COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function ManageReviews({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ text: '', type: '' });

  // Filtering and searching states
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 3500);
  };

  /* ── Fetch Reviews ────────────────────────────────────────── */
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/products/reviews/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch reviews');
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ── Delete Review ────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/products/${deleteTarget.productId}/reviews/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete review');

      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      showToast('Review deleted successfully!');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || 'Could not delete review', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filter / Search logic ────────────────────────────────── */
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.comment || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.productName || '').toLowerCase().includes(search.toLowerCase());

    const matchesRating =
      ratingFilter === 'all' ||
      (ratingFilter === 'positive' && r.rating >= 4) ||
      (ratingFilter === 'negative' && r.rating <= 2) ||
      r.rating === Number(ratingFilter);

    return matchesSearch && matchesRating;
  });

  /* ── Stats Calculations ────────────────────────────────────── */
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) : '0.0';
  const positiveCount = reviews.filter((r) => r.rating >= 4).length;
  const negativeCount = reviews.filter((r) => r.rating <= 2).length;

  return (
    <div className="manage-reviews">
      {/* ── Header ────────────────────────────────────── */}
      <header className="mr-header">
        <div className="mr-header__inner">
          <div>
            <h1 className="mr-header__title">
              <span aria-hidden="true"><Star size={32} /></span> Manage Reviews
            </h1>
            <p className="mr-header__subtitle">
              Monitor, filter, and moderate customer reviews across all food items.
            </p>
          </div>
          <div className="mr-header__actions">
            <button
              className="mr-btn mr-btn--secondary"
              onClick={fetchReviews}
              aria-label="Refresh reviews list"
            >
              <span aria-hidden="true"><RefreshCw size={16} /></span> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="mr-body">
        {/* Toast notification */}
        {toast.text && (
          <div
            className={`mr-toast mr-toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            <span aria-hidden="true">
              {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            </span>
            {toast.text}
          </div>
        )}

        {/* ── Quick Stats ───────────────────────────────── */}
        <div className="mr-stats" role="region" aria-label="Review statistics">
          {[
            { label: 'Total Reviews', val: totalReviews, sub: 'from customers' },
            { label: 'Avg Rating', val: `${averageRating} ★`, sub: 'across all items' },
            { label: 'Positive', val: positiveCount, sub: '4 & 5 stars' },
            { label: 'Negative', val: negativeCount, sub: '1 & 2 stars' },
          ].map((s) => (
            <div key={s.label} className="mr-stat-cell">
              <span className="mr-stat-cell__label">{s.label}</span>
              <span className="mr-stat-cell__val">{s.val}</span>
              <span className="mr-stat-cell__sub">{s.sub}</span>
            </div>
          ))}
        </div>

        {/* ── Toolbar ─────────────────────────────────────── */}
        <div className="mr-toolbar">
          <div className="mr-search">
            <input
              type="search"
              className="mr-search__input"
              placeholder="Search reviewer, comment, or product name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search reviews"
            />
            <span className="mr-search__icon" aria-hidden="true"><Search size={18} /></span>
          </div>

          <select
            className="mr-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            aria-label="Filter by rating"
          >
            <option value="all">All Ratings</option>
            <option value="positive">Positive (4+ ★)</option>
            <option value="negative">Negative (2- ★)</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {/* ── Grid/List ──────────────────────────────────── */}
        {loading ? (
          <div className="mr-loading-container">
            <div className="mr-spinner" aria-hidden="true"></div>
            <p>Loading reviews…</p>
          </div>
        ) : error ? (
          <div className="mr-empty">
            <span className="mr-empty__icon"><Frown size={48} /></span>
            <p className="mr-empty__title">Failed to load reviews</p>
            <p className="mr-empty__desc">{error}</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="mr-empty">
            <span className="mr-empty__icon"><Star size={48} /></span>
            <p className="mr-empty__title">No reviews found</p>
            <p className="mr-empty__desc">
              {search || ratingFilter !== 'all' ? 'Try adjusting your search filters.' : 'Customers have not posted any reviews yet.'}
            </p>
          </div>
        ) : (
          <div className="mr-reviews-grid">
            {filteredReviews.map((review) => (
              <article key={review._id} className="mr-review-card">
                <div className="mr-review-card__header">
                  <div className="mr-review-card__user">
                    <div className="mr-review-card__avatar" aria-hidden="true">
                      {review.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="mr-review-card__name">{review.name}</h3>
                      <span className="mr-review-card__date">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="mr-review-card__actions">
                    <button
                      className="mr-delete-btn"
                      onClick={() => setDeleteTarget(review)}
                      aria-label={`Delete review by ${review.name} for ${review.productName}`}
                      title="Delete Review"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mr-review-card__content">
                  <div className="mr-review-card__meta">
                    <Stars rating={review.rating} />
                    <span className="mr-review-card__product">
                      on <strong>{review.productName}</strong>
                    </span>
                  </div>
                  <p className="mr-review-card__comment">“{review.comment}”</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete Modal ─────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          review={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
