import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminAuthContext } from '../../context/Adminauthcontext.jsx';
import Spinner from '../../components/Spinner/Spinner.jsx';
import './AdminLogin.css';

/**
 * AdminLogin.jsx
 * ─────────────────────────────────────────────────────────────
 * Secure login page for administrators.
 * Features:
 *   - Dark, premium aesthetic
 *   - Form validation
 *   - Integration with AdminAuthContext
 *   - Redirect after login
 * ─────────────────────────────────────────────────────────────
 */
export default function AdminLogin() {
  const { login, isLoggedIn, loading: authLoading } = useContext(AdminAuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      const from = new URLSearchParams(location.search).get('redirect') || '/admin';
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, authLoading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await login({ email, password });
      if (!result.success) {
        setError(result.message || 'Invalid credentials.');
      }
      // Successful login will trigger the useEffect above via isLoggedIn
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__container">
        <div className="admin-login__card">
          <header className="admin-login__header">
            <div className="admin-login__logo">
              <span className="admin-login__logo-icon">🔒</span>
              <h1 className="admin-login__title">Admin Portal</h1>
            </div>
            <p className="admin-login__subtitle">Enter your credentials to access the management suite.</p>
          </header>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            {error && (
              <div className="admin-login__alert admin-login__alert--error">
                {error}
              </div>
            )}

            <div className="admin-login__field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="admin@foodieexpress.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="admin-login__field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="admin-login__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner size="xs" variant="ring" />
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <footer className="admin-login__footer">
            <p>© 2024 FoodieExpress Admin Panel. All rights reserved.</p>
          </footer>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="admin-login__blob admin-login__blob--1"></div>
      <div className="admin-login__blob admin-login__blob--2"></div>
    </div>
  );
}
