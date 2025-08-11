import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import MenuItemCard from '../components/MenuItemCard';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [total, setTotal] = useState(0);
  const [tableNumber, setTableNumber] = useState('');

  const [searchParams, setSP] = useSearchParams();
  const activeCat = searchParams.get('c') || '';

  // 🥗 Fetch menu items
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        // ✅ Fixed: matches server.js `/menu` route (no /api prefix)
        const res = await api.get('/menu');
        setMenuItems(res.data);

        const uniqueCats = [...new Set(res.data.map(i => i.category))];
        setCategories(uniqueCats);
      } catch (err) {
        console.error('❌ Error loading menu:', err);
      }
    };
    fetchMenu();
  }, []);

  const displayed = !activeCat
    ? menuItems
    : menuItems.filter(i => i.category === activeCat);

  // 🧮 Handle quantity change
  const handleQuantity = (id, price, qty) => {
    const updated = { ...quantities };
    if (qty) updated[id] = { quantity: qty, price };
    else delete updated[id];

    setQuantities(updated);
    setTotal(
      Object.values(updated).reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    );
  };

  // 🧾 Place Order
  const handlePlaceOrder = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return alert('Login first');
    if (!tableNumber) return alert('Enter table number');

    const items = Object.entries(quantities).map(([id, o]) => ({
      menuItem: id,
      quantity: o.quantity,
      price: o.price,
    }));

    try {
      await api.post(
        '/order',
        { tableNumber: Number(tableNumber), items },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('✅ Order placed');
      setQuantities({});
      setTotal(0);
      setTableNumber('');
    } catch (e) {
      console.error('❌ Order failed:', e);
      alert(e.response?.data?.error || 'Order failed');
    }
  };

  const toggleCat = (c) => {
    if (c === activeCat) setSP({});
    else setSP({ c });
  };

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Menu</h1>

      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => toggleCat(c)}
            className={`px-4 py-1 rounded-full border transition
              ${
                c === activeCat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-black hover:bg-green-100 border-green-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
              }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] text-gray-900 dark:text-white">
        {displayed.map((item) => (
          <MenuItemCard
            key={item._id}
            item={item}
            qty={quantities[item._id]?.quantity || 0}
            onQtyChange={handleQuantity}
          />
        ))}

        {displayed.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No items for this category.
          </p>
        )}
      </div>

      {/* Table number input and total */}
      {displayed.length > 0 && (
        <div className="mt-8 max-w-md mx-auto bg-white dark:bg-gray-800 p-4 shadow-md rounded">
          <input
            type="number"
            placeholder="Enter Table Number"
            className="input input-bordered w-full mb-4 dark:text-black"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
          />
          <p className="mb-2 font-medium text-lg">
            Total: ₹{total.toFixed(2)}
          </p>
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            onClick={handlePlaceOrder}
            disabled={total <= 0}
          >
            Place Order
          </button>
        </div>
      )}
    </div>
  );
};

export default Menu;
