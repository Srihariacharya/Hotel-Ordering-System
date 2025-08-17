// src/api/axios.js
import axios from "axios";

// Figure out API base URL depending on environment
let API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});
// Debug logging (only in dev)
const log = (...args) => {
  if (
    (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
    process.env.NODE_ENV === "development"
  ) {
    console.log(...args);
  }
};

// ✅ Request Interceptor
api.interceptors.request.use(
  (config) => {
    const publicRoutes = ["/auth/login", "/auth/register", "/auth/refresh"];
    const isPublic = publicRoutes.some((r) => config.url?.includes(r));

    if (!isPublic) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        log("🔑 Token attached →", config.url);
      } else {
        log("⚠️ No token for protected route:", config.url);
      }
    } else {
      log("🌐 Public route →", config.url);
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
    log("❌ API Error:", error.response?.data || error.message);

    if (error.response?.status === 401 && !originalRequest._retry) {
      const authRoutes = ["/auth/login", "/auth/register", "/auth/refresh"];
      const isAuthRoute = authRoutes.some((r) => originalRequest.url?.includes(r));

      if (isAuthRoute) {
        log("🚫 Auth route 401 → No refresh attempt");
        return Promise.reject(error);
      }

      log("🔄 Token expired → Trying refresh...");
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));

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
