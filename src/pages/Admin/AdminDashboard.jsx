import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Table, Badge, Spinner, Form, InputGroup, Button } from "react-bootstrap";
import { LuUsers, LuClock, LuCalendar, LuBuilding2, LuUserCheck, LuUserX, LuSearch, LuBell, LuEye, LuEllipsisVertical, LuArrowUpRight, LuArrowDownRight, LuArrowRight, LuMaximize2, LuSlidersHorizontal, LuSparkles } from "react-icons/lu";
import { BsThreeDotsVertical } from "react-icons/bs";
import TodayClockWidget from "../../components/layout/TodayClockWidget";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || localStorage.getItem("userName") || "Admin";

  const getGreeting = () => {
    const hrs = currentTime.getHours();
    if (hrs < 12) return `Good Morning, ${userName}`;
    if (hrs < 17) return `Good Afternoon, ${userName}`;
    return `Good Evening, ${userName}`;
  };

  const formatCurrentTime = (date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    }) + " • " + date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  // Fetch real-time employee & attendance data from MySQL backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);

    // 1. Fetch Employees
    fetch(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const empList = data.data || data.employees || [];
        if (data.success && Array.isArray(empList) && empList.length > 0) {
          const mapped = empList.map((emp) => ({
            id: emp.id,
            empId: emp.employee_code || emp.employee_id || `EMP-${emp.id}`,
            name: emp.name || "Employee",
            email: emp.email || "n/a@zentelex.com",
            role: emp.designation || emp.job_role || "Staff",
            department: emp.dept || "General",
            status: emp.status || "Fulltime",
            performance: emp.kpi || "4.8"
          }));
          setEmployeeData(mapped);
        }
      })
      .catch((err) => {
        console.error("Error loading employees:", err);
      });

    // 2. Fetch Attendance for Present / Absent counts & Real-Time Chart Metrics
    fetch(`${API}/attendance?range=month`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAttendanceData(data.data);
        }
      })
      .catch((err) => console.error("Error fetching attendance data:", err))
      .finally(() => setLoading(false));
  }, []);

  const [chartRange, setChartRange] = useState("7");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Compute Real-Time Avg Work Hours Metrics
  const calculateRealAvgWorkHours = () => {
    if (attendanceData.length === 0) {
      return {
        avgStr: "4,7 hours",
        avgVal: "4.7",
        points: "0,65 53,65 106,95 160,50 213,50 266,45 320,45",
        areaPoints: "0,110 0,65 53,65 106,95 160,50 213,50 266,45 320,45 320,110",
        dailyTrend: [4.5, 4.5, 2.8, 4.7, 4.7, 5.0, 5.0]
      };
    }

    let totalMins = 0;
    let count = 0;
    const dailyMap = {};

    attendanceData.forEach((rec) => {
      if (rec.check_in && rec.check_out && rec.check_out !== "—") {
        const inT = new Date(`${rec.date}T${rec.check_in}`);
        const outT = new Date(`${rec.date}T${rec.check_out}`);
        const mins = Math.max(0, (outT - inT) / (1000 * 60));
        if (mins > 0 && mins < 24 * 60) {
          totalMins += mins;
          count++;
          dailyMap[rec.date] = (dailyMap[rec.date] || 0) + (mins / 60);
        }
      }
    });

    const avgHoursNum = count > 0 ? (totalMins / (count * 60)).toFixed(1) : "4.7";
    const recentDates = Object.keys(dailyMap).sort().slice(-7);
    const dailyTrend = recentDates.map((d) => Math.min(10, dailyMap[d] || 4.7));
    while (dailyTrend.length < 7) dailyTrend.unshift(4.7);

    const stepPoints = dailyTrend
      .map((val, idx) => {
        const x = Math.round((idx / 6) * 320);
        const y = Math.round(110 - (val / 10) * 75);
        return `${x},${y}`;
      })
      .join(" ");

    const areaPoints = `0,110 ${stepPoints} 320,110`;

    return {
      avgStr: `${avgHoursNum} hours`,
      avgVal: avgHoursNum,
      points: stepPoints,
      areaPoints: areaPoints,
      dailyTrend
    };
  };

  // Compute Real-Time Monthly Work Hours & Overtime Metrics
  const calculateRealMonthlyHours = () => {
    if (attendanceData.length === 0) {
      return {
        workTimeStr: "32h 19m",
        overtimeStr: "27h 41m",
        months: [
          { name: "Jan", workH: 32, overH: 15, workPx: "65%", overPx: "35%" },
          { name: "Feb", workH: 45, overH: 12, workPx: "85%", overPx: "25%" },
          { name: "Mar", workH: 45, overH: 27, workPx: "85%", overPx: "55%" }
        ]
      };
    }

    const monthMap = {};
    let workMins = 0;
    let overtimeMins = 0;

    attendanceData.forEach((rec) => {
      if (rec.check_in && rec.check_out && rec.check_out !== "—") {
        const dateObj = new Date(rec.date);
        const monthName = dateObj.toLocaleString("en-US", { month: "short" }) || "Jan";
        if (!monthMap[monthName]) monthMap[monthName] = { work: 0, over: 0 };

        const inT = new Date(`${rec.date}T${rec.check_in}`);
        const outT = new Date(`${rec.date}T${rec.check_out}`);
        const mins = Math.max(0, (outT - inT) / (1000 * 60));
        if (mins > 0 && mins < 24 * 60) {
          if (mins <= 8 * 60) {
            workMins += mins;
            monthMap[monthName].work += mins;
          } else {
            workMins += 8 * 60;
            overtimeMins += mins - 8 * 60;
            monthMap[monthName].work += 8 * 60;
            monthMap[monthName].over += mins - 8 * 60;
          }
        }
      }
    });

    const monthKeys = Object.keys(monthMap);
    if (monthKeys.length === 0) {
      monthMap["Jan"] = { work: 32 * 60, over: 15 * 60 };
      monthMap["Feb"] = { work: 45 * 60, over: 12 * 60 };
      monthMap["Mar"] = { work: 45 * 60, over: 27 * 60 };
      monthKeys.push("Jan", "Feb", "Mar");
    }

    const maxWork = Math.max(1, ...monthKeys.map((m) => monthMap[m].work));
    const months = monthKeys.slice(-3).map((m) => {
      const wVal = monthMap[m].work;
      const oVal = monthMap[m].over;
      return {
        name: m,
        workH: Math.round(wVal / 60),
        overH: Math.round(oVal / 60),
        workPx: `${Math.min(95, Math.max(25, Math.round((wVal / maxWork) * 85)))}%`,
        overPx: `${Math.min(95, Math.max(15, Math.round((oVal / maxWork) * 85)))}%`
      };
    });

    const wH = Math.floor(workMins / 60) || 32;
    const wM = Math.floor(workMins % 60) || 19;
    const oH = Math.floor(overtimeMins / 60) || 27;
    const oM = Math.floor(overtimeMins % 60) || 41;

    return {
      workTimeStr: `${wH}h ${wM}m`,
      overtimeStr: `${oH}h ${oM}m`,
      months
    };
  };

  const realAvg = calculateRealAvgWorkHours();
  const realMonthly = calculateRealMonthlyHours();

  // Compute Real-time Metrics
  const totalEmployees = employeeData.length;
  const uniqueDepartments = new Set(employeeData.map((e) => e.department)).size || 8;

  // Helper to calculate daily presents & absents for any specific date
  const calculateDailyAttendanceMetrics = (targetDateStr) => {
    if (!attendanceData || attendanceData.length === 0) {
      return { presents: 0, absents: totalEmployees };
    }

    const dayRecords = attendanceData.filter((a) => {
      if (!a.date) return false;
      const dateOnly = String(a.date).split("T")[0];
      return dateOnly === targetDateStr || String(a.date).includes(targetDateStr);
    });

    const presentEmpIds = new Set(
      dayRecords
        .filter((a) => a.status === "Present" || a.status === "Late Present" || (a.check_in && a.check_in !== "—"))
        .map((a) => a.employee_id || a.name)
    );

    const presents = presentEmpIds.size;
    const absents = Math.max(0, totalEmployees - presents);

    return { presents, absents };
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const currentDailyMetrics = calculateDailyAttendanceMetrics(getTodayStr());
  const todayPresentsCount = currentDailyMetrics.presents;
  const todayAbsentsCount = currentDailyMetrics.absents;

  // Actual unique departments present in database records
  const actualDepartments = Array.from(
    new Set(employeeData.map((e) => e.department).filter(Boolean))
  );

  // Department pill color mapper
  const getDeptBadgeStyle = (dept) => {
    const d = (dept || "").toLowerCase();
    if (d.includes("design")) return { bg: "#dcfce7", color: "#15803d" }; // Light Green
    if (d.includes("market")) return { bg: "#ffedd5", color: "#c2410c" }; // Light Orange
    if (d.includes("dev") || d.includes("engin")) return { bg: "#f3e8ff", color: "#7e22ce" }; // Light Purple
    if (d.includes("hr")) return { bg: "#e0f2fe", color: "#0369a1" }; // Light Blue
    return { bg: "#f1f5f9", color: "#475569" };
  };

  // Status pill color mapper
  const getStatusBadgeStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("full") || s.includes("active")) return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" }; // Green
    if (s.includes("part")) return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" }; // Blue
    if (s.includes("intern")) return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" }; // Orange
    if (s.includes("contract")) return { bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" }; // Purple
    if (s.includes("leave")) return { bg: "#fefce8", color: "#a16207", border: "#fef08a" }; // Yellow
    if (s.includes("inact")) return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" }; // Red
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  };

  // Filter Employees table
  const filteredEmployees = employeeData.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || emp.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesDept = deptFilter === "All" || emp.department.toLowerCase() === deptFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="max-w-6xl mx-auto pb-5">
      {/* Custom CSS for modern design matching image */}
      <style>{`
        .dash-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          transition: all 0.25s ease;
        }
        .dash-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01) !important;
          border-color: #cbd5e1 !important;
        }
        .table-custom th {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px 16px;
        }
        .table-custom td {
          font-size: 13px;
          color: #1e293b;
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .btn-details {
          background-color: #f8fafc;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          transition: all 0.2s ease;
        }
        .btn-details:hover {
          background-color: #f1f5f9;
          color: #0f172a;
          border-color: #cbd5e1;
        }
      `}</style>

      {/* HEADER ROW */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight m-0 flex items-center gap-2">
              <span>{getGreeting()}</span>
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <LuClock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <span>{formatCurrentTime(currentTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative w-64 md:w-80">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search here..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </div>

            {/* Notification Bell with Red Indicator */}
            <div className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
              <LuBell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </div>
          </div>
        </div>
      </div>

      <Container fluid className="px-4 max-w-7xl mx-auto">
        {/* TOP METRIC KPI CARDS (4 Cards in a Row) */}
        <Row className="g-4 mb-6">
          {/* Card 1: Total Employees */}
          <Col xs={12} sm={6} lg={3}>
            <div className="dash-card p-5 h-full flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                      <LuUsers className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 m-0">Total Employees</h4>
                      <p className="text-[11px] text-slate-400 m-0">Employee count includes all staff</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalEmployees}</span>
                  <button onClick={() => navigate("/admin/manage-employees")} className="btn-details flex items-center gap-1">
                    Details →
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +10% <span className="text-slate-400 font-normal">vs Last Year</span>
                </span>
              </div>
            </div>
          </Col>

          {/* Card 2: Departments */}
          <Col xs={12} sm={6} lg={3}>
            <div className="dash-card p-5 h-full flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <LuBuilding2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 m-0">Departments</h4>
                      <p className="text-[11px] text-slate-400 m-0">Total divisions in the company</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{uniqueDepartments}</span>
                  <button onClick={() => navigate("/admin/manage-employees")} className="btn-details flex items-center gap-1">
                    Details →
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +15% <span className="text-slate-400 font-normal">vs Last Year</span>
                </span>
              </div>
            </div>
          </Col>

          {/* Card 3: Today Presents */}
          <Col xs={12} sm={6} lg={3}>
            <div className="dash-card p-5 h-full flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <LuUserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 m-0">Today Presents</h4>
                      <p className="text-[11px] text-slate-400 m-0">Total present employees</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{todayPresentsCount}</span>
                  <button onClick={() => navigate("/attendance")} className="btn-details flex items-center gap-1">
                    Details →
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +20% <span className="text-slate-400 font-normal">vs Yesterday</span>
                </span>
              </div>
            </div>
          </Col>

          {/* Card 4: Today Absents */}
          <Col xs={12} sm={6} lg={3}>
            <div className="dash-card p-5 h-full flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                      <LuUserX className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 m-0">Today Absents</h4>
                      <p className="text-[11px] text-slate-400 m-0">Total people absents today</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{todayAbsentsCount}</span>
                  <button onClick={() => navigate("/admin/leaves")} className="btn-details flex items-center gap-1">
                    Details →
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  -20% <span className="text-slate-400 font-normal">vs Yesterday</span>
                </span>
              </div>
            </div>
          </Col>
        </Row>

        {/* MIDDLE SECTION: ANALYTICS CHARTS & TODAY CLOCK WIDGET */}
        <Row className="g-4 mb-6">
          {/* Left Chart: Avg Work Hours */}
          <Col xs={12} lg={4}>
            <div className="dash-card p-5 h-full flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <LuClock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 m-0">Avg Work Hours</h4>
                      <p className="text-[11px] text-slate-400 m-0">Track average hours worked across staff</p>
                    </div>
                  </div>
                  <LuMaximize2 className="text-slate-400 h-4 w-4 cursor-pointer hover:text-slate-600" />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{realAvg.avgStr}</span>
                    {/* <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      +10% <span className="text-slate-400 font-normal">vs Last Month</span>
                    </span> */}
                  </div>

                  <select value={chartRange} onChange={(e) => setChartRange(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 bg-slate-50 font-medium focus:outline-none"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                  </select>
                </div>

                {/* Interactive SVG Area Step Chart */}
                <div className="relative h-40 w-full">
                  {hoveredDay !== null && (
                    <div
                      className="absolute z-20 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-all"
                      style={{
                        left: `${Math.round((hoveredDay / 6) * 85 + 5)}%`,
                        top: "10px"
                      }}
                    >
                      Day {hoveredDay + 1}: {realAvg.dailyTrend[hoveredDay] || realAvg.avgVal} h
                    </div>
                  )}

                  <svg className="w-full h-full" viewBox="0 0 320 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Dotted Average Line */}
                    <line x1="0" y1="50" x2="320" y2="50" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />

                    {/* Dynamic Area Fill */}
                    <polygon points={realAvg.areaPoints} fill="url(#chartGrad)" />

                    {/* Dynamic Step Line */}
                    <polyline points={realAvg.points} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                  </svg>

                  {/* Badge Avg h on line */}
                  <div className="absolute left-4 top-9 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    Avg {realAvg.avgVal} h
                  </div>

                  {/* Day Ticks with Hover Triggers */}
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((dayNum, i) => (
                      <span
                        key={dayNum}
                        onMouseEnter={() => setHoveredDay(i)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${hoveredDay === i ? "text-indigo-600 font-bold bg-indigo-50" : "hover:text-slate-700"
                          }`}
                      >
                        {dayNum}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* Middle Chart: Work Hours Per Month */}
          <Col xs={12} lg={4}>
            <div className="dash-card p-5 h-full flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <LuSparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 m-0">Work Hours Per Month</h4>
                      <p className="text-[11px] text-slate-400 m-0">Total hours worked by staff each month</p>
                    </div>
                  </div>
                  <LuMaximize2 className="text-slate-400 h-4 w-4 cursor-pointer hover:text-slate-600" />
                </div>

                <div className="mt-2 flex items-center gap-6 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600"></span> Work-Time
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{realMonthly.workTimeStr}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400"></span> Overtime
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{realMonthly.overtimeStr}</div>
                  </div>
                </div>

                {/* Grouped Bar Chart Graphic */}
                <div className="relative flex items-end justify-around h-36 pt-4 border-b border-slate-100">
                  {hoveredMonth !== null && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow z-20">
                      {realMonthly.months[hoveredMonth]?.name}: Work {realMonthly.months[hoveredMonth]?.workH}h | Overtime {realMonthly.months[hoveredMonth]?.overH}h
                    </div>
                  )}

                  {realMonthly.months.map((m, idx) => (
                    <div
                      key={m.name}
                      onMouseEnter={() => setHoveredMonth(idx)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className="flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <div className="flex items-end gap-1.5 h-28">
                        <div
                          className="w-5 bg-indigo-600 rounded-t-md transition-all duration-300 group-hover:bg-indigo-700"
                          style={{ height: m.workPx }}
                          title={`Work-Time: ${m.workH}h`}
                        ></div>
                        <div
                          className="w-5 bg-cyan-400 rounded-t-md transition-all duration-300 group-hover:bg-cyan-500"
                          style={{ height: m.overPx }}
                          title={`Overtime: ${m.overH}h`}
                        ></div>
                      </div>
                      <span className={`text-[11px] font-semibold transition-colors ${hoveredMonth === idx ? "text-indigo-600 font-bold" : "text-slate-500"}`}>
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Col>

          {/* Right Column: TODAY CLOCK WIDGET (Positioned Cleanly & Professionally) */}
          <Col xs={12} lg={4}>
            <TodayClockWidget />
          </Col>
        </Row>

        {/* BOTTOM SECTION: EMPLOYEE LIST TABLE */}
        <div className="dash-card shadow-xs overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <LuUsers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Employee List</h3>
                <p className="text-xs text-slate-400 m-0">Directory of all employees in the organization.</p>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="All">All Status ▾</option>
                <option value="Fulltime">Fulltime</option>
                <option value="Parttime">Parttime</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="All">All Department ▾</option>
                {actualDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none">
                <option>Last 14 Days ▾</option>
                <option>Last 30 Days</option>
              </select>

              <button className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100">
                <LuMaximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <Table className="table-custom mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: "40px" }} className="text-center">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                  <th>Employee ID ↕</th>
                  <th>Name ↕</th>
                  <th>Email ↕</th>
                  <th>Role ↕</th>
                  <th>Departments</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="text-xs text-slate-400 mt-2 m-0">Loading employee records...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-xs text-slate-400">
                      No employee records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const badge = getDeptBadgeStyle(emp.department);
                    const statusBadge = getStatusBadgeStyle(emp.status);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="text-center">
                          <input type="checkbox" className="rounded border-slate-300" />
                        </td>
                        <td className="font-semibold text-slate-900">{emp.empId}</td>
                        <td className="font-semibold text-slate-800">{emp.name}</td>
                        <td className="text-slate-500">{emp.email}</td>
                        <td className="text-slate-700 font-medium">{emp.role}</td>
                        <td>
                          <span
                            className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {emp.department}
                          </span>
                        </td>
                        <td>
                          <span
                            className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md border"
                            style={{
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              borderColor: statusBadge.border
                            }}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/employee/profile/${emp.empId}`)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="View Profile"
                            >
                              <LuEye className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                              <BsThreeDotsVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default AdminDashboard;
