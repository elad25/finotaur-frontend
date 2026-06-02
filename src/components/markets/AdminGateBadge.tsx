// src/components/markets/AdminGateBadge.tsx
// Shown only to admin users on widgets that are gated for the public.
// Signals: "You see this because you're admin; regular users see a placeholder."

import React from 'react';
import { Lock } from 'lucide-react';

interface AdminGateBadgeProps {
  /** Optional label override. Defaults to "Hidden from public". */
  label?: string;
  /** Position relative to parent. Parent must be position:relative. */
  position?: 'top-right' | 'top-left';
}

const AdminGateBadge: React.FC<AdminGateBadgeProps> = ({
  label = 'Hidden from public',
  position = 'top-right',
}) => {
  const posClass = position === 'top-right' ? 'top-2 right-2' : 'top-2 left-2';
  return (
    <div
      className={`absolute ${posClass} z-10 flex items-center gap-1 px-2 py-1
                  rounded-md bg-amber-500/15 border border-amber-500/30
                  text-amber-400 text-[10px] font-medium pointer-events-none select-none`}
      title="Admin view — this widget is hidden for regular users"
    >
      <Lock className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

export default AdminGateBadge;
export { AdminGateBadge };
