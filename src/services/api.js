import axios from 'axios';
import toast from 'react-hot-toast';

// ========================================
// Axios Instance Configuration
// ========================================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// ========================================
// Request Interceptor – Add Auth Token
// ========================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking (optional)
    config.headers['X-Request-Id'] = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ========================================
// Response Interceptor – Handle Errors
// ========================================

api.interceptors.response.use(
  (response) => {
    // Return only the data part for convenience
    return response.data;
  },
  (error) => {
    const { response, config } = error;

    // Network or timeout errors
    if (!response) {
      toast.error('Network error – please check your connection');
      return Promise.reject(error);
    }

    // Log error for debugging
    console.error(`❌ API Error [${config.method.toUpperCase()} ${config.url}]:`, {
      status: response.status,
      data: response.data,
    });

    // Handle specific status codes
    switch (response.status) {
      case 401:
        // Unauthorized – token expired or invalid
        localStorage.removeItem('token');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
          toast.error('Session expired – please login again');
        }
        break;

      case 403:
        toast.error('You do not have permission to perform this action');
        break;

      case 404:
        toast.error('Resource not found');
        break;

      case 429:
        toast.error('Too many requests – please slow down');
        break;

      case 500:
        toast.error('Server error – please try again later');
        break;

      default:
        // Show error message from server if available
        const message = response.data?.message || response.data?.error?.message || 'Something went wrong';
        toast.error(message);
        break;
    }

    return Promise.reject(error);
  }
);

// ========================================
// Helper Functions for Different Request Types
// ========================================

export const get = (url, params = {}) => {
  return api.get(url, { params });
};

export const post = (url, data = {}) => {
  return api.post(url, data);
};

export const put = (url, data = {}) => {
  return api.put(url, data);
};

export const patch = (url, data = {}) => {
  return api.patch(url, data);
};

export const del = (url) => {
  return api.delete(url);
};

export const upload = (url, formData, onProgress) => {
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
};

// ========================================
// Export default instance
// ========================================

export default api;