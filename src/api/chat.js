import request from './request'

/** GET /api/v1/chat/user_info — 联系人列表 + 团队信息 */
export function getChatUserInfo() {
  return request.get('/chat/user_info')
}

/** GET /api/v1/chat/:id/messages — 获取会话消息 */
export function fetchConversationMessages(convId, config = {}) {
  return request.get(`/chat/${convId}/messages`, config)
}

/** POST /api/v1/chat/messages — 发送消息 (recipient_id/message_type/content) */
export function sendChatMessage(msg) {
  return request.post('/chat/messages', msg)
}

/** GET /api/v1/chat/team — 获取团队群组信息 */
export function getTeamInfo() {
  return request.get('/chat/team')
}

/** POST /api/v1/chat/conversations — 创建/获取私聊会话 */
export function createConversation(userId) {
  return request.post('/chat/conversations', { user_id: userId })
}

/** PUT /api/v1/chat/:id/read — 标记会话已读 */
export function markConversationRead(convId) {
  return request.put(`/chat/${convId}/read`)
}
