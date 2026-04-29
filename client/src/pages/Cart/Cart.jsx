import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import CartItem from '../../components/CartItem/CartItem.jsx';
import './Cart.css';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const {
    cartItems, clearCart,
    itemsPrice, discount, deliveryPrice, taxPrice, totalPrice, savings,
    amountToFreeShipping, FREE_DELIVERY_ABOVE,
    coupon, couponCode, couponError,
    applyCoupon, removeCoupon,
  } = useContext(CartContext);

  const [couponInput,  setCouponInput]  = useState('');
  const [totalFlash,   setTotalFlash]   = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  /* Flash total on cart change */
  useEffect(() => {
    setTotalFlash(true);
    const t = setTimeout(() => setTotalFlash(false), 400);
    return () => clearTimeout(t);
  }, [totalPrice]);

  /* Free-delivery progress (0-100%) */
  const freeDeliveryPct = Math.min(100, Math.round((itemsPrice / FREE_DELIVERY_ABOVE) * 100));

  const handleApplyCoupon = () => {
    if (couponInput.trim()) applyCoupon(couponInput.trim());
  };

  const handleCheckout = () => {
    if (!user) { navigate('/login?redirect=/checkout'); return; }
    navigate('/checkout');
  };

  /* ── Empty state ─────────────────────────────────────── */
  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <span className="cart-empty__icon" aria-hidden="true">🛒</span>
          <h1 className="cart-empty__title">Your cart is empty</h1>
          <p className="cart-empty__desc">
            Looks like you haven't added anything yet.
            Browse our menu and discover something delicious!
          </p>
          <Link to="/products" className="cart-empty__btn">
            <span aria-hidden="true">🍽️</span> Explore Menu
          </Link>
          <p className="cart-empty__suggestions">
            Popular right now:
            <Link to="/products?category=Burgers">Burgers</Link>
            <Link to="/products?category=Pizza">Pizza</Link>
            <Link to="/products?category=Sushi">Sushi</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="cart-page__header">
        <div className="cart-page__header-inner">
          <div>
            <h1 className="cart-page__title">
              <span aria-hidden="true">🛒</span> Your Cart
            </h1>
            <span className="cart-page__count">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {!confirmClear ? (
            <button
              className="cart-page__clear"
              onClick={() => setConfirmClear(true)}
              aria-label="Clear entire cart"
            >
              Clear cart
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--cart-text-muted)' }}>Are you sure?</span>
              <button
                className="cart-page__clear"
                onClick={() => { clearCart(); setConfirmClear(false); }}
              >
                Yes, clear
              </button>
              <button
                style={{ fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cart-text-muted)' }}
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="cart-page__body">

        {/* ── Items list ────────────────────────────────── */}
        <div className="cart-items">

          {/* Free delivery progress bar */}
          <div className="cart-items__delivery-bar" aria-live="polite">
            {deliveryPrice === 0 ? (
              <p className="cart-items__delivery-text">
                <span aria-hidden="true">🎉</span>
                <strong>You've unlocked free delivery!</strong>
              </p>
            ) : (
              <p className="cart-items__delivery-text">
                <span aria-hidden="true">🚴</span>
                Add <span>{fmt(amountToFreeShipping)}</span> more for free delivery
              </p>
            )}
            <div className="cart-items__progress-track" role="progressbar"
              aria-valuenow={freeDeliveryPct} aria-valuemin={0} aria-valuemax={100}
              aria-label={`${freeDeliveryPct}% to free delivery`}>
              <div className="cart-items__progress-fill" style={{ width: `${freeDeliveryPct}%` }} />
            </div>
          </div>

          {/* Cart items */}
          <div className="cart-items__list" role="list" aria-label="Cart items">
            {cartItems.map((item) => (
              <CartItem key={item.product || item._id} item={item} />
            ))}
          </div>
        </div>

        {/* ── Order summary panel ───────────────────────── */}
        <aside className="cart-summary" aria-label="Order summary">

          <div className="cart-summary__header">
            <h2 className="cart-summary__title">Order Summary</h2>
          </div>

          <div className="cart-summary__body">

            {/* Price breakdown */}
            <div role="list">
              <div className="cart-summary__row" role="listitem">
                <span className="cart-summary__row-label">
                  Subtotal ({cartItems.reduce((s,i) => s + i.quantity, 0)} items)
                </span>
                <span className="cart-summary__row-val">{fmt(itemsPrice)}</span>
              </div>

              {discount > 0 && (
                <div className="cart-summary__row cart-summary__row--discount" role="listitem">
                  <span className="cart-summary__row-label">
                    <span aria-hidden="true">🏷️</span>
                    Coupon ({coupon?.code})
                  </span>
                  <span className="cart-summary__row-val">− {fmt(discount)}</span>
                </div>
              )}

              <div className="cart-summary__row" role="listitem">
                <span className="cart-summary__row-label">
                  <span aria-hidden="true">🚴</span> Delivery
                </span>
                <span className={`cart-summary__row-val${deliveryPrice === 0 ? ' cart-summary__row--free' : ''}`}>
                  {deliveryPrice === 0 ? 'FREE' : fmt(deliveryPrice)}
                </span>
              </div>

              <div className="cart-summary__row" role="listitem">
                <span className="cart-summary__row-label">
                  <span aria-hidden="true">🧾</span> Tax (5%)
                </span>
                <span className="cart-summary__row-val">{fmt(taxPrice)}</span>
              </div>
            </div>

            <div className="cart-summary__divider" aria-hidden="true" />

            {/* Total */}
            <div className="cart-summary__total-row">
              <span className="cart-summary__total-label">Total</span>
              <span className={`cart-summary__total-val${totalFlash ? ' cart-summary__total-val--flash' : ''}`}
                aria-live="polite" aria-atomic="true">
                {fmt(totalPrice)}
              </span>
            </div>

            {savings > 0 && (
              <div className="cart-summary__savings" role="status" aria-live="polite">
                <span aria-hidden="true">✅</span>
                You're saving {fmt(savings)} on this order!
              </div>
            )}

            {/* Coupon section */}
            <div className="cart-coupon">
              <span className="cart-coupon__label">Promo code</span>

              {coupon ? (
                <div className="cart-coupon__applied">
                  <span className="cart-coupon__applied-text">
                    <span aria-hidden="true">🏷️</span>
                    {coupon.code} — {coupon.label}
                  </span>
                  <button className="cart-coupon__remove" onClick={removeCoupon} aria-label="Remove coupon">
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-coupon__row">
                    <input
                      type="text"
                      className="cart-coupon__input"
                      placeholder="Enter code (e.g. FLAT50)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                      aria-label="Coupon code"
                      maxLength={20}
                    />
                    <button
                      className="cart-coupon__btn"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim()}
                      aria-label="Apply coupon"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="cart-coupon__msg cart-coupon__msg--error" role="alert">
                      {couponError}
                    </p>
                  )}
                  <p style={{ fontSize: '0.72rem', color: 'var(--cart-text-muted)', marginTop: '0.4rem' }}>
                    Try: WELCOME10, FLAT50, FREESHIP, FEAST20
                  </p>
                </>
              )}
            </div>

            {/* Checkout CTA */}
            <button
              className="cart-summary__checkout-btn"
              onClick={handleCheckout}
              aria-label="Proceed to checkout"
            >
              <span aria-hidden="true">🔒</span>
              {user ? 'Proceed to Checkout' : 'Login & Checkout'}
              <span aria-hidden="true">→</span>
            </button>

            <Link to="/products" className="cart-summary__continue">
              <span aria-hidden="true">←</span> Continue Shopping
            </Link>

            {/* Trust badges */}
            <div className="cart-summary__trust" aria-label="Security badges">
              <span className="cart-summary__trust-item">
                <span aria-hidden="true">🔒</span> Secure
              </span>
              <span className="cart-summary__trust-item">
                <span aria-hidden="true">↩️</span> Easy returns
              </span>
              <span className="cart-summary__trust-item">
                <span aria-hidden="true">⚡</span> Fast delivery
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
