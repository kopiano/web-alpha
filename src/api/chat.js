import request from './request'

/**
 * 获取聊天用户列表和最近消息（兼容旧接口）
 * GET /chat
 */
export function fetchChat(params) {
  return request.get('/chat', { params: params || {} })
}

/**
 * 发送聊天消息
 * POST /chat/messages
 * @param {Object} msg - { recipient_id, message_type, content, file_name?, file_url? }
 */
export function sendChatMessage(msg) {
  return request.post('/chat/messages', msg)
}

/**
 * 获取会话消息列表
 * GET /chat/conversations/:id/messages
 */
export function fetchConversationMessages(convId, params) {
  return request.get(`/chat/conversations/${convId}/messages`, { params: params || {} })
}

/**
 * 获取/创建与指定用户的会话
 * POST /chat/conversations
 */
export function createConversation(userId) {
  return request.post('/chat/conversations', { user_id: userId })
}

/**
 * 获取会话列表
 * GET /chat/conversations
 */
export function fetchConversations() {
  return request.get('/chat/conversations')
}
