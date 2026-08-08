import api from './api.js';

export const getProperties = (params = {}) =>
  api.get('/properties', { params }).then((res) => res.data);

export const getPropertyById = (id) =>
  api.get(`/properties/${id}`).then((res) => res.data);