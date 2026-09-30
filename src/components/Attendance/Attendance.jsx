import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Form, Modal } from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuCalendar,
  LuClock,
  LuRefreshCw,
  LuBuilding,
  LuTable,
  LuSearch,
  LuFilter,
  LuDownload,
  LuPlus,
  LuChevronLeft,
  LuChevronRight,
  LuUserCheck,
  LuUserX,
  LuUserMinus,
  LuFileText,
  LuBriefcase,
  LuCircleCheck,
  LuCircleAlert,
  LuEllipsisVertical,
  LuPencil,
  LuShieldCheck,
  LuUser
} from "react-icons/lu";
import { MdEdit } from "react-icons/md";
import { getApiBaseUrl, getUploadUrl } from "../../api/axios";
import { exportToExcel } from "../../utils/excelExport";

const API = getApiBaseUrl();

const HONORIFICS = new Set([
  "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "miss", "dr", "dr.",
  "prof", "prof.", "er", "er.", "mx", "mx.", "shri", "smt", "sir", "madam"
]);

const getAttendanceInitials = (name) => {
  if (!name) return "E";
  const parts = name.trim().split(/\s+/).filter(p => !HONORIFICS.has(p.toLowerCase()));
  if (parts.length === 0) return name.trim().charAt(0).toUpperCase() || "E";
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const cleanStr = String(dateStr).split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    }
    return cleanStr;
  } catch (_) {
    return dateStr;
  }
};

const STATUS_BADGES = {
  Present: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0", label: "On Time" },
  "On Time": { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0", label: "On Time" },
  "Late Present": { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a", label: "Late" },
  Late: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a", label: "Late" },
  Absent: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca", label: "Absent" },
  Leave: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe", label: "Leave" },
  "Week Off": { bg: "#f8fafc", color: "#64748b", border: "#cbd5e1", label: "Week Off" },
  Scheduled: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", label: "Scheduled" },
  WFH: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe", label: "WFH" },
  "Work from home": { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe", label: "WFH" },
  Holiday: { bg: "#f0f9ff", color: "#0ea5e9", border: "#bae6fd", label: "Holiday" },
  "Half Day": { bg: "#fff7ed", color: "#ea580c", border: "#ffedd5", label: "Half Day" }
};

const MyAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active User Context & RBAC
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const role = (localStorage.getItem("role") || storedUser.role || "employee").toLowerCase();
  const userEmpId = storedUser.employee_id || localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";
  const userName = storedUser.name || localStorage.getItem("userName") || "Employee";
  const [userDept, setUserDept] = useState(storedUser.dept || "General");

  // RBAC Checks
  const isAdmin = role === "admin";
  const isHR = role === "hr" || role === "hrmanager";
  const isPayroll = role === "accounts" || role === "payroll";
  const isHOD = role === "hod";
  const isTeamLead = role === "teamlead" || role === "manager";
  const isEmployeeOnly = role === "employee";

  // Permissions Matrix
  const canManageAll = isAdmin || isHR;
  const canMarkAttendance = isAdmin || isHR || isHOD || isTeamLead;
  const isReadOnly = isPayroll || isEmployeeOnly;

  // Date Navigator State
  const [currentDateObj, setCurrentDateObj] = useState(new Date());
  const selectedDateStr = `${currentDateObj.getFullYear()}-${String(currentDateObj.getMonth() + 1).padStart(2, "0")}-${String(currentDateObj.getDate()).padStart(2, "0")}`;

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedShift, setSelectedShift] = useState("All");
  const [selectedRange, setSelectedRange] = useState("day"); // "day", "week", "month", "year"

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedNoteRecord, setSelectedNoteRecord] = useState(null);
  const [markForm, setMarkForm] = useState({
    id: null,
    employee_id: "",
    name: "",
    dept: "Design",
    date: selectedDateStr,
    check_in: "09:30",
    check_out: "18:30",
    status: "Present",
    notes: ""
  });

  // Navigate Date
  const handlePrevDay = () => {
    const d = new Date(currentDateObj);
    d.setDate(d.getDate() - 1);
    setCurrentDateObj(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDateObj);
    d.setDate(d.getDate() + 1);
    setCurrentDateObj(d);
  };

  const handleToday = () => {
    setCurrentDateObj(new Date());
  };

  const handlePrevMonth = () => {
    const d = new Date(currentDateObj);
    d.setMonth(d.getMonth() - 1);
    setCurrentDateObj(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDateObj);
    d.setMonth(d.getMonth() + 1);
    setCurrentDateObj(d);
  };

  // Monthly Attendance Records & Target Employee for KPI Widgets
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedKpiEmpId, setSelectedKpiEmpId] = useState("");

  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth() + 1;
  const monthYearTitle = currentDateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Fetch employees for dropdown & RBAC mapping
  useEffect(() => {
    fetch(`${API}/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        const empList = data.data || data.employees || [];
        setEmployees(empList);

        const me = empList.find(
          (e) => e.employee_code === userEmpId || e.employee_id === userEmpId || e.name === userName
        );
        if (me && (me.dept || me.department)) {
          setUserDept(me.dept || me.department);
        }
      })
      .catch((err) => console.error("Error fetching employees:", err));
  }, [token, userEmpId, userName]);

  // Fetch attendance list
  const fetchAttendanceList = async () => {
    setLoading(true);
    try {
      let url = `${API}/attendance?range=${selectedRange}&date=${selectedDateStr}`;
      if (fromDate && toDate) {
        url = `${API}/attendance?from=${fromDate}&to=${toDate}`;
      }
      if (selectedDept !== "All") {
        url += `&dept=${selectedDept}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceList(data.data || []);
      } else {
        toast.error(data.error || "Failed to load attendance records");
      }
    } catch (err) {
      console.error("Error fetching attendance list:", err);
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceList();
  }, [selectedDateStr, selectedRange, selectedDept, fromDate, toDate]);

  // Fetch full month attendance for KPI metrics
  const fetchMonthlyRecords = async () => {
    setMonthlyLoading(true);
    try {
      const monthQueryDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      let url = `${API}/attendance?range=month&date=${monthQueryDate}`;
      if (isEmployeeOnly) {
        url += `&scope=my`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMonthlyAttendanceRecords(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching monthly attendance records:", err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyRecords();
  }, [currentYear, currentMonth, token, isEmployeeOnly]);

  const handleRefreshAll = () => {
    fetchAttendanceList();
    fetchMonthlyRecords();
  };

  // Handle Mark Attendance Form Submit
  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedEmpObj = employees.find((e) => e.employee_code === markForm.employee_id || e.employee_id === markForm.employee_id);
      const payload = {
        ...markForm,
        id: markForm.id || undefined,
        name: selectedEmpObj ? selectedEmpObj.name : markForm.name,
        dept: selectedEmpObj ? (selectedEmpObj.dept || markForm.dept) : markForm.dept,
        date: markForm.date || selectedDateStr
      };

      const res = await fetch(`${API}/attendance/mark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Attendance record saved successfully!");
        setShowMarkModal(false);
        fetchAttendanceList();
        fetchMonthlyRecords();
      } else {
        toast.error(data.error || "Failed to mark attendance");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while marking attendance.");
    } finally {
      setSaving(false);
    }
  };

  // Export Attendance Excel Report
  const handleExportReport = () => {
    const headers = [
      "Employee Name",
      "Employee ID",
      "Date",
      "Department",
      "Designation",
      "Shift",
      "Check-In",
      "Check-Out",
      "Working Hours",
      "Overtime",
      "Status",
      "Notes"
    ];

    const rows = filteredRecords.map((r) => {
      const empCode = r.employee_id || "EMP";
      const empName = r.name || "Employee";
      const dateVal = r.date ? formatDateDisplay(r.date) : (selectedDateStr || "—");
      const deptVal = r.dept || "General";
      const checkIn = r.check_in || "—";
      const checkOut = r.check_out || "—";
      const workH = r.work_hours ? `${r.work_hours}h` : "—";
      const status = r.status || "Present";
      const notes = r.notes || "";
      const matchedEmp = employees.find(
        (e) => (e.employee_code || e.employee_id || "").toLowerCase() === empCode.toLowerCase()
      );
      const desigVal = r.designation || matchedEmp?.designation || "Staff";

      return [
        empName,
        empCode,
        dateVal,
        deptVal,
        desigVal,
        "General Shift",
        checkIn,
        checkOut,
        workH,
        "-",
        status,
        notes
      ];
    });

    exportToExcel({
      data: [headers, ...rows],
      fileName: `Attendance_Report_${selectedDateStr}.xlsx`,
      sheetName: "Attendance",
    });

    toast.success("Attendance Report exported to Excel successfully!");
  };

  // Filter attendance records by RBAC & Filter Bar
  const filteredRecords = attendanceList.filter((r) => {
    const empName = (r.name || "").toLowerCase();
    const empCode = (r.employee_id || "").toLowerCase();
    const empDept = (r.dept || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    // 1. Search Query
    if (query) {
      const matchesSearch = empName.includes(query) || empCode.includes(query) || empDept.includes(query);
      if (!matchesSearch) return false;
    }

    // 2. Date Range Filter (From & To)
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;

    // 3. Status Filter
    if (selectedStatus !== "All") {
      if (selectedStatus === "Present" && r.status !== "Present" && r.status !== "On Time") return false;
      if (selectedStatus === "Late" && r.status !== "Late Present" && r.status !== "Late") return false;
      if (selectedStatus === "Absent" && r.status !== "Absent") return false;
      if (selectedStatus === "Week Off" && r.status !== "Week Off") return false;
      if (selectedStatus === "Leave" && r.status !== "Leave") return false;
      if (selectedStatus === "WFH" && r.status !== "WFH" && r.status !== "Work from home") return false;
    }

    // 4. RBAC Scoping
    if (isEmployeeOnly) {
      return r.employee_id === userEmpId || empName.includes(userName.toLowerCase());
    }
    if (isHOD || isTeamLead) {
      if (userDept && userDept.toLowerCase() !== "general" && userDept.toLowerCase() !== "other") {
        const isMyDept = empDept.toLowerCase() === userDept.toLowerCase();
        const isMe = r.employee_id === userEmpId || empName.includes(userName.toLowerCase());
        if (!isMyDept && !isMe) return false;
      }
    }

    return true;
  });

  // 1. Target Employee Resolution for Personal/Employee KPI Widgets
  const effectiveEmpId = (
    selectedKpiEmpId ||
    (isEmployeeOnly ? userEmpId : (employees.some((e) => (e.employee_code || e.employee_id) === userEmpId) ? userEmpId : (employees[0]?.employee_code || employees[0]?.employee_id || userEmpId)))
  );

  const targetEmpObj = employees.find((e) => {
    const code = (e.employee_code || e.employee_id || "").toLowerCase();
    const name = (e.name || "").toLowerCase();
    return (
      (effectiveEmpId && code === effectiveEmpId.toLowerCase()) ||
      (effectiveEmpId && name === effectiveEmpId.toLowerCase()) ||
      (!effectiveEmpId && name === userName.toLowerCase())
    );
  }) || (employees.length > 0 && !isEmployeeOnly ? employees[0] : null);

  const displayTargetName = targetEmpObj?.name || (effectiveEmpId === userEmpId ? userName : (effectiveEmpId || "Employee"));
  const displayTargetCode = targetEmpObj?.employee_code || targetEmpObj?.employee_id || effectiveEmpId || userEmpId;

  // 2. Total Working Days Month-Wise (Current Month Leaving Rotational Week-Offs)
  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dayNamesList = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetWeeklyOffDay = (targetEmpObj?.weekly_off || "Sunday").toLowerCase().trim();
  let totalWorkingDaysMonth = 0;
  let monthWeekOffsCount = 0;
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dayDate = new Date(currentYear, currentMonth - 1, d);
    const dayName = dayNamesList[dayDate.getDay()];
    if (dayName === targetWeeklyOffDay) {
      monthWeekOffsCount++;
    } else {
      totalWorkingDaysMonth++;
    }
  }

  // 3. Reporting Manager Resolution
  const rawReportingManager = 
    targetEmpObj?.reporting_manager?.trim() ||
    (effectiveEmpId === userEmpId ? storedUser?.reporting_manager?.trim() : "") ||
    localStorage.getItem("reporting_manager") ||
    "";
    
  const reportingManager = 
    rawReportingManager && rawReportingManager !== "N/A" && rawReportingManager !== "null" && rawReportingManager !== "undefined"
      ? rawReportingManager
      : "Management / HR";

  const managerEmpObj = employees.find(
    (e) => (e.name || "").toLowerCase().trim() === reportingManager.toLowerCase().trim()
  );
  const managerSubtitle = managerEmpObj?.designation
    ? `${managerEmpObj.designation}${managerEmpObj.dept ? ` (${managerEmpObj.dept})` : ""}`
    : (targetEmpObj?.dept ? `${targetEmpObj.dept} Lead / Supervisor` : "Direct Supervisor");

  // 4. Monthly Present & Leaves Calculation for Target Employee
  const targetMonthlyRecords = monthlyAttendanceRecords.filter((r) => {
    const code = (r.employee_id || "").toLowerCase().trim();
    const name = (r.name || "").toLowerCase().trim();
    const matchCode = (displayTargetCode || "").toLowerCase().trim();
    const matchName = (displayTargetName || "").toLowerCase().trim();

    if (matchCode && code === matchCode) return true;
    if (matchName && name === matchName) return true;
    return false;
  });

  // Group by date to prevent duplicate counts if there are multiple punch logs on same date
  const monthlyDayMap = {};
  targetMonthlyRecords.forEach((r) => {
    if (!r.date) return;
    const dateKey = String(r.date).split("T")[0];
    const curStatus = r.status || "Present";
    const prevStatus = monthlyDayMap[dateKey];
    
    if (!prevStatus) {
      monthlyDayMap[dateKey] = curStatus;
    } else {
      const pLow = prevStatus.toLowerCase();
      const cLow = curStatus.toLowerCase();
      if (["present", "on time", "late present", "late", "wfh", "work from home"].includes(cLow)) {
        monthlyDayMap[dateKey] = curStatus;
      }
    }
  });

  let monthlyPresentDays = 0;
  let monthlyOnTimeCount = 0;
  let monthlyLateCount = 0;
  let monthlyWfhCount = 0;

  let monthlyLeaveDays = 0;
  let monthlyApprovedLeaves = 0;
  let monthlyAbsentCount = 0;
  let monthlyHalfDayCount = 0;

  Object.values(monthlyDayMap).forEach((status) => {
    const s = (status || "").toLowerCase().trim();
    if (s === "present" || s === "on time") {
      monthlyPresentDays += 1;
      monthlyOnTimeCount += 1;
    } else if (s === "late" || s === "late present") {
      monthlyPresentDays += 1;
      monthlyLateCount += 1;
    } else if (s === "wfh" || s === "work from home") {
      monthlyPresentDays += 1;
      monthlyWfhCount += 1;
    } else if (s === "half day") {
      monthlyPresentDays += 0.5;
      monthlyLeaveDays += 0.5;
      monthlyHalfDayCount += 1;
    } else if (s === "leave") {
      monthlyLeaveDays += 1;
      monthlyApprovedLeaves += 1;
    } else if (s === "absent") {
      monthlyLeaveDays += 1;
      monthlyAbsentCount += 1;
    }
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Formatted Date String for Navigator
  const formattedDateTitle = currentDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="max-w-7xl mx-auto px-4 pb-12 pt-6">
      {/* Custom CSS for enterprise UI matching attached screenshot */}
      <style>{`
        .att-summary-card, .att-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.03);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .att-summary-card:hover, .att-kpi-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .table-att th {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .table-att td {
          font-size: 12px;
          color: #1e293b;
          padding: 14px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .timeline-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #475569;
          font-weight: 600;
        }
        .timeline-line {
          flex: 1;
          height: 2px;
          background: #e2e8f0;
          position: relative;
        }
        .timeline-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .skeleton-pulse {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: pulse 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">Attendance</h1>

          {/* Date Navigator (< Monday, 15 October >) */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-1">{formattedDateTitle}</span>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LuChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="text-[10px] font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors ml-1"
            >
              Today
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
            title="Export Attendance Report (Excel)"
          >
            <LuFileText className="h-4 w-4 text-slate-500" /> Attendance Report
          </button>

          {canMarkAttendance && (
            <button
              onClick={() => setShowMarkModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
            >
              <LuPlus className="h-4 w-4" /> Add Attendance
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI WIDGETS SECTION */}
      <div className="mb-6 px-2">
        {/* KPI Section Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Monthly Attendance KPI Summary
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
              {monthYearTitle}
            </span>
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <LuChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <LuChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Employee Selector for Admins/HR/HOD */}
          {!isEmployeeOnly && employees.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <LuUser className="h-3.5 w-3.5 text-slate-400" />
                Viewing KPI for:
              </span>
              <select
                value={effectiveEmpId}
                onChange={(e) => setSelectedKpiEmpId(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 shadow-xs focus:outline-none focus:border-blue-500 hover:border-slate-300 transition-colors cursor-pointer max-w-[260px] truncate"
              >
                {employees.map((emp) => {
                  const code = emp.employee_code || emp.employee_id || emp.id;
                  const isCurrent = code === userEmpId;
                  return (
                    <option key={code} value={code}>
                      {emp.name} ({code}){isCurrent ? " • Me" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* 4 KPI CARDS GRID */}
        <Row className="g-3">
          {/* WIDGET 1: TOTAL WORKING DAYS (MONTH-WISE LEAVING SUNDAYS) */}
          <Col xs={12} sm={6} lg={3}>
            <div className="att-kpi-card relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between h-full group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                      <LuCalendar className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Total Working Days
                    </span>
                  </div>
                  {/* <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Month-wise
                  </span> */}
                </div>

                <div className="flex justify-center items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {totalWorkingDaysMonth}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Days
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {currentDateObj.toLocaleDateString("en-US", { month: "short" })}: {daysInCurrentMonth} Total Days
                </span>
                <span className="font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Excl. {monthWeekOffsCount} Week-Offs
                </span>
              </div>
            </div>
          </Col>

          {/* WIDGET 2: PRESENT (EMPLOYEE WORKING DAYS) */}
          <Col xs={12} sm={6} lg={3}>
            <div className="att-kpi-card relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between h-full group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                      <LuUserCheck className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Present Days
                    </span>
                  </div>
                  {/* <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Employee Working
                  </span> */}
                </div>

                <div className="flex justify-center items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">
                    {monthlyPresentDays}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    / {totalWorkingDaysMonth} Days
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {Math.round((monthlyPresentDays / (totalWorkingDaysMonth || 1)) * 100)}% Monthly Rate
                </span>
                <span className="text-slate-500 text-[10px] font-semibold truncate max-w-[130px]" title={`${monthlyOnTimeCount} on time, ${monthlyLateCount} late, ${monthlyWfhCount} WFH`}>
                  {monthlyOnTimeCount} on-time{monthlyLateCount ? `, ${monthlyLateCount} late` : ""}{monthlyWfhCount ? `, ${monthlyWfhCount} WFH` : ""}
                </span>
              </div>
            </div>
          </Col>

          {/* WIDGET 3: LEAVES (ABSENT OR LEAVE TAKEN) */}
          <Col xs={12} sm={6} lg={3}>
            <div className="att-kpi-card relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between h-full group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                      <LuUserX className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Leaves
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    Absent / Taken
                  </span>
                </div>

                <div className="flex justify-center items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-amber-600 tracking-tight">
                    {monthlyLeaveDays}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Days
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {monthlyApprovedLeaves} Leave{monthlyApprovedLeaves === 1 ? "" : "s"} Taken
                </span>
                <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-[10px]">
                  {monthlyAbsentCount} Absent{monthlyHalfDayCount ? ` · ${monthlyHalfDayCount} Half` : ""}
                </span>
              </div>
            </div>
          </Col>

          {/* WIDGET 4: REPORTING MANAGER NAME */}
          <Col xs={12} sm={6} lg={3}>
            <div className="att-kpi-card relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between h-full group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                      <LuBriefcase className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Reporting Manager
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                    <LuShieldCheck className="h-3 w-3" /> Assigned
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                    {getAttendanceInitials(reportingManager)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-extrabold text-slate-900 truncate" title={reportingManager}>
                      {reportingManager}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 truncate">
                      {targetEmpObj?.dept ? `${targetEmpObj.dept} Dept` : "Designated Supervisor"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-purple-700 truncate max-w-[170px]" title={managerSubtitle}>
                  {managerSubtitle}
                </span>
                <span className="text-slate-400 text-[10px] font-bold">
                  {targetEmpObj?.name ? targetEmpObj.name.split(" ")[0] + "'s Lead" : "Direct Lead"}
                </span>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search employee name, ID, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 shadow-xs w-full"
            />
          </div>

          {/* Date Filter Range (From & To) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="font-bold text-slate-500 text-[11px]">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="font-bold text-slate-500 text-[11px]">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1.5 rounded-lg transition-colors"
            >
              Clear Dates
            </button>
          )}

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <LuCalendar className="text-slate-400 h-3.5 w-3.5" />
            <span className="text-xs font-bold text-slate-500">Range:</span>
            <select
              value={selectedRange}
              onChange={(e) => {
                setSelectedRange(e.target.value);
                if (fromDate || toDate) {
                  setFromDate("");
                  setToDate("");
                }
              }}
              className="text-xs font-extrabold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="day">Single Day</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Advance Filter Dropdown (Status) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <LuFilter className="text-slate-400 h-3.5 w-3.5" />
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-extrabold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Week Off">Week Off</option>
              <option value="Leave">Leave</option>
              <option value="WFH">WFH</option>
            </select>
          </div>

          {/* Department Filter (Admin, HR, HOD, Lead) */}
          {(canManageAll || isHOD || isTeamLead) && (
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 shadow-xs"
            >
              <option value="All">All Departments ▾</option>
              <option value="HR">HR</option>
              <option value="Accounts">Accounts</option>
              <option value="IT">IT</option>
              <option value="Service">Service</option>
              <option value="Design">Design</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh Attendance List & KPIs"
          >
            <LuRefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* RESPONSIVE TABLE CONTAINER (Without Photo & Location columns) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-att mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ minWidth: "220px" }}>Employee Name</th>
                <th style={{ minWidth: "110px" }}>Employee ID</th>
                <th style={{ minWidth: "125px" }}>Date</th>
                <th style={{ minWidth: "120px" }}>Department</th>
                <th style={{ minWidth: "150px" }}>Designation</th>
                <th style={{ minWidth: "110px" }}>Shift</th>
                <th style={{ minWidth: "100px" }}>Check-In</th>
                <th style={{ minWidth: "110px" }}>Check-Out</th>
                <th style={{ minWidth: "200px" }}>Working Hours</th>
                <th style={{ minWidth: "90px" }}>Overtime</th>
                <th style={{ minWidth: "100px" }}>Status</th>
                <th style={{ minWidth: "140px" }}>Notes</th>
                <th style={{ minWidth: "80px" }} className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // SKELETON LOADERS (3 Skeleton Rows)
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={13} className="py-3">
                      <div className="skeleton-pulse h-8 w-full"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-5 text-xs text-slate-400">
                    No attendance records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const sBadge = STATUS_BADGES[r.status] || STATUS_BADGES.Present;
                  const matchedEmp = employees.find(
                    (e) => (e.employee_code || e.employee_id || "").toLowerCase() === (r.employee_id || "").toLowerCase()
                  );
                  const empDesignation = r.designation || matchedEmp?.designation || "Staff";
                  const empPhoto = r.profile_photo || matchedEmp?.profile_photo || null;
                  const empInitials = getAttendanceInitials(r.name || matchedEmp?.name || "Employee");

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Name Column */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          {empPhoto ? (
                            <img
                              src={getUploadUrl(empPhoto)}
                              alt={r.name || "Employee"}
                              className="w-8 h-8 rounded-full object-cover shadow-xs border border-slate-200"
                              onError={(e) => {
                                e.target.style.display = "none";
                                const next = e.target.nextElementSibling;
                                if (next) next.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs"
                            style={{ display: empPhoto ? "none" : "flex" }}
                          >
                            {empInitials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{r.name || "Employee"}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{r.employee_id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="font-semibold text-slate-700 text-xs">{r.employee_id}</td>

                      {/* Date */}
                      <td className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <LuCalendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span>{formatDateDisplay(r.date)}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td>
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700">
                          {r.dept || userDept || "General"}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="text-xs text-slate-600 font-medium">
                        {empDesignation}
                      </td>

                      {/* Shift */}
                      <td>
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md border"
                          style={
                            (r.shift_name || "").includes("Morning")
                              ? { backgroundColor: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }
                              : (r.shift_name || "").includes("Evening")
                                ? { backgroundColor: "#fffbeb", color: "#92400e", borderColor: "#fde68a" }
                                : (r.shift_name || "").includes("Night")
                                  ? { backgroundColor: "#f5f3ff", color: "#5b21b6", borderColor: "#ddd6fe" }
                                  : { backgroundColor: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }
                          }
                        >
                          {r.shift_name || "General Shift"}
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="text-xs font-bold text-emerald-600">
                        {r.check_in ? r.check_in : <span className="text-slate-400 font-semibold">—</span>}
                      </td>

                      {/* Check-Out */}
                      <td className="text-xs font-bold text-slate-700">
                        {r.check_out ? r.check_out : <span className="text-slate-400 font-semibold">—</span>}
                      </td>

                      {/* Working Hours Timeline Format */}
                      <td>
                        {r.status === "Absent" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Absent (No Check-In)
                          </span>
                        ) : r.status === "Week Off" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Rotational Week Off
                          </span>
                        ) : r.status === "Scheduled" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Upcoming Scheduled Shift
                          </span>
                        ) : r.status === "Leave" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Approved Leave
                          </span>
                        ) : (
                          <div className="timeline-bar">
                            <span>{r.check_in || "10:00 AM"}</span>
                            <div className="timeline-line flex items-center justify-center">
                              <span className="bg-white px-1.5 text-[9px] font-extrabold text-slate-500">
                                {r.work_hours ? `${r.work_hours}h` : "8h 00m"}
                              </span>
                            </div>
                            <span>{r.check_out || "07:00 PM"}</span>
                          </div>
                        )}
                      </td>

                      {/* Overtime */}
                      <td className="text-xs font-semibold text-slate-600">
                        {r.work_hours && parseFloat(r.work_hours) > 9 ? `${(parseFloat(r.work_hours) - 9).toFixed(1)}h` : "—"}
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span
                          className="px-2.5 py-1 text-[11px] font-extrabold rounded-full border inline-block"
                          style={{
                            backgroundColor: sBadge.bg,
                            color: sBadge.color,
                            borderColor: sBadge.border
                          }}
                        >
                          {r.status === "Present" && !r.late_count ? "On Time" : sBadge.label}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="text-xs max-w-[170px]">
                        {r.notes ? (
                          <button
                            type="button"
                            onClick={() => setSelectedNoteRecord(r)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 hover:border-amber-300 transition-all max-w-[160px] text-left group shadow-xs cursor-pointer"
                            title="Click to view full note details"
                          >
                            <span className="shrink-0 text-[12px]">📝</span>
                            <span className="truncate">{r.notes}</span>
                            {r.notes.length > 20 && (
                              <span className="text-[10px] text-amber-600 font-bold shrink-0 opacity-70 group-hover:opacity-100">
                                ▾
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        {canMarkAttendance ? (
                          <button
                            onClick={() => {
                              setMarkForm({
                                id: typeof r.id === "number" ? r.id : null,
                                employee_id: r.employee_id,
                                name: r.name,
                                dept: r.dept,
                                date: r.date || selectedDateStr,
                                check_in: r.check_in || "10:00",
                                check_out: r.check_out || "19:00",
                                status: r.status === "Absent" || r.status === "Week Off" ? "Present" : (r.status || "Present"),
                                notes: r.notes || ""
                              });
                              setShowMarkModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit Attendance & Notes"
                          >
                            <MdEdit className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* PAGINATION BAR */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50 font-bold focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{" "}
              {Math.min(currentPage * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl border border-slate-200 text-xs font-bold transition-colors ${currentPage === 1 ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:bg-slate-100 cursor-pointer"
                }`}
            >
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-700 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-xl border border-slate-200 text-xs font-bold transition-colors ${currentPage === totalPages ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:bg-slate-100 cursor-pointer"
                }`}
            >
              <LuChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MARK / EDIT ATTENDANCE MODAL */}
      <Modal show={showMarkModal} onHide={() => setShowMarkModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuClock className="text-emerald-600" /> {markForm.id ? "Edit Attendance & Notes" : "Mark / Update Attendance"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleMarkSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Select Employee</Form.Label>
              <Form.Select
                value={markForm.employee_id}
                onChange={(e) => setMarkForm({ ...markForm, employee_id: e.target.value })}
                required
                className="text-xs py-2 rounded-xl"
              >
                <option value="">Choose Employee ▾</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employee_code || emp.employee_id}>
                    {emp.name} ({emp.employee_code || emp.employee_id}) — {emp.dept || "General"}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Attendance Status</Form.Label>
              <Form.Select
                value={markForm.status}
                onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
                className="text-xs py-2 rounded-xl"
              >
                <option value="Present">Present</option>
                <option value="Late Present">Late Present</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
                <option value="WFH">Work From Home (WFH)</option>
                <option value="Half Day">Half Day</option>
                <option value="Holiday">Holiday</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Check-In Time</Form.Label>
                <Form.Control
                  type="time"
                  value={markForm.check_in}
                  onChange={(e) => setMarkForm({ ...markForm, check_in: e.target.value })}
                  className="text-xs py-2 rounded-xl"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Check-Out Time</Form.Label>
                <Form.Control
                  type="time"
                  value={markForm.check_out}
                  onChange={(e) => setMarkForm({ ...markForm, check_out: e.target.value })}
                  className="text-xs py-2 rounded-xl"
                />
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-slate-700 flex items-center gap-1.5">
                Notes / Remarks <span className="text-slate-400 font-normal text-[11px]">(Visible to Employee)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Reason for late/leave or remarks visible to employee..."
                value={markForm.notes}
                onChange={(e) => setMarkForm({ ...markForm, notes: e.target.value })}
                className="text-xs py-2 rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setShowMarkModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 text-xs font-bold rounded-xl border-0">
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ATTENDANCE NOTE DETAILS POPUP MODAL */}
      <Modal
        show={!!selectedNoteRecord}
        onHide={() => setSelectedNoteRecord(null)}
        centered
        className="rounded-4"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <span className="text-amber-500 text-xl">📝</span> Attendance Note & Remarks
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedNoteRecord && (
            <div>
              {/* Record Summary Header */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-800 text-sm">
                    {selectedNoteRecord.name || "Employee"}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    {selectedNoteRecord.employee_id} • {selectedNoteRecord.dept || "General"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700">
                    {formatDateDisplay(selectedNoteRecord.date)}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {selectedNoteRecord.status}
                  </span>
                </div>
              </div>

              {/* Note Content Box */}
              <div className="mb-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  HR / Supervisor Note
                </label>
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap break-words shadow-xs">
                  {selectedNoteRecord.notes}
                </div>
              </div>

              {/* Attendance Context Info */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Check-In</span>
                  <span className="font-bold text-slate-700">{selectedNoteRecord.check_in || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Check-Out</span>
                  <span className="font-bold text-slate-700">{selectedNoteRecord.check_out || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Shift</span>
                  <span className="font-bold text-slate-700">{selectedNoteRecord.shift_name || "General Shift"}</span>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedNoteRecord(null)}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold"
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyAttendance;