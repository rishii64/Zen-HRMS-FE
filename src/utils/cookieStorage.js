/**
 * cookieStorage.js
 * Comprehensive cookie storage management for sensitive auth and employee session data.
 * Keeps ONLY unified cookies across all modules and eliminates redundant duplicate cookies.
 */

// Unified auth keys that are actively stored in document.cookie
export const UNIFIED_AUTH_COOKIE_KEYS = new Set([
  "token",
  "role",
  "userName",
  "employeeCode",
  "user",
]);

// Redundant / duplicate keys that are eliminated from document.cookie
// (mapped to unified tokens or extracted from the unified 'user' object)
export const REDUNDANT_AUTH_COOKIE_KEYS = new Set([
  "empId",
  "employee_id",
  "name",
  "userId",
  "email",
  "dept",
  "department",
  "designation",
  "phone",
  "profile_photo",
  "reporting_manager",
  "status",
  "joining_date",
  "enabled_tabs",
  "tabs_enabled",
]);

// All sensitive auth keys that must NEVER reside in plain localStorage
export const SENSITIVE_AUTH_KEYS = new Set([
  ...UNIFIED_AUTH_COOKIE_KEYS,
  ...REDUNDANT_AUTH_COOKIE_KEYS,
]);

// Preserve native Storage methods before any monkey-patching occurs
const nativeGetItem =
  typeof window !== "undefined" && window.Storage
    ? window.Storage.prototype.getItem
    : null;
const nativeSetItem =
  typeof window !== "undefined" && window.Storage
    ? window.Storage.prototype.setItem
    : null;
const nativeRemoveItem =
  typeof window !== "undefined" && window.Storage
    ? window.Storage.prototype.removeItem
    : null;
const nativeClear =
  typeof window !== "undefined" && window.Storage
    ? window.Storage.prototype.clear
    : null;

/**
 * Retrieve raw cookie value from document.cookie by exact name
 */
export const getCookieRaw = (name) => {
  if (typeof document === "undefined" || !name) return null;
  const nameEQ = encodeURIComponent(name) + "=";
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (let i = 0; i < cookies.length; i++) {
    let c = cookies[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      const rawVal = c.substring(nameEQ.length);
      try {
        return decodeURIComponent(rawVal);
      } catch (_) {
        return rawVal;
      }
    }
  }
  return null;
};

/**
 * Retrieve a cookie value by name, with transparent fallback for unified tokens
 */
export const getCookie = (name) => {
  if (typeof document === "undefined" || !name) return null;

  // 1. Check exact cookie match
  const raw = getCookieRaw(name);
  if (raw !== null && raw !== undefined) return raw;

  // 2. Unified Employee ID aliases -> employeeCode
  if (name === "empId" || name === "employee_id") {
    const empCode = getCookieRaw("employeeCode");
    if (empCode) return empCode;
    const user = getAuthUser();
    if (user && (user.employee_code || user.employee_id)) {
      return user.employee_code || user.employee_id;
    }
  }

  // 3. Unified Name alias -> userName
  if (name === "name") {
    const uName = getCookieRaw("userName");
    if (uName) return uName;
    const user = getAuthUser();
    if (user && user.name) return user.name;
  }

  // 4. Redundant user profile attributes -> read directly from unified 'user' object
  if (REDUNDANT_AUTH_COOKIE_KEYS.has(name)) {
    const user = getAuthUser();
    if (user) {
      if (name === "userId" && user.id !== undefined) return String(user.id);
      if (name === "department" && (user.department || user.dept)) return user.department || user.dept;
      if (name === "phone" && (user.phone || user.phone_no)) return user.phone || user.phone_no;
      if (user[name] !== undefined && user[name] !== null) {
        return typeof user[name] === "object" ? JSON.stringify(user[name]) : String(user[name]);
      }
    }
  }

  return null;
};

/**
 * Set a cookie with secure defaults and expiration
 * Default expiration: 14 hours (matching 14h JWT session token)
 */
export const setCookie = (name, value, options = {}) => {
  if (typeof document === "undefined" || !name) return;
  if (value === undefined || value === null) {
    removeCookie(name, options);
    return;
  }

  const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);

  // If value is excessively large (e.g. > 3800 bytes), truncate or warn
  if (strValue.length > 3800) {
    console.warn(`[cookieStorage] Cookie '${name}' payload is very large (${strValue.length} bytes). Truncating safe limit.`);
  }

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(strValue)}`;

  // Expiration: default 14 hours (14 / 24 days) if not explicitly provided
  const expiresDays = options.expires !== undefined ? options.expires : 14 / 24;
  if (typeof expiresDays === "number") {
    const d = new Date();
    d.setTime(d.getTime() + expiresDays * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${d.toUTCString()}`;
  } else if (expiresDays instanceof Date) {
    cookieString += `; expires=${expiresDays.toUTCString()}`;
  }

  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }

  cookieString += `; path=${options.path || "/"}`;

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  const sameSite = options.sameSite || "Lax";
  cookieString += `; samesite=${sameSite}`;

  const isSecure = options.secure !== undefined
    ? options.secure
    : (typeof window !== "undefined" && window.location.protocol === "https:");
  if (isSecure) {
    cookieString += "; secure";
  }

  document.cookie = cookieString;
};

/**
 * Remove a cookie by expiring it across common paths
 */
export const removeCookie = (name, options = {}) => {
  if (typeof document === "undefined" || !name) return;
  const path = options.path || "/";
  const domain = options.domain ? `; domain=${options.domain}` : "";
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=${path}${domain}; samesite=Lax`;
  // Also expire without path just in case
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; samesite=Lax`;
};

/**
 * Actively purge all redundant duplicate cookies from document.cookie
 */
export const purgeRedundantCookies = () => {
  if (typeof document === "undefined") return;
  REDUNDANT_AUTH_COOKIE_KEYS.forEach((key) => {
    removeCookie(key);
  });
};

/**
 * Remove all sensitive auth keys from document.cookie
 */
export const clearAllAuthCookies = () => {
  if (typeof document === "undefined") return;
  SENSITIVE_AUTH_KEYS.forEach((key) => {
    removeCookie(key);
  });
};

/**
 * Purge any existing sensitive keys from localStorage WITHOUT touching cookies
 */
export const purgeLocalStorageSensitiveKeys = () => {
  if (typeof window === "undefined" || !window.localStorage || !nativeRemoveItem) return;
  try {
    SENSITIVE_AUTH_KEYS.forEach((key) => {
      nativeRemoveItem.call(window.localStorage, key);
    });
  } catch (_) {}
};

/**
 * Persist login payload into Cookies using ONLY UNIFIED KEYS.
 * Completely eliminates redundant tokens (like multiple employee IDs or duplicate names).
 */
export const setAuthCookies = (data) => {
  if (!data) return;

  const token = data.token;
  const user = data.user || {};
  const role = user.role || data.role || "";
  const empCode = user.employee_code || user.employee_id || data.employee_id || "";
  const userName = user.name || data.userName || "";

  // 1. Store ONLY the 5 unified cookies
  if (token) setCookie("token", token);
  if (role) setCookie("role", role);
  if (userName) setCookie("userName", userName);
  if (empCode) setCookie("employeeCode", empCode);
  setCookie("user", user);

  // 2. Explicitly remove all redundant duplicate cookies from document.cookie
  purgeRedundantCookies();

  // 3. Purge sensitive keys from native localStorage
  purgeLocalStorageSensitiveKeys();
};

/**
 * Clear all auth cookies and any residual sensitive localStorage data
 */
export const clearAuthCookies = () => {
  clearAllAuthCookies();
  purgeLocalStorageSensitiveKeys();
};

/**
 * Convenience auth getters
 */
export const getAuthToken = () => {
  return getCookieRaw("token");
};

export const getAuthRole = () => {
  const role = getCookieRaw("role");
  if (role) return role;
  const user = getAuthUser();
  if (user && user.role) return user.role;
  const token = getAuthToken();
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload && payload.role) return payload.role;
      }
    } catch (_) {}
  }
  return null;
};

export const getAuthEmployeeCode = () => {
  const code = getCookieRaw("employeeCode");
  if (code) return code;
  const user = getAuthUser();
  if (user && (user.employee_code || user.employee_id)) {
    return user.employee_code || user.employee_id;
  }
  return "";
};

export const getAuthUser = () => {
  const raw = getCookieRaw("user");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  return null;
};

/**
 * Initialize transparent localStorage bridge:
 * - Purges redundant cookies on startup
 * - Intercepts localStorage calls for sensitive keys so that any calls to
 *   localStorage.getItem / setItem / removeItem transparently read & write to unified Cookies!
 * - Ensures legacy modules accessing 'empId', 'employee_id', 'name', 'userId', etc.
 *   continue to work without breaking.
 */
export const initCookieStorageBridge = () => {
  if (typeof window === "undefined" || window.__cookie_storage_bridge_initialized) return;
  window.__cookie_storage_bridge_initialized = true;

  try {
    // Purge redundant duplicate cookies immediately on startup
    purgeRedundantCookies();

    if (!nativeGetItem || !nativeSetItem || !nativeRemoveItem || !nativeClear) return;

    // Purge sensitive keys from localStorage
    purgeLocalStorageSensitiveKeys();

    // Patch Storage.prototype.getItem
    Storage.prototype.getItem = function (key) {
      if (this === window.localStorage && SENSITIVE_AUTH_KEYS.has(key)) {
        // Direct unified cookie
        const direct = getCookieRaw(key);
        if (direct !== null && direct !== undefined) return direct;

        // Unified Employee ID alias -> employeeCode
        if (key === "empId" || key === "employee_id") {
          const empCode = getCookieRaw("employeeCode");
          if (empCode !== null && empCode !== undefined) return empCode;
        }

        // Unified Name alias -> userName
        if (key === "name") {
          const uName = getCookieRaw("userName");
          if (uName !== null && uName !== undefined) return uName;
        }

        // Extract attributes from unified 'user' object
        const user = getAuthUser();
        if (user) {
          if (key === "userId" && user.id !== undefined) return String(user.id);
          if (key === "department" && (user.department || user.dept)) return user.department || user.dept;
          if (key === "phone" && (user.phone || user.phone_no)) return user.phone || user.phone_no;
          if (user[key] !== undefined && user[key] !== null) {
            return typeof user[key] === "object" ? JSON.stringify(user[key]) : String(user[key]);
          }
        }

        return nativeGetItem.call(this, key);
      }
      return nativeGetItem.apply(this, arguments);
    };

    // Patch Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage && SENSITIVE_AUTH_KEYS.has(key)) {
        if (key === "empId" || key === "employee_id") {
          setCookie("employeeCode", value);
        } else if (key === "name") {
          setCookie("userName", value);
        } else if (UNIFIED_AUTH_COOKIE_KEYS.has(key)) {
          setCookie(key, value);
        } else {
          // Update inside unified 'user' cookie
          const user = getAuthUser() || {};
          user[key] = value;
          setCookie("user", user);
        }
        // Ensure sensitive data is never persisted in native localStorage
        nativeRemoveItem.call(this, key);
        return;
      }
      return nativeSetItem.apply(this, arguments);
    };

    // Patch Storage.prototype.removeItem
    Storage.prototype.removeItem = function (key) {
      if (this === window.localStorage && SENSITIVE_AUTH_KEYS.has(key)) {
        if (UNIFIED_AUTH_COOKIE_KEYS.has(key)) {
          removeCookie(key);
        }
        nativeRemoveItem.call(this, key);
        return;
      }
      return nativeRemoveItem.apply(this, arguments);
    };

    // Patch Storage.prototype.clear
    Storage.prototype.clear = function () {
      if (this === window.localStorage) {
        clearAllAuthCookies();
      }
      return nativeClear.apply(this, arguments);
    };
  } catch (err) {
    console.error("[cookieStorage] Failed to initialize cookie bridge:", err);
  }
};

// Self-initialize immediately on import in browser environments
if (typeof window !== "undefined") {
  initCookieStorageBridge();
}
