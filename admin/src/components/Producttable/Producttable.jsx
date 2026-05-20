import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, Trash2, UtensilsCrossed, Search, 
  Frown, Star, Eye, Pencil, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import './ProductTable.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const LIMIT = 10;

const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CATEGORIES = [
  'All','Burgers','Pizza','Sushi','Pasta','Salads','Desserts',
  'Beverages','Sandwiches','Wraps','Seafood','Chicken','Vegan',
  'Breakfast','Sides','Other',
];

const BASE_URL = API.replace(/\/api\/?$/, '');
const getImageUrl = (url) => {
  if (!url) return '/placeholder-food.jpg';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return `${BASE_URL}${url}`;
  return url;
};

/* ── Sort icon ───────────────────────────────────────────────── */
function SortIcon({ field, sortBy, sortDir }) {
  const active = sortBy === field;
  return (
    <span className="pt-sort-icon" aria-hidden="true">
      <span className={active && sortDir === 'asc'  ? 'asc'  : ''} />
      <span className={active && sortDir === 'desc' ? 'desc' : ''} />
    </span>
  );
}

/* ── Stock bar ───────────────────────────────────────────────── */
function StockBar({ stock }) {
  const pct   = Math.min(100, (stock / 100) * 100);
  const level = stock > 50 ? 'high' : stock > 15 ? 'medium' : 'low';
  return (
    <div className="pt-stock">
      <span className={`pt-stock__label${level === 'low' ? ' pt-stock__label--low' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {stock} left{level === 'low' && <AlertTriangle size={12} />}
      </span>
      <div className="pt-stock__bar">
        <div className={`pt-stock__fill pt-stock__fill--${level}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Delete confirm modal ────────────────────────────────────── */
function DeleteModal({ product, onConfirm, onClose, loading }) {
  return (
    <div className="pt-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
      onClick={onClose}>
      <div className="pt-modal" onClick={(e) => e.stopPropagation()}>
        <span className="pt-modal__icon" aria-hidden="true"><Trash2 size={32} /></span>
        <h2 className="pt-modal__title">Delete product?</h2>
        <p className="pt-modal__desc">
          <span className="pt-modal__name">"{product.name}"</span> will be permanently removed
          from the catalogue. This cannot be undone.
        </p>
        <div className="pt-modal__actions">
          <button className="pt-modal__btn pt-modal__btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="pt-modal__btn pt-modal__btn--delete" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRODUCT TABLE
   ════════════════════════════════════════════════════════════ */

/**
 * ProductTable
 *
 * Props:
 *   token  {string}  — admin JWT
 *   onEdit {fn(id)}  — called when Edit is clicked
 */
export default function ProductTable({ token, onEdit }) {
  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  /* filters */
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('All');
  const [available,   setAvailable]   = useState('all');
  const [sortBy,      setSortBy]      = useState('createdAt');
  const [sortDir,     setSortDir]     = useState('desc');

  /* selection */
  const [selected,    setSelected]    = useState(new Set());

  /* modals */
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);

  const debounceRef = useRef(null);

  /* ── Fetch ───────────────────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, sort: `${sortBy}_${sortDir}` });
      if (search.trim())          params.set('search',   search.trim());
      if (category !== 'All')     params.set('category', category);
      if (available !== 'all')    params.set('isAvailable', available);

      const res  = await fetch(`${API}/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, category, available, sortBy, sortDir]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchProducts, search ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [fetchProducts]);

  /* ── Sort ────────────────────────────────────────────────── */
  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
    setPage(1);
  };

  /* ── Toggle availability ─────────────────────────────────── */
  const handleToggleAvail = async (product) => {
    const updated = { ...product, isAvailable: !product.isAvailable };
    setProducts((prev) => prev.map((p) => p._id === product._id ? updated : p));
    try {
      await fetch(`${API}/products/${product._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ isAvailable: updated.isAvailable }),
      });
    } catch {
      setProducts((prev) => prev.map((p) => p._id === product._id ? product : p));
    }
  };

  /* ── Toggle featured ─────────────────────────────────────── */
  const handleToggleFeatured = async (product) => {
    const updated = { ...product, isFeatured: !product.isFeatured };
    setProducts((prev) => prev.map((p) => p._id === product._id ? updated : p));
    try {
      await fetch(`${API}/products/${product._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ isFeatured: updated.isFeatured }),
      });
    } catch {
      setProducts((prev) => prev.map((p) => p._id === product._id ? product : p));
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/products/${deleteTarget._id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setProducts((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Could not delete product');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Bulk delete ─────────────────────────────────────────── */
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} selected products?`)) return;
    for (const id of selected) {
      await fetch(`${API}/products/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
    }
    fetchProducts();
  };

  /* ── Select all on page ──────────────────────────────────── */
  const allPageSelected = products.length > 0 && products.every((p) => selected.has(p._id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p._id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Pagination ──────────────────────────────────────────── */
  const totalPages = Math.ceil(total / LIMIT);
  const pageStart  = (page - 1) * LIMIT + 1;
  const pageEnd    = Math.min(page * LIMIT, total);

  const th = (label, field, extraClass = '') => (
    <th
      className={`sortable${sortBy === field ? ' sorted' : ''}${extraClass ? ` ${extraClass}` : ''}`}
      onClick={() => handleSort(field)}
      data-dir={sortDir}
      aria-sort={sortBy === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />
    </th>
  );

  return (
    <div className="product-table-wrap">

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="pt-toolbar">
        <span className="pt-toolbar__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UtensilsCrossed size={20} /> Food Items
          <span className="pt-toolbar__count">{total}</span>
        </span>

        <div className="pt-toolbar__spacer" />

        {/* Search */}
        <div className="pt-search">
          <input
            type="search"
            className="pt-search__input"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search products"
          />
          <span className="pt-search__icon" aria-hidden="true"><Search size={16} /></span>
        </div>

        {/* Category filter */}
        <select
          className="pt-select"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        {/* Availability filter */}
        <select
          className="pt-select"
          value={available}
          onChange={(e) => { setAvailable(e.target.value); setPage(1); }}
          aria-label="Filter by availability"
        >
          <option value="all">All status</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>

        {/* Add new */}
        <Link to="/admin/products/new" className="pt-btn pt-btn--primary">
          <Plus size={16} style={{ marginRight: '4px' }} /> Add Item
        </Link>
      </div>

      {/* ── Bulk action bar ──────────────────────────────── */}
      {selected.size > 0 && (
        <div className="pt-bulk-bar">
          <span className="pt-bulk-bar__count">{selected.size} selected</span>
          <div className="pt-bulk-bar__spacer" />
          <button className="pt-btn pt-btn--secondary" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
          <button className="pt-btn pt-btn--danger" onClick={handleBulkDelete}>
            <Trash2 size={16} style={{ marginRight: '4px' }} /> Delete selected
          </button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────── */}
      <div className="pt-table-container">
        <table className="pt-table" role="grid" aria-label="Food products">
          <thead>
            <tr>
              <th className="pt-check">
                <input
                  type="checkbox"
                  className="pt-checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all products on this page"
                />
              </th>
              {th('Product', 'name')}
              {th('Price',   'price')}
              {th('Stock',   'stock')}
              {th('Rating',  'rating')}
              <th>Available</th>
              <th>Featured</th>
              {th('Added',   'createdAt')}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              /* Skeleton rows */
              Array.from({ length: LIMIT }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }, (_, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ height: 16, width: j === 1 ? 160 : 60, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={9}>
                  <div className="pt-empty">
                    <span className="pt-empty__icon"><Frown size={48} /></span>
                    <p className="pt-empty__title">Failed to load products</p>
                    <p className="pt-empty__desc">{error}</p>
                    <button className="pt-btn pt-btn--secondary" onClick={fetchProducts}>
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="pt-empty">
                    <span className="pt-empty__icon"><UtensilsCrossed size={48} /></span>
                    <p className="pt-empty__title">No products found</p>
                    <p className="pt-empty__desc">
                      {search || category !== 'All'
                        ? 'Try adjusting your filters.'
                        : 'Add your first food item to get started.'}
                    </p>
                    <Link to="/admin/products/new" className="pt-btn pt-btn--primary">
                      <Plus size={16} style={{ marginRight: '4px' }} /> Add First Item
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isSelected = selected.has(product._id);
                return (
                  <tr
                    key={product._id}
                    className={isSelected ? 'selected' : ''}
                    aria-selected={isSelected}
                  >
                    {/* Checkbox */}
                    <td className="pt-check">
                      <input
                        type="checkbox"
                        className="pt-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(product._id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </td>

                    {/* Product */}
                    <td>
                      <div className="pt-product-cell">
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="pt-product-img"
                          loading="lazy"
                          onError={(e) => { e.target.src = '/placeholder-food.jpg'; }}
                        />
                        <div className="pt-product-info">
                          <span className="pt-product-name">{product.name}</span>
                          <span className="pt-product-cat">
                            <span
                              className={`pt-veg-dot pt-veg-dot--${product.isVeg ? 'veg' : 'nonveg'}`}
                              title={product.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
                              aria-label={product.isVeg ? 'Veg' : 'Non-veg'}
                            />
                            {' '}{product.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td>
                      <span className="pt-price">{fmt(product.price)}</span>
                    </td>

                    {/* Stock */}
                    <td><StockBar stock={product.stock ?? 0} /></td>

                    {/* Rating */}
                    <td>
                      {product.numReviews > 0 ? (
                        <div className="pt-rating">
                          <span className="pt-rating__stars"><Star size={12} fill="currentColor" /></span>
                          <span className="pt-rating__num">{product.rating?.toFixed(1)}</span>
                          <span className="pt-rating__count">({product.numReviews})</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--pt-text-muted)' }}>No reviews</span>
                      )}
                    </td>

                    {/* Available toggle */}
                    <td>
                      <button
                        className={`pt-toggle${product.isAvailable ? ' pt-toggle--on' : ''}`}
                        onClick={() => handleToggleAvail(product)}
                        aria-label={product.isAvailable ? 'Mark unavailable' : 'Mark available'}
                        aria-pressed={product.isAvailable}
                        title={product.isAvailable ? 'Available' : 'Unavailable'}
                      />
                    </td>

                    {/* Featured star */}
                    <td>
                      <button
                        className={`pt-featured-btn${product.isFeatured ? ' pt-featured-btn--on' : ''}`}
                        onClick={() => handleToggleFeatured(product)}
                        aria-label={product.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                        aria-pressed={product.isFeatured}
                        title={product.isFeatured ? 'Featured' : 'Not featured'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <Star size={18} color={product.isFeatured ? '#f5a623' : '#666'} fill={product.isFeatured ? '#f5a623' : 'transparent'} />
                      </button>
                    </td>

                    {/* Date added */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--pt-text-muted)' }}>
                      {new Date(product.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: '2-digit',
                      })}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="pt-row-actions">
                        <Link
                          to={`/products/${product._id}`}
                          target="_blank"
                          className="pt-row-btn pt-row-btn--view"
                          title="View on storefront"
                          aria-label={`View ${product.name} on storefront`}
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          className="pt-row-btn pt-row-btn--edit"
                          onClick={() => onEdit?.(product._id)}
                          title="Edit product"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="pt-row-btn pt-row-btn--delete"
                          onClick={() => setDeleteTarget(product)}
                          title="Delete product"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {!loading && total > LIMIT && (
        <div className="pt-pagination">
          <span className="pt-pagination__info">
            Showing <strong>{pageStart}–{pageEnd}</strong> of <strong>{total}</strong> products
          </span>

          <div className="pt-pagination__pages" role="navigation" aria-label="Table pages">
            <button
              className="pt-page-btn"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            ><ChevronLeft size={16} /></button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--pt-text-muted)', fontSize: '0.8rem' }}>…</span>
                ) : (
                  <button
                    key={p}
                    className={`pt-page-btn${page === p ? ' pt-page-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={page === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              className="pt-page-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            ><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* ── Delete modal ─────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Skeleton animation */}
      <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}