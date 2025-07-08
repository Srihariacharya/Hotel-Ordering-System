import { useEffect, useState } from 'react';
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
      .then((res) => setOrders(res.data.orders || []))
      .catch((err) => console.error('Fetch orders failed:', err));
  }, []);

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
              className="bg-white/90 p-4 rounded-lg shadow-md border border-green-200"
            >
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Order ID: {order._id}</span>
                <span>
                  Status:{' '}
                  <span className="text-green-700 font-medium">{order.status}</span>
                </span>
              </div>

              <div className="text-sm mb-2">
                Table Number:{' '}
                <span className="font-semibold">{order.tableNumber}</span>
              </div>

              <ul className="list-disc list-inside text-gray-800">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.menuItem?.name || 'Item'} × {item.quantity}
                  </li>
                ))}
              </ul>

              <div className="mt-3 font-semibold text-right text-green-900">
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
