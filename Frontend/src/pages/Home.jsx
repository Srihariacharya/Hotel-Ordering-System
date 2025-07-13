import React from 'react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  console.log('🔐 Current user:', user);


  return (
    <div className="w-full min-h-screen px-4 py-8 space-y-12 bg-gray-100 dark:bg-gray-900">
      {/* HERO SECTION */}
      <header className="relative h-[60vh] rounded-lg overflow-hidden shadow-lg">
        <img
          src="/images/shankar-hero.jpg"
          alt="Shri Shankar Bhavan North Indian Thali"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center text-white p-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-wide">
            Shri Shankar Bhavan
          </h1>
          <p className="mt-4 text-lg md:text-2xl max-w-3xl">
            North Indian Delicacies Rooted in Tradition — Since 1955
          </p>
          {user && (
            <p className="mt-4 text-base md:text-lg bg-white/20 px-4 py-2 rounded-lg font-medium">
              Welcome, <span className="font-semibold">{user.name}</span> (
              {user.role === 'admin' ? (
                <span className="text-yellow-300 font-semibold">Admin</span>
              ) : (
                <span className="text-green-200 font-semibold">Customer</span>
              )}
              )
            </p>
          )}
        </div>
      </header>

      {/* ABOUT SECTION */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-red-900 dark:text-red-300">Our Legacy</h2>
          <p className="text-gray-800 dark:text-gray-100 leading-relaxed">
            Established in 1955, <strong>Shri Shankar Bhavan</strong> has grown from a humble
            eatery to one of Bengaluru’s most cherished North Indian vegetarian restaurants.
            Known for our rich gravies, hand-rolled rotis, and royal thalis, we’ve been
            serving generations with the authentic flavors of the North.
          </p>
          <p className="mt-4 text-gray-800 dark:text-gray-100 leading-relaxed">
            Our recipes are inspired by traditional Punjabi, Rajasthani, and Awadhi kitchens —
            made fresh daily using hand-ground spices, slow-cooked dals, and pure desi ghee.
            Whether it's a simple Aloo Paratha or a royal Shahi Paneer, every plate tells a story.
          </p>
        </div>

        <img
          src="/images/shankar-kitchen.jpg"
          alt="Chef preparing North Indian thali"
          className="w-full h-64 object-cover rounded-md shadow"
        />
      </section>

      {/* INFO GRID */}
      <section className="grid md:grid-cols-3 gap-6">
        {/* Signature Dishes */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3 text-red-800 dark:text-red-300">Signature Dishes</h3>
          <ul className="list-disc list-inside text-gray-800 dark:text-gray-100 space-y-1">
            <li>Paneer Butter Masala</li>
            <li>Shahi Thali (Special)</li>
            <li>Rajma Chawal</li>
            <li>Aloo Paratha with Curd</li>
            <li>Chole Bhature</li>
            <li>Lassi &amp; Gulab Jamun</li>
          </ul>
        </div>

        {/* Opening Hours */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3 text-red-800 dark:text-red-300">Timings</h3>
          <ul className="space-y-1 text-gray-800 dark:text-gray-100">
            <li>Mon – Fri: 7:00 AM – 5:00 PM / 6:00 PM – 10:30 PM</li>
            <li>Sat – Sun: 7:00 AM – 5:30 PM / 6:00 PM – 11:00 PM</li>
          </ul>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3 text-red-800 dark:text-red-300">Visit Us</h3>
          <p className="text-gray-800 dark:text-gray-100 mb-4">
            #21, Temple Road<br />
            Malleswaram, Bengaluru – 560003
          </p>
          <a
            href="https://maps.app.goo.gl/xyz123"
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 px-4 py-2 rounded-md bg-red-700 text-white hover:bg-red-800"
          >
            Get Directions
          </a>
        </div>
      </section>
    </div>
  );
};

export default Home;
