import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// ========================================
// useFetch Hook – Generic Data Fetching
// ========================================

export const useFetch = (url, options = {}) => {
    const {
        method = 'GET',
        params = {},
        body = null,
        immediate = true,
        dependencies = [],
        onSuccess = null,
        onError = null,
        transformData = null,
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);

    const isMounted = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchData = useCallback(
        async (overrideParams = {}, overrideBody = null) => {
            if (!url) return;

            setLoading(true);
            setError(null);

            try {
                const finalParams = { ...params, ...overrideParams };
                const finalBody = overrideBody !== null ? overrideBody : body;

                let response;
                switch (method.toUpperCase()) {
                    case 'GET':
                        response = await api.get(url, { params: finalParams });
                        break;
                    case 'POST':
                        response = await api.post(url, finalBody, { params: finalParams });
                        break;
                    case 'PUT':
                        response = await api.put(url, finalBody, { params: finalParams });
                        break;
                    case 'PATCH':
                        response = await api.patch(url, finalBody, { params: finalParams });
                        break;
                    case 'DELETE':
                        response = await api.delete(url, { params: finalParams });
                        break;
                    default:
                        throw new Error(`Unsupported method: ${method}`);
                }

                // Transform data if provided
                const result = transformData ? transformData(response) : response;

                if (isMounted.current) {
                    setData(result);
                    setStatus('success');
                    if (onSuccess) onSuccess(result);
                }
            } catch (err) {
                if (isMounted.current) {
                    const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
                    setError(errorMessage);
                    setStatus('error');
                    if (onError) onError(err);
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [url, method, JSON.stringify(params), body, transformData, onSuccess, onError]
    );

    // Auto-fetch on mount or dependency change
    useEffect(() => {
        if (immediate && url) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate, url, ...dependencies]);

    return {
        data,
        loading,
        error,
        status,
        fetchData,
        refetch: fetchData,
        reset: () => {
            setData(null);
            setError(null);
            setStatus(null);
            setLoading(false);
        },
    };
};

// ========================================
// useFetchList – Paginated List Fetching
// ========================================

export const useFetchList = (url, options = {}) => {
    const {
        pageSize = 10,
        initialPage = 1,
        filters = {},
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...restOptions
    } = options;

    const [page, setPage] = useState(initialPage);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);

    const params = {
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...filters,
    };

    const transformData = (response) => {
        const { data, pagination } = response.data || response;
        if (pagination) {
            setTotal(pagination.total || 0);
            setPages(pagination.pages || 0);
        }
        return data || [];
    };

    const { data, loading, error, fetchData, refetch } = useFetch(url, {
        ...restOptions,
        params,
        transformData,
    });

    const goToPage = (newPage) => {
        if (newPage >= 1 && newPage <= pages) {
            setPage(newPage);
        }
    };

    const nextPage = () => goToPage(page + 1);
    const prevPage = () => goToPage(page - 1);

    return {
        data,
        loading,
        error,
        page,
        total,
        pages,
        goToPage,
        nextPage,
        prevPage,
        refetch,
        setFilters: (newFilters) => {
            // Merge filters and reset to first page
            Object.assign(filters, newFilters);
            setPage(1);
        },
    };
};

// ========================================
// useMutation – Data Mutation (POST/PUT/DELETE)
// ========================================

export const useMutation = (url, options = {}) => {
    const { method = 'POST', onSuccess = null, onError = null } = options;

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async (payload = {}, config = {}) => {
            setLoading(true);
            setError(null);

            try {
                let response;
                switch (method.toUpperCase()) {
                    case 'POST':
                        response = await api.post(url, payload, config);
                        break;
                    case 'PUT':
                        response = await api.put(url, payload, config);
                        break;
                    case 'PATCH':
                        response = await api.patch(url, payload, config);
                        break;
                    case 'DELETE':
                        response = await api.delete(url, config);
                        break;
                    default:
                        throw new Error(`Unsupported mutation method: ${method}`);
                }

                setData(response);
                if (onSuccess) onSuccess(response);
                return response;
            } catch (err) {
                const errorMessage = err.response?.data?.message || err.message || 'Mutation failed';
                setError(errorMessage);
                if (onError) onError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [url, method, onSuccess, onError]
    );

    return { mutate, loading, data, error, reset: () => { setData(null); setError(null); } };
};

export default useFetch;