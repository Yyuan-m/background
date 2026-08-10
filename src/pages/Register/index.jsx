import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card } from 'antd';
import { message } from '@/utils/antdStatic';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, CarOutlined } from '@ant-design/icons';
import useAuthStore from '@/store/useAuthStore';
import '@/pages/Login/Login.scss';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    const result = await register(values);
    setLoading(false);

    if (result.success) {
      message.success(result.message);
      navigate('/login');
    } else {
      /* request.js 已统一提示 */
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-circle bg-circle-1" />
        <div className="bg-circle bg-circle-2" />
        <div className="bg-line" />
      </div>

      <Card className="login-card" variant="borderless" style={{ width: 460 }}>
        <div className="login-header">
          <div className="login-logo">
            <CarOutlined style={{ fontSize: 36, color: 'var(--amount-color, #c9a96e)' }} />
          </div>
          <h2 className="login-title">管理员注册</h2>
          <p className="login-subtitle">创建您的后台管理账号</p>
        </div>

        <Form name="register" onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input prefix={<UserOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="姓名" />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="用户名" />
          </Form.Item>

          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="邮箱" />
          </Form.Item>

          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
            <Input prefix={<PhoneOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="手机号" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[{ required: true, message: '请确认密码' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="确认密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              注 册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--amount-color, #c9a96e)', fontSize: 13 }}>
              已有账号？返回登录
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

Register.routeConfig = { path: '/register', guest: true };
export default Register;
