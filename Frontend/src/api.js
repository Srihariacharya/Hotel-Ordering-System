// src/api/api.js

// ================================
// 🔹 API Base URL
// Dynamically set based on environment
// ================================
const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || // Vite env
  process.env.REACT_APP_API_URL || // CRA fallback
  (import.meta.env.MODE === "development"
    ? "http://localhost:5000" // Local backend during development
    : "https://hotel-ordering-system-production.up.railway.app"); // Production backend

// ================================
// 🔹 Example API call: fetch menu
// ================================
export const fetchMenu = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/menu`);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("❌ Failed to fetch menu:", error);
    return [];
  }
};

// ================================
// 🔹 Export the base URL for other files
// ================================
export default API_BASE_URL;
