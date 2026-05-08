import { useState, useContext } from 'react';
import UserTable from '../../components/UserTable/UserTable.jsx';
import './ManageUsers.css';

/* ════════════════════════════════════════════════════════════
   MANAGE USERS PAGE
   ════════════════════════════════════════════════════════════ */

/**
 * ManageUsers
 *
 * Props:
 *   token         {string}  — admin JWT (from AdminAuthContext or parent)
 *   currentUserId {string}  — logged-in admin's own _id (prevents self-demote/delete)
 *   totalUsers    {number}  — optional pre-fetched count for the subtitle
 */
export default function ManageUsers({ token, currentUserId, totalUsers }) {
  const [toast, setToast] = useState({ text: '', type: '' });

  /* Show a temporary toast notification */
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 3500);
  };

  /* Export placeholder — UserTable handles its own CSV export internally */
  const handleRefresh = () => window.location.reload();

  return (
    <div className="manage-users">

      {/* ── Header ────────────────────────────────────── */}
      <header className="mu-header">
        <div className="mu-header__inner">
          <div>
            <h1 className="mu-header__title">
              <span aria-hidden="true">👥</span> Manage Users
            </h1>
            <p className="mu-header__subtitle">
              View, search, and manage all registered customers.
              {totalUsers > 0 && (
                <> Currently <strong>{totalUsers}</strong> users.</>
              )}
            </p>
          </div>

          <div className="mu-header__actions">
            <button
              className="mu-btn mu-btn--secondary"
              onClick={handleRefresh}
              aria-label="Refresh user list"
            >
              <span aria-hidden="true">🔄</span> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────── */}
      <div className="mu-body">

        {/* Toast notification */}
        {toast.text && (
          <div
            className={`mu-toast mu-toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            <span aria-hidden="true">
              {toast.type === 'success' ? '✅' : '⚠️'}
            </span>
            {toast.text}
          </div>
        )}

        {/* User table — handles all CRUD internally */}
        <UserTable
          token={token}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}