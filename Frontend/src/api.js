import API_BASE_URL from './api';

fetch(`${API_BASE_URL}/menu`)
  .then((res) => res.json())
  .then((data) => {
    console.log(data);
  });

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://hotel-ordering-system-production.up.railway.app";

export default API_BASE_URL;