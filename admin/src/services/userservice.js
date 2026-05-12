/**
 * userService.js — Admin User Service
 * ─────────────────────────────────────────────────────────────
 * All admin-side user management API calls.
 * Uses the shared Axios instance from api.js (JWT auto-attached).
 *
 * Exports:
 *   getAllUsers(params)            — paginated list with search/filter
 *   getUserById(id)               — single user detail
 *   updateRole(id, role)          — promote to admin / demote to user
 *   updateStatus(id, isActive)    — activate / deactivate account
 *   updateUser(id, data)          — general field update
 *   deleteUser(id)                — permanently remove account
 *   exportCSV(params, filename)   — download user list as CSV
 *   getUserStats()                — aggregated user dashboard stats
 */

import api from './api.js';

/* ── Valid roles (mirrors backend enum) ──────────────────────── */
export const USER_ROLES = ['user', 'admin'];

/* ── Query param builder ─────────────────────────────────────── */
const buildParams = ({
  page      = 1,
  limit     = 12,
  search    = '',
  role      = '',
  isActive,
  sort      = 'createdAt',
  direction = 'desc',
} = {}) => {
  const params = { page, limit };
  params.sort = `${sort}_${direction}`;
  if (search.trim())  params.search   = search.trim();
  if (role && role !== 'all') params.role = role;
  if (isActive !== undefined && isActive !== 'all') params.isActive = isActive;
  return params;
};

/* ════════════════════════════════════════════════════════════
   SERVICE FUNCTIONS
   ════════════════════════════════════════════════════════════ */

/**
 * Get all users (admin view).
 *
 * @param {object} queryOptions — page, limit, search, role, isActive, sort, direction
 * @returns {{ users, total, page, pages }}
 */
export const getAllUsers = async (queryOptions = {}) => {
  const params = buildParams(queryOptions);
  return api.get('/users', { params });
};

/**
 * Get a single user by ID.
 *
 * @param {string} id
 * @returns {{ user }}
 */
export const getUserById = async (id) => {
  if (!id) throw new Error('User ID is required');
  return api.get(`/users/${id}`);
};

/**
 * Change a user's role.
 * Backend prevents demoting the last admin account.
 * Caller should prevent demoting the currently logged-in admin.
 *
 * @param {string} id
 * @param {'user'|'admin'} role
 * @returns {{ user }}
 */
export const updateRole = async (id, role) => {
  if (!id) throw new Error('User ID is required');
  if (!USER_ROLES.includes(role)) {
    throw new Error(`Invalid role: "${role}". Must be one of: ${USER_ROLES.join(', ')}`);
  }
  return api.put(`/users/${id}`, { role });
};

/**
 * Activate or deactivate a user account.
 * Deactivated users cannot log in — backend rejects their JWT.
 *
 * @param {string}  id
 * @param {boolean} isActive
 * @returns {{ user }}
 */
export const updateStatus = async (id, isActive) => {
  if (!id) throw new Error('User ID is required');
  return api.put(`/users/${id}`, { isActive: Boolean(isActive) });
};

/**
 * General-purpose update (name, phone, address, role, isActive).
 * Merges with existing data on the backend.
 *
 * @param {string} id
 * @param {object} data — any subset of User schema fields
 * @returns {{ user }}
 */
export const updateUser = async (id, data) => {
  if (!id) throw new Error('User ID is required');
  if (!data || !Object.keys(data).length) throw new Error('No update data provided');
  return api.put(`/users/${id}`, data);
};

/**
 * Permanently delete a user account.
 * Should be prevented for the currently logged-in admin.
 *
 * @param {string} id
 * @returns {{ message }}
 */
export const deleteUser = async (id) => {
  if (!id) throw new Error('User ID is required');
  return api.delete(`/users/${id}`);
};

/**
 * Export user list to a downloadable CSV file.
 * Fetches up to 2000 users matching current filters.
 *
 * @param {object} queryOptions — same shape as getAllUsers params
 * @param {string} filename     — default 'users-export.csv'
 * @returns {number}            — row count for feedback toast
 */
export const exportCSV = async (queryOptions = {}, filename = 'users-export.csv') => {
  const params = buildParams({ ...queryOptions, limit: 2000, page: 1 });
  const data   = await api.get('/users', { params });
  const users  = data.users || [];

  if (!users.length) throw new Error('No users match the current filters.');

  const headers = [
    'Name', 'Email', 'Role', 'Status',
    'Phone', 'City', 'State', 'Country', 'Joined On',
  ];

  const esc = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const rows = users.map((u) => [
    u.name,
    u.email,
    u.role,
    u.isActive ? 'Active' : 'Inactive',
    u.phone                || '',
    u.address?.city        || '',
    u.address?.state       || '',
    u.address?.country     || '',
    u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '',
  ].map(esc));

  const csv  = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return users.length;
};

/**
 * Aggregate user stats derived client-side from a broad fetch.
 * Replace with a dedicated backend endpoint for large user bases.
 *
 * @returns {{ total, admins, active, inactive, newThisWeek, newThisMonth }}
 */
export const getUserStats = async () => {
  const data  = await api.get('/users', { params: { limit: 2000, page: 1 } });
  const users = data.users || [];
  const now   = Date.now();
  const WEEK  = 7  * 24 * 60 * 60 * 1000;
  const MONTH = 30 * 24 * 60 * 60 * 1000;

  return {
    total:        data.total || users.length,
    admins:       users.filter((u) => u.role === 'admin').length,
    active:       users.filter((u) =>  u.isActive).length,
    inactive:     users.filter((u) => !u.isActive).length,
    newThisWeek:  users.filter((u) => now - new Date(u.createdAt) < WEEK).length,
    newThisMonth: users.filter((u) => now - new Date(u.createdAt) < MONTH).length,
  };
};

/* Convenience grouped export */
export const userService = {
  getAllUsers,
  getUserById,
  updateRole,
  updateStatus,
  updateUser,
  deleteUser,
  exportCSV,
  getUserStats,
  USER_ROLES,
};

export default userService;