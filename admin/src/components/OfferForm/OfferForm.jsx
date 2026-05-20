import { useState } from 'react';
import { X } from 'lucide-react';
import './OfferForm.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export default function OfferForm({ token, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    icon: '🎁',
    type: 'percent',
    value: '',
    headline: '',
    desc: '',
    minOrder: '',
    badge: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create offer');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-modal-overlay">
      <div className="offer-modal">
        <div className="offer-modal__header">
          <h2>Create New Offer</h2>
          <button className="offer-modal__close" onClick={onClose}><X size={24} /></button>
        </div>

        {error && <div className="offer-modal__error">{error}</div>}

        <form className="offer-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Coupon Code *</label>
            <input 
              type="text" 
              name="code" 
              value={formData.code} 
              onChange={handleChange} 
              placeholder="e.g. SUMMER20"
              required 
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Icon (Emoji)</label>
              <input 
                type="text" 
                name="icon" 
                value={formData.icon} 
                onChange={handleChange} 
                maxLength="2"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="percent">Percentage Off</option>
                <option value="flat">Flat Discount</option>
                <option value="ship">Free Shipping</option>
                <option value="feast">Combo / Feast</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Value String *</label>
            <input 
              type="text" 
              name="value" 
              value={formData.value} 
              onChange={handleChange} 
              placeholder="e.g. 20% OFF or ₹50 OFF"
              required 
            />
          </div>

          <div className="form-group">
            <label>Headline *</label>
            <input 
              type="text" 
              name="headline" 
              value={formData.headline} 
              onChange={handleChange} 
              placeholder="e.g. Weekend Special"
              required 
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea 
              name="desc" 
              value={formData.desc} 
              onChange={handleChange} 
              rows="3"
              placeholder="Detailed description of the offer..."
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Min. Order Amount</label>
              <input 
                type="text" 
                name="minOrder" 
                value={formData.minOrder} 
                onChange={handleChange} 
                placeholder="e.g. ₹500 (Optional)"
              />
            </div>
            <div className="form-group">
              <label>Badge Text</label>
              <input 
                type="text" 
                name="badge" 
                value={formData.badge} 
                onChange={handleChange} 
                placeholder="e.g. Most Popular (Optional)"
              />
            </div>
          </div>

          <div className="form-group-checkbox">
            <label>
              <input 
                type="checkbox" 
                name="isActive" 
                checked={formData.isActive} 
                onChange={handleChange} 
              />
              Offer is active and visible to customers
            </label>
          </div>

          <div className="offer-modal__actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
