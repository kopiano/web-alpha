import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import request from "@/api/request";

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

async function fetchMessages(conversationId: string, page = 1) {
  const res = await request.get(`/chat/conversations/${conversationId}/messages`, {
    params: {
      page,
      page_size: 30,
    },
  });
  const data = res.data?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

export function useChatMessages(conversationId?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["chat", "messages", conversationId],
    queryFn: ({ pageParam }) => fetchMessages(conversationId!, (pageParam as number | undefined) || 1),
    enabled: enabled && Boolean(conversationId),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    getPreviousPageParam: (_firstPage, allPages) => allPages.length + 1,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useInvalidateChatMessages() {
  const queryClient = useQueryClient();
  return (conversationId?: string) => {
    if (!conversationId) return;
    queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
  };
}
