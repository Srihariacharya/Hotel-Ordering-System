// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      // ✅ Store both access and refresh tokens
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-white text-center">Login</h2>

        <label className="block mb-4">
          <span className="block text-sm font-medium text-white">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
          />
        </label>

        <label className="block mb-6">
          <span className="block text-sm font-medium text-white">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white"
          />
        </label>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold"
        >
          Log In
        </button>

        <p className="text-center text-sm mt-4 text-white">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-400 hover:underline">Sign Up</a>
        </p>
      </form>
    </div>
  );
};

export default Login;
