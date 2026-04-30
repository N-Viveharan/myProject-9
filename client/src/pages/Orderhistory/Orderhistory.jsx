import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import Spinner from '../../components/Spinner/Spinner.jsx';
import './OrderHistory.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/* ── Status config ───────────────────────────────────────────── */
const STATUS_CONFIG = {
  'Placed':           { cls: 'placed',      icon: '📋', label: 'Order Placed'      },
  'Confirmed':        { cls: 'confirmed',   icon: '✅', label: 'Confirmed'          },
  'Preparing':        { cls: 'preparing',   icon: '👨‍🍳', label: 'Being Prepared'   },
  'Out for Delivery': { cls: 'outdelivery', icon: '🚴', label: 'Out for Delivery'  },
  'Delivered':        { cls: 'delivered',   icon: '🎉', label: 'Delivered'          },
  'Cancelled':        { cls: 'cancelled',   icon: '❌', label: 'Cancelled'          },
};

const TIMELINE_STEPS = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

const TABS = [
  { value: 'all',               label: 'All Orders' },
  { value: 'active',            label: 'Active' },
  { value: 'Delivered',         label: 'Delivered' },
  { value: 'Cancelled',         label: 'Cancelled' },
];

const LIMIT = 8;

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { cls: 'placed', icon: '📋', label: status };
  return (
    <span className={`status-badge status-badge--${cfg.cls}`} aria-label={`Status: ${cfg.label}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ── Timeline ────────────────────────────────────────────────── */
function OrderTimeline({ status, createdAt }) {
  if (status === 'Cancelled') {
    return (
      <div className="order-timeline">
        <div className="order-timeline__title">Order Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--oh-red)' }}>
          <span>❌</span> This order was cancelled.
        </div>
      </div>
    );
  }

  const activeIdx = TIMELINE_STEPS.indexOf(status);

  return (
    <div className="order-timeline" aria-label="Order progress">
      <div className="order-timeline__title">Order Progress</div>
      <div className="order-timeline__track" role="list">
        {TIMELINE_STEPS.map((step, i) => {
          const isDone   = i < activeIdx;
          const isActive = i === activeIdx;
          const stepCfg  = STATUS_CONFIG[step];
          return (
            <div
              key={step}
              className={[
                'timeline-step',
                isDone   ? 'timeline-step--done'   : '',
                isActive ? 'timeline-step--active' : '',
              ].filter(Boolean).join(' ')}
              role="listitem"
              aria-label={`${step}${isDone ? ' (done)' : isActive ? ' (current)' : ''}`}
            >
              <div className="timeline-step__node" aria-hidden="true">
                {isDone ? '✓' : stepCfg.icon}
              </div>
              <div className="timeline-step__label">{step}</div>
              {isActive && (
                <div className="timeline-step__time">Now</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Cancel Modal ────────────────────────────────────────────── */
function CancelModal({ order, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('');
  return (
    <div className="cancel-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cancel order">
      <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
        <span className="cancel-modal__icon" aria-hidden="true">⚠️</span>
        <h2 className="cancel-modal__title">Cancel this order?</h2>
        <p className="cancel-modal__desc">
          Order <strong>#{order._id?.slice(-8).toUpperCase()}</strong> will be cancelled.
          This action cannot be undone.
        </p>
        <label htmlFor="cancel-reason" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--oh-text-muted)', display: 'block', marginBottom: '0.4rem' }}>
          Reason (optional)
        </label>
        <textarea
          id="cancel-reason"
          className="cancel-modal__reason"
          placeholder="Changed my mind, wrong item…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
        />
        <div className="cancel-modal__actions">
          <button className="cancel-modal__btn cancel-modal__btn--back" onClick={onClose} disabled={loading}>
            Keep Order
          </button>
          <button
            className="cancel-modal__btn cancel-modal__btn--confirm"
            onClick={() => onConfirm(reason)}
            disabled={loading}
          >
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single Order Card ───────────────────────────────────────── */
function OrderCard({ order, onCancelClick, token }) {
  const [expanded, setExpanded] = useState(false);
  const { addToCart } = useContext(CartContext);

  const cfg       = STATUS_CONFIG[order.status] || STATUS_CONFIG['Placed'];
  const isActive  = !['Delivered', 'Cancelled'].includes(order.status);
  const canCancel = ['Placed', 'Confirmed'].includes(order.status);
  const visibleThumbs = order.items.slice(0, 3);
  const extraCount    = order.items.length - 3;

  const handleReorder = () => {
    order.items.forEach((item) => {
      addToCart({
        _id:      item.product,
        product:  item.product,
        name:     item.name,
        price:    item.price,
        image:    item.image,
      }, item.quantity);
    });
  };

  return (
    <article className="order-card">
      {/* ── Header row (click to expand) ─────────────────── */}
      <div
        className="order-card__header"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`Order #${order._id?.slice(-8).toUpperCase()}, ${order.status}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v); }}
      >
        <div className="order-card__id-group">
          <span className="order-card__id">#{order._id?.slice(-8).toUpperCase()}</span>
          <span className="order-card__date">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </div>
        <StatusBadge status={order.status} />
        <span className={`order-card__chevron${expanded ? ' order-card__chevron--open' : ''}`} aria-hidden="true">▼</span>
      </div>

      {/* ── Summary row ──────────────────────────────────── */}
      <div className="order-card__summary">
        <div className="order-card__items-preview">
          {/* Thumbnails */}
          <div className="order-card__item-thumbs" aria-hidden="true">
            {visibleThumbs.map((item, i) => (
              <img
                key={i}
                src={item.image || '/placeholder-food.jpg'}
                alt={item.name}
                className="order-card__thumb"
                onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
              />
            ))}
            {extraCount > 0 && (
              <div className="order-card__thumb-more">+{extraCount}</div>
            )}
          </div>

          <span className="order-card__items-text">
            {order.items.map((i) => i.name).join(', ')}
          </span>
        </div>

        <div className="order-card__total-group">
          <span className="order-card__total" aria-label={`Total: ${fmt(order.totalPrice)}`}>
            {fmt(order.totalPrice)}
          </span>
          <span className="order-card__payment">{order.paymentMethod}</span>
        </div>
      </div>

      {/* ── Status timeline ──────────────────────────────── */}
      <OrderTimeline status={order.status} createdAt={order.createdAt} />

      {/* ── Expanded detail ──────────────────────────────── */}
      {expanded && (
        <div className="order-detail">
          <div className="order-detail__grid">
            {/* Delivery address */}
            <div>
              <div className="order-detail__section-title">📍 Delivery Address</div>
              <div className="order-detail__address">
                <strong>{order.shippingAddress?.fullName}</strong><br />
                {order.shippingAddress?.street},<br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state}<br />
                PIN: {order.shippingAddress?.zipCode}<br />
                📞 {order.shippingAddress?.phone}
              </div>
            </div>

            {/* Order info */}
            <div>
              <div className="order-detail__section-title">📋 Order Info</div>
              <div className="order-detail__address">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Payment</span><strong>{order.paymentMethod}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Status</span><strong>{order.paymentStatus}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Placed on</span>
                  <strong>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </strong>
                </div>
                {order.deliveredAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Delivered</span>
                    <strong>
                      {new Date(order.deliveredAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Item list */}
          <div className="order-detail__section-title">🍽️ Items Ordered</div>
          <div className="order-detail__items" role="list">
            {order.items.map((item, i) => (
              <div key={i} className="order-detail__item" role="listitem">
                <img
                  src={item.image || '/placeholder-food.jpg'}
                  alt={item.name}
                  className="order-detail__item-img"
                  onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
                />
                <span className="order-detail__item-name">{item.name}</span>
                <span className="order-detail__item-qty">× {item.quantity}</span>
                <span className="order-detail__item-price">{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="order-detail__prices">
            <div className="order-detail__price-row">
              <span>Subtotal</span><span>{fmt(order.itemsPrice)}</span>
            </div>
            <div className="order-detail__price-row">
              <span>Delivery</span>
              <span style={{ color: order.deliveryPrice === 0 ? 'var(--oh-green)' : 'inherit' }}>
                {order.deliveryPrice === 0 ? 'FREE' : fmt(order.deliveryPrice)}
              </span>
            </div>
            <div className="order-detail__price-row">
              <span>Tax</span><span>{fmt(order.taxPrice)}</span>
            </div>
            <div className="order-detail__price-row order-detail__price-row--total">
              <strong>Total</strong><strong>{fmt(order.totalPrice)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────── */}
      <div className="order-card__actions">
        <button
          className="order-card__action-btn order-card__action-btn--primary"
          onClick={handleReorder}
          aria-label="Reorder the same items"
        >
          <span aria-hidden="true">🔁</span> Reorder
        </button>

        {isActive && (
          <Link
            to={`/orders/${order._id}`}
            className="order-card__action-btn order-card__action-btn--secondary"
          >
            <span aria-hidden="true">📍</span> Track Order
          </Link>
        )}

        {order.status === 'Delivered' && (
          <Link
            to={`/products`}
            className="order-card__action-btn order-card__action-btn--secondary"
          >
            <span aria-hidden="true">⭐</span> Rate Items
          </Link>
        )}

        {canCancel && (
          <button
            className="order-card__action-btn order-card__action-btn--danger"
            onClick={() => onCancelClick(order)}
            aria-label="Cancel this order"
          >
            <span aria-hidden="true">✕</span> Cancel
          </button>
        )}
      </div>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function OrderHistory() {
  const { user, token }      = useContext(AuthContext);
  const navigate             = useNavigate();

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [activeTab,   setActiveTab]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [sortBy,      setSortBy]      = useState('newest');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelling,  setCancelling]  = useState(false);

  /* Redirect if not logged in */
  useEffect(() => {
    if (!user) navigate('/login?redirect=/orders');
  }, [user, navigate]);

  /* ── Fetch orders ────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (activeTab !== 'all' && activeTab !== 'active') {
        params.set('status', activeTab);
      }
      const res  = await fetch(`${API}/orders/my?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load orders');

      let filtered = data.orders || [];

      // Client-side filter for "active" tab
      if (activeTab === 'active') {
        filtered = filtered.filter((o) => !['Delivered','Cancelled'].includes(o.status));
      }

      // Client-side search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((o) =>
          o._id.toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q))
        );
      }

      // Sort
      filtered.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'highest') return b.totalPrice - a.totalPrice;
        if (sortBy === 'lowest')  return a.totalPrice - b.totalPrice;
        return 0;
      });

      setOrders(filtered);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, page, search, sortBy]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Tab counts ──────────────────────────────────────────── */
  const tabCounts = {
    all:       orders.length,
    active:    orders.filter((o) => !['Delivered','Cancelled'].includes(o.status)).length,
    Delivered: orders.filter((o) => o.status === 'Delivered').length,
    Cancelled: orders.filter((o) => o.status === 'Cancelled').length,
  };

  /* ── Cancel order ────────────────────────────────────────── */
  const handleConfirmCancel = async (reason) => {
    if (!cancelOrder) return;
    setCancelling(true);
    try {
      const res  = await fetch(`${API}/orders/${cancelOrder._id}/cancel`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrders((prev) =>
        prev.map((o) => o._id === cancelOrder._id ? { ...o, status: 'Cancelled', cancelReason: reason } : o)
      );
      setCancelOrder(null);
    } catch (err) {
      alert(err.message || 'Cancel failed. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  /* ── Filtered display list ───────────────────────────────── */
  const displayOrders = orders;

  return (
    <div className="orders-page">

      {/* ── Page header ──────────────────────────────────── */}
      <header className="orders-page__header">
        <div className="orders-page__header-inner">
          <h1 className="orders-page__title">
            <span aria-hidden="true">📦</span> My Orders
          </h1>
          <p className="orders-page__subtitle">
            Track your deliveries, reorder favourites, and manage your history.
          </p>

          {/* Status filter tabs */}
          <nav className="orders-tabs" role="tablist" aria-label="Filter orders by status">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                className={`orders-tab${activeTab === tab.value ? ' orders-tab--active' : ''}`}
                onClick={() => { setActiveTab(tab.value); setPage(1); }}
                role="tab"
                aria-selected={activeTab === tab.value}
                aria-controls="orders-panel"
              >
                {tab.label}
                <span className="orders-tab__count" aria-label={`${tabCounts[tab.value]} orders`}>
                  {tabCounts[tab.value]}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="orders-page__body" id="orders-panel" role="tabpanel">

        {/* Toolbar */}
        <div className="orders-toolbar">
          <div className="orders-search">
            <span className="orders-search__icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="orders-search__input"
              placeholder="Search by order ID or item name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              aria-label="Search orders"
            />
          </div>

          <select
            className="orders-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort orders"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner variant="dots" size="lg" label="Loading your orders…" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--oh-red)' }} role="alert">
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>😕</div>
            <strong>{error}</strong>
            <br />
            <button
              onClick={fetchOrders}
              style={{ marginTop: '1rem', padding: '0.55rem 1.25rem', background: 'var(--oh-accent)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--oh-font)' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && displayOrders.length === 0 && (
          <div className="orders-empty">
            <span className="orders-empty__icon" aria-hidden="true">
              {search ? '🔍' : activeTab !== 'all' ? '📭' : '🛒'}
            </span>
            <h2 className="orders-empty__title">
              {search ? 'No results found' : activeTab !== 'all' ? `No ${activeTab.toLowerCase()} orders` : 'No orders yet'}
            </h2>
            <p className="orders-empty__desc">
              {search
                ? `No orders match "${search}". Try a different search.`
                : activeTab !== 'all'
                  ? `You don't have any ${activeTab.toLowerCase()} orders.`
                  : "You haven't placed any orders. Start exploring our menu!"}
            </p>
            {!search && (
              <Link to="/products" className="orders-empty__btn">
                <span aria-hidden="true">🍽️</span> Browse Menu
              </Link>
            )}
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && displayOrders.length > 0 && (
          <>
            <div className="orders-list" role="list" aria-label="Your orders">
              {displayOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  token={token}
                  onCancelClick={(o) => setCancelOrder(o)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="orders-pagination" aria-label="Order pages">
                <button
                  className="orders-pagination__btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >←</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`orders-pagination__btn${page === p ? ' orders-pagination__btn--active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={page === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className="orders-pagination__btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >→</button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* ── Cancel modal ──────────────────────────────────── */}
      {cancelOrder && (
        <CancelModal
          order={cancelOrder}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelOrder(null)}
          loading={cancelling}
        />
      )}
    </div>
  );
}