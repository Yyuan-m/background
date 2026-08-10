import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form } from 'antd';
import { message } from '@/utils/antdStatic';
import useAuthStore from '@/store/useAuthStore';
import auth from '@/utils/auth';

import LoginLeft from './LoginLeft';
import LoginForm from './LoginForm';
import './Login.scss';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  // 记住的账号密码
  const rememberData = auth.getRemember();

  // 从哪来的回哪去
  const from = location.state?.from || '/dashboard';

  // ==================== 表单提交 ====================
  const onFinish = async (values) => {
    setLoading(true);
    const result = await login({
      username: values.username,
      password: values.password,
    });
    setLoading(false);

    if (result.success) {
      // 记住密码
      if (values.remember) {
        auth.setRemember({ username: values.username, password: values.password });
      } else {
        auth.removeRemember();
      }
      message.success('登录成功');

      navigate(from, { replace: true });
    } else {
      /* request.js 已统一提示 */
    }
  };

  const onFinishFailed = () => {};

  return (
    <div className="login-page-v2">
      {/* 左侧展示区 */}
      <div className="login-left-wrapper">
        <LoginLeft />
      </div>

      {/* 右侧表单区 */}
      <div className="login-right-wrapper">
        <LoginForm
          form={form}
          loading={loading}
          rememberData={rememberData}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        />
      </div>
    </div>
  );
};

Login.routeConfig = { path: '/login', guest: true };
export default Login;
