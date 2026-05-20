import Offer from '../models/Offer.js';

// @desc    Get all active offers
// @route   GET /api/offers
// @access  Public
export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ offers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
};

// @desc    Get all offers (Admin)
// @route   GET /api/offers/admin
// @access  Private/Admin
export const getAdminOffers = async (req, res) => {
  try {
    const offers = await Offer.find({}).sort({ createdAt: -1 });
    res.status(200).json({ offers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
};

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private/Admin
export const createOffer = async (req, res) => {
  try {
    const { code, icon, type, value, headline, desc, minOrder, badge, isActive } = req.body;

    const offerExists = await Offer.findOne({ code: code.toUpperCase() });
    if (offerExists) {
      return res.status(400).json({ message: 'Offer with this code already exists' });
    }

    const offer = await Offer.create({
      code,
      icon,
      type,
      value,
      headline,
      desc,
      minOrder,
      badge,
      isActive
    });

    res.status(201).json({ message: 'Offer created successfully', offer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create offer', error: error.message });
  }
};

// @desc    Delete an offer
// @route   DELETE /api/offers/:id
// @access  Private/Admin
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    await offer.deleteOne();
    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete offer', error: error.message });
  }
};
