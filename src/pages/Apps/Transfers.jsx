import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  LuArrowLeftRight,
  LuBuilding2,
  LuMapPin,
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
  LuCircleAlert,
  LuBadgeCheck,
  LuRotateCw,
  LuTrash2,
  LuFileCheck,
  LuUsers,
  LuTrendingUp,
  LuCircleX,
} from "react-icons/lu";
import api from "../../api/axios";
import {
  getAuthRole,
  getAuthUser,
  getAuthToken,
  isLeadershipDesignation,
  isDepartmentHeadOrManager,
} from "../../utils/auth";
import {
  generateTransferLetterPDF,
  formatINR,
  formatDateStr,
} from "../../utils/transferLetterGenerator";

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    effective: 0,
    rejected: 0,
    inter_departmental: 0,
    branch_transfer: 0,
    deputation: 0,
    role_reassignment: 0,
    letters_issued: 0,
  });
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({
    employees: [],
    departments: [],
    designations: [],
    branches: [],
    transferTypes: [],
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [selectedTransferForLetter, setSelectedTransferForLetter] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTransferForReview, setSelectedTransferForReview] = useState(null);
  const [reviewAction, setReviewAction] = useState("Approved"); // "Approved", "Rejected", "Effective"
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [syncEmployeeRecord, setSyncEmployeeRecord] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Handover Modal
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [selectedTransferForHandover, setSelectedTransferForHandover] = useState(null);
  const [handoverStatus, setHandoverStatus] = useState("Pending");
  const [handoverNotes, setHandoverNotes] = useState("");

  // Initiate Form State
  const initialFormState = {
    employee_id: "",
    transfer_type: "Inter-Departmental",
    target_department: "",
    target_branch: "",
    target_designation: "",
    target_reporting_manager: "",
    revised_salary: "",
    deputation_allowance: "",
    relocation_allowance: "",
    effective_date: "",
    deputation_start_date: "",
    deputation_end_date: "",
    reason: "",
    remarks: "",
  };
  const [formData, setFormData] = useState(initialFormState);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState(null);

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
      const res = await api.get("/transfers/metadata");
      if (res.data?.success && res.data?.data) {
        setMetadata(res.data.data);
      }
    } catch (err) {
      console.warn("Error fetching transfer metadata:", err.message);
    }
  };

  // 2. Fetch Transfers
  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "All") params.status = statusFilter;
      if (typeFilter !== "All") params.type = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/transfers", { params });
      if (res.data?.success) {
        setTransfers(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
      toast.error("Failed to load transfers list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter, typeFilter, searchQuery]);

  // Handle Employee Selection in Initiate Form
  const handleSelectEmployee = (empId) => {
    const emp = metadata.employees.find((e) => e.id === empId);
    if (emp) {
      setSelectedEmployeeProfile(emp);
      setFormData((prev) => ({
        ...prev,
        employee_id: emp.id,
        target_department: emp.dept,
        target_branch: emp.branch,
        target_designation: emp.designation,
        target_reporting_manager: emp.reporting_manager,
      }));
    } else {
      setSelectedEmployeeProfile(null);
      setFormData((prev) => ({ ...prev, employee_id: empId }));
    }
  };

  // Submit Initiate Transfer
  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.effective_date) {
      toast.error("Please select the effective date");
      return;
    }
    if (
      formData.transfer_type === "Deputation" &&
      (!formData.deputation_start_date || !formData.deputation_end_date)
    ) {
      toast.error("Please enter deputation start and end dates");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.post("/transfers", formData);
      if (res.data?.success) {
        toast.success(res.data.message || "Transfer initiated successfully!");
        setShowInitiateModal(false);
        setFormData(initialFormState);
        setSelectedEmployeeProfile(null);
        fetchTransfers();
      }
    } catch (err) {
      console.error("Initiate transfer error:", err);
      toast.error(err.response?.data?.message || "Failed to initiate transfer");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Review (Approve / Reject / Mark Effective)
  const handleSubmitReview = async () => {
    if (!selectedTransferForReview) return;
    if (reviewAction === "Rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await api.put(
        `/transfers/${selectedTransferForReview.id}/status`,
        {
          status: reviewAction,
          remarks: reviewRemarks,
          rejection_reason: rejectionReason,
          apply_to_employee: syncEmployeeRecord,
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Transfer status updated successfully!");
        setShowReviewModal(false);
        setSelectedTransferForReview(null);
        setReviewRemarks("");
        setRejectionReason("");
        fetchTransfers();
      }
    } catch (err) {
      console.error("Review transfer error:", err);
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Handover Update
  const handleSubmitHandover = async () => {
    if (!selectedTransferForHandover) return;
    try {
      setSubmittingAction(true);
      const res = await api.put(
        `/transfers/${selectedTransferForHandover.id}/handover`,
        {
          handover_status: handoverStatus,
          handover_notes: handoverNotes,
        }
      );
      if (res.data?.success) {
        toast.success("Handover details saved successfully!");
        setShowHandoverModal(false);
        setSelectedTransferForHandover(null);
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update handover");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete Transfer
  const handleDeleteTransfer = async (id, code) => {
    try {
      const res = await api.delete(`/transfers/${id}`);
      if (res.data?.success) {
        toast.success(`Transfer ${code} cancelled successfully`);
        fetchTransfers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete transfer");
    }
  };

  // Handle PDF Download
  const handleDownloadPDF = (trf) => {
    try {
      const doc = generateTransferLetterPDF(trf, {
        name: "Zentelex Pvt. Ltd.",
        address: "Harmony heaven, 27 Rajdanga, FB, Main Road, near Purba, G.D Block, Kolkata, West Bengal 700107",
        email: "hr@zentelex.com",
      });
      doc.save(`Transfer_Letter_${trf.transfer_code || "ZEN"}.pdf`);
      toast.success("Official Transfer Letter PDF downloaded!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate PDF document");
    }
  };

  // Trigger Letter Print
  const handlePrintLetter = () => {
    window.print();
  };

  // Badges & styling helpers
  const getTypeBadge = (type) => {
    switch (type) {
      case "Inter-Departmental":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
      case "Branch Transfer":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      case "Deputation":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Role Reassignment":
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
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 bg-slate-50 dark:bg-slate-950 space-y-6">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER SECTION                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <LuArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Transfers & Deputation Workflow
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Employee Service & Lifecycle Management • Inter-Departmental Mobility, Branch Transfers, Deputation & Letter Issuance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTransfers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh list"
          >
            <LuRotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <LuPlus className="h-4 w-4" />
              <span>Initiate Transfer / Deputation</span>
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
            label: "Total Transfers",
            val: stats.total,
            icon: <LuArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
            badge: "All Movements",
            bg: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40",
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
            label: "Inter-Department",
            val: stats.inter_departmental,
            icon: <LuBuilding2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
            badge: "Dept Mobility",
            bg: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40",
          },
          {
            label: "Branch Transfers",
            val: stats.branch_transfer,
            icon: <LuMapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
            badge: "Relocations",
            bg: "bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/40",
          },
          {
            label: "Active Deputations",
            val: stats.deputation,
            icon: <LuBriefcase className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
            badge: "Fixed Tenure",
            bg: "bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/40",
          },
          {
            label: "Letters Issued",
            val: stats.letters_issued,
            icon: <LuFileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
            badge: "Official Orders",
            bg: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
            valColor: "text-emerald-600 dark:text-emerald-400",
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
              <span className={`text-xl font-extrabold ${card.valColor || "text-slate-900 dark:text-slate-100"}`}>
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
              placeholder="Search by employee, code, department, branch, or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {/* Transfer Type Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Inter-Departmental">Inter-Departmental</option>
              <option value="Branch Transfer">Branch Transfer</option>
              <option value="Deputation">Deputation</option>
              <option value="Role Reassignment">Role Reassignment</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Effective">Effective (Applied)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. MAIN TRANSFERS DATA TABLE                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {loading && transfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="flex items-center justify-center">
              <LuRotateCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Loading transfer & deputation workflows...
            </p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
              <LuArrowLeftRight className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No transfer records found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "All" || typeFilter !== "All"
                ? "No transfer workflows match your selected filters. Try resetting the search or filter pills."
                : "No employee transfers or deputations have been initiated yet."}
            </p>
            {isLeadOrManager && (
              <button
                type="button"
                onClick={() => {
                  setFormData(initialFormState);
                  setSelectedEmployeeProfile(null);
                  setShowInitiateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <LuPlus className="h-3.5 w-3.5" />
                <span>Initiate First Transfer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-full text-left text-xs border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4 whitespace-nowrap">Employee</th>
                  <th className="py-3 px-3 whitespace-nowrap">Movement Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Current Unit</th>
                  <th className="py-3 px-4 whitespace-nowrap">Target Re-Assignment</th>
                  <th className="py-3 px-3 whitespace-nowrap">Effective Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Handover</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions & Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap"
                  >
                    {/* Employee Profile */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
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
                            {item.employee_id} • {item.transfer_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Movement Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getTypeBadge(
                          item.transfer_type
                        )}`}
                      >
                        {item.transfer_type === "Deputation" && (
                          <LuBriefcase className="h-3 w-3" />
                        )}
                        {item.transfer_type === "Branch Transfer" && (
                          <LuMapPin className="h-3 w-3" />
                        )}
                        {item.transfer_type === "Inter-Departmental" && (
                          <LuBuilding2 className="h-3 w-3" />
                        )}
                        <span>{item.transfer_type}</span>
                      </span>
                    </td>

                    {/* Current Unit */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.current_department || "General"}
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap">
                        {item.current_designation} • {item.current_branch}
                      </div>
                    </td>

                    {/* Target Re-Assignment */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {item.target_department || item.current_department}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.target_designation || item.current_designation} •{" "}
                        {item.target_branch || item.current_branch}
                      </div>
                      {item.target_reporting_manager && (
                        <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                          Reporting: {item.target_reporting_manager}
                        </div>
                      )}
                    </td>

                    {/* Effective Date & Tenure */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDateStr(item.effective_date)}
                      </div>
                      {item.transfer_type === "Deputation" &&
                        item.deputation_end_date && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            Until {formatDateStr(item.deputation_end_date)}
                          </div>
                        )}
                    </td>

                    {/* Workflow Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status === "Approved" && (
                          <LuCheck className="h-3 w-3" />
                        )}
                        {item.status === "Pending" && (
                          <LuClock className="h-3 w-3" />
                        )}
                        {item.status === "Effective" && (
                          <LuBadgeCheck className="h-3 w-3" />
                        )}
                        {item.status === "Rejected" && (
                          <LuCircleX className="h-3 w-3" />
                        )}
                        <span>{item.status}</span>
                      </span>
                      {item.sync_employee_record && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium whitespace-nowrap">
                          ✓ Synced to Profile
                        </div>
                      )}
                    </td>

                    {/* Handover Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransferForHandover(item);
                          setHandoverStatus(item.handover_status || "Pending");
                          setHandoverNotes(item.handover_notes || "");
                          setShowHandoverModal(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition whitespace-nowrap ${
                          item.handover_status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : item.handover_status === "In Progress"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                        title="Click to view/update handover protocol"
                      >
                        <span>{item.handover_status || "Pending"}</span>
                      </button>
                    </td>

                    {/* Actions & Letter Generation */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end whitespace-nowrap flex-nowrap">
                        {/* Letter View/Print */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTransferForLetter(item);
                            setShowLetterModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Preview & Print Official Transfer Letter"
                        >
                          <LuFileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="hidden sm:inline">Letter</span>
                        </button>

                        {/* PDF Download Direct */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(item)}
                          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Download PDF Letter"
                        >
                          <LuDownload className="h-3.5 w-3.5" />
                        </button>

                        {/* Review / Status Update for HR/Privileged */}
                        {isPrivileged && item.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransferForReview(item);
                              setReviewAction("Approved");
                              setReviewRemarks("");
                              setRejectionReason("");
                              setSyncEmployeeRecord(true);
                              setShowReviewModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                            title="Review & Finalize Transfer"
                          >
                            <LuCheck className="h-3.5 w-3.5" />
                            <span>Review</span>
                          </button>
                        )}

                        {/* Mark Effective button if Approved but not yet Effective */}
                        {isPrivileged && item.status === "Approved" && !item.sync_employee_record && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransferForReview(item);
                              setReviewAction("Effective");
                              setReviewRemarks("Transfer activated and profile synchronized.");
                              setSyncEmployeeRecord(true);
                              setShowReviewModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                            title="Apply to Employee Profile"
                          >
                            <LuBadgeCheck className="h-3 w-3" />
                            <span>Apply</span>
                          </button>
                        )}

                        {/* Cancel/Delete Draft if pending */}
                        {isPrivileged && item.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTransfer(item.id, item.transfer_code)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Cancel Request"
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
    </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. INITIATE TRANSFER / DEPUTATION MODAL                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                  <LuArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Initiate Transfer or Deputation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Department re-assignment, branch mobility, or fixed-term deputation
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

            {/* Form */}
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">-- Choose Employee --</option>
                  {metadata.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) • {emp.dept} • {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Employee Info Snapshot */}
              {selectedEmployeeProfile && (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Current Dept</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedEmployeeProfile.dept}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Current Base</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedEmployeeProfile.branch}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Designation</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedEmployeeProfile.designation}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Manager</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedEmployeeProfile.reporting_manager}</strong>
                  </div>
                </div>
              )}

              {/* Movement Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Movement Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.transfer_type}
                    onChange={(e) =>
                      setFormData({ ...formData, transfer_type: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Inter-Departmental">Inter-Departmental Transfer</option>
                    <option value="Branch Transfer">Branch / Location Transfer</option>
                    <option value="Deputation">Deputation (Fixed-Term Assignment)</option>
                    <option value="Role Reassignment">Role / Designation Reassignment</option>
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Target Department & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Department <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="target_dept_options"
                    value={formData.target_department}
                    onChange={(e) =>
                      setFormData({ ...formData, target_department: e.target.value })
                    }
                    placeholder="e.g. Strategic Projects & PMO"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="target_dept_options">
                    {metadata.departments.map((d, i) => (
                      <option key={i} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Branch / Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="target_branch_options"
                    value={formData.target_branch}
                    onChange={(e) =>
                      setFormData({ ...formData, target_branch: e.target.value })
                    }
                    placeholder="e.g. Bangalore Tech Center"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="target_branch_options">
                    {metadata.branches.map((b, i) => (
                      <option key={i} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Target Designation & Target Reporting Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Designation / Title
                  </label>
                  <input
                    type="text"
                    list="target_desig_options"
                    value={formData.target_designation}
                    onChange={(e) =>
                      setFormData({ ...formData, target_designation: e.target.value })
                    }
                    placeholder="e.g. Lead Solutions Architect"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="target_desig_options">
                    {metadata.designations.map((desig, i) => (
                      <option key={i} value={desig} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Reporting Manager
                  </label>
                  <input
                    type="text"
                    value={formData.target_reporting_manager}
                    onChange={(e) =>
                      setFormData({ ...formData, target_reporting_manager: e.target.value })
                    }
                    placeholder="e.g. Siddharth Roy (VP Engineering)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Deputation Specific Dates & Allowances */}
              {formData.transfer_type === "Deputation" && (
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <LuBriefcase className="h-4 w-4" />
                    <span>Deputation Tenure & Allowance Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.deputation_start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, deputation_start_date: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.deputation_end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, deputation_end_date: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Deputation Allowance (₹/mo)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        value={formData.deputation_allowance}
                        onChange={(e) =>
                          setFormData({ ...formData, deputation_allowance: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Branch Relocation Allowance */}
              {formData.transfer_type === "Branch Transfer" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      One-Time Relocation Allowance (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 40000"
                      value={formData.relocation_allowance}
                      onChange={(e) =>
                        setFormData({ ...formData, relocation_allowance: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Revised Annual CTC (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1500000"
                      value={formData.revised_salary}
                      onChange={(e) =>
                        setFormData({ ...formData, revised_salary: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Justification & Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Justification / Business Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail the operational, project, or personal reasons supporting this transfer/deputation..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer Buttons */}
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
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                >
                  {submittingAction ? (
                    <LuRotateCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <LuSend className="h-4 w-4" />
                  )}
                  <span>Submit Transfer Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. REVIEW & APPROVAL MODAL                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showReviewModal && selectedTransferForReview && (
        <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Review Transfer Workflow
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

            <div className="p-4 sm:p-6 space-y-4 text-xs">
              {/* Snapshot */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {selectedTransferForReview.employee_name} ({selectedTransferForReview.employee_id})
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTypeBadge(selectedTransferForReview.transfer_type)}`}>
                    {selectedTransferForReview.transfer_type}
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  From: <strong>{selectedTransferForReview.current_department}</strong> ({selectedTransferForReview.current_branch})
                </div>
                <div className="text-blue-600 dark:text-blue-400 font-semibold">
                  To: <strong>{selectedTransferForReview.target_department}</strong> ({selectedTransferForReview.target_branch})
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Effective: {formatDateStr(selectedTransferForReview.effective_date)}
                </div>
              </div>

              {/* Action Radios */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workflow Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction("Approved")}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "Approved"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <LuCheck className="h-4 w-4" />
                    <span>Approve Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("Rejected")}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "Rejected"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <LuCircleX className="h-4 w-4" />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>

              {/* Sync Employee Profile Checkbox */}
              {reviewAction === "Approved" && (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="syncProfile"
                    checked={syncEmployeeRecord}
                    onChange={(e) => setSyncEmployeeRecord(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="syncProfile" className="cursor-pointer">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Sync Employee Master Record
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Automatically update employee's Department, Branch, Designation & Manager in the company employee directory immediately.
                    </span>
                  </label>
                </div>
              )}

              {/* Remarks or Rejection Reason */}
              {reviewAction === "Rejected" ? (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejecting this transfer order..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Approval Remarks / Special Directives (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="e.g. Approved by CHRO. Transition team to coordinate laptop and badge..."
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
                  className={`px-5 py-2 rounded-lg font-bold text-white transition shadow-sm ${
                    reviewAction === "Approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
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
      {/* 7. HANDOVER MODAL                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showHandoverModal && selectedTransferForHandover && (
        <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <LuFileCheck className="h-4 w-4 text-blue-600" />
                Handover & Transition Checklist
              </h3>
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Handover Status
              </label>
              <select
                value={handoverStatus}
                onChange={(e) => setHandoverStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Pending">Pending (Not Started)</option>
                <option value="In Progress">In Progress (Tasks Underway)</option>
                <option value="Completed">Completed (All Handed Over)</option>
                <option value="Waived">Waived (Direct Internal Movement)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Handover Notes & Asset Reconciliation
              </label>
              <textarea
                rows={3}
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Log notes about code repositories, key project handoffs, access cards, or hardware handovers..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmitHandover}
                disabled={submittingAction}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
              >
                Save Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 8. OFFICIAL TRANSFER LETTER PREVIEW & PRINT MODAL           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showLetterModal && selectedTransferForLetter && (
        <div className="fixed inset-0 z-[100] m-0 !mt-0 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-fade-in">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 print:hidden">
              <div className="flex items-center gap-2">
                <LuFileText className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Official Transfer Order Preview • {selectedTransferForLetter.transfer_code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                  title="Print official letter"
                >
                  <LuPrinter className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedTransferForLetter)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                  title="Download PDF"
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

            {/* Letterhead & Letter Body (Printable Area) */}
            <div className="p-6 sm:p-10 max-h-[80vh] overflow-y-auto scrollbar-thin bg-white text-slate-800 font-sans print:p-0 print:m-0 print:overflow-visible">
              {/* Corporate Banner Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                  Zentelex Pvt. Ltd.
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Harmony heaven, 27 Rajdanga, FB, Main Road, near Purba, G.D Block, Kolkata, West Bengal 700107 • Email: hr@zentelex.com
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  CIN: U62099WB2025PTC277267 • Official Service & Lifecycle Order
                </p>
              </div>

              {/* Ref No & Date */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold my-5">
                <span>Ref: {selectedTransferForLetter.letter_ref_no || `ZEN/HR/TRF/${new Date().getFullYear()}/${selectedTransferForLetter.id}`}</span>
                <span>Date: {formatDateStr(selectedTransferForLetter.letter_issue_date || new Date())}</span>
              </div>

              {/* Addressed To */}
              <div className="text-xs space-y-0.5 text-slate-800 mb-6">
                <p className="font-semibold">To,</p>
                <p className="font-bold text-sm text-slate-900">{selectedTransferForLetter.employee_name}</p>
                <p>Employee Code: <span className="font-mono">{selectedTransferForLetter.employee_id}</span></p>
                <p>Current Designation: {selectedTransferForLetter.current_designation || "Staff"}</p>
                <p>Current Department: {selectedTransferForLetter.current_department || "General"}</p>
                <p>Current Work Location: {selectedTransferForLetter.current_branch || "Kolkata HQ"}</p>
              </div>

              {/* Subject */}
              <div className="text-center font-extrabold text-xs sm:text-sm uppercase tracking-wide text-slate-900 py-2 border-y border-slate-300 my-4 bg-slate-50">
                {selectedTransferForLetter.transfer_type === "Deputation"
                  ? "SUBJECT: OFFICIAL ORDER OF DEPUTATION & PROJECT ASSIGNMENT"
                  : `SUBJECT: OFFICIAL LETTER OF ${String(selectedTransferForLetter.transfer_type || "TRANSFER").toUpperCase()} & RE-ASSIGNMENT`}
              </div>

              {/* Opening Salutation */}
              <div className="text-xs text-slate-700 leading-relaxed space-y-3 my-4">
                <p>Dear {selectedTransferForLetter.employee_name},</p>
                <p>
                  {selectedTransferForLetter.transfer_type === "Deputation"
                    ? `We are pleased to inform you that in view of strategic requirements, you are being placed on Deputation to ${selectedTransferForLetter.target_department || "the target unit"} at ${selectedTransferForLetter.target_branch || "the specified location"}, effective from ${formatDateStr(selectedTransferForLetter.effective_date)}. The terms and conditions governing your deputation assignment are set out below:`
                    : `In accordance with the organization's operational alignment and business growth plans, the Management is pleased to confirm your ${selectedTransferForLetter.transfer_type} to ${selectedTransferForLetter.target_department || "the target unit"} at ${selectedTransferForLetter.target_branch || "the target branch"}, with effect from ${formatDateStr(selectedTransferForLetter.effective_date)}. Your re-assignment particulars are detailed below:`}
                </p>
              </div>

              {/* Structured Table of Terms */}
              <div className="my-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-2 px-3 text-slate-600 w-1/3">Assignment Type</td>
                      <td className="py-2 px-3 text-slate-900">{selectedTransferForLetter.transfer_type}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Effective Date</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{formatDateStr(selectedTransferForLetter.effective_date)}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-600">Target Department</td>
                      <td className="py-2 px-3 font-bold text-blue-700">{selectedTransferForLetter.target_department}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Designation / Role</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{selectedTransferForLetter.target_designation || selectedTransferForLetter.current_designation}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-600">Assigned Branch / Location</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{selectedTransferForLetter.target_branch}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Reporting Line Manager</td>
                      <td className="py-2 px-3 text-slate-900">{selectedTransferForLetter.target_reporting_manager || "Designated Department Head"}</td>
                    </tr>
                    {selectedTransferForLetter.transfer_type === "Deputation" && selectedTransferForLetter.deputation_end_date && (
                      <tr className="bg-amber-50">
                        <td className="py-2 px-3 font-semibold text-amber-800">Deputation Tenure</td>
                        <td className="py-2 px-3 font-bold text-amber-900">
                          {formatDateStr(selectedTransferForLetter.deputation_start_date || selectedTransferForLetter.effective_date)} to {formatDateStr(selectedTransferForLetter.deputation_end_date)}
                        </td>
                      </tr>
                    )}
                    {parseFloat(selectedTransferForLetter.deputation_allowance) > 0 && (
                      <tr className="bg-amber-50">
                        <td className="py-2 px-3 font-semibold text-amber-800">Monthly Deputation Allowance</td>
                        <td className="py-2 px-3 font-bold text-amber-900">{formatINR(selectedTransferForLetter.deputation_allowance)}</td>
                      </tr>
                    )}
                    {parseFloat(selectedTransferForLetter.relocation_allowance) > 0 && (
                      <tr className="bg-blue-50">
                        <td className="py-2 px-3 font-semibold text-blue-800">One-Time Relocation Allowance</td>
                        <td className="py-2 px-3 font-bold text-blue-900">{formatINR(selectedTransferForLetter.relocation_allowance)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Terms and Clauses */}
              <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed my-5">
                <div>
                  <strong className="text-slate-900 block mb-0.5">1. Roles & Core Accountabilities</strong>
                  <p>You will execute the roles and responsibilities assigned to your designated position and report directly to {selectedTransferForLetter.target_reporting_manager || "your Department Head"}. All internal performance metrics will apply in your new assignment.</p>
                </div>
                <div>
                  <strong className="text-slate-900 block mb-0.5">2. Handover & Transition Protocol</strong>
                  <p>You are required to complete full knowledge transfer, repository access handover, and asset reconciliation with your current team lead prior to assuming duty at your new assignment.</p>
                </div>
                <div>
                  <strong className="text-slate-900 block mb-0.5">3. Service Continuity & Seniority</strong>
                  <p>This movement causes no break or forfeiture in your seniority, accumulated leaves, or organizational tenure. All accrued employee benefits remain in full effect.</p>
                </div>
              </div>

              {/* Closing & Signatures */}
              <div className="pt-6 border-t border-slate-200 mt-6 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <p className="text-slate-600 mb-6">Yours sincerely,<br /><strong>Zentelex Pvt. Ltd.</strong></p>
                  <div className="pt-4">
                    <p className="font-extrabold text-slate-900">{selectedTransferForLetter.letter_signatory_name || "Priyanka Mukherjee"}</p>
                    <p className="text-slate-600 text-[11px]">{selectedTransferForLetter.letter_signatory_title || "CHRO & VP - Human Resources"}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-slate-600 mb-6">Employee Acceptance & Acknowledgement:</p>
                  <div className="pt-4 text-slate-700 text-[11px] space-y-1">
                    <p>Signature: _________________________</p>
                    <p>Name: {selectedTransferForLetter.employee_name}</p>
                    <p>Date:    _________________________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

