import API_BASE_URL from './api';

// api.js

// Dynamically set the base URL depending on the environment
const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000" // Local backend during development
    : "https://hotel-ordering-system-production.up.railway.app";

// Example API call (you can remove this if not needed here)
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
