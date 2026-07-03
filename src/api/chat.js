import request from './request'

/**
 * 获取当前用户的联系人列表（含在线状态、最新消息）
 * GET /api/v1/chat/user_info
 */
export function getChatUserInfo() {
  return request.get('/chat/user_info')
}

/**
 * 获取团队群聊信息
 * GET /api/v1/chat/team
 */
export function getTeamInfo() {
  return request.get('/chat/team')
}

/**
 * 获取/创建与指定用户的私聊会话
 * POST /api/v1/chat/conversations
 */
export function createConversation(userId) {
  return request.post('/chat/conversations', { user_id: userId })
}

/**
 * 获取会话消息列表
 * GET /api/v1/chat/conversations/:id/messages
 */
export function fetchConversationMessages(convId, params) {
  return request.get(`/chat/conversations/${convId}/messages`, { params: params || {} })
}

/**
 * 发送聊天消息
 * POST /api/v1/chat/messages
 */
export function sendChatMessage(msg) {
  return request.post('/chat/messages', msg)
}

/**
 * 撤回消息
 * PUT /api/v1/chat/messages/:id/recall
 */
export function recallMessage(msgId) {
  return request.put(`/chat/messages/${msgId}/recall`)
}

/**
 * 标记会话已读
 * PUT /api/v1/chat/conversations/:id/read
 */
export function markConversationRead(convId) {
  return request.put(`/chat/conversations/${convId}/read`)
}
