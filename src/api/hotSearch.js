import request from './request'

// weibo
export function getHotSearch(date) {
  const params = date ? { date } : {}
  return request.get('/hot_search', { params })
}

// 36kr
export function get36krHot() {
  return request.get('/36kr')
}

// todo task
export function getTodos() {
  return request.get('/task')
}

export function createTodo(data) {
  return request.post('/task', data)
}

export function updateTodo(id, data) {
  return request.put(`/task/${id}`, data)
}

export function deleteTodo(id) {
  return request.delete(`/task/${id}`)
}


// music
export function getMusic() {
  return request.get('/music')
}
