import { Navigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';

/**
 * 访客守卫 - 已登录用户禁止访问登录/注册页
 */
const GuestGuard = ({ children }) => {
  const { isLoggedIn } = useAuthStore();

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default GuestGuard;
