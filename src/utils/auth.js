import toast from "react-hot-toast";

/**
 * Clear all auth-related items from localStorage and session
 */
export const clearAuthSession = () => {
  if (typeof window === "undefined") return;
  localStorage.clear();
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
 * Check if the stored JWT token is expired (buffers by 10s for clock skew)
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 <= Date.now() + 10000;
};

/**
 * Dynamic resolution of the backend auth API URL
 */
const getAuthApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:5001/api/auth";
  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocalhost) return "http://localhost:5001/api/auth";
  if (window.location.hostname === "hrms.zentelex.com") return "https://hrms.zentelex.com/api/auth";
  if (
    window.location.port &&
    window.location.port !== "80" &&
    window.location.port !== "443" &&
    window.location.port !== "5001"
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5001/api/auth`;
  }
  return `${window.location.origin}/api/auth`;
};

// Global lock to prevent duplicate toast messages and redirection loops
let isRedirecting = false;

/**
 * Terminate the user's session cleanly and redirect to /login.
 * Proactively triggers automatic clock-out if an employee's shift ended.
 */
export const handleSessionExpired = async (
  message = "Your 14-hour session has ended. You have been automatically clocked out and logged out from the portal."
) => {
  if (isRedirecting) return;
  isRedirecting = true;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Proactively auto clock-out unclosed shift before clearing storage
  if (token) {
    try {
      const apiUrl = getAuthApiUrl();
      await fetch(`${apiUrl}/attendance/auto-clock-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ forceIfShiftEnded: true }),
        keepalive: true,
      });
    } catch (err) {
      console.warn("[Session Expiry] Auto clock-out trigger failed:", err);
    }
  }

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

/**
 * Setup lifecycle listeners (tab focus / visibility) to detect token expiry proactively
 */
export const initTokenExpiryWatcher = () => {
  if (typeof window === "undefined") return;

  const checkStatus = () => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      handleSessionExpired(
        "Your 14-hour session has ended. You have been automatically clocked out and logged out from the portal."
      );
    }
  };

  // Check whenever user switches back to this tab
  window.addEventListener("focus", checkStatus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkStatus();
    }
  });

  // Check periodically every 30 seconds
  setInterval(checkStatus, 30000);
};

