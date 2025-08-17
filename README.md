Hotel Ordering System
Hotel Ordering System is an online platform designed to enhance the guest experience in hotels by allowing users to browse services, place orders, and manage their requests seamlessly. The application is built with Node.js, Express, and MongoDB, featuring a user-friendly interface to streamline the ordering process.

Features
User Registration and Login: Guests can create accounts and log in to access their orders.
Table-wise Order Placement: Waiters can place orders for specific tables.
Add Menu Items to Cart: Waiters can add menu items to the cart for easy ordering.
View Past Orders: Waiters can view past orders for reference.
Live Invoice with Tax & QR Code: Waiters can view live invoices with tax and QR code for easy payment.
Order Confirmation Screen: Waiters can view order confirmation screens for confirmation.
View Served Items: Waiters can view served items for easy tracking.
Service Management: Admins can add, edit, and manage available services using a dedicated admin interface.
Order Placement: Users can browse through available services and place orders directly from their devices.
Dynamic Service Display: Services are dynamically loaded from the database for easy management.
AI-Powered Predictions: The application uses machine learning to predict guest preferences and optimize service recommendations.
Manage Menu (CRUD with Image URLs): Admins can manage menu items with CRUD operations and image URLs.
View, Filter, and Manage Orders: Admins can view, filter, and manage orders for easy tracking.
Mark Orders as Served: Admins can mark orders as served for easy tracking.
Generate Analytics:
Daily orders and income
Monthly income chart
Top-selling items
Date range filtering
Auto-Generated Invoices: Invoices include hotel name, GST/phone, waiter info, QR code for UPI, tax/GST breakdown, and can be printed/downloaded as PDF.
Light/Dark Mode: The application features light and dark mode for easy viewing.
Responsive Across Devices: The application is responsive across devices for easy access.
Clean Dashboard for Admin: The application features a clean dashboard for admins for easy tracking.
Elegant UI with Tailwind CSS: The application features an elegant UI with Tailwind CSS for easy viewing.
Secure Authentication: Utilizes JWT (JSON Web Tokens) for secure user authentication.
Technologies Used
Backend: Node.js, Express.js
Database: MongoDB
Authentication: JWT (JSON Web Tokens)
File Upload: Multer for handling image uploads
Flash Messages: Connect-flash for user notifications
Installation
Clone the repository:

bash

Run
Copy code
git clone https://github.com/Srihariacharya/Hotel-Ordering-System.git
cd Hotel-Ordering-System
Install dependencies:

bash

Run
Copy code
npm install
Set up your environment variables in a .env file:

plaintext

Run
Copy code
DB_URI=mongodb://<username>:<password>@localhost:27017/hotel_ordering_system
JWT_SECRET=your_jwt_secret
Start the MongoDB server:

bash

Run
Copy code
mongod
Run the application:

bash

Run
Copy code
node app.js
Usage
Open your browser and navigate to http://localhost:3000.
Register a new account or log in if you already have one.
Browse through the available services and place orders.
Access your order history and manage your requests.
Screenshots
Home Page
Home Page

Service Page
Service Page

Order Page
Order Page

Admin Page
Admin Page

Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

Acknowledgments
Express for the web framework
Mongoose for MongoDB object modeling
JWT for authentication
Multer for handling file uploads
TensorFlow.js for AI-powered predictions
Sheryians Coding School for guidance on building the project