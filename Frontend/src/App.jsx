// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import './index.css';

import Layout     from './components/Layout';
import Home       from './pages/Home';
import Menu       from './pages/Menu';
import Cart       from './pages/Cart';
import Login      from './pages/Login';
import Register   from './pages/Register';
import MyOrders   from './pages/MyOrders';
import PlaceOrder from './pages/PlaceOrder';
import AddItem    from './pages/AddItem';

import { ThemeProvider }        from './context/ThemeContext';   // ✅
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider }          from './context/CartContext';

/* ---------- route guard ---------- */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;
  return children;
};

/* ---------- main app ---------- */
export default function App() {
  return (
    <ThemeProvider>          {/* ✅ theme context wrapper */}
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route element={<Layout />}>
                <Route index                element={<Home />} />
                <Route path="menu"          element={<Menu />} />
                <Route path="cart"          element={<Cart />} />
                <Route path="placeorder"    element={<PlaceOrder />} />

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
              </Route>

              {/* auth pages outside layout */}
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* catch‑all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
