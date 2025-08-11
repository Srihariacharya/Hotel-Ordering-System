// src/api/axios.js
import axios from 'axios';

const BASE_URL = import.meta.env.MODE === 'development'
  ? 'http://localhost:5000'
  : 'https://hotel-ordering-system-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// attach access token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, err => Promise.reject(err));

// refresh on 401
api.interceptors.response.use(res => res, async err => {
  const originalRequest = err.config;
  if (err.response?.status === 401 && !originalRequest?._retry) {
    originalRequest._retry = true;
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
      const { accessToken, refreshToken: newRefresh, user } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefresh);
      localStorage.setItem('user', JSON.stringify(user));
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      console.error('Refresh failed', refreshErr);
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    }
  }
  return Promise.reject(err);
});

export default api;
