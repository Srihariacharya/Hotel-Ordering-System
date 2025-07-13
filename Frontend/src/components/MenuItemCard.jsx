import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

const MenuItemCard = ({ item }) => {
  const { cartItems, addToCart, removeFromCart } = useCart();
  const inCart = cartItems.find(i => i._id === item._id);
  const [qty, setQty] = useState(inCart?.qty || 1);

  const handleAdd = () => {
    if (qty <= 0) return alert("Quantity must be at least 1");
    for (let i = 0; i < qty; i++) {
      addToCart(item);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-md">
      <img
        src={item.image || '/no-image.png'}
        alt={item.name}
        className="w-full h-36 object-cover mb-3 rounded"
      />

      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{item.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{item.category}</p>
      <p className="font-bold text-green-700 dark:text-green-400">
        ₹{item.price.toLocaleString('en-IN')}
      </p>

      {/* Quantity Selector */}
      <div className="mt-2 flex items-center gap-2">
        <label className="text-sm text-gray-800 dark:text-gray-200">Qty:</label>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
          className="w-16 px-2 py-1 rounded border border-gray-400 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="mt-3">
        {!inCart ? (
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full"
          >
            Add to Cart
          </button>
        ) : (
          <button
            onClick={() => removeFromCart(item._id)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 w-full"
          >
            Remove from Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default MenuItemCard;
