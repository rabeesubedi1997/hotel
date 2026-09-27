import React from 'react';
import useAuthStore from '../stores/authStore';

const ProtectedRoute = ({ 
  children, 
  permission, 
  role, 
  feature, 
  scope = 'own',
  requireAuth = true,
  fallback = null 
}) => {
  const { user, isAuthenticated, hasPermission, hasRole, canAccess, isAdminLevel, canAccessAdminDashboard } = useAuthStore();

  // Check if user is authenticated (if required)
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  // Check specific role
  if (role && !hasRole(role)) {
    return fallback;
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Check feature access
  if (feature && !canAccess(feature, scope)) {
    return fallback;
  }

  // Special case for admin dashboard - check role hierarchy if permissions are empty
  if (feature === 'admin' && user?.permissions?.length === 0) {
    if (!isAdminLevel()) {
      return fallback;
    }
  }

  // All checks passed, render children
  return children;
};

export default ProtectedRoute;
