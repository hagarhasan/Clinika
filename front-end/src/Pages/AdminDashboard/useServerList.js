import { useQuery } from '@tanstack/react-query';
import adminApi, { getErrorMessage, totalFrom } from '../../api/adminApi';

// Loads one page of a list endpoint. The result is tied to the request, so while a new
// request is running `loading` is true and old rows are never shown for the wrong filter.
export default function useServerList(path, params, reloadKey = 0) {
  const query = useQuery({
    queryKey: ['server-list', path, params, reloadKey],
    queryFn: ({ signal }) => adminApi.get(path, { params, signal }),
  });
  const items = Array.isArray(query.data?.data) ? query.data.data : [];
  return {
    items,
    total: totalFrom(query.data, items.length),
    error: query.isError ? getErrorMessage(query.error, 'Could not load the list.') : '',
    loading: query.isLoading,
  };
}
