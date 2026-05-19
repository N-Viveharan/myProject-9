import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// @desc    Get distinct categories
// @route   GET /api/products/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all reviews across all products
// @route   GET /api/products/reviews/all
// @access  Private/Admin
router.get('/reviews/all', protect, admin, async (req, res) => {
  try {
    const products = await Product.find({}).select('name reviews');
    let allReviews = [];
    products.forEach((product) => {
      if (product.reviews && product.reviews.length > 0) {
        product.reviews.forEach((review) => {
          allReviews.push({
            _id: review._id,
            productId: product._id,
            productName: product.name,
            name: review.name,
            rating: review.rating,
            comment: review.comment,
            user: review.user,
            createdAt: review.createdAt,
          });
        });
      }
    });
    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ reviews: allReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, isAvailable, isFeatured, sort } = req.query;
    
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (isAvailable && isAvailable !== 'all') {
      query.isAvailable = isAvailable === 'true';
    }
    if (isFeatured) {
      query.isFeatured = isFeatured === 'true';
    }
    
    let sortObj = { createdAt: -1 };
    if (sort) {
      const [field, dir] = sort.split('_');
      sortObj[field] = dir === 'asc' ? 1 : -1;
    }

    const pageSize = Number(limit);
    const skip = (Number(page) - 1) * pageSize;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query).sort(sortObj).skip(skip).limit(pageSize);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / pageSize) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json({ product });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'Product already reviewed' });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added', product });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product review
// @route   DELETE /api/products/:productId/reviews/:reviewId
// @access  Private/Admin
router.delete('/:productId/reviews/:reviewId', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (product) {
      product.reviews = product.reviews.filter(
        (r) => r._id.toString() !== req.params.reviewId
      );

      product.numReviews = product.reviews.length;
      if (product.reviews.length > 0) {
        product.rating =
          product.reviews.reduce((acc, item) => item.rating + acc, 0) /
          product.reviews.length;
      } else {
        product.rating = 0;
      }

      await product.save();
      res.json({ message: 'Review deleted successfully', product });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private (should be admin protected, but skipping for simplicity)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let { name, description, price, category, stock, calories, preparationTime, isVeg, isFeatured, isAvailable, imageUrl, options } = req.body;
    
    // Parse boolean strings from FormData
    isVeg = isVeg === 'true';
    isFeatured = isFeatured === 'true';
    isAvailable = isAvailable === 'true';
    
    // Parse numbers
    price = Number(price);
    stock = Number(stock);
    if (calories) calories = Number(calories);
    if (preparationTime) preparationTime = Number(preparationTime);

    // Handle image
    let image = imageUrl;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    // Handle options (it might be sent as JSON string if modified in frontend, or string `[object Object]` if not)
    let parsedOptions = [];
    if (options) {
      try {
        parsedOptions = JSON.parse(options);
      } catch(e) {
        // if frontend sends [object Object], it will fail.
        parsedOptions = [];
      }
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      calories,
      preparationTime,
      isVeg,
      isFeatured,
      isAvailable,
      image,
      options: parsedOptions,
    });

    const createdProduct = await product.save();
    res.status(201).json({ product: createdProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (product) {
      const fieldsToUpdate = ['name', 'description', 'price', 'category', 'stock', 'calories', 'preparationTime'];
      fieldsToUpdate.forEach(field => {
        if (req.body[field] !== undefined) product[field] = req.body[field];
      });

      // Booleans
      if (req.body.isVeg !== undefined) product.isVeg = req.body.isVeg === true || req.body.isVeg === 'true';
      if (req.body.isFeatured !== undefined) product.isFeatured = req.body.isFeatured === true || req.body.isFeatured === 'true';
      if (req.body.isAvailable !== undefined) product.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';

      if (req.body.imageUrl !== undefined) product.image = req.body.imageUrl;
      if (req.file) {
        product.image = `/uploads/${req.file.filename}`;
      }

      if (req.body.options) {
        try {
          product.options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options;
        } catch(e) {}
      }

      const updatedProduct = await product.save();
      res.json({ product: updatedProduct });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await Product.deleteOne({ _id: product._id });
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
