import { useState, useEffect, useCallback, useRef } from 'react';
import './UserTable.css';

const API   = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const LIMIT = 12;

/* ── Delete confirmation modal ───────────────────────────────── */
function DeleteModal({ user, onConfirm, onClose, loading }) {
  return (
    <div className="ut-modal-overlay" role="dialog" aria-modal="true"
      aria-label="Confirm user deletion" onClick={onClose}>
      <div className="ut-modal" onClick={(e) => e.stopPropagation()}>
        <span className="ut-modal__icon" aria-hidden="true">⚠️</span>
        <h2 className="ut-modal__title">Delete user account?</h2>
        <p className="ut-modal__desc">
          <span className="ut-modal__name">{user.name}</span>'s account and all associated
          data will be permanently removed. This cannot be undone.
        </p>
        <div className="ut-modal__actions">
          <button className="ut-modal__btn ut-modal__btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="ut-modal__btn ut-modal__btn--confirm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── User initials avatar ────────────────────────────────────── */
function Avatar({ user }) {
  const initials = (user.name || '?')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // Generate deterministic colour from name
  const hue = (user.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const bg  = `hsl(${hue}, 55%, 38%)`;

  return (
    <div
      className="ut-avatar"
      style={{ background: bg }}
      aria-hidden="true"
    >
      {user.avatar
        ? <img src={user.avatar} alt={user.name} onError={(e) => { e.target.style.display = 'none'; }} />
        : initials
      }
      <span
        className={`ut-avatar__dot ut-avatar__dot--${user.isActive ? 'active' : 'inactive'}`}
        title={user.isActive ? 'Active' : 'Deactivated'}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   USER TABLE
   ════════════════════════════════════════════════════════════ */

/**
 * UserTable
 *
 * Props:
 *   token   {string}  — admin JWT
 *   currentUserId {string} — logged-in admin ID (cannot demote/delete self)
 */
export default function UserTable({ token, currentUserId }) {
  const [users,       setUsers]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');
  const [statusFilter,setStatusFilter]= useState('all');
  const [sortBy,      setSortBy]      = useState('createdAt');
  const [sortDir,     setSortDir]     = useState('desc');

  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [updating,    setUpdating]    = useState(null);

  const debounceRef = useRef(null);

  /* ── Fetch ───────────────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search.trim())          params.set('search', search.trim());

      const res  = await fetch(`${API}/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load users');

      let list = data.users || [];

      // Client-side role / status filters
      if (roleFilter   !== 'all') list = list.filter((u) => u.role     === roleFilter);
      if (statusFilter !== 'all') list = list.filter((u) =>
        statusFilter === 'active' ? u.isActive : !u.isActive
      );

      // Sort
      list.sort((a, b) => {
        let av = a[sortBy], bv = b[sortBy];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });

      setUsers(list);
      setTotal(data.total || list.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, roleFilter, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchUsers, search ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [fetchUsers]);

  /* ── Change role ─────────────────────────────────────────── */
  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUserId) {
      alert('You cannot change your own role.');
      return;
    }
    setUpdating(userId);
    setUsers((prev) =>
      prev.map((u) => u._id === userId ? { ...u, role: newRole } : u)
    );
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Role update failed');
    } catch {
      fetchUsers();
    } finally {
      setUpdating(null);
    }
  };

  /* ── Toggle active status ────────────────────────────────── */
  const handleToggleActive = async (user) => {
    if (user._id === currentUserId) {
      alert('You cannot deactivate your own account.');
      return;
    }
    const updated = { ...user, isActive: !user.isActive };
    setUsers((prev) => prev.map((u) => u._id === user._id ? updated : u));
    try {
      const res = await fetch(`${API}/users/${user._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ isActive: updated.isActive }),
      });
      if (!res.ok) throw new Error('Status update failed');
    } catch {
      setUsers((prev) => prev.map((u) => u._id === user._id ? user : u));
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget._id === currentUserId) {
      alert('Cannot delete your own account.');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${API}/users/${deleteTarget._id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Could not delete user');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Export CSV ──────────────────────────────────────────── */
  const handleExport = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Phone', 'Joined'];
    const rows    = users.map((u) => [
      u.name, u.email, u.role,
      u.isActive ? 'Active' : 'Inactive',
      u.phone || '',
      new Date(u.createdAt).toLocaleDateString('en-IN'),
    ]);
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Sort ────────────────────────────────────────────────── */
  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
    setPage(1);
  };

  /* ── Stats ───────────────────────────────────────────────── */
  const admins   = users.filter((u) => u.role === 'admin').length;
  const active   = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const pageStart  = (page - 1) * LIMIT + 1;
  const pageEnd    = Math.min(page * LIMIT, total);

  const thSort = (label, field) => (
    <th
      className={`sortable${sortBy === field ? ' sorted' : ''}`}
      onClick={() => handleSort(field)}
      aria-sort={sortBy === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {sortBy === field && (
        <span style={{ marginLeft: 4, fontSize: '0.6rem' }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );

  return (
    <div className="user-table-wrap">

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="ut-toolbar">
        <span className="ut-toolbar__title">
          👥 Customers
          <span className="ut-toolbar__count">{total}</span>
        </span>
        <div className="ut-spacer" />

        <div className="ut-search">
          <input
            type="search"
            className="ut-search__input"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search users"
          />
          <span className="ut-search__icon" aria-hidden="true">🔍</span>
        </div>

        <select
          className="ut-select"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>

        <select
          className="ut-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button className="ut-btn" onClick={handleExport} aria-label="Export users to CSV">
          📥 Export CSV
        </button>
      </div>

      {/* ── Stats strip ─────────────────────────────────── */}
      <div className="ut-stats" role="region" aria-label="User statistics">
        {[
          { label: 'Total Users',  val: total,    sub: 'registered' },
          { label: 'Admins',       val: admins,   sub: 'with admin role' },
          { label: 'Active',       val: active,   sub: 'can log in' },
          { label: 'Deactivated',  val: inactive, sub: 'blocked' },
        ].map((s) => (
          <div key={s.label} className="ut-stat-cell">
            <span className="ut-stat-cell__label">{s.label}</span>
            <span className="ut-stat-cell__val">{s.val}</span>
            <span className="ut-stat-cell__sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="ut-table-container">
        <table className="ut-table" role="grid" aria-label="User accounts">
          <thead>
            <tr>
              {thSort('User',    'name')}
              {thSort('Role',    'role')}
              <th>Change Role</th>
              <th>Orders</th>
              <th>Active</th>
              {thSort('Joined',  'createdAt')}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: LIMIT }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j}>
                      <div style={{
                        height: 14, background: 'rgba(255,255,255,0.05)',
                        borderRadius: 5, width: j === 0 ? 180 : 70,
                        animation: 'skeletonPulse 1.5s ease-in-out infinite',
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={7}>
                  <div className="ut-empty">
                    <span className="ut-empty__icon">😕</span>
                    <p className="ut-empty__title">Failed to load users</p>
                    <p className="ut-empty__desc">{error}</p>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="ut-empty">
                    <span className="ut-empty__icon">👥</span>
                    <p className="ut-empty__title">No users found</p>
                    <p className="ut-empty__desc">
                      {search || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'Try adjusting your filters.'
                        : 'No users have registered yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf     = user._id === currentUserId;
                const isUpdating = updating === user._id;

                return (
                  <tr key={user._id} style={{ opacity: isUpdating ? 0.6 : 1 }}>

                    {/* User cell */}
                    <td>
                      <div className="ut-user-cell">
                        <Avatar user={user} />
                        <div className="ut-user-info">
                          <span className="ut-user-name">
                            {user.name}
                            {isSelf && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--ut-accent)', marginLeft: 5, background: 'var(--ut-accent-l)', padding: '1px 5px', borderRadius: 4 }}>
                                You
                              </span>
                            )}
                          </span>
                          <span className="ut-user-email">{user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td>
                      <span className={`ut-role-badge ut-role-badge--${user.role}`}>
                        {user.role === 'admin' ? '⭐ ' : ''}
                        {user.role}
                      </span>
                    </td>

                    {/* Role select */}
                    <td>
                      <select
                        className={`ut-role-select ut-role-select--${user.role}`}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={isSelf || isUpdating}
                        aria-label={`Change role for ${user.name}`}
                        title={isSelf ? 'Cannot change your own role' : undefined}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/* Order count */}
                    <td>
                      <span className={`ut-orders-pill${(user.orderCount || 0) > 0 ? ' ut-orders-pill--active' : ''}`}>
                        📦 {user.orderCount ?? 0}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td>
                      <button
                        className={`ut-status-toggle${user.isActive ? ' ut-status-toggle--active' : ''}`}
                        onClick={() => handleToggleActive(user)}
                        disabled={isSelf}
                        aria-label={user.isActive ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                        aria-pressed={user.isActive}
                        title={isSelf ? 'Cannot deactivate your own account' : undefined}
                      />
                    </td>

                    {/* Joined date */}
                    <td style={{ fontSize: '0.75rem', color: 'var(--ut-text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: '2-digit',
                      })}
                    </td>

                    {/* Row actions */}
                    <td>
                      <div className="ut-row-actions">
                        <button
                          className="ut-row-btn ut-row-btn--mail"
                          onClick={() => window.open(`mailto:${user.email}`)}
                          title="Send email"
                          aria-label={`Email ${user.name}`}
                        >
                          ✉️
                        </button>
                        {!isSelf && (
                          <button
                            className="ut-row-btn ut-row-btn--delete"
                            onClick={() => setDeleteTarget(user)}
                            title="Delete user"
                            aria-label={`Delete ${user.name}`}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="ut-pagination">
          <span className="ut-pagination__info">
            Showing <strong>{pageStart}–{pageEnd}</strong> of <strong>{total}</strong> users
          </span>
          <div className="ut-pagination__pages" role="navigation" aria-label="User table pages">
            <button className="ut-page-btn" onClick={() => setPage((p) => p - 1)}
              disabled={page === 1} aria-label="Previous page">←</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} style={{ padding: '0 3px', color: 'var(--ut-text-muted)', fontSize: '0.78rem' }}>…</span>
                ) : (
                  <button
                    key={p}
                    className={`ut-page-btn${page === p ? ' ut-page-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={page === p ? 'page' : undefined}
                  >{p}</button>
                )
              )}

            <button className="ut-page-btn" onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages} aria-label="Next page">→</button>
          </div>
        </div>
      )}

      {/* ── Delete modal ─────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
    </div>
  );
}