import './Spinner.css';

/* ═══════════════════════════════════════════════════════════════
   Spinner — FoodieExpress
   ---------------------------------------------------------------
   Variants:  'ring' | 'dots' | 'bars' | 'food' | 'pulse'
   Sizes:     'xs' | 'sm' | 'md' | 'lg' | 'xl'
   Modes:     default inline | 'block' | 'overlay' | 'page'

   Also exports:
     <SkeletonCards count />    — product-card grid placeholder
     <SkeletonList  count />    — list-row placeholder
   ═══════════════════════════════════════════════════════════════ */

/* ── Internal variant renderers ──────────────────────────────── */

function RingSpinner() {
  return <div className="spinner__ring spinner__ring--dual" aria-hidden="true" />;
}

function DotsSpinner() {
  return (
    <div className="spinner__dots" aria-hidden="true">
      <div className="spinner__dot" />
      <div className="spinner__dot" />
      <div className="spinner__dot" />
    </div>
  );
}

function BarsSpinner() {
  return (
    <div className="spinner__bars" aria-hidden="true">
      <div className="spinner__bar" />
      <div className="spinner__bar" />
      <div className="spinner__bar" />
      <div className="spinner__bar" />
      <div className="spinner__bar" />
    </div>
  );
}

function FoodSpinner() {
  return (
    <div className="spinner__food" aria-hidden="true">
      <div className="spinner__food-center">🍽️</div>
      <div className="spinner__food-orbit">
        <span className="spinner__food-orb">🍕</span>
      </div>
    </div>
  );
}

function PulseSpinner() {
  return <div className="spinner__pulse" aria-hidden="true" />;
}

const VARIANT_MAP = {
  ring:  RingSpinner,
  dots:  DotsSpinner,
  bars:  BarsSpinner,
  food:  FoodSpinner,
  pulse: PulseSpinner,
};

/* ── Main Spinner component ──────────────────────────────────── */
/**
 * Spinner
 *
 * Props:
 *   variant   {'ring'|'dots'|'bars'|'food'|'pulse'}  default: 'ring'
 *   size      {'xs'|'sm'|'md'|'lg'|'xl'}             default: 'md'
 *   mode      {'inline'|'block'|'overlay'|'page'}     default: 'inline'
 *   label     {string}    — accessible + visible text below spinner
 *   className {string}
 *
 * Examples:
 *   <Spinner />
 *   <Spinner variant="dots" size="sm" />
 *   <Spinner variant="food" size="lg" mode="page" label="Preparing your order…" />
 *   <Spinner mode="overlay" />   ← parent must have position:relative
 */
export default function Spinner({
  variant   = 'ring',
  size      = 'md',
  mode      = 'inline',
  label     = '',
  className = '',
}) {
  const VariantComponent = VARIANT_MAP[variant] ?? RingSpinner;

  const modeClass = mode !== 'inline' ? `spinner--${mode}` : '';

  return (
    <div
      className={[
        'spinner',
        `spinner--${size}`,
        modeClass,
        className,
      ].filter(Boolean).join(' ')}
      role="status"
      aria-label={label || 'Loading…'}
      aria-live="polite"
    >
      <VariantComponent />

      {label && (
        <span className="spinner__label" aria-hidden="true">
          {label}
        </span>
      )}

      {/* Screen-reader only text */}
      {!label && (
        <span className="sr-only">Loading…</span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SkeletonCards — product card grid placeholder
   ══════════════════════════════════════════════════════════════ */
/**
 * SkeletonCards
 *
 * Props:
 *   count {number}  — number of skeleton cards to render (default 8)
 *
 * Usage:
 *   {loading && <SkeletonCards count={12} />}
 */
export function SkeletonCards({ count = 8 }) {
  return (
    <div
      className="spinner-skeleton"
      role="status"
      aria-label="Loading products…"
      aria-busy="true"
    >
      <div className="spinner-skeleton__grid">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="spinner-skeleton__card"
            aria-hidden="true"
            style={{ animationDelay: `${(i % 4) * 0.08}s` }}
          >
            <div className="spinner-skeleton__img" />
            <div className="spinner-skeleton__body">
              <div className="spinner-skeleton__line spinner-skeleton__line--short" />
              <div className="spinner-skeleton__line spinner-skeleton__line--title" />
              <div className="spinner-skeleton__line spinner-skeleton__line--full" />
              <div className="spinner-skeleton__line spinner-skeleton__line--full" style={{ width: '85%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <div className="spinner-skeleton__line" style={{ width: '40%', height: '20px' }} />
                <div className="spinner-skeleton__line" style={{ width: '30%', height: '28px', borderRadius: '50px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading products, please wait…</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SkeletonList — order / user list row placeholder
   ══════════════════════════════════════════════════════════════
/**
 * SkeletonList
 *
 * Props:
 *   count {number}  — rows to render (default 5)
 *
 * Usage:
 *   {loading && <SkeletonList count={10} />}
 */
export function SkeletonList({ count = 5 }) {
  return (
    <div
      className="spinner-skeleton"
      role="status"
      aria-label="Loading list…"
      aria-busy="true"
    >
      <div className="spinner-skeleton__list">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="spinner-skeleton__row"
            aria-hidden="true"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <div className="spinner-skeleton__avatar" />
            <div className="spinner-skeleton__lines">
              <div className="spinner-skeleton__line spinner-skeleton__line--title" style={{ width: `${55 + (i % 3) * 15}%` }} />
              <div className="spinner-skeleton__line" style={{ width: `${35 + (i % 4) * 10}%` }} />
            </div>
            <div className="spinner-skeleton__line" style={{ width: 60, height: 28, borderRadius: '50px' }} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading list, please wait…</span>
    </div>
  );
}
