import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Form, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuCalendar,
  LuClock,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuDownload,
  LuPlus,
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuCircleX,
  LuCircleAlert,
  LuFileText,
  LuUpload,
  LuUserCheck,
  LuUserX,
  LuUserMinus,
  LuEllipsis,
  LuTrash2,
  LuEye
} from "react-icons/lu";
import { MdMoreVert } from "react-icons/md";
import { FaRegCircleCheck } from "react-icons/fa6";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

const LEAVE_TYPE_COLORS = {
  "Casual Leave": { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0", badge: "CL" },
  "Sick Leave": { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe", badge: "SL" },
  "Earned Leave": { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe", badge: "EL" },
  "Holidays": { bg: "#fef3c7", color: "#d97706", border: "#fde68a", badge: "HL" },
  "Holiday": { bg: "#fef3c7", color: "#d97706", border: "#fde68a", badge: "HL" },
  "Maternity Leave": { bg: "#fdf2f8", color: "#db2777", border: "#fbcfe8", badge: "ML" },
  "Paternity Leave": { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd", badge: "PL" },
  "Comp Off": { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5", badge: "CO" },
  "Compensatory Off": { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5", badge: "CO" },
  "Public Holiday": { bg: "#f8fafc", color: "#475569", border: "#e2e8f0", badge: "PH" },
  "Unpaid Leave": { bg: "#f8fafc", color: "#64748b", border: "#cbd5e1", badge: "LWP" }
};

const STATUS_BADGES = {
  Approved: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0", label: "Approved" },
  Processing: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a", label: "Processing" },
  Pending: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a", label: "Processing" },
  Rejected: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca", label: "Rejected" },
  Cancelled: { bg: "#f8fafc", color: "#64748b", border: "#cbd5e1", label: "Cancelled" }
};

const Leave = () => {
  const navigate = useNavigate();

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

  const canManageLeaves = isAdmin || isHR || isHOD || isTeamLead;

  // Navigation Pill State ("my_data", "team", "holidays") & Sub-Tab ("summary", "balance", "requests")
  const [activePill, setActivePill] = useState("my_data"); // default to My Data
  const [activeTab, setActiveTab] = useState("summary"); // default to Leave Summary

  // Running Live Month State for Header Switcher
  const [currentMonthObj, setCurrentMonthObj] = useState(new Date(2025, 9, 1)); // Oct 2025 reference
  const formattedMonthStr = currentMonthObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Data States
  const [loading, setLoading] = useState(true);
  const [leavesList, setLeavesList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState({
    casual: { total: 5, used: 0, remaining: 5 },
    sick: { total: 5, used: 0, remaining: 5 },
    earned: { total: 12, used: 0, remaining: 12 },
    holidays: { total: 10, used: 0, remaining: 10 },
    maternity: { total: 90, used: 0, remaining: 90 },
    paternity: { total: 5, used: 0, remaining: 5 },
    compOff: { total: 0, used: 0, remaining: 0 },
    unpaid: { used: 0 },
    summary: { totalTaken: 0, upcomingLeaves: 0, absentDays: 0, leavesRemaining: 0 }
  });

  // Derived Gender Status
  const userGender = leaveBalances.gender || storedUser.gender || (employees.find(e => e.employee_id === userEmpId || e.employee_code === userEmpId)?.gender) || "Male";
  const isFemale = (userGender || "").toLowerCase().startsWith("f");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState(null);
  const [reviewComments, setReviewComments] = useState("");
  const [saving, setSaving] = useState(false);

  // Form State for Applying Leave
  const [applyForm, setApplyForm] = useState({
    leave_type: "Casual Leave",
    day_type: "Full Day",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    reason: "",
    emergency_contact: "",
    fileAttachment: null
  });

  // Calculate days between start and end date
  const calculatedDaysCount = () => {
    if (!applyForm.start_date || !applyForm.end_date) return 1;
    if (applyForm.day_type !== "Full Day") return 0.5;
    const s = new Date(applyForm.start_date);
    const e = new Date(applyForm.end_date);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 1 : diffDays;
  };

  // Fetch employees list
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

  // Fetch Leave Data & Balances
  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Leaves list
      let url = `${API}/leave?status=${statusFilter}&leave_type=${typeFilter}`;
      if (selectedDeptFilter !== "All") url += `&dept=${selectedDeptFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLeavesList(data.data);
      }

      // 2. Fetch Balances
      const balRes = await fetch(`${API}/leave/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const balData = await balRes.json();
      if (balData.success && balData.data) {
        setLeaveBalances(balData.data);
      }
    } catch (err) {
      console.error("Error fetching leave data:", err);
      toast.error("Failed to load leave records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [statusFilter, typeFilter, selectedDeptFilter, activePill]);

  // Month Switcher Handlers
  const handlePrevMonth = () => {
    const d = new Date(currentMonthObj);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonthObj(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentMonthObj);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonthObj(d);
  };

  // Submit Apply Leave Form
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("leave_type", applyForm.leave_type);
      formData.append("day_type", applyForm.day_type);
      formData.append("start_date", applyForm.start_date);
      formData.append("end_date", applyForm.end_date);
      formData.append("total_days", calculatedDaysCount());
      formData.append("reason", applyForm.reason);
      formData.append("emergency_contact", applyForm.emergency_contact);
      if (applyForm.fileAttachment) {
        formData.append("doc_url", applyForm.fileAttachment);
      }

      const res = await fetch(`${API}/leave/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Leave application submitted successfully!");
        setShowApplyModal(false);
        fetchLeaveData();
      } else {
        toast.error(data.error || "Failed to submit leave application");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while submitting leave.");
    } finally {
      setSaving(false);
    }
  };

  // Approve / Reject Action Handler
  const handleReviewAction = async (newStatus) => {
    if (!selectedLeaveForReview) return;
    setSaving(true);

    try {
      const res = await fetch(`${API}/leave/${selectedLeaveForReview.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          comments: reviewComments
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Leave request ${newStatus.toLowerCase()} successfully!`);
        setShowReviewModal(false);
        setSelectedLeaveForReview(null);
        setReviewComments("");
        fetchLeaveData();
      } else {
        toast.error(data.error || "Failed to update leave status");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating status.");
    } finally {
      setSaving(false);
    }
  };

  // Cancel Leave Request (for Employee or Lead)
  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;

    try {
      const res = await fetch(`${API}/leave/${leaveId}/cancel`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Leave request cancelled!");
        fetchLeaveData();
      } else {
        toast.error(data.error || "Failed to cancel leave");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while cancelling leave.");
    }
  };

  // Export Leave Report CSV
  const handleExportCSV = () => {
    const headers = "Employee Name,Employee ID,Department,Leave Type,Start Date,End Date,Duration,Status,Approver,Reason\n";
    const rows = filteredLeaves
      .map((l) => {
        return `"${l.name}","${l.employee_id}","${l.dept || "General"}","${l.leave_type}","${l.start_date}","${l.end_date}","${l.total_days} days","${l.status}","${l.approver || "—"}","${l.reason || ""}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Leave_Report_2025_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Leave Report exported successfully!");
  };

  // Filter leaves records
  const filteredLeaves = leavesList.filter((l) => {
    const empName = (l.name || "").toLowerCase();
    const empCode = (l.employee_id || "").toLowerCase();
    const empDept = (l.dept || "").toLowerCase();
    const lType = (l.leave_type || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    // 1. Search Query
    if (query) {
      const matches = empName.includes(query) || empCode.includes(query) || empDept.includes(query) || lType.includes(query);
      if (!matches) return false;
    }

    // 2. Active Pill Scoping ("my_data" vs "team")
    if (activePill === "my_data") {
      return l.employee_id === userEmpId || (userName && empName.includes(userName.toLowerCase()));
    }

    if (activePill === "team" && (isHOD || isTeamLead)) {
      return empDept === userDept.toLowerCase() || l.employee_id === userEmpId;
    }

    return true;
  });

  // Divide records into Upcoming and Past
  const todayStr = new Date().toISOString().split("T")[0]
  const upcomingLeaves = filteredLeaves.filter((l) => l.start_date >= todayStr || l.status === "Pending" || l.status === "Processing");
  const pastLeaves = filteredLeaves.filter((l) => l.start_date < todayStr && l.status !== "Pending" && l.status !== "Processing");

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="max-w-6xl mx-auto pb-16 pt-6">
      {/* Custom CSS matching attached UI screenshot */}
      <style>{`
        .pill-nav-btn {
          padding: 6px 16px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .pill-nav-btn.active {
          background-color: #0f172a;
          color: #ffffff;
        }
        .pill-nav-btn.inactive {
          background-color: #ffffff;
          color: #475569;
          border-color: #e2e8f0;
        }
        .pill-nav-btn.inactive:hover {
          background-color: #f1f5f9;
        }

        .tab-sub-link {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          padding-bottom: 8px;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .tab-sub-link.active {
          color: #0f172a;
          font-weight: 800;
          border-bottom-color: #0f172a;
        }

        .leave-kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 22px;
          transition: all 0.2s ease;
        }
        .leave-kpi-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }

        .leave-bal-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .leave-bal-card:hover {
          border-color: #94a3b8;
          transform: translateY(-2px);
        }

        .table-leave th {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .table-leave td {
          font-size: 12px;
          color: #1e293b;
          padding: 14px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
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

      {/* TOP HEADER & PILL NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-2">
        {/* Top Pills: [ My Data ] [ Team ] [ Holidays ] */}
        <div className="flex items-center gap-2">
          <button onClick={() => setActivePill("my_data")} className={`pill-nav-btn ${activePill === "my_data" ? "active" : "inactive"}`}>
            My Data
          </button>
          {canManageLeaves && (
            <button onClick={() => setActivePill("team")} className={`pill-nav-btn ${activePill === "team" ? "active" : "inactive"}`}>
              Team
            </button>
          )}
          <button onClick={() => navigate("/holidays")} className="pill-nav-btn inactive">
            Holidays
          </button>
        </div>

        {/* Header Search Bar */}
        <div className="relative w-64 md:w-80">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search Employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* SUB-TABS & ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-6 px-2">
        {/* Sub-Tabs: Leave Summary | Leave Balance | Leave Requests */}
        <div className="flex items-center gap-6">
          <span onClick={() => setActiveTab("summary")} className={`tab-sub-link ${activeTab === "summary" ? "active" : ""}`} >
            Leave Summary
          </span>
          <span onClick={() => setActiveTab("balance")} className={`tab-sub-link ${activeTab === "balance" ? "active" : ""}`} >
            Leave Balance
          </span>
          <span onClick={() => setActiveTab("requests")} className={`tab-sub-link ${activeTab === "requests" ? "active" : ""}`} >
            Leave Requests
          </span>
        </div>

        {/* Date Navigator & Primary Action Controls */}
        <div className="flex items-center gap-3">
          {/* Month Switcher (< October 2025 >) */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
            <button onClick={handlePrevMonth} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100">
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-1">{formattedMonthStr}</span>
            <button onClick={handleNextMonth} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100">
              <LuChevronRight className="h-4 w-4" />
            </button>
            <LuCalendar className="h-4 w-4 text-slate-400 ml-1" />
          </div>

          {/* Export CSV Button */}
          <button onClick={handleExportCSV}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors" title="Export Leave Report CSV"><LuDownload className="h-4 w-4" />
          </button>

          {/* Apply Leave Button */}
          <button onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xs transition-all"
          >
            <LuPlus className="h-4 w-4" /> Apply Leave
          </button>
        </div>
      </div>

      {/* TOP 4 SUMMARY METRIC CARDS */}
      <Row className="g-4 mb-6 px-2">
        {/* Total Leaves */}
        <Col xs={12} sm={6} lg={3}>
          <div className="leave-kpi-card h-full flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">Total Leaves Taken</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {leaveBalances.summary?.totalTaken || 0} <span className="text-sm font-semibold text-slate-500">Days</span>
            </div>
          </div>
        </Col>

        {/* Upcoming Leaves */}
        <Col xs={12} sm={6} lg={3}>
          <div className="leave-kpi-card h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Upcoming Leaves</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                4 days
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              25-28 <span className="text-lg font-bold text-slate-500">Nov</span>
            </div>
          </div>
        </Col>

        {/* Absent days */}
        <Col xs={12} sm={6} lg={3}>
          <div className="leave-kpi-card h-full flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">Absent Days</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {leaveBalances.summary?.absentDays || 0} <span className="text-sm font-semibold text-slate-500">Days</span>
            </div>
          </div>
        </Col>

        {/* Leaves Remaining */}
        <Col xs={12} sm={6} lg={3}>
          <div className="leave-kpi-card h-full flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">Leaves Remaining</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {leaveBalances.summary?.leavesRemaining || 0} <span className="text-sm font-semibold text-slate-500">Days</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* LEAVE BALANCE CARDS GRID */}
      {(activeTab === "summary" || activeTab === "balance") && (
      <div className="mb-6 px-2">
        <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wider">Leave Balances</h3>
        <Row className="g-3">
          {/* Casual Leave */}
          <Col xs={6} sm={4} lg={3}>
            <div className="leave-bal-card border-emerald-100 bg-emerald-50/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-800">Casual Leave</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">CL</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900">{leaveBalances.casual?.remaining ?? 5} / 5</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">Short Urgent Personal Leave</div>
            </div>
          </Col>

          {/* Sick Leave */}
          <Col xs={6} sm={4} lg={3}>
            <div className="leave-bal-card border-blue-100 bg-blue-50/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-800">Sick Leave</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">SL</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900">{leaveBalances.sick?.remaining ?? 5} / 5</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">Illness / Medical Treatment</div>
            </div>
          </Col>

          {/* Earned Leave */}
          <Col xs={6} sm={4} lg={3}>
            <div className="leave-bal-card border-purple-100 bg-purple-50/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-purple-800">Earned Leave</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">EL</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900">{leaveBalances.earned?.remaining ?? 12} / 12</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">Accrued Service Leave</div>
            </div>
          </Col>

          {/* Holidays */}
          <Col xs={6} sm={4} lg={3}>
            <div className="leave-bal-card border-amber-100 bg-amber-50/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-800">Holidays</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">HL</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900">{leaveBalances.holidays?.remaining ?? 10} / 10</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">Public & Gazetted Holidays</div>
            </div>
          </Col>

          {/* Maternity Leave (Female) or Paternity Leave (Male) */}
          {isFemale ? (
            <Col xs={6} sm={4} lg={3}>
              <div className="leave-bal-card border-pink-100 bg-pink-50/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-pink-800">Maternity Leave</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">ML</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">{leaveBalances.maternity?.remaining ?? 90} / 90</div>
                <div className="text-[10px] text-slate-400 mt-1 font-semibold">Childbirth & Recovery</div>
              </div>
            </Col>
          ) : (
            <Col xs={6} sm={4} lg={3}>
              <div className="leave-bal-card border-sky-100 bg-sky-50/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-sky-800">Paternity Leave</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">PL</span>
                </div>
                <div className="text-lg font-extrabold text-slate-900">{leaveBalances.paternity?.remaining ?? 5} / 5</div>
                <div className="text-[10px] text-slate-400 mt-1 font-semibold">New Fathers Leave</div>
              </div>
            </Col>
          )}

          {/* Comp Off */}
          <Col xs={6} sm={4} lg={3}>
            <div className="leave-bal-card border-orange-100 bg-orange-50/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-orange-800">Comp Off</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">CO</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900">{leaveBalances.compOff?.used || 0} Used</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">Weekend Work Credit</div>
            </div>
          </Col>

          {/* Unpaid Leave */}
          <Col xs={6} sm={4} lg={3}>
            <div className="leave-bal-card border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700">Unpaid Leave</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">LWP</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900">{leaveBalances.unpaid?.used || 0} Used</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">Leave Without Pay (LWP)</div>
            </div>
          </Col>
        </Row>
      </div>
      )}

      {/* UPCOMING LEAVE & HOLIDAYS TABLE (MATCHING ATTACHED UI SCREENSHOT) */}
      {(activeTab === "summary" || activeTab === "requests") && (
      <>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 m-0">Upcoming leave & holidays</h3>
          <span className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer">See all</span>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-leave mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: "40px" }}><Form.Check type="checkbox" /></th>
                <th style={{ minWidth: "160px" }}>Employee / Requester</th>
                <th style={{ minWidth: "160px" }}>Leave type</th>
                <th style={{ minWidth: "100px" }}>Duration</th>
                <th style={{ minWidth: "160px" }}>From → To</th>
                <th style={{ minWidth: "110px" }}>Status</th>
                <th style={{ minWidth: "150px" }}>Approved by</th>
                <th style={{ minWidth: "100px" }} className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={8} className="py-3">
                      <div className="skeleton-pulse h-7 w-full"></div>
                    </td>
                  </tr>
                ))
              ) : upcomingLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-xs text-slate-400">
                    No upcoming leave requests found.
                  </td>
                </tr>
              ) : (
                upcomingLeaves.map((l) => {
                  const sBadge = STATUS_BADGES[l.status] || STATUS_BADGES.Processing;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td><Form.Check type="checkbox" /></td>
                      <td className="text-xs">
                        <div className="font-extrabold text-slate-900">{l.name || "Employee"}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{l.employee_id} • {l.dept || "General"}</div>
                      </td>
                      <td className="font-bold text-slate-900 text-xs">{l.leave_type}</td>
                      <td className="font-semibold text-slate-700 text-xs">{l.total_days} days</td>
                      <td className="font-semibold text-slate-600 text-xs">{l.start_date.split("-").reverse().join("-")} → {l.end_date.split("-").reverse().join("-")}</td>
                      <td>
                        <span className="px-3 py-1 text-[11px] font-extrabold rounded-full border inline-block"
                          style={{
                            backgroundColor: sBadge.bg,
                            color: sBadge.color,
                            borderColor: sBadge.border
                          }}
                        >
                          {sBadge.label}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 font-medium">{l.approver || "—"}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canManageLeaves && (l.status === "Pending" || l.status === "Processing") && (
                            <button
                              onClick={() => {
                                setSelectedLeaveForReview(l);
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100 flex items-center gap-1"
                              title="Review Request"
                            >
                              <FaRegCircleCheck className="h-3 w-3" /> Review
                            </button>
                          )}
                          {l.status === "Pending" && (
                            <button
                              onClick={() => handleCancelLeave(l.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50"
                              title="Cancel Request"
                            >
                              <LuTrash2 className="h-4 w-4" />
                            </button>
                          )}
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

      {/* PAST LEAVE & HOLIDAYS TABLE (MATCHING ATTACHED UI SCREENSHOT) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 m-0">Past leave & holidays</h3>
          <span className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer">See all</span>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-leave mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: "40px" }}><Form.Check type="checkbox" /></th>
                <th style={{ minWidth: "160px" }}>Employee / Requester</th>
                <th style={{ minWidth: "160px" }}>Leave type</th>
                <th style={{ minWidth: "100px" }}>Duration</th>
                <th style={{ minWidth: "160px" }}>From → To</th>
                <th style={{ minWidth: "110px" }}>Status</th>
                <th style={{ minWidth: "150px" }}>Approved by</th>
                <th style={{ minWidth: "80px" }} className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={8} className="py-3">
                      <div className="skeleton-pulse h-7 w-full"></div>
                    </td>
                  </tr>
                ))
              ) : pastLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-xs text-slate-400">
                    No past leave records found.
                  </td>
                </tr>
              ) : (
                pastLeaves.map((l) => {
                  const sBadge = STATUS_BADGES[l.status] || STATUS_BADGES.Approved;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td><Form.Check type="checkbox" /></td>
                      <td className="text-xs">
                        <div className="font-extrabold text-slate-900">{l.name || "Employee"}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{l.employee_id} • {l.dept || "General"}</div>
                      </td>
                      <td className="font-bold text-slate-900 text-xs">{l.leave_type}</td>
                      <td className="font-semibold text-slate-700 text-xs">{l.total_days} days</td>
                      <td className="font-semibold text-slate-600 text-xs">{l.start_date.split("T")[0].split("-").reverse().join("-")} → {l.end_date.split("T")[0].split("-").reverse().join("-")}</td>
                      <td>
                        <span
                          className="px-3 py-1 text-[11px] font-extrabold rounded-full border inline-block"
                          style={{
                            backgroundColor: sBadge.bg,
                            color: sBadge.color,
                            borderColor: sBadge.border
                          }}
                        >
                          {sBadge.label}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 font-medium">{l.approver || "—"}</td>
                      <td className="text-center">
                        <button className="p-1 rounded text-slate-400 hover:bg-slate-100">
                          <MdMoreVert className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      </>
      )}

      {/* APPLY LEAVE MODAL */}
      <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuCalendar className="text-slate-900" /> Apply For Leave
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleApplySubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Leave Type</Form.Label>
              <Form.Select
                value={applyForm.leave_type}
                onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                className="text-xs py-2.5 rounded-xl"
              >
                <option value="Casual Leave">Casual Leave (CL) — 5 Days Allocation (Paid)</option>
                <option value="Sick Leave">Sick Leave (SL) — 5 Days Allocation (Paid)</option>
                <option value="Earned Leave">Earned Leave (EL) — 12 Days Allocation (Paid)</option>
                <option value="Holidays">Public Holiday (HL) — 10 Days Allocation (Paid)</option>
                {isFemale ? (
                  <option value="Maternity Leave">Maternity Leave (ML) — 90 Days Allocation (Paid)</option>
                ) : (
                  <option value="Paternity Leave">Paternity Leave (PL) — 5 Days Allocation (Paid)</option>
                )}
                <option value="Comp Off">Compensatory Off (Comp Off) — As Earned (Paid)</option>
                <option value="Unpaid Leave">Unpaid Leave (LWP) — Unlimited (Loss of Pay)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Duration Type</Form.Label>
              <Form.Select
                value={applyForm.day_type}
                onChange={(e) => setApplyForm({ ...applyForm, day_type: e.target.value })}
                className="text-xs py-2.5 rounded-xl"
              >
                <option value="Full Day">Full Day</option>
                <option value="First Half">First Half (Morning)</option>
                <option value="Second Half">Second Half (Afternoon)</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={applyForm.start_date}
                  onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                  required
                  className="text-xs py-2 rounded-xl"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={applyForm.end_date}
                  onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                  required
                  className="text-xs py-2 rounded-xl"
                />
              </Col>
            </Row>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3 text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Total Leave Duration:</span>
              <span className="text-indigo-600 font-extrabold">{calculatedDaysCount()} Days</span>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Reason for Leave</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="State your reason for leave..."
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Emergency Contact Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="+91 9876543210"
                value={applyForm.emergency_contact}
                onChange={(e) => setApplyForm({ ...applyForm, emergency_contact: e.target.value })}
                className="text-xs py-2 rounded-xl"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-slate-700">Supporting Document (Optional)</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setApplyForm({ ...applyForm, fileAttachment: e.target.files[0] })}
                className="text-xs py-2 rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setShowApplyModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 text-xs font-bold rounded-xl border-0">
                {saving ? "Submitting..." : "Submit Leave Application"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* REVIEW / APPROVE / REJECT MODAL (FOR LEADS, HOD, HR) */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <FaRegCircleCheck className="text-indigo-600" /> Review Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {selectedLeaveForReview && (
            <div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3 text-xs">
                <div className="font-extrabold text-slate-900 fs-6">{selectedLeaveForReview.name}</div>
                <div className="text-slate-500 font-semibold">{selectedLeaveForReview.employee_id} • {selectedLeaveForReview.dept}</div>
                <div className="mt-2 text-slate-700"><strong>Type:</strong> {selectedLeaveForReview.leave_type} ({selectedLeaveForReview.total_days} days)</div>
                <div className="text-slate-700"><strong>Dates:</strong> {selectedLeaveForReview.start_date.split("T")[0].split("-").reverse().join("-")} → {selectedLeaveForReview.end_date.split("T")[0].split("-").reverse().join("-")}</div>
                <div className="text-slate-700 mt-1"><strong>Reason:</strong> {selectedLeaveForReview.reason || "No reason specified"}</div>
              </div>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-slate-700">Approver Comments</Form.Label>
                <Form.Control as="textarea" rows={2} placeholder="Optional review comments..." value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} className="text-xs rounded-xl" />
              </Form.Group>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline-danger" disabled={saving} onClick={() => handleReviewAction("Rejected")} className="text-xs font-bold rounded-xl" >
                  Reject Request
                </Button>
                <Button variant="success" disabled={saving} onClick={() => handleReviewAction("Approved")} className="text-xs font-bold rounded-xl border-0 bg-emerald-600" >
                  Approve Request
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Leave;
