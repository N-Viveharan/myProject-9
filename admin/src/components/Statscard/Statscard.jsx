import { useState, useEffect, useRef } from 'react';
import './StatsCard.css';

/* ════════════════════════════════════════════════════════════
   SPARKLINE — SVG mini chart from a data array
   ════════════════════════════════════════════════════════════ */
function Sparkline({ data = [], color = 'currentColor', animated = true }) {
  if (!data || data.length < 2) return null;

  const W = 200, H = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  const areaPath = [
    `M${points[0][0].toFixed(1)},${H}`,
    ...points.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`),
    `L${points[points.length - 1][0].toFixed(1)},${H}`,
    'Z',
  ].join(' ');

  const lastPoint = points[points.length - 1];

  return (
    <div className="stats-card__sparkline" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Area fill */}
        <path className="sparkline-area" d={areaPath} />
        {/* Line */}
        <path className="sparkline-path" d={linePath} />
        {/* End dot */}
        <circle
          className="sparkline-dot"
          cx={lastPoint[0].toFixed(1)}
          cy={lastPoint[1].toFixed(1)}
          r="2"
          fill={color}
        />
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COUNT-UP HOOK — animates a number from 0 to target
   ════════════════════════════════════════════════════════════ */
function useCountUp(target, duration = 1000, enabled = true) {
  const [value, setValue] = useState(0);
  const frameRef          = useRef(null);
  const startRef          = useRef(null);

  useEffect(() => {
    if (!enabled || typeof target !== 'number') return;
    const start = performance.now();
    startRef.current = start;

    const tick = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, enabled]);

  return value;
}

/* ════════════════════════════════════════════════════════════
   TREND BADGE
   ════════════════════════════════════════════════════════════ */
function TrendBadge({ delta, suffix = '%' }) {
  if (delta === null || delta === undefined) return null;

  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
  const icon = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
  const abs  = Math.abs(delta);

  return (
    <span className={`stats-card__trend stats-card__trend--${dir}`}>
      <span className="stats-card__trend-icon" aria-hidden="true">{icon}</span>
      {dir !== 'neutral' ? `${abs}${suffix}` : 'No change'}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   SINGLE STATS CARD
   ════════════════════════════════════════════════════════════ */

/**
 * StatsCard
 *
 * Props:
 *   icon        {string}   — emoji icon
 *   label       {string}   — card title
 *   value       {number|string} — main figure
 *   prefix      {string}   — shown before value (e.g. '₹')
 *   suffix      {string}   — shown after value (e.g. '+')
 *   delta       {number}   — trend % (positive = up, negative = down)
 *   deltaSuffix {string}   — default '%'
 *   sub         {string}   — sub-text below value
 *   subIcon     {string}   — emoji before sub-text
 *   sparkData   {number[]} — 7-point array for sparkline
 *   color       {'amber'|'green'|'blue'|'purple'|'red'}
 *   progress    {number}   — 0-100, renders a progress bar if provided
 *   progressLabel {string} — right label on progress bar
 *   loading     {boolean}  — skeleton state
 *   compact     {boolean}  — smaller variant
 *   wide        {boolean}  — full-width horizontal variant
 *   countUp     {boolean}  — animate number (default true)
 *   onClick     {fn}
 */
export function StatsCard({
  icon          = '📊',
  label         = 'Metric',
  value         = 0,
  prefix        = '',
  suffix        = '',
  delta         = null,
  deltaSuffix   = '%',
  sub           = '',
  subIcon       = '',
  sparkData     = null,
  color         = 'amber',
  progress      = null,
  progressLabel = '',
  loading       = false,
  compact       = false,
  wide          = false,
  countUp       = true,
  onClick,
}) {
  /* Intersection observer — only count up when card is visible */
  const cardRef   = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (cardRef.current) obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

  const isNumeric  = typeof value === 'number';
  const animated   = countUp && isNumeric && visible && !loading;
  const countedVal = useCountUp(isNumeric ? value : 0, 900, animated);
  const displayVal = loading
    ? '—'
    : animated
      ? countedVal
      : value;

  const fmt = (v) =>
    typeof v === 'number'
      ? v.toLocaleString('en-IN')
      : v;

  const cls = [
    'stats-card',
    `stats-card--${color}`,
    compact ? 'stats-card--compact' : '',
    wide    ? 'stats-card--wide'    : '',
    loading ? 'stats-card--loading' : '',
    onClick ? 'stats-card--clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <article
      ref={cardRef}
      className={cls}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      aria-label={`${label}: ${prefix}${fmt(displayVal)}${suffix}`}
    >
      {/* ── Header ────────────────────────────────────── */}
      <div className="stats-card__header">
        <div className="stats-card__icon-wrap" aria-hidden="true">
          {icon}
        </div>
        <span className="stats-card__label">{label}</span>
        <button
          className="stats-card__menu-btn"
          aria-label={`Options for ${label}`}
          onClick={(e) => e.stopPropagation()}
          type="button"
        >
          ⋮
        </button>
      </div>

      {/* ── Value row ─────────────────────────────────── */}
      <div className="stats-card__value-row">
        {prefix && (
          <span className="stats-card__prefix" aria-hidden="true">{prefix}</span>
        )}
        <span
          className="stats-card__value"
          aria-live={animated ? 'polite' : undefined}
          aria-atomic="true"
        >
          {fmt(displayVal)}{suffix}
        </span>
        <TrendBadge delta={delta} suffix={deltaSuffix} />
      </div>

      {/* ── Sparkline ─────────────────────────────────── */}
      {sparkData && !loading && (
        <Sparkline data={sparkData} />
      )}

      {/* ── Progress bar ──────────────────────────────── */}
      {progress !== null && !loading && (
        <div className="stats-card__progress">
          <div className="stats-card__progress-labels">
            <span>0</span>
            <span>{progressLabel || `${progress}%`}</span>
          </div>
          <div className="stats-card__progress-track" role="progressbar"
            aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="stats-card__progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Sub text ──────────────────────────────────── */}
      {sub && (
        <p className="stats-card__sub">
          {subIcon && <span className="stats-card__sub-icon" aria-hidden="true">{subIcon}</span>}
          {sub}
        </p>
      )}
    </article>
  );
}

/* ════════════════════════════════════════════════════════════
   STATS GRID — layout wrapper for a row of cards
   ════════════════════════════════════════════════════════════ */

/**
 * StatsGrid
 *
 * Props:
 *   children  {ReactNode}
 *   className {string}
 */
export function StatsGrid({ children, className = '' }) {
  return (
    <div className={`stats-grid ${className}`} role="region" aria-label="Summary statistics">
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD STATS — pre-built grid for the admin dashboard
   ════════════════════════════════════════════════════════════ */

/**
 * DashboardStats
 *
 * Props:
 *   stats   {object} — from GET /api/orders/dashboard
 *   users   {number} — total user count
 *   products{number} — total product count
 *   loading {boolean}
 *
 * stats shape:
 *   { totalOrders, totalRevenue, pendingOrders, deliveredOrders, recentOrders[] }
 */
export function DashboardStats({ stats = {}, users = 0, products = 0, loading = false }) {
  /* Build 7-day sparkline from recentOrders */
  const revenueData = (stats.recentOrders || []).map((d) => d.revenue || 0);
  const orderData   = (stats.recentOrders || []).map((d) => d.count   || 0);

  /* Fill to 7 points if fewer days */
  while (revenueData.length < 7) revenueData.unshift(0);
  while (orderData.length   < 7) orderData.unshift(0);

  const deliveryRate = stats.totalOrders
    ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100)
    : 0;

  return (
    <StatsGrid>

      {/* Revenue */}
      <StatsCard
        icon      = "💰"
        label     = "Total Revenue"
        value     = {Math.round(stats.totalRevenue || 0)}
        prefix    = "₹"
        delta     = {12}
        deltaSuffix="% vs last month"
        sub       = "From delivered orders only"
        subIcon   = "📦"
        sparkData = {revenueData}
        color     = "amber"
        loading   = {loading}
      />

      {/* Total orders */}
      <StatsCard
        icon      = "🛒"
        label     = "Total Orders"
        value     = {stats.totalOrders || 0}
        delta     = {8}
        deltaSuffix="% this week"
        sub       = {`${stats.pendingOrders || 0} orders pending`}
        subIcon   = "⏳"
        sparkData = {orderData}
        color     = "blue"
        loading   = {loading}
      />

      {/* Active users */}
      <StatsCard
        icon      = "👥"
        label     = "Customers"
        value     = {users}
        delta     = {5}
        deltaSuffix="% new this week"
        sub       = "Registered accounts"
        subIcon   = "📈"
        color     = "green"
        loading   = {loading}
      />

      {/* Products */}
      <StatsCard
        icon      = "🍽️"
        label     = "Menu Items"
        value     = {products}
        sub       = "Active food items"
        subIcon   = "✅"
        color     = "purple"
        loading   = {loading}
      />

      {/* Delivery rate */}
      <StatsCard
        icon          = "🚴"
        label         = "Delivery Rate"
        value         = {`${deliveryRate}%`}
        sub           = {`${stats.deliveredOrders || 0} of ${stats.totalOrders || 0} delivered`}
        subIcon       = "🎯"
        progress      = {deliveryRate}
        progressLabel = {`${deliveryRate}% delivered`}
        color         = "green"
        loading       = {loading}
        countUp       = {false}
      />

      {/* Pending */}
      <StatsCard
        icon    = "⏳"
        label   = "Pending Orders"
        value   = {stats.pendingOrders || 0}
        delta   = {stats.pendingOrders > 5 ? -(stats.pendingOrders) : null}
        deltaSuffix=" orders need action"
        sub     = "Placed, Confirmed, or Preparing"
        subIcon = "🔔"
        color   = {stats.pendingOrders > 10 ? 'red' : 'amber'}
        loading = {loading}
      />

    </StatsGrid>
  );
}

/* Default export is the single card */
export default StatsCard;