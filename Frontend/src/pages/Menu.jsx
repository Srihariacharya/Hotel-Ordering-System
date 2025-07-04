import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MenuItemCard from '../components/MenuItemCard';

const Menu = () => {
  const [menuItems,  setMenuItems]  = useState([]);
  const [quantities, setQuantities] = useState({}); 
  const [total,      setTotal]      = useState(0);
  const [tableNumber, setTableNumber] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  useEffect(() => {
    axios
      .get('/menu')                    
      .then((res) => setMenuItems(res.data))
      .catch((err) => console.error(err));
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

  const handlePlaceOrder = () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login first!');

    const items = Object.entries(quantities).map(([id, qObj]) => ({
  menuItem: id,
  quantity: qObj.quantity,
}));


const payload = { items };
if (tableNumber) payload.tableNumber = tableNumber; 

axios
  .post('/order', payload)
      .then(() => {
        alert('Order placed successfully!');
        setQuantities({});
        setTotal(0);
        setTableNumber('');
      })
      .catch((err) => {
        console.error(err);
        alert(err.response?.data?.error || 'Failed to place order.');
      });
  };


  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <span role="img" aria-label="menu">🧾</span> Menu
      </h1>

      <div className="flex justify-center mb-4">
        <label className="text-sm font-medium mr-2">Table Number</label>
        <input
          type="number"
          min="1"
          value={tableNumber}
          onChange={(e) => setTableNumber(parseInt(e.target.value, 10) || '')}
          className="w-24 p-1 border rounded text-center text-white"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
          disabled={total === 0}
          className={`px-4 py-2 rounded font-semibold
            ${total === 0
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
