import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MenuItemCard from '../components/MenuItemCard';

const categories = ['South Indian', 'North Indian', 'Snacks', 'Desserts', 'Beverages'];

const Menu = () => {
  const [menuItems,   setMenuItems]   = useState([]);
  const [category,    setCategory]    = useState('');
  const [quantities,  setQuantities]  = useState({});
  const [total,       setTotal]       = useState(0);
  const [tableNumber, setTableNumber] = useState('');

  /* fetch menu + attach JWT if present */
  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (tok) axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    axios.get('/menu').then(r => setMenuItems(r.data)).catch(console.error);
  }, []);

  /* filter items */
  const displayed = menuItems.filter(i => !category || i.category === category);

  /* qty helper */
  const handleQuantity = (id, price, qty) => {
    const q = { ...quantities };
    if (qty) q[id] = { quantity: qty, price };
    else delete q[id];
    setQuantities(q);
    setTotal(Object.values(q).reduce((s, v) => s + v.price * v.quantity, 0));
  };

  /* place order */
  const handlePlaceOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Login first');
    if (!tableNumber) return alert('Enter table number');

    const items = Object.entries(quantities).map(([id, o]) => ({
      menuItem: id,
      quantity: o.quantity,
      price:    o.price,
    }));

    try {
      await axios.post(
        '/order',
        { tableNumber: Number(tableNumber), items },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Order placed ✔️');
      setQuantities({}); setTotal(0); setTableNumber('');
    } catch (e) {
      console.error(e); alert(e.response?.data?.error || 'Order failed');
    }
  };

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Menu</h1>

      {/* category buttons */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c === category ? '' : c)}
            className={`px-4 py-1 rounded-full border
              ${c === category
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white hover:bg-green-100 border-green-300'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* table # */}
      <div className="mb-6 text-center">
        <label className="mr-2 font-medium">Table Number</label>
        <input
          value={tableNumber}
          onChange={e => setTableNumber(e.target.value)}
          type="text"
          className="px-3 py-1 rounded bg-gray-800 text-white"
          placeholder="Enter Table Number"
        />
      </div>

      {/* menu grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-10">
        {displayed.map(item => (
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

      {/* total + btn */}
      <div className="mt-6 text-xl font-semibold text-center">Total: ₹{total}</div>
      <div className="mt-4 text-center">
        <button
          onClick={handlePlaceOrder}
          disabled={!total || !tableNumber}
          className={`px-4 py-2 rounded font-semibold
            ${!total || !tableNumber
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          Place Order
        </button>
      </div>

      <div className="mt-6 text-center">
        <a href="/myorders" className="text-green-600 hover:underline">
          View My Orders
        </a>
      </div>
    </div>
  );
};

export default Menu;
