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
| Deployment  | Netlify (Frontend),Railway (Backend) |
| Invoice     | html2pdf.js, QRCode.js               |


<br><br>🛠️ Setup Instructions

 1. Clone the Repositories<br>
git clone https://github.com/your-username/hotel-ordering-system-backend.git<br>
git clone https://github.com/your-username/hotel-ordering-system-frontend.git<br><br>

cd hotel-ordering-system-backend<br>
npm install<br>
npm run dev<br><br>

cd hotel-ordering-system-frontend<br>
npm install<br>
npm run dev<br><br>

🌐 Live Demo<br>
🔗 Frontend: https://your-netlify-url.netlify.app<br>
🔗 Backend: https://your-railway-url.up.railway.app<br><br>

📚 Documentation<br>
API Docs coming soon (Postman collection will be added)<br>
Admin Login: /admin/login<br>
Place Order: /order/place<br>
Generate Invoice: /invoice/:orderId<br><br>

👥 Contributing<br>
Fork the repo<br>
Create your feature branch (git checkout -b feature/YourFeature)<br>
Commit your changes (git commit -m 'Add awesome feature')<br>
Push to the branch (git push origin feature/YourFeature)<br>
Open a Pull Request<br><br>

👨‍💻 Author<br>
Srihari Acharya<br>
Feel free to connect or reach out if you need help or want to contribute!<br><br>

📃 License<br>
This project is open-source and available under the MIT License.
