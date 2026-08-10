import { useState, useEffect } from 'react';
import { Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import auth from '@/utils/auth';
import useAuthStore from '@/store/useAuthStore';
import { clearCache } from '@/api/request';
import { t } from '@/i18n';

const COUNTDOWN = 5;

const Forbidden = () => {
  const [countdown, setCountdown] = useState(COUNTDOWN);

  const goToLogin = () => {
    auth.clearAll();
    useAuthStore.getState().logout();
    clearCache();
    window.location.href = '/login';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          goToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    }}>
      <Result
        icon={<LockOutlined style={{ color: '#ef4444', fontSize: 80 }} />}
        status="403"
        title="403"
        subTitle={t('error.forbiddenDesc')}
        extra={
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#999', marginBottom: 16 }}>
              {countdown} 秒后自动跳转至登录页...
            </p>
            <Button
              type="primary"
              size="large"
              onClick={goToLogin}
            >
              {t('error.goLogin')}
            </Button>
          </div>
        }
      />
    </div>
  );
};

Forbidden.routeConfig = { path: '/403', standalone: true };
export default Forbidden;
