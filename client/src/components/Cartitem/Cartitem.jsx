import { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import './CartItem.css';

/* ── Helpers ─────────────────────────────────────────────────── */

const formatPrice = (value, symbol = '₹') =>
  `${symbol}${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

/* ── Component ───────────────────────────────────────────────── */

/**
 * CartItem
 *
 * Props:
 *   item     {object}  — cart item (product + quantity)
 *   compact  {boolean} — smaller variant for order summaries
 *   readOnly {boolean} — disable qty controls (e.g. on checkout confirmation)
 */
export default function CartItem({ item, compact = false, readOnly = false }) {
  const navigate                              = useNavigate();
  const { updateQuantity, removeFromCart }    = useContext(CartContext);

  const productId = item.product || item._id;

  const [isRemoving, setIsRemoving]           = useState(false);
  const [qtyBump,    setQtyBump]              = useState(false);
  const [priceFlash, setPriceFlash]           = useState(false);
  const prevQtyRef                            = useRef(item.quantity);

  // ── Animate qty and price when quantity changes ───────────────
  useEffect(() => {
    if (item.quantity !== prevQtyRef.current) {
      setQtyBump(true);
      setPriceFlash(true);
      const t1 = setTimeout(() => setQtyBump(false),    300);
      const t2 = setTimeout(() => setPriceFlash(false), 450);
      prevQtyRef.current = item.quantity;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [item.quantity]);

  // ── Increase ──────────────────────────────────────────────────
  const handleIncrease = useCallback(() => {
    updateQuantity(productId, item.quantity + 1);
  }, [updateQuantity, productId, item.quantity]);

  // ── Decrease ──────────────────────────────────────────────────
  const handleDecrease = useCallback(() => {
    if (item.quantity <= 1) {
      handleRemove();
    } else {
      updateQuantity(productId, item.quantity - 1);
    }
  }, [updateQuantity, productId, item.quantity]);

  // ── Remove with exit animation ────────────────────────────────
  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => removeFromCart(productId), 270);
  }, [removeFromCart, productId]);

  // ── Navigate to product detail ────────────────────────────────
  const handleNameClick = () => navigate(`/products/${productId}`);

  const subtotal = item.price * item.quantity;

  return (
    <article
      className={[
        'cart-item',
        compact    ? 'cart-item--compact'  : '',
        isRemoving ? 'cart-item--removing' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Cart item: ${item.name}`}
    >

      {/* ── Product image ─────────────────────────────────── */}
      <div className="cart-item__image-wrap">
        <img
          src={item.image || '/placeholder-food.jpg'}
          alt={item.name}
          className="cart-item__image"
          loading="lazy"
          onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
        />

        {/* Veg indicator */}
        {typeof item.isVeg !== 'undefined' && (
          <div
            className={`cart-item__veg-dot cart-item__veg-dot--${item.isVeg ? 'veg' : 'nonveg'}`}
            title={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
          />
        )}
      </div>

      {/* ── Product info ──────────────────────────────────── */}
      <div className="cart-item__info">
        {item.category && (
          <span className="cart-item__category">{item.category}</span>
        )}

        <h4
          className="cart-item__name"
          onClick={handleNameClick}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNameClick(); }}
          aria-label={`View ${item.name} details`}
        >
          {item.name}
        </h4>

        <span className="cart-item__unit-price">
          <strong>{formatPrice(item.price)}</strong> each
        </span>
      </div>

      {/* ── Quantity stepper ──────────────────────────────── */}
      {!readOnly ? (
        <div
          className="cart-item__qty"
          role="group"
          aria-label={`Quantity for ${item.name}`}
        >
          <button
            className="cart-item__qty-btn"
            onClick={handleDecrease}
            aria-label={item.quantity <= 1 ? `Remove ${item.name}` : 'Decrease quantity'}
            title={item.quantity <= 1 ? 'Remove item' : 'Decrease'}
          >
            {item.quantity <= 1 ? '🗑' : '−'}
          </button>

          <span
            className={[
              'cart-item__qty-value',
              qtyBump ? 'cart-item__qty-value--bump' : '',
            ].filter(Boolean).join(' ')}
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Quantity: ${item.quantity}`}
          >
            {item.quantity}
          </span>


          

          <button
            className="cart-item__qty-btn"
            onClick={handleIncrease}
            aria-label="Increase quantity"
            title="Increase"
          >
            +
          </button>
        </div>
      ) : (
        /* Read-only quantity display */
        <div
          className="cart-item__qty"
          aria-label={`Quantity: ${item.quantity}`}
          style={{ padding: '0 0.75rem', cursor: 'default' }}
        >
          <span className="cart-item__qty-value">× {item.quantity}</span>
        </div>
      )}

      {/* ── Subtotal ──────────────────────────────────────── */}
      <div className="cart-item__subtotal" aria-label={`Subtotal: ${formatPrice(subtotal)}`}>
        {!compact && (
          <span className="cart-item__subtotal-label">Subtotal</span>
        )}
        <span
          className={[
            'cart-item__subtotal-value',
            priceFlash ? 'cart-item__subtotal-value--changed' : '',
          ].filter(Boolean).join(' ')}
          aria-live="polite"
          aria-atomic="true"
        >
          {formatPrice(subtotal)}
        </span>
      </div>

      {/* ── Remove button ─────────────────────────────────── */}
      {!readOnly && (
        <button
          className="cart-item__remove"
          onClick={handleRemove}
          aria-label={`Remove ${item.name} from cart`}
          title="Remove item"
        >
          ✕
        </button>
      )}
    </article>
  );
}