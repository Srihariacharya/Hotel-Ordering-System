import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav className="p-4 bg-gray-100 flex gap-4">
    <Link to="/" className="font-semibold">Menu</Link>
    <Link to="/my-orders" className="font-semibold">My Orders</Link>
    <Link to="/my-orders" className="text-blue-600 hover:underline">View My Orders</Link>
  </nav>
);
