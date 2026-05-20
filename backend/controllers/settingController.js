import Setting from '../models/Setting.js';

// @desc    Get settings
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({});
    }

    const { shopName, contactEmail, contactPhone, address, socialLinks, operatingHours } = req.body;

    if (shopName) settings.shopName = shopName;
    if (contactEmail) settings.contactEmail = contactEmail;
    if (contactPhone) settings.contactPhone = contactPhone;
    if (address) settings.address = address;
    if (operatingHours) settings.operatingHours = operatingHours;
    
    if (socialLinks) {
      try {
        const parsed = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
        settings.socialLinks = { ...settings.socialLinks, ...parsed };
      } catch (e) {
        console.error('Failed to parse social links', e);
      }
    }

    if (req.file) {
      settings.logo = `/uploads/${req.file.filename}`;
    } else if (req.body.logo) {
      settings.logo = req.body.logo;
    }

    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
