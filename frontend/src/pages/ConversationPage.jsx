import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { deleteMessage, getMessages, markConversationRead, sendMessage } from '../services/chat.service.js';
import { ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useChatSocket } from '../hooks/useChatSocket.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';
import { logClientError } from '../utils/clientLogger.js';

const ConversationPage = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const { status, emitTyping, realtimeEnabled } = useChatSocket(conversationId);

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId, { limit: 50 }),
  });

  useEffect(() => {
    markConversationRead(conversationId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch((error) => logClientError('mark_conversation_read_failed', error, { conversationId }));
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(conversationId, content),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
  });

  const messages = [...(messagesQuery.data?.data || [])].reverse();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/messages" className="text-sm font-semibold text-primary">Back to inbox</Link>
          <p className="text-xs text-muted">Realtime: {realtimeEnabled ? status : 'disabled'}</p>
        </div>

        {messagesQuery.isLoading ? (
          <SkeletonBlock className="h-[520px]" />
        ) : messagesQuery.isError ? (
          <ErrorState message={getApiErrorMessage(messagesQuery.error, 'Could not load messages.')} requestId={getApiErrorRequestId(messagesQuery.error)} onRetry={() => messagesQuery.refetch()} />
        ) : (
          <section className="flex min-h-[520px] flex-col rounded-md border border-hairline">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted">No messages yet.</p>
              ) : messages.map((message) => {
                const mine = String(message.sender?._id || message.sender) === String(user?._id);
                return (
                  <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[76%] rounded-md px-4 py-2 text-sm ${mine ? 'bg-primary text-white' : 'bg-surface-soft text-ink'}`}>
                      <p>{message.content}</p>
                      {mine && (
                        <button type="button" className="mt-1 text-[11px] opacity-80" onClick={() => deleteMutation.mutate(message._id)} disabled={deleteMutation.isPending}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); if (content.trim()) sendMutation.mutate(); }} className="border-t border-hairline p-3">
              {sendMutation.isError && <p className="mb-2 text-sm text-error">{getApiErrorMessage(sendMutation.error, 'Could not send message.')}</p>}
              <div className="flex gap-2">
                <input
                  className="field"
                  value={content}
                  onFocus={() => emitTyping(true)}
                  onBlur={() => emitTyping(false)}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write a message"
                  maxLength={2000}
                />
                <button type="submit" className="btn-primary shrink-0" disabled={sendMutation.isPending}>Send</button>
              </div>
            </form>
          </section>
        )}
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default ConversationPage;
