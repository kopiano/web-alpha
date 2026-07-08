import request from './request'

export function getStockQuote(symbol = "SPCX", range = "5d") {
  return request.get("/stocks", { params: { symbol, range } })
}
