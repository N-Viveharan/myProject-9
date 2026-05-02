import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import './Auth.css';

/* ── Brand panel (shared visual) ────────────────────────────── */
function BrandPanel() {
  return (
    <div className="auth-brand" aria-hidden="true">
      <div className="auth-brand__content">
        <Link to="/" className="auth-brand__logo">
          <div className="auth-brand__logo-icon">🍜</div>
          <span className="auth-brand__logo-name">Foodie<span>Express</span></span>
        </Link>

        <h2 className="auth-brand__headline">
          Good food,<br />
          <em>great</em> mood.
        </h2>
        <p className="auth-brand__sub">
          Sign in and pick up right where you left off — hot meals,
          saved addresses, and your favourite orders one tap away.
        </p>
      </div>

      <div className="auth-brand__illustration">
        <span className="auth-brand__emoji-main">🍛</span>
        <div className="auth-brand__emoji-ring">
          <div className="auth-brand__emoji-chip">🍔</div>
          <div className="auth-brand__emoji-chip">🍕</div>
          <div className="auth-brand__emoji-chip">🥗</div>
          <div className="auth-brand__emoji-chip">🍰</div>
        </div>
      </div>

      <div className="auth-brand__proof">
        {[['2M+','Orders'], ['4.8★','Rating'], ['30min','Delivery']].map(([n,l]) => (
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
   LOGIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function Login() {
  const { login, user, loading: authLoading, clearError } = useContext(AuthContext);
  const navigate      = useNavigate();
  const [searchParams]= useSearchParams();
  const redirectTo    = searchParams.get('redirect') || '/';

  const [form,      setForm]      = useState({ email: '', password: '' });
  const [errors,    setErrors]    = useState({});
  const [showPwd,   setShowPwd]   = useState(false);
  const [remember,  setRemember]  = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [apiError,  setApiError]  = useState('');

  /* Already logged in → redirect */
  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  /* Pre-fill email from localStorage if "remember me" was used */
  useEffect(() => {
    const saved = localStorage.getItem('foodie_remembered_email');
    if (saved) { setForm((f) => ({ ...f, email: saved })); setRemember(true); }
    return () => clearError?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Field change ────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => { const n = {...e}; delete n[name]; return n; });
    setApiError('');
  };

  /* ── Client validation ───────────────────────────────────── */
  const validate = () => {
    const errs = {};
    if (!form.email.trim())                                   errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))               errs.email    = 'Enter a valid email address';
    if (!form.password)                                        errs.password = 'Password is required';
    else if (form.password.length < 6)                        errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');

    const result = await login({ email: form.email.trim().toLowerCase(), password: form.password });

    if (result.success) {
      if (remember) {
        localStorage.setItem('foodie_remembered_email', form.email.trim().toLowerCase());
      } else {
        localStorage.removeItem('foodie_remembered_email');
      }
      navigate(redirectTo, { replace: true });
    } else {
      setApiError(result.message || 'Login failed. Please try again.');
    }

    setSubmitting(false);
  };

  const isLoading = submitting || authLoading;

  return (
    <div className="auth-page">
      <BrandPanel />

      <div className="auth-form-panel">
        <div className="auth-form-box">

          <Link to="/" className="auth-form-box__back">
            <span aria-hidden="true">←</span> Back to Home
          </Link>

          <h1 className="auth-form-box__title">Welcome back 👋</h1>
          <p className="auth-form-box__subtitle">
            Don't have an account?{' '}
            <Link to={`/register${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>
              Sign up free
            </Link>
          </p>

          {/* API error */}
          {apiError && (
            <div className="auth-alert auth-alert--error" role="alert" aria-live="assertive">
              <span className="auth-alert__icon" aria-hidden="true">⚠️</span>
              {apiError}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate aria-label="Login form">

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                <span aria-hidden="true">✉️</span> Email address
              </label>
              <div className="auth-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  className={`auth-input${errors.email ? ' auth-input--error' : form.email && !errors.email ? ' auth-input--success' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  autoFocus
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={!!errors.email}
                  disabled={isLoading}
                />
                <span className="auth-field-icon" aria-hidden="true">✉️</span>
              </div>
              {errors.email && (
                <span id="email-error" className="auth-field-error" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="auth-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password" className="auth-label">
                  <span aria-hidden="true">🔒</span> Password
                </label>
                <a href="/forgot-password" className="auth-forgot" tabIndex={0}>Forgot password?</a>
              </div>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  className={`auth-input${errors.password ? ' auth-input--error' : ''}`}
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  aria-describedby={errors.password ? 'password-error' : undefined}
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
              {errors.password && (
                <span id="password-error" className="auth-field-error" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.password}
                </span>
              )}
            </div>

            {/* Remember me */}
            <label className="auth-checkbox">
              <input
                type="checkbox"
                className="auth-checkbox__input"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                aria-label="Remember my email"
              />
              <span className="auth-checkbox__label">Remember my email on this device</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className={`auth-submit${isLoading ? ' auth-submit--loading' : ''}`}
              disabled={isLoading}
              aria-label="Sign in"
            >
              {isLoading ? (
                <>
                  <div className="auth-submit__spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  <span aria-hidden="true">🔑</span> Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider" style={{ marginTop: '1.5rem' }}>or continue with</div>

          {/* Social login (UI only — wire to OAuth provider) */}
          <div className="auth-social">
            <button
              type="button"
              className="auth-social-btn"
              onClick={() => alert('Google OAuth — integrate with your auth provider')}
              aria-label="Sign in with Google"
            >
              <span className="auth-social-btn__icon" aria-hidden="true">🔵</span>
              Continue with Google
            </button>
          </div>

          {/* Switch */}
          <div className="auth-switch">
            New to FoodieExpress?{' '}
            <Link to={`/register${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>
              Create a free account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}