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
