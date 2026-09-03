import api from './api.js';

export const getAppConfig = () =>
  api.get('/config').then((res) => res.data);
