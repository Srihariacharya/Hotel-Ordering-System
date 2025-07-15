// src/pages/OrderSuccess.jsx
import { Link } from 'react-router-dom';

export default function OrderSuccess() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-4xl font-bold text-green-700 mb-4">🎉 Order Placed Successfully!</h1>
      <p className="text-lg text-gray-700 mb-6">Thank you! Your order has been received.</p>
      <a href="/" className="text-blue-600 hover:underline">
        Go back to Home
      </a>
    </div>
  );
}