/**
 * orderService.js — Admin Order Service
 * ─────────────────────────────────────────────────────────────
 * All admin-side order API calls.
 * Uses the shared Axios instance from api.js (JWT auto-attached).
 *
 * Exports:
 *   getAllOrders(params)           — paginated order list with filters
 *   getOrderById(id)              — single order detail (populated)
 *   updateStatus(id, status, reason) — change order status + optional reason
 *   cancelOrder(id, reason)       — cancel with reason
 *   getDashboardStats()           — revenue, totals, 7-day chart data
 *   exportCSV(params)             — generate downloadable CSV
 *   bulkUpdateStatus(ids, status) — batch status change
 */

import api from './api.js';

/* ── Valid order statuses (mirrors backend enum) ─────────────── */
export const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

/* ── Status that allows cancellation ────────────────────────── */
export const CANCELLABLE_STATUSES = ['Placed', 'Confirmed'];

/* ── Query param builder ─────────────────────────────────────── */
const buildParams = ({
  page    = 1,
  limit   = 10,
  status  = '',
  search  = '',
  sort    = 'createdAt',
  direction = 'desc',
  dateFrom,
  dateTo,
} = {}) => {
  const params = { page, limit };
  params.sort = `${sort}_${direction}`;
  if (status && status !== 'all') params.status   = status;
  if (search.trim())              params.search   = search.trim();
  if (dateFrom)                   params.dateFrom = dateFrom;
  if (dateTo)                     params.dateTo   = dateTo;
  return params;
};

/* ════════════════════════════════════════════════════════════
   ORDER SERVICE FUNCTIONS
   ════════════════════════════════════════════════════════════ */

/**
 * Get all orders (admin view — sees every user's orders).
 *
 * @param {object} queryOptions
 *   page, limit, status, search, sort, direction, dateFrom, dateTo
 * @returns {{ orders, total, page, pages }}
 */
export const getAllOrders = async (queryOptions = {}) => {
  const params = buildParams(queryOptions);
  return api.get('/orders', { params });
};

/**
 * Get a single order with fully populated user and product refs.
 *
 * @param {string} id — MongoDB order _id
 * @returns {{ order }}
 */
export const getOrderById = async (id) => {
  if (!id) throw new Error('Order ID is required');
  return api.get(`/orders/${id}`);
};

/**
 * Update an order's status.
 * Optionally provide a cancellation reason (used when status = 'Cancelled').
 * On 'Delivered' the backend also marks paymentStatus as 'Paid'.
 *
 * @param {string} id
 * @param {string} status   — one of ORDER_STATUSES
 * @param {string} [reason] — cancellation / admin note
 * @returns {{ order }}
 */
export const updateStatus = async (id, status, reason = '') => {
  if (!id)     throw new Error('Order ID is required');
  if (!status) throw new Error('Status is required');
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${ORDER_STATUSES.join(', ')}`);
  }

  const body = { status };
  if (reason?.trim()) body.reason = reason.trim();

  return api.put(`/orders/${id}/status`, body);
};

/**
 * Cancel an order (admin-initiated).
 * Only allowed when status is Placed or Confirmed.
 * The backend automatically restores product stock on cancellation.
 *
 * @param {string} id
 * @param {string} [reason]
 * @returns {{ order }}
 */
export const cancelOrder = async (id, reason = 'Cancelled by admin') => {
  if (!id) throw new Error('Order ID is required');
  return api.put(`/orders/${id}/cancel`, { reason });
};

/**
 * Get admin dashboard statistics.
 * Returns revenue totals, status counts, and 7-day chart data.
 *
 * @returns {{
 *   stats: {
 *     totalOrders, totalRevenue, pendingOrders, deliveredOrders,
 *     recentOrders: { _id, count, revenue }[]
 *   }
 * }}
 */
export const getDashboardStats = async () => {
  return api.get('/orders/dashboard');
};

/**
 * Batch update multiple orders to the same status.
 * Runs in parallel via Promise.allSettled — partial failures are logged
 * but do not throw; caller receives the settled results array.
 *
 * @param {string[]} ids
 * @param {string}   status
 * @param {string}   [reason]
 * @returns {Promise<{ succeeded: string[], failed: string[] }>}
 */
export const bulkUpdateStatus = async (ids = [], status, reason = '') => {
  if (!ids.length) throw new Error('No order IDs provided');
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const body = { status };
  if (reason.trim()) body.reason = reason.trim();

  const results = await Promise.allSettled(
    ids.map((id) => api.put(`/orders/${id}/status`, body))
  );

  const succeeded = [];
  const failed    = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') succeeded.push(ids[i]);
    else {
      failed.push(ids[i]);
      console.warn(`[orderService] bulkUpdateStatus failed for ${ids[i]}:`, r.reason?.message);
    }
  });

  return { succeeded, failed };
};

/**
 * Export orders to a downloadable CSV file.
 * Fetches all matching orders (up to 1000) and triggers a browser download.
 *
 * @param {object} queryOptions — same shape as getAllOrders params
 * @param {string} filename     — default 'orders-export.csv'
 */
export const exportCSV = async (queryOptions = {}, filename = 'orders-export.csv') => {
  /* Fetch up to 1000 matching orders */
  const params = buildParams({ ...queryOptions, limit: 1000, page: 1 });
  const data   = await api.get('/orders', { params });
  const orders = data.orders || [];

  if (orders.length === 0) {
    throw new Error('No orders found matching the current filters.');
  }

  /* Build CSV rows */
  const headers = [
    'Order ID',
    'Customer Name',
    'Customer Email',
    'Items',
    'Qty',
    'Items Total',
    'Delivery',
    'Tax',
    'Grand Total',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'City',
    'State',
    'PIN',
    'Phone',
    'Placed On',
    'Delivered On',
    'Cancel Reason',
  ];

  const escape = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str}"`
      : str;
  };

  const rows = orders.map((o) => [
    o._id?.slice(-8).toUpperCase(),
    o.user?.name || 'Guest',
    o.user?.email || '',
    (o.items || []).map((i) => i.name).join(' | '),
    (o.items || []).reduce((s, i) => s + i.quantity, 0),
    o.itemsPrice,
    o.deliveryPrice,
    o.taxPrice,
    o.totalPrice,
    o.paymentMethod,
    o.paymentStatus,
    o.status,
    o.shippingAddress?.city    || '',
    o.shippingAddress?.state   || '',
    o.shippingAddress?.zipCode || '',
    o.shippingAddress?.phone   || '',
    o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '',
    o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('en-IN') : '',
    o.cancelReason || '',
  ].map(escape));

  const csv  = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return orders.length; // return row count for feedback
};

/**
 * Get orders belonging to a specific user (for admin user detail view).
 *
 * @param {string} userId
 * @param {object} [queryOptions]
 * @returns {{ orders, total, page, pages }}
 */
export const getOrdersByUser = async (userId, queryOptions = {}) => {
  if (!userId) throw new Error('User ID is required');
  const params = buildParams(queryOptions);
  params.userId = userId;
  return api.get('/orders', { params });
};

/* Convenience grouped export */
export const orderService = {
  getAllOrders,
  getOrderById,
  updateStatus,
  cancelOrder,
  getDashboardStats,
  bulkUpdateStatus,
  exportCSV,
  getOrdersByUser,
  ORDER_STATUSES,
  CANCELLABLE_STATUSES,
};

export default orderService;