import React, { useState, useEffect } from "react";
import {
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCircleAlert,
  LuFastForward,
  LuArrowRight,
  LuLayers,
  LuSlidersHorizontal,
  LuUsers,
  LuCalendar,
  LuReceipt,
  LuFilter,
  LuPlus,
  LuTrash2,
  LuRefreshCw,
  LuShieldCheck,
  LuExternalLink,
  LuRotateCcw,
  LuSearch,
  LuCheckCheck,
  LuMessageSquare,
  LuFileText,
  LuCheck,
  LuX,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getAuthRole, getAuthEmployeeCode } from "../../utils/auth";
import SequentialApprovalTimeline from "../../components/common/SequentialApprovalTimeline";

export default function ApprovalsDesk() {
  const currentRole = (getAuthRole() || "").toLowerCase().trim();
  const currentEmpId = getAuthEmployeeCode();
  const isAdminOrHR = ["hr", "admin", "superadmin", "management", "ceo", "hrmanager"].includes(currentRole);

  const [activeTab, setActiveTab] = useState("inbox"); // "inbox" | "my_requests" | "history" | "workflows"
  const [loading, setLoading] = useState(false);
  const [inboxItems, setInboxItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");

  // Action Modal State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    item: null,
    decision: "APPROVE", // "APPROVE" | "REJECT" | "CHANGES_REQUESTED"
    comments: "",
    submitting: false,
  });

  // Workflow Editor State (for Admin / HR)
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Load active tab data
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      if (activeTab === "inbox") {
        const res = await api.get("/approvals/inbox");
        if (res.data?.success) setInboxItems(res.data.data || []);
      } else if (activeTab === "my_requests") {
        const res = await api.get("/approvals/my-requests");
        if (res.data?.success) setMyRequests(res.data.data || []);
      } else if (activeTab === "history") {
        const res = await api.get("/approvals/history");
        if (res.data?.success) setHistoryItems(res.data.data || []);
      } else if (activeTab === "workflows") {
        const res = await api.get("/approvals/workflows");
        if (res.data?.success) setWorkflows(res.data.data || []);
      }
    } catch (err) {
      console.warn("Failed to load approvals data:", err.message);
      toast.error("Failed to load approval data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handle Action Submit (Approve / Reject / Changes Requested)
  const handleActionSubmit = async (e) => {
    e?.preventDefault();
    const { item, decision, comments } = actionModal;
    if (!item) return;

    if (decision === "REJECT" && !comments.trim()) {
      toast.error("Please enter a reason for rejecting the request.");
      return;
    }
    if (decision === "CHANGES_REQUESTED" && !comments.trim()) {
      toast.error("Please explain what changes are requested.");
      return;
    }

    try {
      setActionModal((prev) => ({ ...prev, submitting: true }));
      const res = await api.post(`/approvals/${item.id}/action`, {
        decision,
        comments: comments.trim(),
      });

      if (res.data?.success) {
        toast.success(res.data.message || `Request ${decision.toLowerCase()}d successfully`);
        setActionModal({ isOpen: false, item: null, decision: "APPROVE", comments: "", submitting: false });
        loadData(true);
      }
    } catch (err) {
      console.error("Action error:", err);
      toast.error(err.response?.data?.error || "Failed to process approval action");
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Workflow Editor Helpers
  const handleOpenWorkflowModal = (wf = null) => {
    if (wf) {
      setEditingWorkflow(JSON.parse(JSON.stringify(wf)));
    } else {
      // New default template
      setEditingWorkflow({
        module: "LEAVE",
        workflow_name: "New Sequential Approval Workflow",
        description: "Sequential multi-level authorization chain",
        department: "ALL",
        min_amount: 0,
        min_days: 0,
        is_active: true,
        allow_auto_skip: true,
        notify_on_each_step: true,
        steps: [
          {
            level_order: 1,
            level_name: "Reporting Manager Endorsement",
            approver_type: "REPORTING_MANAGER",
            approver_role: "manager",
            condition_type: "ALWAYS",
            condition_value: 0,
            is_mandatory: true,
            can_auto_skip: true,
            sla_hours: 24,
          },
          {
            level_order: 2,
            level_name: "Department Head (HOD) Approval",
            approver_type: "HOD",
            approver_role: "hod",
            condition_type: "ALWAYS",
            condition_value: 0,
            is_mandatory: true,
            can_auto_skip: true,
            sla_hours: 48,
          },
          {
            level_order: 3,
            level_name: "HR Operations Final Sanction",
            approver_type: "ROLE",
            approver_role: "hr",
            condition_type: "ALWAYS",
            condition_value: 0,
            is_mandatory: true,
            can_auto_skip: false,
            sla_hours: 48,
          },
        ],
      });
    }
  };

  const handleAddStep = () => {
    if (!editingWorkflow) return;
    const currentSteps = editingWorkflow.steps || [];
    const newLevel = currentSteps.length + 1;
    setEditingWorkflow({
      ...editingWorkflow,
      steps: [
        ...currentSteps,
        {
          level_order: newLevel,
          level_name: `Level ${newLevel} Approval`,
          approver_type: "ROLE",
          approver_role: "management",
          condition_type: "ALWAYS",
          condition_value: 0,
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 48,
        },
      ],
    });
  };

  const handleRemoveStep = (index) => {
    if (!editingWorkflow) return;
    const currentSteps = [...editingWorkflow.steps];
    currentSteps.splice(index, 1);
    // Re-index levels
    const reindexed = currentSteps.map((s, idx) => ({ ...s, level_order: idx + 1 }));
    setEditingWorkflow({ ...editingWorkflow, steps: reindexed });
  };

  const handleSaveWorkflow = async () => {
    if (!editingWorkflow) return;
    if (!editingWorkflow.workflow_name || !editingWorkflow.module) {
      toast.error("Module and Workflow Name are required");
      return;
    }
    if (!editingWorkflow.steps || editingWorkflow.steps.length === 0) {
      toast.error("At least one sequential approval level is required");
      return;
    }

    try {
      setSavingWorkflow(true);
      if (editingWorkflow.id) {
        await api.put(`/approvals/workflows/${editingWorkflow.id}`, editingWorkflow);
        toast.success("Workflow configuration updated successfully!");
      } else {
        await api.post("/approvals/workflows", editingWorkflow);
        toast.success("New sequential workflow created successfully!");
      }
      setEditingWorkflow(null);
      loadData(true);
    } catch (err) {
      console.error("Save workflow error:", err);
      toast.error(err.response?.data?.error || "Failed to save workflow");
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all workflows to standard enterprise sequential defaults (Employee ➔ Reporting Manager ➔ HOD ➔ HR)?")) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/approvals/workflows/reset-defaults");
      if (res.data?.success) {
        toast.success("Standard sequential approval workflows restored!");
        loadData();
      }
    } catch (err) {
      toast.error("Failed to reset workflows");
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filterList = (list) => {
    return list.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchModule = moduleFilter === "ALL" || item.module === moduleFilter;
      return matchSearch && matchModule;
    });
  };

  const currentItems =
    activeTab === "inbox"
      ? filterList(inboxItems)
      : activeTab === "my_requests"
      ? filterList(myRequests)
      : activeTab === "history"
      ? filterList(historyItems)
      : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800">
                <LuLayers className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Sequential Multi-Level Approvals Hub
                </h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Configurable sequential routing: <strong>Employee ➔ Reporting Manager ➔ HOD ➔ HR</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition cursor-pointer"
            >
              <LuRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {isAdminOrHR && (
              <button
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                <LuRotateCcw className="h-3.5 w-3.5" />
                Reset Defaults
              </button>
            )}
          </div>
        </div>

        {/* TOP METRIC CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Pending My Action</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {inboxItems.length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <LuClock className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">My Requests</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {myRequests.length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <LuUsers className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Past Approvals</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {historyItems.length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <LuCircleCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Active Workflows</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {workflows.length || 3}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <LuSlidersHorizontal className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            {[
              { id: "inbox", label: "Pending My Action", count: inboxItems.length, icon: LuClock },
              { id: "my_requests", label: "My Submitted Requests", count: myRequests.length, icon: LuFileText },
              { id: "history", label: "Approval History", count: historyItems.length, icon: LuCheckCheck },
              ...(isAdminOrHR
                ? [{ id: "workflows", label: "Workflow Rules Configurator", icon: LuSlidersHorizontal }]
                : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === "workflows" && isAdminOrHR && (
            <button
              onClick={() => handleOpenWorkflowModal(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer mb-2"
            >
              <LuPlus className="h-3.5 w-3.5" />
              <span>Create Workflow</span>
            </button>
          )}
        </div>

        {/* SEARCH & MODULE FILTERS (For Request Tabs) */}
        {activeTab !== "workflows" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="relative w-full sm:w-80">
              <LuSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, employee, number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Filter:</span>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Modules</option>
                <option value="LEAVE">Leaves</option>
                <option value="EXPENSE_CLAIM">Expense Claims</option>
                <option value="OVERTIME">Overtime</option>
                <option value="TRANSFER">Transfers</option>
                <option value="RESIGNATION">Resignations</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 1, 2, 3: REQUESTS LIST WITH SEQUENTIAL TIMELINES */}
        {activeTab !== "workflows" && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <LuRefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading sequential approval records...</p>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <LuShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {activeTab === "inbox" ? "All Caught Up!" : "No Records Found"}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {activeTab === "inbox"
                    ? "No pending approvals currently require your action. Everything is on schedule."
                    : "No requests found matching your filter criteria."}
                </p>
              </div>
            ) : (
              currentItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs p-5 transition hover:shadow-md space-y-4"
                >
                  {/* Top Bar: Module, Status, Request Number, Dates */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-slate-900 text-white dark:bg-blue-600">
                        {item.module}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        {item.request_number}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted: {new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          item.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : item.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        }`}
                      >
                        {item.status === "PENDING"
                          ? `In Review (L${item.current_level}/${item.total_levels})`
                          : item.status}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                        <span>
                          Applicant: <strong>{item.employee_name}</strong> ({item.employee_id})
                        </span>
                        <span>•</span>
                        <span>
                          Dept: <strong>{item.department || "General"}</strong>
                        </span>
                        {item.amount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{Number(item.amount).toLocaleString("en-IN")}
                            </span>
                          </>
                        )}
                        {item.days > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              {item.days} Day{item.days > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Pending Approver Action Controls */}
                    {activeTab === "inbox" && (
                      <div className="flex flex-col sm:flex-row md:flex-col justify-center items-end md:items-end gap-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700/60 pt-3 md:pt-0 md:pl-4">
                        <div className="text-right text-[11px] text-slate-400 mb-1">
                          Current Stage:{" "}
                          <strong className="text-blue-600 dark:text-blue-400">
                            {item.current_level_name}
                          </strong>
                        </div>
                        <div className="flex items-center gap-2 w-full justify-end">
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                item,
                                decision: "APPROVE",
                                comments: "",
                                submitting: false,
                              })
                            }
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex-1 sm:flex-none"
                          >
                            <LuCheck className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                item,
                                decision: "REJECT",
                                comments: "",
                                submitting: false,
                              })
                            }
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex-1 sm:flex-none"
                          >
                            <LuX className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                item,
                                decision: "CHANGES_REQUESTED",
                                comments: "",
                                submitting: false,
                              })
                            }
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Request modifications from employee"
                          >
                            <LuMessageSquare className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SEQUENTIAL MULTI-LEVEL TIMELINE STEPPER */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                      Sequential Approval Pipeline Audit Trail:
                    </p>
                    <SequentialApprovalTimeline
                      steps={item.steps || []}
                      currentLevel={item.current_level}
                      overallStatus={item.status}
                      applicantName={item.employee_name}
                      submittedAt={item.created_at}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: WORKFLOW RULES CONFIGURATOR (HR & Admin) */}
        {activeTab === "workflows" && isAdminOrHR && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {wf.module}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          wf.is_active ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        title={wf.is_active ? "Active" : "Inactive"}
                      />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2">
                      {wf.workflow_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {wf.description}
                    </p>

                    {/* Sequential Levels list preview */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Sequential Levels ({wf.steps?.length || 0}):
                      </div>
                      <div className="space-y-1.5">
                        {(wf.steps || []).map((step) => (
                          <div
                            key={step.id || step.level_order}
                            className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800"
                          >
                            <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {step.level_order}
                            </span>
                            <div className="flex-1 truncate">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {step.level_name}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {step.approver_type} ({step.approver_role || "Dynamic"})
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Scope: <strong>{wf.department || "ALL Departments"}</strong>
                    </span>
                    <button
                      onClick={() => handleOpenWorkflowModal(wf)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Edit Rules
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION MODAL (APPROVE / REJECT / CHANGES REQUESTED) */}
        {actionModal.isOpen && actionModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {actionModal.decision === "APPROVE" ? (
                    <LuCircleCheck className="h-5 w-5 text-emerald-500" />
                  ) : actionModal.decision === "REJECT" ? (
                    <LuCircleX className="h-5 w-5 text-rose-500" />
                  ) : (
                    <LuCircleAlert className="h-5 w-5 text-amber-500" />
                  )}
                  <span>
                    {actionModal.decision === "APPROVE"
                      ? "Approve Request Level"
                      : actionModal.decision === "REJECT"
                      ? "Reject Request"
                      : "Request Modifications"}
                  </span>
                </h3>
                <button
                  onClick={() =>
                    setActionModal({ isOpen: false, item: null, decision: "APPROVE", comments: "", submitting: false })
                  }
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Request:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{actionModal.item.title}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Applicant:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{actionModal.item.employee_name} ({actionModal.item.department})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Stage:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    Level {actionModal.item.current_level}: {actionModal.item.current_level_name}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {actionModal.decision === "APPROVE"
                    ? "Endorsement Remarks / Notes (Optional)"
                    : actionModal.decision === "REJECT"
                    ? "Reason for Rejection (Required)"
                    : "Modifications Requested (Required)"}
                </label>
                <textarea
                  rows={3}
                  value={actionModal.comments}
                  onChange={(e) => setActionModal((p) => ({ ...p, comments: e.target.value }))}
                  placeholder={
                    actionModal.decision === "APPROVE"
                      ? "e.g. Endorsed based on satisfactory work handover and policy eligibility."
                      : actionModal.decision === "REJECT"
                      ? "e.g. Insufficient client meeting receipt / overlapping with critical project deadline."
                      : "e.g. Please attach itemized hotel bill and GST invoice."
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() =>
                    setActionModal({ isOpen: false, item: null, decision: "APPROVE", comments: "", submitting: false })
                  }
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionModal.submitting}
                  onClick={handleActionSubmit}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                    actionModal.decision === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : actionModal.decision === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {actionModal.submitting ? (
                    <LuRefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LuCheck className="h-3.5 w-3.5" />
                  )}
                  <span>Confirm {actionModal.decision}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKFLOW EDITOR MODAL (For Admins / HR) */}
        {editingWorkflow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LuSlidersHorizontal className="h-5 w-5 text-blue-600" />
                  <span>Configure Sequential Multi-Level Workflow</span>
                </h3>
                <button
                  onClick={() => setEditingWorkflow(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>

              {/* Workflow Core Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Module
                  </label>
                  <select
                    value={editingWorkflow.module}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, module: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="LEAVE">Leave Applications</option>
                    <option value="EXPENSE_CLAIM">Expense & Travel Claims</option>
                    <option value="OVERTIME">Overtime Regularization</option>
                    <option value="TRANSFER">Transfers & Deputation</option>
                    <option value="RESIGNATION">Separations & Resignation</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    value={editingWorkflow.workflow_name}
                    onChange={(e) =>
                      setEditingWorkflow({ ...editingWorkflow, workflow_name: e.target.value })
                    }
                    placeholder="e.g. Standard Sequential Leave Approval"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingWorkflow.description || ""}
                  onChange={(e) =>
                    setEditingWorkflow({ ...editingWorkflow, description: e.target.value })
                  }
                  placeholder="e.g. Sequential 3-level endorsement: Employee ➔ Reporting Manager ➔ HOD ➔ HR"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Sequential Levels Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Sequential Approval Levels (In Order of Progression):
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                  >
                    <LuPlus className="h-3.5 w-3.5" />
                    <span>Add Approval Level</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {(editingWorkflow.steps || []).map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
                    >
                      <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        {step.level_order}
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                        <input
                          type="text"
                          value={step.level_name}
                          onChange={(e) => {
                            const newSteps = [...editingWorkflow.steps];
                            newSteps[idx].level_name = e.target.value;
                            setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
                          }}
                          placeholder="Level Name (e.g. Reporting Manager)"
                          className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />

                        <select
                          value={step.approver_type}
                          onChange={(e) => {
                            const newSteps = [...editingWorkflow.steps];
                            newSteps[idx].approver_type = e.target.value;
                            setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
                          }}
                          className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        >
                          <option value="REPORTING_MANAGER">Reporting Manager (Dynamic)</option>
                          <option value="HOD">Department Head (HOD)</option>
                          <option value="ROLE">Role / Department (HR/Finance)</option>
                          <option value="SPECIFIC_USER">Specific Employee</option>
                        </select>

                        {step.approver_type === "ROLE" ? (
                          <select
                            value={step.approver_role || "hr"}
                            onChange={(e) => {
                              const newSteps = [...editingWorkflow.steps];
                              newSteps[idx].approver_role = e.target.value;
                              setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
                            }}
                            className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          >
                            <option value="hr">HR Department</option>
                            <option value="finance">Finance / Accounts</option>
                            <option value="management">Executive Management</option>
                            <option value="admin">System Admin</option>
                          </select>
                        ) : (
                          <div className="flex items-center text-[11px] text-slate-400 italic">
                            Auto-resolved dynamically
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        disabled={(editingWorkflow.steps || []).length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-30"
                        title="Delete level"
                      >
                        <LuTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setEditingWorkflow(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingWorkflow}
                  onClick={handleSaveWorkflow}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingWorkflow ? (
                    <LuRefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LuCheck className="h-3.5 w-3.5" />
                  )}
                  <span>Save Sequential Workflow</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
