import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import CategoryFilter, { CATEGORIES } from '../../components/CategoryFilter/CategoryFilter.jsx';
import SearchBar from '../../components/SearchBar/SearchBar.jsx';
import { SkeletonCards } from '../../components/Spinner/Spinner.jsx';
import './ProductListing.css';

const API    = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const LIMIT  = 12;

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'price_asc',      label: 'Price: Low to High' },
  { value: 'price_desc',     label: 'Price: High to Low' },
  { value: 'rating_desc',    label: 'Highest Rated' },
  { value: 'name_asc',       label: 'Name: A–Z' },
];

/* ── Sidebar filter panel (shared desktop + mobile) ──────────── */
function FilterPanel({ filters, onChange, onReset, onClose }) {
  return (
    <>
      {onClose && (
        <div className="listing-sidebar__close">
          <span>Filters</span>
          <button className="listing-sidebar__close-btn" onClick={onClose} aria-label="Close filters">✕</button>
        </div>
      )}

      {/* Sort */}
      <div className="listing-sidebar__section">
        <div className="listing-sidebar__title">Sort by</div>
        <select
          className="listing-sidebar__select"
          value={filters.sort}
          onChange={e => onChange('sort', e.target.value)}
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div className="listing-sidebar__section">
        <div className="listing-sidebar__title">Category</div>
        <CategoryFilter
          selected={filters.category}
          onChange={v => onChange('category', v)}
          layout="vertical"
          showLabel={false}
        />
      </div>

      {/* Price range */}
      <div className="listing-sidebar__section">
        <div className="listing-sidebar__title">Max price</div>
        <div className="listing-sidebar__range-labels">
          <span>₹0</span>
          <span>up to ₹{filters.maxPrice}</span>
        </div>
        <input
          type="range"
          className="price-range"
          min={0}
          max={2000}
          step={50}
          value={filters.maxPrice}
          onChange={e => onChange('maxPrice', Number(e.target.value))}
          aria-label={`Maximum price: ₹${filters.maxPrice}`}
        />
      </div>

      {/* Toggles */}
      <div className="listing-sidebar__section">
        <div className="listing-sidebar__title">Dietary</div>

        <label className="listing-sidebar__toggle">
          <span className="listing-sidebar__toggle-label">
            <span aria-hidden="true">🌱</span> Veg only
          </span>
          <div
            className={`listing-sidebar__switch${filters.isVeg ? ' listing-sidebar__switch--on' : ''}`}
            onClick={() => onChange('isVeg', !filters.isVeg)}
            role="switch"
            aria-checked={filters.isVeg}
            tabIndex={0}
            onKeyDown={e => { if (e.key === ' ') onChange('isVeg', !filters.isVeg); }}
          />
        </label>

        <label className="listing-sidebar__toggle">
          <span className="listing-sidebar__toggle-label">
            <span aria-hidden="true">⭐</span> Featured
          </span>
          <div
            className={`listing-sidebar__switch${filters.isFeatured ? ' listing-sidebar__switch--on' : ''}`}
            onClick={() => onChange('isFeatured', !filters.isFeatured)}
            role="switch"
            aria-checked={filters.isFeatured}
            tabIndex={0}
            onKeyDown={e => { if (e.key === ' ') onChange('isFeatured', !filters.isFeatured); }}
          />
        </label>
      </div>

      {/* Reset */}
      <div className="listing-sidebar__section">
        <button className="listing-sidebar__reset" onClick={onReset}>
          Reset all filters
        </button>
      </div>
    </>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Filter state (synced to URL) ────────────────────────── */
  const [filters, setFilters] = useState({
    search:     searchParams.get('search')     || '',
    category:   searchParams.get('category')   || 'all',
    sort:       searchParams.get('sort')        || 'createdAt_desc',
    maxPrice:   Number(searchParams.get('maxPrice')) || 2000,
    isVeg:      searchParams.get('isVeg')      === 'true',
    isFeatured: searchParams.get('isFeatured') === 'true',
  });

  const [products,   setProducts]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const abortRef = useRef(null);

  /* ── Fetch products ──────────────────────────────────────── */
  const fetchProducts = useCallback(async (f, p) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.set('page',  p);
    params.set('limit', LIMIT);
    if (f.search && f.search.trim())   params.set('search',   f.search.trim());
    if (f.category && f.category !== 'all') params.set('category', f.category);
    if (f.maxPrice < 2000)             params.set('maxPrice', f.maxPrice);
    if (f.isVeg)                       params.set('isVeg',    'true');
    if (f.isFeatured)                  params.set('isFeatured','true');
    const [sortField, sortDir] = f.sort.split('_');
    params.set('sort', `${sortField}_${sortDir}`);

    try {
      const res  = await fetch(`${API}/products?${params}`, { signal: abortRef.current.signal });
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.name !== 'AbortError') setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Sync URL and fetch on filter/page change ────────────── */
  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.search)              p.set('search',     filters.search);
    if (filters.category !== 'all')  p.set('category',   filters.category);
    if (filters.sort !== 'createdAt_desc') p.set('sort', filters.sort);
    if (filters.maxPrice < 2000)     p.set('maxPrice',   filters.maxPrice);
    if (filters.isVeg)               p.set('isVeg',      'true');
    if (filters.isFeatured)          p.set('isFeatured', 'true');
    setSearchParams(p, { replace: true });
    fetchProducts(filters, page);
  }, [filters, page, fetchProducts, setSearchParams]);

  /* ── Filter change handler ───────────────────────────────── */
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ search: '', category: 'all', sort: 'createdAt_desc', maxPrice: 2000, isVeg: false, isFeatured: false });
    setPage(1);
  };

  /* ── Live search suggestion fetch ───────────────────────── */
  const fetchSuggestions = async (q) => {
    const res  = await fetch(`${API}/products?search=${encodeURIComponent(q)}&limit=6`);
    const data = await res.json();
    return data.products || [];
  };

  /* ── Active filter chips ─────────────────────────────────── */
  const activeChips = [
    filters.search     && { key: 'search',     label: `"${filters.search}"` },
    filters.category !== 'all' && { key: 'category', label: filters.category },
    filters.maxPrice < 2000    && { key: 'maxPrice',  label: `up to ₹${filters.maxPrice}` },
    filters.isVeg      && { key: 'isVeg',      label: 'Veg only' },
    filters.isFeatured && { key: 'isFeatured', label: 'Featured' },
  ].filter(Boolean);

  /* ── Pagination ──────────────────────────────────────────── */
  const totalPages = Math.ceil(total / LIMIT);

  const pageTitle = filters.search
    ? `Results for "${filters.search}"`
    : filters.category !== 'all'
      ? filters.category
      : 'Our Full Menu';

  return (
    <div className="listing-page">

      {/* ── Page header ───────────────────────────────────── */}
      <header className="listing-page__header">
        <div className="listing-page__header-inner">
          <nav className="listing-page__breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span>Menu</span>
            {filters.category !== 'all' && (
              <>
                <span aria-hidden="true">›</span>
                <span>{filters.category}</span>
              </>
            )}
          </nav>
          <h1 className="listing-page__title">{pageTitle}</h1>
          <p className="listing-page__subtitle">
            {loading ? 'Loading…' : (
              <>Showing <strong>{total}</strong> {total === 1 ? 'item' : 'items'}</>
            )}
          </p>
        </div>
      </header>

      <div className="listing-page__body">

        {/* ── Desktop sidebar ──────────────────────────────── */}
        <aside className="listing-sidebar" aria-label="Filters">
          <FilterPanel filters={filters} onChange={handleFilterChange} onReset={resetFilters} />
        </aside>

        {/* ── Mobile sidebar overlay ────────────────────────── */}
        {mobileOpen && (
          <>
            <div className="listing-sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside className="listing-sidebar listing-sidebar--mobile" aria-label="Filters">
              <FilterPanel filters={filters} onChange={handleFilterChange} onReset={resetFilters} onClose={() => setMobileOpen(false)} />
            </aside>
          </>
        )}

        {/* ── Main content ─────────────────────────────────── */}
        <div className="listing-main">

          {/* Toolbar */}
          <div className="listing-toolbar">
            {/* Search bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchBar
                initialValue={filters.search}
                fetchSuggestions={fetchSuggestions}
                onSearch={q => handleFilterChange('search', q)}
                showButton={false}
                size="sm"
                placeholder="Search dishes…"
              />
            </div>

            {/* Mobile filter button */}
            <button
              className="listing-toolbar__filter-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open filters"
              aria-expanded={mobileOpen}
            >
              <span aria-hidden="true">⚙️</span> Filters
              {activeChips.length > 0 && (
                <span style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {activeChips.length}
                </span>
              )}
            </button>

            {/* Result count */}
            <span className="listing-toolbar__count" aria-live="polite" aria-atomic="true">
              {!loading && <><strong>{total}</strong> {total === 1 ? 'result' : 'results'}</>}
            </span>
          </div>

          {/* Category filter chips */}
          <div style={{ marginBottom: '1.25rem' }}>
            <CategoryFilter
              selected={filters.category}
              onChange={v => handleFilterChange('category', v)}
              layout="scroll"
              showLabel={false}
            />
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="listing-toolbar__chips" style={{ marginBottom: '1rem' }} role="list" aria-label="Active filters">
              {activeChips.map(chip => (
                <span key={chip.key} className="listing-toolbar__chip" role="listitem">
                  {chip.label}
                  <button
                    className="listing-toolbar__chip-remove"
                    onClick={() => {
                      if (chip.key === 'search')     handleFilterChange('search', '');
                      else if (chip.key === 'category')   handleFilterChange('category', 'all');
                      else if (chip.key === 'maxPrice')   handleFilterChange('maxPrice', 2000);
                      else if (chip.key === 'isVeg')      handleFilterChange('isVeg', false);
                      else if (chip.key === 'isFeatured') handleFilterChange('isFeatured', false);
                    }}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--pl-text-muted)', cursor: 'pointer', padding: '0 0.25rem' }}
                onClick={resetFilters}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product grid */}
          <div className="listing-grid" role="list" aria-label="Products">
            {loading ? (
              <SkeletonCards count={LIMIT} />
            ) : error ? (
              <div className="listing-empty" role="alert">
                <span className="listing-empty__icon">😕</span>
                <h2 className="listing-empty__title">Something went wrong</h2>
                <p className="listing-empty__desc">{error}</p>
                <button className="listing-empty__btn" onClick={() => fetchProducts(filters, page)}>
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="listing-empty">
                <span className="listing-empty__icon">🔍</span>
                <h2 className="listing-empty__title">No results found</h2>
                <p className="listing-empty__desc">
                  Try adjusting your filters or searching for something else.
                </p>
                <button className="listing-empty__btn" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              products.map(product => (
                <div key={product._id} role="listitem">
                  <ProductCard product={product} />
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <nav className="listing-pagination" aria-label="Pagination">
              <button
                className="listing-pagination__btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '0 0.25rem', color: 'var(--pl-text-muted)' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`listing-pagination__btn${page === p ? ' listing-pagination__btn--active' : ''}`}
                      onClick={() => setPage(p)}
                      aria-label={`Page ${p}`}
                      aria-current={page === p ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
                )
              }

              <button
                className="listing-pagination__btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                →
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}