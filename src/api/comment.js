import request from './request'

export function fetchComments() {
  return request.get('/comment')
}

export function createComment(data) {
  return request.post('/comment', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export function likeComment(id) {
  return request.put(`/comment/${id}/like`, null, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export function unlikeComment(id) {
  return request.delete(`/comment/${id}/like`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
