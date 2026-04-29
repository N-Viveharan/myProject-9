import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner/Spinner.jsx';
import './Checkout.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/* ── Steps definition ────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Delivery Address', icon: '📍' },
  { id: 2, label: 'Payment',          icon: '💳' },
  { id: 3, label: 'Review & Place',   icon: '✅' },
];

/* ── Payment methods ─────────────────────────────────────────── */
const PAYMENT_METHODS = [
  { value: 'COD',  label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
  { value: 'UPI',  label: 'UPI',              icon: '📱', desc: 'GPay, PhonePe, Paytm & more' },
  { value: 'Card', label: 'Debit / Credit',   icon: '💳', desc: 'Visa, Mastercard, RuPay' },
];

/* ── India states ────────────────────────────────────────────── */
const IN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh',
];

/* ── Validation helpers ──────────────────────────────────────── */
const validateAddress = (a) => {
  const errs = {};
  if (!a.fullName.trim())  errs.fullName = 'Full name is required';
  if (!a.street.trim())    errs.street   = 'Street address is required';
  if (!a.city.trim())      errs.city     = 'City is required';
  if (!a.state)            errs.state    = 'State is required';
  if (!a.zipCode.trim())   errs.zipCode  = 'ZIP code is required';
  else if (!/^\d{6}$/.test(a.zipCode)) errs.zipCode = 'Enter a valid 6-digit PIN';
  if (!a.phone.trim())     errs.phone    = 'Phone is required';
  else if (!/^\d{10}$/.test(a.phone.replace(/\s/g,''))) errs.phone = 'Enter a valid 10-digit number';
  return errs;
};

/* ── Step 1: Address form ────────────────────────────────────── */
function AddressStep({ address, onChange, errors }) {
  const field = (name, label, placeholder, type = 'text', required = true) => (
    <div className="form-group">
      <label htmlFor={`addr-${name}`} className={`form-label${required ? ' form-label--required' : ''}`}>
        {label}
      </label>
      <input
        id={`addr-${name}`}
        type={type}
        className={`form-input${errors[name] ? ' form-input--error' : ''}`}
        placeholder={placeholder}
        value={address[name]}
        onChange={(e) => onChange(name, e.target.value)}
        autoComplete={name}
        required={required}
      />
      {errors[name] && <span className="form-error-text" role="alert">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="checkout-card__body">
      <div className="form-row">
        {field('fullName', 'Full Name', 'Rahul Sharma')}
      </div>
      <div className="form-row">
        {field('phone', 'Mobile Number', '9876543210', 'tel')}
      </div>
      <div className="form-row">
        {field('street', 'Street Address', 'Flat 4B, MG Road, Near City Mall')}
      </div>
      <div className="form-row form-row--2">
        {field('city', 'City', 'Mumbai')}
        <div className="form-group">
          <label htmlFor="addr-state" className="form-label form-label--required">State</label>
          <select
            id="addr-state"
            className={`form-select${errors.state ? ' form-input--error' : ''}`}
            value={address.state}
            onChange={(e) => onChange('state', e.target.value)}
            required
          >
            <option value="">Select state</option>
            {IN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <span className="form-error-text" role="alert">{errors.state}</span>}
        </div>
      </div>
      <div className="form-row form-row--2">
        {field('zipCode', 'PIN Code', '400001')}
        {field('country', 'Country', 'India', 'text', false)}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="addr-notes" className="form-label">Delivery Notes (optional)</label>
          <textarea
            id="addr-notes"
            className="form-textarea"
            placeholder="Leave near door, ring bell twice…"
            value={address.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
            maxLength={200}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Payment selection ───────────────────────────────── */
function PaymentStep({ method, onChange }) {
  return (
    <div className="checkout-card__body">
      <div className="payment-methods" role="radiogroup" aria-label="Payment method">
        {PAYMENT_METHODS.map((m) => (
          <div
            key={m.value}
            className={`payment-card${method === m.value ? ' payment-card--selected' : ''}`}
            onClick={() => onChange(m.value)}
            role="radio"
            aria-checked={method === m.value}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onChange(m.value); }}
          >
            <div className="payment-card__radio" aria-hidden="true" />
            <span className="payment-card__icon" aria-hidden="true">{m.icon}</span>
            <div>
              <div className="payment-card__name">{m.label}</div>
              <div className="payment-card__desc">{m.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 3: Review order ────────────────────────────────────── */
function ReviewStep({ address, method, cartItems, onEditAddress, onEditPayment }) {
  const pm = PAYMENT_METHODS.find((m) => m.value === method);
  return (
    <div className="checkout-card__body">
      {/* Address preview */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--co-text-muted)' }}>
            📍 Delivering to
          </span>
          <button className="checkout-card__edit" onClick={onEditAddress}>Edit</button>
        </div>
        <div style={{ padding: '0.85rem 1rem', background: 'var(--co-surface)', borderRadius: '10px', fontSize: '0.875rem', color: 'var(--co-text-mid)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--co-text)' }}>{address.fullName}</strong><br />
          {address.street}, {address.city}<br />
          {address.state} — {address.zipCode}<br />
          📞 {address.phone}
          {address.notes && <><br /><em style={{ fontSize: '0.8rem', color: 'var(--co-text-muted)' }}>Note: {address.notes}</em></>}
        </div>
      </div>

      {/* Payment preview */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--co-text-muted)' }}>
            💳 Payment
          </span>
          <button className="checkout-card__edit" onClick={onEditPayment}>Edit</button>
        </div>
        <div style={{ padding: '0.85rem 1rem', background: 'var(--co-surface)', borderRadius: '10px', fontSize: '0.875rem', color: 'var(--co-text-mid)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{pm?.icon}</span>
          <div>
            <strong style={{ color: 'var(--co-text)' }}>{pm?.label}</strong>
            <div style={{ fontSize: '0.78rem' }}>{pm?.desc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Checkout() {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const {
    cartItems, buildOrderPayload, clearCart,
    itemsPrice, discount, deliveryPrice, taxPrice, totalPrice,
    coupon,
  } = useContext(CartContext);

  const [step, setStep] = useState(1);

  const [address, setAddress] = useState({
    fullName: user?.name || '',
    phone:    user?.phone || '',
    street:   user?.address?.street || '',
    city:     user?.address?.city   || '',
    state:    user?.address?.state  || '',
    zipCode:  user?.address?.zipCode|| '',
    country:  'India',
    notes:    '',
  });

  const [addrErrors, setAddrErrors] = useState({});
  const [payMethod,  setPayMethod]  = useState('COD');
  const [placing,    setPlacing]    = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder,setPlacedOrder]= useState(null);

  /* Redirect if cart is empty or not logged in */
  useEffect(() => {
    if (!user) { navigate('/login?redirect=/checkout'); return; }
    if (cartItems.length === 0 && !placedOrder) navigate('/cart');
  }, [user, cartItems, navigate, placedOrder]);

  const handleAddressChange = (key, val) => {
    setAddress((prev) => ({ ...prev, [key]: val }));
    if (addrErrors[key]) setAddrErrors((e) => { const n = {...e}; delete n[key]; return n; });
  };

  /* ── Next step validation ────────────────────────────────── */
  const handleNext = () => {
    if (step === 1) {
      const errs = validateAddress(address);
      if (Object.keys(errs).length) { setAddrErrors(errs); return; }
      setAddrErrors({});
    }
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Place order ─────────────────────────────────────────── */
  const handlePlaceOrder = async () => {
    const errs = validateAddress(address);
    if (Object.keys(errs).length) { setStep(1); setAddrErrors(errs); return; }

    setPlacing(true);
    setOrderError('');
    try {
      const payload = buildOrderPayload(
        { ...address, country: address.country || 'India' },
        payMethod,
        address.notes
      );
      const res  = await fetch(`${API}/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order failed.');
      setPlacedOrder(data.order);
      clearCart();
    } catch (err) {
      setOrderError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  /* ── Success state ───────────────────────────────────────── */
  if (placedOrder) {
    return (
      <div className="checkout-page">
        <div className="checkout-success">
          <span className="checkout-success__icon" aria-hidden="true">🎉</span>
          <h1 className="checkout-success__title">Order Placed!</h1>
          <p className="checkout-success__desc">
            Your food is being prepared and will be delivered soon.
            You'll get live updates on your order status.
          </p>
          <p className="checkout-success__order">
            Order ID: <strong>#{placedOrder._id?.slice(-8).toUpperCase()}</strong>
          </p>
          <div className="checkout-success__actions">
            <Link to="/orders" className="checkout-success__btn-primary">
              <span aria-hidden="true">📦</span> Track My Order
            </Link>
            <Link to="/products" className="checkout-success__btn-secondary">
              <span aria-hidden="true">🍽️</span> Order More Food
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stepBtn = step < 3 ? 'Continue' : 'Place Order';

  return (
    <div className="checkout-page">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="checkout-page__header">
        <div className="checkout-page__header-inner">
          <Link to="/cart" className="checkout-page__back">
            <span aria-hidden="true">←</span> Back to Cart
          </Link>
          <h1 className="checkout-page__title">Checkout</h1>
        </div>
      </header>

      {/* ── Step progress ────────────────────────────────── */}
      <div className="checkout-steps">
        <div className="checkout-steps__track" role="list" aria-label="Checkout steps">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={[
                'checkout-step',
                step === s.id  ? 'checkout-step--active' : '',
                step > s.id    ? 'checkout-step--done'   : '',
              ].filter(Boolean).join(' ')}
              role="listitem"
              aria-current={step === s.id ? 'step' : undefined}
            >
              <div className="checkout-step__num" aria-hidden="true">
                {step > s.id ? '✓' : s.id}
              </div>
              <span className="checkout-step__label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="checkout-page__body">

        {/* ── Left: form panel ──────────────────────────── */}
        <div className="checkout-form-panel">

          {/* Error banner */}
          {orderError && (
            <div className="checkout-form-error" role="alert">
              <span aria-hidden="true">⚠️</span> {orderError}
            </div>
          )}

          {/* Step 1 — Address */}
          {step >= 1 && (
            <div className="checkout-card">
              <div className="checkout-card__header">
                <h2 className="checkout-card__title">
                  <span aria-hidden="true">📍</span> Delivery Address
                </h2>
                {step > 1 && (
                  <button className="checkout-card__edit" onClick={() => setStep(1)}>Edit</button>
                )}
              </div>
              {step === 1 ? (
                <AddressStep
                  address={address}
                  onChange={handleAddressChange}
                  errors={addrErrors}
                />
              ) : (
                <div className="checkout-card__body" style={{ fontSize: '0.875rem', color: 'var(--co-text-mid)', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--co-text)' }}>{address.fullName}</strong> · {address.phone}<br />
                  {address.street}, {address.city}, {address.state} — {address.zipCode}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Payment */}
          {step >= 2 && (
            <div className="checkout-card">
              <div className="checkout-card__header">
                <h2 className="checkout-card__title">
                  <span aria-hidden="true">💳</span> Payment Method
                </h2>
                {step > 2 && (
                  <button className="checkout-card__edit" onClick={() => setStep(2)}>Edit</button>
                )}
              </div>
              {step === 2 ? (
                <PaymentStep method={payMethod} onChange={setPayMethod} />
              ) : (
                <div className="checkout-card__body" style={{ fontSize: '0.875rem', color: 'var(--co-text-mid)' }}>
                  {PAYMENT_METHODS.find((m) => m.value === payMethod)?.icon}{' '}
                  <strong style={{ color: 'var(--co-text)' }}>
                    {PAYMENT_METHODS.find((m) => m.value === payMethod)?.label}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="checkout-card">
              <div className="checkout-card__header">
                <h2 className="checkout-card__title">
                  <span aria-hidden="true">✅</span> Review Order
                </h2>
              </div>
              <ReviewStep
                address={address}
                method={payMethod}
                cartItems={cartItems}
                onEditAddress={() => setStep(1)}
                onEditPayment={() => setStep(2)}
              />
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {step > 1 && (
              <button
                style={{ flex: 1, padding: '0.85rem', background: 'transparent', border: '1.5px solid var(--co-border)', borderRadius: '14px', fontFamily: 'var(--co-font)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--co-text-mid)', cursor: 'pointer', transition: 'var(--transition)' }}
                onClick={() => setStep((s) => s - 1)}
              >
                ← Back
              </button>
            )}

            <button
              className={`checkout-place-btn${placing ? ' checkout-place-btn--loading' : ''}`}
              style={{ flex: 2 }}
              onClick={step < 3 ? handleNext : handlePlaceOrder}
              disabled={placing}
              aria-label={step < 3 ? 'Continue to next step' : 'Place order'}
            >
              {placing ? (
                <>
                  <Spinner variant="ring" size="xs" />
                  Placing order…
                </>
              ) : (
                <>
                  {step === 3 && <span aria-hidden="true">🔒</span>}
                  {stepBtn}
                  {step < 3 && <span aria-hidden="true">→</span>}
                </>
              )}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--co-text-muted)', marginTop: '0.25rem' }}>
            🔒 Your payment is 100% secure and encrypted
          </p>
        </div>

        {/* ── Right: order summary ──────────────────────── */}
        <aside className="checkout-summary" aria-label="Order summary">
          <div className="checkout-summary__header">
            <h2 className="checkout-summary__title">
              Order Summary ({cartItems.reduce((s,i) => s + i.quantity, 0)} items)
            </h2>
          </div>

          <div className="checkout-summary__body">
            {/* Item list */}
            <div className="checkout-summary__items" role="list">
              {cartItems.map((item) => (
                <div key={item.product || item._id} className="checkout-summary__item" role="listitem">
                  <span className="checkout-summary__item-name">{item.name}</span>
                  <span className="checkout-summary__item-qty">× {item.quantity}</span>
                  <span className="checkout-summary__item-price">
                    {fmt(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div role="list">
              <div className="checkout-summary__row" role="listitem">
                <span>Subtotal</span>
                <span>{fmt(itemsPrice)}</span>
              </div>

              {discount > 0 && (
                <div className="checkout-summary__row checkout-summary__row-disc" role="listitem">
                  <span>Coupon ({coupon?.code})</span>
                  <span>− {fmt(discount)}</span>
                </div>
              )}

              <div className="checkout-summary__row" role="listitem">
                <span>Delivery</span>
                <span className={deliveryPrice === 0 ? 'checkout-summary__row-free' : ''}>
                  {deliveryPrice === 0 ? 'FREE' : fmt(deliveryPrice)}
                </span>
              </div>

              <div className="checkout-summary__row" role="listitem">
                <span>Tax (5%)</span>
                <span>{fmt(taxPrice)}</span>
              </div>

              <div className="checkout-summary__row checkout-summary__row--total" role="listitem">
                <strong>Total</strong>
                <strong>{fmt(totalPrice)}</strong>
              </div>
            </div>

            <Link to="/cart" className="checkout-summary__edit">
              <span aria-hidden="true">✏️</span> Edit cart
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}