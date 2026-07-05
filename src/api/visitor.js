import request from "./request"

export function getVisitors(params = {}) {
  return request.get("/visitor", { params })
}
export function getVisitorDaily() {
  return request.get("/visitor/daily")
}

export function getVisitorPvUv() {
  return request.get("/visitor/pv_uv")
}

export function recordVisit(data = {}) {
  return request.post("/visitor/visit", data)
}

export function sendVisitHeartbeat(data = {}) {
  return request.post("/visitor/heartbeat", data)
}
