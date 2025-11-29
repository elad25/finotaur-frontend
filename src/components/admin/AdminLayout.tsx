// src/components/admin/AdminLayout.tsx
// ============================================
// Admin Layout Wrapper - WITHOUT TABS
// Navigation moved to Sidebar ✨
// ============================================

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showBackButton?: boolean;
}

export default function AdminLayout({ 
  children, 
  title, 
  description,
  showBackButton = false 
}: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header - Without Tabs */}
      <div className="border-b border-gray-800 bg-[#0A0A0A] sticky top-0 z-10">
        <div className="px-8 py-6">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          {/* Title with Admin Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{title}</h1>
              <p className="text-gray-400">{description}</p>
            </div>
          </div>
        </div>
        
        {/* 🚫 TABS REMOVED - Now in Sidebar */}
      </div>

      {/* Content */}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}