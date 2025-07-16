import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function UpdateMenuImages() {
  const { getToken } = useAuth();
  const [menu, setMenu] = useState([]);
  const [saving, setSaving] = useState(false);

  // Fetch existing menu
  useEffect(() => {
    api
      .get('/menu')
      .then((res) => setMenu(res.data))
      .catch((err) => {
        console.error('Failed to fetch menu', err);
        alert('Error loading menu items');
      });
  }, []);

  const handleImageChange = (id, newUrl) => {
    setMenu((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, image: newUrl } : item
      )
    );
  };

  const handleSave = async (id, image) => {
    setSaving(true);
    try {
      await api.patch(
        `/menu/${id}`,
        { image },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      alert('✅ Image updated');
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update image');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-green-700">
        🖼️ Update Menu Item Images
      </h1>

      <div className="space-y-6">
        {menu.map((item) => (
          <div
            key={item._id}
            className="border p-4 rounded-md shadow bg-white dark:bg-gray-800"
          >
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{item.name}</h3>

            <div className="mt-2 flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={item.image || ''}
                onChange={(e) => handleImageChange(item._id, e.target.value)}
                placeholder="Enter image URL"
                className="border p-2 w-full dark:text-black"
              />
              <button
                onClick={() => handleSave(item._id, item.image)}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="mt-3 max-w-xs border rounded"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
