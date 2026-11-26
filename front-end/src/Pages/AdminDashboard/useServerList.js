import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminApi, { getErrorMessage, totalFrom } from '../../api/adminApi';
import { ADMIN_CACHE_TIME, ADMIN_GC_TIME, serverListKey } from './adminQueries';

export async function prefetchServerListPages(queryClient, path, params) {
  const pageSize = Number(params.limit || 20);
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error(`Invalid page size for ${path}.`);
  }

  const baseOffset = Number(params.offset || 0);
  let offset = baseOffset;

  while (true) {
    const pageParams = { ...params, limit: pageSize, offset };
    const queryKey = serverListKey(path, pageParams);
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: ({ signal }) => adminApi.get(path, { params: pageParams, signal }),
      staleTime: ADMIN_CACHE_TIME,
      gcTime: ADMIN_GC_TIME,
    });

    const response = queryClient.getQueryData(queryKey);
    if (!Array.isArray(response?.data) || response.data.length === 0) return;
    if (Number.isFinite(response.total) && offset + response.data.length >= response.total) return;
    if (!Number.isFinite(response.total) && response.data.length < pageSize) return;
    offset += pageSize;
  }
}

// Loads one page of a list endpoint. The result is tied to the request, so while a new
// request is running `loading` is true and old rows are never shown for the wrong filter.
export default function useServerList(path, params, reloadKey = 0) {
  const queryClient = useQueryClient();
  const previousReloadKey = useRef(reloadKey);
  const query = useQuery({
    queryKey: serverListKey(path, params),
    queryFn: ({ signal }) => adminApi.get(path, { params, signal }),
    staleTime: ADMIN_CACHE_TIME,
    gcTime: ADMIN_GC_TIME,
  });

  useEffect(() => {
    if (previousReloadKey.current === reloadKey) return;
    previousReloadKey.current = reloadKey;
    void queryClient.invalidateQueries({ queryKey: ['server-list', path] });
  }, [path, queryClient, reloadKey]);

  const items = Array.isArray(query.data?.data) ? query.data.data : [];
  return {
    items,
    total: totalFrom(query.data, items.length),
    error: query.isError ? getErrorMessage(query.error, 'Could not load the list.') : '',
    loading: query.isLoading,
  };
}
