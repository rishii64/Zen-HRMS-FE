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
  LuPencil
} from "react-icons/lu";
import { MdEdit } from "react-icons/md";

const API = "http://localhost:5001/api/auth";

const STATUS_BADGES = {
  Present: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0", label: "Present" },
  "Late Present": { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a", label: "Late" },
  Late: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a", label: "Late" },
  Absent: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca", label: "Absent" },
  Leave: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe", label: "Leave" },
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
  const [markForm, setMarkForm] = useState({
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
  }, [selectedDateStr, selectedRange, selectedDept]);

  // Handle Mark Attendance Form Submit
  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedEmpObj = employees.find((e) => e.employee_code === markForm.employee_id || e.employee_id === markForm.employee_id);
      const payload = {
        ...markForm,
        name: selectedEmpObj ? selectedEmpObj.name : markForm.name,
        dept: selectedEmpObj ? (selectedEmpObj.dept || markForm.dept) : markForm.dept,
        date: selectedDateStr
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

  // Export Attendance CSV Report
  const handleExportReport = () => {
    const headers = "Employee Name,Employee ID,Department,Designation,Shift,Check-In,Check-Out,Working Hours,Overtime,Status,Notes\n";
    const rows = filteredRecords
      .map((r) => {
        const empCode = r.employee_id || "EMP";
        const empName = r.name || "Employee";
        const deptVal = r.dept || "General";
        const checkIn = r.check_in || "—";
        const checkOut = r.check_out || "—";
        const workH = r.work_hours ? `${r.work_hours}h` : "—";
        const status = r.status || "Present";
        const notes = r.notes ? `"${r.notes}"` : "";
        return `"${empName}","${empCode}","${deptVal}","Staff","General Shift","${checkIn}","${checkOut}","${workH}","-","${status}",${notes}`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Attendance_Report_${selectedDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance Report exported successfully!");
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
      if (selectedStatus === "Present" && r.status !== "Present") return false;
      if (selectedStatus === "Late" && r.status !== "Late Present" && r.status !== "Late") return false;
      if (selectedStatus === "Absent" && r.status !== "Absent") return false;
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

  // Calculate Metrics for Summary Cards (Inspired by Attached UI)
  const onTimeCount = filteredRecords.filter((r) => r.status === "Present" && !r.late_count).length;
  const lateCount = filteredRecords.filter((r) => r.status === "Late Present" || r.status === "Late" || r.late_count > 0).length;
  const earlyCount = filteredRecords.filter((r) => r.status === "Present" && r.check_in && r.check_in < "09:15:00").length;

  const absentCount = filteredRecords.filter((r) => r.status === "Absent").length;
  const noClockInCount = filteredRecords.filter((r) => !r.check_in && r.status !== "Absent" && r.status !== "Leave").length;
  const noClockOutCount = filteredRecords.filter((r) => r.check_in && !r.check_out).length;

  const dayOffCount = filteredRecords.filter((r) => r.status === "Holiday" || r.status === "Week Off").length;
  const timeOffCount = filteredRecords.filter((r) => r.status === "Leave" || r.status === "Half Day").length;

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
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="max-w-6xl mx-auto pb-12 pt-6">
      {/* Custom CSS for enterprise UI matching attached screenshot */}
      <style>{`
        .att-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
        }
        .att-summary-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
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

      {/* TOP SUMMARY CARDS GRID (3 CARDS INSPIRED BY ATTACHED UI) */}
      <Row className="g-4 mb-6 px-2">
        {/* CARD 1: PRESENT SUMMARY */}
        <Col xs={12} lg={4}>
          <div className="att-summary-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <LuUserCheck className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-800">Present Summary</span>
                </div>
                <span className="text-slate-400 text-xs font-bold">•••</span>
              </div>

              <Row className="g-2 text-left pt-2">
                <Col xs={4}>
                  <div className="text-[11px] font-semibold text-slate-400">On time</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{onTimeCount}</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-1">+12 vs yesterday</div>
                </Col>
                <Col xs={4}>
                  <div className="text-[11px] font-semibold text-slate-400">Late clock-in</div>
                  <div className="text-xl font-extrabold text-amber-600 mt-1">{lateCount}</div>
                  <div className="text-[10px] font-bold text-rose-500 mt-1">-6 vs yesterday</div>
                </Col>
                <Col xs={4}>
                  <div className="text-[11px] font-semibold text-slate-400">Early clock-in</div>
                  <div className="text-xl font-extrabold text-blue-600 mt-1">{earlyCount}</div>
                  <div className="text-[10px] font-bold text-rose-500 mt-1">-6 vs yesterday</div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        {/* CARD 2: NOT PRESENT SUMMARY */}
        <Col xs={12} lg={5}>
          <div className="att-summary-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <LuUserX className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-800">Not Present Summary</span>
                </div>
                <span className="text-slate-400 text-xs font-bold">•••</span>
              </div>

              <Row className="g-2 text-left pt-2">
                <Col xs={3}>
                  <div className="text-[11px] font-semibold text-slate-400">Absent</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{absentCount}</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-1">+12 vs yesterday</div>
                </Col>
                <Col xs={3}>
                  <div className="text-[11px] font-semibold text-slate-400">No clock-in</div>
                  <div className="text-xl font-extrabold text-slate-700 mt-1">{noClockInCount}</div>
                  <div className="text-[10px] font-bold text-rose-500 mt-1">-6 vs yesterday</div>
                </Col>
                <Col xs={3}>
                  <div className="text-[11px] font-semibold text-slate-400">No clock-out</div>
                  <div className="text-xl font-extrabold text-slate-700 mt-1">{noClockOutCount}</div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-1">0 vs yesterday</div>
                </Col>
                <Col xs={3}>
                  <div className="text-[11px] font-semibold text-slate-400">Invalid</div>
                  <div className="text-xl font-extrabold text-slate-700 mt-1">0</div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-1">0 vs yesterday</div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        {/* CARD 3: AWAY SUMMARY */}
        <Col xs={12} lg={3}>
          <div className="att-summary-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                    <LuUserMinus className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-800">Away Summary</span>
                </div>
                <span className="text-slate-400 text-xs font-bold">•••</span>
              </div>

              <Row className="g-2 text-left pt-2">
                <Col xs={6}>
                  <div className="text-[11px] font-semibold text-slate-400">Day off</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{dayOffCount}</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-1">-2 vs yesterday</div>
                </Col>
                <Col xs={6}>
                  <div className="text-[11px] font-semibold text-slate-400">Time off</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{timeOffCount}</div>
                  <div className="text-[10px] font-bold text-rose-500 mt-1">-6 vs yesterday</div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>

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
              onChange={(e) => setSelectedRange(e.target.value)}
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
            onClick={fetchAttendanceList}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh Attendance List"
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
                <th style={{ minWidth: "180px" }}>Employee Name</th>
                <th style={{ minWidth: "110px" }}>Employee ID</th>
                <th style={{ minWidth: "120px" }}>Department</th>
                <th style={{ minWidth: "120px" }}>Designation</th>
                <th style={{ minWidth: "110px" }}>Shift</th>
                <th style={{ minWidth: "100px" }}>Check-In</th>
                <th style={{ minWidth: "100px" }}>Check-Out</th>
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
                    <td colSpan={12} className="py-3">
                      <div className="skeleton-pulse h-8 w-full"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-5 text-xs text-slate-400">
                    No attendance records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const sBadge = STATUS_BADGES[r.status] || STATUS_BADGES.Present;
                  const empInitials = (r.name || "E").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Name Column */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
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

                      {/* Department */}
                      <td>
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700">
                          {r.dept || userDept || "General"}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="text-xs text-slate-600 font-medium">Staff</td>

                      {/* Shift */}
                      <td>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          General Shift
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="text-xs font-bold text-emerald-600">{r.check_in || "—"}</td>

                      {/* Check-Out */}
                      <td className="text-xs font-bold text-slate-700">{r.check_out || "—"}</td>

                      {/* Working Hours Timeline Format (10:02 AM • —— 8h 58m —— • 07:00 PM) */}
                      <td>
                        <div className="timeline-bar">
                          <span>{r.check_in || "10:00 AM"}</span>
                          <div className="timeline-line flex items-center justify-center">
                            <span className="bg-white px-1.5 text-[9px] font-extrabold text-slate-500">
                              {r.work_hours ? `${r.work_hours}h` : "8h 00m"}
                            </span>
                          </div>
                          <span>{r.check_out || "07:00 PM"}</span>
                        </div>
                      </td>

                      {/* Overtime */}
                      <td className="text-xs font-semibold text-slate-600">
                        {r.work_hours > 9 ? `${(r.work_hours - 9).toFixed(1)}h` : "—"}
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
                          {sBadge.label}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="text-xs text-slate-500 italic max-w-[140px] truncate">
                        {r.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        {canMarkAttendance ? (
                          <button
                            onClick={() => {
                              setMarkForm({
                                employee_id: r.employee_id,
                                name: r.name,
                                dept: r.dept,
                                date: r.date || selectedDateStr,
                                check_in: r.check_in || "10:00",
                                check_out: r.check_out || "19:00",
                                status: r.status || "Present",
                                notes: r.notes || ""
                              });
                              setShowMarkModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit Attendance"
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
              className={`p-2 rounded-xl border border-slate-200 text-xs font-bold transition-colors ${
                currentPage === 1 ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:bg-slate-100 cursor-pointer"
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
              className={`p-2 rounded-xl border border-slate-200 text-xs font-bold transition-colors ${
                currentPage === totalPages ? "opacity-40 cursor-not-allowed bg-slate-50" : "hover:bg-slate-100 cursor-pointer"
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
            <LuClock className="text-emerald-600" /> Mark / Update Attendance
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
              <Form.Label className="small fw-bold text-slate-700">Notes / Remarks</Form.Label>
              <Form.Control
                type="text"
                placeholder="Reason for late/leave or general remarks..."
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
    </div>
  );
};

export default MyAttendance;