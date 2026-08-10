import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Steps, Card, Result } from 'antd';
import { message } from '@/utils/antdStatic';
import { MailOutlined, LockOutlined, SafetyOutlined, CarOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { forgotPasswordVerifyApi, forgotPasswordResetApi } from '@/api/modules/auth';
import '@/pages/Login/Login.scss';

const ForgotPassword = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [form] = Form.useForm();

  const handleVerify = async (values) => {
    setLoading(true);
    try {
      const res = await forgotPasswordVerifyApi(values);
      setUsername(values.username);
      setResetToken(res?.resetToken || '');
      setStep(1);
    } catch (e) {
      message.error(e.message || '验证失败，请检查用户名和邮箱');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values) => {
    setLoading(true);
    try {
      await forgotPasswordResetApi({
        username,
        resetToken,
        newPassword: values.newPassword,
      });
      message.success('密码重置成功');
      setStep(2);
    } catch (e) {
      message.error(e.message || '重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="bg-circle bg-circle-1" />
          <div className="bg-circle bg-circle-2" />
          <div className="bg-line" />
        </div>
        <Card className="login-card" variant="borderless">
          <Result
            status="success"
            title="密码重置成功"
            subTitle="您可以使用新密码登录系统了"
            extra={[
              <Link to="/login" key="login">
                <Button type="primary" size="large">
                  前往登录
                </Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-circle bg-circle-1" />
        <div className="bg-circle bg-circle-2" />
        <div className="bg-line" />
      </div>

      <Card className="login-card" variant="borderless">
        <div className="login-header">
          <div className="login-logo">
            <CarOutlined style={{ fontSize: 36, color: 'var(--amount-color, #c9a96e)' }} />
          </div>
          <h2 className="login-title">LUXURY CAR</h2>
          <p className="login-subtitle">{step === 0 ? '找回密码' : '重置密码'}</p>
        </div>

        <Steps
          current={step}
          size="small"
          style={{ marginBottom: 32 }}
          items={[
            { title: '验证身份', icon: <MailOutlined /> },
            { title: '重置密码', icon: <LockOutlined /> },
          ]}
        />

        {step === 0 && (
          <Form form={form} onFinish={handleVerify} size="large" autoComplete="off">
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<MailOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入注册邮箱' },
                { type: 'email', message: '请输入正确的邮箱格式' },
              ]}
            >
              <Input prefix={<SafetyOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="请输入注册邮箱" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontSize: 16, fontWeight: 500 }}
              >
                验证身份
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 1 && (
          <Form onFinish={handleReset} size="large" autoComplete="off">
            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="新密码（至少6位）" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次密码输入不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-muted, #999)' }} />} placeholder="确认新密码" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontSize: 16, fontWeight: 500 }}
              >
                重置密码
              </Button>
            </Form.Item>
          </Form>
        )}

        <div className="login-footer">
          <Link to="/login" style={{ color: 'var(--text-muted, #999)', fontSize: 13 }}>
            <ArrowLeftOutlined /> 返回登录
          </Link>
        </div>
      </Card>
    </div>
  );
};

ForgotPassword.routeConfig = { path: '/forgot-password', guest: true };
export default ForgotPassword;
