import { get, post, put } from './Api.js';

/* ═══════════════════════════════════════════════════════════════
   ORDER SERVICE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Place a new order.
 *
 * @param {object} payload
 * @param {Array}   payload.items            — [{ product, quantity }]
 * @param {object}  payload.shippingAddress  — full address object
 * @param {string}  [payload.paymentMethod]  — 'COD' | 'UPI' | 'Card'
 * @param {string}  [payload.notes]
 * @param {string}  [payload.couponCode]
 *
 * @returns {{ success:boolean, order?:object, message?:string }}
 */
export const placeOrder = async (payload) => {
  try {
    const { data } = await post('/orders', {
      items:           payload.items,
      shippingAddress: payload.shippingAddress,
      paymentMethod:   payload.paymentMethod || 'COD',
      notes:           payload.notes         || '',
      couponCode:      payload.couponCode    || '',
    });
    return { success: true, order: data.order };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Fetch the current user's order history (paginated).
 *
 * @param {object} [options]
 * @param {number}  [options.page]    — default 1
 * @param {number}  [options.limit]   — default 10
 * @param {string}  [options.status]  — filter by status
 *
 * @returns {{ success:boolean, orders?:Array, total?:number, pages?:number, message?:string }}
 */
export const getMyOrders = async ({ page = 1, limit = 10, status } = {}) => {
  try {
    const params = { page, limit };
    if (status) params.status = status;
    const { data } = await get('/orders/my', params);
    return {
      success: true,
      orders:  data.orders || [],
      total:   data.total  || 0,
      page:    data.page   || 1,
      pages:   data.pages  || 1,
    };
  } catch (err) {
    return { success: false, message: err.message, orders: [] };
  }
};

/**
 * Fetch a single order by ID.
 * Works for both the order owner and admins.
 * @param {string} orderId
 * @returns {{ success:boolean, order?:object, message?:string }}
 */
export const getOrderById = async (orderId) => {
  try {
    const { data } = await get(`/orders/${orderId}`);
    return { success: true, order: data.order };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Cancel an order that is still in 'Placed' or 'Confirmed' state.
 * @param {string} orderId
 * @param {string} [reason]
 * @returns {{ success:boolean, order?:object, message?:string }}
 */
export const cancelOrder = async (orderId, reason = '') => {
  try {
    const { data } = await put(`/orders/${orderId}/cancel`, { reason });
    return { success: true, order: data.order, message: data.message };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/* ── Admin-only operations ───────────────────────────────────── */

/**
 * Fetch all orders — admin only (paginated).
 *
 * @param {object} [options]
 * @param {number}  [options.page]
 * @param {number}  [options.limit]
 * @param {string}  [options.status]  — filter by status
 *
 * @returns {{ success:boolean, orders?:Array, total?:number, pages?:number, message?:string }}
 */
export const getAllOrders = async ({ page = 1, limit = 20, status } = {}) => {
  try {
    const params = { page, limit };
    if (status) params.status = status;
    const { data } = await get('/orders', params);
    return {
      success: true,
      orders:  data.orders || [],
      total:   data.total  || 0,
      page:    data.page   || 1,
      pages:   data.pages  || 1,
    };
  } catch (err) {
    return { success: false, message: err.message, orders: [] };
  }
};

/**
 * Update an order's status — admin only.
 *
 * @param {string} orderId
 * @param {string} status  — 'Confirmed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled'
 * @param {string} [reason]
 * @returns {{ success:boolean, order?:object, message?:string }}
 */
export const updateOrderStatus = async (orderId, status, reason = '') => {
  try {
    const { data } = await put(`/orders/${orderId}/status`, { status, reason });
    return { success: true, order: data.order, message: data.message };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Fetch dashboard stats — admin only.
 * @returns {{ success:boolean, stats?:object, message?:string }}
 */
export const getDashboardStats = async () => {
  try {
    const { data } = await get('/orders/stats/dashboard');
    return { success: true, stats: data.stats };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

const orderService = {
  placeOrder, getMyOrders, getOrderById, cancelOrder,
  getAllOrders, updateOrderStatus, getDashboardStats,
};

export default orderService;