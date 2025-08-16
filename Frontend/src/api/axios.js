// src/api/axios.js
import axios from "axios";

// ✅ Dynamic base URL
const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://your-backend-service.up.railway.app"; // replace with your Railway backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ✅ Request Interceptor
api.interceptors.request.use(
  (config) => {
    const publicRoutes = ["/auth/login", "/auth/register", "/auth/refresh"];
    const isPublicRoute = publicRoutes.some((route) =>
      config.url?.includes(route)
    );

    if (!isPublicRoute) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("🔑 Token attached to:", config.url);
      } else {
        console.warn("⚠️ No token found for protected route:", config.url);
      }
    } else {
      console.log("🌐 Public route request:", config.url);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    console.error("❌ API Error:", error.response?.data || error.message);

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      const authRoutes = ["/auth/login", "/auth/register", "/auth/refresh"];
      const isAuthRoute = authRoutes.some((route) =>
        originalRequest.url?.includes(route)
      );

      if (isAuthRoute) {
        console.log("🚫 Auth route 401 - no refresh attempt");
        return Promise.reject(error);
      }

      console.log("🔄 Token expired - attempting refresh...");
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Save new tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("❌ Refresh token failed:", refreshError);
        localStorage.clear();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
