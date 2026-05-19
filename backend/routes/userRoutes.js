import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import {
  updateUserProfile,
  changePassword,
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

/* ── Self-service routes (any authenticated user) ── */
router.put('/profile',         protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

/* ── Admin-only routes ── */
router.route('/')
  .get(protect, admin, getAllUsers);

router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

export default router;

