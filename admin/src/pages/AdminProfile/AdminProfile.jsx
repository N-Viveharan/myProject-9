import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAuthContext } from '../../context/Adminauthcontext.jsx';
import './AdminProfile.css';

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

/* ── Inline Toast Helper ──────────────────────────────────────── */
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`ap-toast ap-toast--${type}`} role="alert" aria-live="polite">
      <span aria-hidden="true">{type === 'success' ? '✅' : '⚠️'}</span> {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN PROFILE PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function AdminProfile() {
  const navigate = useNavigate();
  const { admin, loading: authLoading, updateAdminProfile, changePassword } = useContext(AdminAuthContext);

  const [activeTab, setActiveTab] = useState('info');

  /* ── Toast State ──────────────────────────────────────────── */
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  /* ── Forms State ──────────────────────────────────────────── */
  const [infoForm, setInfoForm] = useState({ name: '', phone: '' });
  const [infoSaving, setInfoSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwVisible, setPwVisible] = useState({ cur: false, new: false, con: false });

  /* Populate forms from admin user object */
  useEffect(() => {
    if (admin) {
      setInfoForm({ name: admin.name || '', phone: admin.phone || '' });
    }
  }, [admin]);

  /* Redirect if not logged in */
  useEffect(() => {
    if (!authLoading && !admin) navigate('/admin/login');
  }, [authLoading, admin, navigate]);

  if (authLoading || !admin) return null;

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleInfoSave = async (e) => {
    e.preventDefault();
    if (!infoForm.name.trim()) return showToast('Name is required.', 'error');
    setInfoSaving(true);
    const res = await updateAdminProfile({ name: infoForm.name.trim(), phone: infoForm.phone.trim() });
    setInfoSaving(false);
    res.success ? showToast('Profile updated successfully!') : showToast(res.message, 'error');
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
    { id: 'info', icon: '👤', label: 'Personal Info' },
    { id: 'security', icon: '🔒', label: 'Security & Password' },
  ];

  return (
    <div className="admin-profile-page">
      {/* ── Page Header ────────────────────────────────────── */}
      <header className="ap-header">
        <div className="ap-header__inner">
          <div className="ap-avatar" aria-label={`Avatar for ${admin.name}`}>
            {getInitials(admin.name)}
          </div>
          <div className="ap-header__info">
            <h1 className="ap-header__name">{admin.name}</h1>
            <p className="ap-header__email">{admin.email}</p>
            <div className="ap-header__meta">
              <span className="ap-header__role">
                ⚙️ {admin.role === 'admin' ? 'Administrator' : 'Staff'}
              </span>
              {admin.createdAt && (
                <span className="ap-header__since">
                  Created on {fmt(admin.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="ap-body">
        {/* Tab nav */}
        <nav className="ap-tabs" role="tablist" aria-label="Profile sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`ap-tab${activeTab === tab.id ? ' active' : ''}`}
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
          <section id="panel-info" role="tabpanel" aria-labelledby="tab-info" className="ap-panel">
            <div className="ap-card">
              <h2 className="ap-card__title">
                <span aria-hidden="true">👤</span> Personal Information
              </h2>
              <p className="ap-card__sub">Update your account display name and contact phone number.</p>

              <form onSubmit={handleInfoSave} className="ap-form" noValidate>
                <div className="ap-form__group">
                  <label htmlFor="ap-name" className="ap-form__label">
                    Full Name <span aria-hidden="true" className="ap-form__req">*</span>
                  </label>
                  <input
                    id="ap-name"
                    type="text"
                    className="ap-form__input"
                    value={infoForm.name}
                    onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                    placeholder="Administrator name"
                    required
                  />
                </div>

                <div className="ap-form__group">
                  <label htmlFor="ap-email" className="ap-form__label">
                    Email Address
                  </label>
                  <input
                    id="ap-email"
                    type="email"
                    className="ap-form__input ap-form__input--readonly"
                    value={admin.email}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="ap-email-hint"
                  />
                  <p id="ap-email-hint" className="ap-form__hint">Email cannot be changed.</p>
                </div>

                <div className="ap-form__group">
                  <label htmlFor="ap-phone" className="ap-form__label">
                    Contact Phone
                  </label>
                  <input
                    id="ap-phone"
                    type="tel"
                    className="ap-form__input"
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="ap-form__footer">
                  <button type="submit" className="ap-form__save-btn" disabled={infoSaving}>
                    {infoSaving ? (
                      <><span className="ap-form__spinner" aria-hidden="true" /> Saving…</>
                    ) : (
                      <><span aria-hidden="true">✓</span> Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── Security panel ───────────────────────────────────── */}
        {activeTab === 'security' && (
          <section id="panel-security" role="tabpanel" aria-labelledby="tab-security" className="ap-panel">
            <div className="ap-card">
              <h2 className="ap-card__title">
                <span aria-hidden="true">🔒</span> Change Password
              </h2>
              <p className="ap-card__sub">Update your password to keep your administrator account secure.</p>

              <form onSubmit={handlePwSave} className="ap-form" noValidate>
                {/* Current password */}
                <div className="ap-form__group">
                  <label htmlFor="ap-pw-current" className="ap-form__label">
                    Current Password <span aria-hidden="true" className="ap-form__req">*</span>
                  </label>
                  <div className="ap-form__pw-wrap">
                    <input
                      id="ap-pw-current"
                      type={pwVisible.cur ? 'text' : 'password'}
                      className="ap-form__input"
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="ap-form__pw-toggle"
                      onClick={() => setPwVisible({ ...pwVisible, cur: !pwVisible.cur })}
                      aria-label={pwVisible.cur ? 'Hide password' : 'Show password'}
                    >
                      {pwVisible.cur ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="ap-form__group">
                  <label htmlFor="ap-pw-new" className="ap-form__label">
                    New Password <span aria-hidden="true" className="ap-form__req">*</span>
                  </label>
                  <div className="ap-form__pw-wrap">
                    <input
                      id="ap-pw-new"
                      type={pwVisible.new ? 'text' : 'password'}
                      className="ap-form__input"
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="ap-form__pw-toggle"
                      onClick={() => setPwVisible({ ...pwVisible, new: !pwVisible.new })}
                      aria-label={pwVisible.new ? 'Hide password' : 'Show password'}
                    >
                      {pwVisible.new ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {pwForm.newPassword && (
                    <div className="ap-form__strength">
                      <div
                        className={`ap-form__strength-bar ap-form__strength-bar--${pwForm.newPassword.length < 6 ? 'weak' :
                            pwForm.newPassword.length < 10 ? 'medium' : 'strong'
                          }`}
                      />
                      <span className="ap-form__hint">
                        {pwForm.newPassword.length < 6 ? 'Too short' :
                          pwForm.newPassword.length < 10 ? 'Medium strength' : 'Strong password ✓'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div className="ap-form__group">
                  <label htmlFor="ap-pw-confirm" className="ap-form__label">
                    Confirm New Password <span aria-hidden="true" className="ap-form__req">*</span>
                  </label>
                  <div className="ap-form__pw-wrap">
                    <input
                      id="ap-pw-confirm"
                      type={pwVisible.con ? 'text' : 'password'}
                      className={`ap-form__input${pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword
                          ? ' ap-form__input--error' : ''
                        }`}
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      required
                    />
                    <button
                      type="button"
                      className="ap-form__pw-toggle"
                      onClick={() => setPwVisible({ ...pwVisible, con: !pwVisible.con })}
                      aria-label={pwVisible.con ? 'Hide password' : 'Show password'}
                    >
                      {pwVisible.con ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                    <p className="ap-form__hint ap-form__hint--error" role="alert">
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="ap-form__footer">
                  <button type="submit" className="ap-form__save-btn" disabled={pwSaving}>
                    {pwSaving ? (
                      <><span className="ap-form__spinner" aria-hidden="true" /> Updating…</>
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
    </div>
  );
}
