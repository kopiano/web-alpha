import request from './request'

export function fetchWeather() {
  return request.get('/weather')
}
