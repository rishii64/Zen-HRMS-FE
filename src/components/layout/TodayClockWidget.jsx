import React, { useState, useEffect } from "react";
import { Card, Badge, Modal, Button, Spinner } from "react-bootstrap";
import {
  LuFingerprint,
  LuLogOut
} from "react-icons/lu";
import { FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api";

export default function TodayClockWidget({ onStatusChange }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [now, setNow] = useState(new Date());
  const [checkingOut, setCheckingOut] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Ticking clock for time remaining calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today status and auto-check in if not yet registered for today
  const fetchTodayStatus = async () => {
    try {
      const res = await api.get("/attendance/today-status");
      if (res.data?.success) {
        let record = res.data.record || null;
        if (res.data.schedule) {
          setSchedule(res.data.schedule);
        }

        // Auto-check in on portal load if user is logged into portal and not yet marked today
        if (!record || !record.check_in || record.check_in === "—") {
          try {
            const checkInRes = await api.post("/attendance/check-in");
            if (checkInRes.data?.success && checkInRes.data.record) {
              record = checkInRes.data.record;
              if (onStatusChange) onStatusChange();
            }
          } catch (_) { }
        }

        setTodayRecord(record);
      }
    } catch (err) {
      console.error("Error fetching today status:", err);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    window.addEventListener("authChanged", fetchTodayStatus);
    window.addEventListener("attendanceChanged", fetchTodayStatus);
    return () => {
      window.removeEventListener("authChanged", fetchTodayStatus);
      window.removeEventListener("attendanceChanged", fetchTodayStatus);
    };
  }, []);

  // Safely parses a shift time string (24h or 12h or with fallbacks) into valid { h, m }
  const parseShiftTime = (timeStr, defaultH = 10, defaultM = 0) => {
    if (!timeStr || typeof timeStr !== "string") {
      return { h: defaultH, m: defaultM };
    }
    const trimmed = timeStr.trim();
    if (trimmed === "—" || trimmed === "-" || !trimmed.includes(":")) {
      return { h: defaultH, m: defaultM };
    }

    const isPM = /pm/i.test(trimmed);
    const isAM = /am/i.test(trimmed);
    const clean = trimmed.replace(/[^\d:]/g, "").trim();
    const parts = clean.split(":");
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);

    if (isNaN(h)) h = defaultH;
    if (isNaN(m)) m = defaultM;

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    return { h, m };
  };

  // Format check-in time string to 12-hour format e.g. "10:15 AM"
  const formatCheckInTime = (timeStr) => {
    if (!timeStr || timeStr === "—" || typeof timeStr !== "string") return null;
    try {
      const { h, m } = parseShiftTime(timeStr, 10, 0);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 || 12;
      const displayM = String(m).padStart(2, "0");
      return `${displayH}:${displayM} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Calculate office time remaining based on assigned shift (e.g. 10:00 to 19:00)
  const getCheckInTimeLeft = () => {
    if (todayRecord?.check_out && todayRecord.check_out !== "—") {
      return "Shift completed";
    }

    const rawShiftStart = todayRecord?.shift_start || schedule?.start_time;
    const rawShiftEnd = todayRecord?.shift_end || schedule?.end_time;

    const { h: startH, m: startM } = parseShiftTime(rawShiftStart, 10, 0);
    const { h: endH, m: endM } = parseShiftTime(rawShiftEnd, 19, 0);

    const start = new Date(now);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(now);
    end.setHours(endH, endM, 0, 0);

    // Support overnight shifts
    if (end <= start) {
      if (now >= start) {
        end.setDate(end.getDate() + 1);
      } else {
        start.setDate(start.getDate() - 1);
      }
    }

    if (now < start) {
      const displayStart = formatCheckInTime(rawShiftStart) || "10:00 AM";
      return `Office starts at ${displayStart}`;
    }

    const diffMs = end.getTime() - now.getTime();
    if (isNaN(diffMs) || diffMs <= 0) {
      return "Office hours completed";
    }

    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (isNaN(hrs) || isNaN(mins) || isNaN(secs)) {
      return "Office hours completed";
    }

    return `${hrs}h ${mins}m ${secs}s`;
  };

  const isMarked = Boolean(todayRecord && todayRecord.check_in && todayRecord.check_in !== "—" && todayRecord.status !== "Absent");
  const isCheckedOut = Boolean(todayRecord && todayRecord.check_out && todayRecord.check_out !== "—");

  // Calculate elapsed active duration for modal summary
  const getElapsedDuration = () => {
    if (!todayRecord?.check_in || todayRecord.check_in === "—") return "0h 0m";
    const recordDate = todayRecord.date || new Date().toISOString().split("T")[0];
    let checkInTime = new Date(`${recordDate}T${todayRecord.check_in}`);
    if (isNaN(checkInTime.getTime())) {
      const { h: ciH, m: ciM } = parseShiftTime(todayRecord.check_in, 10, 0);
      checkInTime = new Date(now);
      checkInTime.setHours(ciH, ciM, 0, 0);
    }
    const endRef = (todayRecord.check_out && todayRecord.check_out !== "—")
      ? new Date(`${recordDate}T${todayRecord.check_out}`)
      : now;
    const diffMs = Math.max(0, endRef.getTime() - checkInTime.getTime());
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  // Dedicated check-out action
  const handleCheckOut = async () => {
    if (checkingOut) return;
    setCheckingOut(true);
    try {
      const res = await api.post("/attendance/check-out");
      if (res.data?.success && res.data.record) {
        setTodayRecord(res.data.record);
        setShowConfirmModal(false);
        try {
          toast.success("Checked out successfully for today!");
        } catch (_) { }
        if (onStatusChange) onStatusChange();
        window.dispatchEvent(new Event("attendanceChanged"));
        window.dispatchEvent(new Event("authChanged"));
      } else {
        toast.error(res.data?.error || "Failed to record check-out");
      }
    } catch (err) {
      console.error("Check-out error:", err);
      toast.error(err?.response?.data?.error || "Failed to record check-out. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  // Calculate gauge progress (% of assigned shift completed)
  const getTodayProgress = () => {
    if (!isMarked) {
      return { percent: 0, label: "NOT MARKED" };
    }

    const recordDate = todayRecord.date || new Date().toISOString().split("T")[0];
    let checkInTime = new Date(`${recordDate}T${todayRecord.check_in}`);
    if (isNaN(checkInTime.getTime())) {
      const { h: ciH, m: ciM } = parseShiftTime(todayRecord.check_in, 10, 0);
      checkInTime = new Date(now);
      checkInTime.setHours(ciH, ciM, 0, 0);
    }

    let checkOutTime = now;
    if (todayRecord.check_out && todayRecord.check_out !== "—") {
      checkOutTime = new Date(`${recordDate}T${todayRecord.check_out}`);
      if (isNaN(checkOutTime.getTime())) {
        const { h: coH, m: coM } = parseShiftTime(todayRecord.check_out, 19, 0);
        checkOutTime = new Date(now);
        checkOutTime.setHours(coH, coM, 0, 0);
      }
    }

    const diffMs = Math.max(0, checkOutTime.getTime() - checkInTime.getTime());
    const workedHours = isNaN(diffMs) ? 0 : diffMs / (1000 * 60 * 60);

    const rawShiftStart = todayRecord.shift_start || schedule?.start_time;
    const rawShiftEnd = todayRecord.shift_end || schedule?.end_time;
    const { h: sH, m: sM } = parseShiftTime(rawShiftStart, 10, 0);
    const { h: eH, m: eM } = parseShiftTime(rawShiftEnd, 19, 0);

    let totalShiftHours = ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    if (totalShiftHours <= 0) totalShiftHours += 24;
    if (isNaN(totalShiftHours) || totalShiftHours <= 0) totalShiftHours = 9;

    const percent = Math.min(100, Math.max(0, Math.round((workedHours / totalShiftHours) * 100)));

    if (todayRecord.check_out && todayRecord.check_out !== "—") {
      return {
        percent: isNaN(percent) ? 100 : percent,
        label: "COMPLETED"
      };
    }

    return {
      percent: isNaN(percent) ? 0 : percent,
      label: percent >= 70 ? "AVERAGE" : "IN PROGRESS"
    };
  };

  const todayProgress = getTodayProgress();

  return (
    <Card className="top-widget-card border-0 shadow-sm rounded-4 p-4 bg-white dark:!bg-slate-900 h-100 d-flex flex-column justify-content-between">
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold m-0 text-slate-900 dark:text-slate-100" style={{ fontSize: "18px" }}>Today</h5>
          <Badge
            pill
            style={{
              backgroundColor: isMarked
                ? (todayRecord?.check_out && todayRecord.check_out !== "—" ? "#6366f1" : "#16a34a")
                : "#ef4444",
              color: "#ffffff",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "600"
            }}
          >
            {isMarked
              ? (todayRecord?.check_out && todayRecord.check_out !== "—" ? "Completed" : "Present")
              : "Not Marked"}
          </Badge>
        </div>
        <hr className="my-3 border-slate-200 dark:border-slate-800 opacity-60" />

        <div className="d-flex align-items-center justify-content-between py-1">
          {/* Left Icon & Text */}
          <div className="d-flex flex-column gap-2" style={{ maxWidth: "58%" }}>
            <div className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60" style={{ width: "42px", height: "42px" }}>
              <LuFingerprint size={22} style={{ color: "#2563eb" }} />
            </div>
            <p className="text-slate-900 dark:text-slate-100 mb-0 font-bold" style={{ fontSize: "13px", lineHeight: "1.35" }}>
              {isMarked
                ? (todayRecord?.check_out && todayRecord.check_out !== "—"
                  ? "Shift completed for today!"
                  : "You are marked present today!")
                : "Not marked present today"
              }
            </p>

            <div className="d-flex flex-column gap-1.5 mt-1">
              {todayRecord?.check_in && todayRecord.check_in !== "—" && (
                <div className="d-flex align-items-center" style={{ borderLeft: "3px solid #10b981", paddingLeft: "8px" }}>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold me-1 text-[11px]">Checked-in :</span>
                  <strong style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>
                    {formatCheckInTime(todayRecord.check_in)}
                  </strong>
                </div>
              )}

              {todayRecord?.check_out && todayRecord.check_out !== "—" && (
                <div className="d-flex align-items-center" style={{ borderLeft: "3px solid #6366f1", paddingLeft: "8px" }}>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold me-1 text-[11px]">Checked-out :</span>
                  <strong style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "700" }}>
                    {formatCheckInTime(todayRecord.check_out)}
                  </strong>
                </div>
              )}

              <div className="d-flex align-items-center" style={{ borderLeft: "3px solid #ef4444", paddingLeft: "8px" }}>
                <span className="text-slate-700 dark:text-slate-300 font-semibold me-1 text-[11px]">Time left :</span>
                <strong style={{ fontSize: "11px", color: "#ef4444", fontWeight: "700" }}>{getCheckInTimeLeft()}</strong>
              </div>
            </div>
          </div>

          {/* SVG Gauge Donut Circle */}
          <div className="position-relative d-inline-flex justify-content-center align-items-center w-[125px] h-[125px]">
            <svg width="115" height="115" viewBox="0 0 115 115">
              <circle cx="57.5" cy="57.5" r={42} fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="7" />
              <circle cx="57.5" cy="57.5" r={42} fill="transparent"
                stroke={todayProgress.percent > 0 ? (todayProgress.percent >= 80 ? "#22c55e" : todayProgress.percent >= 50 ? "#eab308" : "#f59e0b") : "transparent"}
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 - (todayProgress.percent / 100) * 2 * Math.PI * 42}
                strokeLinecap="round"
                transform="rotate(-90 57.5 57.5)"
              />
            </svg>
            <div className="position-absolute text-center">
              <div className="fw-bold text-slate-900 dark:text-slate-100" style={{ fontSize: "20px", lineHeight: "1" }}>{todayProgress.percent}%</div>
              <div className="fw-semibold text-slate-600 dark:text-slate-300 mt-0.5 text-[11px]">in office</div>
              <div style={{
                fontWeight: "700",
                color: todayProgress.percent >= 80 ? "#16a34a" : todayProgress.percent >= 50 ? "#ca8a04" : todayProgress.percent > 0 ? "#d97706" : "#94a3b8",
                marginTop: "2px",
                fontSize: "11px"
              }}>
                {todayProgress.label}
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Check-Out Action Area */}
        {isMarked && !isCheckedOut && (
          <div className="mt-2">
            <button
              type="button"
              id="btn-dedicated-checkout"
              onClick={() => setShowConfirmModal(true)}
              disabled={checkingOut}
              className="w-100 btn d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-3 font-bold shadow-sm"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                letterSpacing: "0.02em",
                boxShadow: "0 3px 10px rgba(220, 38, 38, 0.25)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 5px 14px rgba(220, 38, 38, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 3px 10px rgba(220, 38, 38, 0.25)";
              }}
            >
              <LuLogOut size={16} />
              <span>{checkingOut ? "Checking Out..." : "Check-Out"}</span>
            </button>
          </div>
        )}

        {/* Completed Shift Banner */}
        {isMarked && isCheckedOut && (
          <div className="mt-2">
            <div
              className="w-100 d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-3 font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <FiCheckCircle size={15} style={{ color: "#6366f1" }} />
              <span>Shift Concluded • Checked out at {formatCheckInTime(todayRecord.check_out)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Auto attendance status indicator */}
      <div className="pt-2.5 d-flex align-items-center justify-content-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="d-flex align-items-center gap-1.5">
          <span
            className="rounded-circle d-inline-block"
            style={{
              width: "7px",
              height: "7px",
              backgroundColor: isMarked
                ? (isCheckedOut ? "#6366f1" : "#10b981")
                : "#94a3b8"
            }}
          ></span>
          <span className="text-slate-500 dark:text-slate-400 fw-medium">
            {isCheckedOut ? "Shift completed today" : "Auto-check-in • Manual check-out"}
          </span>
        </div>
        <span
          className="fw-bold"
          style={{
            fontSize: "11px",
            color: isMarked
              ? (isCheckedOut ? "#4f46e5" : "#059669")
              : "#64748b"
          }}
        >
          {isMarked
            ? (isCheckedOut ? "Checked Out" : "Active Session")
            : "Synced"}
        </span>
      </div>

      {/* Check-Out Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        onHide={() => !checkingOut && setShowConfirmModal(false)}
        centered
        backdrop="static"
        keyboard={!checkingOut}
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <div className="p-4 bg-white">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: "46px",
                height: "46px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fee2e2"
              }}
            >
              <LuLogOut size={22} style={{ color: "#dc2626" }} />
            </div>
            <div>
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "17px" }}>Confirm Check-Out</h5>
              <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
                Ready to conclude your shift for today?
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-3 mb-3"
            style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted font-medium" style={{ fontSize: "12px" }}>Check-In Time:</span>
              <strong className="text-dark" style={{ fontSize: "13px" }}>
                {formatCheckInTime(todayRecord?.check_in) || "—"}
              </strong>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted font-medium" style={{ fontSize: "12px" }}>Check-Out Time:</span>
              <strong style={{ fontSize: "13px", color: "#dc2626" }}>
                {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </strong>
            </div>
            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-slate-200">
              <span className="text-muted font-medium" style={{ fontSize: "12px" }}>Active Duration:</span>
              <strong style={{ fontSize: "13px", color: "#2563eb" }}>
                {getElapsedDuration()}
              </strong>
            </div>
          </div>

          <div className="d-flex align-items-start gap-2 mb-3 px-1 text-slate-500" style={{ fontSize: "11.5px" }}>
            <FiAlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              Checking out will finalize your attendance record and calculate your total work hours for today.
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top">
            <Button
              variant="light"
              disabled={checkingOut}
              onClick={() => setShowConfirmModal(false)}
              className="px-3 py-2 rounded-3 fw-semibold border text-secondary"
              style={{ fontSize: "13px" }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={checkingOut}
              onClick={handleCheckOut}
              className="px-4 py-2 rounded-3 fw-semibold d-flex align-items-center gap-2 text-white border-0 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                fontSize: "13px"
              }}
            >
              {checkingOut ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  <span>Checking Out...</span>
                </>
              ) : (
                <>
                  <LuLogOut size={15} />
                  <span>Yes, Check Out</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
