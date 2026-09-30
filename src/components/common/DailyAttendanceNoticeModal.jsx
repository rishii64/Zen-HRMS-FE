import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiClock,
  FiSun,
  FiMoon,
  FiCheckCircle,
  FiX,
  FiCalendar,
  FiCheck,
  FiInfo,
  FiArrowRight,
  FiArrowLeft,
  FiLogOut,
} from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";

/**
 * Fully responsive, centered, mobile-optimized Daily Attendance Notice Modal.
 * Neatly scaled for all screen sizes (small phones, large phones, tablets, laptops, desktops).
 * 
 * Sequential 2-step presentation:
 * Step 1: Office hours (10:00 am - 7:00 pm) & 10:15 AM Late Cutoff
 * Step 2: Mandatory Timely Check-Out for attendance record
 */
export default function DailyAttendanceNoticeModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);

  // Reset to step 1 whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  // Keyboard navigation: Escape to close, Arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && step === 1) {
        setStep(2);
      } else if (e.key === "ArrowLeft" && step === 2) {
        setStep(1);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, step, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  // Format date in IST
  const formattedToday = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  })();

  const rawUserName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-md select-none touch-manipulation"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-notice-title"
    >
      <div className="relative w-full max-w-[460px] max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all duration-200">
        {/* Top Slim Progress Accent Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden flex-shrink-0">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              step === 1
                ? "w-1/2 bg-gradient-to-r from-amber-500 to-orange-500"
                : "w-full bg-gradient-to-r from-blue-500 to-indigo-600"
            }`}
          />
        </div>

        {/* Compact Header Bar */}
        <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
          {/* Step Switcher Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                step === 1
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-300/60"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${step === 1 ? "bg-amber-500 animate-pulse" : "bg-slate-400"}`} />
              1. Office Hours
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                step === 2
                  ? "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 ring-1 ring-blue-300/60"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${step === 2 ? "bg-blue-500 animate-pulse" : "bg-slate-400"}`} />
              2. Check-Out
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Dismiss reminder"
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body (Scrolls only if screen is exceptionally short, like mobile landscape) */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* ================= STEP 1: OFFICE HOURS & 10:15 AM LATE LOGIN ================= */}
          {step === 1 && (
            <div key="step-1" className="p-3.5 sm:p-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Top Sub-Header: Badge & Date */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-[9.5px] sm:text-[10.5px] font-semibold">
                  <FiSun className="w-3 h-3 text-amber-500" />
                  Morning Protocol
                </span>
                <div className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  <FiCalendar className="w-3 h-3 text-slate-400" />
                  <span>{formattedToday}</span>
                </div>
              </div>

              {/* Title & Icon Header */}
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 flex-shrink-0">
                  <FiClock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="attendance-notice-title"
                    className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate"
                  >
                    Standard Office Hours
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Welcome, <span className="font-semibold text-slate-700 dark:text-slate-200">{rawUserName}</span>! Standard working hours and check-in cutoff.
                  </p>
                </div>
              </div>

              {/* Core Rule Highlight Banner */}
              <div className="relative rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent border border-amber-300 dark:border-amber-500/40 shadow-sm mb-2.5 sm:mb-3">
                <div className="absolute -top-2 left-2.5 sm:left-3 px-1.5 sm:px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <LuSparkles className="w-2.5 h-2.5" />
                  Official Shift Rule
                </div>

                <blockquote className="text-[12px] sm:text-[13.5px] font-bold text-slate-900 dark:text-amber-100 leading-snug mt-0.5">
                  Office hours is 10:00 am to 7:00 pm. Post login after 10:15 AM registers as late login.
                </blockquote>
              </div>

              {/* Compact Shift Timeline (3 Cards) */}
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-center mb-2.5 sm:mb-3">
                {/* 10:00 AM */}
                <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-300">10:00 AM</div>
                  <div className="text-[8.5px] sm:text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">Shift Start</div>
                  <div className="mt-0.5 sm:mt-1 text-[7.5px] sm:text-[8.5px] text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 rounded px-1 py-0.5 inline-block font-semibold">
                    ✓ On-Time
                  </div>
                </div>

                {/* 10:15 AM */}
                <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/40">
                  <div className="text-[10px] sm:text-[11px] font-bold text-amber-900 dark:text-amber-300">10:15 AM</div>
                  <div className="text-[8.5px] sm:text-[9.5px] text-amber-700 dark:text-amber-400 font-medium">Grace Cutoff</div>
                  <div className="mt-0.5 sm:mt-1 text-[7.5px] sm:text-[8.5px] text-amber-800 dark:text-amber-200 bg-amber-200/70 dark:bg-amber-900/60 rounded px-1 py-0.5 inline-block font-semibold">
                    ⏱ 15m Grace
                  </div>
                </div>

                {/* Post 10:15 AM */}
                <div className="p-1.5 sm:p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50">
                  <div className="text-[10px] sm:text-[11px] font-bold text-rose-800 dark:text-rose-300">&gt; 10:15 AM</div>
                  <div className="text-[8.5px] sm:text-[9.5px] text-rose-600 dark:text-rose-400 font-medium">Late Mark</div>
                  <div className="mt-0.5 sm:mt-1 text-[7.5px] sm:text-[8.5px] text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/60 rounded px-1 py-0.5 inline-block font-semibold">
                    ⚠️ Marked Late
                  </div>
                </div>
              </div>

              {/* Micro Takeaway Note */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mb-3 px-0.5">
                <FiInfo className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 flex-shrink-0" />
                <span>Check-ins recorded past 10:15 AM will automatically attach a late arrival flag.</span>
              </div>

              {/* Actions for Step 1 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Skip
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-1.5 group active:scale-[0.99]"
                >
                  <span>Next: Check-Out Policy</span>
                  <FiArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: TIMELY CHECK-OUT REMINDER ================= */}
          {step === 2 && (
            <div key="step-2" className="p-3.5 sm:p-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Top Sub-Header: Badge & Date */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-[9.5px] sm:text-[10.5px] font-semibold">
                  <FiMoon className="w-3 h-3 text-blue-500" />
                  Evening Departure
                </span>
                <div className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  <FiCalendar className="w-3 h-3 text-slate-400" />
                  <span>{formattedToday}</span>
                </div>
              </div>

              {/* Title & Icon Header */}
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                  <FiLogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                    Mandatory Check-Out
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Shift completion & accurate timesheet recording.
                  </p>
                </div>
              </div>

              {/* Core Rule Highlight Banner */}
              <div className="relative rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-300 dark:border-blue-500/40 shadow-sm mb-2.5 sm:mb-3">
                <div className="absolute -top-2 left-2.5 sm:left-3 px-1.5 sm:px-2 py-0.2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <LuSparkles className="w-2.5 h-2.5" />
                  Departure Reminder
                </div>

                <blockquote className="text-[12px] sm:text-[13.5px] font-bold text-slate-900 dark:text-blue-100 leading-snug mt-0.5">
                  Remember to check-out timely for attendance record.
                </blockquote>
              </div>

              {/* Compact Sample Timesheet Preview */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 mb-2.5 sm:mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[9px] sm:text-[10px]">
                    IN
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">10:00 AM</div>
                    <div className="text-[8.5px] sm:text-[9.5px] text-slate-400">Check-In</div>
                  </div>
                </div>

                <span className="text-slate-300 dark:text-slate-600 text-[10px] sm:text-xs">➔</span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-[9px] sm:text-[10px]">
                    OUT
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">07:00 PM</div>
                    <div className="text-[8.5px] sm:text-[9.5px] text-slate-400">Check-Out</div>
                  </div>
                </div>

                <div className="border-l border-slate-200 dark:border-slate-700 pl-2 sm:pl-2.5 text-right">
                  <div className="text-[10px] sm:text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">9.00 Hrs</div>
                  <div className="text-[7.5px] sm:text-[8.5px] font-semibold text-emerald-600/90 uppercase">✓ Verified</div>
                </div>
              </div>

              {/* Micro Takeaway Note */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mb-3 px-0.5">
                <FiInfo className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 flex-shrink-0" />
                <span>Always click 'Clock Out' on your dashboard before leaving to finalize hours.</span>
              </div>

              {/* Actions for Step 2 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  <FiArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-xs font-bold shadow-md shadow-slate-900/25 transition-all flex items-center justify-center gap-1.5 group active:scale-[0.99]"
                >
                  <FiCheck className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:scale-125" />
                  <span>Understood & Enter Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compact Sub-Footer */}
        <div className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9.5px] sm:text-[10px] text-slate-400 flex-shrink-0">
          <span>Step {step} of 2 • Daily Attendance Protocol</span>
          <span>Resets daily on portal login</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
