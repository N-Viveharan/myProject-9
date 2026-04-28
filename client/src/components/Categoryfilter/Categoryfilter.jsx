import { useRef, useEffect } from 'react';
import './CategoryFilter.css';

/* ── Category definitions ────────────────────────────────────── */
export const CATEGORIES = [
  { value: 'all',         label: 'All',         icon: '🍽️' },
  { value: 'Burgers',     label: 'Burgers',     icon: '🍔' },
  { value: 'Pizza',       label: 'Pizza',       icon: '🍕' },
  { value: 'Sushi',       label: 'Sushi',       icon: '🍣' },
  { value: 'Pasta',       label: 'Pasta',       icon: '🍝' },
  { value: 'Salads',      label: 'Salads',      icon: '🥗' },
  { value: 'Desserts',    label: 'Desserts',    icon: '🍰' },
  { value: 'Beverages',   label: 'Beverages',   icon: '🧃' },
  { value: 'Sandwiches',  label: 'Sandwiches',  icon: '🥪' },
  { value: 'Wraps',       label: 'Wraps',       icon: '🌯' },
  { value: 'Seafood',     label: 'Seafood',     icon: '🦐' },
  { value: 'Chicken',     label: 'Chicken',     icon: '🍗' },
  { value: 'Vegan',       label: 'Vegan',       icon: '🌱' },
  { value: 'Breakfast',   label: 'Breakfast',   icon: '🥞' },
  { value: 'Sides',       label: 'Sides',       icon: '🍟' },
  { value: 'Other',       label: 'Other',       icon: '✨' },
];

/* ── Component ───────────────────────────────────────────────── */

/**
 * CategoryFilter
 *
 * Props:
 *   selected   {string}          — currently active category value ('all' = no filter)
 *   onChange   {fn(value)}       — called when a chip is clicked
 *   counts     {object}          — { [categoryValue]: number } — optional item counts
 *   categories {array}           — override default list (same shape as CATEGORIES)
 *   layout     {'scroll'|'grid'|'vertical'} — default 'scroll'
 *   showCounts {boolean}         — show count badges (default true if counts provided)
 *   showLabel  {boolean}         — show "Categories" label row (default true)
 *   loading    {boolean}         — show skeleton chips
 *   className  {string}
 */
export default function CategoryFilter({
  selected    = 'all',
  onChange,
  counts      = {},
  categories  = CATEGORIES,
  layout      = 'scroll',
  showCounts  = true,
  showLabel   = true,
  loading     = false,
  className   = '',
}) {
  const trackRef    = useRef(null);
  const activeRef   = useRef(null);

  /* ── Auto-scroll active chip into view ─────────────────────── */
  useEffect(() => {
    if (activeRef.current && trackRef.current && layout === 'scroll') {
      const track  = trackRef.current;
      const chip   = activeRef.current;
      const chipL  = chip.offsetLeft;
      const chipW  = chip.offsetWidth;
      const trackW = track.offsetWidth;
      const scrollL= track.scrollLeft;

      // Centre the active chip if it's partly out of view
      if (chipL < scrollL || chipL + chipW > scrollL + trackW) {
        track.scrollTo({
          left:     chipL - trackW / 2 + chipW / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [selected, layout]);

  /* ── Skeleton ───────────────────────────────────────────────── */
  if (loading) {
    const skeletonWidths = [68, 82, 60, 90, 74, 80, 66];
    return (
      <div className={`category-filter ${className}`}>
        {showLabel && (
          <div className="category-filter__header">
            <span className="category-filter__label">Categories</span>
          </div>
        )}
        <div className="category-filter__scroll-wrap">
          <div className="category-filter__track" role="list">
            {skeletonWidths.map((w, i) => (
              <div
                key={i}
                className="category-filter__chip category-filter__chip--skeleton"
                style={{ width: w }}
                aria-hidden="true"
              >
                &nbsp;
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Total count across all categories ─────────────────────── */
  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className={[
        'category-filter',
        layout !== 'scroll' ? `category-filter--${layout}` : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* Header */}
      {showLabel && (
        <div className="category-filter__header">
          <span className="category-filter__label">Categories</span>
          {selected !== 'all' && (
            <button
              className="category-filter__clear"
              onClick={() => onChange?.('all')}
              aria-label="Clear category filter"
            >
              Clear filter ✕
            </button>
          )}
        </div>
      )}

      {/* Scroll wrapper */}
      <div className="category-filter__scroll-wrap">
        <div
          ref={trackRef}
          className="category-filter__track"
          role="list"
          aria-label="Food categories"
        >
          {categories.map((cat) => {
            const isActive  = selected === cat.value;
            const isAll     = cat.value === 'all';
            const count     = isAll ? totalCount : (counts[cat.value] ?? null);
            const showCount = showCounts && count !== null && count !== undefined;

            return (
              <button
                key={cat.value}
                ref={isActive ? activeRef : null}
                className={[
                  'category-filter__chip',
                  isActive ? 'category-filter__chip--active' : '',
                  isAll    ? 'category-filter__chip--all'    : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onChange?.(cat.value)}
                aria-pressed={isActive}
                aria-label={`${cat.label}${showCount ? `, ${count} items` : ''}`}
                role="listitem"
              >
                <span
                  className="category-filter__chip-icon"
                  aria-hidden="true"
                >
                  {cat.icon}
                </span>

                {cat.label}

                {showCount && (
                  <span
                    className="category-filter__chip-count"
                    aria-hidden="true"
                  >
                    {count > 999 ? '999+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}