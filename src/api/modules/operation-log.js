/**
 * 操作日志 API
 */
import request, { get } from '@/api/request';
import { message } from '@/utils/antdStatic';

/** 获取操作日志列表（分页） */
export const getOperationLogsApi = (params) =>
  get('/api/operation-log/list', params);

/** 获取操作日志详情 */
export const getOperationLogDetailApi = (id) =>
  get(`/api/operation-log/${id}`);

/**
 * 导出操作日志（Excel / PDF / Markdown）
 * @param {Object} params
 * @param {string} params.format       - 导出格式：excel | pdf | markdown
 * @param {string} [params.ids]        - 选中的日志 ID 列表（逗号分隔），不传则导出全部
 * @param {string} [params.module]     - 模块筛选（仅 ids 为空时生效）
 * @param {string} [params.action]     - 操作类型筛选
 * @param {string} [params.operator]   - 操作人筛选
 * @param {number} [params.status]     - 状态筛选
 * @returns {Promise<boolean>} 是否导出成功
 */
export const exportOperationLogsApi = (params) => {
  const { fileName, ...query } = params;
  return request
    .get('/api/operation-log/export', {
      params: query,
      responseType: 'blob',
      // 关闭请求去重（导出可能多次触发）
      deduplicate: false,
      // 关闭拦截器自动错误提示，由本函数统一处理
      showError: false,
    })
    .then(async (blob) => {
      // 后端异常时会返回 JSON 错误信息（Content-Type: application/json），
      // 此时 blob 是 JSON 文本而非真正的文件流，需要解析后提示错误
      if (blob && blob.type && blob.type.includes('application/json')) {
        const errText = await blob.text();
        try {
          const errJson = JSON.parse(errText);
          message.error(errJson?.msg || errJson?.message || '导出失败');
        } catch {
          message.error('导出失败');
        }
        return false;
      }
      // 正常文件流：触发浏览器下载
      const name = fileName || buildDefaultFileName(query.format);
      triggerBlobDownload(blob, name);
      message.success('导出成功');
      return true;
    })
    .catch((err) => {
      message.error(err?.message || '导出失败，请稍后重试');
      return false;
    });
};

/** 根据格式构造默认文件名 */
const buildDefaultFileName = (format) => {
  const ext = format === 'pdf' ? 'pdf' : format === 'markdown' || format === 'md' ? 'md' : 'xlsx';
  return `操作日志_${new Date().toISOString().slice(0, 10)}.${ext}`;
};

/** 通用 blob 下载 */
const triggerBlobDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 别名
export const getOperationLogListApi = getOperationLogsApi;
