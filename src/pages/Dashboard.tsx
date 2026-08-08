import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Admin and Staff Dashboards
  if (['admin', 'reception', 'housekeeping', 'kitchen', 'waiter'].includes(userData?.role || '')) {
    return <Navigate to="/admin" replace />;
  }

  // Guest Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-neutral-900 mb-8">My Dashboard</h1>
      <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm">
        <p className="text-neutral-600">Welcome back, {userData?.name || currentUser.email}.</p>
        {/* We will build out the guest history here later */}
      </div>
    </div>
  );
}
