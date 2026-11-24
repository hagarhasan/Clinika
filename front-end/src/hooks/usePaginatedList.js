import { useEffect, useMemo, useState } from 'react';

export function usePaginatedList(fetchPage, options = {}) {
  const { initialPage = 1, pageSize = 10, search = '', filters = {}, sort = '' } = options;
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const params = useMemo(() => ({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    ...(search ? { search } : {}),
    ...filters,
    ...(sort ? { sort } : {}),
  }), [page, pageSize, search, filters, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchPage(params, controller.signal)
      .then((response) => {
        setData(Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []));
        setTotal(Number.isFinite(response?.total) ? response.total : (Array.isArray(response) ? response.length : 0));
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(err?.message || 'Failed to load data.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchPage, params, reloadKey]);

  return { data, total, page, setPage, pageSize, loading, error, reload: () => setReloadKey((key) => key + 1) };
}
