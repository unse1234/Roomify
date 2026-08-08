import axios from 'axios';

// withCredentials is required for the httpOnly JWT cookie to be sent
// on every request — the backend never issues a bearer token.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

export default api;