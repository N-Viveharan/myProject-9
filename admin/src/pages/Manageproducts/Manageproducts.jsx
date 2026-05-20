import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, useParams } from 'react-router-dom';
import { UtensilsCrossed, ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import ProductTable from '../../components/ProductTable/ProductTable.jsx';
import ProductForm from '../../components/Productform/Productform.jsx';
import Spinner from '../../components/Spinner/Spinner.jsx';
import './Manageproducts.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/* ── Edit Product Wrapper ─────────────────────────────────────── */
function EditProductWrapper({ token, onSuccess, onClose }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/products/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch product');
        if (active) {
          setProduct(data.product);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Error loading product details');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="pf-overlay">
        <div className="pf-modal" style={{ padding: '2.5rem', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Spinner variant="dots" size="lg" label="Retrieving product details…" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pf-overlay">
        <div className="pf-modal" style={{ padding: '2rem', textAlign: 'center', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <p style={{ color: '#e74c3c', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </p>
          <button className="mp-btn mp-btn--primary" onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      product={product}
      token={token}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  );
}

/* ── ManageProducts Container ────────────────────────────────── */
export default function ManageProducts({ token }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ text: '', type: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 3500);
  };

  const handleEdit = (productId) => {
    navigate(`/admin/products/${productId}/edit`);
  };

  const handleSuccess = (savedProduct) => {
    showToast(
      savedProduct
        ? `Product "${savedProduct.name}" saved successfully!`
        : 'Product saved successfully!'
    );
    setRefreshKey((prev) => prev + 1);
    navigate('/admin/products');
  };

  return (
    <div className="manage-products">
      {/* ── Header ────────────────────────────────────── */}
      <header className="manage-products__header">
        <div className="manage-products__title-wrap">
          <h1 className="manage-products__title">
            <span aria-hidden="true"><UtensilsCrossed size={32} /></span> Products
          </h1>
          <p className="manage-products__subtitle">
            View, filter, and manage all catalog food items in real-time
          </p>
        </div>

        <div className="manage-products__actions">
          <button
            className="mp-btn mp-btn--secondary"
            onClick={() => navigate('/admin')}
            aria-label="Back to dashboard"
          >
            <span aria-hidden="true"><ArrowLeft size={16} /></span> Dashboard
          </button>
          <button
            className="mp-btn mp-btn--primary"
            onClick={() => navigate('/admin/products/new')}
            aria-label="Add new food item"
          >
            <span aria-hidden="true"><Plus size={16} /></span> Add Item
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="manage-products__body">
        {toast.text && (
          <div
            className={`mp-toast mp-toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {toast.text}
          </div>
        )}

        <ProductTable
          key={refreshKey}
          token={token}
          onEdit={handleEdit}
        />
      </div>

      <Routes>
        <Route
          path="new"
          element={
            <ProductForm
              token={token}
              onSuccess={handleSuccess}
              onClose={() => navigate('/admin/products')}
            />
          }
        />
        <Route
          path=":id/edit"
          element={
            <EditProductWrapper
              token={token}
              onSuccess={handleSuccess}
              onClose={() => navigate('/admin/products')}
            />
          }
        />
      </Routes>
    </div>
  );
}