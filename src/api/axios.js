import axios from "axios";

// ============================================================================
// 1. API URL CONFIGURATION (Intelligent Dynamic Localhost, EC2 & Domain Detection)
// ============================================================================
export const LOCALHOST_URL = "http://localhost:5001/api/auth";
export const HOSTED_URL = "https://hrms.zentelex.com/api/auth";

export const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const getDetectedBackendUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5001";
  }

  // Check if explicit backend URL is provided and valid
  const envBackend = import.meta.env?.VITE_BACKEND_URL;
  if (envBackend && (!envBackend.includes("localhost") || isLocalhost)) {
    return envBackend.replace(/\/+$/, "");
  }

  const envApi = import.meta.env?.VITE_API_BASE_URL;
  if (envApi) {
    // If env has localhost but we are browsing on EC2/external host, don't use localhost!
    if (!isLocalhost && (envApi.includes("localhost") || envApi.includes("127.0.0.1"))) {
      // ignore mismatched localhost env
    } else {
      return envApi.replace(/\/api\/auth\/?$/i, "").replace(/\/api\/?$/i, "");
    }
  }

  if (isLocalhost) {
    return "http://localhost:5001";
  }

  // Custom production domain
  if (window.location.hostname === "hrms.zentelex.com") {
    return "https://hrms.zentelex.com";
  }

  // EC2 or custom host: if frontend is on port (e.g. 5173, 3000), backend is on 5001
  if (
    window.location.port &&
    window.location.port !== "80" &&
    window.location.port !== "443" &&
    window.location.port !== "5001"
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }

  // Standard reverse proxy (e.g. Nginx on EC2 port 80/443)
  return window.location.origin;
};

// Root backend URL for static assets/uploads
export const BACKEND_URL = getDetectedBackendUrl();

// Active API URL
export const API_BASE_URL = `${BACKEND_URL}/api/auth`;

// Base URL for uploads (routed through /api/uploads to be proxied by Nginx in production)
export const UPLOADS_BASE = `${BACKEND_URL}/api/uploads`;

// Helper functions for backwards compatibility across components
export const getApiBaseUrl = () => API_BASE_URL;
export const getBackendBaseUrl = () => BACKEND_URL;

/**
 * Format full URL for uploaded files
 * In production reverse proxies (like Nginx on EC2), only /api/* is routed to the Node backend,
 * while /* serves the frontend SPA index.html.
 * Therefore, uploaded assets MUST be routed through /api/uploads/
 */
export const getUploadUrl = (filename) => {
  if (!filename || typeof filename !== "string") return "";
  const trimmed = filename.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const clean = trimmed
    .replace(/^\/+/, "")
    .replace(/^api\/auth\/uploads\//i, "")
    .replace(/^api\/uploads\//i, "")
    .replace(/^uploads\//i, "");
  return `${getBackendBaseUrl()}/api/uploads/${clean}`;
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
