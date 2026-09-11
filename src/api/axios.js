import axios from "axios";

/**
 * Resolves the API Base URL dynamically based on environment or window location.
 * Priority:
 * 1. Vite environment variable: VITE_API_BASE_URL or VITE_API_URL
 * 2. Local storage override (useful for runtime testing/configuration)
 * 3. Window origin check:
 *    - If running on localhost / private IP: defaults to http://localhost:5001/api/auth
 *    - If running in a hosted / production domain: defaults to `${origin}/api/auth`
 */
export const getApiBaseUrl = () => {
  // 1. Vite Environment Variables
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL);
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  // 2. Local Storage Override
  if (typeof window !== "undefined" && window.localStorage) {
    const customUrl = window.localStorage.getItem("API_BASE_URL");
    if (customUrl) return customUrl.replace(/\/+$/, "");
  }

  // 3. Browser Location Detection (Local vs Hosted)
  if (typeof window !== "undefined" && window.location) {
    const { hostname, origin } = window.location;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local");

    if (isLocalhost) {
      return "http://localhost:5001/api/auth";
    }

    // Hosted / Production environment
    return `${origin}/api/auth`;
  }

  return "http://localhost:5001/api/auth";
};

/**
 * Resolves the root backend server URL (without `/api/auth` or `/api`),
 * useful for constructing static file URLs (e.g. /uploads/...)
 */
export const getBackendBaseUrl = () => {
  const envBackend =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL;
  if (envBackend) {
    return envBackend.replace(/\/+$/, "");
  }

  const apiUrl = getApiBaseUrl();
  return apiUrl
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
};

/**
 * Formats full URL for uploaded files (e.g. profile photos, documents)
 */
export const getUploadUrl = (filename) => {
  if (!filename) return "";
  if (filename.startsWith("http://") || filename.startsWith("https://") || filename.startsWith("data:")) {
    return filename;
  }
  const clean = filename.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${getBackendBaseUrl()}/uploads/${clean}`;
};

/**
 * Dynamically updates the API base URL at runtime and persists to localStorage.
 */
export const setApiBaseUrl = (url) => {
  if (!url) {
    localStorage.removeItem("API_BASE_URL");
  } else {
    localStorage.setItem("API_BASE_URL", url);
  }
  api.defaults.baseURL = getApiBaseUrl();
};

// Create Axios Instance
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Auth Token & Sync BaseURL
api.interceptors.request.use(
  (config) => {
    // Ensure current dynamic base URL is applied if not already absolute
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl();
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized Error & 401 Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const isAuthRoute =
        currentPath.includes("login") ||
        currentPath.includes("register") ||
        currentPath.includes("forgot");

      if (!isAuthRoute) {
        console.warn("Unauthorized request. Token may be expired or invalid.");
      }
    }
    return Promise.reject(error);
  }
);

// Convenience exports for components requiring string URLs
export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_URL = getBackendBaseUrl();

export default api;
