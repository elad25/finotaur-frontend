import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import WarZoneLanding from './WarZoneLanding';

// Lazy import for admin component - CORRECT PATH based on App.tsx
const NewsletterSub = lazy(() => import('@/pages/app/journal/admin/NewsletterSub'));

/**
 * ⚔️ WAR ZONE PAGE
 * 
 * This page shows different content based on user role:
 * - Regular users: Landing page to subscribe to newsletter
 * - Admin users: Full newsletter management panel (NewsletterSub)
 * 
 * Route: /app/all-markets/warzone
 */
export default function WarZonePage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin by querying the database directly
  useEffect(() => {
    async function checkAdmin() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.role === 'admin' || data?.role === 'super_admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, [user?.id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // 🔐 Admin sees the full newsletter management
  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
            <p className="text-sm text-gray-500">Loading admin panel...</p>
          </div>
        </div>
      }>
        <NewsletterSub />
      </Suspense>
    );
  }

  // 👤 Regular users see the landing page
  return <WarZoneLanding />;
}