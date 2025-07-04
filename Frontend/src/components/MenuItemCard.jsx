import React from 'react';

const MenuItemCard = ({ item, qty, onQtyChange }) => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold">{item.name}</h3>
      <p className="text-green-700 font-bold">₹{item.price}</p>
      <p className="text-sm text-gray-500 italic">
        Category: {item.category}
      </p>

      <input
        type="number"
        min="0"
        placeholder="Qty"
        value={qty || ''}
        onChange={(e) =>
          onQtyChange(item._id, item.price, parseInt(e.target.value) || 0)
        }
        className="mt-2 p-1 border rounded w-full"
      />
    </div>
  );
};

export default MenuItemCard;
