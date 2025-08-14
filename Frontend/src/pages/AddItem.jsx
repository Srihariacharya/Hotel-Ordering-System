import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AddItem() {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    image: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categories = [
    'Breakfast',
    'Dosa',
    'Soups',
    'Chats',
    'Indian Breads',
    'Paneer Dishes',
    'Vegies Dishes',
    'Snacks',
    'Beverages',
    'Dessert',
    'Thali'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user types
    if (message || error) {
      setMessage('');
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.role === 'admin') {
      setError('Admin access required');
      return;
    }

    const { name, price, category } = formData;

    if (!name.trim() || !price || !category) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(price) <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const submitData = {
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim(),
        image: formData.image.trim(),
        description: formData.description.trim()
      };

      console.log('➕ Submitting menu item:', submitData);
      console.log('🎫 Using token:', getToken() ? 'Present' : 'Missing');

      const response = await api.post('/menu', submitData, {
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Item added successfully:', response.data);

      setMessage(`✅ Item "${response.data.item.name}" added successfully!`);
      
      // Reset form
      setFormData({
        name: '',
        price: '',
        category: '',
        image: '',
        description: ''
      });

      // Redirect after success
      setTimeout(() => {
        navigate('/admin/menu');
      }, 2000);

    } catch (err) {
      console.error('❌ Add item error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          'Failed to add item';
      setError(errorMessage);

      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Access Denied</h2>
          <p className="text-red-700">Admin access required to add menu items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-green-700">➕ Add New Menu Item</h2>
        <p className="text-gray-600 mt-2">Add a new item to the menu</p>
      </div>

      {message && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Item Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Masala Dosa"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="e.g., 75"
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">-- Select Category --</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Image URL
          </label>
          <input
            type="url"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Optional description of the dish..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Image Preview */}
        {formData.image && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Image Preview:
            </label>
            <img
              src={formData.image}
              alt="Preview"
              className="w-full h-48 object-cover border rounded-lg shadow"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
              }}
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding Item...
            </div>
          ) : (
            'Add Menu Item'
          )}
        </button>
      </form>
    </div>
  );
}