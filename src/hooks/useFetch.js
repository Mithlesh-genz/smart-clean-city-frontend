import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// ─── Safe JSON stringify for cache keys ──────────────────────
function safeStringify(obj) {
    try {
        return JSON.stringify(obj);
    } catch (e) {
        // If circular, fallback to a simple representation
        if (e instanceof TypeError && e.message.includes('circular')) {
            return '[circular]';
        }
        return '[unserializable]';
    }
}

// ─── Filter non‑serializable values from params ──────────────
function filterParams(params) {
    if (!params || typeof params !== 'object') return {};
    const filtered = {};
    for (const [key, value] of Object.entries(params)) {
        // Skip functions, DOM elements, and React synthetic events
        if (
            typeof value === 'function' ||
            value instanceof HTMLElement ||
            value instanceof Event ||
            (typeof value === 'object' && value !== null && value.$$typeof) // React element
        ) {
            continue;
        }
        filtered[key] = value;
    }
    return filtered;
}

const cache = new Map();

export const useFetch = (url, options = {}) => {
    const {
        method = 'GET',
        body,
        immediate = true,
        params = {},
        onSuccess,
        onError,
        cacheTime = 60000,
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const abortControllerRef = useRef(null);
    const paramsRef = useRef(filterParams(params));
    const cacheKey = useRef('');

    // Update paramsRef when params changes
    useEffect(() => {
        paramsRef.current = filterParams(params);
    }, [params]);

    const fetchData = useCallback(
        async (overrideParams = {}) => {
            const finalParams = { ...paramsRef.current, ...filterParams(overrideParams) };
            const key = `${method}:${url}:${safeStringify(finalParams)}`;
            cacheKey.current = key;

            // Check cache
            if (cacheTime > 0 && cache.has(key) && (Date.now() - cache.get(key).timestamp) < cacheTime) {
                setData(cache.get(key).data);
                return;
            }

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            setLoading(true);
            setError(null);
            try {
                let res;
                const config = { params: finalParams, signal: controller.signal };
                switch (method) {
                    case 'GET':
                        res = await api.get(url, config);
                        break;
                    case 'POST':
                        res = await api.post(url, body, config);
                        break;
                    case 'PUT':
                        res = await api.put(url, body, config);
                        break;
                    case 'DELETE':
                        res = await api.delete(url, config);
                        break;
                    default:
                        throw new Error(`Unsupported method: ${method}`);
                }
                setData(res);
                if (cacheTime > 0) {
                    cache.set(key, { data: res, timestamp: Date.now() });
                }
                if (onSuccess) onSuccess(res);
            } catch (err) {
                // Ignore abort errors
                if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
                let msg = err.message;
                if (err.response) {
                    if (err.response.status === 429) msg = 'Too many requests – please wait.';
                    else if (err.response.status === 403) msg = 'You don’t have permission.';
                    else if (err.response.status === 401) msg = 'Please login again.';
                    else msg = err.response.data?.message || msg;
                }
                setError(msg);
                if (onError) onError(err);
            } finally {
                setLoading(false);
                abortControllerRef.current = null;
            }
        },
        [url, method, body, cacheTime, onSuccess, onError]
    );

    useEffect(() => {
        if (immediate && url) {
            fetchData();
        }
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate, url, fetchData]);

    return { data, loading, error, refetch: fetchData };
};

export const useMutation = (url, options = {}) => {
    const { method = 'POST', onSuccess, onError } = options;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async (payload, config = {}) => {
            setLoading(true);
            setError(null);
            try {
                const res = await api[method.toLowerCase()](url, payload, config);
                if (onSuccess) onSuccess(res);
                return res;
            } catch (err) {
                let msg = err.message;
                if (err.response) {
                    if (err.response.status === 429) msg = 'Too many requests – please wait.';
                    else if (err.response.status === 403) msg = 'Permission denied.';
                    else if (err.response.status === 401) msg = 'Please login again.';
                }
                setError(msg);
                if (onError) onError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [url, method, onSuccess, onError]
    );

    return { mutate, loading, error };
};