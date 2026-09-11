import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Spinner } from "react-bootstrap";
import { LuFingerprint, LuClock } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api";

export default function TodayClockWidget() {
  const [todayRecord, setTodayRecord] = useState(null);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(new Date());

  // Ticking clock for time remaining calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today status
  const fetchTodayStatus = async () => {
    try {
      const res = await api.get("/attendance/today-status");
      if (res.data?.success) {
        setTodayRecord(res.data.record || null);
      }
    } catch (err) {
      console.error("Error fetching today status:", err);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  // Calculate office time remaining (10:00 AM to 7:00 PM)
  const getCheckInTimeLeft = () => {
    const end = new Date(now);
    end.setHours(19, 0, 0, 0); // 7:00 PM

    const start = new Date(now);
    start.setHours(10, 0, 0, 0); // 10:00 AM

    if (now < start) {
      return "Office starts at 10:00 AM";
    }

    const diffMs = end - now;
    if (diffMs <= 0) {
      return "Office hours completed";
    }

    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Calculate gauge progress (% of 9 hour shift completed)
  const getTodayProgress = () => {
    if (!todayRecord || !todayRecord.check_in || todayRecord.check_in === "—") {
      return { percent: 0, label: "NOT MARKED" };
    }

    const checkInTime = new Date(`${todayRecord.date}T${todayRecord.check_in}`);
    const checkOutTime = (todayRecord.check_out && todayRecord.check_out !== "—")
      ? new Date(`${todayRecord.date}T${todayRecord.check_out}`)
      : now;

    const diffMs = Math.max(0, checkOutTime - checkInTime);
    const workedHours = diffMs / (1000 * 60 * 60);

    const totalShiftHours = 9; // 10 AM to 7 PM
    const percent = Math.min(100, Math.round((workedHours / totalShiftHours) * 100));

    return {
      percent,
      label: percent >= 70 ? "AVERAGE" : "IN PROGRESS"
    };
  };

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      const res = await api.post("/attendance/check-in");
      if (res.data?.success) {
        toast.success(res.data.message || "Checked in successfully!");
        fetchTodayStatus();
      } else {
        toast.error(res.data?.error || "Check-in failed");
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Check-in request failed";
      toast.error(errMsg);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    try {
      const res = await api.post("/attendance/check-out");
      if (res.data?.success) {
        toast.success(res.data.message || "Checked out successfully!");
        fetchTodayStatus();
      } else {
        toast.error(res.data?.error || "Check-out failed");
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Check-out request failed";
      toast.error(errMsg);
    } finally {
      setChecking(false);
    }
  };

  const todayProgress = getTodayProgress();

  return (
    <Card className="border-0 shadow-sm rounded-4 p-5 bg-white h-100 d-flex flex-column justify-content-between">
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold text-dark m-0" style={{ fontSize: "18px", color: "#0f172a" }}>Today</h5>
          <Badge bg={todayRecord ? "primary" : "secondary"} className="px-3 py-1.5 rounded-pill font-semibold text-xs">
            {todayRecord ? "Present" : "Not Marked"}
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
              {todayRecord
                ? "You have marked yourself as present today!"
                : "You have not marked yourself as present today!"
              }
            </p>

            <div className="d-flex align-items-center mt-1" style={{ borderLeft: "3px solid #ef4444", paddingLeft: "8px" }}>
              <span className="text-dark font-semibold me-1 text-[12px]">Time left :</span>
              <strong style={{ fontSize: "12px", color: "#ef4444", fontWeight: "700" }}>{getCheckInTimeLeft()}</strong>
            </div>
          </div>

          {/* SVG Gauge Donut Circle */}
          <div className="position-relative d-inline-flex justify-content-center align-items-center w-[125px] h-[125px]">
            <svg width="115" height="115" viewBox="0 0 115 115">
              <circle cx="57.5" cy="57.5" r={42} fill="transparent" stroke="#f1f5f9" strokeWidth="7" />
              <circle cx="57.5" cy="57.5" r={42} fill="transparent"
                stroke={todayProgress.percent >= 80 ? "#22c55e" : todayProgress.percent >= 50 ? "#eab308" : "#f59e0b"}
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
              <div style={{ fontWeight: "700", color: "#eab308", marginTop: "2px", fontSize: "10px" }}>{todayProgress.label}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {(() => {
          if (checking) {
            return (
              <Button variant="primary" disabled className="w-100 py-2.5 rounded-3 fw-semibold shadow-xs">
                <Spinner animation="border" size="sm" className="me-2" />
                Processing...
              </Button>
            );
          }
          if (!todayRecord) {
            return (
              <Button variant="primary" className="w-100 py-2.5 rounded-3 fw-semibold shadow-xs bg-blue-600 hover:bg-blue-700" onClick={handleCheckIn}>
                Mark Present
              </Button>
            );
          }
          if (!todayRecord.check_out || todayRecord.check_out === "—") {
            return (
              <Button variant="danger" className="w-100 py-2.5 rounded-3 fw-semibold shadow-xs bg-red-600 hover:bg-red-700" onClick={handleCheckOut}>
                Clock Out
              </Button>
            );
          }
          return (
            <Button variant="secondary" disabled className="w-100 py-2.5 rounded-3 fw-semibold opacity-75">
              Completed Today
            </Button>
          );
        })()}
      </div>
    </Card>
  );
}
