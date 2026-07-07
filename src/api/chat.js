import request from './request'

/** GET /api/v1/chat/conversations — 会话列表 */
export function getConversations() {
  return request.get('/chat/conversations')
}

/** GET /api/v1/chat/conversations/:id/messages — 获取会话消息 */
export function fetchConversationMessages(convId, config = {}) {
  return request.get(`/chat/conversations/${convId}/messages`, config)
}

/** POST /api/v1/chat/messages — 发送消息 (recipient_id/message_type/content) */
export function sendChatMessage(msg) {
  return request.post('/chat/messages', msg)
}

/** GET /api/v1/chat/groups — 获取团队群组信息 */
export function getTeamInfo() {
  return request.get('/chat/groups')
}

/** POST /api/v1/chat/conversations — 创建/获取私聊会话 */
export function createConversation(userId) {
  return request.post('/chat/conversations', { user_id: userId })
}

/** PUT /api/v1/chat/conversations/:id/read — 标记会话已读 */
export function markConversationRead(convId) {
  return request.put(`/chat/conversations/${convId}/read`)
}
