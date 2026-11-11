import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  LuClock,
  LuCalendar,
  LuCheck,
  LuX,
  LuPlus,
  LuFilter,
  LuSearch,
  LuBriefcase,
  LuSparkles,
  LuSend,
  LuEye,
  LuShieldCheck,
  LuCircleAlert,
  LuBadgeCheck,
  LuRotateCw,
  LuTrash2,
  LuUsers,
  LuTrendingUp,
  LuCircleX,
  LuDollarSign,
  LuArrowUpRight,
  LuUserCheck,
  LuHourglass,
  LuCheckCheck,
  LuLayers,
  LuFileSpreadsheet,
} from "react-icons/lu";
import api from "../../api/axios";
import {
  getAuthRole,
  getAuthUser,
  isLeadershipDesignation,
  isDepartmentHeadOrManager,
} from "../../utils/auth";

// Currency Formatter
const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

// Date Formatter
const formatDateStr = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
};

// Quick overtime preset reasons
const OT_REASONS = [
  "Project Deadline & Critical Milestone",
  "Production Deployment & Releases",
  "Emergency Incident / Server Maintenance",
  "Quarter-End / Month-End Financial Closing",
  "Urgent Client Support & SLA Deliverable",
  "Staff Shortage & Coverage Support",
  "Executive & Management Request",
  "Other Operational Requirement",
];

export default function Overtime() {
  const [tickets, setTickets] = useState([]);
  const [eligibleShifts, setEligibleShifts] = useState([]);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [payoutFilter, setPayoutFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    synced_payroll: 0,
    total_ot_hours: 0,
    total_estimated_payout: 0,
    total_approved_payout: 0,
  });

  // Modals state
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [activeTicket, setActiveTicket] = useState(null);

  // User RBAC Scoping
  const currentUser = getAuthUser() || {};
  const currentRole = (getAuthRole() || "").toLowerCase().trim();
  const currentEmpId = String(
    currentUser.employee_id ||
    currentUser.employee_code ||
    currentUser.id ||
    ""
  ).trim();
  const currentUserName = String(currentUser.name || currentUser.userName || "").trim();

  const isPrivileged = [
    "hr",
    "admin",
    "management",
    "ceo",
    "coo",
    "hrmanager",
    "accounts",
    "payroll",
  ].includes(currentRole);

  const isManager =
    isPrivileged ||
    isDepartmentHeadOrManager() ||
    isLeadershipDesignation(currentUser.designation);

  // Form State for Raising Overtime Ticket
  const [formData, setFormData] = useState({
    employee_id: "",
    attendance_date: "",
    attendance_id: null,
    shift_name: "General Shift",
    shift_start: "09:30",
    shift_end: "18:30",
    check_in: "",
    check_out: "",
    total_work_hours: 0,
    standard_hours: 9,
    overtime_hours: 0,
    overtime_minutes: 0,
    hourly_rate: 0,
    ot_multiplier: 1.5,
    estimated_payout: 0,
    reason_for_ot: OT_REASONS[0],
    task_description: "",
  });

  // Review Form State
  const [reviewData, setReviewData] = useState({
    decision: "Approved",
    approved_hours: "",
    manager_remarks: "",
  });

  // Payroll Sync Form State
  const [syncMonthYear, setSyncMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // 1. Fetch Overtime Tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (payoutFilter !== "All") params.payout_status = payoutFilter;
      if (monthFilter) params.month = monthFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/overtime", { params });
      if (res.data?.success) {
        setTickets(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load overtime tickets:", err);
      toast.error("Failed to load overtime tickets");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Eligible Unclaimed Overtime Shifts
  const fetchEligibleShifts = async () => {
    try {
      setShiftsLoading(true);
      const res = await api.get("/overtime/eligible-shifts");
      if (res.data?.success) {
        setEligibleShifts(res.data.data || []);
        if (Array.isArray(res.data.employees)) {
          setEligibleEmployees(res.data.employees);
        }
      }
    } catch (err) {
      console.warn("Failed to load eligible overtime shifts:", err.message);
    } finally {
      setShiftsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchEligibleShifts();
  }, [statusFilter, payoutFilter, monthFilter, searchQuery]);

  // Handle clicking "Claim Overtime" from detected banner or eligible list
  const handleOpenClaimShift = (shift) => {
    setFormData({
      employee_id: shift.employee_id || currentEmpId,
      attendance_date: shift.attendance_date || "",
      attendance_id: shift.attendance_id || null,
      shift_name: shift.shift_name || "General Shift",
      shift_start: shift.shift_start || "09:30",
      shift_end: shift.shift_end || "18:30",
      check_in: shift.check_in || "",
      check_out: shift.check_out || "",
      total_work_hours: shift.total_work_hours || 0,
      standard_hours: shift.standard_hours || 9,
      overtime_hours: shift.overtime_hours || 0,
      overtime_minutes: shift.overtime_minutes || 0,
      hourly_rate: shift.hourly_rate || 0,
      ot_multiplier: shift.ot_multiplier || 1.5,
      estimated_payout: shift.estimated_payout || 0,
      reason_for_ot: OT_REASONS[0],
      task_description: "",
    });
    setIsRaiseModalOpen(true);
  };

  // Open Blank Raise Modal
  const handleOpenNewTicket = () => {
    // If eligible shifts available, prefill with first unclaimed shift
    const firstUnclaimed = eligibleShifts.find((s) => !s.is_already_ticketed);
    if (firstUnclaimed) {
      handleOpenClaimShift(firstUnclaimed);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    setFormData({
      employee_id: currentEmpId,
      attendance_date: todayStr,
      attendance_id: null,
      shift_name: "General Shift",
      shift_start: "09:30",
      shift_end: "18:30",
      check_in: "09:30",
      check_out: "21:00",
      total_work_hours: 11.5,
      standard_hours: 9,
      overtime_hours: 2.5,
      overtime_minutes: 150,
      hourly_rate: 250,
      ot_multiplier: 1.5,
      estimated_payout: Math.round(2.5 * 250 * 1.5),
      reason_for_ot: OT_REASONS[0],
      task_description: "",
    });
    setIsRaiseModalOpen(true);
  };

  // Recalculate estimated payout in raise form
  const handleHoursChange = (hrs) => {
    const numHrs = parseFloat(hrs) || 0;
    const rate = parseFloat(formData.hourly_rate) || 0;
    const mult = parseFloat(formData.ot_multiplier) || 1.5;
    const payout = Math.round(numHrs * rate * mult);
    setFormData((prev) => ({
      ...prev,
      overtime_hours: numHrs,
      overtime_minutes: Math.round(numHrs * 60),
      estimated_payout: payout,
    }));
  };

  // Submit Raise Overtime Ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!formData.attendance_date) {
      toast.error("Please select an attendance date");
      return;
    }
    if (!formData.task_description.trim()) {
      toast.error("Please enter a detailed task description for overtime justification");
      return;
    }

    try {
      const res = await api.post("/overtime", formData);
      if (res.data?.success) {
        toast.success(res.data.message || "Overtime ticket submitted successfully!");
        setIsRaiseModalOpen(false);
        fetchTickets();
        fetchEligibleShifts();
      }
    } catch (err) {
      console.error("Failed to submit overtime ticket:", err);
      toast.error(
        err.response?.data?.message || "Failed to submit overtime ticket"
      );
    }
  };

  // Open Review / Decision Modal (for Manager / HR)
  const handleOpenReview = (ticket) => {
    setActiveTicket(ticket);
    setReviewData({
      decision: "Approved",
      approved_hours: String(ticket.overtime_hours || 0),
      manager_remarks: "",
    });
    setIsReviewModalOpen(true);
  };

  // Submit Review Decision
  const handleSubmitReview = async (decision) => {
    if (!activeTicket) return;
    if (!reviewData.manager_remarks.trim()) {
      toast.error("Manager remarks and feedback are mandatory for overtime decisions");
      return;
    }

    try {
      const payload = {
        decision,
        approved_hours:
          decision === "Approved"
            ? parseFloat(reviewData.approved_hours) || activeTicket.overtime_hours
            : 0,
        manager_remarks: reviewData.manager_remarks.trim(),
      };

      const res = await api.put(`/overtime/${activeTicket.id}/review`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || `Overtime ticket ${decision.toLowerCase()} successfully!`);
        setIsReviewModalOpen(false);
        setActiveTicket(null);
        fetchTickets();
        fetchEligibleShifts();
      }
    } catch (err) {
      console.error("Failed to review overtime ticket:", err);
      toast.error(
        err.response?.data?.message || "Failed to record overtime decision"
      );
    }
  };

  // Sync Approved Overtime with Payroll
  const handleSyncWithPayroll = async () => {
    try {
      setSyncLoading(true);
      const res = await api.post("/overtime/sync-payroll", {
        month_year: syncMonthYear,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Overtime synced with Payroll successfully!");
        setIsSyncModalOpen(false);
        fetchTickets();
      }
    } catch (err) {
      console.error("Failed to sync overtime with payroll:", err);
      toast.error(
        err.response?.data?.message || "Failed to sync overtime with payroll"
      );
    } finally {
      setSyncLoading(false);
    }
  };

  // Delete Draft/Pending Ticket
  const handleDeleteTicket = async (ticket) => {
    if (ticket.status === "Approved") {
      toast.error("Approved overtime tickets cannot be deleted directly.");
      return;
    }

    try {
      const res = await api.delete(`/overtime/${ticket.id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "Overtime ticket deleted successfully");
        fetchTickets();
        fetchEligibleShifts();
      }
    } catch (err) {
      console.error("Failed to delete overtime ticket:", err);
      toast.error(
        err.response?.data?.message || "Failed to delete overtime ticket"
      );
    }
  };

  // Unclaimed shifts list for the banner
  const unclaimedShifts = useMemo(() => {
    return eligibleShifts.filter((s) => !s.is_already_ticketed);
  }, [eligibleShifts]);

  // Check if current user is the reporting manager for a ticket
  const canUserReview = (ticket) => {
    if (!ticket || ticket.status !== "Pending") return false;
    if (isPrivileged) return true;
    if (ticket.reporting_manager_id && ticket.reporting_manager_id === currentEmpId)
      return true;
    if (
      ticket.reporting_manager &&
      currentUserName &&
      ticket.reporting_manager.toLowerCase().trim() ===
      currentUserName.toLowerCase().trim()
    ) {
      return true;
    }
    return false;
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
          <LuBadgeCheck className="h-3.5 w-3.5" />
          Approved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 whitespace-nowrap">
          <LuCircleX className="h-3.5 w-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
        <LuHourglass className="h-3.5 w-3.5 animate-spin" />
        Pending Review
      </span>
    );
  };

  // Payout Status Badge Helper
  const renderPayoutBadge = (payoutStatus) => {
    const p = String(payoutStatus || "").toLowerCase();
    if (p === "synced to payroll") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">
          <LuFileSpreadsheet className="h-3 w-3" />
          Synced to Payroll
        </span>
      );
    }
    if (p === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 whitespace-nowrap">
          <LuCheckCheck className="h-3 w-3" />
          Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
        Unpaid
      </span>
    );
  };

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <LuClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Overtime (OT) Tracking & Approval Engine
                {/* <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                  Tab 28
                </span> */}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Automatic OT tracking beyond shift end, manager ticket approvals, and payroll payout sync
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isPrivileged && (
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-2xs whitespace-nowrap"
            >
              <LuFileSpreadsheet className="h-4 w-4 text-indigo-600" />
              Sync with Payroll
            </button>
          )}

          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
            title="Refresh list"
          >
            <LuRotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenNewTicket}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/25 transition whitespace-nowrap"
          >
            <LuPlus className="h-4 w-4" />
            Raise OT Ticket
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Overtime Hours */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Logged OT Hours</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <LuClock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {Number(stats.total_ot_hours || 0).toFixed(1)}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              hrs recorded
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Across {stats.total} total claimed shift(s)
          </span>
        </div>

        {/* Approved OT Payout */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Approved Payout</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <LuDollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatINR(stats.total_approved_payout || 0)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            {stats.approved} approved claim(s)
          </span>
        </div>

        {/* Awaiting Review */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Awaiting Review</span>
            <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center">
              <LuHourglass className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
              {stats.pending}
            </span>
            <span className="text-xs font-bold text-slate-400">tickets</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Est. Payout: {formatINR(stats.total_estimated_payout || 0)}
          </span>
        </div>

        {/* Synced with Payroll */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Payroll Synced</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <LuCheckCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {stats.synced_payroll}
            </span>
            <span className="text-xs font-bold text-slate-400">payouts</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Integrated into Monthly Salary Slip
          </span>
        </div>
      </div>

      {/* Auto-Detected Overtime Banner */}
      {unclaimedShifts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-amber-50/50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-slate-900/80 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0 mt-0.5">
                <LuSparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <span>Detected Extra Hours Worked Beyond Shift Timing</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    {unclaimedShifts.length} Unclaimed Shift(s)
                  </span>
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 font-medium">
                  The engine automatically detected attendance punch-outs past your scheduled shift end. Click to raise an overtime ticket for your reporting manager's approval.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Shift Cards Carousel / Strip */}
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unclaimedShifts.slice(0, 3).map((shift, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <LuCalendar className="h-3.5 w-3.5 text-amber-600" />
                      {formatDateStr(shift.attendance_date)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      +{shift.overtime_hours} hrs ({shift.overtime_minutes}m OT)
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>Shift End:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {shift.shift_end}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Punched Out:</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400 font-mono">
                        {shift.check_out}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Est. Payout (1.5x):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(shift.estimated_payout)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenClaimShift(shift)}
                  className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <LuSend className="h-3.5 w-3.5" />
                  Claim Overtime Ticket
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, employee name, code, department, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Payout Status */}
          <select
            value={payoutFilter}
            onChange={(e) => setPayoutFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
          >
            <option value="All">All Payout States</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Synced to Payroll">Synced to Payroll</option>
            <option value="Paid">Paid</option>
          </select>

          {/* Month Filter */}
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            title="Filter by attendance month"
          />

          {(statusFilter !== "All" || payoutFilter !== "All" || monthFilter || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("All");
                setPayoutFilter("All");
                setMonthFilter("");
                setSearchQuery("");
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table with Strict whitespace-nowrap min-w-full (No Text Wrapping) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Ticket #</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Employee</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Attendance Date & Shift</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Punch In / Out</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Overtime Hours</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Hourly Rate</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Payout (₹)</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Reporting Manager</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Decision Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">Payroll Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <LuRotateCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading overtime tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <LuClock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <span className="block font-semibold text-slate-600 dark:text-slate-300">
                      No overtime tickets found
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Adjust your filters or raise a new ticket for hours worked beyond shift timing.
                    </span>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Ticket Number */}
                    <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {t.ticket_number}
                    </td>

                    {/* Employee Profile */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                          {t.employee_name
                            ? t.employee_name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                            : "EM"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {t.employee_name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="font-mono">{t.employee_id}</span>
                            <span>•</span>
                            <span>{t.department}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Attendance Date & Shift */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <LuCalendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDateStr(t.attendance_date)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {t.shift_name} ({t.shift_start} - {t.shift_end})
                      </div>
                    </td>

                    {/* Check In / Out */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 text-[10px] mr-1">In:</span>
                        {t.check_in || "—"}
                        <span className="text-slate-400 text-[10px] mx-1">Out:</span>
                        <strong className="text-amber-600 dark:text-amber-400">
                          {t.check_out || "—"}
                        </strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total: {t.total_work_hours} hrs (Std: {t.standard_hours} hrs)
                      </div>
                    </td>

                    {/* Overtime Hours */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-black text-xs">
                        <LuClock className="h-3 w-3 text-amber-600" />
                        <span>
                          {t.status === "Approved" && t.approved_hours !== null
                            ? `${t.approved_hours} hrs`
                            : `${t.overtime_hours} hrs`}
                        </span>
                      </div>
                      {t.overtime_minutes > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          ({t.overtime_minutes} mins)
                        </div>
                      )}
                    </td>

                    {/* Hourly Rate */}
                    <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div>₹{Number(t.hourly_rate || 0).toFixed(2)}/hr</div>
                      <div className="text-[10px] text-slate-400">
                        Multiplier: {t.ot_multiplier || 1.5}x
                      </div>
                    </td>

                    {/* Payout */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-black text-slate-900 dark:text-white">
                        {t.status === "Approved" && t.approved_payout !== null
                          ? formatINR(t.approved_payout)
                          : formatINR(t.estimated_payout)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.status === "Approved" ? "Approved Payout" : "Estimated"}
                      </div>
                    </td>

                    {/* Reporting Manager */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.reporting_manager || "—"}
                      </div>
                      {t.reporting_manager_id && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {t.reporting_manager_id}
                        </div>
                      )}
                    </td>

                    {/* Decision Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {renderStatusBadge(t.status)}
                    </td>

                    {/* Payroll Payout Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {renderPayoutBadge(t.payout_status)}
                    </td>

                    {/* Actions Column with No Text Wrapping */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Manager Review / Decision Button */}
                        {canUserReview(t) && (
                          <button
                            onClick={() => handleOpenReview(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition whitespace-nowrap"
                            title="Decide whether to accept or reject with proper comments"
                          >
                            <LuUserCheck className="h-3.5 w-3.5" />
                            Review
                          </button>
                        )}

                        {/* View Details Button */}
                        <button
                          onClick={() => {
                            setActiveTicket(t);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="View Ticket Details"
                        >
                          <LuEye className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Draft/Pending (Only owner or HR) */}
                        {t.status !== "Approved" &&
                          (isPrivileged || t.employee_id === currentEmpId) && (
                            <button
                              onClick={() => handleDeleteTicket(t)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete Pending Ticket"
                            >
                              <LuTrash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* ======================================================== */}
      {/* MODAL 1: RAISE OVERTIME TICKET */}
      {/* ======================================================== */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRaiseModalOpen(false)}>
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 pb-3 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <LuClock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Raise Overtime (OT) Approval Ticket
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit ticket to reporting manager for approval of hours worked past shift end
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRaiseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 pt-2 overflow-y-auto space-y-4 text-xs scrollbar-thin">
                {/* Employee Selection (if privileged) */}
                {isPrivileged && eligibleEmployees.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Select Employee <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = eligibleEmployees.find((e) => e.employee_id === empId);
                        setFormData((prev) => ({
                          ...prev,
                          employee_id: empId,
                          hourly_rate: emp?.hourly_rate || prev.hourly_rate,
                          estimated_payout: Math.round(
                            (prev.overtime_hours || 0) * (emp?.hourly_rate || 200) * (prev.ot_multiplier || 1.5)
                          ),
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {eligibleEmployees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.name} ({emp.employee_id}) • {emp.department} • ₹{emp.hourly_rate}/hr
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Attendance Date & Shift End */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Attendance Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.attendance_date}
                      onChange={(e) =>
                        setFormData({ ...formData, attendance_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Shift Name
                    </label>
                    <input
                      type="text"
                      value={formData.shift_name}
                      onChange={(e) =>
                        setFormData({ ...formData, shift_name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>

                {/* Punch Timings & Shift Timings */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Shift Start
                    </span>
                    <input
                      type="text"
                      value={formData.shift_start}
                      onChange={(e) =>
                        setFormData({ ...formData, shift_start: e.target.value })
                      }
                      className="w-full mt-1 px-2 py-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Shift End
                    </span>
                    <input
                      type="text"
                      value={formData.shift_end}
                      onChange={(e) =>
                        setFormData({ ...formData, shift_end: e.target.value })
                      }
                      className="w-full mt-1 px-2 py-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Punched In
                    </span>
                    <input
                      type="text"
                      value={formData.check_in}
                      onChange={(e) =>
                        setFormData({ ...formData, check_in: e.target.value })
                      }
                      className="w-full mt-1 px-2 py-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block">
                      Punched Out
                    </span>
                    <input
                      type="text"
                      value={formData.check_out}
                      onChange={(e) =>
                        setFormData({ ...formData, check_out: e.target.value })
                      }
                      className="w-full mt-1 px-2 py-1 text-xs font-mono font-bold rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300"
                    />
                  </div>
                </div>

                {/* Overtime Hours, Rate & Estimated Payout */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Overtime Hours <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="12"
                        required
                        value={formData.overtime_hours}
                        onChange={(e) => handleHoursChange(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 text-xs font-black rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-800 text-amber-800 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-bold text-amber-600">
                        hrs
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Standard Hourly Rate
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.hourly_rate}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setFormData((prev) => ({
                            ...prev,
                            hourly_rate: rate,
                            estimated_payout: Math.round(
                              (prev.overtime_hours || 0) * rate * (prev.ot_multiplier || 1.5)
                            ),
                          }));
                        }}
                        className="w-full pl-6 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">
                        ₹
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Est. Payout (1.5x rate)
                    </label>
                    <div className="px-3 py-2 text-xs font-black rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span>{formatINR(formData.estimated_payout)}</span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        1.5x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason for Overtime */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Overtime <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.reason_for_ot}
                    onChange={(e) =>
                      setFormData({ ...formData, reason_for_ot: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    {OT_REASONS.map((r, i) => (
                      <option key={i} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Task Description & Justification{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Explain the specific deliverables, critical issues resolved, or tickets worked on past shift hours..."
                    value={formData.task_description}
                    onChange={(e) =>
                      setFormData({ ...formData, task_description: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                {/* Action Buttons */}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/25 transition flex items-center gap-1.5"
                >
                  <LuSend className="h-3.5 w-3.5" />
                  Submit Overtime Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: MANAGER REVIEW & DECISION MODAL */}
      {/* ======================================================== */}
      {isReviewModalOpen && activeTicket && (
        <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)}>
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <LuUserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Reporting Manager Decision
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and decide on overtime ticket {activeTicket.ticket_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 overflow-y-auto space-y-4 text-xs scrollbar-thin">
              {/* Ticket Overview Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeTicket.employee_name} ({activeTicket.employee_id})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Attendance Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateStr(activeTicket.attendance_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shift Timings:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {activeTicket.shift_start} - {activeTicket.shift_end} (Punched out:{" "}
                    <strong className="text-amber-600">{activeTicket.check_out}</strong>)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Claimed OT Hours:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    {activeTicket.overtime_hours} hrs ({activeTicket.overtime_minutes} mins)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Reason:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeTicket.reason_for_ot}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Task Description:</span>
                  <p className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic">
                    "{activeTicket.task_description}"
                  </p>
                </div>
              </div>

              {/* Approved Hours Adjustment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Approved Overtime Hours (Manager Authorized)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="12"
                      value={reviewData.approved_hours}
                      onChange={(e) =>
                        setReviewData({ ...reviewData, approved_hours: e.target.value })
                      }
                      className="w-full pl-3 pr-10 py-2 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">
                      hrs
                    </span>
                  </div>
                  <div className="p-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                    <span className="text-[10px] text-emerald-600 block">Payout Preview:</span>
                    <strong className="font-black text-emerald-700 dark:text-emerald-300">
                      {formatINR(
                        Math.round(
                          (parseFloat(reviewData.approved_hours) || 0) *
                          (activeTicket.hourly_rate || 0) *
                          (activeTicket.ot_multiplier || 1.5)
                        )
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Manager Feedback / Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Manager Remarks & Decision Feedback{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide detailed feedback on the approval or rejection of this overtime claim..."
                  value={reviewData.manager_remarks}
                  onChange={(e) =>
                    setReviewData({ ...reviewData, manager_remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              {/* Decision Action Buttons */}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmitReview("Rejected")}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 transition flex items-center gap-1.5"
                >
                  <LuCircleX className="h-3.5 w-3.5" />
                  Reject Request
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitReview("Approved")}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 transition flex items-center gap-1.5"
                >
                  <LuCheck className="h-3.5 w-3.5" />
                  Approve Overtime
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* ======================================================== */}
      {/* MODAL 3: TICKET DETAILS MODAL */}
      {/* ======================================================== */}
      {
        isDetailsModalOpen && activeTicket && (
          <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailsModalOpen(false)}>
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <LuClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Ticket #{activeTicket.ticket_number}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Complete Overtime Audit & Approval History
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 overflow-y-auto space-y-4 text-xs scrollbar-thin">
                {/* Status Header */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Decision Status
                    </span>
                    <div className="mt-1">{renderStatusBadge(activeTicket.status)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Payroll Integration
                    </span>
                    <div className="mt-1">{renderPayoutBadge(activeTicket.payout_status)}</div>
                  </div>
                </div>

                {/* Employee & Attendance Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Employee</span>
                    <strong className="text-slate-900 dark:text-white">
                      {activeTicket.employee_name}
                    </strong>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {activeTicket.employee_id}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Department</span>
                    <strong className="text-slate-900 dark:text-white">
                      {activeTicket.department}
                    </strong>
                    <div className="text-slate-500 text-[11px]">{activeTicket.designation}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Attendance Date</span>
                    <strong className="text-slate-900 dark:text-white">
                      {formatDateStr(activeTicket.attendance_date)}
                    </strong>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Shift & Timings</span>
                    <div className="font-mono text-slate-800 dark:text-slate-200">
                      {activeTicket.shift_start} - {activeTicket.shift_end}
                    </div>
                    <div className="text-[10px] text-amber-600 font-mono">
                      Out: {activeTicket.check_out}
                    </div>
                  </div>
                </div>

                {/* OT Hours & Payout Breakdown */}
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Claimed Overtime Hours:
                    </span>
                    <span className="font-black text-amber-700 dark:text-amber-300">
                      {activeTicket.overtime_hours} hrs ({activeTicket.overtime_minutes} mins)
                    </span>
                  </div>
                  {activeTicket.approved_hours !== null && (
                    <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Approved Hours:</span>
                      <span>{activeTicket.approved_hours} hrs</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Hourly Rate & Multiplier:</span>
                    <span className="font-mono">
                      ₹{Number(activeTicket.hourly_rate).toFixed(2)}/hr ({activeTicket.ot_multiplier || 1.5}x)
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200 dark:border-amber-800 font-bold text-sm">
                    <span>
                      {activeTicket.status === "Approved" ? "Approved Payout:" : "Estimated Payout:"}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {activeTicket.status === "Approved" && activeTicket.approved_payout !== null
                        ? formatINR(activeTicket.approved_payout)
                        : formatINR(activeTicket.estimated_payout)}
                    </span>
                  </div>
                </div>

                {/* Reason & Task Description */}
                <div className="space-y-1.5">
                  <span className="text-slate-500 font-bold block">Reason for Overtime:</span>
                  <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    {activeTicket.reason_for_ot}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-slate-500 font-bold block">Task Description:</span>
                  <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    {activeTicket.task_description}
                  </p>
                </div>

                {/* Manager Feedback */}
                {activeTicket.manager_remarks && (
                  <div className="space-y-1.5">
                    <span className="text-slate-500 font-bold block">
                      Reporting Manager Remarks ({activeTicket.reviewed_by_name || activeTicket.reporting_manager}):
                    </span>
                    <p className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 italic font-medium">
                      "{activeTicket.manager_remarks}"
                    </p>
                  </div>
                )}

                {/* Close Button */}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ======================================================== */}
      {/* MODAL 4: SYNC WITH PAYROLL MODAL */}
      {/* ======================================================== */}
      {
        isSyncModalOpen && (
          <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSyncModalOpen(false)}>
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                    <LuFileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Sync Overtime with Payroll
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Push approved unpaid overtime claims into employee salary slips
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSyncModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 overflow-y-auto space-y-4 text-xs scrollbar-thin">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Payroll Month (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={syncMonthYear}
                    onChange={(e) => setSyncMonthYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                  <span className="font-bold block">How Overtime Sync Works:</span>
                  <p className="text-[11px] leading-relaxed">
                    The engine will collect all <strong>Approved & Unpaid</strong> overtime tickets for {syncMonthYear}, aggregate the hours and approved payouts for each employee, update their Payroll record's <code>variable_pay.overtime</code> and <code>attendance_summary.overtime_hours</code>, recalculate gross and net salaries, and mark the tickets as <em>Synced to Payroll</em>.
                  </p>
                </div>

              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={handleSyncWithPayroll}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 transition flex items-center gap-1.5"
                >
                  {syncLoading ? (
                    <LuRotateCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <LuCheckCheck className="h-4 w-4" />
                  )}
                  Confirm Sync to Payroll
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}