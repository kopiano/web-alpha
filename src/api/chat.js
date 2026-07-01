import request from './request'

/**
 * 获取聊天用户列表和最近消息
 * GET /chat
 * @param {number} [limit=200] - 消息数量限制
 * @returns {Promise}
 */
export function fetchChat(limit) {
  return request.get('/chat', {
    params: limit ? { limit } : undefined,
  })
}

/**
 * 发送聊天消息（持久化到数据库 + WebSocket 广播）
 * POST /chat
 * @param {Object} msg - 消息对象
 * @param {number} msg.user_id - 发送者用户ID
 * @param {string} msg.username - 发送者用户名
 * @param {string} msg.avatar - 发送者头像
 * @param {string} msg.type - 消息类型 text|emoji|image|file
 * @param {string} msg.content - 消息内容
 * @param {string} [msg.file_name] - 附件文件名
 * @param {string} [msg.file_url] - 附件URL
 * @returns {Promise}
 */
export function sendChatMessage(msg) {
  return request.post('/chat', msg)
}

