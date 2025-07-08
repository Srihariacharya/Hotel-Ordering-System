import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Menu, X, ShoppingCart } from 'lucide-react';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
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
    <nav className="bg-veg-700 text-veg-100 shadow-md sticky top-0 z-50">
      <div className="w-full px-4 py-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-veg-50">HotelOrder</span>
          </Link>

          <div className="hidden md:flex space-x-4">{renderLinks()}</div>

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
          </div>

          <button
            className="inline-flex items-center justify-center md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-2 pt-2 pb-3 space-y-1 bg-veg-700/95 backdrop-blur">
          {renderLinks()}
          <Link
            to="/cart"
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-veg-600/20"
            onClick={() => setOpen(false)}
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
        </div>
      )}
    </nav>
  );
};

export default Navbar;
