// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import jwtDecode from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const getToken = () => localStorage.getItem('accessToken');
  const getRefreshToken = () => localStorage.getItem('refreshToken');

  const enhance = (raw) => ({ ...raw, isAdmin: raw?.role === 'admin' });

  const login = (userData, accessToken, refreshToken) => {
    const enhanced = enhance(userData);
    localStorage.setItem('user', JSON.stringify(enhanced));
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    setUser(enhanced);
    scheduleRefresh(accessToken);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) { logout(); return; }

      const res = await fetch((import.meta.env.MODE === 'development' ? 'http://localhost:5000' : 'https://hotel-ordering-system-production.up.railway.app') + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      const enhanced = enhance(data.user);
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(enhanced));
      setUser(enhanced);
      scheduleRefresh(data.accessToken);
    } catch (err) {
      console.error('Token refresh failed', err);
      logout();
    }
  }, []);

  // schedule refresh based on token expiry
  const scheduleRefresh = (token) => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      const expMs = decoded.exp * 1000;
      const timeout = expMs - Date.now() - 30 * 1000;
      if (timeout <= 0) { refreshAccessToken(); return; }
      setTimeout(() => refreshAccessToken(), timeout);
    } catch (err) {
      console.error('Token decode failed', err);
      logout();
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          scheduleRefresh(token);
        } else {
          refreshAccessToken();
        }
      } catch (err) {
        console.error('Token decode on startup failed', err);
        logout();
      }
    }
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
