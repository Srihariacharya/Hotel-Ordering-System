
// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      if (!data || !data.accessToken) throw new Error('Invalid login response');

      login(data.user, data.accessToken, data.refreshToken);

      if (data.user.role === 'admin') navigate('/admin/orders');
      else navigate('/menu');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>

        {error && <div className="mb-4 text-red-400 text-center">{error}</div>}

        <label className="block mb-4">
          <span className="block text-sm font-medium mb-1">Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
        </label>

        <label className="block mb-6">
          <span className="block text-sm font-medium mb-1">Password</span>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
        </label>

        <button type="submit" disabled={loading}
          className={`w-full py-2 rounded font-semibold transition-colors ${loading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
