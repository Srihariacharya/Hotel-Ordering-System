import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="w-screen h-screen overflow-x-hidden bg-[url('/about/veg.jpg')] bg-cover bg-center bg-fixed">
      <div className="w-full h-full backdrop-blur-sm bg-white/80 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full h-full overflow-y-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
