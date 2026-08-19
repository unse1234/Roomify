import api from './api.js';

export const getProperties = (params = {}) =>
  api.get('/properties', { params }).then((res) => res.data);

export const getPropertyById = (id) =>
  api.get(`/properties/${id}`).then((res) => res.data);

export const getHostProperties = () =>
  api.get('/properties/host/my-properties').then((res) => res.data);

export const createProperty = (formData, onUploadProgress) =>
  api
    .post('/properties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then((res) => res.data);

export const updateProperty = (id, data, onUploadProgress) =>
  api
    .patch(`/properties/${id}`, data, {
      ...(data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
      onUploadProgress,
    })
    .then((res) => res.data);

export const deleteProperty = (id) =>
  api.delete(`/properties/${id}`).then((res) => res.data);

export const updatePropertyStatus = (id, status) =>
  api.patch(`/properties/${id}/status`, { status }).then((res) => res.data);

export const getWishlist = () =>
  api.get('/properties/wishlist').then((res) => res.data);

export const toggleWishlist = (id) =>
  api.patch(`/properties/${id}/wishlist`).then((res) => res.data);