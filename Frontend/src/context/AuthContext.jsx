// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================================
  // 🔄 Initialize user from localStorage
  // ================================
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");

        console.log("🔄 Restoring session:", {
          hasStoredUser: !!storedUser,
          hasAccessToken: !!token,
          hasRefreshToken: !!refreshToken,
        });

        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          const enhanced = { ...parsedUser, isAdmin: parsedUser.role === "admin" };
          setUser(enhanced);
          console.log("✅ User session restored:", enhanced);
        } else if (refreshToken) {
          // Attempt silent refresh
          try {
            const { data } = await api.post("/auth/refresh", { refreshToken });
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            localStorage.setItem("user", JSON.stringify(data.user));

            const enhanced = { ...data.user, isAdmin: data.user.role === "admin" };
            setUser(enhanced);
            console.log("✅ Silent refresh success:", enhanced);
          } catch (err) {
            console.warn("⚠️ Silent refresh failed:", err);
            localStorage.clear();
          }
        }
      } catch (error) {
        console.error("❌ Error restoring user session:", error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ================================
  // 🎫 Get access token
  // ================================
  const getToken = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    return token || null;
  }, []);

  // ================================
  // 🔐 Login function
  // ================================
  const login = useCallback((userData, accessToken, refreshToken) => {
    const enhanced = { ...userData, isAdmin: userData.role === "admin" };

    localStorage.setItem("user", JSON.stringify(enhanced));
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    setUser(enhanced);
    setLoading(false);

    console.log("✅ Login completed:", enhanced);
  }, []);

  // ================================
  // 🚪 Logout function
  // ================================
  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setUser(null);
    setLoading(false);

    console.log("✅ Logout completed");
  }, []);

  // ================================
  // 🔍 Check authentication
  // ================================
  const isAuthenticated = useCallback(() => {
    const token = getToken();
    return !!(token && user);
  }, [user, getToken]);

  // ================================
  // ✅ Context value
  // ================================
  const value = {
    user,
    loading,
    login,
    logout,
    getToken,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ================================
// 🔗 Custom hook to use AuthContext
// ================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
