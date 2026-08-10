import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, CarOutlined } from '@ant-design/icons';

const LoginForm = ({
  form,
  loading,
  rememberData,
  onFinish,
  onFinishFailed,
}) => {
  const cardRef = useRef(null);

  // 鼠标跟随光斑 + 卡片 3D 微倾斜
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    // 不支持 hover 的触屏设备跳过交互
    if (window.matchMedia('(hover: none)').matches) return;

    let rafId = null;
    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // 光斑位置
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      // 倾斜角度（最大 5 度，保持克制）
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        card.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
        card.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
      });
    };
    const handleMouseLeave = () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--spot-opacity', '0');
    };
    const handleMouseEnter = () => {
      card.style.setProperty('--spot-opacity', '1');
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="login-right-card-wrap">
    <div className="login-right-card" ref={cardRef}>
      {/* 鼠标跟随光斑 */}
      <div className="card-spotlight" aria-hidden="true" />

      {/* Logo */}
      <div className="login-logo-icon">
        <CarOutlined />
      </div>

      {/* 标题 */}
      <h2 className="login-form-title">
        登录管理后台
      </h2>

      <Form
        form={form}
        name="login"
        initialValues={{
          username: rememberData?.username || '',
          password: rememberData?.password || '',
          remember: !!rememberData,
        }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        size="large"
        autoComplete="off"
      >
        {/* 用户名 */}
        <div className="form-item-anim" style={{ '--anim-i': 0 }}>
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined className="input-prefix-icon" />}
              placeholder="用户名"
              className="login-input"
            />
          </Form.Item>
        </div>

        {/* 密码 */}
        <div className="form-item-anim" style={{ '--anim-i': 1 }}>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-prefix-icon" />}
              placeholder="密码"
              className="login-input"
            />
          </Form.Item>
        </div>

        {/* 记住密码 + 忘记密码/注册 */}
        <div className="form-item-anim" style={{ '--anim-i': 2 }}>
          <Form.Item>
            <div className="login-extra">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住密码</Checkbox>
              </Form.Item>
              <div>
                <Link to="/forgot-password" className="login-forgot-link">
                  忘记密码
                </Link>
                <span className="login-link-sep">|</span>
                <Link to="/register" className="login-register-link">
                  注册账号
                </Link>
              </div>
            </div>
          </Form.Item>
        </div>

        {/* 登录按钮 */}
        <div className="form-item-anim" style={{ '--anim-i': 3 }}>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-submit-btn"
            >
              <span className="login-submit-text">登 录</span>
            </Button>
          </Form.Item>
        </div>
      </Form>

      {/* 底部链接 */}
      <div className="login-footer-links">
        <p>测试账号: admin / 123456</p>
      </div>
    </div>
    </div>
  );
};

export default LoginForm;
