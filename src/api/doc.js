import request from './request'

export function fetchDocList() {
  return request.get('/docs', { params: { _: Date.now() } })
}

export function fetchDocDetail(id) {
  return request.get(`/docs/${id}`)
}

export function createDoc(data) {
  return request.post('/docs', data)
}

export function updateDoc(id, data) {
  return request.put(`/docs/${id}`, data)
}

export function deleteDoc(id) {
  return request.delete(`/docs/${id}`)
}
