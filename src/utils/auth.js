import toast from "react-hot-toast";
import { getCookie, clearAuthCookies, getAuthToken } from "./cookieStorage";

export * from "./cookieStorage";

export const resetRedirectLock = () => {
  isRedirecting = false;
};

/**
 * Clear all auth-related items from cookies, session, and localStorage
 */
export const clearAuthSession = () => {
  isRedirecting = false;
  if (typeof window === "undefined") return;
  clearAuthCookies();
  try {
    localStorage.clear();
  } catch (_) {}
};

/**
 * Safely parse a JWT payload without external libraries
 */
export const parseJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Check if the stored JWT token is expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 <= Date.now();
};

// Global lock to prevent duplicate toast messages and redirection loops
let isRedirecting = false;

/**
 * Terminate the user's portal session and redirect to /login strictly when the session token expires.
 * Does NOT clock out the employee or modify attendance records.
 */
export const handleSessionExpired = (
  message = "Your session has expired. Please log in again to continue."
) => {
  if (isRedirecting) return;
  isRedirecting = true;

  clearAuthSession();

  if (typeof window !== "undefined") {
    // If not already on login page, display notification and redirect
    if (window.location.pathname !== "/login") {
      toast.error(message, { id: "session-expired", duration: 5000 });
      setTimeout(() => {
        window.location.href = "/login";
      }, 700);
    } else {
      isRedirecting = false;
    }
  }
};

let expiryTimer = null;

/**
 * Setup lifecycle listeners and precise timer to auto-logout from portal
 * only when the 14-hour session token expires.
 */
export const initTokenExpiryWatcher = () => {
  if (typeof window === "undefined") return;

  const checkStatus = () => {
    const token = getAuthToken() || localStorage.getItem("token");
    if (!token) return;

    if (isTokenExpired(token)) {
      handleSessionExpired(
        "Your session has expired. Please log in again to continue."
      );
      return;
    }

    // Schedule exact timer for token expiration
    const decoded = parseJwt(token);
    if (decoded && decoded.exp) {
      const remainingMs = decoded.exp * 1000 - Date.now();
      if (remainingMs > 0 && remainingMs < 2147483647) {
        if (expiryTimer) clearTimeout(expiryTimer);
        expiryTimer = setTimeout(checkStatus, remainingMs + 500);
      }
    }
  };

  // Run initial check and schedule expiry timer
  checkStatus();

  // Check whenever user switches back to this tab
  window.addEventListener("focus", checkStatus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkStatus();
    }
  });

  // Fallback periodic check every 30 seconds
  setInterval(checkStatus, 30000);
};
