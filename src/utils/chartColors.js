/**
 * 图表颜色工具
 *
 * 提供统一的图表配色与取色函数，保证任何情况下都返回有效颜色字符串，
 * 避免因数据缺失 color 字段导致 recharts 渲染成黑色。
 *
 * 用法：
 *   import { getChartColor, CHART_COLORS } from '@/utils/chartColors';
 *
 *   // 按索引取色（自动循环）
 *   <Cell fill={getChartColor(index)} />
 *
 *   // 优先用数据自带的 color，无效则兜底
 *   <Cell fill={getChartColor(index, entry.color)} />
 */

// recharts 官方示例配色方案
export const CHART_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d',
  '#a2d472', '#ffc658', '#ff8042', '#ff5252',
  '#d0ed57', '#a28cf0', '#56c2d6', '#4caf50',
];

// 终极兜底色（蓝紫），确保永远不是黑色
const FALLBACK_COLOR = '#8884d8';

/**
 * 校验颜色值是否有效（非空字符串、非 undefined/null）
 * 接受 hex / rgb / rgba / 颜色关键字
 */
const isValidColor = (color) => {
  if (color == null) return false;
  const str = String(color).trim();
  if (!str) return false;
  // 黑色或 'none' / 'transparent' 等无效填充视为无效，触发兜底
  if (str === 'none' || str === 'transparent') return false;
  return true;
};

/**
 * 获取图表颜色（多重兜底）
 * @param {number} index      - 数据索引，用于从默认配色数组循环取色
 * @param {string} [preferred] - 数据自带的颜色，优先使用；无效则回退到默认配色
 * @returns {string} 永远返回有效的颜色字符串
 */
export const getChartColor = (index, preferred) => {
  // 1. 优先用数据自带颜色
  if (isValidColor(preferred)) return preferred;

  // 2. 按索引从默认配色数组取色（循环）
  const safeIndex = Number.isFinite(index) && index >= 0 ? index : 0;
  const color = CHART_COLORS[safeIndex % CHART_COLORS.length];

  // 3. 数组取到无效值则用终极兜底
  return isValidColor(color) ? color : FALLBACK_COLOR;
};

export default getChartColor;
