import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Menu, X, ShoppingCart, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Home', private: false },
    { to: '/menu', label: 'Menu', private: false },
    { to: '/myorders', label: 'My Orders', private: true },
    { to: '/additem', label: 'Add Item', private: true, adminOnly: true },
  ];

  const renderLinks = () =>
    links
      .filter(l => {
        if (l.private && !user) return false;
        if (l.adminOnly && !user?.isAdmin) return false;
        return true;
      })
      .map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `px-3 py-2 rounded-md text-sm font-medium ${
              isActive
                ? 'bg-veg-600 text-white'
                : 'text-veg-100 hover:bg-veg-600/20'
            }`
          }
        >
          {l.label}
        </NavLink>
      ));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-veg-700 text-veg-100 dark:bg-gray-900 dark:text-white shadow-md sticky top-0 z-50">
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-veg-50 dark:text-white">HotelOrder</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-4 items-center">
            {renderLinks()}
          </div>

          {/* Desktop Right: Cart + Auth + Theme */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/cart" className="relative flex items-center">
              <ShoppingCart className="h-6 w-6" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-3 rounded-full bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Link>

            {user ? (
              <>
                <span className="text-sm">Hi, {user.name}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-veg-500 px-3 py-2 text-sm font-medium text-white hover:bg-veg-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md bg-veg-500 px-3 py-2 text-sm font-medium text-white hover:bg-veg-600"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-md border border-veg-200 px-3 py-2 text-sm font-medium hover:bg-veg-600/20"
                >
                  Register
                </Link>
              </>
            )}

            <button
              onClick={toggle}
              className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Toggle Theme"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="inline-flex items-center justify-center md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden px-4 pt-2 pb-4 bg-veg-700 dark:bg-gray-900 backdrop-blur space-y-2">
          {renderLinks()}
          <Link
            to="/cart"
            onClick={() => setOpen(false)}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-veg-600/20"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart ({cartItems.length})
          </Link>

          {user ? (
            <button
              onClick={() => {
                handleLogout();
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:bg-veg-600/20"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-veg-600/20"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-veg-600/20"
              >
                Register
              </Link>
            </>
          )}

          <div className="flex justify-end pr-3">
            <button
              onClick={toggle}
              className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
