import React from 'react';

const BRAND_NAME = 'LUXURY CAR';
const BRAND_SLOGAN = '大圣玩车管理系统';
const COPYRIGHT = '© 2025 Luxury Car Rental Management System';

const LoginLeft = () => {
  return (
    <div className="login-left-panel">
      {/* 背景图 + 深蓝遮罩 */}
      <div className="login-left-bg">
        <div className="bg-overlay" />
        <div className="bg-light-bar" />
      </div>

      {/* 漂浮装饰光斑 */}
      <div className="login-left-decor" aria-hidden="true">
        <span className="float-orb orb-1" />
        <span className="float-orb orb-2" />
        <span className="float-orb orb-3" />
        <span className="float-ring ring-1" />
        <span className="float-ring ring-2" />
      </div>

      {/* 文字内容 - 绝对定位居中偏下 */}
      <div className="login-left-content">
        <h1 className="brand-title">
          {BRAND_NAME.split('').map((char, i) => (
            <span key={i} className="brand-char" style={{ '--char-i': i }}>{char === ' ' ? '\u00A0' : char}</span>
          ))}
        </h1>
        <p className="brand-slogan">{BRAND_SLOGAN}</p>
        <div className="copyright">
          {COPYRIGHT}
        </div>
      </div>
    </div>
  );
};

export default LoginLeft;
