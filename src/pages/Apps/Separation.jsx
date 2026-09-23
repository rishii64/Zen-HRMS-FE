import React, { useState, useEffect } from "react";
import {
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiUser,
  FiCalendar,
  FiFileText,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiChevronRight,
  FiDownload,
  FiShield,
  FiMessageSquare,
  FiCheck,
  FiX,
  FiSend,
  FiEdit2,
  FiTrash2,
  FiVideo,
  FiBriefcase
} from "react-icons/fi";
import { LuLogOut, LuBuilding, LuCheckCheck } from "react-icons/lu";
import toast from "react-hot-toast";
import ResignationModal from "../../components/Resignation/ResignationModal";
import Navbar from "../../components/layout/Navbar";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

export default function Separation() {
  const token = localStorage.getItem("token");
  const storedRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const userEmpId = localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";
  const userName = localStorage.getItem("userName") || "User";

  // RBAC checks
  const isHR = storedRole === "hr" || storedRole === "admin" || storedRole === "hrmanager";
  const isManager = storedRole === "hod" || storedRole === "manager" || storedRole === "teamlead";
  const isAccounts = storedRole === "accounts" || storedRole === "payroll";
  const isEmployeeOnly = !isHR && !isManager && !isAccounts;

  // Data states
  const [loading, setLoading] = useState(true);
  const [resignations, setResignations] = useState([]);
  const [myResignation, setMyResignation] = useState(null);
  const [employees, setEmployees] = useState([]);

  // UI state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState(null);
  const [selectedRecordForAction, setSelectedRecordForAction] = useState(null);
  const [actionType, setActionType] = useState(""); // "manager_action" | "hr_action" | "clearance"
  const [activeTab, setActiveTab] = useState(isEmployeeOnly ? "my_resignation" : "team_queue");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  // Action form state
  const [actionDecision, setActionDecision] = useState("Approved");
  const [actionComments, setActionComments] = useState("");
  const [actionLwd, setActionLwd] = useState("");
  const [actionInterviewDate, setActionInterviewDate] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);

  // Clearance toggle states
  const [clearanceState, setClearanceState] = useState({
    clearance_it_status: "Pending",
    clearance_finance_status: "Pending",
    clearance_admin_status: "Pending",
    clearance_hr_status: "Pending"
  });

  // Fetch employees list
  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  // Fetch all resignations or user's resignation
  const fetchResignations = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's own resignation
      const myRes = await fetch(`${API}/resignation/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const myData = await myRes.json();
      if (myData.success) {
        setMyResignation(myData.data?.active || null);
      }

      // 2. Fetch scoped list for manager / HR
      const allRes = await fetch(`${API}/resignation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allData = await allRes.json();
      if (allData.success) {
        setResignations(allData.data || []);
      }
    } catch (err) {
      console.error("Error fetching resignations:", err);
      toast.error("Failed to load resignation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchResignations();
  }, []);

  // Manager Review Action Handler
  const handleManagerSubmit = async () => {
    if (!selectedRecordForAction) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForAction.id}/manager-action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: actionDecision,
          comments: actionComments,
          recommended_lwd: actionLwd || selectedRecordForAction.last_working_date
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Manager review failed");

      toast.success(data.message || "Review submitted");
      setSelectedRecordForAction(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to submit manager review");
    } finally {
      setActionProcessing(false);
    }
  };

  // HR Review Action Handler
  const handleHRSubmit = async () => {
    if (!selectedRecordForAction) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForAction.id}/hr-action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: actionDecision,
          comments: actionComments,
          confirmed_lwd: actionLwd || selectedRecordForAction.manager_recommended_lwd || selectedRecordForAction.last_working_date,
          exit_interview_status: selectedRecordForAction.schedule_exit_interview ? "Scheduled" : "Not Scheduled",
          exit_interview_date: actionInterviewDate || selectedRecordForAction.interview_preferred_date
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "HR review failed");

      toast.success(data.message || "HR approval processed");
      setSelectedRecordForAction(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to process HR approval");
    } finally {
      setActionProcessing(false);
    }
  };

  // Clearance Checklist Handler
  const handleClearanceSubmit = async () => {
    if (!selectedRecordForAction) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForAction.id}/clearance`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(clearanceState)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update clearance");

      toast.success("Clearance updated successfully");
      setSelectedRecordForAction(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to update clearance");
    } finally {
      setActionProcessing(false);
    }
  };

  // Cancel Resignation Handler
  const handleCancelResignation = async (id) => {
    if (!window.confirm("Are you sure you want to withdraw this resignation request?")) return;
    try {
      const res = await fetch(`${API}/resignation/${id}/cancel`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel resignation");
      toast.success("Resignation withdrawn successfully");
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to withdraw resignation");
    }
  };

  // Open Action Modal
  const openActionModal = (record, type) => {
    setSelectedRecordForAction(record);
    setActionType(type);
    setActionDecision("Approved");
    setActionComments("");
    setActionLwd(record.manager_recommended_lwd || record.last_working_date || "");
    setActionInterviewDate(record.interview_preferred_date || "");
    setClearanceState({
      clearance_it_status: record.clearance_it_status || "Pending",
      clearance_finance_status: record.clearance_finance_status || "Pending",
      clearance_admin_status: record.clearance_admin_status || "Pending",
      clearance_hr_status: record.clearance_hr_status || "Pending"
    });
  };

  // Filtered resignations list
  const filteredResignations = resignations.filter((r) => {
    const matchesSearch =
      (r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.employee_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesDept = deptFilter === "All" || (r.dept || "").toLowerCase() === deptFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesDept;
  });

  // Calculate high-level stats
  const totalCount = resignations.length;
  const pendingManagerCount = resignations.filter((r) => r.status === "Pending Manager Approval").length;
  const pendingHrCount = resignations.filter((r) => r.status === "Pending HR Approval").length;
  const approvedCount = resignations.filter((r) => r.status === "Approved").length;
  const rejectedCount = resignations.filter((r) => r.status === "Rejected").length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40">
            <FiCheck className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "Pending HR Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40">
            <FiClock className="w-3.5 h-3.5" /> Pending HR Approval
          </span>
        );
      case "Pending Manager Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40">
            <FiClock className="w-3.5 h-3.5" /> Pending Manager Review
          </span>
        );
      case "Draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <FiEdit2 className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40">
            <FiX className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
            Withdrawn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* <Navbar /> */}

      <main className="mx-auto max-w-6xl px-2 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <LuLogOut className="w-8 h-8" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Separation & Resignation Portal
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Multi-step exit workflow: Employee submission ➔ Manager / Team Lead review ➔ HR approval & clearance
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchResignations}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Refresh records"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowApplyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all"
            >
              <FiPlus className="w-4 h-4" />
              <span>Apply Resignation</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs for Lead / HR / Accounts */}
        {!isEmployeeOnly && (
          <div className="flex gap-2 mt-6 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("team_queue")}
              className={`pb-3 px-3 text-xs font-semibold relative transition-colors ${
                activeTab === "team_queue"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {isHR ? "Organization Separation Hub" : "Department Review Queue"}
              {activeTab === "team_queue" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my_resignation")}
              className={`pb-3 px-3 text-xs font-semibold relative transition-colors ${
                activeTab === "my_resignation"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              My Resignation Status
              {activeTab === "my_resignation" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* View Content */}
        <div className="mt-6 space-y-6">
          {/* TAB 1: MY RESIGNATION STATUS (Employee View) */}
          {(activeTab === "my_resignation" || isEmployeeOnly) && (
            <div className="space-y-6">
              {myResignation ? (
                /* Active Resignation Card with Multi-Step Stepper */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  {/* Card Top Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Active Resignation Request
                        </span>
                        {getStatusBadge(myResignation.status)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Submitted on {formatDate(myResignation.created_at)} • Notice Period:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {myResignation.notice_period}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {myResignation.status === "Draft" && (
                        <button
                          type="button"
                          onClick={() => setShowApplyModal(true)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl transition-colors"
                        >
                          Continue Editing Draft
                        </button>
                      )}
                      {(myResignation.status === "Pending Manager Approval" ||
                        myResignation.status === "Pending HR Approval" ||
                        myResignation.status === "Draft") && (
                        <button
                          type="button"
                          onClick={() => handleCancelResignation(myResignation.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl transition-colors"
                        >
                          Withdraw Resignation
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4-Step Interactive Visual Stepper */}
                  <div className="py-8 border-b border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                      {/* Step 1: Submission */}
                      <div className="relative flex flex-col items-center text-center p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md mb-2">
                          <FiCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          1. Resignation Filed
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {formatDate(myResignation.created_at)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ✓ Details & Terms Submitted
                        </span>
                      </div>

                      {/* Step 2: Manager Review */}
                      <div
                        className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                          myResignation.manager_decision === "Approved"
                            ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800"
                            : myResignation.manager_decision === "Rejected"
                            ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20"
                            : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md mb-2 ${
                            myResignation.manager_decision === "Approved"
                              ? "bg-emerald-500 text-white"
                              : myResignation.manager_decision === "Rejected"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-white animate-pulse"
                          }`}
                        >
                          {myResignation.manager_decision === "Approved" ? (
                            <FiCheck className="w-4 h-4" />
                          ) : myResignation.manager_decision === "Rejected" ? (
                            <FiX className="w-4 h-4" />
                          ) : (
                            <FiClock className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          2. Lead / Manager Review
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {myResignation.manager_name || "Department Manager"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold mt-1 ${
                            myResignation.manager_decision === "Approved"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : myResignation.manager_decision === "Rejected"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {myResignation.manager_decision === "Approved"
                            ? "✓ Recommended & Forwarded"
                            : myResignation.manager_decision === "Rejected"
                            ? "✕ Rejected by Manager"
                            : "⏳ Pending Department Review"}
                        </span>
                        {myResignation.manager_comments && (
                          <p className="mt-1 text-[10px] text-slate-500 italic">
                            "{myResignation.manager_comments}"
                          </p>
                        )}
                      </div>

                      {/* Step 3: HR Final Approval */}
                      <div
                        className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                          myResignation.status === "Approved"
                            ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800"
                            : myResignation.status === "Pending HR Approval"
                            ? "bg-purple-50/50 border-purple-200 dark:bg-purple-950/20"
                            : "bg-slate-50/40 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md mb-2 ${
                            myResignation.status === "Approved"
                              ? "bg-emerald-500 text-white"
                              : myResignation.status === "Pending HR Approval"
                              ? "bg-purple-500 text-white animate-pulse"
                              : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {myResignation.status === "Approved" ? (
                            <FiCheck className="w-4 h-4" />
                          ) : (
                            <FiShield className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          3. HR Final Approval
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {myResignation.hr_name || "HR Operations"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold mt-1 ${
                            myResignation.status === "Approved"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : myResignation.status === "Pending HR Approval"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-slate-400"
                          }`}
                        >
                          {myResignation.status === "Approved"
                            ? "✓ Approved by HR"
                            : myResignation.status === "Pending HR Approval"
                            ? "⏳ In Review with HR"
                            : "Awaiting Manager Signoff"}
                        </span>
                        {myResignation.hr_confirmed_lwd && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                            Confirmed LWD: {formatDate(myResignation.hr_confirmed_lwd)}
                          </span>
                        )}
                      </div>

                      {/* Step 4: Clearance & Relieving */}
                      <div
                        className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                          myResignation.clearance_it_status === "Cleared" &&
                          myResignation.clearance_finance_status === "Cleared"
                            ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800"
                            : "bg-slate-50/40 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md mb-2 ${
                            myResignation.status === "Approved"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <LuCheckCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          4. Clearance & FnF
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          IT, Finance, Admin, HR
                        </span>
                        <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                              myResignation.clearance_it_status === "Cleared"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            IT: {myResignation.clearance_it_status}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                              myResignation.clearance_finance_status === "Cleared"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            FnF: {myResignation.clearance_finance_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs">
                    {/* Left Column: Details */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Resignation & Handover Overview
                      </h4>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Reason:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {myResignation.reason}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Requested Last Working Date:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {formatDate(myResignation.last_working_date)}
                          </span>
                        </div>
                        {myResignation.handover_person_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Handover Person:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {myResignation.handover_person_name}
                            </span>
                          </div>
                        )}
                        {myResignation.handover_target_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Handover Target Date:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {formatDate(myResignation.handover_target_date)}
                            </span>
                          </div>
                        )}
                      </div>

                      {myResignation.reason_details && (
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                            Additional Note:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300">
                            {myResignation.reason_details}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Exit Interview & Terms */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Exit Interview & Settlement
                      </h4>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Exit Interview:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {myResignation.schedule_exit_interview ? "Scheduled" : "Opted Out"}
                          </span>
                        </div>
                        {myResignation.schedule_exit_interview && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Interview Mode:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {myResignation.interview_mode}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Preferred Time:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {myResignation.interview_preferred_date || "Pending HR Confirmation"}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500">Final Pay & Assets:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ✓ Terms Acknowledged
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state: No active resignation */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mb-4">
                    <LuLogOut className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    No Active Resignation Filed
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 mb-6 leading-relaxed">
                    You currently have no active separation or resignation request. If you plan to file for resignation,
                    our multi-step system routes your request to your department manager and HR for full clearance.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>File Resignation Request</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEAM & ORGANIZATION SEPARATION QUEUE (Manager / HR View) */}
          {!isEmployeeOnly && activeTab === "team_queue" && (
            <div className="space-y-6">
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Applications
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {totalCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 p-4 shadow-sm bg-amber-50/20">
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Awaiting Manager Review
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {pendingManagerCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 p-4 shadow-sm bg-purple-50/20">
                  <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                    Awaiting HR Sign-off
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {pendingHrCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 p-4 shadow-sm bg-emerald-50/20">
                  <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Approved & Clearance
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {approvedCount}
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending Manager Approval">Pending Manager Review</option>
                    <option value="Pending HR Approval">Pending HR Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Draft">Draft</option>
                  </select>

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              {/* Applications Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Notice Period</th>
                        <th className="py-3 px-4">Last Working Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredResignations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No resignation records found matching criteria
                          </td>
                        </tr>
                      ) : (
                        filteredResignations.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                  {item.name ? item.name[0] : "E"}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    ID: {item.employee_id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              {item.dept || "General"}
                            </td>

                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200 font-medium">
                              {item.reason}
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                              {item.notice_period}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatDate(item.hr_confirmed_lwd || item.manager_recommended_lwd || item.last_working_date)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Lead / Manager Review Button */}
                                {(isManager || isHR) && item.status === "Pending Manager Approval" && (
                                  <button
                                    type="button"
                                    onClick={() => openActionModal(item, "manager_action")}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 transition-colors"
                                  >
                                    Manager Review
                                  </button>
                                )}

                                {/* HR Review Button */}
                                {isHR && item.status === "Pending HR Approval" && (
                                  <button
                                    type="button"
                                    onClick={() => openActionModal(item, "hr_action")}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40 transition-colors"
                                  >
                                    HR Approval
                                  </button>
                                )}

                                {/* Clearance Checklist Button */}
                                {(isHR || isAccounts) && item.status === "Approved" && (
                                  <button
                                    type="button"
                                    onClick={() => openActionModal(item, "clearance")}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40 transition-colors"
                                  >
                                    Clearance
                                  </button>
                                )}

                                {/* Details View */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecordForDetail(item)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="View full details"
                                >
                                  <FiFileText className="w-4 h-4" />
                                </button>
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
          )}
        </div>
      </main>

      {/* Multi-Step Resignation Modal (Matching user image) */}
      <ResignationModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        initialData={myResignation?.status === "Draft" ? myResignation : null}
        onSuccess={() => {
          fetchResignations();
        }}
        employees={employees}
      />

      {/* Action Modal (Manager Review / HR Approval / Clearance) */}
      {selectedRecordForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {actionType === "manager_action"
                  ? "Department Lead / Manager Review"
                  : actionType === "hr_action"
                  ? "HR Head Final Sign-off"
                  : "Separation Clearance Checklist"}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecordForAction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3.5">
              {/* Employee brief */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {selectedRecordForAction.name} ({selectedRecordForAction.employee_id})
                  </span>
                  <span className="text-slate-500 block">
                    Dept: {selectedRecordForAction.dept} • Reason: {selectedRecordForAction.reason}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Notice Period</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedRecordForAction.notice_period}
                  </span>
                </div>
              </div>

              {actionType === "clearance" ? (
                /* Clearance Checklist Toggles */
                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      IT Asset & Access Clearance (Laptop, accounts revoked)
                    </span>
                    <select
                      value={clearanceState.clearance_it_status}
                      onChange={(e) =>
                        setClearanceState({ ...clearanceState, clearance_it_status: e.target.value })
                      }
                      className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cleared">Cleared</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Finance & Full and Final (FnF) Settlement Clearance
                    </span>
                    <select
                      value={clearanceState.clearance_finance_status}
                      onChange={(e) =>
                        setClearanceState({ ...clearanceState, clearance_finance_status: e.target.value })
                      }
                      className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cleared">Cleared</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Admin & ID Card Return Clearance
                    </span>
                    <select
                      value={clearanceState.clearance_admin_status}
                      onChange={(e) =>
                        setClearanceState({ ...clearanceState, clearance_admin_status: e.target.value })
                      }
                      className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cleared">Cleared</option>
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      HR Clearance & Relieving Certificate Sign-off
                    </span>
                    <select
                      value={clearanceState.clearance_hr_status}
                      onChange={(e) =>
                        setClearanceState({ ...clearanceState, clearance_hr_status: e.target.value })
                      }
                      className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cleared">Cleared</option>
                    </select>
                  </label>
                </div>
              ) : (
                /* Manager / HR Review Controls */
                <>
                  {/* Decision Pills */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Decision
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActionDecision("Approved")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                          actionDecision === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                        }`}
                      >
                        ✓ {actionType === "manager_action" ? "Recommend & Forward to HR" : "Approve Resignation"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionDecision("Rejected")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                          actionDecision === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                        }`}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>

                  {/* LWD Adjustment */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {actionType === "manager_action" ? "Recommended Last Working Date" : "Confirmed Last Working Date"}
                    </label>
                    <input
                      type="date"
                      value={actionLwd}
                      onChange={(e) => setActionLwd(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  {/* HR Exit interview scheduling */}
                  {actionType === "hr_action" && selectedRecordForAction.schedule_exit_interview && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Confirmed Exit Interview Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={actionInterviewDate}
                        onChange={(e) => setActionInterviewDate(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {actionType === "manager_action" ? "Manager Remarks / Handover Notes" : "HR Approval Comments"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add comments or feedback for this resignation request..."
                      value={actionComments}
                      onChange={(e) => setActionComments(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecordForAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={
                  actionType === "manager_action"
                    ? handleManagerSubmit
                    : actionType === "hr_action"
                    ? handleHRSubmit
                    : handleClearanceSubmit
                }
                disabled={actionProcessing}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {actionProcessing ? "Saving..." : "Submit Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Resignation Application Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold">{selectedRecordForDetail.name} ({selectedRecordForDetail.employee_id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold">{selectedRecordForDetail.dept}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Notice Period:</span>
                  <span className="font-semibold">{selectedRecordForDetail.notice_period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Working Date:</span>
                  <span className="font-semibold">{formatDate(selectedRecordForDetail.last_working_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span>{getStatusBadge(selectedRecordForDetail.status)}</span>
                </div>
              </div>

              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">Reason:</span>
                <p className="text-slate-600 dark:text-slate-400">{selectedRecordForDetail.reason}</p>
                {selectedRecordForDetail.reason_details && (
                  <p className="text-slate-500 italic mt-1">{selectedRecordForDetail.reason_details}</p>
                )}
              </div>

              {selectedRecordForDetail.handover_person_name && (
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">Handover Details:</span>
                  <div className="text-slate-600 dark:text-slate-400">
                    <div>Person: {selectedRecordForDetail.handover_person_name}</div>
                    <div>Target Date: {formatDate(selectedRecordForDetail.handover_target_date)}</div>
                    {selectedRecordForDetail.handover_note && (
                      <div className="mt-1 italic">"{selectedRecordForDetail.handover_note}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
