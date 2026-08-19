import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar.jsx";
import BottomNav from "../components/layout/BottomNav.jsx";
import { getConversations } from "../services/chat.service.js";
import {
  EmptyState,
  ErrorState,
  PageShell,
  SkeletonBlock,
} from "../components/common/StateViews.jsx";
import { formatDate, getCoverImage } from "../utils/formatters.js";
import { getApiErrorMessage, getApiErrorRequestId } from "../utils/apiError.js";
import { useChatSocket } from "../hooks/useChatSocket.js";

const MessagesPage = () => {
  useChatSocket();
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });
  const conversations = conversationsQuery.data?.data || [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <h1 className="text-2xl font-semibold text-ink">Inbox</h1>
        <p className="mt-1 text-sm text-muted">
          Conversation pagination is not exposed by the backend.
        </p>

        <div className="mt-6">
          {conversationsQuery.isLoading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          ) : conversationsQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                conversationsQuery.error,
                "Could not load conversations.",
              )}
              requestId={getApiErrorRequestId(conversationsQuery.error)}
              onRetry={() => conversationsQuery.refetch()}
            />
          ) : conversations.length === 0 ? (
            <EmptyState
              title="No conversations"
              message="Start a conversation from a property detail page."
            />
          ) : (
            <div className="divide-y divide-hairline rounded-md border border-hairline">
              {conversations.map((conversation) => {
                const cover = getCoverImage(conversation.property);
                return (
                  <Link
                    key={conversation._id}
                    to={`/messages/${conversation._id}`}
                    className="grid gap-4 p-4 hover:bg-surface-soft sm:grid-cols-[84px_minmax(0,1fr)]"
                  >
                    <div className="h-20 w-20 overflow-hidden rounded-sm bg-surface-soft">
                      {cover ? (
                        <img
                          src={cover}
                          alt={conversation.property?.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex justify-between gap-3">
                        <p className="truncate font-semibold text-ink">
                          {conversation.property?.title || "Conversation"}
                        </p>
                        <span className="text-xs text-muted">
                          {formatDate(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="mt-2 inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {conversation.unreadCount} unread
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default MessagesPage;
