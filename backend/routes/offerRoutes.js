import express from 'express';
import { getOffers, getAdminOffers, createOffer, deleteOffer } from '../controllers/offerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getOffers)
  .post(protect, admin, createOffer);

router.get('/admin', protect, admin, getAdminOffers);

router.route('/:id')
  .delete(protect, admin, deleteOffer);

export default router;
