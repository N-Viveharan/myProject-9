import { get, post, put, del, upload } from './Api.js';

/* ═══════════════════════════════════════════════════════════════
   PRODUCT SERVICE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Fetch a paginated, filtered list of products.
 *
 * @param {object} filters
 * @param {string}  [filters.search]
 * @param {string}  [filters.category]
 * @param {string}  [filters.sort]       — 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc' | 'createdAt_desc'
 * @param {number}  [filters.maxPrice]
 * @param {boolean} [filters.isVeg]
 * @param {boolean} [filters.isFeatured]
 * @param {number}  [filters.page]       — default 1
 * @param {number}  [filters.limit]      — default 12
 *
 * @returns {{ success:boolean, products?:Array, total?:number, page?:number, pages?:number, message?:string }}
 */
export const getProducts = async (filters = {}) => {
  try {
    const params = {};
    if (filters.search)              params.search     = filters.search;
    if (filters.category && filters.category !== 'all') params.category = filters.category;
    if (filters.sort)                params.sort       = filters.sort;
    if (filters.maxPrice != null && filters.maxPrice < 2000) params.maxPrice = filters.maxPrice;
    if (filters.isVeg)               params.isVeg      = true;
    if (filters.isFeatured)          params.isFeatured = true;
    params.page  = filters.page  || 1;
    params.limit = filters.limit || 12;

    const { data } = await get('/products', params);
    return {
      success:  true,
      products: data.products || [],
      total:    data.total    || 0,
      page:     data.page     || 1,
      pages:    data.pages    || 1,
    };
  } catch (err) {
    return { success: false, message: err.message, products: [] };
  }
};

/**
 * Fetch a single product by ID (includes reviews).
 * @param {string} id
 * @returns {{ success:boolean, product?:object, message?:string }}
 */
export const getProductById = async (id) => {
  try {
    const { data } = await get(`/products/${id}`);
    return { success: true, product: data.product };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Fetch products marked as featured.
 * @param {number} [limit=8]
 * @returns {{ success:boolean, products?:Array, message?:string }}
 */
export const getFeaturedProducts = async (limit = 8) => {
  try {
    const { data } = await get('/products', { isFeatured: true, limit });
    return { success: true, products: data.products || [] };
  } catch (err) {
    return { success: false, message: err.message, products: [] };
  }
};

/**
 * Get all distinct product categories.
 * @returns {{ success:boolean, categories?:string[], message?:string }}
 */
export const getCategories = async () => {
  try {
    const { data } = await get('/products/categories');
    return { success: true, categories: data.categories || [] };
  } catch (err) {
    return { success: false, message: err.message, categories: [] };
  }
};

/**
 * Search products — thin wrapper around getProducts for autocomplete use.
 * @param {string} query
 * @param {number} [limit=6]
 * @returns {{ success:boolean, products?:Array, message?:string }}
 */
export const searchProducts = async (query, limit = 6) => {
  if (!query?.trim()) return { success: true, products: [] };
  return getProducts({ search: query.trim(), limit, page: 1 });
};

/**
 * Add a review to a product.
 * @param {string} productId
 * @param {{ rating:number, comment:string }} review
 * @returns {{ success:boolean, product?:object, message?:string }}
 */
export const addReview = async (productId, { rating, comment }) => {
  try {
    const { data } = await post(`/products/${productId}/reviews`, { rating, comment });
    return { success: true, product: data.product };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/* ── Admin-only operations ───────────────────────────────────── */

/**
 * Create a new product (admin).
 * Accepts a FormData object — image upload handled server-side via Cloudinary.
 * @param {FormData} formData
 * @param {Function} [onProgress] — (0-100) upload progress callback
 * @returns {{ success:boolean, product?:object, message?:string }}
 */
export const createProduct = async (formData, onProgress) => {
  try {
    const { data } = await upload('/products', formData, onProgress);
    return { success: true, product: data.product };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Update a product (admin).
 * Pass a FormData if replacing the image, plain object otherwise.
 * @param {string}          id
 * @param {FormData|object} payload
 * @param {Function}        [onProgress]
 * @returns {{ success:boolean, product?:object, message?:string }}
 */
export const updateProduct = async (id, payload, onProgress) => {
  try {
    const isFormData = payload instanceof FormData;
    const { data }   = isFormData
      ? await upload(`/products/${id}`, payload, onProgress)
      : await put(`/products/${id}`, payload);
    return { success: true, product: data.product };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Delete a product (admin).
 * @param {string} id
 * @returns {{ success:boolean, message?:string }}
 */
export const deleteProduct = async (id) => {
  try {
    const { data } = await del(`/products/${id}`);
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Toggle a product's availability (admin).
 * @param {string}  id
 * @param {boolean} isAvailable
 * @returns {{ success:boolean, product?:object, message?:string }}
 */
export const toggleAvailability = async (id, isAvailable) => {
  try {
    const { data } = await put(`/products/${id}`, { isAvailable });
    return { success: true, product: data.product };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Get all products for admin (includes unavailable items).
 * @param {object} [filters]
 * @returns {{ success:boolean, products?:Array, total?:number, pages?:number }}
 */
export const getAdminProducts = async (filters = {}) => {
  try {
    const params = { page: 1, limit: 20, ...filters };
    const { data } = await get('/products/admin', params);
    return {
      success:  true,
      products: data.products || [],
      total:    data.total    || 0,
      pages:    data.pages    || 1,
    };
  } catch (err) {
    return { success: false, message: err.message, products: [] };
  }
};

const productService = {
  getProducts, getProductById, getFeaturedProducts,
  getCategories, searchProducts, addReview,
  createProduct, updateProduct, deleteProduct,
  toggleAvailability, getAdminProducts,
};

export default productService;