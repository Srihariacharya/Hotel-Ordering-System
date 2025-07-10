import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import MenuItemCard from '../components/MenuItemCard';

const Menu = () => {
  const [menuItems,   setMenuItems]   = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [quantities,  setQuantities]  = useState({});
  const [total,       setTotal]       = useState(0);
  const [tableNumber, setTableNumber] = useState('');

  const [searchParams, setSP] = useSearchParams();
  const activeCat = searchParams.get('c') || '';

  /* fetch menu */
  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (tok) axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`;

    axios
      .get('/menu')
      .then(r => {
        setMenuItems(r.data);
        // build unique category list from data
        setCategories([...new Set(r.data.map(i => i.category))]);
      })
      .catch(console.error);
  }, []);

  const displayed = !activeCat
    ? menuItems
    : menuItems.filter(i => i.category === activeCat);

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
      setQuantities({});
      setTotal(0);
      setTableNumber('');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Order failed');
    }
  };

  /* handle category click */
  const toggleCat = c => {
    if (c === activeCat) setSP({});
    else setSP({ c });
  };

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Menu</h1>

      {/* category chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {categories.map(c => (
         <button
            key={c}
            onClick={() => toggleCat(c)}
            className={`px-4 py-1 rounded-full border
            ${c === activeCat
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-black hover:bg-green-100 border-green-300'}`}
           >
        {c}
        </button>
        ))}
      </div>

      {/* table number */}
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

      {/* items grid */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] text-gray-900">
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

      {/* total & checkout */}
      <div className="mt-6 text-xl font-semibold text-center">
        Total: ₹{total}
      </div>
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
