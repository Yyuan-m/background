/**
 * 全局时间格式化工具
 *
 * 不管传入什么时间格式（字符串 / 时间戳 / Date / dayjs 对象 / null），
 * 都能安全输出指定格式的时间字符串，默认输出 YYYY/MM/DD。
 *
 * 用法：
 *   import { formatTime } from '@/utils/formatTime';
 *
 *   formatTime('2025-01-01 09:00:00')               // '2025/01/01'
 *   formatTime(1735689600000)                       // '2025/01/01'
 *   formatTime(new Date(), 'YYYY-MM-DD HH:mm:ss')   // '2025-01-01 09:00:00'
 *   formatTime(null)                                // '-'
 *   formatTime('invalid')                           // '-'
 *
 * 常用预设：
 *   formatTime(v, 'date')      // 'YYYY/MM/DD'           日期
 *   formatTime(v, 'datetime')  // 'YYYY/MM/DD HH:mm'     日期时间
 *   formatTime(v, 'full')      // 'YYYY/MM/DD HH:mm:ss'  完整时间
 *   formatTime(v, 'cn')        // 'YYYY年MM月DD日'        中文日期
 *   formatTime(v, 'cn-datetime') // 'YYYY年MM月DD日 HH:mm'
 */
import dayjs from 'dayjs';

// 预设格式
const PRESET = {
  date: 'YYYY/MM/DD',
  datetime: 'YYYY/MM/DD HH:mm',
  full: 'YYYY/MM/DD HH:mm:ss',
  cn: 'YYYY年MM月DD日',
  'cn-datetime': 'YYYY年MM月DD日 HH:mm',
  'cn-full': 'YYYY年MM月DD日 HH时mm分ss秒',
  iso: 'YYYY-MM-DD',
  'iso-datetime': 'YYYY-MM-DD HH:mm:ss',
};

// 默认空值占位
const DEFAULT_PLACEHOLDER = '-';

/**
 * 解析任意输入为 dayjs 对象，解析失败返回 null
 * @param {string|number|Date|dayjs.Dayjs|null|undefined} value
 * @returns {dayjs.Dayjs|null}
 */
function parse(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // 已经是 dayjs 对象
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }

  // Date 对象
  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }

  // 数字时间戳（秒或毫秒）
  if (typeof value === 'number') {
    // 小于 1e12 视为秒级时间戳
    const ts = value < 1e12 ? value * 1000 : value;
    const d = dayjs(ts);
    return d.isValid() ? d : null;
  }

  // 字符串：兼容各种格式
  if (typeof value === 'string') {
    const str = value.trim();
    if (!str) return null;

    // 数字字符串视为时间戳
    if (/^\d+$/.test(str)) {
      const num = Number(str);
      const ts = num < 1e12 ? num * 1000 : num;
      const d = dayjs(ts);
      return d.isValid() ? d : null;
    }

    // 替换中文日期中的 "年/月/日" 为标准分隔符以便 dayjs 解析
    const normalized = str
      .replace(/年/g, '-')
      .replace(/月/g, '-')
      .replace(/日/g, '');

    const d = dayjs(normalized);
    return d.isValid() ? d : null;
  }

  return null;
}

/**
 * 格式化时间
 * @param {string|number|Date|dayjs.Dayjs|null|undefined} value - 任意时间值
 * @param {string} [format='YYYY/MM/DD'] - 目标格式，可用预设 key 或自定义模板
 * @param {string} [placeholder='-'] - 解析失败时的占位符
 * @returns {string}
 */
export function formatTime(value, format = 'YYYY-MM-DD', placeholder = DEFAULT_PLACEHOLDER) {
  const d = parse(value);
  if (!d) return placeholder;

  // 支持预设 key
  const pattern = PRESET[format] || format;
  return d.format(pattern);
}

// 预设快捷方法
formatTime.date = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'date', placeholder);
formatTime.datetime = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'datetime', placeholder);
formatTime.full = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'full', placeholder);
formatTime.cn = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'cn', placeholder);
formatTime.cnDatetime = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'cn-datetime', placeholder);
formatTime.iso = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'iso', placeholder);
formatTime.isoDatetime = (value, placeholder = DEFAULT_PLACEHOLDER) => formatTime(value, 'iso-datetime', placeholder);

/**
 * 表格列 render 快捷方法：默认返回 YYYY/MM/DD
 * 用法：{ title: '创建时间', dataIndex: 'createdAt', render: formatTime.render }
 */
formatTime.render = (value) => formatTime(value);

/**
 * 表格列 render 快捷方法：日期+时间（YYYY/MM/DD HH:mm）
 */
formatTime.renderDatetime = (value) => formatTime.datetime(value);

/**
 * 表格列 render 快捷方法：完整时间（YYYY/MM/DD HH:mm:ss）
 */
formatTime.renderFull = (value) => formatTime.full(value);

export default formatTime;
