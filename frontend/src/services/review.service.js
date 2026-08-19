import api from './api.js';

export const getPropertyReviews = (propertyId, params = {}) =>
  api.get(`/reviews/property/${propertyId}`, { params }).then((res) => res.data);

export const getMyReviews = (params = {}) =>
  api.get('/reviews/my-reviews', { params }).then((res) => res.data);

export const getReviewById = (id) =>
  api.get(`/reviews/${id}`).then((res) => res.data);

export const createReview = (data) =>
  api.post('/reviews', data).then((res) => res.data);

export const updateReview = (id, data) =>
  api.patch(`/reviews/${id}`, data).then((res) => res.data);

export const deleteReview = (id) =>
  api.delete(`/reviews/${id}`).then((res) => res.data);

export const addHostResponse = (id, comment) =>
  api.patch(`/reviews/${id}/host-response`, { comment }).then((res) => res.data);
