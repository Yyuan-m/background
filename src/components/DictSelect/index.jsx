import { useState, useEffect, useMemo, useCallback } from 'react';
import { Select } from 'antd';
import { getDictDataByTypeApi } from '@/api/modules/dict';

// 模块级缓存：dictType -> Promise<Array<{label, value, raw}>>
// 避免同一字典类型在多个组件中重复请求
const dictCache = new Map();

const fetchDict = (dictType) => {
  if (!dictType) return Promise.resolve([]);
  if (dictCache.has(dictType)) return dictCache.get(dictType);
  const p = getDictDataByTypeApi(dictType)
    .then((res) => {
      const list = Array.isArray(res) ? res : (res?.list || []);
      return list.map((item) => ({
        label: item.dictLabel,
        value: item.dictValue,
        raw: item,
      }));
    })
    .catch((e) => {
      console.error('字典加载失败:', dictType, e);
      dictCache.delete(dictType); // 失败时移除缓存，允许重试
      return [];
    });
  dictCache.set(dictType, p);
  return p;
};

/** 清除指定字典类型的缓存（字典数据更新后可调用） */
export const clearDictCache = (dictType) => {
  if (dictType) {
    dictCache.delete(dictType);
  } else {
    dictCache.clear();
  }
};

/**
 * 通用字典选择组件
 *
 * @param {string} dictType 字典类型编码（必填，如 vehicle_type / order_status）
 * @param {'multiple'|'tags'|undefined} mode 选择模式：undefined=单选、multiple=多选、tags=可创建新标签
 * @param {boolean} valueAsJson 多选/标签模式下，是否将值序列化为 JSON 字符串（默认 false，保持数组形式）
 * @param {string|number|string[]|undefined} value 受控值
 * @param {Function} onChange (value) => void
 * @param {boolean} valueIsNumber 是否把选项值转为数字（默认 false，保持字符串）
 * @param {boolean} showSearch 是否支持搜索（默认 true）
 * @param {boolean} allowClear 是否支持清除（默认 true）
 * @param {boolean} disabled 是否禁用
 * @param {string} placeholder 占位文本
 * @param {object} style 样式
 * @param {object} restProps 透传给 antd Select 的其他属性
 */
const DictSelect = ({
  dictType,
  mode,
  valueAsJson = false,
  valueIsNumber = false,
  value,
  onChange,
  showSearch = true,
  allowClear = true,
  disabled,
  placeholder,
  style,
  ...restProps
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const isMultiple = mode === 'multiple' || mode === 'tags';

  const load = useCallback(() => {
    setLoading(true);
    fetchDict(dictType).then((list) => {
      setOptions(list);
      setLoading(false);
    });
  }, [dictType]);

  useEffect(() => { load(); }, [load]);

  // 受控值转换：内部统一用 string[] 或 string
  const innerValue = useMemo(() => {
    if (value == null || value === '') return isMultiple ? [] : undefined;
    if (isMultiple) {
      let arr;
      if (Array.isArray(value)) arr = value;
      else if (typeof value === 'string') {
        // 尝试 JSON.parse（如果是 JSON 数组字符串）
        try {
          const parsed = JSON.parse(value);
          arr = Array.isArray(parsed) ? parsed : [value];
        } catch {
          arr = [value];
        }
      } else arr = [value];
      return valueIsNumber ? arr.map((v) => Number(v)) : arr.map((v) => String(v));
    }
    return valueIsNumber ? Number(value) : String(value);
  }, [value, isMultiple, valueIsNumber]);

  const handleChange = (val) => {
    if (!onChange) return;
    if (isMultiple) {
      const arr = valueIsNumber ? (val || []).map((v) => Number(v)) : (val || []);
      onChange(valueAsJson ? JSON.stringify(arr) : arr);
    } else {
      onChange(val);
    }
  };

  return (
    <Select
      mode={mode}
      value={innerValue}
      onChange={handleChange}
      options={options}
      loading={loading}
      showSearch={showSearch}
      allowClear={allowClear}
      disabled={disabled}
      placeholder={placeholder}
      style={{ minWidth: 120, ...style }}
      optionFilterProp="label"
      {...restProps}
    />
  );
};

export default DictSelect;
