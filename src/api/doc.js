import request from './request'

export function fetchDocList() {
  return request.get('/doc/list')
}

export function saveDoc(data) {
  return request.post('/doc/save', data)
}
