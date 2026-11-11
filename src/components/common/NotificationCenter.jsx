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
  LuUserCheck,
  LuLogOut,
  LuRadio,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getSocket, subscribeToNotifications } from "../../utils/socket";

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

// Play a subtle Web Audio chime on incoming socket alert
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) { }
};

// Render category icon
const getNotificationIcon = (type, category) => {
  const normType = String(type || "").toLowerCase();
  const normCat = String(category || "").toLowerCase();

  if (normType === "onboarding" || normCat.includes("onboard")) {
    return <LuUserCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
  }
  if (normType === "resignation" || normCat.includes("resign")) {
    return <LuLogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
  }
  if (normType === "claim" || normCat.includes("claim") || normCat.includes("finance")) {
    return <LuReceipt className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
  }
  if (normType === "approval" || normCat.includes("approval")) {
    return <LuBriefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
  if (normType === "leave" || normCat.includes("leave")) {
    return <LuCalendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (normType === "event" || normCat.includes("event")) {
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

  if (normType === "onboarding" || normCat.includes("onboard")) {
    return "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/60";
  }
  if (normType === "resignation" || normCat.includes("resign")) {
    return "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60";
  }
  if (normType === "claim" || normCat.includes("claim") || normCat.includes("finance")) {
    return "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60";
  }
  if (normType === "approval" || normCat.includes("approval")) {
    return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60";
  }
  if (normType === "leave" || normCat.includes("leave")) {
    return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60";
  }
  if (normType === "event" || normCat.includes("event") || normCat.includes("announcement")) {
    return "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/60";
  }
  if (normType === "promotion" || normCat.includes("promotion") || normCat.includes("progression")) {
    return "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60";
  }
  return "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60";
};

export default function NotificationCenter({ className = "" }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSocketLive, setIsSocketLive] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const dropdownRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/notifications");
      const data = res.data;
      if (data && data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        setUnreadCount(
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : data.data.filter((n) => !n.is_read).length
        );
      }
    } catch (err) {
      console.warn("Error loading in-app notifications:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Check socket status
    const sock = getSocket();
    if (sock) {
      setIsSocketLive(sock.connected);
      sock.on("connect", () => setIsSocketLive(true));
      sock.on("disconnect", () => setIsSocketLive(false));
    }

    // Subscribe to real-time notification socket events
    const unsubscribe = subscribeToNotifications((notif) => {
      if (!notif) return;

      // Deduplicate & prepend to state
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) {
          return prev;
        }
        return [notif, ...prev];
      });

      setUnreadCount((c) => c + 1);

      // Play audio chime
      playNotificationSound();

      // Show desktop toast with quick-navigate action
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              if (notif.link) navigate(notif.link);
            }}
            className={`${t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10 p-3.5 cursor-pointer hover:shadow-2xl transition border-l-4 ${notif.priority === "high" || notif.priority === "urgent"
                ? "border-l-rose-500"
                : "border-l-blue-500"
              }`}
          >
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center border shadow-2xs ${getNotificationBg(
                      notif.type,
                      notif.category
                    )}`}
                  >
                    {getNotificationIcon(notif.type, notif.category)}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {notif.message}
                  </p>
                  {notif.link && (
                    <p className="mt-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      Click to view <LuExternalLink className="h-3 w-3" />
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="ml-2 flex flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss(t.id);
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>
          </div>
        ),
        { duration: 6000, position: "top-right" }
      );
    });

    // Window focus / online listeners for seamless fallback
    const handleSync = () => fetchNotifications(true);
    window.addEventListener("focus", handleSync);
    window.addEventListener("online", handleSync);
    window.addEventListener("notification-updated", handleSync);

    // Heartbeat fallback check (every 60 seconds, replacing aggressive 12s polling)
    const heartbeat = setInterval(() => {
      fetchNotifications(true);
      if (sock) setIsSocketLive(sock.connected);
    }, 60000);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("online", handleSync);
      window.removeEventListener("notification-updated", handleSync);
      clearInterval(heartbeat);
    };
  }, [navigate]);

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
    const normType = String(item.type || "").toLowerCase();
    const normCat = String(item.category || "").toLowerCase();

    if (activeTab === "unread") return !item.is_read;
    if (activeTab === "approvals") {
      return (
        normType === "approval" ||
        normCat.includes("approval") ||
        normType === "claim" ||
        normCat.includes("claim") ||
        normType === "transfer"
      );
    }
    if (activeTab === "onboarding") {
      return (
        normType === "onboarding" ||
        normCat.includes("onboard") ||
        normType === "offer" ||
        normCat.includes("offer")
      );
    }
    if (activeTab === "resignation") {
      return normType === "resignation" || normCat.includes("resign");
    }
    if (activeTab === "leaves") {
      return normType === "leave" || normCat.includes("leave");
    }
    if (activeTab === "events") {
      return (
        normType === "event" ||
        normCat.includes("event") ||
        normType === "announcement" ||
        normCat.includes("announcement") ||
        normType === "holiday"
      );
    }
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
        className={`relative flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer ${isOpen
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
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[440px] origin-top-right rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:!bg-slate-900 z-50 overflow-hidden animate-fade-in">
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

            <div className="flex items-center gap-1.5">
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
              { id: "approvals", label: "Approvals & Claims" },
              { id: "onboarding", label: "Onboarding" },
              { id: "resignation", label: "Resignation" },
              { id: "leaves", label: "Leaves" },
              { id: "events", label: "Events" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${activeTab === tab.id
                  ? "bg-slate-900 text-white dark:bg-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === tab.id
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto overflow-x-hidden scrollbar-thin">
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
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer ${!item.is_read
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
                      <span
                        className={`text-xs font-bold truncate ${!item.is_read
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        {item.title}
                      </span>
                      {(item.priority === "high" || item.priority === "urgent") && (
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

          {/* FOOTER SHORTCUTS & LIVE STATUS */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Live Sockets Active
              </span>
            </div>

            {/* <div className="flex items-center gap-2 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/hr/claims");
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Claims
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
                Offers
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
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}
