import request from './request'

export interface Transaction {
  id: number
  time: string           // 交易时间
  merchant: string       // 交易商家
  product: string        // 商品
  amount: number         // 金额
  paymentMethod: string  // 支付方式 e.g. 微信/支付宝/银行卡
  paymentApp: string     // 支付软件 e.g. 微信/支付宝/云闪付
  category: string       // 分类 e.g. 餐饮/交通/购物/娱乐
  note: string           // 备注
}

export interface ExpenseSummary {
  category: string
  amount: number
  percentage: number
  count: number
}

export interface MonthlySummary {
  month: string   // "01" - "12"
  total: number
  categories: { category: string; amount: number }[]
}

export function getTransactions(params?: { year?: string; month?: string; category?: string }) {
  return request.get('/transactions', { params })
}

export function getExpenseSummary(params?: { year?: string; month?: string }) {
  return request.get('/transactions/summary', { params })
}

export function getMonthlySummary(params?: { year?: string }) {
  return request.get('/transactions/monthly', { params })
}
