import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      
      console.log('🔄 AuthContext initialization:', {
        hasStoredUser: !!storedUser,
        hasToken: !!token,
      });

      if (storedUser && token) {
        const parsedUser = JSON.parse(storedUser);
        const enhanced = { ...parsedUser, isAdmin: parsedUser.role === 'admin' };
        setUser(enhanced);
        console.log('✅ User session restored:', enhanced);
      }
    } catch (error) {
      console.error('❌ Error restoring user session:', error);
      localStorage.clear();
    }
    setLoading(false);
  }, []);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    console.log('🎫 Getting token:', token ? `${token.substring(0, 20)}...` : 'None');
    return token;
  }, []);

  const login = useCallback((userData, accessToken, refreshToken) => {
    console.log('🔐 AuthContext login called:', {
      user: userData,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    const enhanced = { ...userData, isAdmin: userData.role === 'admin' };
    
    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(enhanced));
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    // Update state
    setUser(enhanced);
    setLoading(false);
    
    console.log('✅ Login completed, user set in context');
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 AuthContext logout called');
    
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    setUser(null);
    setLoading(false);
    
    console.log('✅ Logout completed');
  }, []);

  const isAuthenticated = useCallback(() => {
    const token = getToken();
    const currentUser = user;
    const authenticated = !!(token && currentUser);
    
    console.log('🔍 Authentication check:', {
      hasToken: !!token,
      hasUser: !!currentUser,
      authenticated
    });
    
    return authenticated;
  }, [user, getToken]);

  const value = {
    user,
    loading,
    login,
    logout,
    getToken,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};