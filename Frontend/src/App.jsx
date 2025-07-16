// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

import './index.css';
import Invoice from './pages/Invoice';
import Layout from './components/Layout';
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


import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

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

            {/* ✅ Pages that use common layout */}
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

              <Route
                path="additem"
                element={
                  <ProtectedRoute adminOnly>
                    <AddItem />
                  </ProtectedRoute>
                }
              />

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
              path="/admin/update-images"
              element={
              <ProtectedRoute adminOnly>
              <UpdateMenuImages />
               </ProtectedRoute>
           }
          />
            </Route>

            {/* ✅ Routes outside layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invoice/:id" element={<Invoice />} />
            <Route path="/order/success" element={<OrderSuccess />} />

            {/* catch-all fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
