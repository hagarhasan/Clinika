import { useQuery } from '@tanstack/react-query';
import { getAdminStats, getAdminActivity } from '../api/adminApi.js';
import { queryKeys } from './queryKeys.js';

const ADMIN_CACHE_TIME = 30 * 60 * 1000;
const ADMIN_GC_TIME = 30 * 60 * 1000;

/**
 * Shared admin overview stats query.
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: ({ signal }) => getAdminStats(signal),
    staleTime: ADMIN_CACHE_TIME,
    gcTime: ADMIN_GC_TIME,
  });
}

/**
 * Shared admin activity query.
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useAdminActivity(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.admin.activity, limit],
    queryFn: ({ signal }) => getAdminActivity({ limit, offset: 0 }, signal),
    staleTime: ADMIN_CACHE_TIME,
    gcTime: ADMIN_GC_TIME,
  });
}
