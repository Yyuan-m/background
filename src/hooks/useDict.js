import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDictDataByTypeApi } from '@/api/modules/dict';

// 复用 DictSelect 内部的模块级缓存
// 这里独立维护一份简单的缓存（避免循环依赖）
const cacheMap = new Map();

const loadDict = (dictType) => {
  if (!dictType) return Promise.resolve([]);
  if (cacheMap.has(dictType)) return cacheMap.get(dictType);
  const p = getDictDataByTypeApi(dictType)
    .then((res) => {
      const list = Array.isArray(res) ? res : (res?.list || []);
      return list.map((item) => ({
        label: item.dictLabel,
        value: item.dictValue,
        sortOrder: item.sortOrder,
        raw: item,
      }));
    })
    .catch((e) => {
      console.error('字典加载失败:', dictType, e);
      cacheMap.delete(dictType);
      return [];
    });
  cacheMap.set(dictType, p);
  return p;
};

/**
 * 字典数据 Hook
 *
 * 用法：
 *   const { options, map, loading } = useDict('order_status');
 *   // options: [{label, value}] 用于 Select options
 *   // map: { value -> {label, value, ...} } 用于状态映射/查找
 *
 * @param {string} dictType 字典类型编码
 * @returns {{options: Array, map: Object, loading: boolean, refresh: Function}}
 */
export const useDict = (dictType) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!dictType) {
      setList([]);
      return;
    }
    setLoading(true);
    loadDict(dictType).then((res) => {
      setList(res);
      setLoading(false);
    });
  }, [dictType]);

  useEffect(() => { load(); }, [load]);

  const options = useMemo(() => list.map(({ label, value }) => ({ label, value })), [list]);
  const map = useMemo(() => {
    const m = {};
    list.forEach((item) => { m[item.value] = item; });
    return m;
  }, [list]);

  return { options, map, loading, refresh: load };
};

export default useDict;
