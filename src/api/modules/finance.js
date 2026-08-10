/**
 * 财务统计 API
 */
import { get, post, put, del } from '@/api/request';

// ==================== 财务记录 ====================

/** 获取财务记录列表 */
export const getFinanceRecordsApi = (params) => get('/api/finance/records', params);

/** 获取财务记录详情 */
export const getFinanceDetailApi = (id) => get(`/api/finance/detail/${id}`);

/** 添加财务记录 */
export const addFinanceApi = (data) => post('/api/finance/add', data);

/** 更新财务记录 */
export const updateFinanceApi = (data) => put(`/api/finance/update/${data.id}`, data);

/** 删除财务记录 */
export const deleteFinanceApi = (id) => del(`/api/finance/delete/${id}`);

// ==================== 发票管理 ====================

/** 发票记录列表 */
export const getInvoiceListApi = (params) => get('/api/finance/invoice/list', params);

/** 发票记录详情 */
export const getInvoiceDetailApi = (id) => get(`/api/finance/invoice/${id}`);

/** 新增发票记录 */
export const addInvoiceApi = (data) => post('/api/finance/invoice/add', data, { successMsg: '新增成功' });

/** 更新发票记录 */
export const updateInvoiceApi = (data) => put(`/api/finance/invoice/update/${data.id}`, data, { successMsg: '编辑成功' });

/** 删除发票记录 */
export const deleteInvoiceApi = (id) => del(`/api/finance/invoice/${id}`, { successMsg: '删除成功' });

/** 切换发票状态（issued/pending） */
export const toggleInvoiceStatusApi = (id, status) =>
  put(`/api/finance/invoice/${id}/status`, { status }, { successMsg: '状态切换成功' });

// ==================== 对账管理 ====================

/** 对账记录列表 */
export const getReconciliationListApi = (params) => get('/api/finance/reconciliation/list', params);

/** 对账记录详情 */
export const getReconciliationDetailApi = (id) => get(`/api/finance/reconciliation/${id}`);

/** 新增对账记录 */
export const addReconciliationApi = (data) => post('/api/finance/reconciliation/add', data, { successMsg: '新增成功' });

/** 更新对账记录 */
export const updateReconciliationApi = (data) =>
  put(`/api/finance/reconciliation/update/${data.id}`, data, { successMsg: '编辑成功' });

/** 删除对账记录 */
export const deleteReconciliationApi = (id) => del(`/api/finance/reconciliation/${id}`, { successMsg: '删除成功' });

/** 切换对账状态（checked/pending） */
export const toggleReconciliationStatusApi = (id, status) =>
  put(`/api/finance/reconciliation/${id}/status`, { status }, { successMsg: '状态切换成功' });

// ==================== 成本统计 ====================

/** 成本记录列表 */
export const getCostListApi = (params) => get('/api/finance/cost/list', params);

/** 成本记录详情 */
export const getCostDetailApi = (id) => get(`/api/finance/cost/${id}`);

/** 新增成本记录 */
export const addCostApi = (data) => post('/api/finance/cost/add', data, { successMsg: '新增成功' });

/** 更新成本记录 */
export const updateCostApi = (data) => put(`/api/finance/cost/update/${data.id}`, data, { successMsg: '编辑成功' });

/** 删除成本记录 */
export const deleteCostApi = (id) => del(`/api/finance/cost/${id}`, { successMsg: '删除成功' });

// ==================== 仪表盘统计 ====================

/** 获取财务总览聚合数据（总营收/总成本/净利润） */
export const getFinanceOverviewApi = () => get('/api/finance/overview');

/** 获取利润分析趋势（按月聚合营收、成本、净利润） */
export const getProfitTrendApi = (months = 6) => get('/api/finance/profit-trend', { months });

/** 获取对账聚合数据（按月从 finance_record 自动聚合） */
export const getReconciliationAggregateApi = (months = 6) => get('/api/finance/reconciliation/aggregate', { months });

/** 获取车辆成本参考表（日租/日成本/利润率/累计租赁天数/累计成本） */
export const getVehicleCostReferenceApi = () => get('/api/finance/vehicle-cost-reference');

/** 获取成本构成饼图（车辆租赁/维保/手工成本占比） */
export const getCostCompositionApi = (period = 'total') => get('/api/finance/cost-composition', { period });

/** 获取每日收支（指定月份按日聚合收入和成本） */
export const getDailyBreakdownApi = (month) => get('/api/finance/daily-breakdown', { month });

/** 获取车型收支分析（按车辆类型分组聚合收入/成本/利润） */
export const getVehicleTypeBreakdownApi = () => get('/api/finance/vehicle-type-breakdown');

/** 获取仪表盘统计数据 */
export const getDashboardStatsApi = () => get('/api/statistics/dashboard');

/** 获取订单趋势数据 */
export const getOrderTrendApi = () => get('/api/statistics/order-trend');

/** 获取营收数据 */
export const getRevenueDataApi = () => get('/api/statistics/revenue-data');

/** 获取车辆类型占比 */
export const getVehicleTypeDataApi = () => get('/api/statistics/vehicle-type');

/** 获取车型热度排行 */
export const getVehicleHotDataApi = () => get('/api/statistics/vehicle-hot');

/** 获取客户复购率数据 */
export const getRepurchaseDataApi = () => get('/api/statistics/repurchase-data');

/** 获取高峰时段数据 */
export const getPeakHoursDataApi = () => get('/api/statistics/peak-hours');

/** 获取最新订单 */
export const getLatestOrdersApi = () => get('/api/statistics/latest-orders');

/** 获取最新客户 */
export const getLatestCustomersApi = () => get('/api/statistics/latest-customers');

// 别名导出
export const getFinanceListApi = getFinanceRecordsApi;
