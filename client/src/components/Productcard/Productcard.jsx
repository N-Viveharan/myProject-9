import { useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import './ProductCard.css';

/* ── Helpers ──────────────────────────────────────────────────── */

/** Render 5 star icons based on a 0–5 rating */
function StarRating({ rating = 0 }) {
  return (
    <span className="product-card__stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating >= star;
        const half   = !filled && rating >= star - 0.5;
        return (
          <span
            key={star}
            className={
              filled ? 'product-card__star--filled' :
              half   ? 'product-card__star--half'   :
                       'product-card__star--empty'
            }
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

/** Format currency — defaults to ₹ */
function formatPrice(price, symbol = '₹') {
  return { symbol, amount: Number(price).toLocaleString('en-IN') };
}

/* ── Component ───────────────────────────────────────────────── */
export default function ProductCard({ product, skeleton = false }) {
  const navigate                          = useNavigate();
  const { addToCart, removeFromCart,
          updateQuantity, cartItems }      = useContext(CartContext);
  const { user }                          = useContext(AuthContext);

  const [wishlisted, setWishlisted]       = useState(false);
  const [addAnim,    setAddAnim]          = useState(false);

  // ── Skeleton placeholder ───────────────────────────────────────
  if (skeleton) {
    return (
      <article className="product-card product-card--skeleton" aria-hidden="true">
        <div className="product-card__image-wrap" />
        <div className="product-card__body">
          <div className="product-card__category" style={{ width: '60px', height: '16px' }} />
          <div className="product-card__name"     style={{ height: '40px' }} />
          <div className="product-card__desc"     style={{ height: '32px' }} />
          <div className="product-card__meta"     style={{ height: '18px' }} />
          <div className="product-card__footer"   style={{ height: '36px', marginTop: '0.75rem' }} />
        </div>
      </article>
    );
  }

  const {
    _id,
    name,
    description,
    price,
    category,
    image,
    rating      = 0,
    numReviews  = 0,
    isAvailable = true,
    isFeatured  = false,
    isVeg       = false,
    preparationTime = 20,
  } = product;

  // Cart quantity for this product
  const cartItem    = cartItems.find((i) => i.product === _id || i._id === _id);
  const inCartQty   = cartItem?.quantity ?? 0;
  const isInCart    = inCartQty > 0;

  const { symbol, amount } = formatPrice(price);

  // ── Handlers ─────────────────────────────────────────────────

  const handleCardClick = (e) => {
    // Don't navigate if clicking interactive elements
    if (e.target.closest('button')) return;
    navigate(`/products/${_id}`);
  };

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    addToCart({ ...product, product: _id });
    setAddAnim(true);
    setTimeout(() => setAddAnim(false), 400);
  }, [addToCart, product, _id, user, navigate]);

  const handleIncrease = useCallback((e) => {
    e.stopPropagation();
    updateQuantity(_id, inCartQty + 1);
  }, [updateQuantity, _id, inCartQty]);

  const handleDecrease = useCallback((e) => {
    e.stopPropagation();
    if (inCartQty <= 1) {
      removeFromCart(_id);
    } else {
      updateQuantity(_id, inCartQty - 1);
    }
  }, [updateQuantity, removeFromCart, _id, inCartQty]);

  const handleWishlist = useCallback((e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    setWishlisted((prev) => !prev);
  }, [user, navigate]);

  return (
    <article
      className={`product-card${!isAvailable ? ' product-card--unavailable' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${name}`}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/products/${_id}`); }}
    >
      {/* ── Image ────────────────────────────────────────────── */}
      <div className="product-card__image-wrap">
        <img
          src={image || '/placeholder-food.jpg'}
          alt={name}
          className="product-card__image"
          loading="lazy"
          onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
        />

        {/* Veg / Non-veg indicator */}
        <div
          className={`product-card__veg-badge product-card__veg-badge--${isVeg ? 'veg' : 'nonveg'}`}
          title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
          aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
        >
          <span className="product-card__veg-dot" />
        </div>

        {/* Wishlist */}
        <button
          className={`product-card__wishlist${wishlisted ? ' product-card__wishlist--active' : ''}`}
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
        >
          {wishlisted ? '❤️' : '🤍'}
        </button>

        {/* Featured ribbon */}
        {isFeatured && (
          <div className="product-card__ribbon" aria-label="Featured item">
            ⭐ Featured
          </div>
        )}

        {/* Unavailable overlay */}
        {!isAvailable && (
          <div className="product-card__overlay">
            <span className="product-card__overlay-text">Currently Unavailable</span>
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="product-card__body">

        {/* Category */}
        <span className="product-card__category">{category}</span>

        {/* Name */}
        <h3 className="product-card__name">{name}</h3>

        {/* Description */}
        {description && (
          <p className="product-card__desc">{description}</p>
        )}

        {/* Rating + prep time */}
        <div className="product-card__meta">
          {rating > 0 && (
            <>
              <div className="product-card__rating">
                <StarRating rating={rating} />
                <span aria-label={`${rating.toFixed(1)} out of 5`}>
                  {rating.toFixed(1)}
                </span>
                {numReviews > 0 && (
                  <span className="product-card__review-count">
                    ({numReviews})
                  </span>
                )}
              </div>
              <span className="product-card__sep" aria-hidden="true">·</span>
            </>
          )}

          <div className="product-card__prep">
            <span className="product-card__prep-icon" aria-hidden="true">🕐</span>
            <span aria-label={`${preparationTime} minutes preparation time`}>
              {preparationTime} min
            </span>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="product-card__footer">

          {/* Price */}
          <div className="product-card__price-wrap">
            <span className="product-card__price-symbol" aria-hidden="true">
              {symbol}
            </span>
            <span
              className="product-card__price"
              aria-label={`Price: ${symbol}${amount}`}
            >
              {amount}
            </span>
          </div>

          {/* Quantity controls if already in cart, else Add button */}
          {isInCart ? (
            <div
              className="product-card__qty"
              role="group"
              aria-label={`Quantity for ${name}`}
            >
              <button
                className="product-card__qty-btn"
                onClick={handleDecrease}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span
                className="product-card__qty-value"
                aria-live="polite"
                aria-atomic="true"
              >
                {inCartQty}
              </span>
              <button
                className="product-card__qty-btn"
                onClick={handleIncrease}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              className={`product-card__add-btn${isInCart ? ' product-card__add-btn--in-cart' : ''}`}
              onClick={handleAddToCart}
              disabled={!isAvailable}
              aria-label={`Add ${name} to cart`}
            >
              <span className="product-card__add-icon" aria-hidden="true">+</span>
              Add
              {inCartQty > 0 && (
                <span className="product-card__cart-count" aria-hidden="true">
                  {inCartQty}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}