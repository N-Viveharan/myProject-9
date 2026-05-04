import { useState, useEffect, useRef, useCallback } from 'react';
import './ProductForm.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/* ── Category definitions ────────────────────────────────────── */
const CATEGORIES = [
  { value: 'Burgers',    icon: '🍔', label: 'Burgers' },
  { value: 'Pizza',      icon: '🍕', label: 'Pizza' },
  { value: 'Sushi',      icon: '🍣', label: 'Sushi' },
  { value: 'Pasta',      icon: '🍝', label: 'Pasta' },
  { value: 'Salads',     icon: '🥗', label: 'Salads' },
  { value: 'Desserts',   icon: '🍰', label: 'Desserts' },
  { value: 'Beverages',  icon: '🧃', label: 'Beverages' },
  { value: 'Sandwiches', icon: '🥪', label: 'Sandwiches' },
  { value: 'Wraps',      icon: '🌯', label: 'Wraps' },
  { value: 'Seafood',    icon: '🦐', label: 'Seafood' },
  { value: 'Chicken',    icon: '🍗', label: 'Chicken' },
  { value: 'Vegan',      icon: '🌱', label: 'Vegan' },
  { value: 'Breakfast',  icon: '🥞', label: 'Breakfast' },
  { value: 'Sides',      icon: '🍟', label: 'Sides' },
  { value: 'Other',      icon: '✨', label: 'Other' },
];

/* ── Blank form state ────────────────────────────────────────── */
const BLANK = {
  name:            '',
  description:     '',
  price:           '',
  category:        '',
  stock:           100,
  calories:        '',
  preparationTime: 20,
  isVeg:           false,
  isFeatured:      false,
  isAvailable:     true,
  imageUrl:        '',
};

/* ── Validation ──────────────────────────────────────────────── */
const validate = (form, imageFile, isEdit) => {
  const errs = {};
  if (!form.name.trim())                         errs.name        = 'Product name is required';
  else if (form.name.trim().length < 3)          errs.name        = 'Name must be at least 3 characters';
  if (!form.description.trim())                  errs.description = 'Description is required';
  else if (form.description.trim().length < 10)  errs.description = 'Description must be at least 10 characters';
  if (!form.price || isNaN(form.price) || Number(form.price) <= 0)
                                                 errs.price       = 'Enter a valid price greater than 0';
  if (!form.category)                            errs.category    = 'Select a category';
  if (!isEdit && !imageFile && !form.imageUrl.trim())
                                                 errs.image       = 'Upload an image or paste an image URL';
  if (form.stock !== '' && (isNaN(form.stock) || Number(form.stock) < 0))
                                                 errs.stock       = 'Stock must be 0 or more';
  return errs;
};

/* ════════════════════════════════════════════════════════════
   PRODUCT FORM MODAL
   ════════════════════════════════════════════════════════════ */

/**
 * ProductForm
 *
 * Props:
 *   product    {object|null}  — null = add mode, object = edit mode
 *   token      {string}
 *   onSuccess  {fn(product)}  — called with saved product on success
 *   onClose    {fn}
 */
export default function ProductForm({ product = null, token, onSuccess, onClose }) {
  const isEdit  = Boolean(product?._id);
  const fileRef = useRef(null);

  const [form,       setForm]       = useState({ ...BLANK, ...(product || {}) });
  const [imageFile,  setImageFile]  = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image || '');
  const [dragOver,   setDragOver]   = useState(false);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [banner,     setBanner]     = useState({ text: '', type: '' });
  const [showUrlInput, setShowUrlInput] = useState(false);

  /* ── ESC to close ────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  /* ── Field change ────────────────────────────────────────── */
  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = {...e}; delete n[key]; return n; });
    setBanner({ text: '', type: '' });
  };

  /* ── Image file selection ────────────────────────────────── */
  const handleFileChange = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    handleChange('imageUrl', '');
    if (errors.image) setErrors((e) => { const n = {...e}; delete n.image; return n; });
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }, []); // eslint-disable-line

  const handleImageUrlChange = (url) => {
    handleChange('imageUrl', url);
    setImagePreview(url);
    setImageFile(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setForm((f) => ({ ...f, imageUrl: '' }));
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, imageFile, isEdit);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setBanner({ text: '', type: '' });

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) formData.append(k, v);
      });
      if (imageFile) formData.append('image', imageFile);

      const url    = isEdit ? `${API}/products/${product._id}` : `${API}/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');

      setBanner({ text: isEdit ? 'Product updated successfully!' : 'Product created!', type: 'success' });
      setTimeout(() => { onSuccess?.(data.product); }, 800);
    } catch (err) {
      setBanner({ text: err.message || 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const price = Number(form.price);

  return (
    <div className="pf-overlay" role="dialog" aria-modal="true"
      aria-label={isEdit ? 'Edit product' : 'Add new product'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="pf-modal">

        {/* ── Header ────────────────────────────────────── */}
        <div className="pf-header">
          <h2 className="pf-header__title">
            <span aria-hidden="true">{isEdit ? '✏️' : '➕'}</span>
            {isEdit ? `Edit: ${product.name}` : 'Add New Food Item'}
          </h2>
          <button className="pf-header__close" onClick={onClose} aria-label="Close form">✕</button>
        </div>

        {/* ── Error / success banner ────────────────────── */}
        {banner.text && (
          <div className={`pf-banner pf-banner--${banner.type}`} role={banner.type === 'error' ? 'alert' : 'status'}>
            <span aria-hidden="true">{banner.type === 'error' ? '⚠️' : '✅'}</span>
            {banner.text}
          </div>
        )}

        {/* ── Body ──────────────────────────────────────── */}
        <form className="pf-body" onSubmit={handleSubmit} noValidate id="pf-form">

          {/* ── Basic info ────────────────────────────── */}
          <div className="pf-section">
            <div className="pf-section-title">📋 Basic Information</div>

            <div className="pf-group">
              <label htmlFor="pf-name" className="pf-label">
                <span>Product Name <span className="pf-label__required">*</span></span>
                <span className={`pf-label__count${form.name.length > 90 ? ' pf-label__count--warn' : ''}`}>
                  {form.name.length}/100
                </span>
              </label>
              <input
                id="pf-name"
                type="text"
                className={`pf-input${errors.name ? ' pf-input--error' : ''}`}
                placeholder="e.g. Butter Chicken Biryani"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                maxLength={100}
                autoFocus
                aria-describedby={errors.name ? 'pf-name-err' : undefined}
              />
              {errors.name && <span id="pf-name-err" className="pf-field-error" role="alert">⚠ {errors.name}</span>}
            </div>

            <div className="pf-group">
              <label htmlFor="pf-desc" className="pf-label">
                <span>Description <span className="pf-label__required">*</span></span>
                <span className={`pf-label__count${form.description.length > 900 ? ' pf-label__count--warn' : ''}`}>
                  {form.description.length}/1000
                </span>
              </label>
              <textarea
                id="pf-desc"
                className={`pf-textarea${errors.description ? ' pf-input--error' : ''}`}
                placeholder="Describe the dish — ingredients, taste, origin…"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                maxLength={1000}
                aria-describedby={errors.description ? 'pf-desc-err' : undefined}
              />
              {errors.description && <span id="pf-desc-err" className="pf-field-error" role="alert">⚠ {errors.description}</span>}
            </div>
          </div>

          {/* ── Category ──────────────────────────────── */}
          <div className="pf-section">
            <div className="pf-section-title">🏷️ Category <span style={{ color: 'var(--pf-accent)' }}>*</span></div>
            <div className="pf-category-grid" role="radiogroup" aria-label="Select category">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`pf-category-chip${form.category === cat.value ? ' pf-category-chip--active' : ''}`}
                  onClick={() => handleChange('category', cat.value)}
                  aria-pressed={form.category === cat.value}
                  aria-label={cat.label}
                >
                  <span className="pf-category-chip__icon" aria-hidden="true">{cat.icon}</span>
                  <span className="pf-category-chip__label">{cat.label}</span>
                </button>
              ))}
            </div>
            {errors.category && <span className="pf-field-error" role="alert">⚠ {errors.category}</span>}
          </div>

          {/* ── Pricing & stock ───────────────────────── */}
          <div className="pf-section">
            <div className="pf-section-title">💰 Pricing & Availability</div>

            <div className="pf-row pf-row--3">
              {/* Price */}
              <div className="pf-group">
                <label htmlFor="pf-price" className="pf-label">
                  Price <span className="pf-label__required">*</span>
                </label>
                <div className="pf-price-wrap">
                  <span className="pf-price-prefix" aria-hidden="true">₹</span>
                  <input
                    id="pf-price"
                    type="number"
                    className={`pf-input pf-input--price${errors.price ? ' pf-input--error' : ''}`}
                    placeholder="299"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    min={0}
                    step={0.01}
                  />
                </div>
                {errors.price && <span className="pf-field-error" role="alert">⚠ {errors.price}</span>}
                {price > 0 && !errors.price && (
                  <span className="pf-price-preview" aria-live="polite">
                    ₹{price.toLocaleString('en-IN')}
                    {price >= 500 ? ' · Free delivery' : ' · + ₹40 delivery'}
                  </span>
                )}
              </div>

              {/* Stock */}
              <div className="pf-group">
                <label htmlFor="pf-stock" className="pf-label">Stock</label>
                <input
                  id="pf-stock"
                  type="number"
                  className={`pf-input${errors.stock ? ' pf-input--error' : ''}`}
                  placeholder="100"
                  value={form.stock}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  min={0}
                />
                {errors.stock && <span className="pf-field-error" role="alert">⚠ {errors.stock}</span>}
              </div>

              {/* Prep time */}
              <div className="pf-group">
                <label htmlFor="pf-prep" className="pf-label">Prep Time (min)</label>
                <input
                  id="pf-prep"
                  type="number"
                  className="pf-input"
                  placeholder="20"
                  value={form.preparationTime}
                  onChange={(e) => handleChange('preparationTime', e.target.value)}
                  min={1}
                  max={240}
                />
              </div>
            </div>

            {/* Calories */}
            <div className="pf-row pf-row--2">
              <div className="pf-group">
                <label htmlFor="pf-cal" className="pf-label">Calories (kcal)</label>
                <input
                  id="pf-cal"
                  type="number"
                  className="pf-input"
                  placeholder="Optional"
                  value={form.calories}
                  onChange={(e) => handleChange('calories', e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Toggle switches */}
            <div className="pf-toggles">
              {[
                { key: 'isVeg',       icon: '🌱', label: 'Vegetarian'   },
                { key: 'isFeatured',  icon: '⭐', label: 'Featured'     },
                { key: 'isAvailable', icon: '✅', label: 'Available'    },
              ].map(({ key, icon, label }) => (
                <div
                  key={key}
                  className={`pf-toggle-item${form[key] ? ' pf-toggle-item--on' : ''}`}
                  onClick={() => handleChange(key, !form[key])}
                  role="switch"
                  aria-checked={form[key]}
                  aria-label={label}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); handleChange(key, !form[key]); } }}
                >
                  <span aria-hidden="true">{icon}</span>
                  <span className="pf-toggle-item__label">{label}</span>
                  <div className={`pf-switch${form[key] ? ' pf-switch--on' : ''}`} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>

          {/* ── Image ─────────────────────────────────── */}
          <div className="pf-section">
            <div className="pf-section-title">🖼️ Product Image <span style={{ color: isEdit ? 'var(--pf-text-muted)' : 'var(--pf-accent)' }}>{isEdit ? '(optional)' : '*'}</span></div>

            {imagePreview ? (
              <div className="pf-image-preview">
                <img src={imagePreview} alt="Preview" onError={() => setImagePreview('')} />
                <button className="pf-image-preview__remove" onClick={removeImage} type="button" aria-label="Remove image">✕</button>
              </div>
            ) : (
              <div
                className={`pf-image-zone${dragOver ? ' pf-image-zone--drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                role="button"
                aria-label="Upload image by clicking or dragging"
                tabIndex={0}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  aria-label="Choose image file"
                />
                <span className="pf-image-zone__icon" aria-hidden="true">📷</span>
                <span className="pf-image-zone__title">
                  Drag & drop or <span className="pf-image-zone__accent">click to browse</span>
                </span>
                <span className="pf-image-zone__sub">JPEG, PNG, WebP · Recommended 800×800px</span>
              </div>
            )}

            {/* URL alternative */}
            <div className="pf-image-url-row">
              <button
                type="button"
                style={{ background:'none',border:'none',color:'var(--pf-text-muted)',cursor:'pointer',fontSize:'0.72rem',fontFamily:'var(--pf-font)' }}
                onClick={() => setShowUrlInput((v) => !v)}
              >
                {showUrlInput ? 'Hide URL input' : 'Use image URL instead'}
              </button>
            </div>

            {showUrlInput && (
              <div className="pf-group">
                <label htmlFor="pf-imgurl" className="pf-label">Image URL</label>
                <input
                  id="pf-imgurl"
                  type="url"
                  className="pf-input"
                  placeholder="https://example.com/food.jpg"
                  value={form.imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                />
              </div>
            )}

            {errors.image && <span className="pf-field-error" role="alert">⚠ {errors.image}</span>}
          </div>
        </form>

        {/* ── Footer ────────────────────────────────────── */}
        <div className="pf-footer">
          <span className="pf-footer__left">
            <span aria-hidden="true">🔒</span>
            Changes saved instantly after submission
          </span>
          <div className="pf-footer__actions">
            <button className="pf-btn pf-btn--cancel" onClick={onClose} type="button" disabled={submitting}>
              Cancel
            </button>
            <button
              className="pf-btn pf-btn--submit"
              type="submit"
              form="pf-form"
              disabled={submitting}
              aria-label={isEdit ? 'Save changes' : 'Create product'}
            >
              {submitting ? (
                <>
                  <div className="pf-btn__spinner" aria-hidden="true" />
                  {isEdit ? 'Saving…' : 'Creating…'}
                </>
              ) : (
                <>
                  <span aria-hidden="true">{isEdit ? '💾' : '➕'}</span>
                  {isEdit ? 'Save Changes' : 'Create Product'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}