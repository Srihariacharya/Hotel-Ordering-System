// src/pages/EditItem.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    session: '',
    image: '',
  });

  const fetchItem = async () => {
    try {
      const res = await api.get(`/menu`);
      const item = res.data.find((item) => item._id === id);
      if (item) setForm(item);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.patch(`/menu/${id}`, form);
      alert('Item updated!');
      navigate('/admin/menu');
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  useEffect(() => {
    fetchItem();
  }, []);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Edit Menu Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="price"
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="session"
          placeholder="Session (optional)"
          value={form.session}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <input
          name="image"
          placeholder="Image URL"
          value={form.image}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        {form.image && (
          <img
            src={form.image}
            alt="Preview"
            className="w-full h-48 object-cover mt-2 rounded"
          />
        )}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Update Item
        </button>
      </form>
    </div>
  );
}
