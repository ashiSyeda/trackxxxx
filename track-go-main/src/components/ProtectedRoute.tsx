import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'admin' | 'user';
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { token, role } = useAppSelector((state) => state.auth);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/user'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
