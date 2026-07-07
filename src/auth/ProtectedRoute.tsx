import React from 'react';
import { useAuth } from './useAuth';
import { Shield, Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  onRedirectToLogin?: () => void;
  onRedirectToDashboard?: () => void;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  onRedirectToLogin,
  onRedirectToDashboard 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-12 text-slate-500 font-sans">
        <Loader className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <span className="text-sm font-medium">Verifying authorization clearance...</span>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    if (onRedirectToLogin) {
      onRedirectToLogin();
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-100 dark:border-red-900/30">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          Please sign in to access the IIT BHU Smart Room Booking systems.
        </p>
        <button
          onClick={onRedirectToLogin}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors duration-150"
        >
          Sign In to Booking Portal
        </button>
      </div>
    );
  }

  // Admin access required but user is not admin
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center font-sans">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center text-amber-500 mb-4 border border-amber-100 dark:border-amber-900/30">
          <Shield className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Administrative Clearance Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          Your current profile is registered as <strong className="text-slate-700 dark:text-slate-300 capitalize">{user.role}</strong>. You do not have permissions to access the platform administrative center.
        </p>
        <button
          onClick={onRedirectToDashboard}
          className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-lg shadow-sm transition-colors duration-150"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Good to go
  return <>{children}</>;
}
