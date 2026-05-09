/**
 * productService.js — Admin Product Service
 * ─────────────────────────────────────────────────────────────
 * All admin-side product API calls.
 * Uses the shared Axios instance from api.js (JWT auto-attached).
 *
 * Exports:
 *   getProducts(params)          — paginated list with filters
 *   getProductById(id)           — single product detail
 *   createProduct(data, file)    — create with image upload
 *   updateProduct(id, data, file)— update fields + optional image
 *   deleteProduct(id)            — permanent delete
 *   deleteBulk(ids[])            — batch delete
 *   toggleAvailability(id, bool) — flip isAvailable
 *   toggleFeatured(id, bool)     — flip isFeatured
 *   getCategories()              — distinct category list
 *   getFeatured(limit)           — featured products only
 *   getDashboardStats()          — product count, low-stock etc.
 */

import api from './api.js';

/* ── Query param builder ─────────────────────────────────────── */
const buildParams = ({
  page      = 1,
  limit     = 10,
  search    = '',
  category  = '',
  sort      = 'createdAt',
  direction = 'desc',
  isAvailable,
  isFeatured,
  isVeg,
  minPrice,
  maxPrice,
} = {}) => {
  const params = { page, limit };
  if (search.trim())  params.search    = search.trim();
  if (category && category !== 'All') params.category = category;
  params.sort = `${sort}_${direction}`;
  if (isAvailable !== undefined && isAvailable !== 'all') params.isAvailable = isAvailable;
  if (isFeatured  !== undefined && isFeatured  !== 'all') params.isFeatured  = isFeatured;
  if (isVeg       !== undefined && isVeg       !== 'all') params.isVeg       = isVeg;
  if (minPrice !== undefined) params.minPrice = minPrice;
  if (maxPrice !== undefined) params.maxPrice = maxPrice;
  return params;
};

/* ── FormData builder ────────────────────────────────────────── */
const toFormData = (data, imageFile) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    fd.append(k, v);
  });
  if (imageFile instanceof File) fd.append('image', imageFile);
  return fd;
};

/* ════════════════════════════════════════════════════════════
   PRODUCT SERVICE FUNCTIONS
   ════════════════════════════════════════════════════════════ */

/**
 * Get paginated product list with optional filters & sort.
 * @returns {{ products, total, page, pages }}
 */
export const getProducts = async (queryOptions = {}) => {
  const params = buildParams(queryOptions);
  return api.get('/products', { params });
};

/**
 * Get a single product by ID (includes populated reviews).
 * @returns {{ product }}
 */
export const getProductById = async (id) => {
  if (!id) throw new Error('Product ID is required');
  return api.get(`/products/${id}`);
};

/**
 * Create a new product with image upload.
 * @param {object} productData  — fields matching the Product schema
 * @param {File}   imageFile    — File object from <input type="file">
 * @returns {{ product }}
 */
export const createProduct = async (productData, imageFile) => {
  const fd = toFormData(productData, imageFile);
  return api.post('/products', fd);
};

/**
 * Update an existing product. imageFile is optional.
 * @param {string} id
 * @param {object} updates
 * @param {File}   [imageFile]
 * @returns {{ product }}
 */
export const updateProduct = async (id, updates, imageFile) => {
  if (!id) throw new Error('Product ID is required');
  const fd = toFormData(updates, imageFile);
  return api.put(`/products/${id}`, fd);
};

/**
 * Permanently delete a product (also removes image from Cloudinary).
 * @returns {{ message }}
 */
export const deleteProduct = async (id) => {
  if (!id) throw new Error('Product ID is required');
  return api.delete(`/products/${id}`);
};

/**
 * Batch delete products — runs in parallel via Promise.allSettled.
 * Logs warnings for any individual failures without throwing.
 * @param {string[]} ids
 * @returns {Promise<PromiseSettledResult[]>}
 */
export const deleteBulk = async (ids = []) => {
  if (!ids.length) throw new Error('No product IDs provided');
  const results = await Promise.allSettled(
    ids.map((id) => api.delete(`/products/${id}`))
  );
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.warn(`[productService] Bulk delete: ${failed.length} failed`);
  }
  return results;
};

/**
 * Flip the isAvailable flag on a single product.
 * @param {string}  id
 * @param {boolean} isAvailable
 * @returns {{ product }}
 */
export const toggleAvailability = async (id, isAvailable) => {
  if (!id) throw new Error('Product ID is required');
  return api.put(`/products/${id}`, { isAvailable: Boolean(isAvailable) });
};

/**
 * Flip the isFeatured flag on a single product.
 * @param {string}  id
 * @param {boolean} isFeatured
 * @returns {{ product }}
 */
export const toggleFeatured = async (id, isFeatured) => {
  if (!id) throw new Error('Product ID is required');
  return api.put(`/products/${id}`, { isFeatured: Boolean(isFeatured) });
};

/**
 * Get all distinct category values from the database.
 * @returns {{ categories: string[] }}
 */
export const getCategories = async () => {
  return api.get('/products/categories');
};

/**
 * Get featured products (for homepage / admin feature management).
 * @param {number} limit — default 8
 * @returns {{ products }}
 */
export const getFeatured = async (limit = 8) => {
  return api.get('/products', { params: { isFeatured: true, limit } });
};

/**
 * Derive product-level dashboard stats client-side.
 * Fetches up to 500 products and aggregates:
 *   total, available, unavailable, outOfStock, lowStock,
 *   categoryBreakdown: { name, count }[]
 *
 * @returns {object}
 */
export const getDashboardStats = async () => {
  const data     = await api.get('/products', { params: { limit: 500, page: 1 } });
  const products = data.products || [];

  const categoryMap = {};
  let outOfStock  = 0;
  let lowStock    = 0;
  let unavailable = 0;

  products.forEach((p) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
    const stock = p.stock ?? 0;
    if (stock === 0)     outOfStock++;
    else if (stock <= 10) lowStock++;
    if (!p.isAvailable)   unavailable++;
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }));

  return {
    total:             data.total || products.length,
    available:         products.filter((p) => p.isAvailable).length,
    unavailable,
    outOfStock,
    lowStock,
    categoryBreakdown,
  };
};

/* Convenience grouped export */
export const productService = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteBulk,
  toggleAvailability,
  toggleFeatured,
  getCategories,
  getFeatured,
  getDashboardStats,
};

export default productService;