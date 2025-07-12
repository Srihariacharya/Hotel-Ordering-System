// src/components/MenuItemCard.jsx
import React from 'react';

const MenuItemCard = ({ item, qty = 0, onQtyChange }) => {
  const handleQtyChange = (e) => {
    const value = parseInt(e.target.value);
    onQtyChange(item._id, item.price, isNaN(value) ? 0 : value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-sm transition">
      <  h3 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-300">
        {item.name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
        ₹{item.price} — {item.category}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {item.description}
      </p>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Qty:
        </label>
        <input
          type="number"
          min="0"
          value={qty}
          onChange={handleQtyChange}
          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-500 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
        />
      </div>
    </div>
  );
};

export default MenuItemCard;
