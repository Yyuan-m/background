import { useState, useEffect, useCallback } from 'react';

/**
 * 全屏切换 Hook
 * 支持浏览器 Fullscreen API，兼容 ESC 退出
 */
const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 监听全屏变化（包括 ESC 退出）
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // 切换全屏
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // 浏览器不支持全屏时静默失败
      });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
};

export default useFullscreen;
