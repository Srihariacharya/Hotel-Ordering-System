/* src/pages/Menu.jsx */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MenuItemCard from '../components/MenuItemCard';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [total, setTotal] = useState(0);

  // Load menu from backend
  useEffect(() => {
    axios
      .get('/menu')
      .then((res) => setMenuItems(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Handle quantity change for a single item
  const handleQuantityChange = (id, price, qty) => {
    const updatedQuantities = {
      ...quantities,
      [id]: { quantity: qty, price },
    };
    setQuantities(updatedQuantities);

    // Re‑calculate total
    const newTotal = Object.values(updatedQuantities).reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
    setTotal(newTotal);
  };

  // Place order
  const handlePlaceOrder = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first!');
      return;
    }

    const items = Object.entries(quantities).map(([id, qObj]) => {
      const menuItem = menuItems.find((m) => m._id === id);
      return {
        name: menuItem.name,
        price: qObj.price,
        quantity: qObj.quantity,
      };
    });

    axios
      .post(
        '/api/orders',
        { items, totalAmount: total },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        alert('Order placed successfully!');
        setQuantities({});
        setTotal(0);
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to place order.');
      });
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">🧾 Menu</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <MenuItemCard
            key={item._id}
            item={item}
            qty={quantities[item._id]?.quantity}
            onQtyChange={handleQuantityChange}
          />
        ))}
      </div>

      {total > 0 && (
        <div className="mt-6 text-center">
          <p className="text-xl font-semibold">Total: ₹{total}</p>
          <button
            onClick={handlePlaceOrder}
            className="mt-3 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Place Order
          </button>
        </div>
      )}
    </div>
  );
};

export default Menu;
