import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AddItem() {
  const { getToken, user } = useAuth();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔍 Debug user info
    console.log('🔍 Debug Info:', {
      user,
      hasToken: !!getToken(),
      isAdmin: user?.role === 'admin',
      userRole: user?.role
    });

    if (!user) {
      return setMessage('❌ Please log in first');
    }

    if (user.role !== 'admin') {
      return setMessage('❌ Admin privileges required');
    }

    if (!name || !price || !category) {
      return setMessage('⚠️ Please fill all required fields');
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return setMessage('⚠️ Please enter a valid price');
    }

    setLoading(true);
    setMessage('');

    const requestData = {
      name: name.trim(),
      price: numericPrice,
      category: category.trim(),
      image: image.trim() || 'https://via.placeholder.com/300x200?text=No+Image'
    };

    console.log('📤 Sending request:', {
      url: '/menu',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()?.substring(0, 20)}...`,
        'Content-Type': 'application/json'
      },
      data: requestData
    });

    try {
      const res = await api.post('/menu', requestData, { 
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        } 
      });

      console.log('✅ Success response:', res.data);
      setMessage(`✅ Item "${res.data.name}" added successfully!`);
      
      // Reset form
      setName('');
      setPrice('');
      setCategory('');
      setImage('');
    } catch (err) {
      console.error('❌ Complete error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
        config: err.config
      });
      
      // More detailed error messages
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 400:
            setMessage(`❌ Validation Error: ${data.message || data.error || 'Invalid data'}`);
            break;
          case 401:
            setMessage('❌ Authentication failed. Please log in again.');
            break;
          case 403:
            setMessage('❌ Access denied. Admin privileges required.');
            break;
          case 500:
            setMessage(`❌ Server Error: ${data.message || 'Internal server error'}`);
            break;
          default:
            setMessage(`❌ Error ${status}: ${data.message || data.error || 'Unknown error'}`);
        }
      } else if (err.request) {
        setMessage('❌ Network error. Please check your connection.');
        console.error('Network error:', err.request);
      } else {
        setMessage(`❌ Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show user info for debugging
  const userInfo = user ? `${user.name} (${user.role})` : 'Not logged in';

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-green-700">Add New Menu Item</h2>
      
      {/* Debug info */}
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <strong>Debug Info:</strong><br/>
        User: {userInfo}<br/>
        Token: {getToken() ? 'Present' : 'Missing'}<br/>
        Can Add Items: {user?.role === 'admin' ? 'Yes' : 'No'}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded text-sm font-medium text-center ${
          message.includes('✅') 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        {/* Item Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Masala Dosa"
            required
            disabled={loading}
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="E.g. 75"
            required
            disabled={loading}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">-- Select Category --</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Dosa">Dosa</option>
            <option value="Soups">Soups</option>
            <option value="Chats">Chats</option>
            <option value="Indian Breads">Indian Breads</option>
            <option value="Paneer Dishes">Paneer Dishes</option>
            <option value="Vegies Dishes">Vegies Dishes</option>
            <option value="Snacks">Snacks</option>
            <option value="Beverages">Beverages</option>
            <option value="Dessert">Dessert</option>
            <option value="Thali">Thali</option>
          </select>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: Leave empty for default placeholder image
          </p>
        </div>

        {/* Image Preview */}
        {image && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">🔍 Preview:</p>
            <img
              src={image}
              alt="Preview"
              className="w-full h-48 object-cover border rounded shadow"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
              }}
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || user?.role !== 'admin'}
          className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
            loading || user?.role !== 'admin'
              ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Adding Item...
            </div>
          ) : user?.role !== 'admin' ? (
            'Admin Access Required'
          ) : (
            'Add Item'
          )}
        </button>
      </form>
    </div>
  );
}