import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function PlaceOrder() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');

  if (cartItems.length === 0) return navigate('/cart');

  async function handlePlaceOrder(e) {
    e.preventDefault();
    const orderData = {
      items: cartItems.map(i => ({ itemId: i._id, qty: i.qty })),
      total: cartTotal,
      address,
    };
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE}/api/orders`,
        orderData,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      clearCart();
      navigate('/myorders');
    } catch (err) {
      alert(err.response?.data?.message || 'Order failed');
    }
  }

  return (
    <section className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Confirm Order</h1>

      <ul className="mb-4 space-y-2">
        {cartItems.map(i => (
          <li key={i._id} className="flex justify-between">
            <span>{i.name} × {i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between text-lg font-medium mb-6">
        <span>Total</span>
        <span>₹{cartTotal}</span>
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-4">
        <textarea
          required
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Delivery address"
          className="w-full p-3 border rounded-md"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Place Order
        </button>
      </form>
    </section>
  );
}
