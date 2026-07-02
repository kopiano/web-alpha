import request from './request'

/**
 * @typedef {Object} Transaction
 * @property {number} id
 * @property {number} [user_id]
 * @property {string} time - 交易时间
 * @property {'income'|'expense'|'neutral'} type - 收支类型
 * @property {string} merchant - 交易商家（交易对方）
 * @property {string} product - 商品说明
 * @property {number} amount - 金额
 * @property {string} payment_method - 支付方式
 * @property {string} payment_app - 支付软件
 * @property {string} category - 分类
 * @property {string} note - 备注
 */

/**
 * @typedef {Object} TransactionSummary
 * @property {number} income_count
 * @property {number} income_amount
 * @property {number} expense_count
 * @property {number} expense_amount
 * @property {number} neutral_count
 * @property {number} neutral_amount
 * @property {number} total_income
 * @property {number} total_expense
 */

/**
 * @typedef {Object} TransactionListResponse
 * @property {Transaction[]} list
 * @property {number} total
 * @property {TransactionSummary} summary
 */

/**
 * @typedef {Object} CategoryEntry
 * @property {string} category
 * @property {number} amount
 * @property {number} percentage
 * @property {number} count
 */

/**
 * @typedef {Object} MonthlyEntry
 * @property {string} month
 * @property {number} amount
 */

/** 获取交易记录（分页+筛选） */
export function getTransactions(params) {
  return request.get('/transactions', { params })
}

/** 按年月筛选交易记录（POST） */
export function filterTransactions(year, month) {
  return request.post('/transactions/filter', { year, month })
}

/** 导入 CSV 交易记录 */
export function importTransactions(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/transactions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

/** 获取收支汇总 */
export function getTransactionSummary(params) {
  return request.get('/transactions/summary', { params })
}

/** 获取有交易记录的月份列表 */
export function getTransactionMonths() {
  return request.get('/transactions/months')
}

/** 获取分类支出汇总 */
export function getExpenseCategories(params) {
  return request.get('/transactions/categories', { params })
}

/** 获取月度支出趋势 */
export function getMonthlyExpense(params) {
  return request.get('/transactions/monthly', { params })
}

/** 删除交易记录 */
export function deleteTransactions(params) {
  return request.delete('/transactions', { params })
}
