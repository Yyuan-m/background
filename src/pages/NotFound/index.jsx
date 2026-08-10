import { useState, useEffect } from 'react';
import { Result, Button } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import auth from '@/utils/auth';
import useAuthStore from '@/store/useAuthStore';
import { clearCache } from '@/api/request';
import { t } from '@/i18n';

const COUNTDOWN = 5;

const NotFound = () => {
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
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
    }}>
      <Result
        icon={<FileSearchOutlined style={{ color: '#faad14', fontSize: 80 }} />}
        status="404"
        title="404"
        subTitle={t('error.pageNotFoundDesc')}
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

NotFound.routeConfig = { path: '/404', standalone: true };
export default NotFound;
