import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  LuTrendingUp,
  LuAward,
  LuCalendar,
  LuCheck,
  LuClock,
  LuFileText,
  LuPrinter,
  LuDownload,
  LuPlus,
  LuFilter,
  LuSearch,
  LuUserCheck,
  LuBriefcase,
  LuX,
  LuSparkles,
  LuSend,
  LuEye,
  LuShieldCheck,
  LuBadgeCheck,
  LuRotateCw,
  LuTrash2,
  LuFileCheck,
  LuUsers,
  LuCircleX,
  LuArrowUpRight,
  LuCoins,
  LuPercent,
} from "react-icons/lu";
import api from "../../api/axios";
import {
  getAuthRole,
  isDepartmentHeadOrManager,
} from "../../utils/auth";
import {
  generatePromotionLetterPDF,
  formatINR,
  formatDateStr,
} from "../../utils/promotionLetterGenerator";

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    effective: 0,
    rejected: 0,
    deferred: 0,
    merit_promotions: 0,
    grade_progressions: 0,
    accelerated: 0,
    average_hike: "0.0",
    letters_issued: 0,
  });
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({
    employees: [],
    grades: [],
    designations: [],
    promotionTypes: [],
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [selectedPromotionForLetter, setSelectedPromotionForLetter] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedPromotionForReview, setSelectedPromotionForReview] = useState(null);
  const [reviewAction, setReviewAction] = useState("Approved"); // "Approved", "Rejected", "Deferred", "Effective"
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [syncEmployeeRecord, setSyncEmployeeRecord] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form State
  const initialFormState = {
    employee_id: "",
    promotion_type: "Merit Promotion",
    target_designation: "",
    target_grade_code: "L3",
    target_rank_level: 3,
    revised_salary: "",
    increment_percentage: "15.0",
    payout_basis: "monthly", // "monthly", "annual", "lpa"
    performance_rating: "4.8 / 5.0 (Exceeds Expectations)",
    effective_date: "",
    justification: "",
    remarks: "",
  };
  const [formData, setFormData] = useState(initialFormState);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null);

  // Quick preset chips for hike %
  const QUICK_HIKE_PRESETS = [8, 10, 12, 15, 20, 25, 30];

  // Normalized employee baseline compensation snapshot
  const getEmployeeCompSnapshot = (emp) => {
    if (!emp) {
      return {
        raw: 0,
        monthly: 0,
        annual: 0,
        lpa: "0.00",
      };
    }
    const raw = parseFloat(emp.current_salary) || 0;
    let annual = 0;
    let monthly = 0;

    if (raw > 0 && raw < 100) {
      // Stored in LPA metric
      annual = raw * 100000;
      monthly = Math.round(annual / 12);
    } else if (raw > 250000) {
      // Stored as Annual CTC
      annual = raw;
      monthly = Math.round(raw / 12);
    } else {
      // Stored as Monthly Gross (standard <= 250,000)
      monthly = raw;
      annual = raw * 12;
    }

    const lpa = (annual / 100000).toFixed(2);
    return { raw, monthly, annual, lpa };
  };

  // RBAC checks
  const role = (getAuthRole() || "").toLowerCase().trim();
  const isPrivileged = [
    "hr",
    "admin",
    "management",
    "ceo",
    "coo",
    "hrmanager",
  ].includes(role);
  const isLeadOrManager = isPrivileged || isDepartmentHeadOrManager();

  // 1. Fetch Metadata
  const fetchMetadata = async () => {
    try {
      const res = await api.get("/promotions/metadata");
      if (res.data?.success && res.data?.data) {
        setMetadata(res.data.data);
      }
    } catch (err) {
      console.warn("Error fetching promotion metadata:", err.message);
    }
  };

  // 2. Fetch Promotions
  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (typeFilter !== "All") params.type = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/promotions", { params });
      if (res.data?.success) {
        setPromotions(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load promotions:", err);
      toast.error("Failed to load promotions list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [statusFilter, typeFilter, searchQuery]);

  // Handle Employee Selection
  const handleSelectEmployee = (empId) => {
    const emp = metadata.employees.find((e) => e.id === empId);
    if (emp) {
      setSelectedEmployeeProfile(emp);
      const snap = getEmployeeCompSnapshot(emp);
      const hikePct = parseFloat(formData.increment_percentage) || 15.0;
      const suggestedAnnual = Math.round(snap.annual * (1 + hikePct / 100));

      setFormData((prev) => ({
        ...prev,
        employee_id: emp.id,
        target_designation: "",
        payout_basis: prev.payout_basis || "monthly",
        revised_salary: suggestedAnnual > 0 ? String(suggestedAnnual) : "",
      }));
    } else {
      setSelectedEmployeeProfile(null);
      setFormData((prev) => ({ ...prev, employee_id: empId, revised_salary: "" }));
    }
  };

  // Handle Payout Basis Toggle
  const handlePayoutBasisChange = (newBasis) => {
    setFormData((prev) => ({
      ...prev,
      payout_basis: newBasis,
    }));
  };

  // Handle Dynamic Hike % Change
  const handleHikePercentageChange = (newPercentageStr) => {
    const snap = getEmployeeCompSnapshot(selectedEmployeeProfile);
    const pct = parseFloat(newPercentageStr);

    if (newPercentageStr === "" || isNaN(pct)) {
      setFormData((prev) => ({
        ...prev,
        increment_percentage: newPercentageStr,
      }));
      return;
    }

    const incAmt = Math.round(snap.annual * (pct / 100));
    const newRevised = Math.round(snap.annual + incAmt);

    setFormData((prev) => ({
      ...prev,
      increment_percentage: newPercentageStr,
      revised_salary: newRevised > 0 ? String(newRevised) : "",
    }));
  };

  // Handle Revised Monthly Change (calculates annual & hike %)
  const handleRevisedMonthlyChange = (newMonthlyStr) => {
    const snap = getEmployeeCompSnapshot(selectedEmployeeProfile);
    const monthlyVal = parseFloat(newMonthlyStr);

    if (newMonthlyStr === "" || isNaN(monthlyVal)) {
      setFormData((prev) => ({
        ...prev,
        revised_salary: "",
      }));
      return;
    }

    const newRevisedAnnual = Math.round(monthlyVal * 12);
    let calculatedPct = "0.00";
    if (snap.annual > 0) {
      const incAmt = Math.max(0, newRevisedAnnual - snap.annual);
      calculatedPct = ((incAmt / snap.annual) * 100).toFixed(2);
    }

    setFormData((prev) => ({
      ...prev,
      revised_salary: String(newRevisedAnnual),
      increment_percentage: calculatedPct,
    }));
  };

  // Handle Revised Annual CTC Change (reverse calculates hike %)
  const handleRevisedSalaryChange = (newRevisedStr) => {
    const snap = getEmployeeCompSnapshot(selectedEmployeeProfile);
    const revisedVal = parseFloat(newRevisedStr);

    if (newRevisedStr === "" || isNaN(revisedVal)) {
      setFormData((prev) => ({
        ...prev,
        revised_salary: newRevisedStr,
      }));
      return;
    }

    let calculatedPct = "0.00";
    if (snap.annual > 0) {
      const incAmt = Math.max(0, revisedVal - snap.annual);
      calculatedPct = ((incAmt / snap.annual) * 100).toFixed(2);
    }

    setFormData((prev) => ({
      ...prev,
      revised_salary: newRevisedStr,
      increment_percentage: calculatedPct,
    }));
  };

  // Handle Revised LPA Change (calculates annual & hike %)
  const handleRevisedLpaChange = (newLpaStr) => {
    const snap = getEmployeeCompSnapshot(selectedEmployeeProfile);
    const lpaVal = parseFloat(newLpaStr);

    if (newLpaStr === "" || isNaN(lpaVal)) {
      setFormData((prev) => ({
        ...prev,
        revised_salary: "",
      }));
      return;
    }

    const newRevisedAnnual = Math.round(lpaVal * 100000);
    let calculatedPct = "0.00";
    if (snap.annual > 0) {
      const incAmt = Math.max(0, newRevisedAnnual - snap.annual);
      calculatedPct = ((incAmt / snap.annual) * 100).toFixed(2);
    }

    setFormData((prev) => ({
      ...prev,
      revised_salary: String(newRevisedAnnual),
      increment_percentage: calculatedPct,
    }));
  };

  // Live calculation of increment hike & breakdown
  const calculatedIncrement = () => {
    const snap = getEmployeeCompSnapshot(selectedEmployeeProfile);
    const annualBase = snap.annual;
    const currentMonthly = snap.monthly;
    const currentLpa = snap.lpa;

    const revisedSal = parseFloat(formData.revised_salary) || 0;
    const hikeAmount = Math.max(0, revisedSal - annualBase);
    const hikePercentage =
      annualBase > 0
        ? ((hikeAmount / annualBase) * 100).toFixed(2)
        : (parseFloat(formData.increment_percentage) || 0).toFixed(2);
    const revisedMonthly = Math.round(revisedSal / 12);
    const monthlyHike = Math.round(hikeAmount / 12);
    const revisedLpa = (revisedSal / 100000).toFixed(2);
    const lpaHike = (hikeAmount / 100000).toFixed(2);

    return {
      annualBase,
      currentMonthly,
      currentLpa,
      hikeAmount,
      hikePercentage,
      revisedSal,
      revisedMonthly,
      monthlyHike,
      revisedLpa,
      lpaHike,
    };
  };

  // Submit Promotion Initiation
  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.target_designation.trim()) {
      toast.error("Please provide the upgraded target designation");
      return;
    }
    if (!formData.revised_salary || parseFloat(formData.revised_salary) <= 0) {
      toast.error("Please provide a valid revised compensation / CTC");
      return;
    }
    if (!formData.effective_date) {
      toast.error("Please select the effective date");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.post("/promotions", formData);
      if (res.data?.success) {
        toast.success(res.data.message || "Promotion order initiated successfully!");
        setShowInitiateModal(false);
        setFormData(initialFormState);
        setSelectedEmployeeProfile(null);
        fetchPromotions();
      }
    } catch (err) {
      console.error("Initiate promotion error:", err);
      toast.error(err.response?.data?.message || "Failed to initiate promotion");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Review (Approve / Reject / Defer / Mark Effective)
  const handleSubmitReview = async () => {
    if (!selectedPromotionForReview) return;
    if (reviewAction === "Rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.put(
        `/promotions/${selectedPromotionForReview.id}/status`,
        {
          status: reviewAction,
          remarks: reviewRemarks,
          rejection_reason: rejectionReason,
          apply_to_employee: syncEmployeeRecord,
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Promotion status updated successfully!");
        setShowReviewModal(false);
        setSelectedPromotionForReview(null);
        setReviewRemarks("");
        setRejectionReason("");
        fetchPromotions();
      }
    } catch (err) {
      console.error("Review promotion error:", err);
      toast.error(err.response?.data?.message || "Failed to update promotion status");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete Draft Promotion
  const handleDeletePromotion = async (id, code) => {
    try {
      const res = await api.delete(`/promotions/${id}`);
      if (res.data?.success) {
        toast.success(`Promotion order ${code} removed successfully`);
        fetchPromotions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete promotion");
    }
  };

  // Download PDF
  const handleDownloadPDF = (prm) => {
    try {
      const doc = generatePromotionLetterPDF(prm, {
        name: "Zentelex Pvt. Ltd.",
        address: "Harmony heaven, 27 Rajdanga, FB, Main Road, near Purba, G.D Block, Kolkata, West Bengal 700107",
        email: "hr@zentelex.com",
      });
      doc.save(`Promotion_Letter_${prm.promotion_code || "ZEN"}.pdf`);
      toast.success("Official Promotion Letter PDF downloaded!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate PDF letter");
    }
  };

  // Print Letter
  const handlePrintLetter = () => {
    window.print();
  };

  // Badges & styling
  const getTypeBadge = (type) => {
    switch (type) {
      case "Merit Promotion":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
      case "Grade Progression":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      case "Accelerated Promotion":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Role Elevation":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Effective":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Deferred":
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER SECTION                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <LuTrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Promotions & Grade Progression Engine
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Employee Service & Lifecycle Management • Automated Career Progression, Designation Upgrades, Compensation Revision & Official Promotion Orders
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPromotions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh list"
          >
            <LuRotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>

          {isLeadOrManager && (
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormState);
                setSelectedEmployeeProfile(null);
                setShowInitiateModal(true);
              }}
              className="inline-flex items-center w-auto gap-1.5 px-2 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
            >
              <LuPlus className="h-4 w-4" />
              <span>Initiate Promotion</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. STATS & ANALYTICS CARDS                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          {
            label: "Total Orders",
            val: stats.total,
            icon: <LuAward className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
            badge: "All Records",
            bg: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40",
          },
          {
            label: "Pending Approvals",
            val: stats.pending,
            icon: <LuClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
            badge: "Needs Action",
            bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
            valColor: "text-amber-600 dark:text-amber-400",
          },
          {
            label: "Merit Promotions",
            val: stats.merit_promotions,
            icon: <LuTrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
            badge: "Performance",
            bg: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
          },
          {
            label: "Grade Progressions",
            val: stats.grade_progressions,
            icon: <LuArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
            badge: "Band Ladders",
            bg: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40",
          },
          {
            label: "Average Hike",
            val: `+${stats.average_hike}%`,
            icon: <LuPercent className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
            badge: "Compensation",
            bg: "bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/40",
            valColor: "text-cyan-600 dark:text-cyan-400",
          },
          {
            label: "Letters Issued",
            val: stats.letters_issued,
            icon: <LuFileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
            badge: "Official Orders",
            bg: "bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40",
            valColor: "text-purple-600 dark:text-purple-400",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`p-3.5 rounded-xl border transition-all duration-200 bg-white dark:bg-slate-900 ${card.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {card.label}
              </span>
              <div className="p-1 rounded-md bg-white dark:bg-slate-800 shadow-2xs">
                {card.icon}
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span
                className={`text-xl font-extrabold ${card.valColor || "text-slate-900 dark:text-slate-100"}`}
              >
                {card.val}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {card.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. FILTERS & SEARCH CONTROLS                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <LuSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee, code, designation, grade, or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <LuX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Promotion Type Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Progression Types</option>
              <option value="Merit Promotion">Merit Promotion</option>
              <option value="Grade Progression">Grade Progression</option>
              <option value="Accelerated Promotion">Accelerated Promotion</option>
              <option value="Role Elevation">Role Elevation</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Effective">Effective (Applied)</option>
              <option value="Deferred">Deferred</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. MAIN PROMOTIONS DATA TABLE (WITH NO TEXT-WRAPPING)       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {loading && promotions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="flex items-center justify-center">
              <LuRotateCw className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Loading promotions & grade progressions...
            </p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
              <LuAward className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No promotion orders found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "All" || typeFilter !== "All"
                ? "No promotion records match your selected filters. Try clearing search or resetting filter dropdowns."
                : "No employee promotions or grade progressions have been initiated yet."}
            </p>
            {isLeadOrManager && (
              <button
                type="button"
                onClick={() => {
                  setFormData(initialFormState);
                  setSelectedEmployeeProfile(null);
                  setShowInitiateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                <LuPlus className="h-3.5 w-3.5" />
                <span>Initiate First Promotion</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4 whitespace-nowrap">Employee</th>
                  <th className="py-3 px-3 whitespace-nowrap">Progression Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Current Designation & Grade</th>
                  <th className="py-3 px-4 whitespace-nowrap">Promoted Role & Band</th>
                  <th className="py-3 px-4 whitespace-nowrap">Compensation Revision</th>
                  <th className="py-3 px-3 whitespace-nowrap">Performance Benchmark</th>
                  <th className="py-3 px-3 whitespace-nowrap">Effective Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions & Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {promotions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap"
                  >
                    {/* Employee Profile */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {item.employee_name
                            ? item.employee_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                            : "EM"}
                        </div>
                        <div className="whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.employee_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                            {item.employee_id} • {item.promotion_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Promotion Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getTypeBadge(
                          item.promotion_type
                        )}`}
                      >
                        <LuAward className="h-3 w-3" />
                        <span>{item.promotion_type}</span>
                      </span>
                    </td>

                    {/* Current Designation & Grade */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.current_designation}
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap">
                        Grade {item.current_grade_code || "L2"} (Rank {item.current_rank_level || 2}) • {item.department}
                      </div>
                    </td>

                    {/* Promoted Role & Band */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex items-center gap-1.5">
                        <LuArrowUpRight className="h-4 w-4 flex-shrink-0" />
                        <span>{item.target_designation}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Elevated to Grade <strong>{item.target_grade_code || "L3"}</strong> (Rank {item.target_rank_level || 3})
                      </div>
                    </td>

                    {/* Compensation Revision */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatINR(item.revised_salary)} / yr
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <span>Prev: {formatINR(item.current_salary)}</span>
                        <span className="text-emerald-600 font-semibold">
                          (+{parseFloat(item.increment_percentage || 0).toFixed(1)}%)
                        </span>
                      </div>
                    </td>

                    {/* Performance Benchmark */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {item.performance_rating || "Exceeds Expectations"}
                      </div>
                    </td>

                    {/* Effective Date */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDateStr(item.effective_date)}
                      </div>
                    </td>

                    {/* Workflow Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status === "Approved" && <LuCheck className="h-3 w-3" />}
                        {item.status === "Pending" && <LuClock className="h-3 w-3" />}
                        {item.status === "Effective" && <LuBadgeCheck className="h-3 w-3" />}
                        {item.status === "Rejected" && <LuCircleX className="h-3 w-3" />}
                        <span>{item.status}</span>
                      </span>
                      {item.sync_employee_record && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium whitespace-nowrap">
                          ✓ Synced to Profile
                        </div>
                      )}
                    </td>

                    {/* Actions & Letter */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end whitespace-nowrap flex-nowrap">
                        {/* Letter View / Print */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPromotionForLetter(item);
                            setShowLetterModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition whitespace-nowrap"
                          title="Preview & Print Official Promotion Letter"
                        >
                          <LuFileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="hidden sm:inline">Letter</span>
                        </button>

                        {/* Direct PDF Download */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(item)}
                          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap"
                          title="Download PDF Promotion Order"
                        >
                          <LuDownload className="h-3.5 w-3.5" />
                        </button>

                        {/* Review Button for Privileged */}
                        {isPrivileged && item.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromotionForReview(item);
                              setReviewAction("Approved");
                              setReviewRemarks("");
                              setRejectionReason("");
                              setSyncEmployeeRecord(true);
                              setShowReviewModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition whitespace-nowrap"
                            title="Review & Authorize Promotion"
                          >
                            <LuCheck className="h-3.5 w-3.5" />
                            <span>Review</span>
                          </button>
                        )}

                        {/* Apply Profile button if Approved and not yet Synced */}
                        {isPrivileged && item.status === "Approved" && !item.sync_employee_record && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromotionForReview(item);
                              setReviewAction("Effective");
                              setReviewRemarks("Promotion order activated and employee record upgraded.");
                              setSyncEmployeeRecord(true);
                              setShowReviewModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition whitespace-nowrap"
                            title="Apply to Employee Profile"
                          >
                            <LuBadgeCheck className="h-3 w-3" />
                            <span>Apply</span>
                          </button>
                        )}

                        {/* Cancel / Delete Draft if Pending */}
                        {isPrivileged && item.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleDeletePromotion(item.id, item.promotion_code)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition whitespace-nowrap"
                            title="Cancel Nomination"
                          >
                            <LuTrash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. NOMINATE / INITIATE PROMOTION MODAL                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-fade-in">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                  <LuAward className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Nominate Employee Promotion & Grade Progression
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated designation upgrades, compensation revisions, and career progression
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- Choose Employee --</option>
                  {metadata.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) • {emp.dept} • {emp.designation}
                      {/* (Current: ₹
                      {emp.current_salary?.toLocaleString("en-IN")}
                      {emp.detected_basis === "monthly"
                        ? " /mo → Annual CTC: ₹" +
                        emp.annual_salary?.toLocaleString("en-IN") +
                        " /yr"
                        : " /yr"}
                      ) */}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Employee Snapshot & Payout Basis Conversion */}
              {selectedEmployeeProfile && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 text-xs space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">
                        Current Designation
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold truncate block">
                        {selectedEmployeeProfile.designation}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {selectedEmployeeProfile.id}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">
                        Department
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold truncate block">
                        {selectedEmployeeProfile.dept}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">
                        Stored Salary Record
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {formData.payout_basis === "monthly"
                          ? `₹${calculatedIncrement().currentMonthly.toLocaleString("en-IN")}`
                          : formData.payout_basis === "annual"
                            ? `₹${calculatedIncrement().annualBase.toLocaleString("en-IN")}`
                            : `${calculatedIncrement().currentLpa} LPA`}
                      </strong>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-semibold">
                        {formData.payout_basis === "monthly"
                          ? "Monthly Gross Payout"
                          : formData.payout_basis === "lpa"
                            ? "LPA Metric (Annual ÷ 1 Lakh)"
                            : "Annual Gross CTC (12× Monthly)"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">
                        Converted Annual Base CTC
                      </span>
                      <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-black block">
                        {formatINR(calculatedIncrement().annualBase)} / yr
                      </strong>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {calculatedIncrement().currentLpa} LPA (₹
                        {calculatedIncrement().currentMonthly.toLocaleString("en-IN")}/mo)
                      </span>
                    </div>
                  </div>

                  {/* Payout Basis Toggle Selector */}
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <LuSparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Employee Payout Basis:</span>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-[11px] font-semibold shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handlePayoutBasisChange("monthly")}
                        className={`px-2.5 py-1 rounded-md transition ${formData.payout_basis === "monthly"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        title="Stored as monthly salary: converted ×12 to calculate annual hike"
                      >
                        Monthly (×12 converted)
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePayoutBasisChange("annual")}
                        className={`px-2.5 py-1 rounded-md transition ${formData.payout_basis === "annual"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        title="Stored as annual CTC"
                      >
                        Annual CTC
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePayoutBasisChange("lpa")}
                        className={`px-2.5 py-1 rounded-md transition ${formData.payout_basis === "lpa"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        title="Stored in Lakhs Per Annum (×1,00,000)"
                      >
                        LPA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Progression Type & Effective Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Progression Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.promotion_type}
                    onChange={(e) =>
                      setFormData({ ...formData, promotion_type: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Merit Promotion">Merit Promotion (Annual Cycle)</option>
                    <option value="Grade Progression">Grade & Pay Band Progression</option>
                    <option value="Accelerated Promotion">Accelerated Out-of-Turn Promotion</option>
                    <option value="Role Elevation">Role & Responsibility Elevation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Effective Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) =>
                      setFormData({ ...formData, effective_date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Upgraded Target Designation & Target Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Promoted Target Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="promoted_desig_options"
                    value={formData.target_designation}
                    onChange={(e) =>
                      setFormData({ ...formData, target_designation: e.target.value })
                    }
                    placeholder="e.g. Senior Solutions Architect"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="promoted_desig_options">
                    {metadata.designations.map((d, i) => (
                      <option key={i} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Job Grade & Band <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.target_grade_code}
                    onChange={(e) => {
                      const grade = metadata.grades.find((g) => g.grade_code === e.target.value);
                      setFormData({
                        ...formData,
                        target_grade_code: e.target.value,
                        target_rank_level: grade ? grade.rank_level : 3,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {metadata.grades.map((g) => (
                      <option key={g.id} value={g.grade_code}>
                        {g.grade_code} • {g.grade_name} (Rank {g.rank_level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* DYNAMIC HIKE & COMPENSATION REVISION ENGINE                   */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-white to-emerald-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-emerald-950/20 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <LuCoins className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Dynamic Hike & Compensation Revision Engine</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                    Live Real-Time Calculator
                  </span>
                </div>

                {/* Interactive Dynamic Inputs: Hike % and Revised Salary (Contextual Unit) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field 1: Dynamic Hike % Input */}
                  <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900">
                    <label className="block text-[11px] font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                      Dynamic Hike Percentage (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="500"
                        placeholder="e.g. 15.0"
                        value={formData.increment_percentage}
                        onChange={(e) => handleHikePercentageChange(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm font-black rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-extrabold text-indigo-500">
                        %
                      </span>
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-medium text-slate-400 mr-0.5">Presets:</span>
                      {QUICK_HIKE_PRESETS.map((preset) => {
                        const isSelected =
                          parseFloat(formData.increment_percentage) === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleHikePercentageChange(preset.toString())}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${isSelected
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900/40"
                              }`}
                          >
                            +{preset}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field 2: Revised Compensation Input (Contextual based on selected Payout Basis) */}
                  <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900">
                    <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                      {formData.payout_basis === "monthly"
                        ? "Revised Monthly Gross (₹/mo)"
                        : formData.payout_basis === "lpa"
                          ? "Revised CTC in LPA"
                          : "Revised Annual CTC (₹/yr)"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>

                    <div className="relative">
                      {formData.payout_basis === "monthly" ? (
                        <input
                          type="number"
                          required
                          min="0"
                          step="500"
                          placeholder="e.g. 11500"
                          value={calculatedIncrement().revisedMonthly || ""}
                          onChange={(e) => handleRevisedMonthlyChange(e.target.value)}
                          className="w-full pl-3 pr-12 py-2 text-sm font-black rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : formData.payout_basis === "lpa" ? (
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="e.g. 1.38"
                          value={calculatedIncrement().revisedLpa || ""}
                          onChange={(e) => handleRevisedLpaChange(e.target.value)}
                          className="w-full pl-3 pr-12 py-2 text-sm font-black rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <input
                          type="number"
                          required
                          min="0"
                          step="1000"
                          placeholder="e.g. 138000"
                          value={formData.revised_salary}
                          onChange={(e) => handleRevisedSalaryChange(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 text-sm font-black rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      )}
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-600">
                        {formData.payout_basis === "monthly"
                          ? "/mo"
                          : formData.payout_basis === "lpa"
                            ? "LPA"
                            : "/yr"}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-between">
                      <span>
                        {formData.payout_basis === "annual"
                          ? `${calculatedIncrement().revisedLpa} LPA Equivalent`
                          : formData.payout_basis === "lpa"
                            ? `Annual CTC: ${formatINR(calculatedIncrement().revisedSal)} / yr`
                            : `Annual CTC: ${formatINR(calculatedIncrement().revisedSal)} / yr`}
                      </span>
                      <span>
                        {formData.payout_basis === "monthly"
                          ? `${calculatedIncrement().revisedLpa} LPA`
                          : `≈ ₹${calculatedIncrement().revisedMonthly?.toLocaleString("en-IN")}/mo`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculation Breakdown Cards */}
                <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Annual Increment
                    </span>
                    <strong className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                      +{formatINR(calculatedIncrement().hikeAmount)}
                    </strong>
                    <span className="text-[10px] text-slate-400 block truncate">
                      +₹{calculatedIncrement().monthlyHike?.toLocaleString("en-IN")}/mo (+{calculatedIncrement().lpaHike} LPA)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Revised Monthly Gross
                    </span>
                    <strong className="text-xs sm:text-sm font-extrabold text-indigo-700 dark:text-indigo-300 block truncate">
                      ₹{calculatedIncrement().revisedMonthly?.toLocaleString("en-IN")}
                    </strong>
                    <span className="text-[10px] text-slate-400 block truncate">
                      per month gross
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800">
                    <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      Total Salary Hike
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-200 block truncate">
                      +{calculatedIncrement().hikePercentage}%
                    </strong>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
                      Hike Authorized
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Rating Benchmark */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Performance Rating Benchmark
                </label>
                <select
                  value={formData.performance_rating}
                  onChange={(e) =>
                    setFormData({ ...formData, performance_rating: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="5.0 / 5.0 (Trailblazer / Outstanding Performer)">
                    5.0 / 5.0 (Trailblazer / Outstanding Performer)
                  </option>
                  <option value="4.8 / 5.0 (Exceeds Expectations)">
                    4.8 / 5.0 (Exceeds Expectations)
                  </option>
                  <option value="4.5 / 5.0 (Strong & Consistent Achiever)">
                    4.5 / 5.0 (Strong & Consistent Achiever)
                  </option>
                  <option value="4.0 / 5.0 (Meets Core Expectations)">
                    4.0 / 5.0 (Meets Core Expectations)
                  </option>
                </select>
              </div>

              {/* Justification & Impact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Promotion Justification & Key Achievements <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail project deliveries, leadership impact, revenue achievements, or milestone successes..."
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                >
                  {submittingAction ? (
                    <LuRotateCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <LuSend className="h-4 w-4" />
                  )}
                  <span>Submit Promotion Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. REVIEW & APPROVAL MODAL                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showReviewModal && selectedPromotionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in text-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuShieldCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Review & Authorize Promotion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Snapshot */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {selectedPromotionForReview.employee_name} ({selectedPromotionForReview.employee_id})
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTypeBadge(selectedPromotionForReview.promotion_type)}`}>
                    {selectedPromotionForReview.promotion_type}
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Current: <strong>{selectedPromotionForReview.current_designation}</strong> ({selectedPromotionForReview.current_grade_code})
                </div>
                <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  Promoting to: <strong>{selectedPromotionForReview.target_designation}</strong> ({selectedPromotionForReview.target_grade_code})
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  Revised Compensation: {formatINR(selectedPromotionForReview.revised_salary)} (+{parseFloat(selectedPromotionForReview.increment_percentage).toFixed(1)}% Hike)
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workflow Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction("Approved")}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition ${reviewAction === "Approved"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    <LuCheck className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("Deferred")}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition ${reviewAction === "Deferred"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    <LuClock className="h-3.5 w-3.5" />
                    <span>Defer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("Rejected")}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition ${reviewAction === "Rejected"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    <LuCircleX className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Sync Employee Profile Checkbox */}
              {reviewAction === "Approved" && (
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="syncProfilePrm"
                    checked={syncEmployeeRecord}
                    onChange={(e) => setSyncEmployeeRecord(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="syncProfilePrm" className="cursor-pointer">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Sync to Employee Master Record
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Automatically upgrade employee's Designation, Grade, and Salary in the live company directory.
                    </span>
                  </label>
                </div>
              )}

              {/* Remarks or Rejection Reason */}
              {reviewAction === "Rejected" ? (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rejection Feedback / Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason or guidance for the employee..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Approval Directives & Congratulatory Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="e.g. Approved by CHRO and Executive Board in recognition of exemplary deliveries..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingAction}
                  className={`px-5 py-2 rounded-lg font-bold text-white transition shadow-sm ${reviewAction === "Approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : reviewAction === "Deferred"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                >
                  {submittingAction ? "Processing..." : `Confirm ${reviewAction}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. OFFICIAL PROMOTION LETTER PREVIEW & PRINT MODAL          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showLetterModal && selectedPromotionForLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-fade-in">
            {/* Modal Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 print:hidden">
              <div className="flex items-center gap-2">
                <LuFileText className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Official Promotion Order Preview • {selectedPromotionForLetter.promotion_code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                >
                  <LuPrinter className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedPromotionForLetter)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  <LuDownload className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLetterModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Letter Body (Printable) */}
            <div className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto scrollbar-thin bg-white text-slate-800 font-sans print:p-0 print:m-0 print:overflow-visible">
              {/* Header Banner */}
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                  Zentelex Software & Technology Pvt. Ltd.
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Sector V, Bidhannagar, Kolkata, West Bengal - 700091 • Email: hr@zentelex.com
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  CIN: U72200WB2020PTC239871 • Official Career Advancement & Compensation Order
                </p>
              </div>

              {/* Ref No & Date */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold my-5">
                <span>Ref: {selectedPromotionForLetter.letter_ref_no || `ZEN/HR/PRM/${new Date().getFullYear()}/${selectedPromotionForLetter.id}`}</span>
                <span>Date: {formatDateStr(selectedPromotionForLetter.letter_issue_date || new Date())}</span>
              </div>

              {/* Addressed To */}
              <div className="text-xs space-y-0.5 text-slate-800 mb-6">
                <p className="font-semibold">To,</p>
                <p className="font-bold text-sm text-slate-900">{selectedPromotionForLetter.employee_name}</p>
                <p>Employee Code: <span className="font-mono">{selectedPromotionForLetter.employee_id}</span></p>
                <p>Current Designation: {selectedPromotionForLetter.current_designation || "Staff"}</p>
                <p>Department: {selectedPromotionForLetter.department || "General"}</p>
              </div>

              {/* Subject */}
              <div className="text-center font-extrabold text-xs sm:text-sm uppercase tracking-wide text-slate-900 py-2 border-y border-slate-300 my-4 bg-slate-50">
                SUBJECT: OFFICIAL LETTER OF PROMOTION & COMPENSATION REVISION
              </div>

              {/* Opening Salutation */}
              <div className="text-xs text-slate-700 leading-relaxed space-y-3 my-4">
                <p>Dear {selectedPromotionForLetter.employee_name},</p>
                <p>
                  On behalf of the Management and the Board of Directors of Zentelex Software & Technology Pvt. Ltd., we take immense pleasure in congratulating you on your well-deserved promotion. In recognition of your consistent excellence, high-impact contributions, and proven leadership, the Management is pleased to elevate your role and revise your compensation effective from <strong>{formatDateStr(selectedPromotionForLetter.effective_date)}</strong>. Your advanced appointment parameters are detailed below:
                </p>
              </div>

              {/* Summary Table */}
              <div className="my-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-2 px-3 text-slate-600 w-1/3">Advancement Category</td>
                      <td className="py-2 px-3 text-slate-900">{selectedPromotionForLetter.promotion_type}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Promoted Designation</td>
                      <td className="py-2 px-3 font-bold text-indigo-700 text-sm">{selectedPromotionForLetter.target_designation}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-600">Job Grade & Band Progression</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {selectedPromotionForLetter.current_grade_code || "L2"} (Rank {selectedPromotionForLetter.current_rank_level || 2}) → {selectedPromotionForLetter.target_grade_code || "L3"} (Rank {selectedPromotionForLetter.target_rank_level || 3})
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Department / Vertical</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{selectedPromotionForLetter.department}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-600">Effective Date</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{formatDateStr(selectedPromotionForLetter.effective_date)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Performance Assessment</td>
                      <td className="py-2 px-3 font-semibold text-emerald-700">{selectedPromotionForLetter.performance_rating || "Exceeds Expectations"}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-600">Previous Annual Compensation</td>
                      <td className="py-2 px-3 text-slate-700">{formatINR(selectedPromotionForLetter.current_salary)} / yr</td>
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="py-2 px-3 font-bold text-emerald-800">Revised Annual Compensation (CTC)</td>
                      <td className="py-2 px-3 font-extrabold text-emerald-900 text-sm">{formatINR(selectedPromotionForLetter.revised_salary)} / yr</td>
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="py-2 px-3 font-semibold text-emerald-800">Increment Hike</td>
                      <td className="py-2 px-3 font-bold text-emerald-900">
                        +{formatINR(selectedPromotionForLetter.increment_amount)} (+{parseFloat(selectedPromotionForLetter.increment_percentage || 0).toFixed(1)}%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms and Clauses */}
              <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed my-5">
                <div>
                  <strong className="text-slate-900 block mb-0.5">1. Expanded Accountabilities & Leadership</strong>
                  <p>With this advancement, you are expected to take full ownership of strategic initiatives, provide inspirational leadership, and actively drive organizational key results.</p>
                </div>
                <div>
                  <strong className="text-slate-900 block mb-0.5">2. Compensation & Statutory Alignment</strong>
                  <p>Your revised compensation will be effective from {formatDateStr(selectedPromotionForLetter.effective_date)} and will be disbursed in accordance with corporate payroll guidelines and applicable tax deductions.</p>
                </div>
                <div>
                  <strong className="text-slate-900 block mb-0.5">3. Service Continuity</strong>
                  <p>All other employment terms, code of conduct obligations, and unbroken continuity of service remain in full effect.</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 mt-6 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <p className="text-slate-600 mb-6">Yours sincerely,<br /><strong>For Zentelex Software & Technology Pvt. Ltd.</strong></p>
                  <div className="pt-4">
                    <p className="font-extrabold text-slate-900">{selectedPromotionForLetter.letter_signatory_name || "Priyanka Mukherjee"}</p>
                    <p className="text-slate-600 text-[11px]">{selectedPromotionForLetter.letter_signatory_title || "CHRO & VP - Human Resources"}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-slate-600 mb-6">Employee Acceptance & Acknowledgement:</p>
                  <div className="pt-4 text-slate-700 text-[11px] space-y-1">
                    <p>Signature: _________________________</p>
                    <p>Name: {selectedPromotionForLetter.employee_name}</p>
                    <p>Date:    _________________________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

