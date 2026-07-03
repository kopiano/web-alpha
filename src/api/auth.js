import request from './request'

export function login(data) {
  return request.post('/login', data)
}

export function register(data) {
  return request.post('/register', data)
}

export function getMe() {
  return request.get('/me')
}

export function logout() {
  return request.post('/logout')
}

export function updateSettings(formData) {
  return request.post('/setting_user', formData)
}
