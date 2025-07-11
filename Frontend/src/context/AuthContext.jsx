// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; 

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const getToken = () => localStorage.getItem('accessToken');
  const getRefreshToken = () => localStorage.getItem('refreshToken');

  const login = (userData, accessToken, refreshToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // ✅  Silently refresh access token before it expires
  useEffect(() => {
    const refreshAccessToken = async () => {
      try {
        const res = await fetch('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: getRefreshToken() }),
        });

        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();

        // Update localStorage and state
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);

      } catch (err) {
        console.error('❌ Token refresh failed:', err.message);
        logout(); // log user out if refresh fails
      }
    };

    const scheduleRefresh = () => {
      const token = getToken();
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        const exp = decoded.exp * 1000; // convert to ms
        const timeout = exp - Date.now() - 30 * 1000; // 30 sec before expiry

        if (timeout > 0) {
          setTimeout(refreshAccessToken, timeout);
        } else {
          refreshAccessToken();
        }
      } catch (err) {
        console.error('❌ Token decode failed:', err.message);
        logout();
      }
    };

    scheduleRefresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
