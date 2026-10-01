import { useState } from 'react';
import { PAGE_SIZES } from '../components/ui/Pagination';

/**
 * Owns the `{current_page, last_page, per_page, total}` state shape every
 * paginated list page needs, plus the page/per-page change handlers — the
 * part of Activities.jsx's pagination block that's identical everywhere.
 * The fetch itself stays page-owned (each list has different filter params),
 * so this hook does NOT fetch; call `applyResponse` with the Laravel
 * paginator payload (`response.data`) once your own fetch resolves.
 *
 *   const { pagination, applyResponse, goToPage, setPerPage } = usePagination();
 *   const fetchItems = useCallback(async () => {
 *     const res = await api.getThings({ page: pagination.current_page, per_page: pagination.per_page, search });
 *     setItems(res.data.data);
 *     applyResponse(res.data);
 *   }, [pagination.current_page, pagination.per_page, search]);
 */
const usePagination = (defaultPerPage = PAGE_SIZES[0]) => {
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: defaultPerPage,
    total: 0,
  });

  const applyResponse = (data) => {
    setPagination({
      current_page: data?.current_page ?? 1,
      last_page: data?.last_page ?? 1,
      per_page: data?.per_page ?? defaultPerPage,
      total: data?.total ?? 0,
    });
  };

  const goToPage = (page) => {
    setPagination((prev) => (page >= 1 && page <= prev.last_page ? { ...prev, current_page: page } : prev));
  };

  const setPerPage = (perPage) => {
    setPagination((prev) => ({ ...prev, per_page: perPage, current_page: 1 }));
  };

  const resetToFirstPage = () => {
    setPagination((prev) => (prev.current_page === 1 ? prev : { ...prev, current_page: 1 }));
  };

  return { pagination, applyResponse, goToPage, setPerPage, resetToFirstPage };
};

export default usePagination;
