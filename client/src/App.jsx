import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import Navbar from './components/Navbar/Navbar.jsx';
import Footer from './components/Footer/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import Spinner from './components/Spinner/Spinner.jsx';

/* ── Lazy-loaded pages ───────────────────────────────────────── */
const Home           = lazy(() => import('./pages/Home/Home.jsx'));
const ProductListing = lazy(() => import('./pages/ProductListing/ProductListing.jsx'));
const ProductDetail  = lazy(() => import('./pages/ProductDetail/ProductDetail.jsx'));
const Cart           = lazy(() => import('./pages/Cart/Cart.jsx'));
const Checkout       = lazy(() => import('./pages/Checkout/Checkout.jsx'));
const OrderHistory   = lazy(() => import('./pages/OrderHistory/OrderHistory.jsx'));
const Login          = lazy(() => import('./pages/Login/Login.jsx'));
const Register       = lazy(() => import('./pages/Register/Register.jsx'));
const NotFound       = lazy(() => import('./pages/NotFound/NotFound.jsx'));

/* ── Page-level loading fallback ─────────────────────────────── */
const PageLoader = () => (
  <div style={{
    minHeight:       '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      '#fffdf8',
  }}>
    <Spinner variant="food" size="lg" label="Loading…" />
  </div>
);

/* ── Layout wrapper (Navbar + main content + Footer) ─────────── */
function Layout({ children, hideFooter = false }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}

/* ── Auth layout (no Navbar/Footer for login/register) ───────── */
function AuthLayout({ children }) {
  return <>{children}</>;
}

/* ════════════════════════════════════════════════════════════
   APP
   ════════════════════════════════════════════════════════════ */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>

              {/* ── Public routes (with Navbar + Footer) ──── */}
              <Route path="/" element={
                <Layout>
                  <Home />
                </Layout>
              } />

              <Route path="/products" element={
                <Layout>
                  <ProductListing />
                </Layout>
              } />

              <Route path="/products/:id" element={
                <Layout>
                  <ProductDetail />
                </Layout>
              } />

              {/* ── Auth routes (no Navbar/Footer) ─────────── */}
              <Route path="/login" element={
                <AuthLayout>
                  <Login />
                </AuthLayout>
              } />

              <Route path="/register" element={
                <AuthLayout>
                  <Register />
                </AuthLayout>
              } />

              {/* ── Protected user routes ───────────────────── */}
              <Route path="/cart" element={
                <Layout>
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                </Layout>
              } />

              <Route path="/checkout" element={
                <Layout hideFooter>
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                </Layout>
              } />

              <Route path="/orders" element={
                <Layout>
                  <ProtectedRoute>
                    <OrderHistory />
                  </ProtectedRoute>
                </Layout>
              } />

              {/* ── Redirects ───────────────────────────────── */}
              <Route path="/menu"  element={<Navigate to="/products" replace />} />
              <Route path="/shop"  element={<Navigate to="/products" replace />} />
              <Route path="/home"  element={<Navigate to="/"         replace />} />

              {/* ── 404 ─────────────────────────────────────── */}
              <Route path="*" element={
                <Layout>
                  <NotFound />
                </Layout>
              } />

            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}