import api from './api.js';

export const createBooking = (data) => api.post('/bookings', data).then((res) => res.data);

export const checkAvailability = (params) =>
  api.get('/bookings/check-availability', { params }).then((res) => res.data);

export const getMyBookings = (params = {}) =>
  api.get('/bookings/my-bookings', { params }).then((res) => res.data);

export const getHostBookings = (params = {}) =>
  api.get('/bookings/host-bookings', { params }).then((res) => res.data);

export const getBookingById = (id) =>
  api.get(`/bookings/${id}`).then((res) => res.data);

export const confirmBooking = (id) =>
  api.patch(`/bookings/${id}/confirm`).then((res) => res.data);

export const cancelBooking = (id, reason) =>
  api.patch(`/bookings/${id}/cancel`, { reason }).then((res) => res.data);
