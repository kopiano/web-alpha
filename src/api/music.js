import request from './request'

export function getMusic() {
  return request.get('/music')
}
