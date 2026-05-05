import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardStats } from '../../components/StatsCard/StatsCard.jsx';
import Spinner from '../../components/Spinner/Spinner.jsx';
import './Dashboard.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ── Status config ───────────────────────────────────────────── */
const STATUS_CLS = {
  'Placed':           'placed',
  'Confirmed':        'confirmed',
  'Preparing':        'preparing',
  'Out for Delivery': 'out',
  'Delivered':        'delivered',
  'Cancelled':        'cancelled',
};

/* ── Top categories (derived from products) ──────────────────── */
const CATEGORY_ICONS = {
  Burgers:'🍔', Pizza:'🍕', Sushi:'🍣', Pasta:'🍝', Salads:'🥗',
  Desserts:'🍰', Beverages:'🧃', Sandwiches:'🥪', Wraps:'🌯',
  Seafood:'🦐', Chicken:'🍗', Vegan:'🌱', Breakfast:'🥞', Sides:'🍟', Other:'✨',
};

/* ── Live activity feed (mock — replace with WebSocket/SSE) ──── */
const ACTIVITY_FEED = [
  { id:1, icon:'📦', msg:'New order #3F1A placed — ₹580',           time:'Just now'   },
  { id:2, icon:'👤', msg:'New customer registered: Ananya M.',       time:'2 min ago'  },
  { id:3, icon:'⭐', msg:'5-star review on Paneer Tikka Pizza',      time:'8 min ago'  },
  { id:4, icon:'🚴', msg:'Order #2D9B delivered successfully',       time:'15 min ago' },
  { id:5, icon:'⚠️', msg:'Low stock: Chicken Burger (5 remaining)', time:'22 min ago' },
  { id:6, icon:'📦', msg:'Order #1C7E confirmed',                    time:'31 min ago' },
  { id:7, icon:'💰', msg:'Revenue milestone: ₹1L this month!',       time:'1 hr ago'   },
  { id:8, icon:'🌱', msg:'New vegan category item added',            time:'2 hr ago'   },
];

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function Dashboard({ user, token }) {
  const navigate = useNavigate();

  const [stats,      setStats]      = useState(null);
  const [recentOrders,setRecentOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userCount,  setUserCount]  = useState(0);
  const [productCount,setProductCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activities, setActivities] = useState(ACTIVITY_FEED);

  /* ── Fetch all dashboard data in parallel ────────────────── */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, ordersRes, usersRes, productsRes] = await Promise.all([
        fetch(`${API}/orders/dashboard`, { headers }),
        fetch(`${API}/orders?limit=8&sort=createdAt_desc`, { headers }),
        fetch(`${API}/users?limit=1`, { headers }),
        fetch(`${API}/products?limit=1`, { headers }),
      ]);

      const [statsData, ordersData, usersData, productsData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
        usersRes.json(),
        productsRes.json(),
      ]);

      if (statsRes.ok)    setStats(statsData.stats || statsData);
      if (ordersRes.ok)   setRecentOrders(ordersData.orders || []);
      if (usersRes.ok)    setUserCount(usersData.total || 0);
      if (productsRes.ok) setProductCount(productsData.total || 0);

      /* Build category breakdown from recent orders */
      if (ordersData.orders) {
        const catMap = {};
        ordersData.orders.forEach((o) => {
          o.items?.forEach((item) => {
            catMap[item.category] = (catMap[item.category] || 0) + item.quantity;
          });
        });
        const catArr = Object.entries(catMap)
          .sort(([,a],[,b]) => b - a)
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }));
        setCategories(catArr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  /* ── Greeting ────────────────────────────────────────────── */
  const hour   = new Date().getHours();
  const greet  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'Admin').split(' ')[0];

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading && !stats) {
    return (
      <div className="dashboard-loading">
        <Spinner variant="food" size="lg" label="Loading dashboard…" />
      </div>
    );
  }

  const maxCat = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className="dashboard">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="dashboard__header">
        <div className="dashboard__header-row">
          <div>
            <h1 className="dashboard__greeting">
              {greet}, <em>{firstName}</em> 👋
            </h1>
            <div className="dashboard__meta">
              <span>{dateStr}</span>
              <span className="dashboard__meta-sep" aria-hidden="true">·</span>
              <span className="dashboard__meta-live">
                <span className="dashboard__meta-live-dot" aria-hidden="true" />
                Live dashboard
              </span>
              {error && (
                <>
                  <span className="dashboard__meta-sep" aria-hidden="true">·</span>
                  <span style={{ color: 'var(--dash-red)', fontSize: '0.75rem' }}>
                    ⚠ {error}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="dashboard__quick-actions">
            <Link to="/admin/products/new" className="dash-quick-btn dash-quick-btn--primary">
              <span aria-hidden="true">+</span> Add Item
            </Link>
            <Link to="/admin/orders" className="dash-quick-btn dash-quick-btn--secondary">
              <span aria-hidden="true">📦</span> Orders
            </Link>
            <button
              className="dash-quick-btn dash-quick-btn--secondary"
              onClick={fetchDashboard}
              aria-label="Refresh dashboard"
            >
              <span aria-hidden="true">🔄</span> Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard__body">

        {/* ── Stats grid ──────────────────────────────── */}
        <DashboardStats
          stats    = {stats || {}}
          users    = {userCount}
          products = {productCount}
          loading  = {loading}
        />

        {/* ── Recent orders ────────────────────────────── */}
        <section aria-labelledby="recent-orders-title">
          <div className="dash-section-heading">
            <h2 className="dash-section-title" id="recent-orders-title">
              <span aria-hidden="true">📦</span> Recent Orders
            </h2>
            <Link to="/admin/orders" className="dash-section-link">
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="dash-orders">
            <div className="dash-orders-scroll">
              <table className="dash-orders-table" aria-label="Recent orders">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }, (_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }, (_, j) => (
                          <td key={j}>
                            <div style={{
                              height: 12, width: j === 1 ? 120 : 70,
                              background: 'rgba(255,255,255,0.05)',
                              borderRadius: 4,
                              animation: 'skPulse 1.5s ease-in-out infinite',
                            }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--dash-text-muted)', fontSize: '0.875rem' }}>
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      const cls = STATUS_CLS[order.status] || 'placed';
                      const initials = (order.user?.name || '?')
                        .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <tr
                          key={order._id}
                          onClick={() => navigate('/admin/orders')}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/orders'); }}
                          aria-label={`Order ${order._id?.slice(-8).toUpperCase()}`}
                        >
                          <td>
                            <span className="dash-order-id">
                              #{order._id?.slice(-8).toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="dash-customer">
                              <div className="dash-customer__avatar" aria-hidden="true">
                                {initials}
                              </div>
                              <span className="dash-customer__name">
                                {order.user?.name || 'Guest'}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--dash-text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.items?.map((i) => i.name).join(', ')}
                          </td>
                          <td>
                            <span className="dash-amount">{fmt(order.totalPrice)}</span>
                          </td>
                          <td>
                            <span className={`dash-status dash-status--${cls}`} aria-label={`Status: ${order.status}`}>
                              <span className="dash-status__dot" aria-hidden="true" />
                              {order.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--dash-text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short',
                            })}
                            &nbsp;·&nbsp;
                            {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Lower two-column section ──────────────────── */}
        <div className="dash-lower-grid">

          {/* Activity feed */}
          <section aria-labelledby="activity-title">
            <div className="dash-activity">
              <div className="dash-activity__header">
                <h2 className="dash-activity__title" id="activity-title">
                  <span aria-hidden="true">⚡</span> Live Activity
                </h2>
                <button
                  className="dash-activity__clear"
                  onClick={() => setActivities([])}
                  aria-label="Clear activity feed"
                >
                  Clear
                </button>
              </div>

              <div className="dash-activity__list" role="log" aria-label="Activity feed" aria-live="polite">
                {activities.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '0.82rem' }}>
                    No recent activity.
                  </div>
                ) : (
                  activities.map((item) => (
                    <div key={item.id} className="dash-activity__item">
                      <div className="dash-activity__icon" aria-hidden="true">
                        {item.icon}
                      </div>
                      <div className="dash-activity__text">
                        <p className="dash-activity__msg">{item.msg}</p>
                        <span className="dash-activity__time">{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Top categories */}
          <section aria-labelledby="categories-title">
            <div className="dash-categories">
              <div className="dash-categories__header">
                <h2 className="dash-categories__title" id="categories-title">
                  <span aria-hidden="true">🏷️</span> Top Categories
                </h2>
              </div>

              <div className="dash-categories__list">
                {categories.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '0.82rem' }}>
                    No category data yet.
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.name} className="dash-cat-row">
                      <span className="dash-cat-icon" aria-hidden="true">
                        {CATEGORY_ICONS[cat.name] || '🍽️'}
                      </span>
                      <span className="dash-cat-name">{cat.name}</span>
                      <div className="dash-cat-bar-wrap" aria-label={`${cat.count} orders`}>
                        <div
                          className="dash-cat-bar"
                          style={{ width: `${(cat.count / maxCat) * 100}%` }}
                        />
                      </div>
                      <span className="dash-cat-count">{cat.count} sold</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
    </div>
  );
}