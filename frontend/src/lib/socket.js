import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';

export const isRealtimeChatEnabled = import.meta.env.VITE_ENABLE_CHAT_SOCKET === 'true';

export const createChatSocket = () =>
  io(socketUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
