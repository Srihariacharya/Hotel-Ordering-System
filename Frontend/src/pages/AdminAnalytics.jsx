import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AdminAnalytics() {
  const { user, getToken } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('📊 Fetching analytics for admin:', user?.name);
        console.log('🎫 Using token:', getToken() ? 'Present' : 'Missing');

        const response = await api.get('/order/admin/analytics', {
          headers: { 
            Authorization: `Bearer ${getToken()}` 
          }
        });

        console.log('✅ Analytics response:', response.data);
        setAnalytics(response.data);

      } catch (err) {
        console.error('❌ Analytics fetch failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });

        const errorMessage = err.response?.data?.message || 
                            err.response?.data?.error || 
                            'Failed to load analytics data';
        setError(errorMessage);

        // If unauthorized, might need to re-login
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        }

      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is admin
    if (user?.role === 'admin') {
      fetchAnalytics();
    } else {
      setError('Admin access required');
      setLoading(false);
    }
  }, [user, getToken]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!analytics || (!analytics.dailyStats && !analytics.topItems)) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-yellow-800 font-semibold mb-2">No Analytics Data</h3>
          <p className="text-yellow-700">No orders found for the selected period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-green-800">📊 Admin Analytics</h2>
        <p className="text-gray-600 mt-2">Analytics for {user?.name}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">
            ₹{(analytics.monthlyIncome || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="text-2xl font-bold text-blue-600">
            {analytics.summary?.totalOrders || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Order Value</h3>
          <p className="text-2xl font-bold text-purple-600">
            ₹{analytics.summary?.averageOrderValue || 0}
          </p>
        </div>
      </div>

      {/* Daily Stats Table */}
      {analytics.dailyStats && analytics.dailyStats.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b">
            <h3 className="text-gray-800 font-semibold">📅 Daily Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.dailyStats.map((day, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{day._id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{day.totalOrders}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">₹{day.dailyIncome.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Items Table */}
      {analytics.topItems && analytics.topItems.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-black font-semibold">🍲 Top Selling Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase">Quantity Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.topItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.menuItem?.name || 'Unknown Item'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.quantitySold}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">₹{(item.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}