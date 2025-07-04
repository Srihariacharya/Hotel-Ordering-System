import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Menu from "./pages/Menu";
import Login from "./pages/Login"; 
import Register from "./pages/Register"; 
import MyOrders from './pages/MyOrders';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/login" element={<Login />} />  
        <Route path="/register" element={<Register />} />
        <Route path="/my-orders" element={<MyOrders />} />
      </Routes>
    </Router>
  );
}

export default App;

