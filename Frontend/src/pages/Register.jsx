// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim()
      });
      // You may either auto-login here or redirect to login
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Register</h2>

        {error && <div className="mb-4 text-red-400 text-center">{error}</div>}

        <input name="name" value={form.name} onChange={onChange} placeholder="Name" required className="w-full mb-4 p-2 border rounded" />
        <input name="email" value={form.email} onChange={onChange} placeholder="Email" required className="w-full mb-4 p-2 border rounded" />
        <input name="password" type="password" value={form.password} onChange={onChange} placeholder="Password" required className="w-full mb-4 p-2 border rounded" />

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
}
