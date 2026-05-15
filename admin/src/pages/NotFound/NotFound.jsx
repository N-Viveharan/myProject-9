import { Link } from 'react-router-dom';
import './NotFound.css';

/**
 * NotFound.jsx
 * ─────────────────────────────────────────────────────────────
 * 404 Error page for the Admin Portal.
 * ─────────────────────────────────────────────────────────────
 */
export default function NotFound() {
  return (
    <div className="admin-404">
      <div className="admin-404__content">
        <h1 className="admin-404__code">404</h1>
        <div className="admin-404__divider"></div>
        <h2 className="admin-404__title">Page Not Found</h2>
        <p className="admin-404__message">
          The management console page you are looking for does not exist or has been moved.
        </p>
        <Link to="/admin" className="admin-404__button">
          Return to Dashboard
        </Link>
      </div>
      
      {/* Decorative elements */}
      <div className="admin-404__grid"></div>
    </div>
  );
}
