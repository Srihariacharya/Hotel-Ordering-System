// src/pages/MyOrders.jsx
import { useEffect, useState } from 'react';
import api from '../api/axios'; // ✅ use this consistently

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken'); // ✅ use accessToken if that's your naming
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/order/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log('📦 Orders Response:', res.data);

        // ✅ FIX: ensure it's an array
        if (Array.isArray(res.data)) {
          setOrders(res.data);
        } else {
          console.warn('Unexpected response:', res.data);
          setOrders([]);
        }
      })
      .catch((err) => {
        console.error('Fetch orders failed:', err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen px-6 py-8">
        <p className="text-center text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-6 py-8">
      <h1 className="text-3xl font-bold mb-6 text-green-900 flex items-center gap-2">
        🧾 My Orders
      </h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500">No orders found.</p>
      ) : (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white/90 dark:bg-gray-900 p-4 rounded-lg shadow-md border border-green-200 dark:border-green-700"
            >
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>Order ID: {order._id}</span>
                <span>
                  Status:{' '}
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    {order.status}
                  </span>
                </span>
              </div>

              <div className="text-sm mb-2">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  Table Number: {order.tableNumber}
                </p>
              </div>

              <ul className="list-disc list-inside text-gray-800 dark:text-gray-200">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.menuItem?.name || 'Item'} × {item.quantity}
                  </li>
                ))}
              </ul>

              <div className="mt-3 font-semibold text-right text-green-900 dark:text-green-300">
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
