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
 * 约定：
 * - chat_type 决定消息类型，只能是 "private" 或 "group"
 * - conversation_id 只用于定位/缓存会话，不用于判定消息类型
 * private: { chat_type: "private", receiver_id, recipient_id, conversation_id?, message_type, content, file_name?, file_url? }
 * group:   { chat_type: "group", group_id, conversation_id?, message_type, content, file_name?, file_url? }
 */
export function sendChatMessage(msg) {
  return unwrapChatResponse(request.post('/chat/messages', msg))
}

/** POST /api/v1/chat/messages — 发送消息（multipart/form-data） */
export function sendChatMessageForm(formData) {
  return unwrapChatResponse(request.post('/chat/messages', formData))
}


/** GET /api/v1/chat/groups — 访客群聊联系人列表 */
export function getVisitorGroups() {
  return unwrapChatResponse(request.get('/chat/groups'))
}

/** GET /api/v1/groups/:id/messages — 访客群聊消息 */
export function fetchGroupMessages(convId, config = {}) {
  return unwrapChatResponse(request.get(`/chat/groups/${convId}/messages`, config))
}

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
