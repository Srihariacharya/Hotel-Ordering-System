import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) return;

    axios
      .get('/order', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOrders(res.data.orders || []);
      })
      .catch((err) => {
        console.error('Fetch orders failed:', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      <h2 className="text-3xl font-bold mb-6 text-center">🧾 My Orders</h2>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500">No orders found.</p>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white shadow rounded p-4 border border-gray-300"
            >
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Order ID: {order._id}</span>
                <span>Status: {order.status}</span>
              </div>
              <div className="text-sm mb-2">
                Table #: <strong>{order.tableNumber}</strong>
              </div>
              <ul className="text-sm list-disc pl-5 text-gray-700">
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.menuItem?.name || 'Item'} x {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="text-right mt-2 font-semibold">
                Total: ₹{order.totalPrice}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
