import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader/Loader';
import toast from 'react-hot-toast';
import api, { getUploadUrl } from '../../api';
import {
  LuCalendar, LuClock, LuBuilding, LuTable, LuFingerprint,
  LuWallet, LuShieldCheck, LuTrendingUp, LuGraduationCap,
  LuUsers, LuCircleCheck, LuLogOut, LuArrowUpRight, LuTriangleAlert, LuArrowRight, LuUserCheck
} from "react-icons/lu";
import { CiCircleCheck } from "react-icons/ci";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loader, setLoader] = useState(true);
  const [checking, setChecking] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [tickingTime, setTickingTime] = useState(new Date());
  const [pendingLeavesCount, setPendingLeavesCount] = useState(2);

  const [cardStatus, setCardStatus] = useState({
    1: "Active", 2: "Active", 3: "Active", 4: "Active",
    5: "Active", 6: "Active", 7: "Active", 8: "Active", 9: "Active",
  });

  // Ticking Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTickingTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Employee Profile & Attendance Logs
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/loginPage"); return; }

    const empId = localStorage.getItem("empId") || "N/A";

    // 1. Fetch Profile
    api.get(`/employee/${empId}`)
      .then(res => {
        const data = res.data;
        if (data.success) {
          const emp = data.employee;
          const liveStatus = emp.status || "Active";
          localStorage.setItem("status", liveStatus);
          localStorage.setItem("tabs_enabled", emp.tabs_enabled ? "true" : "false");
          localStorage.setItem("reporting_manager", emp.reporting_manager || "");
          localStorage.setItem("enabled_tabs", emp.enabled_tabs || "1,2,3,4");

          const photoUrl = emp.profile_photo
            ? getUploadUrl(emp.profile_photo)
            : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
          localStorage.setItem("profile_photo", emp.profile_photo || "");
          if (emp.designation) localStorage.setItem("designation", emp.designation);

          setEmployee({
            name: localStorage.getItem("userName") || emp.name || emp.first_name || "Employee",
            empId: emp.employee_id || empId,
            designation: emp.designation || localStorage.getItem("designation") || "N/A",
            email: localStorage.getItem("email") || emp.email || "N/A",
            phone: localStorage.getItem("phone") || emp.phone_no || "N/A",
            department: emp.dept || emp.department || "N/A",
            joiningDate: emp.joining_date || "N/A",
            reportTo: emp.reporting_manager || null,
            status: liveStatus,
            tabs_enabled: emp.tabs_enabled || false,
            enabled_tabs: emp.enabled_tabs || "1,2,3,4",
            avatar: photoUrl,
          });
        }
      })
      .catch(() => {
        const cachedPhoto = localStorage.getItem("profile_photo");
        const photoUrl = cachedPhoto
          ? getUploadUrl(cachedPhoto)
          : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

        setEmployee({
          name: localStorage.getItem("userName") || "Employee",
          empId: localStorage.getItem("empId") || "N/A",
          designation: localStorage.getItem("designation") || "N/A",
          email: localStorage.getItem("email") || "N/A",
          phone: localStorage.getItem("phone") || "N/A",
          department: localStorage.getItem("department") || "N/A",
          joiningDate: localStorage.getItem("joining_date") || "N/A",
          reportTo: localStorage.getItem("reporting_manager") || null,
          status: localStorage.getItem("status") || "Active",
          tabs_enabled: localStorage.getItem("tabs_enabled") === "true",
          enabled_tabs: localStorage.getItem("enabled_tabs") || "1,2,3,4",
          avatar: photoUrl,
        });
      })
      .finally(() => {
        setLoader(false);
      });

    // 2. Fetch Attendance Data
    fetchAttendanceLogs();

    // 3. Fetch Pending Leaves count
    api.get("/leave")
      .then(res => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          const pending = data.filter(l => l.status === "Pending").length;
          setPendingLeavesCount(pending);
        }
      })
      .catch(() => {
        setPendingLeavesCount(0);
      });
  }, [navigate]);

  const fetchAttendanceLogs = async () => {
    try {
      const [logsRes, todayRes] = await Promise.allSettled([
        api.get("/attendance?range=year"),
        api.get("/attendance/today-status")
      ]);

      if (logsRes.status === "fulfilled" && logsRes.value.data?.success) {
        const logs = logsRes.value.data.data || logsRes.value.data.logs || [];
        setAttendanceLogs(logs);

        const now = new Date();
        const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isoDateStr = now.toISOString().split("T")[0];
        const logTodayRec = logs.find(l => {
          const d = typeof l.date === "string" ? l.date.split("T")[0] : "";
          return d === localDateStr || d === isoDateStr;
        });

        if (todayRes.status === "fulfilled" && todayRes.value.data?.success) {
          setTodayRecord(todayRes.value.data.record || logTodayRec || null);
        } else {
          setTodayRecord(logTodayRec || null);
        }
      } else if (todayRes.status === "fulfilled" && todayRes.value.data?.success) {
        setTodayRecord(todayRes.value.data.record || null);
      }
    } catch (err) {
      console.error("Error fetching logs for dashboard:", err);
    }
  };

  const handleDashboardCheckIn = async () => {
    setChecking(true);
    try {
      const response = await api.post("/attendance/check-in");
      const data = response.data;
      if (data.success) {
        toast.success(data.message || "Checked in successfully");
        if (data.record) {
          setTodayRecord(data.record);
        }
        fetchAttendanceLogs();
      } else {
        toast.error(data.error || "Check-in failed");
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Check-in request failed";
      toast.error(errMsg);
    } finally {
      setChecking(false);
    }
  };

  const handleDashboardCheckOut = async () => {
    setChecking(true);
    try {
      const response = await api.post("/attendance/check-out");
      const data = response.data;
      if (data.success) {
        toast.success(data.message || "Checked out successfully");
        if (data.record) {
          setTodayRecord(data.record);
        }
        fetchAttendanceLogs();
      } else {
        toast.error(data.error || "Check-out failed");
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Check-out request failed";
      toast.error(errMsg);
    } finally {
      setChecking(false);
    }
  };

  if (loader) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
        <Loader />
      </div>
    );
  }

  if (!employee) return null;

  const isAccountActive = employee.status === "Active";

  // Calculate Metrics from Logs
  const calculateAverageHours = () => {
    const validLogs = attendanceLogs.filter(log => log.work_hours && parseFloat(log.work_hours) > 0);
    if (validLogs.length === 0) return "9h 00mins";
    const totalMinutes = validLogs.reduce((sum, log) => sum + parseFloat(log.work_hours) * 60, 0);
    const avgMinutes = totalMinutes / validLogs.length;
    const hrs = Math.floor(avgMinutes / 60);
    const mins = Math.round(avgMinutes % 60);
    return `${hrs}h ${mins}mins`;
  };

  const calculateOnTimeRate = () => {
    const presentLogs = attendanceLogs.filter(log => log.status === "Present" || log.status === "On Time" || log.status === "Late Present");
    if (presentLogs.length === 0) {
      const onTime = onTimeCount;
      const total = onTimeCount + lateCount;
      return total > 0 ? ((onTime / total) * 100).toFixed(2) + " %" : "0 %";
    }
    const onTimeLogs = presentLogs.filter(log => (log.status === "Present" || log.status === "On Time") && !log.late_count);
    return ((onTimeLogs.length / presentLogs.length) * 100).toFixed(2) + " %";
  };

  const calculateAverageCheckIn = () => {
    const validLogs = attendanceLogs.filter(log => log.check_in);
    if (validLogs.length === 0) return "10:00 AM";
    let totalMinutes = 0;
    validLogs.forEach(log => {
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
    const validLogs = attendanceLogs.filter(log => log.check_out && log.check_out !== "—" && log.check_out !== "");
    if (validLogs.length === 0) return "19:00 PM";
    let totalMinutes = 0;
    validLogs.forEach(log => {
      const parts = log.check_out.split(":");
      totalMinutes += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    });
    const avgMinutes = totalMinutes / validLogs.length;
    let hrs = Math.floor(avgMinutes / 60);
    const mins = Math.round(avgMinutes % 60);
    return `${hrs < 10 ? "0" + hrs : hrs}:${mins < 10 ? "0" + mins : mins} PM`;
  };

  // Today shift timer and calculations
  const getTodayWorkedPercentage = () => {
    if (!todayRecord || !todayRecord.check_in || todayRecord.check_in === "—" || todayRecord.status === "Absent") {
      return { percent: 0, text: "0.0h", label: "NOT MARKED" };
    }

    let workMins = 0;
    if (todayRecord.check_out && todayRecord.check_out !== "—") {
      if (todayRecord.work_hours && parseFloat(todayRecord.work_hours) > 0) {
        workMins = parseFloat(todayRecord.work_hours) * 60;
      } else {
        const inParts = todayRecord.check_in.split(":");
        const outParts = todayRecord.check_out.split(":");
        const inTime = new Date();
        inTime.setHours(parseInt(inParts[0], 10) || 0, parseInt(inParts[1], 10) || 0, parseInt(inParts[2] || 0, 10) || 0, 0);
        const outTime = new Date();
        outTime.setHours(parseInt(outParts[0], 10) || 0, parseInt(outParts[1], 10) || 0, parseInt(outParts[2] || 0, 10) || 0, 0);
        workMins = Math.max(0, (outTime.getTime() - inTime.getTime()) / 1000 / 60);
      }
    } else {
      const checkInParts = todayRecord.check_in.split(":");
      const checkInTime = new Date();
      checkInTime.setHours(parseInt(checkInParts[0], 10) || 0, parseInt(checkInParts[1], 10) || 0, parseInt(checkInParts[2] || 0, 10) || 0, 0);
      const diffMs = Math.max(0, tickingTime.getTime() - checkInTime.getTime());
      workMins = diffMs / 1000 / 60;
    }

    const targetMins = 9 * 60; // 9 hours workday (10am to 7pm)
    const percent = Math.min(100, Math.round((workMins / targetMins) * 100));
    const hrs = (workMins / 60).toFixed(1);
    let label = "IN PROGRESS";
    if (todayRecord.check_out && todayRecord.check_out !== "—") {
      label = percent >= 80 ? "GOOD" : percent >= 50 ? "AVERAGE" : "COMPLETED";
    } else {
      label = percent >= 80 ? "GOOD" : percent >= 50 ? "AVERAGE" : percent > 0 ? "IN PROGRESS" : "JUST STARTED";
    }
    return { percent, text: `${hrs}h`, label };
  };

  const getCheckInTimeLeft = () => {
    if (todayRecord?.check_out && todayRecord?.check_out !== "—") {
      return "Shift completed";
    }
    const endOfDay = new Date(tickingTime);
    endOfDay.setHours(19, 0, 0, 0); // 7:00 PM target
    const diffMs = endOfDay.getTime() - tickingTime.getTime();
    if (diffMs <= 0) return "Office hours over";
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins < 10 ? '0' + mins : mins}m ${secs < 10 ? '0' + secs : secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' + secs : secs}s`;
  };

  const getGreeting = () => {
    const firstName = (employee.name || "Employee").trim().split(" ")[1];
    const hrs = tickingTime.getHours();
    if (hrs < 12) return `Good morning, ${firstName}!`;
    if (hrs < 17) return `Good afternoon, ${firstName}!`;
    return `Good evening, ${firstName}!`;
  };

  const formatCurrentTimeFormatted = (d) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[d.getMonth()] || "Jan";
    const day = d.getDate();
    const year = d.getFullYear();
    let hrs = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${day} ${monthName} ${year}, ${hrs}:${mins} ${ampm}`;
  };

  // Attendance metrics counts
  const onTimeCount = attendanceLogs.filter(log => log.status === "Present").length || 0;
  const wfhCount = attendanceLogs.filter(log => log.status === "WFH" || log.status === "Work from home").length || 0;
  const lateCount = attendanceLogs.filter(log => log.status === "Late Present" || log.status === "Late").length || 0;
  const absentCount = attendanceLogs.filter(log => log.status === "Absent").length || 0;
  const today = new Date();
  const totalRosterDays = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const totalPresentCount = onTimeCount + wfhCount + lateCount;

  // Active module categories
  const quickActions = [
    {
      id: 1,
      title: "Attendance Tracker",
      desc: "Track daily shift times, logs, and check-in history.",
      btnText: "Open Roster",
      icon: <LuFingerprint size={24} />,
      iconBg: "rgba(2, 132, 199, 0.08)",
      iconColor: "#0284c7",
      onClick: () => navigate('/attendance'),
    },
    {
      id: 2,
      title: "Leave Requests",
      desc: "Apply for leaves, view balances, and check status.",
      btnText: "Apply Leave",
      icon: <LuCalendar size={24} />,
      iconBg: "rgba(22, 163, 74, 0.08)",
      iconColor: "#16a34a",
      isLink: true,
      linkTo: "/employee/leave",
    },
    {
      id: 3,
      title: "Payroll & Salary",
      desc: "Review monthly salary slips, tax records, and allowances.",
      btnText: "View Payroll",
      icon: <LuWallet size={24} />,
      iconBg: "rgba(234, 88, 12, 0.08)",
      iconColor: "#ea580c",
      onClick: () => navigate('/payroll'),
    },
    {
      id: 4,
      title: "Profile & Documents",
      desc: "Update personal records and upload files for HR review.",
      btnText: "Manage Profile",
      icon: <LuShieldCheck size={24} />,
      iconBg: "rgba(109, 40, 217, 0.08)",
      iconColor: "#6d28d9",
      isLink: true,
      linkTo: `/employee/profile/${employee.empId}`,
    },
    {
      id: 5,
      title: "Interviews",
      desc: "Manage schedules and view candidate interview panels.",
      btnText: "View Schedule",
      icon: <LuUsers size={24} />,
      iconBg: "rgba(219, 39, 119, 0.08)",
      iconColor: "#db2777",
      onClick: () => navigate('/interviews'),
    },
    {
      id: 6,
      title: "Performance Appraisal",
      desc: "Review appraisals, feedback loops, and rating scorecards.",
      btnText: "Appraisals",
      icon: <LuTrendingUp size={24} />,
      iconBg: "rgba(79, 70, 229, 0.08)",
      iconColor: "#4f46e5",
      onClick: () => navigate('/appraisal'),
    },
    {
      id: 7,
      title: "Training modules",
      desc: "Access training modules and onboarding tasks.",
      btnText: "Open Modules",
      icon: <LuGraduationCap size={24} />,
      iconBg: "rgba(8, 145, 178, 0.08)",
      iconColor: "#0891b2",
      onClick: () => navigate('/onboarding'),
    },
  ];

  const enabledTabIds = (() => {
    if (employee.enabled_tabs) {
      if (typeof employee.enabled_tabs === "string") {
        return employee.enabled_tabs.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }
      if (Array.isArray(employee.enabled_tabs)) {
        return employee.enabled_tabs.map(Number);
      }
    }
    return [1, 2, 3, 4];
  })();

  const visibleActions = quickActions.filter(action => enabledTabIds.includes(action.id));

  // Render SVG Rings
  const isMarkedPresent = Boolean(todayRecord && todayRecord.check_in && todayRecord.check_in !== "—" && todayRecord.status !== "Absent");
  const todayProgress = getTodayWorkedPercentage();
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (todayProgress.percent / 100) * circumference;

  return (
    <Container fluid className="px-4 py-4 max-w-6xl" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* CSS Hover & Custom Styling */}
      <style>{`
        .hover-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important;
          border-color: rgba(30, 58, 138, 0.15) !important;
        }
        .top-widget-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .btn-mark-present {
          background-color: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 16px;
          transition: all 0.2s;
        }
        .btn-mark-present:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }
      `}</style>

      {/* TOP HEADER & GREETINGS ROW */}
      <Row className="mb-4 align-items-center g-3">
        <Col xs={12} md={8}>
          <h2 className="fw-bold text-dark m-0 text-[28px]" style={{ letterSpacing: "-0.5px" }}>
            {getGreeting()}
          </h2>
          <p className="text-dark mb-0 mt-1 text-[14px] font-medium">
            You have {pendingLeavesCount} leave request pending.
          </p>
        </Col>
        <Col xs={12} md={4} className="d-flex justify-content-md-end">
          <Card className="border-0 shadow-sm rounded-4 px-3 py-2 bg-white d-flex flex-row align-items-center gap-3">
            <div>
              <div className="text-muted" style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8" }}>
                Current time
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "14px", color: "#1e293b" }}>
                {formatCurrentTimeFormatted(tickingTime)}
              </div>
            </div>
            <div className="p-2 bg-light rounded-circle text-primary d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px", border: "1px dashed #cbd5e1" }}>
              <LuClock size={18} style={{ color: "#1e293b" }} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* MAIN METRICS AND KPI BOARD */}
      {!isAccountActive ? (
        <Card className="p-5 text-center border-0 shadow-sm rounded-4">
          <div style={{ fontSize: '60px' }}>🚫</div>
          <h4 className="text-danger fw-bold mt-3">Account Inactive</h4>
          <p className="text-muted">
            Your account is currently inactive. Please contact HR for assistance.
          </p>
        </Card>
      ) : (
        <>
          <Row className="g-3 mb-5 align-items-stretch">
            {/* Card 1: Today Clock Widget */}
            <Col xs={12} lg={4}>
              <Card className="top-widget-card shadow-sm p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-dark m-0" style={{ fontSize: "18px", color: "#0f172a" }}>Today</h5>
                    <Badge
                      pill
                      style={{
                        backgroundColor: isMarkedPresent ? "#16a34a" : "#ef4444",
                        color: "#ffffff",
                        padding: "6px 14px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}
                    >
                      {isMarkedPresent ? "Present" : "Absent"}
                    </Badge>
                  </div>
                  <hr style={{ borderColor: "#e2e8f0", opacity: 0.8, margin: "12px 0 20px 0" }} />

                  <div className="d-flex align-items-center justify-content-between py-1">
                    {/* Left Icon & Text */}
                    <div className="d-flex flex-column gap-2" style={{ maxWidth: "58%" }}>
                      <div className="p-2.5 rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: "42px", height: "42px", border: "1.5px stroke #3b82f6", background: "#eff6ff" }}>
                        <LuFingerprint size={22} style={{ color: "#2563eb" }} />
                      </div>
                      <p className="text-dark mb-0 font-bold" style={{ fontSize: "13px", lineHeight: "1.35" }}>
                        {isMarkedPresent
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

                <div className="mt-4">
                  {(() => {
                    if (checking) {
                      return (
                        <Button className="btn-mark-present w-100 disabled">
                          <Spinner animation="border" size="sm" className="me-2" />
                          Processing...
                        </Button>
                      );
                    }
                    if (!isMarkedPresent) {
                      return (
                        <Button className="btn-mark-present w-100" onClick={handleDashboardCheckIn}>
                          Mark Present
                        </Button>
                      );
                    }
                    if (!todayRecord.check_out || todayRecord.check_out === "—") {
                      return (
                        <Button variant="danger" className="w-100 py-2.5 rounded-3 fw-semibold shadow-xs" style={{ backgroundColor: "#dc2626", borderColor: "#dc2626", borderRadius: "10px" }} onClick={handleDashboardCheckOut}>
                          Clock Out
                        </Button>
                      );
                    }
                    return (
                      <Button variant="secondary" disabled className="w-100 py-2.5 rounded-3 fw-semibold opacity-75" style={{ borderRadius: "10px" }}>
                        Completed Today
                      </Button>
                    );
                  })()}
                </div>
              </Card>
            </Col>

            {/* Card 2 & 3: Middle KPI 2x2 Grid */}
            <Col xs={12} lg={4} className="d-flex flex-column gap-3">
              <Row className="g-3 flex-grow-1">
                {/* Average Hours Card */}
                <Col xs={6}>
                  <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: "38px", height: "38px", background: "#eff6ff", border: "1px dashed #bfdbfe" }}>
                      <LuClock size={20} style={{ color: "#2563eb" }} />
                    </div>
                    <div className="mt-3">
                      <div className="text-slate-700 fw-semibold" style={{ fontSize: "12px" }}>Average hours</div>
                      <h4 className="fw-bold text-dark m-0 mt-1" style={{ fontSize: "22px" }}>{calculateAverageHours()}</h4>
                    </div>
                  </Card>
                </Col>

                {/* Average Check-in Card */}
                <Col xs={6}>
                  <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: "38px", height: "38px", background: "#eff6ff", border: "1px dashed #bfdbfe" }}>
                      <LuArrowUpRight size={20} style={{ color: "#2563eb" }} />
                    </div>
                    <div className="mt-3">
                      <div className="text-slate-700 fw-semibold" style={{ fontSize: "12px" }}>Average check-in</div>
                      <h4 className="fw-bold text-dark m-0 mt-1" style={{ fontSize: "22px" }}>{calculateAverageCheckIn()}</h4>
                    </div>
                  </Card>
                </Col>

                {/* On-Time Arrival Card */}
                <Col xs={6}>
                  <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: "38px", height: "38px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <LuUserCheck size={20} style={{ color: "#16a34a" }} />
                    </div>
                    <div className="mt-3">
                      <div className="text-slate-700 fw-semibold" style={{ fontSize: "12px" }}>On-time arrival</div>
                      <h4 className="fw-bold text-success m-0 mt-1" style={{ fontSize: "22px" }}>{calculateOnTimeRate()}</h4>
                    </div>
                  </Card>
                </Col>

                {/* Average Check-out Card */}
                <Col xs={6}>
                  <Card className="top-widget-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div className="p-2.5 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: "38px", height: "38px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
                      <LuLogOut size={20} style={{ color: "#ea580c" }} />
                    </div>
                    <div className="mt-3">
                      <div className="text-slate-700 fw-semibold" style={{ fontSize: "12px" }}>Average check-out</div>
                      <h4 className="fw-bold text-dark m-0 mt-1" style={{ fontSize: "22px" }}>{calculateAverageCheckOut()}</h4>
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
                    <h5 className="fw-bold text-dark m-0" style={{ fontSize: "18px", color: "#0f172a" }}>My Attendance</h5>
                    <Link to="/attendance" className="small fw-semibold text-primary text-decoration-none" style={{ color: "#2563eb", fontSize: "13px" }}>
                      View Stats
                    </Link>
                  </div>
                  <hr style={{ borderColor: "#e2e8f0", opacity: 0.8, margin: "12px 0 20px 0" }} />

                  <div className="d-flex align-items-center justify-content-between">
                    {/* Metrics legend */}
                    <div className="d-flex flex-column gap-2" style={{ fontSize: "13px" }}>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: "8px", height: "8px", backgroundColor: "#22c55e" }}></span>
                        <span className="text-slate-800 font-semibold"><strong className="text-dark"> {onTimeCount.toLocaleString()}</strong> on time</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: "8px", height: "8px", backgroundColor: "#eab308" }}></span>
                        <span className="text-slate-800 font-semibold"><strong className="text-dark" >{wfhCount.toLocaleString()}</strong> Work from home</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: "8px", height: "8px", backgroundColor: "#ef4444" }}></span>
                        <span className="text-slate-800 font-semibold"><strong className="text-dark" >{lateCount.toLocaleString()}</strong> late attendance</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block" style={{ width: "8px", height: "8px", backgroundColor: "#94a3b8" }}></span>
                        <span className="text-slate-800 font-semibold"><strong className="text-dark" >{absentCount.toLocaleString()}</strong> absent</span>
                      </div>
                    </div>

                    {/* Donut chart for My Attendance */}
                    <div className="position-relative d-inline-flex justify-content-center align-items-center" style={{ width: "135px", height: "135px" }}>
                      <svg width="145" height="145" viewBox="0 0 145 145">
                        <circle cx="67.5" cy="67.5" r="52" fill="transparent" stroke="#f1f5f9" strokeWidth="11" />
                        {/* On time green arc */}
                        <circle cx="67.5" cy="67.5" r="52" fill="transparent"
                          stroke="#22c55e" strokeWidth="11"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - (onTimeCount / totalRosterDays))}
                          strokeLinecap="round" transform="rotate(-90 67.5 67.5)"
                        />
                        {/* WFH yellow arc */}
                        <circle cx="67.5" cy="67.5" r="52" fill="transparent"
                          stroke="#eab308" strokeWidth="11"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - (wfhCount / totalRosterDays))}
                          strokeLinecap="round" transform="rotate(20 67.5 67.5)"
                        />
                        {/* Late red arc */}
                        <circle cx="67.5" cy="67.5" r="52" fill="transparent"
                          stroke="#ef4444" strokeWidth="11"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - (lateCount / totalRosterDays))}
                          strokeLinecap="round" transform="rotate(80 67.5 67.5)"
                        />
                      </svg>
                      <div className="position-absolute text-center">
                        <span className="fw-bold text-dark d-block" style={{ fontSize: "19px", lineHeight: "1.1", color: "#0f172a" }}>{totalPresentCount.toLocaleString()}</span>
                        <span className="text-muted" style={{ fontSize: "12px", fontWeight: "500" }}>/{totalRosterDays}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-top mt-3 d-flex align-items-center gap-2" style={{ borderColor: "#f1f5f9" }}>
                  <div className="d-inline-flex align-items-center justify-content-center rounded-2" style={{ width: "20px", height: "20px", backgroundColor: "#dcfce7", color: "#16a34a", fontSize: "12px" }}>
                    ✓
                  </div>
                  <span className="text-muted" style={{ fontSize: "12px" }}>
                    Better than <strong className="text-dark" style={{ color: "#0f172a" }}>91.3%</strong> employees!
                  </span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* ACTIVE WORKSPACE MODULES TABS SECTION */}
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <div>
              <h4 className="fw-bold text-dark m-0">My Workspace Modules</h4>
              <p className="text-dark mb-0 mt-1 text-[14px] font-medium">Select a section below to manage your operations</p>
            </div>
            <Badge bg="primary-subtle" className="text-primary px-3 py-2 rounded-pill fw-semibold" style={{ fontSize: '11px' }}>
              {visibleActions.length} Modules Available
            </Badge>
          </div>

          <Row className="g-3">
            {visibleActions.map((action, index) => (
              <Col xs={12} sm={6} lg={4} key={action.id}>
                <Card className="h-100 shadow-sm border-0 rounded-4 hover-card bg-white">
                  <Card.Body className="d-flex flex-column p-4 justify-content-between">
                    <div>
                      {/* Icon & Index number line */}
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="p-2.5 rounded-3 d-flex align-items-center justify-content-center" style={{ background: action.iconBg, color: action.iconColor }}>
                          {action.icon}
                        </div>
                        <span className="text-slate-800 fw-bold font-monospace small" style={{ fontSize: "18px" }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Info titles */}
                      <h5 className="fw-bold text-dark mb-1">{action.title}</h5>
                      <p className="text-muted font-semibold small mb-4" style={{ lineHeight: "1.4" }}>{action.desc}</p>
                    </div>

                    {/* Action buttons */}
                    {action.isLink ? (
                      <Link to={action.linkTo} className="btn btn-outline-primary rounded-3 w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-1.5" style={{ fontSize: '13px' }}>
                        <span>{action.btnText}</span>
                        <LuArrowRight size={14} />
                      </Link>
                    ) : (
                      <Button variant="outline-primary" className="rounded-3 w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-1.5" style={{ fontSize: '13px' }} onClick={action.onClick}>
                        <span>{action.btnText}</span>
                        <LuArrowRight size={14} />
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
};

export default EmployeeDashboard;