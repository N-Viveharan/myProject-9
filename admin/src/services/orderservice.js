/**
 * orderService.js — Admin Order Service
 * All admin-side order management API calls.
 * Uses the shared Axios instance from api.js (JWT auto-attached).
 */

import api from './api.js';

/* ── Valid statuses (mirrors backend enum) ───────────────────── */
export const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const CANCELLABLE_STATUSES = ['Placed', 'Confirmed'];

/* ── Query param builder ─────────────────────────────────────── */
const buildParams = ({
  page      = 1,
  limit     = 10,
  status    = '',
  search    = '',
  sort      = 'createdAt',
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
   SERVICE FUNCTIONS
   ════════════════════════════════════════════════════════════ */

/**
 * Get all orders (admin view — sees every user's orders).
 * @param {object} queryOptions  page, limit, status, search, sort, direction, dateFrom, dateTo
 * @returns {{ orders, total, page, pages }}
 */
export const getAllOrders = async (queryOptions = {}) => {
  const params = buildParams(queryOptions);
  return api.get('/orders', { params });
};

/**
 * Get a single order with fully populated user and product refs.
 * @param {string} id
 * @returns {{ order }}
 */
export const getOrderById = async (id) => {
  if (!id) throw new Error('Order ID is required');
  return api.get(`/orders/${id}`);
};

/**
 * Update an order's status.
 * Backend automatically sets paymentStatus='Paid' and deliveredAt on 'Delivered'.
 * Backend restores product stock on 'Cancelled'.
 *
 * @param {string} id
 * @param {string} status   — must be one of ORDER_STATUSES
 * @param {string} [reason] — required / recommended when cancelling
 * @returns {{ order }}
 */
export const updateStatus = async (id, status, reason = '') => {
  if (!id)     throw new Error('Order ID is required');
  if (!status) throw new Error('Status is required');

  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status: "${status}". Valid values: ${ORDER_STATUSES.join(', ')}`
    );
  }

  const body = { status };
  if (reason?.trim()) body.reason = reason.trim();

  return api.put(`/orders/${id}/status`, body);
};

/**
 * Cancel an order (admin-initiated).
 * Only Placed or Confirmed orders can be cancelled.
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
 * @returns {{ stats: { totalOrders, totalRevenue, pendingOrders, deliveredOrders, recentOrders[] } }}
 */
export const getDashboardStats = async () => {
  return api.get('/orders/dashboard');
};

/**
 * Batch update multiple orders to the same status.
 * Uses Promise.allSettled — partial failures are logged, not thrown.
 *
 * @param {string[]} ids
 * @param {string}   status
 * @param {string}   [reason]
 * @returns {{ succeeded: string[], failed: string[] }}
 */
export const bulkUpdateStatus = async (ids = [], status, reason = '') => {
  if (!ids.length) throw new Error('No order IDs provided');

  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid status: "${status}"`);
  }

  const body = { status };
  if (reason?.trim()) body.reason = reason.trim();

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
 * Fetches up to 1000 matching orders and triggers a browser download.
 *
 * @param {object} queryOptions — same shape as getAllOrders params
 * @param {string} filename
 * @returns {number} — row count (for feedback toast)
 */
export const exportCSV = async (queryOptions = {}, filename = 'orders-export.csv') => {
  const params = buildParams({ ...queryOptions, limit: 1000, page: 1 });
  const data   = await api.get('/orders', { params });
  const orders = data.orders || [];

  if (!orders.length) throw new Error('No orders match the current filters.');

  const headers = [
    'Order ID', 'Customer', 'Email',
    'Items', 'Qty', 'Subtotal', 'Delivery', 'Tax', 'Total',
    'Payment Method', 'Payment Status', 'Order Status',
    'City', 'State', 'PIN', 'Phone',
    'Placed On', 'Delivered On', 'Cancel Reason',
  ];

  const esc = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const rows = orders.map((o) => [
    o._id?.slice(-8).toUpperCase(),
    o.user?.name  || 'Guest',
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
    o.createdAt   ? new Date(o.createdAt).toLocaleDateString('en-IN')   : '',
    o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('en-IN') : '',
    o.cancelReason || '',
  ].map(esc));

  const csv  = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a  = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return orders.length;
};

/**
 * Get all orders placed by a specific user (admin user-detail view).
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