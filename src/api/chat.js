import request from './request'

async function unwrapChatResponse(promise) {
  const res = await promise
  if (res?.data?.code !== 200) {
    const message = res?.data?.message || '请求失败'
    const err = new Error(message)
    err.response = res
    throw err
  }
  return res
}

// /** GET /api/v1/chat/conversations — 联系人列表 */
export function getConversations() {
  return unwrapChatResponse(request.get('/chat/conversations'))
}

/** GET /api/v1/chat/conversations/:id/messages — 获取消息历史记录 */
export function fetchConversationMessages(convId, config = {}) {
  return unwrapChatResponse(request.get(`/chat/conversations/${convId}/messages`, config))
}

/** POST /api/v1/chat/messages — 发送消息
 * private: { chat_type: "private", receiver_id, message_type, content }
 * group:   { chat_type: "group", group_id, message_type, content }
 */
export function sendChatMessage(msg) {
  return unwrapChatResponse(request.post('/chat/messages', msg))
}

/** GET /api/v1/chat/groups — 获取团队群组信息 */
// export function getTeamInfo() {
//   return unwrapChatResponse(request.get('/chat/groups'))
// }

/** POST /api/v1/chat/conversations — 创建/获取私聊会话 */
export function createConversation(userId) {
  return unwrapChatResponse(request.post('/chat/conversations', {
    user_id: userId,
    receiver_id: userId,
    recipient_id: userId,
  }))
}

/** PUT /api/v1/chat/conversations/:id/read — 标记会话已读 */
export function markConversationRead(convId) {
  return unwrapChatResponse(request.put(`/chat/conversations/${convId}/read`))
}
