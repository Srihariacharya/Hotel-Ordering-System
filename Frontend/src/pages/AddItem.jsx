import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PlaceOrder = () => {
  const { cartItems, clearCart, cartTotal } = useCart();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();

  const handlePlaceOrder = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          items: cartItems,
          total: cartTotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order failed');

      clearCart();
      alert('✅ Order placed successfully!');
      navigate('/myorders');
    } catch (err) {
      alert(err.message);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold">Your cart is empty</h2>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Confirm Your Order</h1>
      <ul className="mb-4">
        {cartItems.map(item => (
          <li key={item._id} className="flex justify-between border-b py-2">
            <span>{item.name} × {item.qty}</span>
            <span>₹{item.price * item.qty}</span>
          </li>
        ))}
      </ul>
      <div className="text-right font-medium text-lg mb-4">
        Total: ₹{cartTotal}
      </div>
      <button
        onClick={handlePlaceOrder}
        className="w-full rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
      >
        Place Order
      </button>
    </div>
  );
};

export default PlaceOrder;