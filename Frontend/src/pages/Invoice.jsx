// src/pages/Invoice.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import logo from '../assets/logo.png';      // ✅ Logo file
import upiQR from '../assets/upi-qr.png';   // ✅ UPI QR file

export default function Invoice() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  // ✅ Fetch invoice
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await api.get(`/order/${id}/invoice`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setOrder(res.data);
      } catch (err1) {
        // Try fallback if custom /invoice route not found
        try {
          const res = await api.get(`/order/${id}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          setOrder(res.data);
        } catch (err2) {
          setError('Could not fetch invoice.');
        }
      }
    }

    fetchInvoice();
  }, [id, getToken]);

  // ✅ Download PDF after load (optional: auto-trigger)
  useEffect(() => {
    if (order) {
      // Uncomment if you want to auto-download PDF:
      // downloadPDF();
    }
  }, [order]);

  function downloadPDF() {
    const doc = new jsPDF();

    // ✅ Header
    try {
      doc.addImage(logo, 'PNG', 14, 10, 30, 30);
    } catch {}
    doc.setFontSize(16);
    doc.text('Shri Shankar Bhavana', 50, 20);
    doc.setFontSize(11);
    doc.text('#21, Temple Road - Malleswaram, Bengaluru – 560003', 50, 26);
    doc.text('Phone: +91-9876543210 | GST: 29ABCDE1234F1Z5', 50, 32);

    const now = new Date();
    doc.text(`Invoice Date: ${now.toLocaleDateString()}`, 14, 48);
    doc.text(`Time: ${now.toLocaleTimeString()}`, 120, 48);
    doc.text(`Invoice No: INV-${order._id.slice(-6).toUpperCase()}`, 14, 56);
    doc.text(`Waiter: ${order.orderedBy?.name || 'N/A'}`, 14, 64);
    doc.text(`Table No: ${order.tableNumber}`, 120, 64);

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
    const gst = +(subtotal * 0.05).toFixed(2);
    const grandTotal = +(subtotal + gst).toFixed(2);
    const finalY = doc.lastAutoTable.finalY || 90;

    doc.setFontSize(12);
    doc.text(`Subtotal: INR ${subtotal.toFixed(2)}`, 140, finalY + 10);
    doc.text(`GST (5%): INR ${gst.toFixed(2)}`, 140, finalY + 18);
    doc.setFontSize(13);
    doc.text(`Total: INR ${grandTotal.toFixed(2)}`, 140, finalY + 26);

    doc.setFontSize(10);
    doc.text('Scan & Pay via UPI:', 14, finalY + 18);
    try {
      doc.addImage(upiQR, 'PNG', 14, finalY + 22, 40, 40);
    } catch {}

    doc.save(`Invoice_${order._id}.pdf`);
  }

  if (error) return <div className="text-red-600 p-6">{error}</div>;
  if (!order) return <div className="p-6 text-gray-500">Loading invoice...</div>;

  const subtotal = order.totalAmount || 0;
  const gst = +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + gst).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 bg-white text-black rounded shadow print:bg-white print:text-black">
      <h1 className="text-3xl font-bold mb-2 text-green-800">Shri Shankar Bhavana</h1>
      <p>#21, Temple Road - Malleswaram, Bengaluru – 560003</p>
      <p>Phone: +91-9876543210 | GST: 29ABCDE1234F1Z5</p>

      <hr className="my-4" />

      <div className="text-sm mb-4">
        <p><strong>Invoice ID:</strong> INV-{order._id.slice(-6).toUpperCase()}</p>
        <p><strong>Date:</strong> {new Date().toLocaleDateString()} | <strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
        <p><strong>Waiter:</strong> {order.orderedBy?.name || 'N/A'}</p>
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
          {order.items.map((item, idx) => (
            <tr key={idx}>
              <td className="border p-2">{item.menuItem?.name || 'Item'}</td>
              <td className="border p-2">{item.quantity}</td>
              <td className="border p-2">₹{item.price}</td>
              <td className="border p-2">₹{(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right mt-4 text-sm">
        <p><strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}</p>
        <p><strong>GST (5%):</strong> ₹{gst.toFixed(2)}</p>
        <p className="text-lg"><strong>Total:</strong> ₹{total.toFixed(2)}</p>
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
