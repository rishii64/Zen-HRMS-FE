import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuBell,
  LuBellRing,
  LuCheckCheck,
  LuCheck,
  LuX,
  LuBriefcase,
  LuCalendar,
  LuCalendarCheck,
  LuReceipt,
  LuPartyPopper,
  LuMegaphone,
  LuRotateCw,
  LuExternalLink,
  LuSparkles,
  LuArrowLeftRight,
  LuTrendingUp,
  LuClock,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";

// Helper to format relative time
const formatTimeAgo = (dateInput) => {
  if (!dateInput) return "Just now";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";

  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Render category icon
const getNotificationIcon = (type, category) => {
  const normType = String(type || "").toLowerCase();
  const normCat = String(category || "").toLowerCase();

  if (normType === "approval" || normCat.includes("approval")) {
    return <LuBriefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
  if (normType === "leave" || normCat.includes("leave")) {
    return <LuCalendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (normType === "claim" || normCat.includes("claim") || normCat.includes("finance")) {
    return <LuReceipt className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
  }
  if (normType === "announcement" || normCat.includes("event") || normCat.includes("announcement")) {
    return <LuPartyPopper className="h-4 w-4 text-pink-600 dark:text-pink-400" />;
  }
  if (normType === "holiday") {
    return <LuCalendarCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
  }
  if (normType === "transfer" || normCat.includes("transfer")) {
    return <LuArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  }
  if (normType === "promotion" || normCat.includes("promotion") || normCat.includes("progression")) {
    return <LuTrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
  }
  return <LuMegaphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
};

const getNotificationBg = (type, category) => {
  const normType = String(type || "").toLowerCase();
  const normCat = String(category || "").toLowerCase();

  if (normType === "approval" || normCat.includes("approval")) return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60";
  if (normType === "leave" || normCat.includes("leave")) return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60";
  if (normType === "claim" || normCat.includes("claim") || normCat.includes("finance")) return "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60";
  if (normType === "announcement" || normCat.includes("event") || normCat.includes("announcement")) return "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/60";
  if (normType === "promotion" || normCat.includes("promotion") || normCat.includes("progression")) return "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60";
  if (normType === "overtime" || normCat.includes("overtime")) return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60";
  return "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60";
};

export default function NotificationCenter({ className = "" }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "unread", "approvals", "leaves", "announcements"

  const dropdownRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/notifications");
      const data = res.data;
      if (data && data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : data.data.filter((n) => !n.is_read).length);
      }
    } catch (err) {
      console.warn("Error loading in-app notifications:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Event listener for custom "notification-updated" broadcasts
    const handleUpdate = () => fetchNotifications(true);
    window.addEventListener("notification-updated", handleUpdate);
    window.addEventListener("holiday-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    // Live background polling (every 12 seconds)
    const pollInterval = setInterval(() => {
      fetchNotifications(true);
    }, 12000);

    return () => {
      window.removeEventListener("notification-updated", handleUpdate);
      window.removeEventListener("holiday-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
      await api.put("/notifications/read-all");
    } catch (err) {
      console.warn("Failed to mark all notifications as read:", err);
    }
  };

  // Dismiss notification
  const handleDismiss = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.warn("Failed to dismiss notification:", err);
    }
  };

  // Handle clicking a notification: Mark as read and navigate to destination link
  const handleNotificationClick = (item) => {
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  // Filtered notifications by active tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread") return !item.is_read;
    if (activeTab === "approvals") return item.category === "Approvals" || item.type === "approval" || item.type === "claim" || item.type === "transfer";
    if (activeTab === "leaves") return item.category === "Leaves" || item.type === "leave";
    if (activeTab === "announcements") return item.category === "Announcements" || item.type === "announcement" || item.type === "holiday";
    return true; // "all"
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* BELL TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications: ${unreadCount} unread`}
        title={`Notifications (${unreadCount} unread)`}
        className={`relative flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer ${
          isOpen
            ? "border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            : unreadCount > 0
            ? "border-amber-200 bg-amber-50/80 text-amber-600 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        {unreadCount > 0 ? (
          <LuBellRing className="h-4 w-4 animate-swing text-amber-600 dark:text-amber-400" />
        ) : (
          <LuBell className="h-4 w-4" />
        )}

        {/* UNREAD COUNT BADGE */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION CENTER FLYOUT PANEL */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[420px] origin-top-right rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:!bg-slate-900 z-50 overflow-hidden animate-fade-in">
          {/* HEADER */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {unreadCount} New
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  All Caught Up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                  title="Mark all as read"
                >
                  <LuCheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchNotifications()}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Refresh notifications"
              >
                <LuRotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none text-xs font-semibold">
            {[
              { id: "all", label: "All", count: notifications.length },
              { id: "unread", label: "Unread", count: unreadCount },
              { id: "approvals", label: "Approvals" },
              { id: "leaves", label: "Leaves" },
              { id: "announcements", label: "Announcements" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white dark:bg-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id
                        ? "bg-slate-700 text-white dark:bg-blue-800"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* NOTIFICATION LIST */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto overflow-x-hidden scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="flex items-center justify-center">
                  <LuRotateCw className="h-6 w-6 animate-spin text-blue-500" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Checking live notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-2">
                  <LuSparkles className="h-5 w-5 text-amber-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">No notifications</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto">
                  {activeTab === "unread"
                    ? "You've read all your alerts. Nothing pending right now!"
                    : "No notifications currently available in this category."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer ${
                    !item.is_read
                      ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {/* Category / Type Icon badge */}
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-xl border flex items-center justify-center shadow-2xs mt-0.5 ${getNotificationBg(
                      item.type,
                      item.category
                    )}`}
                  >
                    {getNotificationIcon(item.type, item.category)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold truncate ${!item.is_read ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>
                        {item.title}
                      </span>
                      {item.priority === "high" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed break-words">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span>{formatTimeAgo(item.created_at)}</span>
                      {item.category && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {item.category}
                          </span>
                        </>
                      )}
                      {item.link && (
                        <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                          Open <LuExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons & Unread indicator */}
                  <div className="absolute right-2 top-3 flex items-center gap-1">
                    {!item.is_read && (
                      <span
                        className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-slate-900 animate-pulse mr-1"
                        title="Unread"
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                      title="Dismiss notification"
                    >
                      <LuX className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER SHORTCUTS */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Real-time alert sync active
            </span>
            <div className="flex items-center gap-2 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/transfers");
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Transfers
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/requisition");
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Requisitions
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/hr/leaves");
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Leaves
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
