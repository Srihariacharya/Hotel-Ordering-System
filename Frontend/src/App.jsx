// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

import './index.css';

// Pages
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import MyOrders from './pages/MyOrders';
import PlaceOrder from './pages/PlaceOrder';
import AddItem from './pages/AddItem';
import AdminOrders from './pages/AdminOrders';
import OrderSuccess from './pages/OrderSuccess';
import AdminAnalytics from './pages/AdminAnalytics';
import UpdateMenuImages from './pages/UpdateMenuImages';
import AdminMenuDashboard from './pages/AdminMenuDashboard';
import EditItem from './pages/EditItem';
import Invoice from './pages/Invoice';

// Layout & Context
import Layout from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// 🔐 Protected Route Wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Routes>

            {/* ✅ Routes using shared layout */}
            <Route element={<Layout />}>

              <Route index element={<Home />} />
              <Route path="menu" element={<Menu />} />
              <Route path="cart" element={<Cart />} />
              <Route path="placeorder" element={<PlaceOrder />} />

              <Route
                path="myorders"
                element={
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                }
              />

              {/* ✅ Admin-only routes inside layout */}
              <Route
                path="admin/orders"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/analytics"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/update-images"
                element={
                  <ProtectedRoute adminOnly>
                    <UpdateMenuImages />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 🚫 Routes that don’t use the layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invoice/:id" element={<Invoice />} />
            <Route path="/order/success" element={<OrderSuccess />} />

            {/* 🧾 Admin-only routes (outside layout) */}
            <Route
              path="/admin/menu"
              element={
                <ProtectedRoute adminOnly>
                  <AdminMenuDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/add-item"
              element={
                <ProtectedRoute adminOnly>
                  <AddItem />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/edit-item/:id"
              element={
                <ProtectedRoute adminOnly>
                  <EditItem />
                </ProtectedRoute>
              }
            />

            {/* 🌐 Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
