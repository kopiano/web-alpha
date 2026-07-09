import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchConversationMessages, fetchGroupMessages } from "@/api/chat";

export interface ChatMessage {
  id: number;
  conversation_id: string;
  sender_id: number;
  sender_username?: string;
  sender_avatar?: string;
  msg_type?: string;
  message_type?: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

async function fetchMessages(conversationId: string, beforeId?: number, guestMode = false) {
  const isGroupGuest = guestMode && Boolean(conversationId);
  if (guestMode && !isGroupGuest) return [];
  const requestParams = {
    params: {
      limit: 30,
      ...(beforeId ? { before_id: beforeId } : {}),
    },
  };
  const requestFn = isGroupGuest ? fetchGroupMessages : fetchConversationMessages;
  const res = await requestFn(conversationId, requestParams);
  const data = res.data?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

export function useChatMessages(conversationId?: string, enabled = true, guestMode = false) {
  return useInfiniteQuery({
    queryKey: ["chat", "messages", conversationId],
    queryFn: ({ pageParam }) => fetchMessages(conversationId!, pageParam as number | undefined, guestMode),
    enabled: enabled && Boolean(conversationId),
    initialPageParam: undefined,
    getNextPageParam: () => undefined,
    getPreviousPageParam: (firstPage) => {
      if (!Array.isArray(firstPage) || firstPage.length < 30) return undefined;
      const oldest = firstPage[0];
      const oldestId = Number(oldest?.id ?? oldest?.message_id ?? oldest?._id ?? 0);
      return Number.isFinite(oldestId) && oldestId > 0 ? oldestId : undefined;
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status && status < 500) return false;
      return failureCount < 2;
    },
  });
}

export function useInvalidateChatMessages() {
  const queryClient = useQueryClient();
  return (conversationId?: string) => {
    if (!conversationId) return;
    queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
  };
}
