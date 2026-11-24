import { useEffect, useState } from 'react';
import adminApi, { getErrorMessage, totalFrom } from '../../api/adminApi';

// Loads one page of a list endpoint. The result is tied to the request, so while a new
// request is running `loading` is true and old rows are never shown for the wrong filter.
export default function useServerList(path, params, reloadKey = 0) {
  const key = JSON.stringify([path, params, reloadKey]);
  const [state, setState] = useState({ key: '', items: [], total: 0, error: '' });

  useEffect(() => {
    let ignore = false;
    const [url, query] = JSON.parse(key);
    adminApi
      .get(url, { params: query })
      .then((res) => {
        if (!ignore) setState({ key, items: res.data, total: totalFrom(res, res.data.length), error: '' });
      })
      .catch((err) => {
        if (!ignore) setState({ key, items: [], total: 0, error: getErrorMessage(err, 'Could not load the list.') });
      });
    return () => {
      ignore = true;
    };
  }, [key]);

  return { items: state.items, total: state.total, error: state.error, loading: state.key !== key };
}
