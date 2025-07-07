import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MenuItemCard from '../components/MenuItemCard';
import PageWrapper from '../components/Layout';

const Menu = () => {
  const [menuItems,  setMenuItems]  = useState([]);
  const [quantities, setQuantities] = useState({});  
  const [total,      setTotal]      = useState(0);
  const [tableNumber, setTableNumber] = useState('');
  <PageWrapper>
    <h1 className="text-3xl font-bold mb-6 text-center">Menu</h1>

    <div className="mb-6 text-center">
      <label className="mr-2 font-medium">Table Number</label>
      <input
        type="text"
        className="px-3 py-1 rounded bg-gray-800 text-white"
        placeholder="Enter Table #"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* map your menu items here */}
    </div>
  </PageWrapper>

useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}, []);

  useEffect(() => {
    axios.get('/menu')
      .then((res) => setMenuItems(res.data))
      .catch(console.error);
  }, []);


  const handleQuantityChange = (id, price, qty) => {
    const updated = { ...quantities };
    if (qty > 0) {
      updated[id] = { quantity: qty, price };
    } else {
      delete updated[id];
    }
    setQuantities(updated);

    const newTotal = Object.values(updated).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(newTotal);
  };

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please log in first');

    const items = Object.entries(quantities).map(([id, obj]) => ({
      menuItem: id,
      quantity: obj.quantity,
      price:    obj.price             
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
    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.error || 'Failed to place order');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
    <h1 className="text-3xl font-bold mb-4 text-center">🧾 Menu</h1>
    <div className="mb-6 text-center">
        <label className="mr-2 font-medium">Table Number</label>
        <input
          type="text"
          className="px-3 py-1 rounded bg-gray-800 text-white"
          placeholder="Enter Table #"
       />
    </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <MenuItemCard
            key={item._id}
            item={item}
            qty={quantities[item._id]?.quantity || 0}
            onQtyChange={handleQuantityChange}
          />
        ))}
      </div>


      <div className="mt-6 text-xl font-semibold text-center">
        Total: ₹{total}
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={handlePlaceOrder}
          disabled={total === 0 || !tableNumber}
          className={`px-4 py-2 rounded font-semibold
            ${total === 0 || !tableNumber
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          Place Order
        </button>
      </div>

      <div className="mt-6 text-center">
        <a href="/my-orders" className="text-blue-600 hover:underline">
          View My Orders
        </a>
      </div>
    </div>
  );
};

export default Menu;
