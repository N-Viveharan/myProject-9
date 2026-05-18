import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AdminAuthContext } from '../../context/Adminauthcontext.jsx';
import Spinner from '../../components/Spinner/Spinner.jsx';
import './AdminSignup.css';

/**
 * AdminSignup.jsx
 * ─────────────────────────────────────────────────────────────
 * Secure registration page for new administrators.
 * Features:
 *   - Dark, premium aesthetic
 *   - Form validation
 *   - Integration with AdminAuthContext
 *   - Redirect after successful registration
 * ─────────────────────────────────────────────────────────────
 */
export default function AdminSignup() {
  const { register, isLoggedIn, loading: authLoading } = useContext(AdminAuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      navigate('/admin', { replace: true });
    }
  }, [isLoggedIn, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await register({ name, email, password });
      if (!result.success) {
        setError(result.message || 'Registration failed.');
      }
      // Successful registration will automatically log the user in locally
      // and trigger the redirect via the useEffect above!
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-signup">
      <div className="admin-signup__container">
        <div className="admin-signup__card">
          <header className="admin-signup__header">
            <div className="admin-signup__logo">
              <span className="admin-signup__logo-icon">🔐</span>
              <h1 className="admin-signup__title">Admin Registration</h1>
            </div>
            <p className="admin-signup__subtitle">Create a new administrator account to access the dashboard.</p>
          </header>

          <form className="admin-signup__form" onSubmit={handleSubmit}>
            {error && (
              <div className="admin-signup__alert admin-signup__alert--error">
                {error}
              </div>
            )}

            <div className="admin-signup__field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="admin-signup__field">
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

            <div className="admin-signup__field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="admin-signup__field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="admin-signup__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner size="xs" variant="ring" />
              ) : (
                'Create Admin Account'
              )}
            </button>
          </form>

          <footer className="admin-signup__footer">
            <p className="admin-signup__login-prompt">
              Already have an account? <Link to="/admin/login">Sign In</Link>
            </p>
            <p className="admin-signup__copyright">© 2024 FoodieExpress Admin Panel. All rights reserved.</p>
          </footer>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="admin-signup__blob admin-signup__blob--1"></div>
      <div className="admin-signup__blob admin-signup__blob--2"></div>
    </div>
  );
}
