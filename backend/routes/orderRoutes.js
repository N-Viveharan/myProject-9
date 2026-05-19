import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin Dashboard stats
router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/stats/dashboard', protect, getDashboardStats); // Client or general stats fallback

// User order history
router.get('/my', protect, getMyOrders);

// Create order
router.post('/', protect, createOrder);

// Single order details
router.get('/:id', protect, getOrderById);

// Cancel order
router.put('/:id/cancel', protect, cancelOrder);

// Admin get all orders / updates
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;
