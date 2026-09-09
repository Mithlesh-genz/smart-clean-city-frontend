// frontend/src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// ─── Axios Instance ─────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: false, // set to true if you use cookies for auth
});

// ─── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-Id'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ──────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const responseData = response.data;

    // If response has `success` field and it's false, treat as error
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      if (responseData.success === false) {
        const errorMessage = responseData.message || responseData.error?.message || 'Request failed';
        const error = new Error(errorMessage);
        error.response = { status: response.status, data: responseData };
        return Promise.reject(error);
      }
      // If success === true, return the data (or the whole response if you need metadata)
      return responseData.data !== undefined ? responseData.data : responseData;
    }

    // Fallback: return the entire response data
    return responseData;
  },
  (error) => {
    // ─── Handle Cancellation (AbortController) ───────────────────
    // Check if the error is a cancellation (axios v0.22+ uses `axios.isCancel` or `error.name === 'CanceledError'`)
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.message === 'canceled') {
      // Silently ignore – do not show toast or log as error
      // Optionally, you can log to a debug channel if needed
      // console.debug('Request canceled:', error.message);
      return Promise.reject(error); // Still reject, but without side effects
    }

    // ─── Network or timeout error (but not cancellation) ─────────
    if (!error.response) {
      toast.error('Network error – please check your internet connection');
      console.error('Network error:', error.message);
      return Promise.reject(error);
    }

    const { status, data, config } = error.response;
    const requestUrl = config?.url || 'unknown endpoint';

    // ─── Log error for debugging (skip if canceled) ──────────────
    console.error(`❌ API Error [${config?.method?.toUpperCase()} ${requestUrl}]:`, {
      status,
      data,
      requestId: config?.headers?.['X-Request-Id'],
    });

    // ─── Handle specific status codes ────────────────────────────
    switch (status) {
      case 400: {
        const message = data?.message || data?.error?.message || 'Invalid request';
        toast.error(message);
        break;
      }

      case 401: {
        // Unauthorized – token expired or invalid
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } }));
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }, 100);
        toast.error('Session expired – please login again');
        break;
      }

      case 403: {
        toast.error('You do not have permission to perform this action');
        break;
      }

      case 404: {
        toast.error('Resource not found');
        break;
      }

      case 409: {
        const message = data?.message || 'Conflict with existing resource';
        toast.error(message);
        break;
      }

      case 422: {
        const errors = data?.errors || data?.data?.errors;
        if (errors && typeof errors === 'object') {
          const errorMessages = Object.values(errors).flat().join(', ');
          toast.error(errorMessages || 'Validation failed');
        } else {
          toast.error(data?.message || 'Validation failed');
        }
        break;
      }

      case 429: {
        toast.error('Too many requests – please slow down');
        break;
      }

      case 500:
      case 502:
      case 503:
      case 504: {
        toast.error('Server error – please try again later');
        break;
      }

      default: {
        const message = data?.message || data?.error?.message || 'Something went wrong';
        toast.error(message);
        break;
      }
    }

    // ─── Attach the response to the error for further handling ──
    error.apiResponse = data;
    error.statusCode = status;

    return Promise.reject(error);
  }
);

// ─── Helper to clear auth data ──────────────────────────────────
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'manual' } }));
};

// ─── Export the configured instance ─────────────────────────────
export default api;