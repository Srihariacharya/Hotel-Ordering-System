import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AddItem() {
  const { getToken } = useAuth();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !price || !category) {
      return setMessage('⚠️ Please fill all required fields');
    }

    try {
      const res = await api.post(
        '/menu',
        { name, price, category, image },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setMessage(`✅ Item "${res.data.name}" added successfully!`);
      setName('');
      setPrice('');
      setCategory('');
      setImage('');
    } catch (err) {
      console.error('Add item error:', err);
      setMessage('❌ Failed to add item');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-green-700">➕ Add New Menu Item</h2>

      {message && (
        <div className="mb-4 text-sm font-medium text-center text-red-600">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Item Name
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Price (₹)
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Category
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">-- Select Category --</option>
            <option value="South Indian">South Indian</option>
            <option value="North Indian">North Indian</option>
            <option value="Snacks">Snacks</option>
            <option value="Beverages">Beverages</option>
            <option value="Dessert">Dessert</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Image URL (optional)
          </label>
          <input
            type="text"
            placeholder="Image URL"
             className="input input-bordered w-full mb-4"
             value={image}
            onChange={(e) => setImage(e.target.value)}
           required
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add Item
        </button>
      </form>
    </div>
  );
}
