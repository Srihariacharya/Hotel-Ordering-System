// src/pages/AdminMenuDashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar'; // ✅ Import your Navbar

export default function AdminMenuDashboard() {
  const { getToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ Fetch menu items
  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/menu', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems(res.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch menu:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete menu item
  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/menu/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error('❌ Delete failed:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to delete item.');
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <p className="text-center mt-10 text-gray-500">Loading menu items...</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="text-center mt-10 text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchItems}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="text-center mt-10 text-gray-600">
          <p>No menu items found.</p>
          <Link
            to="/admin/add-item"
            className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add New Item
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Admin Menu Dashboard</h2>
          <Link
            to="/admin/add-item"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            ➕ Add New Item
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const imageSrc =
              item.imageUrl?.trim()
                ? item.imageUrl
                : item.image?.trim()
                ? item.image
                : 'https://via.placeholder.com/400x300?text=No+Image';

            return (
              <div
                key={item._id}
                className="border rounded-lg p-4 shadow bg-white"
              >
                <img
                  src={imageSrc}
                  alt={item.name}
                  className="w-full h-48 object-cover mb-3 rounded"
                  onError={(e) => {
                    e.target.src =
                      'https://via.placeholder.com/400x300?text=Invalid+Image';
                  }}
                />
                <h3 className="text-gray-800 font-semibold">{item.name}</h3>
                <p className="text-gray-600 mb-2">{item.category}</p>
                <p className="text-green-700 font-bold">
                  ₹{Number(item.price).toFixed(2)}
                </p>
                <div className="flex gap-2 mt-4">
                  <Link
                    to={`/admin/edit-item/${item._id}`}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteItem(item._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
