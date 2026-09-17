import axios from "axios";

// ============================================================================
// 1. API URL CONFIGURATION (Distinct Localhost & Hosted Links)
// ============================================================================
// Local development URL
export const LOCALHOST_URL = "http://localhost:5001/api/auth";

// Hosted / Production backend URL (replace with your live backend domain)
export const HOSTED_URL = "https://hrms.zentelex.com/api/auth";

// Auto-detect environment: use localhost when running locally, hosted URL otherwise
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Active API URL (prioritizes VITE_API_BASE_URL from .env if present)
export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (isLocalhost ? LOCALHOST_URL : HOSTED_URL);

// Root backend URL for static assets/uploads (strips /api/auth or /api)
export const BACKEND_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  API_BASE_URL.replace(/\/api\/auth\/?$/i, "").replace(/\/api\/?$/i, "");

// Helper functions for backwards compatibility across components
export const getApiBaseUrl = () => API_BASE_URL;
export const getBackendBaseUrl = () => BACKEND_URL;

/**
 * Format full URL for uploaded files
 */
export const getUploadUrl = (filename) => {
  if (!filename) return "";
  if (
    filename.startsWith("http://") ||
    filename.startsWith("https://") ||
    filename.startsWith("data:")
  ) {
    return filename;
  }
  const clean = filename.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${BACKEND_URL}/uploads/${clean}`;
};

export const setApiBaseUrl = (url) => {
  if (url) api.defaults.baseURL = url;
};

// ============================================================================
// 2. AXIOS INSTANCE & INTERCEPTORS
// ============================================================================
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach bearer token if available
api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized request. Token may be expired.");
    }
    return Promise.reject(error);
  }
);

export default api;
