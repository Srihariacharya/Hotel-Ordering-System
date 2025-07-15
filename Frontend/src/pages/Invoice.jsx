// src/pages/Invoice.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import logo from '../assets/logo.png';      // ✅ Add your logo image
import upiQR from '../assets/upi-qr.png';   // ✅ Add your UPI QR image

export default function Invoice() {
  const { id } = useParams();
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

  useEffect(() => {
    if (order) downloadPDF(); // ✅ Auto-download on load
  }, [order]);

  function downloadPDF() {
    const doc = new jsPDF();

    // Hotel Header
    doc.addImage(logo, 'PNG', 14, 10, 30, 30);
    doc.setFontSize(16);
    doc.text('Shri Shankar Bhavana', 50, 20);
    doc.setFontSize(11);
    doc.text('#21, Temple Road - Malleswaram, Bengaluru – 560003', 50, 26);
    doc.text('Phone: +91-9876543210 | GST: 29ABCDE1234F1Z5', 50, 32);

    const now = new Date();
    doc.text(`Invoice Date: ${now.toLocaleDateString()}`, 14, 48);
    doc.text(`Time: ${now.toLocaleTimeString()}`, 120, 48);
    doc.text(`Invoice No: INV-${order._id.slice(-6).toUpperCase()}`, 14, 56);
    doc.text(`Waiter: ${order.orderedBy.name}`, 14, 64);
    doc.text(`Table No: ${order.tableNumber}`, 120, 64);

    // Order Items
    const rows = order.items.map(i => [
      i.menuItem?.name || 'Item',
      i.quantity,
      `INR ${i.price}`,
      `INR ${(i.quantity * i.price).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Item', 'Qty', 'Price', 'Subtotal']],
      body: rows,
      startY: 72,
    });

    const subtotal = order.totalAmount || 0;
    const gst = +(subtotal * 0.05).toFixed(2);  // 5% GST
    const grandTotal = +(subtotal + gst).toFixed(2);
    const finalY = doc.lastAutoTable.finalY || 90;

    // Totals
    doc.setFontSize(12);
    doc.text(`Subtotal: INR ${subtotal.toFixed(2)}`, 140, finalY + 10);
    doc.text(`GST (5%): INR ${gst.toFixed(2)}`, 140, finalY + 18);
    doc.setFontSize(13);
    doc.text(`Total: INR ${grandTotal.toFixed(2)}`, 140, finalY + 26);

    // UPI QR Code
    doc.setFontSize(10);
    doc.text('Scan & Pay via UPI:', 14, finalY + 18);
    doc.addImage(upiQR, 'PNG', 14, finalY + 22, 40, 40);

    doc.save(`Invoice_${order._id}.pdf`);
  }

  if (!order) return <p className="p-8">Loading invoice...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 bg-white text-black rounded shadow print:bg-white print:text-black">
      <h1 className="text-3xl font-bold mb-2 text-green-800">Shri Shankar Bhavana</h1>
      <p>#21, Temple Road - Malleswaram, Bengaluru – 560003</p>
      <p>Phone: +91-9876543210 | GST: 29ABCDE1234F1Z5</p>

      <hr className="my-4" />

      <div className="text-sm mb-4">
        <p><strong>Invoice ID:</strong> INV-{order._id.slice(-6).toUpperCase()}</p>
        <p><strong>Date:</strong> {new Date().toLocaleDateString()} | <strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
        <p><strong>Waiter:</strong> {order.orderedBy.name}</p>
        <p><strong>Table:</strong> {order.tableNumber}</p>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Item</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Price</th>
            <th className="border p-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i, idx) => (
            <tr key={idx}>
              <td className="border p-2">{i.menuItem?.name}</td>
              <td className="border p-2">{i.quantity}</td>
              <td className="border p-2">₹{i.price}</td>
              <td className="border p-2">₹{(i.quantity * i.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right mt-4 text-sm">
        <p><strong>Subtotal:</strong> ₹{order.totalAmount.toFixed(2)}</p>
        <p><strong>GST (5%):</strong> ₹{(order.totalAmount * 0.05).toFixed(2)}</p>
        <p className="text-lg"><strong>Total:</strong> ₹{(order.totalAmount * 1.05).toFixed(2)}</p>
      </div>

      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={downloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Download PDF
        </button>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Print
        </button>
      </div>
    </div>
  );
}
