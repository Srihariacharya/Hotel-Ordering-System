// api.js
// Dynamically set the base URL depending on the environment
const API_BASE_URL =
  import.meta.env.VITE_API_URL || // Set this in Netlify environment variables
  (import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : ""); // fallback — should always be set via VITE_API_URL in production
// Example API call to fetch menu items
export const fetchMenu = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/menu`);
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch menu:", error);
    return [];
  }
};
// Export the base URL for use in other files
export default API_BASE_URL;