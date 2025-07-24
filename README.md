# 🍽️ Hotel Ordering System (MERN Stack)

A full-featured Hotel Ordering System for restaurants/waiters and admins, built with **React.js**, **Node.js**, **Express**, and **MongoDB**. This system streamlines table-wise ordering, real-time order tracking, invoice generation, admin analytics, and more.

🚀 Features

🧑‍🍳 For Waiters
- Table-wise order placement
- Add menu items to cart
- View past orders
- Live invoice with tax & QR code
- Order confirmation screen
- View served items

🛠️ For Admins
- Manage menu (CRUD with image URLs)
- View, filter, and manage orders
- Mark orders as served
- Generate analytics:
  - Daily orders and income
  - Monthly income chart
  - Top-selling items
  - Date range filtering

🧾 Invoices
- Auto-generated invoice with:
  - Hotel name, GST/phone
  - Waiter info
  - QR code for UPI
  - Tax/GST breakdown
  - Print/download as PDF

🌗 UI & UX
- Light/Dark mode
- Responsive across devices
- Clean dashboard for admin
- Elegant UI with Tailwind CSS


⚙️ Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Frontend    | React.js, Tailwind CSS, Axios        |
| Backend     | Node.js, Express.js                  |
| Database    | MongoDB (Mongoose)                   |
| Auth        | JWT-based Authentication             |
| Deployment  | Netlify (Frontend), Render/Railway (Backend) |
| Invoice     | html2pdf.js, QRCode.js               |


🛠️ Setup Instructions

 1. Clone the Repositories

bash
git clone https://github.com/your-username/hotel-ordering-system-backend.git
git clone https://github.com/your-username/hotel-ordering-system-frontend.git
