import React from 'react';

const OrderCard = ({ order }) => {
  return (
    <div className="border p-3 mb-3 rounded shadow-sm bg-white">
      <p className="text-gray-600 text-sm">
        Placed on:{' '}
        {new Date(order.placedAt).toLocaleString()}
      </p>

      <div className="mt-2 space-y-1">
        {order.items.map((item, idx) => (
          <p key={idx}>
            {item.name} × {item.quantity}{' '}
            <span className="text-gray-500">
              (₹{item.price * item.quantity})
            </span>
          </p>
        ))}
      </div>

      <p className="font-semibold mt-2">
        Total: ₹{order.totalAmount}
      </p>
    </div>
  );
};

export default OrderCard;
