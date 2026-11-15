import { io } from "socket.io-client";
import { getDetectedBackendUrl } from "../api/axios";
import {
  getAuthEmployeeCode,
  getAuthRole,
  getAuthDept,
  getAuthUser,
} from "./cookieStorage";

let socket = null;
let currentAuthKey = "";

/**
 * Build authentication payload from current session
 */
export const getSocketAuthPayload = () => {
  const user = getAuthUser() || {};
  const employeeCode = getAuthEmployeeCode() || user.employee_id || user.employeeCode || "";
  const role = getAuthRole() || user.role || "";
  const dept = getAuthDept() || user.dept || user.department || "";

  return {
    employee_code: employeeCode,
    employee_id: employeeCode,
    role: role.toLowerCase().trim(),
    dept: dept.trim(),
    name: user.name || "",
  };
};

/**
 * Get or initialize the singleton Socket.IO connection
 */
export const getSocket = () => {
  if (typeof window === "undefined") return null;

  const backendUrl = getDetectedBackendUrl();
  const authPayload = getSocketAuthPayload();
  const authKey = `${authPayload.employee_code}:${authPayload.role}:${authPayload.dept}`;

  if (!socket) {
    socket = io(backendUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
      transports: ["websocket", "polling"],
    });

    currentAuthKey = authKey;

    socket.on("connect", () => {
      const payload = getSocketAuthPayload();
      socket.emit("authenticate", payload);
    });

    socket.on("reconnect", () => {
      const payload = getSocketAuthPayload();
      socket.emit("authenticate", payload);
    });

    socket.on("connect_error", (err) => {
      // Graceful fallback without breaking app
      console.warn("Real-time socket connection warning:", err.message);
    });
  } else if (socket.connected && authKey !== currentAuthKey) {
    // Session identity updated (e.g. user logged in or switched accounts)
    currentAuthKey = authKey;
    socket.emit("authenticate", authPayload);
  }

  return socket;
};

/**
 * Disconnect socket on logout
 */
export const disconnectSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch (_) {}
    socket = null;
    currentAuthKey = "";
  }
};

/**
 * Re-authenticate socket with current cookies/credentials
 */
export const reauthenticateSocket = () => {
  if (socket && socket.connected) {
    const payload = getSocketAuthPayload();
    currentAuthKey = `${payload.employee_code}:${payload.role}:${payload.dept}`;
    socket.emit("authenticate", payload);
  } else {
    getSocket();
  }
};

/**
 * Subscribe to incoming real-time notifications
 * @param {Function} handler - Callback invoked with the notification payload
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (handler) => {
  const s = getSocket();
  if (!s) return () => {};

  s.on("notification", handler);
  return () => {
    s.off("notification", handler);
  };
};

export default {
  getSocket,
  disconnectSocket,
  reauthenticateSocket,
  subscribeToNotifications,
  getSocketAuthPayload,
};
