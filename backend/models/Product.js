import mongoose from 'mongoose';

const choiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
});

const optionGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['select', 'checkbox'], default: 'select' },
  required: { type: Boolean, default: false },
  choices: [choiceSchema],
});

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    category: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    calories: { type: Number },
    preparationTime: { type: Number },
    isVeg: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    image: { type: String }, // Either URL or uploaded file path
    options: [optionGroupSchema],
    reviews: [reviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
