import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import './Settings.css';

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`set-toast set-toast--${type}`} role="alert" aria-live="polite">
      <span aria-hidden="true">{type === 'success' ? '✅' : '⚠️'}</span> {msg}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({
    shopName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    operatingHours: '',
    socialLinks: { facebook: '', instagram: '', twitter: '' }
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/settings');
      if (data) {
        setSettings({
          shopName: data.shopName || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          address: data.address || '',
          operatingHours: data.operatingHours || '',
          socialLinks: data.socialLinks || { facebook: '', instagram: '', twitter: '' }
        });
        if (data.logo) {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
          setLogoPreview(data.logo.startsWith('http') ? data.logo : `${API_BASE.replace('/api', '')}${data.logo}`);
        }
      }
    } catch (err) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [name]: value }
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('shopName', settings.shopName);
      formData.append('contactEmail', settings.contactEmail);
      formData.append('contactPhone', settings.contactPhone);
      formData.append('address', settings.address);
      formData.append('operatingHours', settings.operatingHours);
      formData.append('socialLinks', JSON.stringify(settings.socialLinks));
      if (logoFile) {
        formData.append('logoFile', logoFile);
      }

      const res = await api.put('/settings', formData);
      showToast('Settings saved successfully!');
      if (res.logo) {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
          setLogoPreview(res.logo.startsWith('http') ? res.logo : `${API_BASE.replace('/api', '')}${res.logo}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="set-loading">Loading Settings...</div>;
  }

  return (
    <div className="settings-page">
      <header className="set-header">
        <h1>⚙️ Store Settings</h1>
        <p>Manage your global store information, contact details, and appearance.</p>
      </header>

      <Toast msg={toast.msg} type={toast.type} />

      <form className="set-form-container" onSubmit={handleSave}>
        
        {/* BRAND & IDENTITY */}
        <section className="set-section">
          <h2>Brand & Identity</h2>
          <div className="set-form-group">
            <label htmlFor="shopName">Shop Name</label>
            <input type="text" id="shopName" name="shopName" value={settings.shopName} onChange={handleChange} placeholder="e.g. FoodieExpress" />
          </div>
          <div className="set-form-group logo-group">
            <label>Store Logo</label>
            <div className="logo-upload-wrapper">
              <div className="logo-preview-box">
                {logoPreview ? <img src={logoPreview} alt="Logo Preview" /> : <div className="no-logo">No Logo</div>}
              </div>
              <input type="file" id="logoFile" accept="image/*" onChange={handleLogoChange} className="file-input" />
              <label htmlFor="logoFile" className="upload-btn">Upload New Logo</label>
            </div>
          </div>
        </section>

        {/* CONTACT INFO */}
        <section className="set-section">
          <h2>Contact Information</h2>
          <div className="set-form-row">
            <div className="set-form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input type="email" id="contactEmail" name="contactEmail" value={settings.contactEmail} onChange={handleChange} placeholder="contact@example.com" />
            </div>
            <div className="set-form-group">
              <label htmlFor="contactPhone">Contact Phone</label>
              <input type="tel" id="contactPhone" name="contactPhone" value={settings.contactPhone} onChange={handleChange} placeholder="+1 234 567 890" />
            </div>
          </div>
          <div className="set-form-group">
            <label htmlFor="address">Business Address</label>
            <textarea id="address" name="address" value={settings.address} onChange={handleChange} placeholder="123 Street Name, City, Country" rows="3" />
          </div>
          <div className="set-form-group">
            <label htmlFor="operatingHours">Operating Hours</label>
            <input type="text" id="operatingHours" name="operatingHours" value={settings.operatingHours} onChange={handleChange} placeholder="Mon-Sun: 9AM - 10PM" />
          </div>
        </section>

        {/* SOCIAL MEDIA */}
        <section className="set-section">
          <h2>Social Media Links</h2>
          <div className="set-form-group">
            <label htmlFor="facebook">Facebook URL</label>
            <input type="url" id="facebook" name="facebook" value={settings.socialLinks.facebook} onChange={handleSocialChange} placeholder="https://facebook.com/yourpage" />
          </div>
          <div className="set-form-group">
            <label htmlFor="instagram">Instagram URL</label>
            <input type="url" id="instagram" name="instagram" value={settings.socialLinks.instagram} onChange={handleSocialChange} placeholder="https://instagram.com/yourpage" />
          </div>
          <div className="set-form-group">
            <label htmlFor="twitter">Twitter URL</label>
            <input type="url" id="twitter" name="twitter" value={settings.socialLinks.twitter} onChange={handleSocialChange} placeholder="https://twitter.com/yourpage" />
          </div>
        </section>

        <div className="set-actions">
          <button type="submit" className="set-save-btn" disabled={saving}>
            {saving ? (
              <><span className="set-spinner" aria-hidden="true" /> Saving...</>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
