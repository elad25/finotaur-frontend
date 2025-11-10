// ✅ צור קובץ חדש
import { useQuery } from '@tanstack/react-query';
import { 
  getAdminStats, 
  getAllUsers, 
  getUserById,
  adminQueryKeys 
} from '@/services/adminService';

export function useAdminStats() {
  return useQuery({
    queryKey: adminQueryKeys.stats(),
    queryFn: getAdminStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAdminUsers(filters, pagination) {
  return useQuery({
    queryKey: adminQueryKeys.users(filters, pagination),
    queryFn: () => getAllUsers(filters, pagination),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev, // Keep old data while loading
  });
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: adminQueryKeys.userDetail(userId),
    queryFn: () => getUserById(userId),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });
}