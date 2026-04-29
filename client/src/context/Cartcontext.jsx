import { createContext, useState, useEffect, useCallback, useMemo } from 'react';

/* ── Constants ───────────────────────────────────────────────── */
const CART_KEY             = 'foodie_cart';
const DELIVERY_CHARGE      = 40;
const FREE_DELIVERY_ABOVE  = 500;
const TAX_RATE             = 0.05;   // 5 %

const VALID_COUPONS = {
  WELCOME10: { type: 'percent', value: 10,  minOrder: 0,   label: '10% off' },
  FLAT50:    { type: 'flat',    value: 50,  minOrder: 300, label: '₹50 off' },
  FREESHIP:  { type: 'ship',    value: 0,   minOrder: 0,   label: 'Free delivery' },
  FEAST20:   { type: 'percent', value: 20,  minOrder: 600, label: '20% off orders ₹600+' },
};

/* ── localStorage helpers ────────────────────────────────────── */
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
};

const saveCart = (items) => {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
  catch { /* storage full — fail silently */ }
};

/* ── Context ─────────────────────────────────────────────────── */
export const CartContext = createContext(null);

/* ── Provider ────────────────────────────────────────────────── */
export function CartProvider({ children }) {
  const [cartItems,   setCartItems]   = useState(loadCart);
  const [couponCode,  setCouponCode]  = useState('');
  const [coupon,      setCoupon]      = useState(null);
  const [couponError, setCouponError] = useState('');

  /* ── Persist on every change ─────────────────────────────── */
  useEffect(() => {
    saveCart(cartItems);
  }, [cartItems]);

  /* ── Clear cart when user logs out ───────────────────────── */
  useEffect(() => {
    const handleLogout = () => {
      setCartItems([]);
      removeCoupon();
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  /* ── Add to cart ─────────────────────────────────────────── */
  const addToCart = useCallback((product, quantity = 1) => {
    const id = product._id || product.product;
    setCartItems((prev) => {
      const exists = prev.find((i) => (i._id || i.product) === id);
      if (exists) {
        return prev.map((i) =>
          (i._id || i.product) === id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          product:      id,
          _id:          id,
          name:         product.name,
          price:        product.price,
          image:        product.image,
          category:     product.category,
          isVeg:        product.isVeg,
          quantity,
        },
      ];
    });
  }, []);

  /* ── Remove from cart ────────────────────────────────────── */
  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) =>
      prev.filter((i) => (i._id || i.product) !== productId)
    );
  }, []);

  /* ── Update quantity ─────────────────────────────────────── */
  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      // Remove instead of setting 0
      setCartItems((prev) =>
        prev.filter((i) => (i._id || i.product) !== productId)
      );
      return;
    }
    setCartItems((prev) =>
      prev.map((i) =>
        (i._id || i.product) === productId ? { ...i, quantity } : i
      )
    );
  }, []);

  /* ── Clear entire cart ───────────────────────────────────── */
  const clearCart = useCallback(() => {
    setCartItems([]);
    setCoupon(null);
    setCouponCode('');
    setCouponError('');
  }, []);

  /* ── Check if product is in cart ─────────────────────────── */
  const isInCart = useCallback(
    (productId) => cartItems.some((i) => (i._id || i.product) === productId),
    [cartItems]
  );

  /* ── Get quantity of a specific product ──────────────────── */
  const getQuantity = useCallback(
    (productId) => {
      const item = cartItems.find((i) => (i._id || i.product) === productId);
      return item?.quantity ?? 0;
    },
    [cartItems]
  );

  /* ── Apply coupon ────────────────────────────────────────── */
  const applyCoupon = useCallback((code) => {
    const upper = code.trim().toUpperCase();
    const found = VALID_COUPONS[upper];

    if (!found) {
      setCouponError('Invalid coupon code.');
      return { success: false, message: 'Invalid coupon code.' };
    }

    const itemsTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    if (found.minOrder > 0 && itemsTotal < found.minOrder) {
      const msg = `This coupon requires a minimum order of ₹${found.minOrder}.`;
      setCouponError(msg);
      return { success: false, message: msg };
    }

    setCoupon({ ...found, code: upper });
    setCouponCode(upper);
    setCouponError('');
    return { success: true, label: found.label };
  }, [cartItems]);

  /* ── Remove coupon ───────────────────────────────────────── */
  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponCode('');
    setCouponError('');
  }, []);

  /* ── Computed totals (memoized) ──────────────────────────── */
  const totals = useMemo(() => {
    const itemCount  = cartItems.reduce((s, i) => s + i.quantity, 0);
    const itemsPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Coupon discount
    let discount = 0;
    let freeShipping = false;
    if (coupon) {
      if (coupon.type === 'percent') {
        discount = parseFloat(((itemsPrice * coupon.value) / 100).toFixed(2));
      } else if (coupon.type === 'flat') {
        discount = Math.min(coupon.value, itemsPrice);
      } else if (coupon.type === 'ship') {
        freeShipping = true;
      }
    }

    const priceAfterDiscount = Math.max(0, itemsPrice - discount);
    const deliveryPrice      = freeShipping || priceAfterDiscount >= FREE_DELIVERY_ABOVE
      ? 0
      : DELIVERY_CHARGE;
    const taxPrice           = parseFloat((priceAfterDiscount * TAX_RATE).toFixed(2));
    const totalPrice         = parseFloat((priceAfterDiscount + deliveryPrice + taxPrice).toFixed(2));
    const savings            = discount + (DELIVERY_CHARGE - deliveryPrice);

    return {
      itemCount,
      itemsPrice:    parseFloat(itemsPrice.toFixed(2)),
      discount:      parseFloat(discount.toFixed(2)),
      deliveryPrice,
      taxPrice,
      totalPrice,
      savings:       parseFloat(savings.toFixed(2)),
      freeShipping,
      amountToFreeShipping: Math.max(0, FREE_DELIVERY_ABOVE - priceAfterDiscount),
    };
  }, [cartItems, coupon]);

  /* ── Build order payload for checkout ────────────────────── */
  const buildOrderPayload = useCallback((shippingAddress, paymentMethod = 'COD', notes = '') => ({
    items: cartItems.map((i) => ({
      product:  i.product || i._id,
      quantity: i.quantity,
    })),
    shippingAddress,
    paymentMethod,
    notes,
    couponCode: coupon?.code || '',
  }), [cartItems, coupon]);

  /* ── Context value ───────────────────────────────────────── */
  const value = {
    // State
    cartItems,
    couponCode,
    coupon,
    couponError,
    // Totals
    ...totals,
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getQuantity,
    applyCoupon,
    removeCoupon,
    buildOrderPayload,
    // Constants (useful for UI)
    FREE_DELIVERY_ABOVE,
    DELIVERY_CHARGE,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}