import axios from 'axios';

const BASE_URL = import.meta.env.MODE === 'development'
  ? 'http://localhost:5000'
  : 'https://hotel-ordering-system-production.up.railway.app';

console.log('🌐 API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with enhanced debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🎫 Request with token:', {
        url: config.url,
        method: config.method?.toUpperCase(),
        token: `${token.substring(0, 30)}...`,
        headers: config.headers.Authorization
      });
    } else {
      console.warn('⚠️ Request without token:', {
        url: config.url,
        method: config.method?.toUpperCase()
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      console.warn('🔒 401 Unauthorized - clearing auth data');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login')) {
        console.log('🔄 Redirecting to login');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;