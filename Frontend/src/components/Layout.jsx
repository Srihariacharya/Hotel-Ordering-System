import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen w-full bg-[url('/bg-veg.jpg')] bg-cover bg-fixed bg-no-repeat bg-center">
      <div className="backdrop-blur-sm bg-white/70 min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
