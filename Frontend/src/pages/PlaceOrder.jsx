import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function PlaceOrder() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, getToken, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Redirect if not authenticated or empty cart (unless order just placed)
  useEffect(() => {
    if (!isAuthenticated()) {
      console.warn('🔒 User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0 && !orderPlaced) {
      console.log('🛒 Empty cart, redirecting to cart page');
      navigate('/cart');
    }
  }, [cartItems, orderPlaced, navigate, isAuthenticated]);

  // Debug info for dev mode
  useEffect(() => {
    console.log('🔍 PlaceOrder Debug:', {
      user,
      hasToken: !!getToken(),
      cartItemsCount: cartItems.length,
      isAuthenticated: isAuthenticated(),
    });
  }, [user, getToken, cartItems, isAuthenticated]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      alert('Please log in to place an order');
      navigate('/login');
      return;
    }

    const tableNum = parseInt(tableNumber, 10);
    if (!tableNum || tableNum < 1) {
      alert('Please enter a valid table number');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    const orderData = {
      tableNumber: tableNum,
      items: cartItems.map(item => ({
        menuItem: item._id,
        quantity: item.qty,
        price: item.price,
      })),
      totalAmount: cartTotal,
    };

    console.log('📤 Placing order:', orderData);
    console.log('🎫 Using token:', getToken() ? 'Present' : 'Missing');

    try {
      setLoading(true);

      const response = await api.post('/order', orderData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Order placed successfully:', response.data);

      clearCart();
      setOrderPlaced(true);

      alert('Order placed successfully!');
      navigate('/order/success');
    } catch (error) {
      console.error('❌ Order placement failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 401) {
        alert('Authentication failed.');
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.error || 'Invalid order data');
      } else {
        alert('Failed to place order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-green-700 dark:text-green-700">
        Confirm Order
      </h1>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Ordering as:</strong> {user.name} ({user.role})
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-black font-semibold mb-4">Order Items</h3>
        <ul className="space-y-2">
          {cartItems.map(item => (
            <li key={item._id} className="flex justify-between items-center border-b pb-2">
              <div>
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="text-gray-500 ml-2">× {item.qty}</span>
              </div>
              <span className="font-medium  text-gray-900">₹{(item.price * item.qty).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between text-green-600 font-semibold">
            <span>Total</span>
            <span className="text-green-600">₹{cartTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <label htmlFor="tableNumber" className="block font-medium mb-2 text-gray-700">
            Table Number *
          </label>
          <input
            id="tableNumber"
            type="number"
            required
            min="1"
            max="50"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Enter table number (1-50)"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !tableNumber}
          className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors ${
            loading || !tableNumber
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Placing Order...
            </div>
          ) : (
            `Place Order - ₹${cartTotal.toFixed(2)}`
          )}
        </button>
      </form>

    </section>
  );
}
