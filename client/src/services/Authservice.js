import { post, get, put } from './Api.js';

/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE
   All functions return { success, data?, message? }
   so callers never need to catch — just check success.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Register a new user.
 * @param {{ name:string, email:string, password:string }} payload
 * @returns {{ success:boolean, token?:string, user?:object, message?:string }}
 */
export const register = async ({ name, email, password }) => {
  try {
    const { data } = await post('/auth/register', { name, email, password });
    return { success: true, token: data.token, user: data.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Log in an existing user.
 * @param {{ email:string, password:string }} payload
 * @returns {{ success:boolean, token?:string, user?:object, message?:string }}
 */
export const login = async ({ email, password }) => {
  try {
    const { data } = await post('/auth/login', { email, password });
    return { success: true, token: data.token, user: data.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Log out the current user (server-side token invalidation signal).
 * The caller is responsible for clearing the local token.
 * @returns {{ success:boolean, message?:string }}
 */
export const logout = async () => {
  try {
    await post('/auth/logout');
    return { success: true };
  } catch {
    /* Logout should always succeed locally even if server call fails */
    return { success: true };
  }
};

/**
 * Fetch the current authenticated user's profile.
 * Uses the token stored in localStorage (injected by api.js interceptor).
 * @returns {{ success:boolean, user?:object, message?:string }}
 */
export const getMe = async () => {
  try {
    const { data } = await get('/auth/me');
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Update the current user's name, phone, and address.
 * @param {{ name?:string, phone?:string, address?:object }} updates
 * @returns {{ success:boolean, user?:object, message?:string }}
 */
export const updateProfile = async (updates) => {
  try {
    const { data } = await put('/users/profile', updates);
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

/**
 * Change the current user's password.
 * @param {{ currentPassword:string, newPassword:string }} payload
 * @returns {{ success:boolean, message?:string }}
 */
export const changePassword = async ({ currentPassword, newPassword }) => {
  try {
    const { data } = await put('/users/change-password', { currentPassword, newPassword });
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

const authService = { register, login, logout, getMe, updateProfile, changePassword };
export default authService;