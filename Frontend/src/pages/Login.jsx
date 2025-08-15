// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle form field changes
  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Validate form
  const validateForm = () => {
    if (!form.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Invalid email format';
    if (!form.password.trim()) return 'Password is required';
    return '';
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
      });

      if (!data || !data.accessToken || !data.refreshToken) {
        throw new Error('Invalid login response from server');
      }

      // Save tokens and user info
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update Auth Context
      login(data.user, data.accessToken, data.refreshToken);

      // Redirect based on role
      if (data.user?.role === 'admin') {
        navigate('/admin/orders');
      } else {
        navigate('/menu');
      }
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg text-white"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>

        {error && (
          <div className="mb-4 text-red-400 text-center bg-red-900 bg-opacity-30 p-2 rounded">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="block text-sm font-medium mb-1">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="you@example.com"
            required
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>

        <label className="block mb-6">
          <span className="block text-sm font-medium mb-1">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder="Enter your password"
            required
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded font-semibold transition ${
            loading
              ? 'bg-green-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-400">
          Don’t have an account?{' '}
          <Link to="/auth/register" className="text-green-400 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
