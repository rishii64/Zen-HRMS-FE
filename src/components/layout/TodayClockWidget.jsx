import React, { useState, useEffect } from "react";
import { Card, Badge } from "react-bootstrap";
import { LuFingerprint } from "react-icons/lu";
import api from "../../api";

export default function TodayClockWidget({ onStatusChange }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [now, setNow] = useState(new Date());

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
          } catch (_) {}
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
    return () => window.removeEventListener("authChanged", fetchTodayStatus);
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
    <Card className="top-widget-card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold text-dark m-0" style={{ fontSize: "18px", color: "#0f172a" }}>Today</h5>
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
        <hr style={{ borderColor: "#e2e8f0", opacity: 0.8, margin: "12px 0 20px 0" }} />

        <div className="d-flex align-items-center justify-content-between py-1">
          {/* Left Icon & Text */}
          <div className="d-flex flex-column gap-2" style={{ maxWidth: "58%" }}>
            <div className="p-2.5 rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: "42px", height: "42px", border: "1.5px solid #3b82f6", background: "#eff6ff" }}>
              <LuFingerprint size={22} style={{ color: "#2563eb" }} />
            </div>
            <p className="text-dark mb-0 font-bold" style={{ fontSize: "13px", lineHeight: "1.35" }}>
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
                  <span className="text-dark font-semibold me-1 text-[11px]">Checked-in :</span>
                  <strong style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>
                    {formatCheckInTime(todayRecord.check_in)}
                  </strong>
                </div>
              )}

              {todayRecord?.check_out && todayRecord.check_out !== "—" && (
                <div className="d-flex align-items-center" style={{ borderLeft: "3px solid #6366f1", paddingLeft: "8px" }}>
                  <span className="text-dark font-semibold me-1 text-[11px]">Checked-out :</span>
                  <strong style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "700" }}>
                    {formatCheckInTime(todayRecord.check_out)}
                  </strong>
                </div>
              )}

              <div className="d-flex align-items-center" style={{ borderLeft: "3px solid #ef4444", paddingLeft: "8px" }}>
                <span className="text-dark font-semibold me-1 text-[11px]">Time left :</span>
                <strong style={{ fontSize: "11px", color: "#ef4444", fontWeight: "700" }}>{getCheckInTimeLeft()}</strong>
              </div>
            </div>
          </div>

          {/* SVG Gauge Donut Circle */}
          <div className="position-relative d-inline-flex justify-content-center align-items-center w-[125px] h-[125px]">
            <svg width="115" height="115" viewBox="0 0 115 115">
              <circle cx="57.5" cy="57.5" r={42} fill="transparent" stroke="#f1f5f9" strokeWidth="7" />
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
              <div className="fw-bold text-dark" style={{ color: "#0f172a", fontSize: "20px", lineHeight: "1" }}>{todayProgress.percent}%</div>
              <div className="fw-bold text-dark mt-0.5 text-[11px]">in office</div>
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
      </div>

      {/* Auto attendance status indicator */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 d-flex align-items-center justify-content-between text-[11px] text-slate-500">
        <div className="d-flex align-items-center gap-1.5">
          <span
            className="rounded-circle d-inline-block"
            style={{
              width: "7px",
              height: "7px",
              backgroundColor: isMarked
                ? (todayRecord?.check_out && todayRecord.check_out !== "—" ? "#6366f1" : "#10b981")
                : "#94a3b8"
            }}
          ></span>
          <span className="text-muted fw-medium">Auto-recorded on login & logout</span>
        </div>
        <span
          className="fw-bold"
          style={{
            fontSize: "11px",
            color: isMarked
              ? (todayRecord?.check_out && todayRecord.check_out !== "—" ? "#4f46e5" : "#059669")
              : "#64748b"
          }}
        >
          {isMarked
            ? (todayRecord?.check_out && todayRecord.check_out !== "—" ? "Checked Out" : "Active Session")
            : "Synced"}
        </span>
      </div>
    </Card>
  );
}
