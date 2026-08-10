import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '@/store/useAppStore';

/**
 * 全局菜单搜索 Hook
 * 输入关键词模糊匹配菜单名称，返回匹配结果列表
 */

// 扁平化菜单（递归提取所有叶子节点，用于搜索匹配）
const flattenMenu = (items) => {
  const result = [];
  for (const item of items) {
    result.push(item);
    if (item.children) result.push(...flattenMenu(item.children));
  }
  return result;
};

const useMenuSearch = () => {
  const navigate = useNavigate();
  const menuTree = useAppStore((s) => s.menuTree);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);

  // 扁平化所有菜单项用于搜索
  const flatMenuItems = useMemo(() => flattenMenu(menuTree), [menuTree]);

  // 模糊匹配搜索结果
  const results = useMemo(() => {
    if (!keyword.trim()) return [];
    const kw = keyword.toLowerCase();
    return flatMenuItems.filter(
      (item) => item.label.toLowerCase().includes(kw) || item.key.toLowerCase().includes(kw),
    );
  }, [keyword, flatMenuItems]);

  // 点击搜索结果跳转
  const handleSelect = useCallback(
    (item) => {
      navigate(item.key);
      setKeyword('');
      setOpen(false);
    },
    [navigate],
  );

  // 清空搜索
  const clearKeyword = useCallback(() => {
    setKeyword('');
    setOpen(false);
  }, []);

  return {
    keyword,
    setKeyword,
    results,
    open,
    setOpen,
    handleSelect,
    clearKeyword,
  };
};

export default useMenuSearch;
