# Hotel Ordering System

Hotel Ordering System is an online platform designed to enhance the guest experience in hotels by allowing users to browse services, place orders, and manage their requests seamlessly. The application is built with Node.js, Express, and MongoDB, featuring a user-friendly interface to streamline the ordering process.


## Features

- **User  Registration and Login**: Guests can create accounts and log in to access their orders.
-- **Table-wise Order Placement**: Waiters can place orders for specific tables.
- **Add Menu Items to Cart**: Waiters can add menu items to the cart for easy ordering.
- **View Past Orders**: Waiters can view past orders for reference.
- **Live Invoice with Tax & QR Code**: Waiters can view live invoices with tax and QR code for easy payment.
- **Order Confirmation Screen**: Waiters can view order confirmation screens for confirmation.
- **View Served Items**: Waiters can view served items for easy tracking.
- **Service Management**: Admins can add, edit, and manage available services using a dedicated admin interface.
- **Order Placement**: Users can browse through available services and place orders directly from their devices.
- **Dynamic Service Display**: Services are dynamically loaded from the database for easy management.
- **AI-Powered Predictions**: The application uses machine learning to predict guest preferences and optimize service recommendations.
- **Manage Menu (CRUD with Image URLs)**: Admins can manage menu items with CRUD operations and image URLs.
- **View, Filter, and Manage Orders**: Admins can view, filter, and manage orders for easy tracking.
- **Mark Orders as Served**: Admins can mark orders as served for easy tracking.
- - **Generate Analytics**:- Daily orders and income
  - Monthly income chart
  - Top-selling items
  - Date range filtering
- **Auto-Generated Invoices**: Invoices include hotel name, GST/phone, waiter info, QR code for UPI, tax/GST breakdown, and can be printed/downloaded as PDF.
- **Light/Dark Mode**: The application features light and dark mode for easy viewing.
- **Responsive Across Devices**: The application is responsive across devices for easy access.
- **Clean Dashboard for Admin**: The application features a clean dashboard for admins for easy tracking.
- **Elegant UI with Tailwind CSS**: The application features an elegant UI with Tailwind CSS for easy viewing.
- **Secure Authentication**: Utilizes JWT (JSON Web Tokens) for secure user authentication.

## Technologies Used

- **Frontend**: React,Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer for handling image uploads
- **Flash Messages**: Connect-flash for user notifications

## **Installation**

1. Clone the repository:
   ```
   git clone https://github.com/Srihariacharya/Hotel-Ordering-System.git
   cd Hotel-Ordering-System
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your environment variables in a .env file:
   ```
   DB_URI=mongodb://<username>:<password>@localhost:27017/hotel_ordering_system
   JWT_SECRET=your_jwt_secret
   ```
4. Start the MongoDB server:
   ```
   mongod
   ```
5. Run the application:
   ```
   node app.js
   ```

## Usage

  - Open your browser and navigate to
    ```
    http://localhost:5173/
    ```
  - Register a new account or log in if you already have one.
  - Browse through the available services and place orders.
  - Access your order history and manage your requests.

## Screenshots

## Cashier Side

 ### Home Page
  <img width="500" height="600" alt="image" src="https://github.com/user-attachments/assets/1c708fc3-0f07-4e62-9a91-51e388f270f7" />
  
 ### Menu Page
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/a3ce59c7-23eb-42be-9c48-12ac79d1b8bd" />
  
 ### Admin Order
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/48e5c16b-594c-46f7-9134-73f1e13d2b9b" />
  
 ### Admin Analytics
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/84f81232-b2c8-42b8-a40e-1ceb68a10151" /><br/>
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/f95eda29-32a7-45e2-8fed-65fc46c44ef6" />
  
 ### AI Prediction
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/cbed5784-7af3-4bb0-b270-ec04d3c76d58" />
  
 ### Admin Menu Dashboard
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/224a24fb-1cf9-4a3c-93b5-e49b4ac10646" />

## Waiter Side

 ### Waiter Order
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/e59bda18-282a-4f71-a422-6d79e0710479" />
  
 ### Waiter Order Cart
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/0e4d73fb-ea23-44f7-8646-2b785c91e1f6" />

## Light Mode
  <img width="500" height="500" alt="image" src="https://github.com/user-attachments/assets/b1493c52-9e8b-4957-b1ab-7fa61ed1b708" />

## Hotel Bill
  <img width="350" height="600" alt="image" src="https://github.com/user-attachments/assets/0877cb5f-a18a-4e6a-961e-8e0de3d34ec8" />

## Contributing

  Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgments

- Express for the web framework
- Mongoose for MongoDB object modeling
- JWT for authentication
- Multer for handling file uploads
- TensorFlow.js for AI-powered predictions
- GPT for guidance on building the project







