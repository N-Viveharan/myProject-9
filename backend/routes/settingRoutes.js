import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-logo${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.route('/')
  .get(getSettings)
  .put(protect, admin, upload.single('logoFile'), updateSettings);

export default router;
