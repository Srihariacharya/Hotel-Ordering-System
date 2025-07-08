import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { X } from 'lucide-react';

const Cart = () => {
  const { cartItems, removeFromCart, clearCart, cartTotal } = useCart();
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center py-16">
        <h2 className="text-2xl font-semibold mb-4">Your cart is empty 🛒</h2>
        <Link
          to="/menu"
          className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Browse Menu
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">My Cart</h1>

      <div className="space-y-4">
        {cartItems.map(item => (
          <div
            key={item._id}
            className="flex items-center justify-between p-4 bg-white shadow rounded-lg"
          >
            <div>
              <h3 className="font-medium text-lg">{item.name}</h3>
              <p className="text-sm text-gray-500">₹{item.price} × {item.qty}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-semibold">₹{item.price * item.qty}</p>
              <button
                onClick={() => removeFromCart(item._id)}
                className="p-2 hover:bg-red-100 rounded-full"
              >
                <X className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow-inner">
        <div className="flex justify-between text-lg font-medium mb-4">
          <span>Total</span>
          <span>₹{cartTotal}</span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={clearCart}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Clear Cart
          </button>
          <button
            onClick={() => navigate('/placeorder')}
            className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </section>
  );
};

export default Cart;
