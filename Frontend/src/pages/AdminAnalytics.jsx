import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AdminAnalytics() {
  const { getToken } = useAuth();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api
      .get('/order/admin/analytics', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      .then(res => setAnalytics(res.data))
      .catch(err => {
        console.error('Analytics fetch failed:', err);
        alert('Failed to load analytics');
      });
  }, [getToken]);

  const isValid =
    analytics &&
    Array.isArray(analytics.daily) &&
    typeof analytics.monthlyTotal === 'number' &&
    Array.isArray(analytics.topItems);

  if (!isValid) return <p className="p-8 text-red-600">Loading or invalid analytics data...</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold mb-4 text-green-800">📊 Admin Analytics</h2>

      {/* Daily Income Table */}
      <table className="w-full mb-8 text-left border shadow-md rounded overflow-hidden">
        <thead className="bg-green-100 text-green-800">
          <tr>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Total Orders</th>
            <th className="p-2 border">Total Income (₹)</th>
          </tr>
        </thead>
        <tbody>
          {analytics.daily.map((day, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-green-50">
              <td className="p-2 border">{day._id}</td>
              <td className="p-2 border">{day.orderCount}</td>
              <td className="p-2 border">₹{day.totalIncome.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-green-200 font-bold">
            <td className="p-2 border" colSpan={2}>
              Monthly Income
            </td>
            <td className="p-2 border">₹{analytics.monthlyTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Top-Selling Items Table */}
      <h3 className="text-xl font-semibold text-green-700 mb-2">🍲 Top Selling Items</h3>
      <table className="w-full text-left border shadow-md rounded overflow-hidden">
        <thead className="bg-green-100 text-green-800">
          <tr>
            <th className="p-2 border">Item</th>
            <th className="p-2 border">Quantity Sold</th>
          </tr>
        </thead>
        <tbody>
          {analytics.topItems.map((item, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-green-50">
              <td className="p-2 border">{item._id}</td>
              <td className="p-2 border">{item.totalQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
