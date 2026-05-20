import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  shopName: { type: String, default: 'FoodieExpress' },
  logo: { type: String, default: '' },
  contactEmail: { type: String, default: 'contact@foodieexpress.com' },
  contactPhone: { type: String, default: '+1 234 567 8900' },
  address: { type: String, default: '123 Food Street, City, Country' },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
  },
  operatingHours: { type: String, default: 'Mon-Sun: 9:00 AM - 10:00 PM' },
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
