import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import ProtectedRoute from './ProtectedRoute';

const AdminDashboardButton = ({ className = '' }) => {
  const { canAccessAdminDashboard } = useAuthStore();
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    // Navigate to admin dashboard within the same app
    navigate('/admin');
  };

  return (
    <ProtectedRoute feature="admin" requireAuth={true}>
      <button
        onClick={handleDashboardClick}
        className={`flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ${className}`}
        title="Admin Dashboard"
      >
        <Settings className="h-4 w-4" />
        <span>Admin Dashboard</span>
      </button>
    </ProtectedRoute>
  );
};

export default AdminDashboardButton;
