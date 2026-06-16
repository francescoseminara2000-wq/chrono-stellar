import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const RequireAdmin = () => {
    const { user, token } = useAuthStore();

    if (!token || !user || user.role !== 'ADMIN') {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
