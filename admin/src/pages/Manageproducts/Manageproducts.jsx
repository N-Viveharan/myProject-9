import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductTable from '../../components/ProductTable/ProductTable.jsx';
import './Manageproducts.css';

/**
 * ManageProducts
 *
 * Props:
 *   token         {string}  — admin session token/ID
 */
export default function ManageProducts({ token }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ text: '', type: '' });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 3500);
  };

  const handleEdit = (productId) => {
    navigate(`/admin/products/${productId}/edit`);
  };

  return (
    <div className="manage-products">
      {/* ── Header ────────────────────────────────────── */}
      <header className="manage-products__header">
        <div className="manage-products__title-wrap">
          <h1 className="manage-products__title">
            <span aria-hidden="true">🍽️</span> Products
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
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <button
            className="mp-btn mp-btn--primary"
            onClick={() => navigate('/admin/products/new')}
            aria-label="Add new food item"
          >
            + Add Item
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
          token={token}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}