const API_BASE_URL = "http://localhost:5000"; 

export default API_BASE_URL;

import API_BASE_URL from './api';

fetch(`${API_BASE_URL}/menu`)
