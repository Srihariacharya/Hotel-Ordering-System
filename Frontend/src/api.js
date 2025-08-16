// src/api.js

// ✅ Better environment detection
const isProduction = 
  import.meta.env.PROD || // Vite production flag
  import.meta.env.MODE === "production" || 
  window.location.hostname !== "localhost";

// ✅ Use environment variable first, then fallback
const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (isProduction 
    ? "https://hotel-ordering-system-production.up.railway.app" 
    : "http://localhost:5000");

console.log("🌐 API Base URL (from api.js):", API_BASE_URL);

// Example API call
export const fetchMenu = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/menu`);
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch menu:", error);
    return [];
  }
};

// Export the base URL for use in other files
export default API_BASE_URL;