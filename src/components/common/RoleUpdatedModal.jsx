import React, { useState, useEffect, useRef } from "react";
import {
  LuShieldAlert,
  LuRefreshCw,
  LuLogOut,
  LuX,
  LuSparkles,
  LuCheck,
} from "react-icons/lu";
import toast from "react-hot-toast";
import { getAuthToken, clearAuthSession } from "../../utils/auth";
import { subscribeToRoleUpdates } from "../../utils/socket";

// Audio chime for urgent role update alert
const playRoleUpdateChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Dual-tone rising chime (F4 -> A4 -> C5)
    [349.23, 440.0, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.09, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
    });
  } catch (_) {}
};

export default function RoleUpdatedModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [updateDetails, setUpdateDetails] = useState(null);
  const lastTriggeredRef = useRef(0);

  const triggerRoleUpdateAlert = (details = {}) => {
    // Only show if user is authenticated and not on login page
    if (typeof window === "undefined") return;
    const token = getAuthToken() || localStorage.getItem("token");
    if (!token || window.location.pathname === "/login") return;

    // Debounce triggers within 5 seconds
    const now = Date.now();
    if (now - lastTriggeredRef.current < 5000) return;
    lastTriggeredRef.current = now;

    setUpdateDetails(details);
    setIsOpen(true);
    setShowBanner(true);
    playRoleUpdateChime();

    // Show persistent toast alert with re-login action
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-amber-500/20 p-4 border-l-4 border-l-amber-500`}
        >
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center border border-amber-300 dark:border-amber-700">
                  <LuShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Role & Permissions Updated
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                </p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Your role has been updated, please re-login to enjoy seamless workflow.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toast.dismiss(t.id);
                      handleReLogin();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:from-amber-600 hover:to-orange-600 transition"
                  >
                    <LuLogOut className="h-3.5 w-3.5" /> Re-login Now
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        id: "role-updated-toast",
        duration: 12000,
        position: "top-center",
      }
    );
  };

  useEffect(() => {
    // 1. Subscribe to WebSocket role_updated event
    const unsubscribeSocket = subscribeToRoleUpdates((data) => {
      triggerRoleUpdateAlert(data);
    });

    // 2. Subscribe to window custom event dispatched by axios interceptor or notification center
    const handleCustomEvent = (e) => {
      triggerRoleUpdateAlert(e?.detail || {});
    };
    window.addEventListener("hrms:role_updated", handleCustomEvent);

    return () => {
      unsubscribeSocket();
      window.removeEventListener("hrms:role_updated", handleCustomEvent);
    };
  }, []);

  const handleReLogin = () => {
    toast.success("Redirecting to login portal...", { id: "relogin-redirect" });
    clearAuthSession();
    setTimeout(() => {
      window.location.href = "/login";
    }, 400);
  };

  const handleDismissModal = () => {
    setIsOpen(false);
    // showBanner stays true as a persistent reminder bar at top of page
  };

  return (
    <>
      {/* 1. Persistent Top Warning Banner when modal is dismissed */}
      {showBanner && !isOpen && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2 shadow-md flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 justify-center">
            <LuShieldAlert className="h-4 w-4 animate-bounce flex-shrink-0" />
            <span>
              <strong>Notice:</strong> Your role has been updated, please re-login to enjoy seamless workflow.
            </span>
            <button
              type="button"
              onClick={handleReLogin}
              className="ml-2 px-2.5 py-1 bg-white text-amber-800 rounded-md font-bold hover:bg-amber-50 shadow-xs transition flex items-center gap-1"
            >
              <LuRefreshCw className="h-3 w-3" /> Re-login Now
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="text-white/80 hover:text-white p-1"
            title="Hide banner"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Interactive Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800/60 overflow-hidden animate-scaleUp p-6 text-center"
            style={{
              boxShadow: "0 25px 50px -12px rgba(245, 158, 11, 0.25)",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismissModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              title="Close"
            >
              <LuX className="h-5 w-5" />
            </button>

            {/* Pulsing Icon Badge */}
            <div className="mx-auto mb-4 relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center border-2 border-amber-300 dark:border-amber-600 shadow-md">
                <LuShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
              </span>
            </div>

            {/* Headline */}
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 flex items-center justify-center gap-1.5">
              Role & Permissions Updated
              <LuSparkles className="h-4 w-4 text-amber-500" />
            </h4>

            {/* Exact Required Message */}
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 py-2 px-3 rounded-xl border border-amber-200 dark:border-amber-800/60 my-3">
              Your role has been updated, please re-login to enjoy seamless workflow
            </p>

            {/* Context Subtext */}
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Your organizational role, rank, or band assignment has been updated by administration.
              To refresh your active session tokens, navigation tabs, and approval desk privileges, please re-login.
            </p>

            {/* Details Pills (if available) */}
            {updateDetails && (updateDetails.new_role || updateDetails.new_designation) && (
              <div className="mb-4 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 flex-wrap">
                <LuCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>
                  Updated to:{" "}
                  <strong>{updateDetails.new_designation || updateDetails.new_role}</strong>
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <button
                type="button"
                onClick={handleReLogin}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <LuLogOut className="h-4 w-4" /> Re-login Now
              </button>
              <button
                type="button"
                onClick={handleDismissModal}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
