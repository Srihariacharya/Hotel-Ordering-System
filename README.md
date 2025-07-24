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

cd hotel-ordering-system-backend
npm install
npm run dev

cd hotel-ordering-system-frontend
npm install
npm run dev

🌐 Live Demo
🔗 Frontend: https://your-netlify-url.netlify.app
🔗 Backend: https://your-railway-url.up.railway.app

📂 Project Structure
hotel-ordering-system/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js

📚 Documentation
API Docs coming soon (Postman collection will be added)
Admin Login: /admin/login
Place Order: /order/place
Generate Invoice: /invoice/:orderId

👥 Contributing
Fork the repo
Create your feature branch (git checkout -b feature/YourFeature)
Commit your changes (git commit -m 'Add awesome feature')
Push to the branch (git push origin feature/YourFeature)
Open a Pull Request

👨‍💻 Author
Srihari Acharya
Feel free to connect or reach out if you need help or want to contribute!

📃 License
This project is open-source and available under the MIT License.
