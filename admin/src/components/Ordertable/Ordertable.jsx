import { useState, useEffect, useCallback, useRef } from 'react';
import './OrderTable.css';

const API   = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const LIMIT = 10;

const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ── Status config ───────────────────────────────────────────── */
const STATUS_OPTIONS = [
  'Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled',
];

const STATUS_CLS = {
  'Placed':           'placed',
  'Confirmed':        'confirmed',
  'Preparing':        'preparing',
  'Out for Delivery': 'out',
  'Delivered':        'delivered',
  'Cancelled':        'cancelled',
};

/* ── Revenue strip ───────────────────────────────────────────── */
function RevenueStrip({ orders }) {
  const delivered  = orders.filter((o) => o.status === 'Delivered');
  const active     = orders.filter((o) => !['Delivered','Cancelled'].includes(o.status));
  const cancelled  = orders.filter((o) => o.status === 'Cancelled');
  const totalRev   = delivered.reduce((s, o) => s + o.totalPrice, 0);

  const cards = [
    { label: 'Total Orders',     val: orders.length,    sub: 'all time',              dot: '#a09a8e' },
    { label: 'Revenue',          val: fmt(totalRev),    sub: 'from delivered orders', dot: '#2ecc71' },
    { label: 'Active Orders',    val: active.length,    sub: 'in progress',           dot: '#f5a623' },
    { label: 'Cancelled',        val: cancelled.length, sub: 'this view',             dot: '#e74c3c' },
  ];

  return (
    <div className="ot-revenue-strip" role="region" aria-label="Order statistics">
      {cards.map((c) => (
        <div key={c.label} className="ot-rev-card">
          <span className="ot-rev-card__label">{c.label}</span>
          <span className="ot-rev-card__val">{c.val}</span>
          <span className="ot-rev-card__sub">
            <span className="ot-rev-card__dot" style={{ background: c.dot }} aria-hidden="true" />
            {c.sub}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Status badge (display only) ────────────────────────────── */
function StatusBadge({ status }) {
  const cls = STATUS_CLS[status] || 'placed';
  return (
    <span className={`ot-status-badge ot-status-badge--${cls}`} aria-label={`Status: ${status}`}>
      <span className="ot-status-badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}

/* ── Inline status select ────────────────────────────────────── */
function StatusSelect({ order, onChange }) {
  const cls = STATUS_CLS[order.status] || 'placed';
  return (
    <select
      className={`ot-status-select ot-status-select--${cls}`}
      value={order.status}
      onChange={(e) => onChange(order._id, e.target.value)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Update status for order ${order._id?.slice(-8)}`}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

/* ── Expanded order drawer ───────────────────────────────────── */
function OrderDrawer({ order }) {
  return (
    <tr className="ot-drawer">
      <td colSpan={8}>
        <div className="ot-drawer-inner">

          {/* Items */}
          <div>
            <div className="ot-drawer-section__title">
              🍽️ Items Ordered ({order.items?.length})
            </div>
            <div className="ot-drawer-items">
              {order.items?.map((item, i) => (
                <div key={i} className="ot-drawer-item">
                  <img
                    src={item.image || '/placeholder-food.jpg'}
                    alt={item.name}
                    className="ot-drawer-item__img"
                    onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
                  />
                  <span className="ot-drawer-item__name">{item.name}</span>
                  <span className="ot-drawer-item__qty">× {item.quantity}</span>
                  <span className="ot-drawer-item__price">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          <div>
            <div className="ot-drawer-section__title">📍 Delivery Address</div>
            <div className="ot-drawer-address">
              <strong>{order.shippingAddress?.fullName}</strong><br />
              {order.shippingAddress?.street},<br />
              {order.shippingAddress?.city}, {order.shippingAddress?.state}<br />
              PIN: {order.shippingAddress?.zipCode}<br />
              📞 {order.shippingAddress?.phone}
            </div>

            {order.notes && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--ot-text-muted)', fontStyle: 'italic' }}>
                Note: {order.notes}
              </div>
            )}

            {order.cancelReason && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--ot-cancelled)', background: 'rgba(231,76,60,0.08)', padding: '0.5rem', borderRadius: '7px' }}>
                ❌ Cancellation reason: {order.cancelReason}
              </div>
            )}
          </div>

          {/* Price breakdown */}
          <div>
            <div className="ot-drawer-section__title">💰 Price Breakdown</div>
            <div className="ot-drawer-price-row">
              <span>Subtotal</span><span>{fmt(order.itemsPrice)}</span>
            </div>
            <div className="ot-drawer-price-row">
              <span>Delivery</span>
              <span style={{ color: order.deliveryPrice === 0 ? 'var(--ot-delivered)' : undefined }}>
                {order.deliveryPrice === 0 ? 'FREE' : fmt(order.deliveryPrice)}
              </span>
            </div>
            <div className="ot-drawer-price-row">
              <span>Tax (5%)</span><span>{fmt(order.taxPrice)}</span>
            </div>
            <div className="ot-drawer-price-row ot-drawer-price-row--total">
              <strong>Total</strong><strong>{fmt(order.totalPrice)}</strong>
            </div>

            <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'var(--ot-surface2)', borderRadius: '8px' }}>
              <div className="ot-drawer-price-row" style={{ padding: 0 }}>
                <span>Payment</span><strong style={{ color: 'var(--ot-text)' }}>{order.paymentMethod}</strong>
              </div>
              <div className="ot-drawer-price-row" style={{ padding: '0.2rem 0 0' }}>
                <span>Pay status</span>
                <strong style={{ color: order.paymentStatus === 'Paid' ? 'var(--ot-delivered)' : 'var(--ot-text-muted)' }}>
                  {order.paymentStatus}
                </strong>
              </div>
              <div className="ot-drawer-price-row" style={{ padding: '0.2rem 0 0' }}>
                <span>Placed</span>
                <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════════════
   ORDER TABLE
   ══════════════════════════════════════════════════════════════ */

/**
 * OrderTable
 *
 * Props:
 *   token {string} — admin JWT
 */
export default function OrderTable({ token }) {
  const [orders,    setOrders]    = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('all');
  const [sortBy,    setSortBy]    = useState('createdAt');
  const [sortDir,   setSortDir]   = useState('desc');

  const [expandedId, setExpandedId] = useState(null);
  const [updating,   setUpdating]   = useState(null);

  const debounceRef = useRef(null);

  /* ── Fetch ───────────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (status !== 'all') params.set('status', status);

      const res  = await fetch(`${API}/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load orders');

      let list = data.orders || [];

      // Client-side search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((o) =>
          o._id.toLowerCase().includes(q) ||
          o.user?.name?.toLowerCase().includes(q) ||
          o.user?.email?.toLowerCase().includes(q) ||
          o.items?.some((i) => i.name.toLowerCase().includes(q))
        );
      }

      // Sort
      list.sort((a, b) => {
        let aVal = a[sortBy], bVal = b[sortBy];
        if (sortBy === 'totalPrice') { aVal = Number(aVal); bVal = Number(bVal); }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });

      setOrders(list);
      setTotal(data.total || list.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, status, search, sortBy, sortDir]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchOrders, search ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [fetchOrders]);

  /* ── Update order status ─────────────────────────────────── */
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(orderId);
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o)
    );
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? data.order : o)
      );
    } catch (err) {
      alert(err.message || 'Status update failed');
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  /* ── Sort ────────────────────────────────────────────────── */
  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('desc'); }
    setPage(1);
  };

  /* ── Export CSV ──────────────────────────────────────────── */
  const handleExport = () => {
    const headers = ['Order ID','Customer','Items','Total','Status','Payment','Date'];
    const rows    = orders.map((o) => [
      o._id?.slice(-8).toUpperCase(),
      o.user?.name || 'N/A',
      o.items?.map((i) => i.name).join(' | '),
      o.totalPrice,
      o.status,
      o.paymentMethod,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
    ]);
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const pageStart  = (page - 1) * LIMIT + 1;
  const pageEnd    = Math.min(page * LIMIT, total);

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const thSort = (label, field) => (
    <th
      className={`sortable${sortBy === field ? ' sorted' : ''}`}
      onClick={() => handleSort(field)}
      aria-sort={sortBy === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {sortBy === field && (
        <span style={{ marginLeft: 4, fontSize: '0.6rem' }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );

  return (
    <div className="order-table-wrap">

      {/* ── Revenue strip ────────────────────────────────── */}
      {!loading && !error && <RevenueStrip orders={orders} />}

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="ot-toolbar">
        <span className="ot-toolbar__title">
          📦 Orders
          <span className="ot-toolbar__badge">{total}</span>
        </span>
        <div className="ot-spacer" />

        {/* Search */}
        <div className="ot-search">
          <input
            type="search"
            className="ot-search__input"
            placeholder="Search order, customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search orders"
          />
          <span className="ot-search__icon" aria-hidden="true">🔍</span>
        </div>

        {/* Status filter */}
        <select
          className="ot-select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Export */}
        <button className="ot-btn" onClick={handleExport} aria-label="Export orders to CSV">
          📥 Export CSV
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="ot-table-container">
        <table className="ot-table" role="grid" aria-label="Customer orders">
          <thead>
            <tr>
              {thSort('Order ID',  '_id')}
              {thSort('Customer',  'user')}
              <th>Items</th>
              {thSort('Amount',    'totalPrice')}
              {thSort('Status',    'status')}
              <th>Update Status</th>
              {thSort('Date',      'createdAt')}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: LIMIT }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }, (_, j) => (
                    <td key={j}>
                      <div style={{ height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 5, width: j === 1 ? 130 : 70, animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={8}>
                  <div className="ot-empty">
                    <span className="ot-empty__icon">😕</span>
                    <p className="ot-empty__title">Failed to load orders</p>
                    <p className="ot-empty__desc">{error}</p>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="ot-empty">
                    <span className="ot-empty__icon">📭</span>
                    <p className="ot-empty__title">No orders found</p>
                    <p className="ot-empty__desc">
                      {search || status !== 'all' ? 'Try adjusting your filters.' : 'No orders have been placed yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedId === order._id;
                const isUpdating = updating === order._id;

                return (
                  <>
                    <tr
                      key={order._id}
                      onClick={() => setExpandedId(isExpanded ? null : order._id)}
                      aria-expanded={isExpanded}
                      style={{ opacity: isUpdating ? 0.6 : 1 }}
                    >
                      {/* Order ID */}
                      <td>
                        <span className="ot-order-id">
                          #{order._id?.slice(-8).toUpperCase()}
                        </span>
                        <span style={{ marginLeft: 6, fontSize: '0.6rem', color: 'var(--ot-text-muted)' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </td>

                      {/* Customer */}
                      <td>
                        <div className="ot-customer">
                          <div className="ot-customer__avatar">
                            {getInitials(order.user?.name)}
                          </div>
                          <div>
                            <span className="ot-customer__name">{order.user?.name || 'Guest'}</span>
                            <span className="ot-customer__email">{order.user?.email || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Items preview */}
                      <td>
                        <span className="ot-items-preview">
                          {order.items?.map((i) => i.name).join(', ')}
                        </span>
                        <span className="ot-items-count">
                          {order.items?.reduce((s, i) => s + i.quantity, 0)} items
                        </span>
                      </td>

                      {/* Amount */}
                      <td>
                        <span className="ot-amount">{fmt(order.totalPrice)}</span>
                        <span className="ot-payment-method">{order.paymentMethod}</span>
                      </td>

                      {/* Status badge */}
                      <td>
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Inline status update */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <StatusSelect order={order} onChange={handleStatusChange} />
                      </td>

                      {/* Date */}
                      <td style={{ fontSize: '0.75rem', color: 'var(--ot-text-muted)' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: '2-digit',
                        })}
                        <span style={{ display: 'block', fontSize: '0.68rem' }}>
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ot-row-actions">
                          <button
                            className="ot-row-btn ot-row-btn--view"
                            onClick={() => setExpandedId(isExpanded ? null : order._id)}
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} order details`}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                          <button
                            className="ot-row-btn ot-row-btn--print"
                            onClick={() => window.print()}
                            title="Print invoice"
                            aria-label="Print order invoice"
                          >
                            🖨
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded drawer */}
                    {isExpanded && <OrderDrawer key={`drawer-${order._id}`} order={order} />}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="ot-pagination">
          <span className="ot-pagination__info">
            Showing <strong>{pageStart}–{pageEnd}</strong> of <strong>{total}</strong> orders
          </span>

          <div className="ot-pagination__pages" role="navigation" aria-label="Order pages">
            <button
              className="ot-page-btn"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >←</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} style={{ padding: '0 3px', color: 'var(--ot-text-muted)', fontSize: '0.78rem' }}>…</span>
                ) : (
                  <button
                    key={p}
                    className={`ot-page-btn${page === p ? ' ot-page-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={page === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              className="ot-page-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            >→</button>
          </div>
        </div>
      )}

      <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
    </div>
  );
}