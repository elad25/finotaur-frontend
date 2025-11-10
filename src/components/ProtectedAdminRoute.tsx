// src/components/ProtectedAdminRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AlertCircle } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedAdminRoute({ 
  children, 
  requireSuperAdmin = false 
}: ProtectedAdminRouteProps) {
  const { isAdmin, isSuperAdmin, isLoading, error } = useAdminAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  // Check permissions
  const hasAccess = requireSuperAdmin ? isSuperAdmin : isAdmin;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111111] border border-red-500/20 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            {requireSuperAdmin 
              ? 'This area requires super admin privileges.'
              : 'This area is restricted to administrators only.'}
          </p>
          {error && (
            <p className="text-sm text-red-400 mb-4">
              Error: {error}
            </p>
          )}
          <button
            onClick={() => window.location.href = '/app/journal/overview'}
            className="px-6 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#E5C158] transition-colors"
          >
            Return to Journal
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}