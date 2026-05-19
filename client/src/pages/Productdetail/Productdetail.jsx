import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import Spinner, { SkeletonCards } from '../../components/Spinner/Spinner.jsx';
import './ProductDetail.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/* ── Star picker ─────────────────────────────────────────────── */
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="review-form__stars" role="group" aria-label="Select rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={`review-form__star${(hovered || value) >= s ? ' review-form__star--filled' : ''}`}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
        >★</button>
      ))}
    </div>
  );
}

/* ── Stars display ───────────────────────────────────────────── */
function Stars({ rating = 0, size = '1rem' }) {
  return (
    <span className="detail-info__stars" style={{ fontSize: size }} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1,2,3,4,5].map((s) => (
        <span key={s} style={{ opacity: rating >= s ? 1 : rating >= s - 0.5 ? 0.5 : 0.2 }}>★</span>
      ))}
    </span>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function ProductDetail() {
  const { id }                          = useParams();
  const navigate                        = useNavigate();
  const { addToCart, updateQuantity,
          removeFromCart, getQuantity,
          cartItems }                   = useContext(CartContext);
  const { user, token }                 = useContext(AuthContext);

  const [product,   setProduct]         = useState(null);
  const [related,   setRelated]         = useState([]);
  const [loading,   setLoading]         = useState(true);
  const [error,     setError]           = useState('');
  const [localQty,  setLocalQty]        = useState(1);
  const [wishlisted,setWishlisted]      = useState(false);
  const [addedAnim, setAddedAnim]       = useState(false);

  /* Review form */
  const [reviewRating,  setReviewRating]  = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMsg,     setReviewMsg]     = useState({ text: '', type: '' });

  const inCartQty = getQuantity(id);
  const isInCart  = inCartQty > 0;

  /* ── Fetch product ───────────────────────────────────────── */
  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${API}/products/${id}`),
          fetch(`${API}/products?limit=4`),
        ]);
        const pData = await pRes.json();
        const rData = await rRes.json();
        if (!pRes.ok) throw new Error(pData.message || 'Product not found');
        setProduct(pData.product);
        setRelated((rData.products || []).filter((p) => p._id !== id).slice(0, 4));
      } catch (err) {
        setError(err.message || 'Failed to load product.');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  /* ── Add to cart ─────────────────────────────────────────── */
  const handleAddToCart = useCallback(() => {
    if (!user) { navigate('/login?redirect=' + encodeURIComponent(`/products/${id}`)); return; }
    if (!product?.isAvailable) return;
    addToCart(product, localQty);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 600);
  }, [user, product, localQty, addToCart, navigate, id]);

  /* ── Cart qty controls (when already in cart) ────────────── */
  const handleCartIncrease = () => updateQuantity(id, inCartQty + 1);
  const handleCartDecrease = () => {
    if (inCartQty <= 1) removeFromCart(id);
    else updateQuantity(id, inCartQty - 1);
  };

  /* ── Submit review ───────────────────────────────────────── */
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (reviewRating === 0) { setReviewMsg({ text: 'Please select a star rating.', type: 'error' }); return; }
    if (!reviewComment.trim()) { setReviewMsg({ text: 'Please write a comment.', type: 'error' }); return; }

    setReviewLoading(true);
    setReviewMsg({ text: '', type: '' });
    try {
      const res  = await fetch(`${API}/products/${id}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProduct(data.product);
      setReviewRating(0);
      setReviewComment('');
      setReviewMsg({ text: 'Review submitted — thank you!', type: 'success' });
    } catch (err) {
      setReviewMsg({ text: err.message || 'Failed to submit review.', type: 'error' });
    } finally {
      setReviewLoading(false);
    }
  };

  const alreadyReviewed = product?.reviews?.some(
    (r) => r.user === user?._id || r.user?._id === user?._id
  );

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-page__loading">
          <Spinner variant="food" size="lg" label="Loading dish details…" />
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────── */
  if (error || !product) {
    return (
      <div className="detail-page">
        <div className="detail-page__error">
          <span className="detail-page__error-icon">🍽️</span>
          <h1 className="detail-page__error-title">Dish not found</h1>
          <p className="detail-page__error-desc">{error || 'This item may have been removed.'}</p>
          <Link to="/products" className="detail-page__error-btn">← Back to Menu</Link>
        </div>
      </div>
    );
  }

  const { name, description, price, category, image, rating, numReviews,
          isAvailable, isVeg, isFeatured, preparationTime, calories, reviews = [] } = product;
  const cartSubtotal = price * inCartQty;

  return (
    <div className="detail-page">

      {/* ── Breadcrumb ──────────────────────────────────── */}
      <nav className="detail-page__breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">›</span>
        <Link to="/products">Menu</Link>
        <span aria-hidden="true">›</span>
        {category && <><Link to={`/products?category=${category}`}>{category}</Link><span aria-hidden="true">›</span></>}
        <span>{name}</span>
      </nav>

      {/* ── Main two-column ─────────────────────────────── */}
      <div className="detail-page__main">

        {/* IMAGE */}
        <div className="detail-image">
          <div className="detail-image__main">
            <img
              src={image || '/placeholder-food.jpg'}
              alt={name}
              className="detail-image__img"
              onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
            />

            <div
              className="detail-image__veg-badge"
              title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
              aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            >
              <div className={`detail-image__veg-dot detail-image__veg-dot--${isVeg ? 'veg' : 'nonveg'}`} />
            </div>

            {!isAvailable && (
              <div className="detail-image__unavailable">Currently Unavailable</div>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="detail-info">

          {/* Badges */}
          <div className="detail-info__badges">
            <span className="detail-info__badge detail-info__badge--category">{category}</span>
            {isVeg && <span className="detail-info__badge detail-info__badge--veg">🌱 Veg</span>}
            {isFeatured && <span className="detail-info__badge detail-info__badge--featured">⭐ Featured</span>}
          </div>

          <h1 className="detail-info__name">{name}</h1>

          {/* Rating row */}
          {numReviews > 0 && (
            <div className="detail-info__rating-row">
              <Stars rating={rating} />
              <span className="detail-info__rating-num">{rating.toFixed(1)}</span>
              <a href="#reviews" className="detail-info__review-count">
                ({numReviews} review{numReviews !== 1 ? 's' : ''})
              </a>
            </div>
          )}

          <p className="detail-info__desc">{description}</p>

          {/* Meta chips */}
          <div className="detail-info__meta">
            <span className="detail-info__meta-chip">
              <span aria-hidden="true">🕐</span>
              {preparationTime || 20} min prep
            </span>
            {calories > 0 && (
              <span className="detail-info__meta-chip">
                <span aria-hidden="true">🔥</span>
                {calories} kcal
              </span>
            )}
            <span className="detail-info__meta-chip">
              <span aria-hidden="true">🚴</span>
              Delivery in 30 min
            </span>
          </div>

          {/* Price */}
          <div className="detail-info__price-row">
            <span className="detail-info__price-sym" aria-hidden="true">₹</span>
            <span className="detail-info__price" aria-label={`Price: ₹${price}`}>
              {Number(price).toLocaleString('en-IN')}
            </span>
            <span className="detail-info__delivery">
              {price >= 500
                ? <><strong>Free delivery</strong></>
                : <>+ ₹40 delivery</>
              }
            </span>
          </div>

          {/* ── Add to cart / qty controls ──────────────── */}
          {isInCart ? (
            <>
              <div className="detail-info__cart-sub">
                In your cart · <strong>₹{cartSubtotal.toLocaleString('en-IN')}</strong> total
              </div>
              <div className="detail-info__add-row">
                <div className="detail-info__qty" role="group" aria-label="Cart quantity">
                  <button className="detail-info__qty-btn" onClick={handleCartDecrease}
                    aria-label={inCartQty <= 1 ? 'Remove from cart' : 'Decrease quantity'}>
                    {inCartQty <= 1 ? '🗑' : '−'}
                  </button>
                  <span className="detail-info__qty-val" aria-live="polite">{inCartQty}</span>
                  <button className="detail-info__qty-btn" onClick={handleCartIncrease} aria-label="Increase quantity">+</button>
                </div>

                <button
                  className="detail-info__add-btn detail-info__add-btn--in-cart"
                  onClick={() => navigate('/cart')}
                >
                  <span aria-hidden="true">🛒</span> View Cart
                </button>

                <button
                  className="detail-info__wishlist"
                  onClick={() => setWishlisted((w) => !w)}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={wishlisted}
                >
                  {wishlisted ? '❤️' : '🤍'}
                </button>
              </div>
            </>
          ) : (
            <div className="detail-info__add-row">
              {/* Local qty picker (pre-add) */}
              <div className="detail-info__qty" role="group" aria-label="Select quantity">
                <button className="detail-info__qty-btn"
                  onClick={() => setLocalQty((q) => Math.max(1, q - 1))}
                  disabled={localQty <= 1}
                  aria-label="Decrease">−</button>
                <span className="detail-info__qty-val">{localQty}</span>
                <button className="detail-info__qty-btn"
                  onClick={() => setLocalQty((q) => q + 1)}
                  aria-label="Increase">+</button>
              </div>

              <button
                className={`detail-info__add-btn${addedAnim ? ' detail-info__add-btn--in-cart' : ''}`}
                onClick={handleAddToCart}
                disabled={!isAvailable}
                aria-label={`Add ${localQty} ${name} to cart`}
              >
                <span aria-hidden="true">{addedAnim ? '✓' : '+'}</span>
                {addedAnim ? 'Added!' : `Add${localQty > 1 ? ` ${localQty}` : ''} to Cart`}
              </button>

              <button
                className={`detail-info__wishlist${wishlisted ? ' detail-info__wishlist--active' : ''}`}
                onClick={() => setWishlisted((w) => !w)}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={wishlisted}
              >
                {wishlisted ? '❤️' : '🤍'}
              </button>
            </div>
          )}

          <div className="detail-info__divider" aria-hidden="true" />

          {/* Nutrition info */}
          {calories > 0 && (
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pd-text-muted)', marginBottom: '0.75rem' }}>
                Nutrition (approx per serving)
              </div>
              <div className="detail-info__nutrition">
                <div className="detail-info__nut-row"><span>Calories</span><strong>{calories} kcal</strong></div>
                <div className="detail-info__nut-row"><span>Protein</span><strong>~12g</strong></div>
                <div className="detail-info__nut-row"><span>Carbs</span><strong>~42g</strong></div>
                <div className="detail-info__nut-row"><span>Fat</span><strong>~18g</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky mobile bar ────────────────────────────── */}
      <div className="detail-sticky-bar" aria-label="Quick add to cart">
        <span className="detail-sticky-bar__price">
          ₹{Number(price).toLocaleString('en-IN')}
        </span>
        {isInCart ? (
          <button className="detail-sticky-bar__btn" onClick={() => navigate('/cart')}
            style={{ background: 'var(--pd-green)' }}>
            View Cart ({inCartQty})
          </button>
        ) : (
          <button className="detail-sticky-bar__btn" onClick={handleAddToCart} disabled={!isAvailable}>
            {isAvailable ? 'Add to Cart' : 'Unavailable'}
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          REVIEWS
          ════════════════════════════════════════════════ */}
      <section id="reviews" className="detail-reviews" aria-labelledby="reviews-heading">
        <div className="detail-reviews__header">
          <div>
            <h2 className="detail-reviews__title" id="reviews-heading">Customer Reviews</h2>
            {numReviews > 0 && (
              <div className="detail-reviews__summary">
                <span className="detail-reviews__avg">{rating.toFixed(1)}</span>
                <Stars rating={rating} size="1.1rem" />
                <span>({numReviews} review{numReviews !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
        </div>

        {/* Review list */}
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--pd-text-muted)', fontSize: '0.9rem' }}>
            No reviews yet — be the first!
          </p>
        ) : (
          <div className="detail-reviews__list" role="list">
            {reviews.map((r, i) => (
              <article key={i} className="review-card" role="listitem">
                <div className="review-card__header">
                  <div className="review-card__user">
                    <div className="review-card__avatar" aria-hidden="true">
                      {r.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="review-card__name">{r.name}</div>
                      <div className="review-card__date">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="review-card__stars" aria-label={`${r.rating} stars`}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                </div>
                <p className="review-card__text">{r.comment}</p>
              </article>
            ))}
          </div>
        )}

        {/* Review form */}
        {user && !alreadyReviewed && (
          <form className="review-form" onSubmit={handleReviewSubmit} aria-label="Write a review" style={{ marginTop: '2rem' }}>
            <h3 className="review-form__title">Write a Review</h3>

            <StarPicker value={reviewRating} onChange={setReviewRating} />

            <label htmlFor="review-comment" className="sr-only">Your review</label>
            <textarea
              id="review-comment"
              className="review-form__textarea"
              placeholder="Share your experience with this dish…"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              maxLength={500}
              required
            />

            <button
              type="submit"
              className="review-form__submit"
              disabled={reviewLoading || reviewRating === 0}
            >
              {reviewLoading ? 'Submitting…' : 'Submit Review'}
            </button>

            {reviewMsg.text && (
              <p className={`review-form__msg review-form__msg--${reviewMsg.type}`} role="status">
                {reviewMsg.text}
              </p>
            )}
          </form>
        )}

        {!user && (
          <p style={{ fontSize: '0.875rem', color: 'var(--pd-text-muted)', marginTop: '1.5rem' }}>
            <Link to="/login" style={{ color: 'var(--pd-accent)', fontWeight: 600 }}>Log in</Link> to write a review.
          </p>
        )}
      </section>

      {/* ── Related products ─────────────────────────────── */}
      {related.length > 0 && (
        <section className="detail-related" aria-labelledby="related-heading">
          <div className="detail-related__inner">
            <h2 className="detail-related__title" id="related-heading">You might also like</h2>
            <div className="detail-related__grid">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}