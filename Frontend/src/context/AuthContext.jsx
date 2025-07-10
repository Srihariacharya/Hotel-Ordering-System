import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // ✅ make sure this is installed: npm i jwt-decode

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // <-- just start with null

  // ✅ useEffect to restore user from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (!isExpired) {
          setUser(JSON.parse(storedUser));
        } else {
          logout();
        }
      } catch (err) {
        console.error('Invalid token:', err);
        logout();
      }
    }
  }, []); // ← run only once when app loads

  // ✅ called when user logs in
  function login(userData, token) {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  }

  // ✅ called when user logs out or token expires
  function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  }

  function getToken() {
    return localStorage.getItem('token');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
