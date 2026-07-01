import request from './request'

export function fetchFaqs() {
  return request.get('/faq')
}

export function addFaq(data) {
  return request.post('/faq', data)
}
