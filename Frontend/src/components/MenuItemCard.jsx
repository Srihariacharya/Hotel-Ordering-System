import React from 'react';

const MenuItemCard = ({ item, qty, onQtyChange }) => (
  <div className="bg-white p-3 rounded shadow">
    <h3 className="font-semibold">{item.name}</h3>
    <p className="text-green-700 font-bold">₹{item.price}</p>

    <input
      type="number"
      min="0"
      value={qty || ''}
      onChange={(e) =>
        onQtyChange(
          item._id,
          item.price,
          parseInt(e.target.value, 10) || 0
        )
      }
      className="mt-2 w-20 p-1 border rounded bg-gray-200 text-center"
    />
  </div>
);
export default MenuItemCard;
