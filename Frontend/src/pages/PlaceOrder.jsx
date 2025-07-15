import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function PlaceOrder() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false); // ✅ New flag

  // ✅ Move redirect to useEffect so it doesn't run before render
  useEffect(() => {
    if (cartItems.length === 0 && !orderPlaced) {
      navigate('/cart');
    }
  }, [cartItems, orderPlaced, navigate]);

  async function handlePlaceOrder(e) {
    e.preventDefault();

    if (!Number(tableNumber)) {
      alert('Please enter a valid table number');
      return;
    }

    const orderData = {
      items: cartItems.map(i => ({
        menuItem: i._id,
        quantity: i.qty,
        price: i.price,
      })),
      tableNumber: Number(tableNumber),
      totalAmount: cartTotal,
    };

    try {
      setLoading(true);
      await api.post('/order', orderData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      clearCart();
      setOrderPlaced(true); // ✅ Prevent redirect to /cart
      navigate('/order/success'); // ✅ Show confirmation
    } catch (err) {
      console.error('❌ Order failed:', err);
      alert(err.response?.data?.error || 'Order failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-green-700 dark:text-green-300">
        Confirm Order
      </h1>

      <ul className="mb-4 space-y-2 text-gray-800 dark:text-gray-100">
        {cartItems.map(i => (
          <li key={i._id} className="flex justify-between border-b pb-1">
            <span>{i.name} × {i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </li>
        ))}
      </ul>

      <div className="mb-6">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-100">
          Table Number
        </label>
        <input
          type="number"
          required
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="Enter Table Number"
          className="w-full p-3 border rounded-md"
        />
      </div>

      <div className="flex justify-between text-lg font-semibold text-green-800 dark:text-green-300 mb-6">
        <span>Total</span>
        <span>₹{cartTotal}</span>
      </div>

      <form onSubmit={handlePlaceOrder}>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-green-600 hover:bg-green-700 text-white font-semibold py-2"
        >
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </section>
  );
}
