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
  readAtByConversation: Record<string, number>;
};

type Listener = () => void;

const CACHE_KEY = "chat_conversations_cache_v2";

const state: ChatStoreState = {
  activeConversationId: "",
  conversationOrder: [],
  conversations: {},
  unreadByConversation: {},
  typingByConversation: {},
  readAtByConversation: {},
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
  const now = Date.now();
  const map: Record<string, ChatConversationSummary> = { ...state.conversations };
  for (const item of items) {
    const readAt = state.readAtByConversation[item.conversationId] || 0;
    const current = map[item.conversationId];
    const next = mergeConversationItem(current, item);
    map[item.conversationId] = readAt && now - readAt < 5000 && current
      ? { ...next, unreadCount: current.unreadCount }
      : next;
  }
  state.conversations = map;
  state.conversationOrder = sortConversationIds(map);
  state.unreadByConversation = {
    ...state.unreadByConversation,
    ...Object.fromEntries(items.map((item) => {
      const readAt = state.readAtByConversation[item.conversationId] || 0;
      const preserveLocalRead = readAt && now - readAt < 5000 && state.conversations[item.conversationId];
      return [item.conversationId, preserveLocalRead ? state.conversations[item.conversationId].unreadCount : item.unreadCount];
    })),
  };
  safeWriteCache(Object.values(map));
  emit();
}

export function upsertConversation(item: ChatConversationSummary) {
  const current = state.conversations[item.conversationId];
  const merged = current
    ? {
        ...current,
        ...item,
        title: item.title || current.title,
        avatar: item.avatar || current.avatar,
        lastMessage: item.lastMessage || current.lastMessage,
        lastMessageAt: item.lastMessageAt || current.lastMessageAt,
        members: item.members?.length ? item.members : current.members,
      }
    : item;
  state.conversations = {
    ...state.conversations,
    [item.conversationId]: merged,
  };
  state.conversationOrder = sortConversationIds(state.conversations);
  state.unreadByConversation = {
    ...state.unreadByConversation,
    [item.conversationId]: state.conversations[item.conversationId].unreadCount,
  };
  safeWriteCache(Object.values(state.conversations));
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
  safeWriteCache(Object.values(state.conversations));
  emit();
}

export function incrementUnread(id: string, amount = 1) {
  if (!id || amount <= 0) return;
  const current = state.conversations[id]?.unreadCount ?? state.unreadByConversation[id] ?? 0;
  const next = current + amount;
  state.unreadByConversation = { ...state.unreadByConversation, [id]: next };
  if (state.conversations[id]) {
    state.conversations = {
      ...state.conversations,
      [id]: { ...state.conversations[id], unreadCount: next },
    };
    state.conversationOrder = sortConversationIds(state.conversations);
    safeWriteCache(Object.values(state.conversations));
  }
  emit();
}

export function setUnread(id: string, unreadCount: number) {
  state.readAtByConversation = { ...state.readAtByConversation, [id]: Date.now() };
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

export function clearChatStore() {
  state.activeConversationId = "";
  state.conversationOrder = [];
  state.conversations = {};
  state.unreadByConversation = {};
  state.typingByConversation = {};
  state.readAtByConversation = {};
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore cache failures
  }
  emit();
}

export function useChatStore<T>(selector: (state: ChatStoreState) => T) {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

const cachedConversations = safeReadCache();
if (cachedConversations.length) {
  hydrateFromServer(cachedConversations);
}
