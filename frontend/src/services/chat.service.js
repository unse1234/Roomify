import api from './api.js';

export const getConversations = () =>
  api.get('/chat/conversations').then((res) => res.data);

export const startConversation = (data) =>
  api.post('/chat/conversations', data).then((res) => res.data);

export const getMessages = (conversationId, params = {}) =>
  api.get(`/chat/conversations/${conversationId}/messages`, { params }).then((res) => res.data);

export const sendMessage = (conversationId, content) =>
  api.post(`/chat/conversations/${conversationId}/messages`, { content }).then((res) => res.data);

export const markConversationRead = (conversationId) =>
  api.patch(`/chat/conversations/${conversationId}/read`).then((res) => res.data);

export const deleteMessage = (messageId) =>
  api.delete(`/chat/messages/${messageId}`).then((res) => res.data);
