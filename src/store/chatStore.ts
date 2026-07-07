import { useSyncExternalStore } from "react";

export interface ChatConversationSummary {
  conversationId: string;
  type: "private" | "group";
  title: string;
  avatar?: string;
  lastMessage: string;
  lastMessageType: number;
  lastMessageAt: string;
  unreadCount: number;
  members: { user_id: number; username: string; avatar?: string }[];
}

type ChatStoreState = {
  activeConversationId: string;
  conversationOrder: string[];
  conversations: Record<string, ChatConversationSummary>;
  unreadByConversation: Record<string, number>;
  typingByConversation: Record<string, boolean>;
};

type Listener = () => void;

const CACHE_KEY = "chat_conversations_cache_v1";

const state: ChatStoreState = {
  activeConversationId: "",
  conversationOrder: [],
  conversations: {},
  unreadByConversation: {},
  typingByConversation: {},
};

const listeners = new Set<Listener>();

function safeReadCache(): ChatConversationSummary[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteCache(items: ChatConversationSummary[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    // ignore cache failures
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function sortConversationIds(conversations: Record<string, ChatConversationSummary>) {
  return Object.values(conversations)
    .sort((a, b) => {
      return (b.lastMessageAt || "").localeCompare(a.lastMessageAt || "");
    })
    .map((item) => item.conversationId);
}

function mergeConversationItem(current: ChatConversationSummary | undefined, next: ChatConversationSummary) {
  if (!current) return next;
  return {
    ...current,
    ...next,
    members: next.members?.length ? next.members : current.members,
    unreadCount: next.unreadCount,
  };
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChatStoreSnapshot() {
  return state;
}

export function setActiveConversationId(id: string) {
  state.activeConversationId = id;
  emit();
}

export function hydrateFromServer(items: ChatConversationSummary[]) {
  const map: Record<string, ChatConversationSummary> = { ...state.conversations };
  for (const item of items) {
    map[item.conversationId] = mergeConversationItem(map[item.conversationId], item);
  }
  state.conversations = map;
  state.conversationOrder = sortConversationIds(map);
  state.unreadByConversation = {
    ...state.unreadByConversation,
    ...Object.fromEntries(items.map((item) => [item.conversationId, item.unreadCount])),
  };
  safeWriteCache(Object.values(map));
  emit();
}

export function patchConversation(id: string, patch: Partial<ChatConversationSummary>) {
  const current = state.conversations[id];
  if (!current) return;
  state.conversations = {
    ...state.conversations,
    [id]: { ...current, ...patch },
  };
  state.conversationOrder = sortConversationIds(state.conversations);
  if (patch.unreadCount !== undefined) {
    state.unreadByConversation = { ...state.unreadByConversation, [id]: patch.unreadCount };
  }
  emit();
}

export function setUnread(id: string, unreadCount: number) {
  state.unreadByConversation = { ...state.unreadByConversation, [id]: unreadCount };
  if (state.conversations[id]) {
    state.conversations = {
      ...state.conversations,
      [id]: { ...state.conversations[id], unreadCount },
    };
  }
  emit();
}

export function setTyping(id: string, typing: boolean) {
  state.typingByConversation = { ...state.typingByConversation, [id]: typing };
  emit();
}

export function useChatStore<T>(selector: (state: ChatStoreState) => T) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

const cachedConversations = safeReadCache();
if (cachedConversations.length) {
  hydrateFromServer(cachedConversations);
}
