import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../../store/authStore.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const { isAuthenticated, role, isLoading } = useAuthStore();

  // If session hydration is currently in progress, show subtle clean loader
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#eef8fe] text-[#1c2d5c] font-figtree">
        <div className="w-8 h-8 border-3 border-[#3e7d60] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-wide text-[#1c2d5c]/70">
          Loading...
        </p>
      </div>
    );
  }

  // If not authenticated, redirect to login preserving intent location
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If allowedRoles is specified and current role is not permitted
  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    if (role === 'CITIZEN') {
      return <Navigate to="/citizen" replace />;
    }
    if (role === 'GOVT') {
      return <Navigate to="/govt" replace />;
    }
    if (role === 'UNIVERSITY') {
      return <Navigate to="/university" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
