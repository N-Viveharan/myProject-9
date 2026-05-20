import { useState, useEffect, useCallback } from 'react';
import { Plus, Gift, Trash2 } from 'lucide-react';
import Spinner from '../../components/Spinner/Spinner.jsx';
import OfferForm from '../../components/OfferForm/OfferForm.jsx';
import './ManageOffers.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export default function ManageOffers({ token }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/offers/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch offers');
      setOffers(data.offers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      const res = await fetch(`${API}/offers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete offer');
      fetchOffers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    fetchOffers();
  };

  return (
    <div className="manage-offers page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Gift size={28} color="var(--mo-accent)" /> Manage Offers</h1>
          <p className="page-subtitle">Create and manage discount coupons and promotions</p>
        </div>
        <button className="mo-btn-add" onClick={() => setShowForm(true)}>
          <span aria-hidden="true"><Plus size={16} /></span> Create Offer
        </button>
      </div>

      {loading ? (
        <Spinner variant="food" label="Loading offers..." />
      ) : error ? (
        <div className="mo-error">{error}</div>
      ) : offers.length === 0 ? (
        <div className="mo-empty">
          <span className="mo-empty-icon"><Gift size={48} /></span>
          <h3>No offers found</h3>
          <p>Create a new offer to boost sales!</p>
        </div>
      ) : (
        <div className="mo-grid">
          {offers.map(offer => (
            <div key={offer._id} className={`mo-card ${!offer.isActive ? 'mo-card--inactive' : ''}`}>
              <div className="mo-card__header">
                <div className="mo-card__icon">{offer.icon}</div>
                <div className="mo-card__badge">{offer.type}</div>
              </div>
              <h3 className="mo-card__value">{offer.value}</h3>
              <div className="mo-card__title">{offer.headline}</div>
              <p className="mo-card__desc">{offer.desc}</p>
              
              <div className="mo-card__meta">
                <span>Code: <strong>{offer.code}</strong></span>
                {offer.minOrder && <span>Min Order: <strong>{offer.minOrder}</strong></span>}
                {offer.badge && <span className="mo-card__highlight">{offer.badge}</span>}
              </div>

              <div className="mo-card__actions">
                <span className={`mo-status ${offer.isActive ? 'mo-status--active' : 'mo-status--inactive'}`}>
                  {offer.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="mo-btn-delete" onClick={() => handleDelete(offer._id)}>
                  <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <OfferForm token={token} onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
