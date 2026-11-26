import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminApi, { getErrorMessage } from '../../api/adminApi';

export const ADMIN_CACHE_TIME = 30 * 60 * 1000;
export const ADMIN_GC_TIME = 30 * 60 * 1000;

export const adminRequestKey = (path, params = {}) => ['admin-request', path, params];
export const adminAllListKey = (path, params = {}) => ['admin-all-list', path, params];
export const serverListKey = (path, params = {}) => ['server-list', path, params];

export function adminAllListQueryOptions(path, params = {}) {
  return {
    queryKey: adminAllListKey(path, params),
    queryFn: ({ signal }) => fetchAllAdminRows(path, params, signal),
    staleTime: ADMIN_CACHE_TIME,
    gcTime: ADMIN_GC_TIME,
  };
}

export function useAdminRequest(path, params = {}, reloadKey = 0) {
  const queryClient = useQueryClient();
  const previousReloadKey = useRef(reloadKey);
  const query = useQuery({
    queryKey: adminRequestKey(path, params),
    queryFn: ({ signal }) => adminApi.get(path, { params, signal }),
    staleTime: ADMIN_CACHE_TIME,
    gcTime: ADMIN_GC_TIME,
  });

  useEffect(() => {
    if (previousReloadKey.current === reloadKey) return;
    previousReloadKey.current = reloadKey;
    void queryClient.invalidateQueries({ queryKey: ['admin-request', path] });
  }, [path, queryClient, reloadKey]);

  return query;
}

export async function fetchAllAdminRows(path, params = {}, signal) {
  const pageSize = Number(params.limit || 100);
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error(`Invalid page size for ${path}.`);
  }

  const baseOffset = Number(params.offset || 0);
  const rows = [];
  let offset = baseOffset;

  while (true) {
    const response = await adminApi.get(path, {
      params: { ...params, limit: pageSize, offset },
      signal,
    });
    if (!Array.isArray(response.data)) {
      throw new Error(`Expected a list response from ${path}.`);
    }

    rows.push(...response.data);
    if (response.data.length === 0) break;
    if (Number.isFinite(response.total) && offset + response.data.length >= response.total) break;
    if (!Number.isFinite(response.total) && response.data.length < pageSize) break;
    offset += pageSize;
  }

  return { data: rows, total: rows.length };
}

export function useAdminAllList(path, params = {}, reloadKey = 0) {
  const queryClient = useQueryClient();
  const previousReloadKey = useRef(reloadKey);
  const query = useQuery(adminAllListQueryOptions(path, params));

  useEffect(() => {
    if (previousReloadKey.current === reloadKey) return;
    previousReloadKey.current = reloadKey;
    void queryClient.invalidateQueries({ queryKey: ['admin-all-list', path] });
  }, [path, queryClient, reloadKey]);

  const items = Array.isArray(query.data?.data) ? query.data.data : [];
  return {
    items,
    total: query.data?.total ?? items.length,
    loading: query.isLoading,
    error: query.isError ? getErrorMessage(query.error, 'Could not load the list.') : '',
  };
}

export function prefetchAdminRequest(queryClient, path, params = {}) {
  return queryClient.prefetchQuery({
    queryKey: adminRequestKey(path, params),
    queryFn: ({ signal }) => adminApi.get(path, { params, signal }),
    staleTime: ADMIN_CACHE_TIME,
    gcTime: ADMIN_GC_TIME,
  });
}

export function prefetchAdminAllList(queryClient, path, params = {}) {
  return queryClient.prefetchQuery(adminAllListQueryOptions(path, params));
}
