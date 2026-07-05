import request from './request'

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
