// frontend/src/components/AdminRoute.jsx (new file)
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;

    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
    if (!isAdmin) {
        return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }

    return children;
};

export default AdminRoute;