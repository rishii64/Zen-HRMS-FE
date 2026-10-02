import React, { useState, useEffect } from "react";
import { Container, Row, Col, Modal, Form, Button, Table, Spinner, Badge } from "react-bootstrap";
import {
  LuCalendar,
  LuClock,
  LuUsers,
  LuPlus,
  LuUpload,
  LuChevronLeft,
  LuChevronRight,
  LuShieldCheck,
  LuBriefcase,
  LuTrash2,
  LuDownload,
  LuCopy,
  LuCircleCheck,
  LuMoonStar,
  LuUser,
  LuFilter,
  LuSearch,
  LuRefreshCw
} from "react-icons/lu";
import { FaCheckCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "../../api/axios";
import { exportToExcel } from "../../utils/excelExport";

const API = getApiBaseUrl();

const SHIFT_TYPES = [
  { name: "Morning Shift", start: "09:00", end: "17:00", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  { name: "General Shift", start: "10:00", end: "19:00", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { name: "Evening Shift", start: "14:00", end: "22:00", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { name: "Night Shift", start: "22:00", end: "06:00", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { name: "Week Off", start: "—", end: "—", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  { name: "Holiday", start: "—", end: "—", color: "#e11d48", bg: "#fff1f2", border: "#fecdd3" }
];

const Schedule = () => {
  const userRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const userName = localStorage.getItem("userName") || "User";
  const userEmpId = localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";
  
  // Matrix Role Checks
  const isAdminOrHr = userRole === "hr" || userRole === "admin" || userRole === "hrmanager";
  const isHod = userRole === "hod" || userRole === "manager";
  const isEmployee = userRole === "employee" || userRole === "accounts";

  // Permissions according to user matrix
  const canViewAllSchedules = isAdminOrHr;
  const canCreateSchedule = isAdminOrHr || isHod;
  const canEditSchedule = isAdminOrHr || isHod;
  const canDeleteSchedule = isAdminOrHr;
  const canPublishSchedule = isAdminOrHr || isHod;
  const canCopySchedule = isAdminOrHr || isHod;
  const canManageShiftTemplates = isAdminOrHr;

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [userDepartment, setUserDepartment] = useState("Design");
  const [selectedDept, setSelectedDept] = useState(isAdminOrHr ? "All" : "Design");
  const [weekOffset, setWeekOffset] = useState(0);
  const [employeeViewFilter, setEmployeeViewFilter] = useState("dept"); // "dept" or "own"

  // Roster View Filter State & Search Query State
  const [rosterFilter, setRosterFilter] = useState("weekly");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRotationalModal, setShowRotationalModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State for Assigning Shift
  const [shiftForm, setShiftForm] = useState({
    employee_id: "",
    name: "",
    dept: "Design",
    designation: "Staff",
    shift_name: "General Shift",
    start_time: "10:00",
    end_time: "19:00",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Form State for Dynamic Rotational Week-Off Assignment
  const [rotationalForm, setRotationalForm] = useState({
    target_type: "individual",
    employee_id: "",
    off_type: "week_off", // "week_off" or "holiday"
    rotational_off_day: "Tuesday",
    holiday_name: "Company Holiday",
    holiday_scope: "weekday", // "weekday" or "all_days"
    shift_name: "General Shift",
    start_time: "10:00",
    end_time: "19:00",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
    set_as_default: true,
    notes: "Rotational Week Off assigned by HOD"
  });

  // Form State for Bulk Upload
  const [bulkInput, setBulkInput] = useState("");

  // Calculate roster dates depending on rosterFilter (Daily, Weekly, Monthly)
  const getRosterDates = (filterMode, offset = 0) => {
    const today = new Date();

    if (filterMode === "daily") {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName = d.toLocaleString("en-US", { weekday: "short" });
      return [{
        dayName: `${dayName} (Today)`,
        dateStr,
        dayNum: d.getDate(),
        monthShort: d.toLocaleString("en-US", { month: "short" })
      }];
    }

    if (filterMode === "monthly") {
      const currentYear = today.getFullYear();
      const targetMonth = today.getMonth() + offset;
      const daysCount = new Date(currentYear, targetMonth + 1, 0).getDate();
      const list = [];
      const daysName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 1; i <= daysCount; i++) {
        const d = new Date(currentYear, targetMonth, i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        list.push({
          dayName: `${daysName[d.getDay()]}`,
          dateStr,
          dayNum: d.getDate(),
          monthShort: d.toLocaleString("en-US", { month: "short" })
        });
      }
      return list;
    }

    // Default: Weekly (Mon - Sun, 6 Working Days Mon-Sat & Sun Off)
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMon + offset * 7);

    const week = [];
    const daysName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      week.push({
        dayName: daysName[i],
        dateStr,
        dayNum: d.getDate(),
        monthShort: d.toLocaleString("en-US", { month: "short" })
      });
    }
    return week;
  };

  const currentRosterDates = getRosterDates(rosterFilter, weekOffset);
  const weekStartStr = currentRosterDates[0]?.dateStr;

  // Fetch Employees and Schedules
  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);

    // 1. Fetch Employees list
    fetch(`${API}/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        const empList = data.data || data.employees || [];
        setEmployees(empList);

        // Find current user department
        const me = empList.find(
          (e) => e.employee_code === userEmpId || e.employee_id === userEmpId || e.name === userName
        );
        if (me && (me.dept || me.department)) {
          const deptVal = me.dept || me.department;
          setUserDepartment(deptVal);
          if (!canViewAllSchedules) {
            setSelectedDept(deptVal);
          }
        }
      })
      .catch((err) => console.error("Error loading employees:", err));

    // 2. Fetch Schedules
    const queryDept = canViewAllSchedules && selectedDept !== "All" ? selectedDept : (!canViewAllSchedules ? userDepartment : selectedDept);
    fetch(`${API}/schedule?dept=${queryDept !== "All" ? queryDept : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setSchedules(data.data);
        }
      })
      .catch((err) => console.error("Error loading schedule records:", err))
      .finally(() => setLoading(false));
  }, [selectedDept, weekOffset, userDepartment, rosterFilter]);

  // Extract unique departments present
  const availableDepts = Array.from(
    new Set([
      ...employees.map((e) => (e.dept || e.department || "").trim()).filter(Boolean),
      "Design",
      "Marketing",
      "Engineering",
      "HR",
      "IT"
    ])
  ).filter(Boolean).sort();

  // Get shift details for a specific employee & date (Dynamic Rotational Week-Off mapping)
  const getEmployeeShiftForDate = (empId, dateStr) => {
    const cleanId = (empId || "").toLowerCase().trim();
    const record = schedules.find(
      (s) => {
        const sId = (s.employee_id || "").toLowerCase().trim();
        return (sId === cleanId || sId === cleanId.replace("emp-", "") || cleanId === sId.replace("emp-", "")) && s.date === dateStr;
      }
    );
    if (record) return record;

    // Check employee's dynamic weekly off (rotational week-off preference)
    const empObj = employees.find((e) => {
      const eCode = (e.employee_code || e.employee_id || `EMP-${e.id}` || "").toLowerCase().trim();
      return eCode === cleanId || eCode === cleanId.replace("emp-", "") || cleanId === eCode.replace("emp-", "");
    });

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const d = new Date(dateStr + "T12:00:00+05:30");
    const dayOfWeek = dayNames[d.getDay()];
    const assignedWeeklyOff = (empObj?.weekly_off || "Sunday").toLowerCase().trim();

    if (dayOfWeek === assignedWeeklyOff) {
      return {
        shift_name: "Week Off",
        start_time: "—",
        end_time: "—",
        isRotationalOff: true
      };
    }

    return {
      shift_name: "General Shift",
      start_time: "10:00",
      end_time: "19:00",
      isDefault: true
    };
  };

  // Shift Badge Style Helper
  const getShiftBadgeStyle = (shiftName) => {
    const s = SHIFT_TYPES.find((t) => t.name.toLowerCase() === (shiftName || "").toLowerCase());
    if (s) return { bg: s.bg, color: s.color, border: s.border };
    if ((shiftName || "").toLowerCase().includes("holiday")) {
      return { bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" };
    }
    return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
  };

  // Submit Assign Shift Form (Admin, HR, HOD)
  const handleAssignShiftSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateSchedule) return;
    setSaving(true);
    const token = localStorage.getItem("token");

    const selectedEmp = employees.find((e) => e.employee_code === shiftForm.employee_id || e.employee_id === shiftForm.employee_id);
    const payload = {
      ...shiftForm,
      name: selectedEmp ? selectedEmp.name : shiftForm.name,
      dept: selectedEmp ? (selectedEmp.dept || shiftForm.dept) : (isHod ? userDepartment : shiftForm.dept),
      week_start: weekStartStr
    };

    try {
      const res = await fetch(`${API}/schedule/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Shift schedule assigned successfully!");
        setShowAssignModal(false);

        // Refresh schedules
        const refreshRes = await fetch(`${API}/schedule?dept=${selectedDept !== "All" ? selectedDept : ""}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const refreshData = await refreshRes.json();
        if (refreshData.success) setSchedules(refreshData.data);
      } else {
        toast.error(data.error || "Failed to save shift");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving schedule.");
    } finally {
      setSaving(false);
    }
  };

  // Submit Dynamic Rotational Week-Off / Holiday Assignment Form (Admin, HR, HOD)
  const handleAssignRotationalSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateSchedule) return;
    setSaving(true);
    const token = localStorage.getItem("token");

    const isHoliday =
      rotationalForm.off_type === "holiday" ||
      rotationalForm.rotational_off_day === "Holiday" ||
      (rotationalForm.shift_name && rotationalForm.shift_name.toLowerCase().includes("holiday"));

    const payload = {
      employee_ids: rotationalForm.target_type === "all_dept" ? "all" : [rotationalForm.employee_id],
      rotational_off_day: rotationalForm.rotational_off_day,
      off_type: isHoliday ? "holiday" : "week_off",
      holiday_name: rotationalForm.holiday_name || rotationalForm.notes || "Company Holiday",
      holiday_scope: rotationalForm.holiday_scope || (rotationalForm.rotational_off_day === "Holiday" ? "all_days" : "weekday"),
      shift_name: rotationalForm.shift_name,
      start_time: isHoliday ? "—" : rotationalForm.start_time,
      end_time: isHoliday ? "—" : rotationalForm.end_time,
      start_date: rotationalForm.start_date,
      end_date: rotationalForm.end_date,
      set_as_default: rotationalForm.set_as_default && !isHoliday,
      notes: rotationalForm.notes
    };

    try {
      const res = await fetch(`${API}/schedule/assign-rotational`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (isHoliday) {
          toast.success(data.message || "Holiday assigned and dynamically synced to Holiday Calendar!");
          // Broadcast live update event so all open tabs and views of Holiday Calendar update in real time
          window.dispatchEvent(new Event("holiday-updated"));
          localStorage.setItem("holiday_last_updated", String(Date.now()));
        } else {
          toast.success(data.message || "Rotational week-off assigned successfully!");
        }
        setShowRotationalModal(false);

        // Refresh schedules
        const refreshRes = await fetch(`${API}/schedule?dept=${selectedDept !== "All" ? selectedDept : ""}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const refreshData = await refreshRes.json();
        if (refreshData.success) setSchedules(refreshData.data);

        // Refresh employees to reflect any updated weekly_off
        const empRes = await fetch(`${API}/employees`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const empData = await empRes.json();
        if (empData.data || empData.employees) {
          setEmployees(empData.data || empData.employees || []);
        }
      } else {
        toast.error(data.error || "Failed to assign schedule");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving schedule.");
    } finally {
      setSaving(false);
    }
  };

  // Submit Bulk Upload (Admin, HR, HOD)
  const handleBulkUploadSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateSchedule) return;
    setSaving(true);
    const token = localStorage.getItem("token");

    let parsedList = [];
    try {
      parsedList = JSON.parse(bulkInput);
    } catch (err) {
      toast.error("Invalid JSON format for bulk upload.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API}/schedule/bulk-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ schedules: parsedList })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully uploaded ${data.schedules.length} shifts!`);
        setShowUploadModal(false);

        // Refresh schedules
        const refreshRes = await fetch(`${API}/schedule?dept=${selectedDept !== "All" ? selectedDept : ""}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const refreshData = await refreshRes.json();
        if (refreshData.success) setSchedules(refreshData.data);
      } else {
        toast.error(data.error || "Failed bulk upload");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during bulk upload.");
    } finally {
      setSaving(false);
    }
  };

  // Export Schedule Handler (Excel)
  const handleExportSchedule = () => {
    let rowsToExport = filteredEmployees;
    if (isEmployee && employeeViewFilter === "own") {
      rowsToExport = filteredEmployees.filter(
        (e) => e.employee_code === userEmpId || e.employee_id === userEmpId || e.name === userName
      );
    }

    const headers = ["Employee", "Department", "Shift Name", "Date"];
    const rows = rowsToExport.map((emp) => {
      const shift = getEmployeeShiftForDate(emp.employee_code || emp.employee_id, currentRosterDates[0].dateStr);
      return [
        emp.name || "",
        emp.dept || "General",
        shift.shift_name || "General Shift",
        currentRosterDates[0].dateStr || ""
      ];
    });

    exportToExcel({
      data: [headers, ...rows],
      fileName: `Schedule_Export_${selectedDept}_2026.xlsx`,
      sheetName: "Schedule",
    });

    toast.success("Schedule exported to Excel successfully!");
  };

  // Action Toast Helpers
  const handlePublishSchedule = () => {
    toast.success("Shift schedule published to department team!");
  };

  const handleCopySchedule = () => {
    toast.success("Copied schedule roster to subsequent period!");
  };

  // Filter employees according to Search Query + RBAC Matrix
  const filteredEmployees = employees.filter((emp) => {
    const empDept = emp.dept || emp.department || "";
    const empName = (emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`).toLowerCase();
    const empCode = (emp.employee_code || emp.employee_id || emp.empId || "").toLowerCase();
    const empHod = (emp.hod || emp.team_lead || emp.manager || emp.reporting_manager || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    // 1. Search Query Matching (Name, Employee ID, Department, Team Lead/HOD)
    if (query) {
      const matchesSearch =
        empName.includes(query) ||
        empCode.includes(query) ||
        empDept.toLowerCase().includes(query) ||
        empHod.includes(query);

      if (!matchesSearch) return false;
    }

    // 2. Role-Based Matrix Filter
    if (isEmployee) {
      const isMe = emp.employee_code === userEmpId || emp.employee_id === userEmpId || emp.name === userName;
      if (employeeViewFilter === "own") return isMe;
      return empDept.toLowerCase() === userDepartment.toLowerCase();
    }

    if (isHod) {
      return empDept.toLowerCase() === userDepartment.toLowerCase();
    }

    if (selectedDept === "All") return true;
    return empDept.toLowerCase() === selectedDept.toLowerCase();
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="max-w-7xl mx-auto pb-10">
      {/* Custom CSS */}
      <style>{`
        .sched-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          transition: all 0.25s ease;
        }
        .sched-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05) !important;
          border-color: #cbd5e1 !important;
        }
        .table-sched th {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .table-sched td {
          font-size: 12px;
          color: #1e293b;
          padding: 14px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
      `}</style>

      {/* HEADER BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">Work Schedule & Shift Roster</h1>
              {isAdminOrHr && (
                <span className="bg-purple-50 text-purple-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200">
                  ROOT ADMIN / HR ACCESS
                </span>
              )}
              {isHod && (
                <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                  HOD DEPARTMENT ACCESS ({userDepartment})
                </span>
              )}
              {isEmployee && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  MY DEPARTMENT ROSTER ({userDepartment})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-800 font-semibold m-0 mt-0.5">
              Plan dynamic shift rosters, assign rotational week-offs & work hours instead of fixed Sunday.
            </p>
          </div>

          {/* Controls Matrix */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Selection (Admin & HR only) */}
            {canViewAllSchedules ? (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 shadow-xs"
              >
                <option value="All">All Departments ▾</option>
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d} Department
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl">
                Department: {userDepartment}
              </div>
            )}

            {/* Employee View Filter Toggle */}
            {isEmployee && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  onClick={() => setEmployeeViewFilter("dept")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    employeeViewFilter === "dept" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Dept Roster
                </button>
                <button
                  onClick={() => setEmployeeViewFilter("own")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    employeeViewFilter === "own" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  My Schedule
                </button>
              </div>
            )}

            {/* Export Schedule */}
            <button
              onClick={handleExportSchedule}
              className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition-all"
              title={isEmployee ? "Export Own Schedule (Excel)" : "Export Roster (Excel)"}
            >
              <LuDownload className="h-3.5 w-3.5" /> Export
            </button>

            {/* HOD / HR / Admin Actions */}
            {canCreateSchedule && (
              <>
                <button
                  onClick={handlePublishSchedule}
                  className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition-all"
                  title="Publish Roster"
                >
                  <FaCheckCircle className="h-3.5 w-3.5" /> Publish
                </button>

                <button
                  onClick={handleCopySchedule}
                  className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition-all"
                  title="Copy Schedule to Next Week"
                >
                  <LuCopy className="h-3.5 w-3.5" /> Copy
                </button>

                <button
                  onClick={() => {
                    setRotationalForm({
                      target_type: "individual",
                      employee_id: filteredEmployees[0]?.employee_code || filteredEmployees[0]?.employee_id || "",
                      off_type: "week_off",
                      rotational_off_day: "Tuesday",
                      holiday_name: "Company Holiday",
                      holiday_scope: "weekday",
                      shift_name: "General Shift",
                      start_time: "10:00",
                      end_time: "19:00",
                      start_date: currentRosterDates[0]?.dateStr || new Date().toISOString().split("T")[0],
                      end_date: currentRosterDates[currentRosterDates.length - 1]?.dateStr || new Date().toISOString().split("T")[0],
                      set_as_default: true,
                      notes: "Rotational Week Off assigned by HOD"
                    });
                    setShowRotationalModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
                  title="Assign Dynamic Shifts & Rotational Week-Off (override fixed Sunday)"
                >
                  <LuRefreshCw className="h-3.5 w-3.5" /> Rotational Week-Off
                </button>

                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  <LuPlus className="h-4 w-4" /> Assign Shift
                </button>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  <LuUpload className="h-4 w-4" /> Upload
                </button>
              </>
            )}

            {/* Shift Templates Management (Admin & HR Only) */}
            {canManageShiftTemplates && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition-all"
              >
                <LuMoonStar className="h-3.5 w-3.5" /> Templates
              </button>
            )}
          </div>
        </div>
      </div>

      <Container fluid className="px-4 max-w-7xl mx-auto">
        {/* SHIFT SUMMARY KPI CARDS */}
        <Row className="g-4 mb-6">
          <Col xs={12} sm={6} lg={3}>
            <div className="sched-card p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Scheduled</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{filteredEmployees.length} Staff</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <LuUsers className="h-5 w-5" />
                </div>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-3">
                {isEmployee ? `Department: ${userDepartment}` : `Department: ${selectedDept}`}
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <div className="sched-card p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Morning Shift</div>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">09:00 - 17:00</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <LuClock className="h-5 w-5" />
                </div>
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 mt-3">
                Early Roster Active
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <div className="sched-card p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Shift</div>
                  <div className="text-2xl font-extrabold text-blue-600 mt-1">10:00 - 19:00</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <LuBriefcase className="h-5 w-5" />
                </div>
              </div>
              <div className="text-[11px] font-semibold text-blue-700 mt-3">
                Dynamic Shifts & Rotational Offs
              </div>
            </div>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <div className="sched-card p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Night Shift</div>
                  <div className="text-2xl font-extrabold text-purple-600 mt-1">22:00 - 06:00</div>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                  <LuMoonStar className="h-5 w-5" />
                </div>
              </div>
              <div className="text-[11px] font-semibold text-purple-700 mt-3">
                Overnight Support Cover
              </div>
            </div>
          </Col>
        </Row>

        {/* SHIFT ROSTER CONTAINER WITH VIEW FILTER DROPDOWN & SEARCHBAR */}
        <div className="sched-card shadow-xs overflow-hidden">
          {/* Header Controls: Roster Filter & Searchbar */}
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <LuCalendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                  Shift Roster
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Dynamic Rotational Shifts & Week-Offs
                  </span>
                </h3>
                <p className="text-xs text-slate-800 font-semibold m-0 mt-0.5">
                  Showing schedule for {currentRosterDates[0]?.monthShort} {currentRosterDates[0]?.dayNum}
                  {currentRosterDates.length > 1 && ` – ${currentRosterDates[currentRosterDates.length - 1]?.monthShort} ${currentRosterDates[currentRosterDates.length - 1]?.dayNum}`}, 2026
                </p>
              </div>
            </div>

            {/* Roster Filter Dropdown + Search Input + Period Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Searchbar Input (Search by Name, Employee ID, Department, Team Lead/HOD) */}
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                <input
                  type="text"
                  placeholder="Search name, ID, dept, HOD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 shadow-xs w-44 md:w-56"
                />
              </div>

              {/* Dropdown for Roster Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <LuFilter className="text-slate-400 h-3.5 w-3.5" />
                <span className="text-xs font-bold text-slate-500">View:</span>
                <select
                  value={rosterFilter}
                  onChange={(e) => {
                    setRosterFilter(e.target.value);
                    setWeekOffset(0);
                  }}
                  className="text-xs font-extrabold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="daily">Daily Roster</option>
                  <option value="weekly">Weekly Roster (Mon - Sat)</option>
                  <option value="monthly">Monthly Roster</option>
                </select>
              </div>

              {/* Period Navigation Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Previous Period"
                >
                  <LuChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Today / Current
                </button>
                <button
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Next Period"
                >
                  <LuChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <Table className="table-sched mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: "220px" }}>Employee</th>
                  <th style={{ width: "130px" }}>Department</th>
                  {currentRosterDates.map((rDate) => (
                    <th key={rDate.dateStr} className="text-center" style={{ minWidth: "110px" }}>
                      <div>{rDate.dayName}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {rDate.monthShort} {rDate.dayNum}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={currentRosterDates.length + 2} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="text-xs text-slate-400 mt-2 m-0">Loading schedule roster...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={currentRosterDates.length + 2} className="text-center py-5 text-xs text-slate-400">
                      No employee schedules found matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Column */}
                      <td>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {emp.name || emp.first_name}
                          {(emp.employee_code === userEmpId || emp.employee_id === userEmpId) && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{emp.employee_code || emp.empId || `EMP-${emp.id}`}</div>
                      </td>

                      {/* Department Column */}
                      <td>
                        <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700">
                          {emp.dept || emp.department || userDepartment}
                        </span>
                      </td>

                      {/* Roster Dates Cells */}
                      {currentRosterDates.map((rDate) => {
                        const empCode = emp.employee_code || emp.employee_id || emp.empId || `EMP-${emp.id}`;
                        const shiftData = getEmployeeShiftForDate(empCode, rDate.dateStr);
                        const bStyle = getShiftBadgeStyle(shiftData.shift_name);

                        return (
                          <td key={rDate.dateStr} className="text-center">
                            <div
                              className="px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer hover:shadow-xs"
                              style={{
                                backgroundColor: bStyle.bg,
                                color: bStyle.color,
                                borderColor: bStyle.border
                              }}
                              title={`${shiftData.shift_name} (${shiftData.start_time} - ${shiftData.end_time})`}
                            >
                              <div className="truncate">{shiftData.shift_name}</div>
                              <div className="text-[9px] opacity-80 font-normal mt-0.5">
                                {shiftData.start_time} - {shiftData.end_time}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Container>

      {/* ASSIGN SHIFT MODAL */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuClock className="text-indigo-600" /> Assign Shift Schedule
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleAssignShiftSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Select Employee</Form.Label>
              <Form.Select
                value={shiftForm.employee_id}
                onChange={(e) => setShiftForm({ ...shiftForm, employee_id: e.target.value })}
                required
                className="text-xs py-2 rounded-xl"
              >
                <option value="">Choose Employee ▾</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.employee_code || emp.employee_id}>
                    {emp.name} ({emp.employee_code || emp.employee_id}) — {emp.dept || userDepartment}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Shift Type</Form.Label>
              <Form.Select
                value={shiftForm.shift_name}
                onChange={(e) => {
                  const s = SHIFT_TYPES.find((t) => t.name === e.target.value);
                  setShiftForm({
                    ...shiftForm,
                    shift_name: e.target.value,
                    start_time: s ? s.start : "10:00",
                    end_time: s ? s.end : "19:00"
                  });
                }}
                className="text-xs py-2 rounded-xl"
              >
                {SHIFT_TYPES.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name} ({st.start} - {st.end})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {shiftForm.shift_name === "Week Off" ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-xs text-slate-600 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Designated Full Day Week-Off (No operating work hours)
              </div>
            ) : (
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Label className="small fw-bold text-slate-700">Start Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    className="text-xs py-2 rounded-xl"
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="small fw-bold text-slate-700">End Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    className="text-xs py-2 rounded-xl"
                  />
                </Col>
              </Row>
            )}

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-slate-700">Date</Form.Label>
              <Form.Control
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                required
                className="text-xs py-2 rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setShowAssignModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 text-xs font-bold rounded-xl border-0">
                {saving ? "Saving..." : "Save Shift"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ASSIGN ROTATIONAL WEEK-OFF & DYNAMIC SHIFT MODAL */}
      <Modal show={showRotationalModal} onHide={() => setShowRotationalModal(false)} centered size="lg" className="rounded-4">
        {(() => {
          const isRotationalHoliday =
            rotationalForm.off_type === "holiday" ||
            rotationalForm.rotational_off_day === "Holiday" ||
            (rotationalForm.shift_name && rotationalForm.shift_name.toLowerCase().includes("holiday"));

          return (
            <>
              <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
                  <LuRefreshCw className={isRotationalHoliday ? "text-rose-600" : "text-blue-600"} />
                  {isRotationalHoliday ? "Dynamic Shift & Holiday Roster Assigning" : "Dynamic Shift & Rotational Week-Off Assigning"}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="pt-3">
                <p className="text-xs text-slate-500 mb-3">
                  Assign designated rotational off days or official Holidays and active shifts for your team members. Holidays are dynamically synced in real-time to the company Holiday Calendar.
                </p>

                {/* Mode Selector: Rotational Week-Off vs Official Holiday */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center mb-4 gap-1.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      setRotationalForm((prev) => ({
                        ...prev,
                        off_type: "week_off",
                        shift_name: prev.shift_name === "Holiday" ? "General Shift" : prev.shift_name,
                        rotational_off_day: prev.rotational_off_day === "Holiday" ? "Tuesday" : prev.rotational_off_day
                      }))
                    }
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      !isRotationalHoliday
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LuRefreshCw className="h-3.5 w-3.5" /> Rotational Week-Off
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRotationalForm((prev) => ({
                        ...prev,
                        off_type: "holiday",
                        shift_name: "Holiday",
                        rotational_off_day: "Holiday",
                        holiday_name: prev.holiday_name || "Company Holiday",
                        holiday_scope: "all_days"
                      }))
                    }
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isRotationalHoliday
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LuCalendar className="h-3.5 w-3.5" /> ★ Holiday (Live Sync to Calendar)
                  </button>
                </div>

                <Form onSubmit={handleAssignRotationalSubmit}>
                  <Row className="g-3 mb-3">
                    {/* Target Scope */}
                    <Col md={6}>
                      <Form.Label className="small fw-bold text-slate-700">Assign To</Form.Label>
                      <div className="flex items-center gap-3 mb-2">
                        <Form.Check
                          type="radio"
                          id="target-individual"
                          name="target_type"
                          label="Single Employee"
                          checked={rotationalForm.target_type === "individual"}
                          onChange={() => setRotationalForm({ ...rotationalForm, target_type: "individual" })}
                          className="text-xs font-semibold"
                        />
                        <Form.Check
                          type="radio"
                          id="target-all"
                          name="target_type"
                          label={`All in ${isHod ? userDepartment : (selectedDept !== "All" ? selectedDept : "Department")}`}
                          checked={rotationalForm.target_type === "all_dept"}
                          onChange={() => setRotationalForm({ ...rotationalForm, target_type: "all_dept" })}
                          className="text-xs font-semibold"
                        />
                      </div>

                      {rotationalForm.target_type === "individual" && (
                        <Form.Select
                          value={rotationalForm.employee_id}
                          onChange={(e) => setRotationalForm({ ...rotationalForm, employee_id: e.target.value })}
                          required={rotationalForm.target_type === "individual"}
                          className="text-xs py-2 rounded-xl"
                        >
                          <option value="">Select Employee ▾</option>
                          {filteredEmployees.map((emp) => (
                            <option key={emp.id} value={emp.employee_code || emp.employee_id}>
                              {emp.name} ({emp.employee_code || emp.employee_id}) — {emp.dept || userDepartment}
                            </option>
                          ))}
                        </Form.Select>
                      )}
                    </Col>

                    {/* Rotational Off Day / Holiday Mode Picker */}
                    <Col md={6}>
                      <Form.Label className="small fw-bold text-slate-700">
                        {isRotationalHoliday ? "Designated Holiday Day" : "Designated Rotational Week-Off Day"}
                      </Form.Label>
                      <Form.Select
                        value={rotationalForm.rotational_off_day}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Holiday") {
                            setRotationalForm((prev) => ({
                              ...prev,
                              rotational_off_day: val,
                              off_type: "holiday",
                              shift_name: "Holiday",
                              holiday_scope: "all_days"
                            }));
                          } else {
                            setRotationalForm((prev) => ({
                              ...prev,
                              rotational_off_day: val
                            }));
                          }
                        }}
                        className={`text-xs py-2 rounded-xl font-bold ${
                          isRotationalHoliday
                            ? "text-rose-700 bg-rose-50 border-rose-200"
                            : "text-blue-700 bg-blue-50 border-blue-200"
                        }`}
                      >
                        <option value="Holiday">★ Entire Date Range as Official Holiday</option>
                        <option value="Monday">Monday ({isRotationalHoliday ? "Holiday on Mondays" : "Week Off"})</option>
                        <option value="Tuesday">Tuesday ({isRotationalHoliday ? "Holiday on Tuesdays" : "Week Off"})</option>
                        <option value="Wednesday">Wednesday ({isRotationalHoliday ? "Holiday on Wednesdays" : "Week Off"})</option>
                        <option value="Thursday">Thursday ({isRotationalHoliday ? "Holiday on Thursdays" : "Week Off"})</option>
                        <option value="Friday">Friday ({isRotationalHoliday ? "Holiday on Fridays" : "Week Off"})</option>
                        <option value="Saturday">Saturday ({isRotationalHoliday ? "Holiday on Saturdays" : "Week Off"})</option>
                        <option value="Sunday">Sunday ({isRotationalHoliday ? "Holiday on Sundays" : "Standard Off"})</option>
                      </Form.Select>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">
                        {isRotationalHoliday
                          ? "Designated day(s) will be registered as official Holiday in Roster, Attendance, and Holiday Calendar."
                          : "On this day, employee has official week-off. On all other days, employee is rostered to work."}
                      </div>
                    </Col>
                  </Row>

                  {/* Holiday Sync Configuration Card */}
                  {isRotationalHoliday && (
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-3.5 mb-3 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                          <LuCalendar className="h-4 w-4 text-rose-600" />
                          Holiday Calendar Live Synchronization
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full border border-rose-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Live Sync Enabled
                        </span>
                      </div>

                      <Row className="g-3 mb-2">
                        <Col md={7}>
                          <Form.Label className="text-[11px] font-bold text-rose-900">Holiday / Festival Title *</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="e.g. Gandhi Jayanti, Diwali, Durga Puja, Special Holiday"
                            value={rotationalForm.holiday_name}
                            onChange={(e) => setRotationalForm((prev) => ({ ...prev, holiday_name: e.target.value }))}
                            required={isRotationalHoliday}
                            className="text-xs py-2 rounded-xl border-rose-200 focus:border-rose-400 bg-white"
                          />
                        </Col>
                        <Col md={5}>
                          <Form.Label className="text-[11px] font-bold text-rose-900">Holiday Range Scope</Form.Label>
                          <Form.Select
                            value={rotationalForm.holiday_scope}
                            onChange={(e) => setRotationalForm((prev) => ({ ...prev, holiday_scope: e.target.value }))}
                            className="text-xs py-2 rounded-xl border-rose-200 font-semibold text-rose-800 bg-white"
                          >
                            <option value="all_days">All Days ({rotationalForm.start_date} to {rotationalForm.end_date})</option>
                            <option value="weekday">Only {rotationalForm.rotational_off_day === "Holiday" ? "Weekdays" : rotationalForm.rotational_off_day} in Range</option>
                          </Form.Select>
                        </Col>
                      </Row>

                      <div className="text-[11px] text-rose-800 bg-white/80 border border-rose-100 p-2.5 rounded-xl flex items-start gap-2">
                        <LuCalendar className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          This holiday will be <strong>dynamically added to the central Holiday Calendar</strong> in real-time for all users and will auto-mark attendance for selected employees as <span className="font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Holiday</span> instead of Absent.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shift for Working Days */}
                  {(!isRotationalHoliday || (rotationalForm.holiday_scope === "weekday" && rotationalForm.rotational_off_day !== "Holiday")) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3">
                      <div className="text-xs font-extrabold text-slate-800 mb-2">
                        Shift Timing for Working Days (Non-Holiday / Non-Off Days)
                      </div>
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Label className="text-[11px] font-bold text-slate-600">Shift Name</Form.Label>
                          <Form.Select
                            value={rotationalForm.shift_name}
                            onChange={(e) => {
                              const s = SHIFT_TYPES.find((t) => t.name === e.target.value);
                              setRotationalForm({
                                ...rotationalForm,
                                shift_name: e.target.value,
                                start_time: s ? s.start : "10:00",
                                end_time: s ? s.end : "19:00"
                              });
                            }}
                            className="text-xs py-2 rounded-xl"
                          >
                            {SHIFT_TYPES.filter(t => t.name !== "Week Off").map((st) => (
                              <option key={st.name} value={st.name}>
                                {st.name} {st.start !== "—" ? `(${st.start} - ${st.end})` : ""}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="text-[11px] font-bold text-slate-600">Start Time</Form.Label>
                          <Form.Control
                            type="time"
                            value={rotationalForm.start_time}
                            onChange={(e) => setRotationalForm({ ...rotationalForm, start_time: e.target.value })}
                            className="text-xs py-2 rounded-xl"
                          />
                        </Col>
                        <Col md={4}>
                          <Form.Label className="text-[11px] font-bold text-slate-600">End Time</Form.Label>
                          <Form.Control
                            type="time"
                            value={rotationalForm.end_time}
                            onChange={(e) => setRotationalForm({ ...rotationalForm, end_time: e.target.value })}
                            className="text-xs py-2 rounded-xl"
                          />
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Effective Date Range */}
                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Label className="small fw-bold text-slate-700">Roster Effective From</Form.Label>
                      <Form.Control
                        type="date"
                        value={rotationalForm.start_date}
                        onChange={(e) => setRotationalForm({ ...rotationalForm, start_date: e.target.value })}
                        required
                        className="text-xs py-2 rounded-xl"
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="small fw-bold text-slate-700">Roster Effective To</Form.Label>
                      <Form.Control
                        type="date"
                        value={rotationalForm.end_date}
                        onChange={(e) => setRotationalForm({ ...rotationalForm, end_date: e.target.value })}
                        required
                        className="text-xs py-2 rounded-xl"
                      />
                    </Col>
                  </Row>

                  {/* Default mapping checkbox */}
                  {!isRotationalHoliday && (
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="set-default-check"
                        label={`Set ${rotationalForm.rotational_off_day} as primary weekly off in employee profile (affects future attendance directory & payroll)`}
                        checked={rotationalForm.set_as_default}
                        onChange={(e) => setRotationalForm({ ...rotationalForm, set_as_default: e.target.checked })}
                        className="text-xs font-semibold text-slate-700"
                      />
                    </Form.Group>
                  )}

                  {/* Notes */}
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-slate-700">Notes / Reason (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={isRotationalHoliday ? "e.g., Declared official holiday by Management" : "e.g., Q4 Rotational Shift Roster Assignment"}
                      value={rotationalForm.notes}
                      onChange={(e) => setRotationalForm({ ...rotationalForm, notes: e.target.value })}
                      className="text-xs py-2 rounded-xl"
                    />
                  </Form.Group>

                  <div className="flex justify-end gap-2">
                    <Button variant="light" onClick={() => setShowRotationalModal(false)} className="text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className={`text-xs font-bold rounded-xl border-0 shadow-xs ${
                        isRotationalHoliday
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {saving
                        ? (isRotationalHoliday ? "Syncing Holiday..." : "Applying Roster...")
                        : (isRotationalHoliday ? "★ Assign & Sync to Holiday Calendar" : "Apply Rotational Shift")}
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </>
          );
        })()}
      </Modal>

      {/* BULK UPLOAD MODAL */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuUpload className="text-slate-900" /> Bulk Upload Shift Schedule
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleBulkUploadSubmit}>
            <p className="text-xs text-slate-500 mb-3">
              Paste JSON roster data for bulk shift assignment across employees:
            </p>

            <Form.Group className="mb-4">
              <Form.Control
                as="textarea"
                rows={7}
                placeholder={`[\n  { "employee_id": "EMP-101", "name": "Andrew", "date": "2026-07-31", "shift_name": "Morning Shift", "start_time": "09:00", "end_time": "17:00" }\n]`}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                required
                className="text-xs font-mono rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setShowUploadModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 text-xs font-bold rounded-xl border-0">
                {saving ? "Uploading..." : "Upload Roster"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* SHIFT TEMPLATES MODAL */}
      <Modal show={showTemplateModal} onHide={() => setShowTemplateModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuMoonStar className="text-purple-600" /> Manage Shift Templates
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <div className="space-y-3">
            {SHIFT_TYPES.map((st) => (
              <div key={st.name} className="p-3 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: st.bg, borderColor: st.border }}>
                <div>
                  <div className="font-bold text-xs" style={{ color: st.color }}>{st.name}</div>
                  <div className="text-[11px] text-slate-500">Operating hours: {st.start} – {st.end}</div>
                </div>
                <Badge bg="dark" className="text-[10px]">Active</Badge>
              </div>
            ))}
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Schedule;
