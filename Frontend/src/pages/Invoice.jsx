// src/pages/Invoice.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Invoice() {
  const { id } = useParams(); // order ID
  const { getToken } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await api.get(`/order/${id}/invoice`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setOrder(res.data);
      } catch (err) {
        alert(err.response?.data?.error || 'Could not fetch invoice');
      }
    }

    fetchInvoice();
  }, [id, getToken]);

  function downloadPDF() {
    const doc = new jsPDF();
    doc.text('Hotel Order Invoice', 14, 20);
    doc.setFontSize(12);
    doc.text(`Order ID: ${order._id}`, 14, 30);
    doc.text(`Customer: ${order.orderedBy.name}`, 14, 38);
    doc.text(`Table: ${order.tableNumber}`, 14, 46);

    const rows = order.items.map(i => [
      i.menuItem?.name || 'Item',
      i.quantity,
      `₹${i.price}`,
      `₹${i.quantity * i.price}`,
    ]);

    doc.autoTable({
      head: [['Item', 'Qty', 'Price', 'Subtotal']],
      body: rows,
      startY: 60,
    });

    doc.text(`Total: ₹${order.totalPrice}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`Invoice_${order._id}.pdf`);
  }

  if (!order) return <p className="p-8">Loading invoice...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 bg-white dark:bg-gray-900 shadow-md rounded">
      <h2 className="text-3xl font-bold mb-4 text-green-800 dark:text-green-300">Order Invoice</h2>

      <p className="mb-2">Order ID: <strong>{order._id}</strong></p>
      <p className="mb-2">Customer: {order.orderedBy.name}</p>
      <p className="mb-2">Table Number: {order.tableNumber}</p>

      <table className="w-full border mt-4 text-left text-sm">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-800">
            <th className="p-2 border">Item</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Price</th>
            <th className="p-2 border">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, idx) => (
            <tr key={idx}>
              <td className="p-2 border">{i.menuItem?.name || 'Item'}</td>
              <td className="p-2 border">{i.quantity}</td>
              <td className="p-2 border">₹{i.price}</td>
              <td className="p-2 border">₹{i.price * i.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right text-lg font-semibold mt-4">
        Total: ₹{order.totalPrice}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={downloadPDF}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
