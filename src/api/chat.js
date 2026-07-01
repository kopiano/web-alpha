import request from './request'

/**
 * 获取聊天用户列表和最近消息
 * GET /chat
 */
export function fetchChat(params) {
  return request.get('/chat', { params: params || {} })
}

/**
 * 发送聊天消息（持久化到数据库 + WebSocket 广播）
 * POST /chat
 */
export function sendChatMessage(msg) {
  return request.post('/chat', msg)
}


