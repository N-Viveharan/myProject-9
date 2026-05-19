import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import './Profile.css';

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

/* ── Inline toast helper ─────────────────────────────────────── */
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`profile-toast profile-toast--${type}`} role="alert" aria-live="polite">
      <span aria-hidden="true">{type === 'success' ? '✅' : '⚠️'}</span> {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, updateProfile, changePassword } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('info');

  /* ── Toast state ──────────────────────────────────────────── */
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  /* ── Personal info form ───────────────────────────────────── */
  const [infoForm,    setInfoForm]    = useState({ name: '', phone: '' });
  const [infoSaving,  setInfoSaving]  = useState(false);

  /* ── Address form ─────────────────────────────────────────── */
  const [addrForm,    setAddrForm]    = useState({ street: '', city: '', state: '', zipCode: '', country: 'India' });
  const [addrSaving,  setAddrSaving]  = useState(false);

  /* ── Password form ────────────────────────────────────────── */
  const [pwForm,      setPwForm]      = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwVisible,   setPwVisible]   = useState({ cur: false, new: false, con: false });

  /* Populate forms from user object */
  useEffect(() => {
    if (user) {
      setInfoForm({ name: user.name || '', phone: user.phone || '' });
      setAddrForm({
        street:  user.address?.street  || '',
        city:    user.address?.city    || '',
        state:   user.address?.state   || '',
        zipCode: user.address?.zipCode || '',
        country: user.address?.country || 'India',
      });
    }
  }, [user]);

  /* Redirect if not logged in */
  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/profile');
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return null;

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleInfoSave = async (e) => {
    e.preventDefault();
    if (!infoForm.name.trim()) return showToast('Name is required.', 'error');
    setInfoSaving(true);
    const res = await updateProfile({ name: infoForm.name.trim(), phone: infoForm.phone.trim() });
    setInfoSaving(false);
    res.success ? showToast('Profile updated successfully!') : showToast(res.message, 'error');
  };

  const handleAddrSave = async (e) => {
    e.preventDefault();
    setAddrSaving(true);
    const res = await updateProfile({ address: addrForm });
    setAddrSaving(false);
    res.success ? showToast('Address saved!') : showToast(res.message, 'error');
  };

  const handlePwSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) return showToast('New password must be at least 6 characters.', 'error');
    if (pwForm.newPassword !== pwForm.confirmPassword) return showToast('Passwords do not match.', 'error');
    setPwSaving(true);
    const res = await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
    setPwSaving(false);
    if (res.success) {
      showToast('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      showToast(res.message, 'error');
    }
  };

  const TABS = [
    { id: 'info',    icon: '👤', label: 'Personal Info' },
    { id: 'address', icon: '📍', label: 'Address'       },
    { id: 'security',icon: '🔒', label: 'Security'      },
  ];

  return (
    <main className="profile-page">

      {/* ── Hero / banner ──────────────────────────────────────── */}
      <div className="profile-hero" aria-hidden="false">
        <div className="profile-hero__bg" aria-hidden="true" />
        <div className="profile-hero__grain" aria-hidden="true" />
        <div className="profile-hero__inner">
          <div className="profile-avatar" aria-label={`Avatar for ${user.name}`}>
            {getInitials(user.name)}
          </div>
          <div className="profile-hero__info">
            <h1 className="profile-hero__name">{user.name}</h1>
            <p className="profile-hero__email">{user.email}</p>
            <div className="profile-hero__meta">
              <span className={`profile-hero__role profile-hero__role--${user.role}`}>
                {user.role === 'admin' ? '⚙️ Admin' : '🍽️ Customer'}
              </span>
              {user.createdAt && (
                <span className="profile-hero__since">
                  Member since {fmt(user.createdAt)}
                </span>
              )}
            </div>
          </div>

          <div className="profile-hero__actions">
            <Link to="/orders" className="profile-hero__btn">
              <span aria-hidden="true">📦</span> My Orders
            </Link>
            <Link to="/products" className="profile-hero__btn profile-hero__btn--ghost">
              <span aria-hidden="true">🍽️</span> Explore Menu
            </Link>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="profile-body">

        {/* Tab nav */}
        <nav className="profile-tabs" role="tablist" aria-label="Profile sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`profile-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Toast */}
        <Toast msg={toast.msg} type={toast.type} />

        {/* ── Personal Info panel ─────────────────────────────── */}
        {activeTab === 'info' && (
          <section
            id="panel-info"
            role="tabpanel"
            aria-labelledby="tab-info"
            className="profile-panel"
          >
            <div className="profile-card">
              <h2 className="profile-card__title">
                <span aria-hidden="true">👤</span> Personal Information
              </h2>
              <p className="profile-card__sub">Update your name and phone number.</p>

              <form onSubmit={handleInfoSave} className="profile-form" noValidate>
                <div className="profile-form__group">
                  <label htmlFor="profile-name" className="profile-form__label">
                    Full Name <span aria-hidden="true" className="profile-form__req">*</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    className="profile-form__input"
                    value={infoForm.name}
                    onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div className="profile-form__group">
                  <label htmlFor="profile-email" className="profile-form__label">
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    className="profile-form__input profile-form__input--readonly"
                    value={user.email}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="email-hint"
                  />
                  <p id="email-hint" className="profile-form__hint">Email cannot be changed.</p>
                </div>

                <div className="profile-form__group">
                  <label htmlFor="profile-phone" className="profile-form__label">
                    Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    className="profile-form__input"
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="profile-form__footer">
                  <button
                    type="submit"
                    className="profile-form__save-btn"
                    disabled={infoSaving}
                    aria-label="Save personal info"
                  >
                    {infoSaving ? (
                      <><span className="profile-form__spinner" aria-hidden="true" /> Saving…</>
                    ) : (
                      <><span aria-hidden="true">✓</span> Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── Address panel ───────────────────────────────────── */}
        {activeTab === 'address' && (
          <section
            id="panel-address"
            role="tabpanel"
            aria-labelledby="tab-address"
            className="profile-panel"
          >
            <div className="profile-card">
              <h2 className="profile-card__title">
                <span aria-hidden="true">📍</span> Delivery Address
              </h2>
              <p className="profile-card__sub">
                Your saved address will be pre-filled at checkout.
              </p>

              <form onSubmit={handleAddrSave} className="profile-form" noValidate>
                <div className="profile-form__group">
                  <label htmlFor="addr-street" className="profile-form__label">Street / Flat</label>
                  <input
                    id="addr-street"
                    type="text"
                    className="profile-form__input"
                    value={addrForm.street}
                    onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                    placeholder="123 MG Road, Flat 4B"
                  />
                </div>

                <div className="profile-form__row">
                  <div className="profile-form__group">
                    <label htmlFor="addr-city" className="profile-form__label">City</label>
                    <input
                      id="addr-city"
                      type="text"
                      className="profile-form__input"
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div className="profile-form__group">
                    <label htmlFor="addr-state" className="profile-form__label">State</label>
                    <input
                      id="addr-state"
                      type="text"
                      className="profile-form__input"
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                      placeholder="Maharashtra"
                    />
                  </div>
                </div>

                <div className="profile-form__row">
                  <div className="profile-form__group">
                    <label htmlFor="addr-zip" className="profile-form__label">PIN Code</label>
                    <input
                      id="addr-zip"
                      type="text"
                      className="profile-form__input"
                      value={addrForm.zipCode}
                      onChange={(e) => setAddrForm({ ...addrForm, zipCode: e.target.value })}
                      placeholder="400001"
                      maxLength={6}
                    />
                  </div>
                  <div className="profile-form__group">
                    <label htmlFor="addr-country" className="profile-form__label">Country</label>
                    <input
                      id="addr-country"
                      type="text"
                      className="profile-form__input"
                      value={addrForm.country}
                      onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>
                </div>

                <div className="profile-form__footer">
                  <button
                    type="submit"
                    className="profile-form__save-btn"
                    disabled={addrSaving}
                    aria-label="Save address"
                  >
                    {addrSaving ? (
                      <><span className="profile-form__spinner" aria-hidden="true" /> Saving…</>
                    ) : (
                      <><span aria-hidden="true">✓</span> Save Address</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── Security panel ───────────────────────────────────── */}
        {activeTab === 'security' && (
          <section
            id="panel-security"
            role="tabpanel"
            aria-labelledby="tab-security"
            className="profile-panel"
          >
            <div className="profile-card">
              <h2 className="profile-card__title">
                <span aria-hidden="true">🔒</span> Change Password
              </h2>
              <p className="profile-card__sub">
                Use a strong password — at least 6 characters, mix letters and numbers.
              </p>

              <form onSubmit={handlePwSave} className="profile-form" noValidate>
                {/* Current password */}
                <div className="profile-form__group">
                  <label htmlFor="pw-current" className="profile-form__label">
                    Current Password <span aria-hidden="true" className="profile-form__req">*</span>
                  </label>
                  <div className="profile-form__pw-wrap">
                    <input
                      id="pw-current"
                      type={pwVisible.cur ? 'text' : 'password'}
                      className="profile-form__input"
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      placeholder="Your current password"
                      required
                    />
                    <button
                      type="button"
                      className="profile-form__pw-toggle"
                      onClick={() => setPwVisible({ ...pwVisible, cur: !pwVisible.cur })}
                      aria-label={pwVisible.cur ? 'Hide password' : 'Show password'}
                    >
                      {pwVisible.cur ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="profile-form__group">
                  <label htmlFor="pw-new" className="profile-form__label">
                    New Password <span aria-hidden="true" className="profile-form__req">*</span>
                  </label>
                  <div className="profile-form__pw-wrap">
                    <input
                      id="pw-new"
                      type={pwVisible.new ? 'text' : 'password'}
                      className="profile-form__input"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="profile-form__pw-toggle"
                      onClick={() => setPwVisible({ ...pwVisible, new: !pwVisible.new })}
                      aria-label={pwVisible.new ? 'Hide password' : 'Show password'}
                    >
                      {pwVisible.new ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {pwForm.newPassword && (
                    <div className="profile-form__strength">
                      <div
                        className={`profile-form__strength-bar profile-form__strength-bar--${
                          pwForm.newPassword.length < 6 ? 'weak' :
                          pwForm.newPassword.length < 10 ? 'medium' : 'strong'
                        }`}
                      />
                      <span className="profile-form__hint">
                        {pwForm.newPassword.length < 6 ? 'Too short' :
                         pwForm.newPassword.length < 10 ? 'Medium strength' : 'Strong password ✓'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div className="profile-form__group">
                  <label htmlFor="pw-confirm" className="profile-form__label">
                    Confirm New Password <span aria-hidden="true" className="profile-form__req">*</span>
                  </label>
                  <div className="profile-form__pw-wrap">
                    <input
                      id="pw-confirm"
                      type={pwVisible.con ? 'text' : 'password'}
                      className={`profile-form__input${
                        pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword
                          ? ' profile-form__input--error' : ''
                      }`}
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      required
                    />
                    <button
                      type="button"
                      className="profile-form__pw-toggle"
                      onClick={() => setPwVisible({ ...pwVisible, con: !pwVisible.con })}
                      aria-label={pwVisible.con ? 'Hide password' : 'Show password'}
                    >
                      {pwVisible.con ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                    <p className="profile-form__hint profile-form__hint--error" role="alert">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="profile-form__footer">
                  <button
                    type="submit"
                    className="profile-form__save-btn"
                    disabled={pwSaving}
                    aria-label="Change password"
                  >
                    {pwSaving ? (
                      <><span className="profile-form__spinner" aria-hidden="true" /> Updating…</>
                    ) : (
                      <><span aria-hidden="true">🔒</span> Change Password</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
