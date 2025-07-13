import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await api.get('/order/admin', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('❌ Fetch orders error:', err.message);
    }
  }

  async function markAsServed(orderId) {
    try {
      const res = await api.put(`/order/${orderId}/serve`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      alert(res.data.message);
      fetchOrders();
    } catch (err) {
      console.error('❌ Serve error:', err.message);
      alert('Failed to mark as served');
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Orders</h1>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map(order => (
          <div key={order._id} className="border p-4 mb-4 rounded shadow-md">
            <p><strong>Order ID:</strong> {order._id}</p>
            <p><strong>Total:</strong> ₹{order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}</p>
            <p><strong>Status:</strong> {order.status}</p>

            {user?.role === 'admin' && order.status !== 'served' && (
              <button
                onClick={() => markAsServed(order._id)}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Mark as Served
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
