import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createChatSocket, isRealtimeChatEnabled } from '../lib/socket.js';

export const useChatSocket = (conversationId) => {
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const [status, setStatus] = useState(isRealtimeChatEnabled ? 'connecting' : 'disabled');

  useEffect(() => {
    if (!isRealtimeChatEnabled || !conversationId) return undefined;

    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('join_conversation', conversationId);
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));
    socket.on('new_message', () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    socket.on('conversation_read', () => queryClient.invalidateQueries({ queryKey: ['conversations'] }));

    socket.connect();

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    };
  }, [conversationId, queryClient]);

  const emitTyping = (isTyping) => {
    if (!socketRef.current?.connected || !conversationId) return;
    socketRef.current.emit(isTyping ? 'typing_start' : 'typing_stop', conversationId);
  };

  return { status, emitTyping, realtimeEnabled: isRealtimeChatEnabled };
};
