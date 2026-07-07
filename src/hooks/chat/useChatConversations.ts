import { useQuery } from "@tanstack/react-query";
import request from "@/api/request";
import { useChatStore } from "@/store/chatStore";

export interface ChatConversationUser {
  user_id: number;
  username: string;
  avatar?: string;
}

export interface ChatConversation {
  conversation_id: string;
  type: "private" | "group";
  title?: string;
  avatar?: string;
  last_message?: string;
  last_message_type?: number;
  last_message_at?: string;
  unread_count?: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  users?: ChatConversationUser[];
}

async function fetchChatConversations() {
  const res = await request.get("/chat/conversations");
  return res.data?.data?.conversations ?? [];
}

export function useChatConversations(enabled = true) {
  const hydrateFromServer = useChatStore((s) => s.hydrateFromServer);
  return useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: async () => {
      const items = await fetchChatConversations();
      hydrateFromServer(
        items.map((item: ChatConversation) => ({
          conversationId: item.conversation_id,
          type: item.type,
          title: item.title || item.users?.[0]?.username || "",
          avatar: item.avatar,
          lastMessage: item.last_message || "",
          lastMessageType: item.last_message_type || 1,
          lastMessageAt: item.last_message_at || "",
          unreadCount: item.unread_count || 0,
          isPinned: Boolean(item.is_pinned),
          isMuted: Boolean(item.is_muted),
          members: item.users || [],
        }))
      );
      return items;
    },
    enabled,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });
}
