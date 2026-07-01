import request from './request'

/**
 * 获取时间轴文档列表
 * @param {Object} params - 可选查询参数
 * @param {string} params.year  - 按年份过滤，如 "2026"
 * @param {string} params.month - 按月份过滤，如 "06"
 * @param {string} params.tag   - 按标签过滤
 * @returns {Promise} GET /timeline
 */
export function getTimeline(params = {}) {
  return request.get('/timeline', { params })
}
