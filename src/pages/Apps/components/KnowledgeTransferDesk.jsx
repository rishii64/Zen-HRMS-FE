import React, { useState, useEffect, useMemo } from "react";
import {
  FiCheck,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiRefreshCw,
  FiStar,
  FiUser,
  FiCalendar,
  FiFileText,
  FiSearch,
  FiFilter,
  FiShield,
  FiAward,
  FiX
} from "react-icons/fi";
import {
  LuBookOpen,
  LuCheckCheck,
  LuClipboardCheck,
  LuShieldCheck,
  LuSparkles,
  LuLayers,
  LuFolderGit2,
  LuKeyRound,
  LuFileSpreadsheet,
  LuUsers,
  LuListTodo
} from "react-icons/lu";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "../../../api/axios";

const API = getApiBaseUrl();

// Pre-defined Categories with distinct color themes
const KT_CATEGORIES = [
  { key: "Codebase & Systems", label: "Codebase & Systems", icon: LuFolderGit2, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "Credentials & Access", label: "Credentials & Access", icon: LuKeyRound, color: "text-rose-600 bg-rose-50 border-rose-200" },
  { key: "Documentation & SOPs", label: "Documentation & SOPs", icon: LuBookOpen, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "Client / Vendor Relations", label: "Client / Vendor Relations", icon: LuUsers, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "In-Flight Tasks & Deliverables", label: "In-Flight Tasks & Deliverables", icon: LuListTodo, color: "text-purple-600 bg-purple-50 border-purple-200" }
];

const KT_PRIORITIES = ["Critical", "High", "Medium", "Low"];

const RATING_DESCRIPTIONS = {
  1: "Inadequate – Significant knowledge gaps remain",
  2: "Basic – Requires additional documentation or guidance",
  3: "Satisfactory – Core responsibilities understood",
  4: "Good – Confident in executing independent work",
  5: "Exceptional – Comprehensive mastery and complete transfer"
};

export default function KnowledgeTransferDesk({
  token,
  currentUser = {},
  resignations = [],
  myResignation = null,
  assignedHandovers = [],
  onRefresh = () => {},
  selectedResignationId = null,
  isModalView = false,
  onCloseModal = () => {}
}) {
  const currentEmpId = (currentUser.employee_id || currentUser.id || "").toString().trim().toLowerCase();
  const currentRole = (currentUser.role || "").toLowerCase().trim();
  const isCorporate = ["hr", "hrmanager", "admin", "hod", "manager"].includes(currentRole);

  // Active resignation selection
  const [activeResignationId, setActiveResignationId] = useState(
    selectedResignationId || (myResignation ? myResignation.id : (resignations[0]?.id || null))
  );

  const activeResignation = useMemo(() => {
    if (!activeResignationId) return myResignation || resignations[0] || null;
    if (myResignation && myResignation.id === activeResignationId) return myResignation;
    return resignations.find((r) => r.id === activeResignationId) || myResignation || null;
  }, [activeResignationId, resignations, myResignation]);

  // KT Dossier State
  const [ktDetails, setKtDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Task filtering
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Task Modal / Form State
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "Codebase & Systems",
    priority: "High",
    description: "",
    deliverable_url: "",
    due_date: "",
    notes: ""
  });

  // Inline editing state for Deliverable URL
  const [editingUrlTaskId, setEditingUrlTaskId] = useState(null);
  const [tempUrlValue, setTempUrlValue] = useState("");

  // Recipient Sign-off form state
  const [signoffDecision, setSignoffDecision] = useState("ACCEPT");
  const [signoffRating, setSignoffRating] = useState(5);
  const [signoffFeedback, setSignoffFeedback] = useState("");

  // Manager Verification form state
  const [verificationNotes, setVerificationNotes] = useState("");

  // Format Date Helper
  const formatDate = (val) => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return val;
    }
  };

  // Load KT Details
  const fetchKt = async (resId) => {
    if (!resId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/resignation/${resId}/kt`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load KT details");
      setKtDetails(data.data);
      setSignoffRating(data.data?.kt_recipient_rating || 5);
      setSignoffFeedback(data.data?.kt_recipient_feedback || "");
      setVerificationNotes(data.data?.kt_manager_verification_notes || "");
    } catch (err) {
      toast.error(err.message || "Error loading KT details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeResignationId) {
      fetchKt(activeResignationId);
    }
  }, [activeResignationId]);

  useEffect(() => {
    if (selectedResignationId && selectedResignationId !== activeResignationId) {
      setActiveResignationId(selectedResignationId);
    }
  }, [selectedResignationId]);

  // Filtered Task List
  const tasks = ktDetails?.kt_tasks || [];
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchCat = selectedCategoryFilter === "All" || t.category === selectedCategoryFilter;
      const matchStatus = selectedStatusFilter === "All" || t.status === selectedStatusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [tasks, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Permission Flags
  const isOwner = activeResignation && (activeResignation.employee_id || "").toLowerCase() === currentEmpId;
  const isAssignedRecipient =
    activeResignation &&
    activeResignation.handover_person_id &&
    activeResignation.handover_person_id.toLowerCase() === currentEmpId;
  const isManager =
    activeResignation &&
    activeResignation.manager_id &&
    activeResignation.manager_id.toLowerCase() === currentEmpId;
  const isHod =
    activeResignation &&
    activeResignation.hod_id &&
    activeResignation.hod_id.toLowerCase() === currentEmpId;

  const canEditTasks = ktDetails?.can_manage_tasks ?? (isOwner || isCorporate || isManager);
  const canRecipientSignoff = ktDetails?.can_recipient_signoff ?? (isAssignedRecipient || isCorporate);
  const canManagerVerify = ktDetails?.can_manager_verify ?? (isManager || isHod || isCorporate);

  const isVerified = ktDetails?.kt_status === "VERIFIED" || activeResignation?.handover_status === "CONFIRMED_BY_ASSIGNEE";
  const isRecipientAccepted = ktDetails?.kt_status === "RECIPIENT_ACCEPTED";
  const isSubmitted = ktDetails?.kt_status === "SUBMITTED";
  const isRevisionRequested = ktDetails?.kt_status === "REVISION_REQUESTED";

  // Task Actions
  const handleToggleStatus = async (task) => {
    if (!canEditTasks && !canRecipientSignoff) {
      toast.error("You do not have permission to modify this task");
      return;
    }
    const nextStatus =
      task.status === "Pending" ? "In Progress" : task.status === "In Progress" ? "Completed" : "Pending";
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task status");
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Failed to update task status");
    }
  };

  const handleSaveDeliverableUrl = async (taskId) => {
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ deliverable_url: tempUrlValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save link");
      toast.success("Deliverable link saved!");
      setEditingUrlTaskId(null);
      fetchKt(activeResignationId);
    } catch (err) {
      toast.error(err.message || "Failed to save URL");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to remove this KT task from the checklist?")) return;
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete task");
      toast.success("Task removed from checklist");
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  const handleAddNewTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/tasks/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTask)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add KT task");
      toast.success(data.message || "KT task added successfully!");
      setShowAddTaskModal(false);
      setNewTask({
        title: "",
        category: "Codebase & Systems",
        priority: "High",
        description: "",
        deliverable_url: "",
        due_date: "",
        notes: ""
      });
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Failed to add task");
    } finally {
      setActionProcessing(false);
    }
  };

  const handleResetChecklist = async () => {
    if (!confirm("This will populate the standard 5-point comprehensive KT checklist. Continue?")) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reset_to_default: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize standard checklist");
      toast.success("Standard KT checklist populated!");
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Failed to reset checklist");
    } finally {
      setActionProcessing(false);
    }
  };

  // Submit KT for Recipient Review
  const handleSubmitForSignoff = async () => {
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: "All KT checklist items and deliverables submitted for review." })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit KT for sign-off");
      toast.success(data.message || "Knowledge Transfer submitted to recipient for sign-off!");
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Error submitting KT");
    } finally {
      setActionProcessing(false);
    }
  };

  // Recipient Sign-off
  const handleRecipientSignoff = async (decision) => {
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/recipient-signoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: decision || signoffDecision,
          rating: signoffRating,
          feedback: signoffFeedback
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process recipient sign-off");
      toast.success(data.message || "Recipient sign-off recorded!");
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Error submitting recipient sign-off");
    } finally {
      setActionProcessing(false);
    }
  };

  // Manager Handover Verification
  const handleVerifyHandover = async () => {
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${activeResignationId}/kt/verify-handover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          verification_notes: verificationNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify handover");
      toast.success(data.message || "Handover verified successfully! Department Clearance is unlocked.");
      fetchKt(activeResignationId);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Error verifying handover");
    } finally {
      setActionProcessing(false);
    }
  };

  // Status Badge Helper
  const getKtStatusBadge = (status) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <FiCheckCircle className="w-3.5 h-3.5" />
            Handover Verified ✓
          </span>
        );
      case "RECIPIENT_ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
            <FiCheck className="w-3.5 h-3.5" />
            Recipient Signed Off (Pending Verification)
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <FiClock className="w-3.5 h-3.5" />
            Submitted for Recipient Sign-off
          </span>
        );
      case "REVISION_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <FiAlertCircle className="w-3.5 h-3.5" />
            Revision Requested by Recipient
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <FiClock className="w-3.5 h-3.5" />
            KT In Progress ({ktDetails?.completed_tasks || 0}/{ktDetails?.total_tasks || 0})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <FiClock className="w-3.5 h-3.5" />
            Not Started
          </span>
        );
    }
  };

  // Priority Badge Helper
  const getPriorityBadge = (pri) => {
    switch (pri) {
      case "Critical":
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">Critical</span>;
      case "High":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">High</span>;
      case "Medium":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
  };

  return (
    <div className={`space-y-6 ${isModalView ? "p-1" : ""}`}>
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200 dark:shadow-none shrink-0">
            <LuClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Knowledge Transfer (KT) Tracking Desk
              </h2>
              {ktDetails && getKtStatusBadge(ktDetails.kt_status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Structured KT checklist deliverables, recipient comprehension sign-off, and manager handover verification before clearance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Resignation Selector for Corporate / Managers */}
          {isCorporate && resignations.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Resignation:</label>
              <select
                value={activeResignationId || ""}
                onChange={(e) => setActiveResignationId(Number(e.target.value))}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-blue-500"
              >
                {resignations.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} - {r.name} ({r.employee_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchKt(activeResignationId)}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition text-xs font-bold flex items-center gap-1.5"
            title="Refresh KT data"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main KT Dossier Container */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading Knowledge Transfer dossier...</p>
        </div>
      ) : !ktDetails ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FiAlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Resignation Selected</h3>
          <p className="text-xs text-slate-500 mt-1">Please select an active resignation to view Knowledge Transfer deliverables.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Resignation & Handover Participant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Resigning Employee Card */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Resigning Employee</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 block">
                  {ktDetails.employee_name} ({ktDetails.employee_id})
                </span>
                <span className="text-xs text-slate-500">
                  {ktDetails.dept} • {ktDetails.designation || "Team Member"}
                </span>
              </div>
            </div>

            {/* 2. Handover Recipient Card */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                <LuUsers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned KT Recipient</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 block">
                  {ktDetails.handover_person_name || "Unassigned"} {ktDetails.handover_person_id ? `(${ktDetails.handover_person_id})` : ""}
                </span>
                <span className="text-xs text-slate-500">
                  Target Handover Date: <strong className="text-slate-700 dark:text-slate-300">{formatDate(ktDetails.target_date)}</strong>
                </span>
              </div>
            </div>

            {/* 3. Overall KT Progress & Certification */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KT Checklist Progress</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {ktDetails.progress_percentage}% ({ktDetails.completed_tasks}/{ktDetails.total_tasks} Done)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      ktDetails.progress_percentage === 100
                        ? "bg-emerald-500"
                        : ktDetails.progress_percentage > 50
                        ? "bg-blue-600"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${ktDetails.progress_percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 text-[11px]">
                <span className="text-slate-500">Final Clearance Lock:</span>
                <span className={`font-bold ${isVerified ? "text-emerald-600 flex items-center gap-1" : "text-amber-600 flex items-center gap-1"}`}>
                  {isVerified ? (
                    <>
                      <LuShieldCheck className="w-3.5 h-3.5" />
                      Unlocked ✓
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-3.5 h-3.5" />
                      Blocked until KT Verified
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* HANDOVER VERIFIED STATUS BANNER (When Handover is Verified by Manager) */}
          {isVerified && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <LuShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                    Handover Verified by Manager
                  </span>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Verified by <strong>{ktDetails.kt_manager_verified_by_name || "Reporting Manager"}</strong> on {formatDate(ktDetails.kt_manager_verified_at)}. Department Clearance (Step 1) is unlocked.
                  </p>
                </div>
              </div>

              {ktDetails.kt_manager_verification_notes && (
                <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-700 dark:text-slate-300">
                  <strong className="text-emerald-900 dark:text-emerald-200">Manager Verification Remarks:</strong> "{ktDetails.kt_manager_verification_notes}"
                </div>
              )}
            </div>
          )}

          {/* RECIPIENT REVISION REQUEST ALERT (If Recipient requested changes) */}
          {isRevisionRequested && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm block">Revisions Requested by Handover Recipient</span>
                <p className="text-amber-800 dark:text-amber-300">
                  {ktDetails.handover_person_name || "The handover recipient"} has reviewed the deliverables and requested updates before granting sign-off:
                </p>
                {ktDetails.kt_recipient_feedback && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">
                    "{ktDetails.kt_recipient_feedback}"
                  </div>
                )}
                <p className="text-[11px] text-amber-700 font-semibold mt-1">
                  Please update the deliverables and resubmit for formal sign-off.
                </p>
              </div>
            </div>
          )}

          {/* KT Task Checklist Management Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            {/* Header & Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LuListTodo className="w-5 h-5 text-blue-600" />
                  Formal KT Task Checklist & Deliverables ({tasks.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Walkthrough repositories, documents, credentials, operational runbooks & active tasks.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEditTasks && !isVerified && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAddTaskModal(true)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                      Add KT Task
                    </button>
                    {tasks.length === 0 && (
                      <button
                        type="button"
                        onClick={handleResetChecklist}
                        disabled={actionProcessing}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
                      >
                        <LuSparkles className="w-3.5 h-3.5" />
                        Quick Populate Checklist
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <FiFilter className="w-3 h-3" />
                  Category:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("All")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    selectedCategoryFilter === "All"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  All ({tasks.length})
                </button>
                {KT_CATEGORIES.map((cat) => {
                  const count = tasks.filter((t) => t.category === cat.key).length;
                  if (count === 0 && selectedCategoryFilter !== cat.key) return null;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        selectedCategoryFilter === cat.key
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed Only</option>
                  <option value="In Progress">In Progress Only</option>
                  <option value="Pending">Pending Only</option>
                </select>
              </div>
            </div>

            {/* Task Items List */}
            {filteredTasks.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <LuClipboardCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No KT tasks found matching your filter</p>
                {tasks.length === 0 && canEditTasks && !isVerified && (
                  <button
                    type="button"
                    onClick={handleResetChecklist}
                    className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                  >
                    Initialize Standard KT Checklist
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task, idx) => {
                  const isDone = task.status === "Completed";
                  const isInProgress = task.status === "In Progress";
                  const catDef = KT_CATEGORIES.find((c) => c.key === task.category) || KT_CATEGORIES[0];
                  const IconComp = catDef.icon || LuFolderGit2;

                  return (
                    <div
                      key={task.id || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isDone
                          ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                          : isInProgress
                          ? "bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40"
                          : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Toggle status tick */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(task)}
                            disabled={isVerified}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 mt-0.5 ${
                              isDone
                                ? "bg-emerald-600 text-white shadow-xs"
                                : isInProgress
                                ? "border-2 border-blue-500 bg-blue-50 text-blue-600"
                                : "border-2 border-slate-300 hover:border-blue-400 bg-white"
                            }`}
                            title={`Status: ${task.status}. Click to cycle status.`}
                          >
                            {isDone ? <FiCheck className="w-4 h-4" /> : isInProgress ? <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> : null}
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold ${isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                                {task.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${catDef.color}`}>
                                <IconComp className="w-3 h-3" />
                                {task.category}
                              </span>
                              {getPriorityBadge(task.priority)}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isInProgress
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>

                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Deliverable Link & Verification URL */}
                            <div className="flex items-center gap-3 pt-1 text-xs">
                              {editingUrlTaskId === task.id ? (
                                <div className="flex items-center gap-2 w-full max-w-md">
                                  <input
                                    type="text"
                                    value={tempUrlValue}
                                    onChange={(e) => setTempUrlValue(e.target.value)}
                                    placeholder="Paste Documentation / Repo link (https://...)"
                                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-full"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveDeliverableUrl(task.id)}
                                    className="px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUrlTaskId(null)}
                                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 shrink-0"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : task.deliverable_url ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] text-slate-400 font-bold">Deliverable URL:</span>
                                  <a
                                    href={task.deliverable_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline max-w-xs truncate"
                                  >
                                    <FiExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{task.deliverable_url}</span>
                                  </a>
                                  {!isVerified && canEditTasks && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUrlTaskId(task.id);
                                        setTempUrlValue(task.deliverable_url);
                                      }}
                                      className="text-slate-400 hover:text-blue-600"
                                      title="Edit link"
                                    >
                                      <FiEdit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                !isVerified && canEditTasks && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingUrlTaskId(task.id);
                                      setTempUrlValue("");
                                    }}
                                    className="text-slate-400 hover:text-blue-600 text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <FiPlus className="w-3 h-3" />
                                    Attach Deliverable / Doc Link
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions on right */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                          {task.completed_at && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Done on {formatDate(task.completed_at)}
                            </span>
                          )}
                          {!isVerified && canEditTasks && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete task"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resigning Employee: Submit for Sign-off Action Bar */}
            {canEditTasks && !isVerified && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {ktDetails.completed_tasks === ktDetails.total_tasks && ktDetails.total_tasks > 0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <FiCheckCircle className="w-4 h-4" />
                      All {ktDetails.total_tasks} KT tasks marked as completed! You can now submit for recipient sign-off.
                    </span>
                  ) : (
                    <span>
                      Complete all checklist deliverables to unlock recipient sign-off ({ktDetails.total_tasks - ktDetails.completed_tasks} tasks remaining).
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSubmitForSignoff}
                  disabled={actionProcessing || ktDetails.completed_tasks < ktDetails.total_tasks || ktDetails.total_tasks === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition flex items-center gap-2 shrink-0"
                >
                  <FiCheck className="w-4 h-4" />
                  {isSubmitted ? "Re-submit KT for Recipient Sign-off" : "Submit KT for Formal Recipient Sign-off"}
                </button>
              </div>
            )}
          </div>

          {/* TWO-SIDED SIGN-OFF WORKFLOW SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PANEL 1: RECIPIENT COMPREHENSION SIGN-OFF */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 shrink-0">
                    <FiAward className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Step 1: Recipient Comprehension & Sign-off
                    </h3>
                    <p className="text-xs text-slate-500">
                      Evaluated by assigned colleague: <strong>{ktDetails.handover_person_name || "Assignee"}</strong>
                    </p>
                  </div>
                </div>

                {isRecipientAccepted && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                    <FiCheck className="w-3.5 h-3.5" />
                    Signed Off
                  </span>
                )}
              </div>

              {isRecipientAccepted ? (
                /* Already Signed Off Summary */
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 dark:text-teal-200">
                        Signed off by {ktDetails.kt_recipient_signed_by_name || "Recipient"}
                      </span>
                      <span className="text-slate-500">{formatDate(ktDetails.kt_recipient_signed_at)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Comprehension Rating:</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FiStar
                            key={star}
                            className={`w-4 h-4 ${star <= (ktDetails.kt_recipient_rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                          />
                        ))}
                        <span className="text-slate-700 dark:text-slate-300 ml-1">
                          ({ktDetails.kt_recipient_rating || 5}/5 - {RATING_DESCRIPTIONS[ktDetails.kt_recipient_rating || 5]})
                        </span>
                      </div>
                    </div>

                    {ktDetails.kt_recipient_feedback && (
                      <p className="text-slate-700 dark:text-slate-300 italic pt-1">
                        "{ktDetails.kt_recipient_feedback}"
                      </p>
                    )}
                  </div>
                </div>
              ) : canRecipientSignoff ? (
                /* Interactive Recipient Review & Sign-off Form */
                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 dark:text-slate-300">
                    As the assigned handover recipient, review all repositories, documentation links, and credentials. Submit your confidence score and sign-off decision below:
                  </p>

                  {/* 5-Star Comprehension Rating */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Comprehension & Handover Confidence Rating:
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSignoffRating(star)}
                          className="p-1 text-amber-400 hover:scale-110 transition"
                        >
                          <FiStar
                            className={`w-6 h-6 ${star <= signoffRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                          />
                        </button>
                      ))}
                      <span className="font-bold text-slate-700 dark:text-slate-300 ml-2">
                        {signoffRating}/5 • {RATING_DESCRIPTIONS[signoffRating]}
                      </span>
                    </div>
                  </div>

                  {/* Remarks input */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Recipient Remarks & Feedback:
                    </label>
                    <textarea
                      rows={3}
                      value={signoffFeedback}
                      onChange={(e) => setSignoffFeedback(e.target.value)}
                      placeholder="Enter verification notes, confirmations, or specific gaps that need revision..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRecipientSignoff("ACCEPT")}
                      disabled={actionProcessing}
                      className="flex-1 py-2 px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <FiCheck className="w-4 h-4" />
                      Accept & Sign-off KT ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecipientSignoff("REVISE")}
                      disabled={actionProcessing}
                      className="py-2 px-4 rounded-xl font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition flex items-center justify-center gap-1.5"
                    >
                      <FiAlertCircle className="w-4 h-4" />
                      Request Revision
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 text-center">
                  <FiClock className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                  Awaiting formal sign-off by assigned recipient (<strong>{ktDetails.handover_person_name || "Assignee"}</strong>).
                </div>
              )}
            </div>

            {/* PANEL 2: MANAGER HANDOVER VERIFICATION & CLEARANCE UNLOCK */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 shrink-0">
                    <LuShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Step 2: Manager Handover Verification
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reporting Manager / HOD certifies handover and unlocks Department Clearance
                    </p>
                  </div>
                </div>

                {isVerified && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <LuShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>

              {isVerified ? (
                /* Already Verified Summary */
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">
                        Verified by {ktDetails.kt_manager_verified_by_name || "Reporting Manager"}
                      </span>
                      <span className="text-slate-500">{formatDate(ktDetails.kt_manager_verified_at)}</span>
                    </div>

                    {ktDetails.kt_manager_verification_notes && (
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{ktDetails.kt_manager_verification_notes}"
                      </p>
                    )}
                  </div>
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-800 flex items-center gap-2">
                    <LuCheckCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Department Clearance (Serial Step 1) is unlocked for clearance sign-off.</span>
                  </div>
                </div>
              ) : canManagerVerify ? (
                /* Interactive Manager Verification Form */
                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 dark:text-slate-300">
                    Conduct final verification of the Knowledge Transfer deliverables and recipient acknowledgment to complete handover:
                  </p>

                  {!isRecipientAccepted && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-2 text-[11px]">
                      <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Note: Recipient sign-off is pending. Manager verification will override and unlock clearance.</span>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Manager Handover Verification Notes:
                    </label>
                    <textarea
                      rows={3}
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Confirm code repositories, secrets rotation, and client relationships transferred in full..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyHandover}
                    disabled={actionProcessing}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <LuShieldCheck className="w-4 h-4" />
                    Verify Handover & Unlock Department Clearance
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 text-center">
                  <FiClock className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                  Awaiting Handover Verification by Reporting Manager / HOD.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM KT TASK MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FiPlus className="w-4 h-4 text-blue-600" />
                Add Knowledge Transfer Task
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTask} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. AWS Production Credentials & Secrets Rotation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {KT_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {KT_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deliverable URL / Wiki Link</label>
                <input
                  type="url"
                  value={newTask.deliverable_url}
                  onChange={(e) => setNewTask({ ...newTask, deliverable_url: e.target.value })}
                  placeholder="https://wiki.internal/docs/project-handover"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Description / Instructions</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Detailed breakdown of files, servers, repositories or contacts to review..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  {actionProcessing ? "Adding..." : "Add Task to Checklist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
