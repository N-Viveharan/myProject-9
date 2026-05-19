import Order from '../models/Order.js';
import Product from '../models/Product.js';

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    let itemsPrice = 0;
    const orderItems = [];

    // Verify stock and fetch prices from database to calculate totals securely
    for (const item of items) {
      const dbProduct = await Product.findById(item.product);
      if (!dbProduct) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }

      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${dbProduct.name}` });
      }

      itemsPrice += dbProduct.price * item.quantity;
      orderItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: item.quantity,
      });
    }

    // Calculate coupon discount
    let discount = 0;
    let freeShipping = false;

    if (couponCode) {
      const code = couponCode.toUpperCase();
      if (code === 'WELCOME10') {
        discount = itemsPrice * 0.1;
      } else if (code === 'FLAT50') {
        if (itemsPrice >= 300) {
          discount = 50;
        }
      } else if (code === 'FREESHIP') {
        freeShipping = true;
      } else if (code === 'FEAST20') {
        if (itemsPrice >= 600) {
          discount = itemsPrice * 0.2;
        }
      }
      discount = parseFloat(discount.toFixed(2));
    }

    const priceAfterDiscount = Math.max(0, itemsPrice - discount);
    const deliveryPrice = (freeShipping || priceAfterDiscount >= 500) ? 0 : 40;
    const taxPrice = parseFloat((priceAfterDiscount * 0.05).toFixed(2));
    const totalPrice = parseFloat((priceAfterDiscount + deliveryPrice + taxPrice).toFixed(2));

    // Create the order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      notes: notes || '',
      couponCode: couponCode || '',
      discount,
      itemsPrice: parseFloat(itemsPrice.toFixed(2)),
      deliveryPrice,
      taxPrice,
      totalPrice,
    });

    // Deduct product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const createdOrder = await order.save();
    res.status(201).json({ success: true, order: createdOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price image category isVeg');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only allow owner or admin
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only allow owner or admin
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    if (order.status !== 'Placed' && order.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is already ${order.status}`,
      });
    }

    order.status = 'Cancelled';
    order.cancelReason = req.body.reason || 'Cancelled by customer';

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder, message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.userId) {
      query.user = req.query.userId;
    }

    if (req.query.search) {
      query['shippingAddress.fullName'] = { $regex: req.query.search, $options: 'i' };
    }

    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) query.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const endOfDay = new Date(req.query.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    let sortObj = { createdAt: -1 };
    if (req.query.sort) {
      const [field, dir] = req.query.sort.split('_');
      sortObj[field] = dir === 'desc' ? -1 : 1;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price image category')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const prevStatus = order.status;
    order.status = status;

    if (reason) {
      order.cancelReason = reason;
    }

    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
      order.deliveredAt = new Date();
    }

    // If order was cancelled, restore stock
    if (status === 'Cancelled' && prevStatus !== 'Cancelled') {
      order.cancelReason = reason || 'Cancelled by admin';
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder, message: `Order status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard statistics (Admin only)
// @route   GET /api/orders/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    
    // Revenue is the sum of Delivered orders' totalPrice
    const deliveredOrdersDoc = await Order.find({ status: 'Delivered' });
    const totalRevenue = deliveredOrdersDoc.reduce((sum, o) => sum + o.totalPrice, 0);

    const deliveredOrders = deliveredOrdersDoc.length;
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery'] },
    });

    // Compute last 7 days of stats for sparkline charts
    const recentOrders = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const dayOrders = await Order.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      const dayRevenue = dayOrders
        .filter(o => o.status === 'Delivered')
        .reduce((sum, o) => sum + o.totalPrice, 0);

      recentOrders.push({
        date: startOfDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: dayRevenue,
        count: dayOrders.length,
      });
    }

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        recentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
