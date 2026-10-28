import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '../store/authStore';

export const ProtectedRoute: React.FC = () => {
  const user = authStore.getUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route guard: only super_admin can access /pengaturan
  if (location.pathname === '/pengaturan' && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
