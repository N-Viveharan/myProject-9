import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  icon: {
    type: String,
    default: '🎁',
  },
  type: {
    type: String,
    enum: ['percent', 'flat', 'ship', 'feast', 'other'],
    default: 'other',
  },
  value: {
    type: String,
    required: true,
  },
  headline: {
    type: String,
    required: true,
  },
  desc: {
    type: String,
    required: true,
  },
  minOrder: {
    type: String,
    default: null,
  },
  badge: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
