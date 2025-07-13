import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';


const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/auth/register', {
        name,
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          Register
        </h2>

        <label className="block mb-4">
          <span className="block text-sm font-medium text-gray-700">Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
          />
        </label>

        <label className="block mb-4">
          <span className="block text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
          />
        </label>

        <label className="block mb-6">
          <span className="block text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPass(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
          />
        </label>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold"
        >
          Sign Up
        </button>

        <p className="text-center text-sm mt-4 text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
};

export default Register;
