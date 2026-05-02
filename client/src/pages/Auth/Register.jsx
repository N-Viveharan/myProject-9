import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import './Auth.css';



/* ── Password strength calculator ────────────────────────────── */
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', levels: [false,false,false,false] };
  let score = 0;
  if (pwd.length >= 6)                         score++;
  if (pwd.length >= 10)                        score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const levels = [score >= 1, score >= 2, score >= 3, score >= 4];
  const cls    = ['', 'weak', 'fair', 'good', 'strong'][score];
  return { score, label: labels[score], levels, cls };
}

/* ── Brand panel ─────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <div className="auth-brand" aria-hidden="true">
      <div className="auth-brand__content">
        <Link to="/" className="auth-brand__logo">
          <div className="auth-brand__logo-icon">🍜</div>
          <span className="auth-brand__logo-name">Foodie<span>Express</span></span>
        </Link>

        <h2 className="auth-brand__headline">
          Join <em>2 million</em><br />
          happy foodies.
        </h2>
        <p className="auth-brand__sub">
          Create your free account and unlock exclusive deals, faster checkouts,
          and order tracking right to your door.
        </p>
      </div>

      <div className="auth-brand__illustration">
        <span className="auth-brand__emoji-main">🥳</span>
        <div className="auth-brand__emoji-ring">
          <div className="auth-brand__emoji-chip">🍣</div>
          <div className="auth-brand__emoji-chip">🍝</div>
          <div className="auth-brand__emoji-chip">🌮</div>
          <div className="auth-brand__emoji-chip">🧁</div>
        </div>
      </div>

      <div className="auth-brand__proof">
        {[['Free','Sign up'], ['10%','First order'], ['2M+','Members']].map(([n,l]) => (
          <div key={l} className="auth-brand__proof-item">
            <span className="auth-brand__proof-num">{n}</span>
            <span className="auth-brand__proof-label">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   REGISTER PAGE
   ════════════════════════════════════════════════════════════ */
export default function Register() {
  const { register, user, loading: authLoading, clearError } = useContext(AuthContext);
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo     = searchParams.get('redirect') || '/';

  const [form, setForm] = useState({
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
  });

  const [errors,      setErrors]      = useState({});
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [success,     setSuccess]     = useState(false);

  const strength = getPasswordStrength(form.password);

  /* Already logged in → redirect */
  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
    return () => clearError?.();
  }, [user, navigate, redirectTo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Field change ────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => { const n = {...e}; delete n[name]; return n; });
    setApiError('');
  };

  /* ── Validate ────────────────────────────────────────────── */
  const validate = () => {
    const errs = {};

    if (!form.name.trim())
      errs.name = 'Full name is required';
    else if (form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters';
    else if (form.name.trim().length > 50)
      errs.name = 'Name cannot exceed 50 characters';

    if (!form.email.trim())
      errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))
      errs.email = 'Enter a valid email address';

    if (!form.password)
      errs.password = 'Password is required';
    else if (form.password.length < 6)
      errs.password = 'Password must be at least 6 characters';
    else if (strength.score < 2)
      errs.password = 'Please choose a stronger password';

    if (!form.confirmPassword)
      errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';

    if (!agreedTerms)
      errs.terms = 'You must agree to the Terms of Service';

    return errs;
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');

    const result = await register({
      name:     form.name.trim(),
      email:    form.email.trim().toLowerCase(),
      password: form.password,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate(redirectTo, { replace: true }), 1200);
    } else {
      setApiError(result.message || 'Registration failed. Please try again.');
    }

    setSubmitting(false);
  };

  const isLoading = submitting || authLoading;

  /* ── Success flash ───────────────────────────────────────── */
  if (success) {
    return (
      <div className="auth-page">
        <BrandPanel />
        <div className="auth-form-panel">
          <div className="auth-form-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'brandFloat 2s ease-in-out infinite' }}>🎉</div>
            <h1 className="auth-form-box__title" style={{ textAlign: 'center' }}>Welcome aboard!</h1>
            <p style={{ color: 'var(--auth-text-muted)', marginTop: '0.5rem' }}>
              Your account is ready. Redirecting you now…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <BrandPanel />

      <div className="auth-form-panel">
        <div className="auth-form-box">

          <Link to="/" className="auth-form-box__back">
            <span aria-hidden="true">←</span> Back to Home
          </Link>

          <h1 className="auth-form-box__title">Create your account</h1>
          <p className="auth-form-box__subtitle">
            Already have an account?{' '}
            <Link to={`/login${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>
              Sign in instead
            </Link>
          </p>

          {/* API error */}
          {apiError && (
            <div className="auth-alert auth-alert--error" role="alert" aria-live="assertive">
              <span className="auth-alert__icon" aria-hidden="true">⚠️</span>
              {apiError}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate aria-label="Registration form">

            {/* Full name */}
            <div className="auth-field">
              <label htmlFor="reg-name" className="auth-label">
                <span aria-hidden="true">👤</span> Full name
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  className={`auth-input${errors.name ? ' auth-input--error' : form.name.trim().length >= 2 && !errors.name ? ' auth-input--success' : ''}`}
                  placeholder="Rahul Sharma"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  autoFocus
                  maxLength={50}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  aria-invalid={!!errors.name}
                  disabled={isLoading}
                />
                <span className="auth-field-icon" aria-hidden="true">👤</span>
              </div>
              {errors.name && (
                <span id="name-error" className="auth-field-error" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.name}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="reg-email" className="auth-label">
                <span aria-hidden="true">✉️</span> Email address
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  className={`auth-input${errors.email ? ' auth-input--error' : form.email && !errors.email ? ' auth-input--success' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  aria-describedby={errors.email ? 'reg-email-error' : undefined}
                  aria-invalid={!!errors.email}
                  disabled={isLoading}
                />
                <span className="auth-field-icon" aria-hidden="true">✉️</span>
              </div>
              {errors.email && (
                <span id="reg-email-error" className="auth-field-error" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">
                <span aria-hidden="true">🔒</span> Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  className={`auth-input${errors.password ? ' auth-input--error' : ''}`}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  aria-describedby="pwd-strength"
                  aria-invalid={!!errors.password}
                  disabled={isLoading}
                />
                <span className="auth-field-icon" aria-hidden="true">🔒</span>
                <button
                  type="button"
                  className="auth-pwd-toggle"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Strength meter */}
              {form.password && (
                <div className="auth-strength" id="pwd-strength" aria-label={`Password strength: ${strength.label}`}>
                  <div className="auth-strength__bars" aria-hidden="true">
                    {strength.levels.map((filled, i) => (
                      <div
                        key={i}
                        className={`auth-strength__bar${filled ? ` auth-strength__bar--${strength.cls}` : ''}`}
                      />
                    ))}
                  </div>
                  <div className="auth-strength__label">{strength.label}</div>
                </div>
              )}

              {errors.password && (
                <span className="auth-field-error" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.password}
                </span>
              )}
            </div>

            {/* Confirm password */}
            <div className="auth-field">
              <label htmlFor="reg-confirm" className="auth-label">
                <span aria-hidden="true">🔐</span> Confirm password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  className={`auth-input${errors.confirmPassword ? ' auth-input--error' : form.confirmPassword && form.password === form.confirmPassword ? ' auth-input--success' : ''}`}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                  aria-invalid={!!errors.confirmPassword}
                  disabled={isLoading}
                />
                <span className="auth-field-icon" aria-hidden="true">🔐</span>
                <button
                  type="button"
                  className="auth-pwd-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                  tabIndex={-1}
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.confirmPassword && (
                <span id="confirm-error" className="auth-field-error" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.confirmPassword}
                </span>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword && (
                <span className="auth-field-error" style={{ color: 'var(--auth-green)' }}>
                  ✓ Passwords match
                </span>
              )}
            </div>

            {/* Terms checkbox */}
            <div>
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  className="auth-checkbox__input"
                  checked={agreedTerms}
                  onChange={(e) => {
                    setAgreedTerms(e.target.checked);
                    if (errors.terms) setErrors((v) => { const n={...v}; delete n.terms; return n; });
                  }}
                  aria-describedby={errors.terms ? 'terms-error' : undefined}
                  aria-invalid={!!errors.terms}
                />
                <span className="auth-checkbox__label">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && (
                <span id="terms-error" className="auth-field-error" role="alert" style={{ marginTop: '0.3rem' }}>
                  <span aria-hidden="true">⚠</span> {errors.terms}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`auth-submit${isLoading ? ' auth-submit--loading' : ''}`}
              disabled={isLoading}
              aria-label="Create account"
            >
              {isLoading ? (
                <>
                  <div className="auth-submit__spinner" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                <>
                  <span aria-hidden="true">🚀</span> Create Free Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider" style={{ marginTop: '1.5rem' }}>or sign up with</div>

          <div className="auth-social">
            <button
              type="button"
              className="auth-social-btn"
              onClick={() => alert('Google OAuth — integrate with your auth provider')}
              aria-label="Sign up with Google"
            >
              <span className="auth-social-btn__icon" aria-hidden="true">🔵</span>
              Continue with Google
            </button>
          </div>

          {/* Switch */}
          <div className="auth-switch">
            Already have an account?{' '}
            <Link to={`/login${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>
              Sign in →
            </Link>
          </div>

          {/* WELCOME10 hint */}
          <div style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', background: 'var(--auth-surface)', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--auth-text-muted)', textAlign: 'center', border: '1px dashed var(--auth-border)' }}>
            🏷️ New members get <strong style={{ color: 'var(--auth-accent-dim)' }}>10% off</strong> their first order — use code <strong style={{ color: 'var(--auth-accent-dim)', letterSpacing: '0.05em' }}>WELCOME10</strong>
          </div>
        </div>
      </div>
    </div>
  );
}