import React, { useState } from "react";
import { Row, Col, Card, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import TodayClockWidget from "../../../components/layout/TodayClockWidget";
import {
  LuClock,
  LuArrowUpRight,
  LuUserCheck,
  LuLogOut
} from "react-icons/lu";

export default function CommonAttendanceTop({
  employee,
  attendanceLogs = [],
  tickingTime = new Date(),
  pendingLeavesCount = 0,
  onStatusChange
}) {
  // Resolve authenticated user employee ID for strict personal log filtering
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myEmpId = (
    employee?.empId ||
    storedUser.employee_id ||
    storedUser.empId ||
    localStorage.getItem("empId") ||
    localStorage.getItem("employee_id") || ""
  ).trim().toLowerCase();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const totalRosterDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Filter logs strictly for current user and current month
  const userMonthLogs = (attendanceLogs || []).filter((log) => {
    // If log has employee_id, verify it matches myEmpId
    if (log.employee_id && myEmpId && myEmpId !== "n/a") {
      const logEmpId = String(log.employee_id).trim().toLowerCase();
      if (logEmpId !== myEmpId) return false;
    }
    // Match current month & year
    if (log.date) {
      const parts = String(log.date).split("-");
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y !== currentYear || m !== currentMonth) return false;
      }
    }
    return true;
  });

  // Deduplicate by date (keep entry with checkout or work_hours if multiple exist)
  const uniqueMonthLogs = Object.values(
    userMonthLogs.reduce((acc, log) => {
      const dKey = log.date || log.id;
      if (!acc[dKey]) {
        acc[dKey] = log;
      } else {
        if ((log.check_out && !acc[dKey].check_out) || (parseFloat(log.work_hours || 0) > parseFloat(acc[dKey].work_hours || 0))) {
          acc[dKey] = log;
        }
      }
      return acc;
    }, {})
  );

  // Metrics calculation from personal current month attendance logs
  const calculateAverageHours = () => {
    const validLogs = uniqueMonthLogs.filter(
      (log) => log.work_hours && parseFloat(log.work_hours) > 0
    );
    if (validLogs.length === 0) return "—";
    const totalMinutes = validLogs.reduce(
      (sum, log) => sum + parseFloat(log.work_hours) * 60,
      0
    );
    const avgMinutes = totalMinutes / validLogs.length;
    const hrs = Math.floor(avgMinutes / 60);
    const mins = Math.round(avgMinutes % 60);
    return `${hrs}h ${mins}mins`;
  };

  const calculateOnTimeRate = () => {
    const presentLogs = uniqueMonthLogs.filter(
      (log) =>
        log.status === "Present" ||
        log.status === "On Time" ||
        log.status === "Late Present" ||
        log.status === "Late" ||
        log.status === "WFH" ||
        log.status === "Work from home"
    );
    if (presentLogs.length === 0) {
      return "0 %";
    }
    const onTimeLogs = presentLogs.filter(
      (log) =>
        (log.status === "Present" || log.status === "On Time") && !log.late_count
    );
    return ((onTimeLogs.length / presentLogs.length) * 100).toFixed(2) + " %";
  };

  const calculateAverageCheckIn = () => {
    const validLogs = uniqueMonthLogs.filter((log) => log.check_in && log.check_in !== "—");
    if (validLogs.length === 0) return "—";
    let totalMinutes = 0;
    validLogs.forEach((log) => {
      const parts = log.check_in.split(":");
      totalMinutes += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    });
    const avgMinutes = totalMinutes / validLogs.length;
    let hrs = Math.floor(avgMinutes / 60);
    const mins = Math.round(avgMinutes % 60);
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12 || 12;
    return `${hrs}:${mins < 10 ? "0" + mins : mins} ${ampm}`;
  };

  const calculateAverageCheckOut = () => {
    const validLogs = uniqueMonthLogs.filter(
      (log) => log.check_out && log.check_out !== "—" && log.check_out !== ""
    );
    if (validLogs.length === 0) return "—";
    let totalMinutes = 0;
    validLogs.forEach((log) => {
      const parts = log.check_out.split(":");
      totalMinutes += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    });
    const avgMinutes = totalMinutes / validLogs.length;
    let hrs = Math.floor(avgMinutes / 60);
    const mins = Math.round(avgMinutes % 60);
    const ampm = hrs >= 12 ? "PM" : "AM";
    const displayHrs = hrs % 12 || 12;
    return `${displayHrs < 10 ? "0" + displayHrs : displayHrs}:${mins < 10 ? "0" + mins : mins} ${ampm}`;
  };

  const getGreeting = () => {
    const nameStr = (employee?.name || localStorage.getItem("userName") || "Team").trim();
    const twoWordMatch = nameStr.match(/^([^ ]+ [^ ]+)/);
    const displayName = twoWordMatch ? twoWordMatch[1] : nameStr;
    const hrs = tickingTime.getHours();
    if (hrs < 12) return `Good morning, ${displayName}!`;
    if (hrs < 17) return `Good afternoon, ${displayName}!`;
    return `Good evening, ${displayName}!`;
  };

  const formatCurrentTimeFormatted = (d) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthName = months[d.getMonth()] || "Jan";
    const day = d.getDate();
    const year = d.getFullYear();
    let hrs = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, "0");
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12 || 12;
    return `${day} ${monthName} ${year}, ${hrs}:${mins} ${ampm}`;
  };

  // Attendance metrics counts strictly for logged-in user in current month
  const onTimeCount = uniqueMonthLogs.filter((log) => log.status === "Present" || log.status === "On Time").length;
  const wfhCount = uniqueMonthLogs.filter((log) => log.status === "WFH" || log.status === "Work from home").length;
  const lateCount = uniqueMonthLogs.filter((log) => log.status === "Late Present" || log.status === "Late").length;
  const absentCount = uniqueMonthLogs.filter((log) => log.status === "Absent").length;
  const totalPresentCount = onTimeCount + wfhCount + lateCount;

  // Donut chart geometry calculations (circumference & rotation angles)
  const donutCircumference = 2 * Math.PI * 52;
  const onTimeDash = totalRosterDays > 0 ? (onTimeCount / totalRosterDays) * donutCircumference : 0;
  const wfhDash = totalRosterDays > 0 ? (wfhCount / totalRosterDays) * donutCircumference : 0;
  const lateDash = totalRosterDays > 0 ? (lateCount / totalRosterDays) * donutCircumference : 0;

  const onTimeAngle = -90;
  const wfhAngle = onTimeAngle + (totalRosterDays > 0 ? (onTimeCount / totalRosterDays) * 360 : 0);
  const lateAngle = wfhAngle + (totalRosterDays > 0 ? (wfhCount / totalRosterDays) * 360 : 0);

  // Determine role: default from localStorage
  const storedRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const [currentRole, setCurrentRole] = useState(storedRole);

  return (
    <div className="common-attendance-section mb-5">
      {/* TOP HEADER & GREETINGS ROW */}
      <Row className="mb-4 align-items-center g-3">
        <Col xs={12} md={8}>
          <h2
            className="fw-bold text-dark m-0 text-[26px] md:text-[28px]"
            style={{ letterSpacing: "-0.5px" }}
          >
            {getGreeting()}
          </h2>
          <Badge bg="primary-subtle" className="text-primary rounded-pill px-2.5 py-1 text-[10px] font-bold" >
            {currentRole === "hr" ? "HR" : currentRole === "accounts" ? "Accounts" : currentRole === "hod" ? "HOD" : currentRole === "admin" ? "Admin" : "Employee"}
          </Badge>
          {/* <p className="text-dark mb-0 mt-1 text-[14px] font-medium">
            You have {pendingLeavesCount} leave request pending.
          </p> */}
        </Col>
        <Col xs={12} md={4} className="d-flex justify-content-md-end">
          <Card className="border-0 shadow-sm rounded-4 px-3.5 py-2 bg-white d-flex flex-row align-items-center gap-3">
            <div>
              <div
                className="text-muted"
                style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8" }}
              >
                Current time
              </div>
              <div
                className="fw-bold text-dark"
                style={{ fontSize: "14px", color: "#1e293b" }}
              >
                {formatCurrentTimeFormatted(tickingTime)}
              </div>
            </div>
            <div
              className="p-2 bg-light rounded-circle text-primary d-flex align-items-center justify-content-center"
              style={{
                width: "36px",
                height: "36px",
                border: "1px dashed #cbd5e1"
              }}
            >
              <LuClock size={18} style={{ color: "#1e293b" }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* MAIN ATTENDANCE & KPI 3-COLUMN BOARD */}
      <Row className="g-3 align-items-stretch">
        {/* Card 1: Today Clock Widget */}
        <Col xs={12} lg={4}>
          <TodayClockWidget onStatusChange={onStatusChange} />
        </Col>

        {/* Card 2 & 3: Middle KPI 2x2 Grid */}
        <Col xs={12} lg={4} className="d-flex flex-column gap-3">
          <Row className="g-3 flex-grow-1">
            {/* Average Hours Card */}
            <Col xs={6}>
              <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                <div
                  className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: "38px",
                    height: "38px",
                    background: "#eff6ff",
                    border: "1px dashed #bfdbfe"
                  }}
                >
                  <LuClock size={20} style={{ color: "#2563eb" }} />
                </div>
                <div className="mt-3">
                  <div
                    className="text-slate-700 fw-semibold"
                    style={{ fontSize: "12px" }}
                  >
                    Average hours
                  </div>
                  <h4
                    className="fw-bold text-dark m-0 mt-1"
                    style={{ fontSize: "22px" }}
                  >
                    {calculateAverageHours()}
                  </h4>
                </div>
              </Card>
            </Col>

            {/* Average Check-in Card */}
            <Col xs={6}>
              <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                <div
                  className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: "38px",
                    height: "38px",
                    background: "#eff6ff",
                    border: "1px dashed #bfdbfe"
                  }}
                >
                  <LuArrowUpRight size={20} style={{ color: "#2563eb" }} />
                </div>
                <div className="mt-3">
                  <div
                    className="text-slate-700 fw-semibold"
                    style={{ fontSize: "12px" }}
                  >
                    Average log-in
                  </div>
                  <h4
                    className="fw-bold text-dark m-0 mt-1"
                    style={{ fontSize: "22px" }}
                  >
                    {calculateAverageCheckIn()}
                  </h4>
                </div>
              </Card>
            </Col>

            {/* On-Time Arrival Card */}
            <Col xs={6}>
              <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                <div
                  className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: "38px",
                    height: "38px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0"
                  }}
                >
                  <LuUserCheck size={20} style={{ color: "#16a34a" }} />
                </div>
                <div className="mt-3">
                  <div
                    className="text-slate-700 fw-semibold"
                    style={{ fontSize: "12px" }}
                  >
                    On-time arrival
                  </div>
                  <h4
                    className="fw-bold text-success m-0 mt-1"
                    style={{ fontSize: "22px" }}
                  >
                    {calculateOnTimeRate()}
                  </h4>
                </div>
              </Card>
            </Col>

            {/* Average Check-out Card */}
            <Col xs={6}>
              <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                <div
                  className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: "38px",
                    height: "38px",
                    background: "#fff7ed",
                    border: "1px solid #fed7aa"
                  }}
                >
                  <LuLogOut size={20} style={{ color: "#ea580c" }} />
                </div>
                <div className="mt-3">
                  <div
                    className="text-slate-700 fw-semibold"
                    style={{ fontSize: "12px" }}
                  >
                    Average log-out
                  </div>
                  <h4
                    className="fw-bold text-dark m-0 mt-1"
                    style={{ fontSize: "22px" }}
                  >
                    {calculateAverageCheckOut()}
                  </h4>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Card 4: My Attendance breakdown */}
        <Col xs={12} lg={4}>
          <Card className="top-widget-card shadow-sm p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5
                  className="fw-bold text-dark m-0"
                  style={{ fontSize: "18px", color: "#0f172a" }}
                >
                  My Attendance
                </h5>
                <Link
                  to="/attendance"
                  className="small fw-semibold text-primary text-decoration-none"
                  style={{ color: "#2563eb", fontSize: "13px" }}
                >
                  View Stats
                </Link>
              </div>
              <hr
                style={{
                  borderColor: "#e2e8f0",
                  opacity: 0.8,
                  margin: "12px 0 20px 0"
                }}
              />

              <div className="d-flex align-items-center justify-content-between">
                {/* Metrics legend */}
                <div className="d-flex flex-column gap-2" style={{ fontSize: "13px" }}>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#22c55e"
                      }}
                    ></span>
                    <span className="text-slate-800 font-semibold">
                      <strong className="text-dark">
                        {onTimeCount.toLocaleString()}
                      </strong>{" "}
                      on time
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#eab308"
                      }}
                    ></span>
                    <span className="text-slate-800 font-semibold">
                      <strong className="text-dark">
                        {wfhCount.toLocaleString()}
                      </strong>{" "}
                      Work from Home
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#ef4444"
                      }}
                    ></span>
                    <span className="text-slate-800 font-semibold">
                      <strong className="text-dark">
                        {lateCount.toLocaleString()}
                      </strong>{" "}
                      Late check-in
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#94a3b8"
                      }}
                    ></span>
                    <span className="text-slate-800 font-semibold">
                      <strong className="text-dark">
                        {absentCount.toLocaleString()}
                      </strong>{" "}
                      Absent
                    </span>
                  </div>
                </div>

                {/* Donut chart for My Attendance */}
                <div
                  className="position-relative d-inline-flex justify-content-center align-items-center"
                  style={{ width: "135px", height: "135px" }}
                >
                  <svg width="145" height="145" viewBox="0 0 145 145">
                    <circle
                      cx="67.5"
                      cy="67.5"
                      r="52"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="11"
                    />
                    {/* On time green arc */}
                    {onTimeCount > 0 && (
                      <circle
                        cx="67.5"
                        cy="67.5"
                        r="52"
                        fill="transparent"
                        stroke="#22c55e"
                        strokeWidth="11"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutCircumference - onTimeDash}
                        strokeLinecap="round"
                        transform={`rotate(${onTimeAngle} 67.5 67.5)`}
                      />
                    )}
                    {/* WFH yellow arc */}
                    {wfhCount > 0 && (
                      <circle
                        cx="67.5"
                        cy="67.5"
                        r="52"
                        fill="transparent"
                        stroke="#eab308"
                        strokeWidth="11"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutCircumference - wfhDash}
                        strokeLinecap="round"
                        transform={`rotate(${wfhAngle} 67.5 67.5)`}
                      />
                    )}
                    {/* Late red arc */}
                    {lateCount > 0 && (
                      <circle
                        cx="67.5"
                        cy="67.5"
                        r="52"
                        fill="transparent"
                        stroke="#ef4444"
                        strokeWidth="11"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutCircumference - lateDash}
                        strokeLinecap="round"
                        transform={`rotate(${lateAngle} 67.5 67.5)`}
                      />
                    )}
                  </svg>
                  <div className="position-absolute text-center">
                    <span
                      className="fw-bold text-dark d-block"
                      style={{
                        fontSize: "19px",
                        lineHeight: "1.1",
                        color: "#0f172a"
                      }}
                    >
                      {totalPresentCount.toLocaleString()}
                    </span>
                    <span
                      className="text-muted"
                      style={{ fontSize: "12px", fontWeight: "500" }}
                    >
                      /{totalRosterDays}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="pt-3 border-top mt-3 d-flex align-items-center gap-2"
              style={{ borderColor: "#f1f5f9" }}
            >
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-2"
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#dcfce7",
                  color: "#16a34a",
                  fontSize: "12px"
                }}
              >
                ✓
              </div>
              <span className="text-muted" style={{ fontSize: "12px" }}>
                Better than{" "}
                <strong className="text-dark" style={{ color: "#0f172a" }}>
                  91.3%
                </strong>{" "}
                employees!
              </span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
