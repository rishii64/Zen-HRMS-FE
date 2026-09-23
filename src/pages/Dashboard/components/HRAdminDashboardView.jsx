import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Table, Spinner, Modal, Dropdown } from "react-bootstrap";
import {
  LuUsers,
  LuClock,
  LuBuilding2,
  LuUserCheck,
  LuUserX,
  LuSearch,
  LuEye,
  LuMaximize2,
  LuSparkles,
  LuPencil,
  LuExternalLink,
  LuMail,
  LuPhone,
  LuCalendar,
  LuBriefcase,
  LuStar,
  LuUser,
  LuIndianRupee,
  LuCopy,
  LuCheck,
  LuBadgeCheck,
  LuMapPin,
  LuShieldCheck,
  LuX
} from "react-icons/lu";
import { BsThreeDotsVertical } from "react-icons/bs";
import toast from "react-hot-toast";
import { getApiBaseUrl, getUploadUrl } from "../../../api/axios";

const API = getApiBaseUrl();

export default function HRAdminDashboardView() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [chartRange, setChartRange] = useState("7");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // View Details Modal State
  const [viewEmployee, setViewEmployee] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewImgError, setViewImgError] = useState(false);

  const getPhotoUrl = (emp) => {
    if (!emp) return "";
    const photo = emp.profile_photo || emp.profile_pic || emp.avatar || emp.photo;
    if (!photo || typeof photo !== "string" || photo.trim() === "" || photo === "null" || photo === "undefined") {
      return "";
    }
    return getUploadUrl(photo.trim());
  };

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "E";
    const clean = name.trim().replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i, "");
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "E";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const openViewModal = (emp) => {
    setViewEmployee(emp);
    setViewImgError(false);
    setShowViewModal(true);
  };

  // Edit Employee Modal State
  const [editEmployee, setEditEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    employee_code: "",
    name: "",
    email: "",
    dept: "IT",
    designation: "",
    status: "Active",
    phone_no: "",
    joining_date: "",
    reporting_manager: "",
    current_salary: "",
    kpi: "4.8",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Fetch real-time employee data
  const loadEmployees = () => {
    const token = localStorage.getItem("token");
    setLoading(true);

    fetch(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const empList = data.data || data.employees || [];
        if (data.success && Array.isArray(empList) && empList.length > 0) {
          const mapped = empList.map((emp) => ({
            id: emp.id,
            empId: emp.employee_code || emp.employee_id || `EMP-${emp.id}`,
            employee_code: emp.employee_code || emp.employee_id || `EMP-${emp.id}`,
            name: emp.name || "Employee",
            email: emp.email || "n/a@zentelex.com",
            role: emp.designation || emp.job_role || "Staff",
            designation: emp.designation || emp.job_role || "Staff",
            department: emp.dept || emp.department || "General",
            dept: emp.dept || emp.department || "General",
            status: emp.status || "Active",
            performance: emp.kpi || "4.8",
            kpi: emp.kpi || "4.8",
            phone_no: emp.phone_no || "",
            joining_date: emp.joining_date ? String(emp.joining_date).split("T")[0] : "",
            reporting_manager: emp.reporting_manager || "Admin",
            current_salary: emp.current_salary || "",
            job_role: emp.job_role || "employee",
            profile_photo: emp.profile_photo || emp.profile_pic || emp.avatar || emp.photo || "",
            tabs_enabled: emp.tabs_enabled || false,
            enabled_tabs: emp.enabled_tabs || "",
          }));
          setEmployeeData(mapped);
        }
      })
      .catch((err) => console.error("Error loading employees:", err))
      .finally(() => setLoading(false));
  };

  const openEditModal = (emp) => {
    setShowViewModal(false);
    setEditEmployee(emp);
    setEditForm({
      employee_code: emp.employee_code || emp.empId || "",
      name: emp.name || "",
      email: emp.email || "",
      dept: emp.department || emp.dept || "IT",
      designation: emp.role || emp.designation || "Staff",
      status: emp.status || "Active",
      phone_no: emp.phone_no || "",
      joining_date: emp.joining_date ? String(emp.joining_date).split("T")[0] : "",
      reporting_manager: emp.reporting_manager || "Admin",
      current_salary: emp.current_salary || "",
      kpi: emp.kpi || emp.performance || "4.8",
      job_role: emp.job_role || "employee",
      tabs_enabled: emp.tabs_enabled || false,
      enabled_tabs: emp.enabled_tabs || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingEdit(true);

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") || "hr";

    // Validate required fields
    if (!editForm.name || !editForm.email || !editForm.dept || !editForm.designation) {
      toast.error("Please fill all required fields!");
      setSavingEdit(false);
      return;
    }

    const payload = {
      ...editForm,
      employee_code: editForm.employee_code || (editEmployee && editEmployee.empId),
      phone_no: editForm.phone_no || "+91 9876543210",
      joining_date: editForm.joining_date || new Date().toISOString().split("T")[0],
      reporting_manager: editForm.reporting_manager || "Admin",
      current_salary: editForm.current_salary ? parseFloat(editForm.current_salary) : 50000,
    };

    try {
      const res = await fetch(`${API}/employees/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          role: role,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Employee profile updated successfully!");
        setShowEditModal(false);
        // Refresh employees
        loadEmployees();
      } else {
        toast.error(data.error || data.message || "Failed to update employee profile");
      }
    } catch (err) {
      console.error("Error saving employee edit:", err);
      toast.error("Failed to connect to server");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    loadEmployees();

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

  // Compute Real-Time Avg Work Hours Metrics
  const calculateRealAvgWorkHours = () => {
    if (attendanceData.length === 0) {
      return {
        avgStr: "4.7 hours",
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
          dailyMap[rec.date] = (dailyMap[rec.date] || 0) + mins / 60;
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

  const actualDepartments = Array.from(
    new Set(employeeData.map((e) => e.department).filter(Boolean))
  );

  const getDeptBadgeStyle = (dept) => {
    const d = (dept || "").toLowerCase();
    if (d.includes("design")) return { bg: "#dcfce7", color: "#15803d" };
    if (d.includes("market")) return { bg: "#ffedd5", color: "#c2410c" };
    if (d.includes("dev") || d.includes("engin")) return { bg: "#f3e8ff", color: "#7e22ce" };
    if (d.includes("hr")) return { bg: "#e0f2fe", color: "#0369a1" };
    return { bg: "#f1f5f9", color: "#475569" };
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("full") || s.includes("active")) return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
    if (s.includes("part")) return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
    if (s.includes("intern")) return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
    if (s.includes("contract")) return { bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" };
    if (s.includes("leave")) return { bg: "#fefce8", color: "#a16207", border: "#fef08a" };
    if (s.includes("inact")) return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  };

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
    <div className="hr-admin-section">
      {/* 4 PRIMARY METRIC KPI CARDS */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Employees */}
        <Col xs={12} sm={6} lg={3}>
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <LuUsers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">Total Employees</h4>
                    <p className="text-[11px] text-slate-400 m-0">All corporate staff</p>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalEmployees}</span>
                <button
                  onClick={() => navigate("/admin/manage-employees")}
                  className="btn-details flex items-center gap-1"
                >
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
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <LuBuilding2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">Departments</h4>
                    <p className="text-[11px] text-slate-400 m-0">Total active divisions</p>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{uniqueDepartments}</span>
                <button
                  onClick={() => navigate("/admin/manage-employees")}
                  className="btn-details flex items-center gap-1"
                >
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
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <LuUserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">Today Presents</h4>
                    <p className="text-[11px] text-slate-400 m-0">Checked-in employees</p>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-3">
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
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <LuUserX className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">Today Absents</h4>
                    <p className="text-[11px] text-slate-400 m-0">Total staff absent today</p>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-3">
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

      {/* 2 ANALYTICS CHARTS IN A ROW */}
      <Row className="g-3 mb-4">
        {/* Left Chart: Avg Work Hours */}
        <Col xs={12} lg={6}>
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <LuClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 m-0">Average Work Hours</h4>
                    <p className="text-[11px] text-slate-400 m-0">Track daily work hours across all staff</p>
                  </div>
                </div>
                <LuMaximize2 className="text-slate-400 h-4 w-4 cursor-pointer hover:text-slate-600" />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">{realAvg.avgStr}</span>
                </div>

                <select
                  value={chartRange}
                  onChange={(e) => setChartRange(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 bg-slate-50 font-medium focus:outline-none"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                </select>
              </div>

              {/* Interactive SVG Area Step Chart */}
              <div className="relative h-44 w-full">
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

                <svg className="w-full h-[90%]" viewBox="0 0 320 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="50" x2="320" y2="50" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                  <polygon points={realAvg.areaPoints} fill="url(#chartGrad)" />
                  <polyline points={realAvg.points} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                </svg>

                <div className="absolute left-4 top-9 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  Avg {realAvg.avgVal} h
                </div>

                <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNum, i) => (
                    <span
                      key={dayNum}
                      onMouseEnter={() => setHoveredDay(i)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${hoveredDay === i ? "text-indigo-600 font-bold bg-indigo-50" : "hover:text-slate-700"
                        }`}
                    >
                      Day {dayNum}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* Right Chart: Work Hours Per Month */}
        <Col xs={12} lg={6}>
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
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

              <div className="mt-3 flex items-center gap-6 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600"></span> Standard Work-Time
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

              {/* Grouped Bar Chart */}
              <div className="relative flex items-end justify-around h-40 pt-4 border-b border-slate-100">
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
                        className="w-6 bg-indigo-600 rounded-t-md transition-all duration-300 group-hover:bg-indigo-700"
                        style={{ height: m.workPx }}
                        title={`Work-Time: ${m.workH}h`}
                      ></div>
                      <div
                        className="w-6 bg-cyan-400 rounded-t-md transition-all duration-300 group-hover:bg-cyan-500"
                        style={{ height: m.overPx }}
                        title={`Overtime: ${m.overH}h`}
                      ></div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold transition-colors ${hoveredMonth === idx ? "text-indigo-600 font-bold" : "text-slate-500"
                        }`}
                    >
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* EMPLOYEE DIRECTORY TABLE */}
      <div className="dash-card shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <LuUsers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Employee Directory</h3>
              <p className="text-xs text-slate-400 m-0">Directory of all staff in the organization.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 pl-8 bg-slate-50 text-slate-700 focus:outline-none w-48"
              />
              <LuSearch className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" />
            </div>

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
              <option value="All">All Departments ▾</option>
              {actualDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <button
              onClick={() => navigate("/admin/manage-employees")}
              className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              Manage Employees →
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
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Departments</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" />
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
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Eye Icon -> View Employee Details Modal */}
                          <button
                            type="button"
                            onClick={() => openViewModal(emp)}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 flex items-center justify-center transition-all shadow-2xs cursor-pointer group"
                            title="Quick Overview"
                          >
                            <LuEye className="h-4 w-4 transition-transform group-hover:scale-110" />
                          </button>

                          {/* 3-Dots -> Edit Profile Action Dropdown */}
                          <Dropdown align="end" className="inline-block">
                            <Dropdown.Toggle
                              as="button"
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-800 text-slate-500 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                              title="More Options"
                            >
                              {/* <BsThreeDotsVertical className="h-3.5 w-3.5" /> */}
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow-2xl shadow-slate-900/15 border border-slate-100 rounded-2xl p-1.5 text-xs min-w-[195px] z-50 bg-white ring-1 ring-black/5 animate-in fade-in duration-150">
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Employee Actions
                              </div>
                              <Dropdown.Item
                                onClick={() => openEditModal(emp)}
                                style={{ display: "flex", alignItems: "center", gap: "10px" }}
                                className="!flex !flex-row !items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-semibold cursor-pointer transition-colors group"
                              >
                                <span
                                  style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                  className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors flex-shrink-0 flex items-center justify-center"
                                >
                                  <LuPencil className="h-3.5 w-3.5" />
                                </span>
                                <span className="whitespace-nowrap">Edit Profile</span>
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => openViewModal(emp)}
                                style={{ display: "flex", alignItems: "center", gap: "10px" }}
                                className="!flex !flex-row !items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-semibold cursor-pointer transition-colors group"
                              >
                                <span
                                  style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                  className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors flex-shrink-0 flex items-center justify-center"
                                >
                                  <LuEye className="h-3.5 w-3.5" />
                                </span>
                                <span className="whitespace-nowrap">Quick Overview</span>
                              </Dropdown.Item>
                              <Dropdown.Divider className="my-1 border-slate-100" />
                              <Dropdown.Item
                                onClick={() => navigate(`/employee/profile/${emp.empId}`)}
                                style={{ display: "flex", alignItems: "center", gap: "10px" }}
                                className="!flex !flex-row !items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer transition-colors group"
                              >
                                <span
                                  style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                  className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors flex-shrink-0 flex items-center justify-center"
                                >
                                  <LuExternalLink className="h-3.5 w-3.5" />
                                </span>
                                <span className="whitespace-nowrap">Full Profile Page</span>
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
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

      {/* ============================================================ */}
      {/* 1. EMPLOYEE DETAILS VIEW MODAL (FROM EYE ICON)               */}
      {/* ============================================================ */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        size="lg"
        backdropClassName="bg-slate-950/60 backdrop-blur-md"
        contentClassName="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white ring-1 ring-black/5"
      >
        {viewEmployee && (
          <div>
            {/* Top Executive Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden px-7 pt-7 pb-6">
              {/* Ambient decorative blurs */}
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute left-1/3 -bottom-10 w-36 h-36 bg-purple-500/15 rounded-full blur-xl pointer-events-none" />

              {/* Profile Main Identity Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {getPhotoUrl(viewEmployee) && !viewImgError ? (
                      <img
                        src={getPhotoUrl(viewEmployee)}
                        alt={viewEmployee.name}
                        onError={() => setViewImgError(true)}
                        className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/15 border border-white/20 shadow-xl bg-slate-800"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xl ring-4 ring-white/15 border border-white/20 tracking-wider select-none">
                        {getInitials(viewEmployee.name)}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-slate-900 flex items-center justify-center ${viewEmployee.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-white/90" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight m-0 leading-tight">
                      {viewEmployee.name}
                    </h3>
                    <p className="text-sm font-semibold text-indigo-200 m-0 mt-1">
                      {viewEmployee.role || viewEmployee.designation || "Staff Member"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 backdrop-blur-xs">
                        <LuBuilding2 className="h-3 w-3 text-indigo-300" />
                        <span>{viewEmployee.department || "General"}</span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border backdrop-blur-xs"
                        style={{
                          backgroundColor: `${getStatusBadgeStyle(viewEmployee.status).bg}25`,
                          color: "#fff",
                          borderColor: `${getStatusBadgeStyle(viewEmployee.status).border}60`
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getStatusBadgeStyle(viewEmployee.status).color }}
                        />
                        {viewEmployee.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-medium text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-white/90">Employee Profile</span>
                    <span className="text-white/40">•</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewEmployee.empId)}
                      className="inline-flex items-center gap-1.5 hover:text-white hover:bg-white/10 px-2 py-0.5 rounded-full font-mono transition-colors cursor-pointer"
                      title="Click to copy ID"
                    >
                      <span>{viewEmployee.empId}</span>
                      {copiedId ? (
                        <LuCheck className="h-3 w-3 text-emerald-300" />
                      ) : (
                        <LuCopy className="h-3 w-3 text-white/60" />
                      )}
                    </button>
                  </div>

                  <button type="button" onClick={() => setShowViewModal(false)} title="Close"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
                    <LuX className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body: Stats Grid & Detail Panels */}
            <Modal.Body className="p-6 bg-slate-50/60 space-y-5 max-h-[62vh] overflow-y-auto">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/60">
                      <LuBuilding2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Department
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate" title={viewEmployee.department}>
                    {viewEmployee.department || "General"}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                      <LuCalendar className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Joined On
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {viewEmployee.joining_date
                      ? new Date(viewEmployee.joining_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })
                      : "15 Jan 2023"}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100/60">
                      <LuUserCheck className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reporting To
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate" title={viewEmployee.reporting_manager}>
                    {viewEmployee.reporting_manager || "Management"}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100/60">
                      <LuBriefcase className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {viewEmployee.status || "Active"}
                  </div>
                </div>
              </div>

              {/* 2 Elevated Detail Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Information Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <LuMail className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                      Direct Contact Details
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                        Work Email
                      </span>
                      <div className="flex items-center justify-between">
                        <a
                          href={`mailto:${viewEmployee.email}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline truncate"
                        >
                          {viewEmployee.email || "n/a"}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(viewEmployee.email)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          title="Copy Email"
                        >
                          <LuCopy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                        Phone Number
                      </span>
                      <div className="flex items-center justify-between">
                        <a
                          href={`tel:${viewEmployee.phone_no || viewEmployee.phone || "+91 9876543210"}`}
                          className="text-xs font-semibold text-slate-800 font-mono hover:text-indigo-600 transition-colors"
                        >
                          {viewEmployee.phone_no || viewEmployee.phone || "+91 9876543210"}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(viewEmployee.phone_no || viewEmployee.phone || "+91 9876543210")}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          title="Copy Phone"
                        >
                          <LuCopy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                        Office Location
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <LuMapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>Corporate Office (HQ)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Compensation Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <LuShieldCheck className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                      Role & Compensation
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                        Designation / Job Role
                      </span>
                      <div className="text-xs font-semibold text-slate-800">
                        {viewEmployee.role || viewEmployee.designation || "Staff Member"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                        Monthly Salary Structure
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <LuIndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                        <span>
                          {viewEmployee.current_salary
                            ? `₹${Number(viewEmployee.current_salary).toLocaleString("en-IN")} / month`
                            : "Configured in Payroll Module"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                        System Access Level
                      </span>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        <LuBadgeCheck className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Standard Staff Portal Access</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Modal.Body>

            {/* Modal Footer */}
            <div className="px-7 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  navigate(`/employee/profile/${viewEmployee.empId}`);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors group cursor-pointer"
              >
                <span>Open Full Profile Page</span>
                <LuExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(viewEmployee);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <LuPencil className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* 2. EDIT EMPLOYEE PROFILE MODAL (FROM 3-DOTS OR VIEW MODAL)   */}
      {/* ============================================================ */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
        size="md"
        backdropClassName="bg-slate-950/60 backdrop-blur-md"
        contentClassName="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white ring-1 ring-black/5"
      >
        <form onSubmit={handleSaveEdit}>
          {/* Executive Modal Header */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative overflow-hidden flex items-center justify-between">
            {/* Ambient decorative blur */}
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-indigo-300 shadow-inner flex-shrink-0">
                <LuPencil className="h-5 w-5" />
              </div>
              <div>
                <Modal.Title className="text-lg font-bold text-white tracking-tight m-0">
                  Edit Employee Profile
                </Modal.Title>
                <p className="text-xs text-indigo-200/80 m-0 mt-0.5">
                  Update credentials and details for <span className="font-semibold text-white">{editForm.name}</span> ({editForm.employee_code})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer relative z-10"
              title="Close"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>

          <Modal.Body className="p-6 bg-slate-50/60 max-h-[70vh] overflow-y-auto space-y-5">
            {/* Section 1: Personal Credentials Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <LuUser className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                  Personal Information
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                    placeholder="name@zentelex.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone_no}
                    onChange={(e) => setEditForm({ ...editForm, phone_no: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs font-mono"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Employee Code (Read-Only)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editForm.employee_code}
                    className="w-full text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Role & Department Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <LuBuilding2 className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                  Employment & Role
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.dept}
                    onChange={(e) => setEditForm({ ...editForm, dept: e.target.value })}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                  >
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                    <option value="General">General</option>
                    <option value="Other">Other</option>
                    {actualDepartments
                      .filter((d) => !["IT", "HR", "Accounts", "Design", "Marketing", "Operations", "Sales", "General", "Other"].includes(d))
                      .map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Designation / Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                    placeholder="e.g. Associate Engineer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Employment Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Relieved">Relieved</option>
                    <option value="Separated">Separated</option>
                    <option value="Fulltime">Fulltime</option>
                    <option value="Parttime">Parttime</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={editForm.joining_date}
                    onChange={(e) => setEditForm({ ...editForm, joining_date: e.target.value })}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Compensation & Appraisal Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <LuIndianRupee className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
                  Compensation & Appraisal
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Monthly Salary (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={editForm.current_salary}
                      onChange={(e) =>
                        setEditForm({ ...editForm, current_salary: e.target.value })
                      }
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-7 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs font-mono"
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Reporting Manager
                  </label>
                  <input
                    type="text"
                    value={editForm.reporting_manager}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reporting_manager: e.target.value })
                    }
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
                    placeholder="e.g. Biswajit Bag"
                  />
                </div>

                {/* <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Performance KPI (1-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editForm.kpi}
                    onChange={(e) => setEditForm({ ...editForm, kpi: e.target.value })}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs font-mono"
                    placeholder="4.8"
                  />
                </div> */}
              </div>
            </div>
          </Modal.Body>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {savingEdit ? (
                <>
                  <Spinner size="sm" animation="border" className="text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <LuCheck className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
