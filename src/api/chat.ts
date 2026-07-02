import request from './request'

/**
 * 获取当前用户的会话列表（含最后一条消息、未读数）
 * GET /api/v1/chat/conversations
 */
export function fetchConversations() {
  return request.get('/chat/conversations')
}

/**
 * 获取/创建与指定用户的私聊会话
 * POST /api/v1/chat/conversations
 */
export function createConversation(userId: number) {
  return request.post('/chat/conversations', { user_id: userId })
}

/**
 * 获取会话消息列表
 * GET /api/v1/chat/conversations/:id/messages
 */
export function fetchConversationMessages(convId: number, params?: { limit?: number; offset?: number }) {
  return request.get(`/chat/conversations/${convId}/messages`, { params: params || {} })
}

/**
 * 发送聊天消息
 * POST /api/v1/chat/messages
 */
export function sendChatMessage(msg: {
  recipient_id: number
  message_type: number
  content: string
  file_name?: string
  file_url?: string
}) {
  return request.post('/chat/messages', msg)
}

/**
 * 撤回消息
 * PUT /api/v1/chat/messages/:id/recall
 */
export function recallMessage(msgId: number) {
  return request.put(`/chat/messages/${msgId}/recall`)
}
