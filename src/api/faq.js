import request from './request'

export function fetchFaqs() {
  return request.get('/faq', { params: { _t: Date.now() } })
}

export function addFaq(data) {
  return request.post('/faq', data)
}
