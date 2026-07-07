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

async function fetchMessages(conversationId: string, beforeId?: number) {
  const res = await request.get(`/chat/conversations/${conversationId}/messages`, {
    params: {
      limit: 30,
      ...(beforeId ? { before_id: beforeId } : {}),
    },
  });
  return res.data?.data?.messages ?? [];
}

export function useChatMessages(conversationId?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["chat", "messages", conversationId],
    queryFn: ({ pageParam }) => fetchMessages(conversationId!, pageParam as number | undefined),
    enabled: enabled && Boolean(conversationId),
    initialPageParam: undefined as number | undefined,
    getPreviousPageParam: (firstPage) => firstPage?.[0]?.id ? firstPage[0].id : undefined,
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
