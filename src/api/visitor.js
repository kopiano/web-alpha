import request from "./request"

export function recordVisit(data = {}) {
  return request.post("/visit", data)
}

export function sendVisitHeartbeat(data = {}) {
  return request.post("/visit/heartbeat", data)
}

export function getVisitorStats(params = {}) {
  return request.get("/visitor", { params })
}

export async function getVisitors(params = {}) {
  const paths = ["/visitor/list", "/visitor", "/visitors"]
  let lastError

  for (const path of paths) {
    try {
      return await request.get(path, { params })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export function getVisitorDaily() {
  return request.get("/visitor_daily")
}

export function getVisitorPvUv() {
  return request.get("/visitor_pv_uv")
}
