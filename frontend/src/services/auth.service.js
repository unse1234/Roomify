import api from './api.js';

export const registerUser = (data) => api.post('/auth/register', data).then((res) => res.data);
export const loginUser = (data) => api.post('/auth/login', data).then((res) => res.data);
export const logoutUser = () => api.post('/auth/logout').then((res) => res.data);
export const fetchCurrentUser = () => api.get('/auth/me').then((res) => res.data);