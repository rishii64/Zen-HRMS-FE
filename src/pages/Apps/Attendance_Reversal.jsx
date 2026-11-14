import React, { useState, useEffect, useMemo } from "react";
import {
  LuClock,
  LuCalendar,
  LuCheck,
  LuCircleCheck,
  LuCircleX,
  LuTriangleAlert,
  LuFileText,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuUpload,
  LuExternalLink,
  LuTrash2,
  LuUser,
  LuUserCheck,
  LuBuilding2,
  LuShieldCheck,
  LuHistory,
  LuFileCheck,
  LuSparkles,
  LuInfo,
  LuRotateCcw,
  LuArrowLeftRight,
} from "react-icons/lu";
import toast, { Toaster } from "react-hot-toast";
import api, { getUploadUrl } from "../../api/axios";

// Available Request Categories
const REQUEST_TYPES = [
  { value: "MISSED_PUNCH_IN", label: "Missed Punch-In (Clocked out only)", desc: "Forgot to punch upon morning arrival" },
  { value: "MISSED_PUNCH_OUT", label: "Missed Punch-Out (Clocked in only)", desc: "Forgot to punch before leaving premises" },
  { value: "MISSED_BOTH", label: "Missed Both Punches / Biometric Glitch", desc: "Device offline or forgot both punches" },
  { value: "ON_DUTY_OUTDOOR", label: "On-Duty / Outdoor Client Visit", desc: "Off-site client meeting or official field travel" },
  { value: "WFH_REMOTE", label: "Work From Home / Remote Day", desc: "Authorized remote work without biometric sync" },
  { value: "REVERSAL_DISCREPANCY", label: "Wrongful Absent / Penalty Reversal", desc: "Marked absent erroneously, request reversal" },
  { value: "LATE_WAIVER", label: "Late Arrival Regularization / Grace", desc: "Late arrival due to transit or emergency" },
];

export default function Attendance_Reversal() {
  const currentRole = (localStorage.getItem("role") || "").toLowerCase().trim();
  const currentEmpId = localStorage.getItem("employee_id") || "";
  const isHR = currentRole === "hr" || currentRole === "hrmanager";
  const isAdmin = currentRole === "admin";
  const isLead = currentRole === "hod" || currentRole === "manager" || currentRole === "teamlead";
  const canApprove = isHR || isAdmin || isLead || currentRole === "ceo" || currentRole === "coo" || currentRole === "payroll" || currentRole === "accounts";

  // Tab State
  const [activeTab, setActiveTab] = useState(canApprove ? "approval_desk" : "my_requests"); // "my_requests" | "approval_desk"

  // Data States
  const [myRequests, setMyRequests] = useState([]);
  const [myStats, setMyStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, reversed: 0 });
  const [myLoading, setMyLoading] = useState(false);
  const [myFilter, setMyFilter] = useState("ALL");

  const [allRequests, setAllRequests] = useState([]);
  const [allStats, setAllStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, reversed: 0 });
  const [allLoading, setAllLoading] = useState(false);
  const [allFilter, setAllFilter] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingDateRecord, setExistingDateRecord] = useState(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [applyForm, setApplyForm] = useState({
    attendance_date: todayStr,
    request_type: "MISSED_PUNCH_IN",
    requested_check_in: "09:30",
    requested_check_out: "18:30",
    requested_status: "Present",
    reason: "",
    proof_file: null,
  });

  // Action Modals (Approve / Reject / Reverse)
  const [actionModal, setActionModal] = useState({
    show: false,
    type: "APPROVE", // "APPROVE" | "REJECT" | "REVERSE"
    record: null,
    remarks: "",
    reversalStatus: "Absent",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch My Requests
  useEffect(() => {
    if (activeTab === "my_requests") {
      fetchMyRequests();
    } else {
      fetchAllRequests();
    }
  }, [activeTab, myFilter, allFilter, deptFilter]);

  const fetchMyRequests = async () => {
    setMyLoading(true);
    try {
      const res = await api.get("/attendance/regularization/my-requests", {
        params: { status: myFilter },
      });
      if (res.data?.success) {
        setMyRequests(res.data.data || []);
        if (res.data.stats) setMyStats(res.data.stats);
      } else {
        toast.error(res.data?.error || "Failed to load requests");
      }
    } catch (err) {
      console.error("My regularizations error:", err);
      toast.error(err.response?.data?.error || "Failed to load your regularization requests");
    } finally {
      setMyLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    setAllLoading(true);
    try {
      const res = await api.get("/attendance/regularization/all", {
        params: {
          status: allFilter,
          search: searchQuery,
          department: deptFilter,
        },
      });
      if (res.data?.success) {
        setAllRequests(res.data.data || []);
        if (res.data.stats) setAllStats(res.data.stats);
      } else {
        toast.error(res.data?.error || "Failed to load approval desk");
      }
    } catch (err) {
      console.error("All regularizations error:", err);
      toast.error(err.response?.data?.error || "Failed to load requests queue");
    } finally {
      setAllLoading(false);
    }
  };

  // 2. Lookup existing punch when picking a date
  const handleDateChange = async (dateVal) => {
    setApplyForm((prev) => ({ ...prev, attendance_date: dateVal }));
    if (!dateVal) return;

    setLookupLoading(true);
    try {
      const res = await api.get("/attendance/regularization/date-lookup", {
        params: { date: dateVal },
      });
      if (res.data?.success) {
        setExistingDateRecord(res.data.data);
      } else {
        setExistingDateRecord(null);
      }
    } catch {
      setExistingDateRecord(null);
    } finally {
      setLookupLoading(false);
    }
  };

  // 3. Dynamic work hours calculation for apply modal
  const calculatedHours = useMemo(() => {
    try {
      const [inH, inM] = (applyForm.requested_check_in || "09:30").split(":").map(Number);
      const [outH, outM] = (applyForm.requested_check_out || "18:30").split(":").map(Number);
      if (isNaN(inH) || isNaN(outH)) return 9.0;
      let diff = (outH * 60 + (inM || 0)) - (inH * 60 + (outM ? 0 : 0));
      if (diff < 0) diff += 24 * 60;
      return (diff / 60).toFixed(2);
    } catch {
      return "9.00";
    }
  }, [applyForm.requested_check_in, applyForm.requested_check_out]);

  // 4. Submit New Regularization Request
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.attendance_date) {
      toast.error("Please select the attendance date.");
      return;
    }
    if (!applyForm.reason.trim()) {
      toast.error("Please provide a detailed reason.");
      return;
    }

    setSubmittingApply(true);
    const formData = new FormData();
    formData.append("attendance_date", applyForm.attendance_date);
    formData.append("request_type", applyForm.request_type);
    formData.append("requested_check_in", applyForm.requested_check_in);
    formData.append("requested_check_out", applyForm.requested_check_out);
    formData.append("requested_status", applyForm.requested_status);
    formData.append("reason", applyForm.reason.trim());
    if (applyForm.proof_file) {
      formData.append("proof_doc", applyForm.proof_file);
    }

    try {
      const res = await api.post("/attendance/regularization/apply", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Regularization request submitted to HR!");
        setShowApplyModal(false);
        setApplyForm({
          attendance_date: todayStr,
          request_type: "MISSED_PUNCH_IN",
          requested_check_in: "09:30",
          requested_check_out: "18:30",
          requested_status: "Present",
          reason: "",
          proof_file: null,
        });
        setExistingDateRecord(null);
        if (activeTab === "my_requests") fetchMyRequests();
        else fetchAllRequests();
      } else {
        toast.error(res.data?.error || "Submission failed");
      }
    } catch (err) {
      console.error("Apply error:", err);
      toast.error(err.response?.data?.error || "Failed to submit request.");
    } finally {
      setSubmittingApply(false);
    }
  };

  // 5. Cancel My Pending Request
  const handleCancelRequest = async (id, reqNo) => {
    if (!window.confirm(`Are you sure you want to cancel request ${reqNo}?`)) return;
    try {
      const res = await api.delete(`/attendance/regularization/${id}/cancel`);
      if (res.data?.success) {
        toast.success("Request cancelled successfully.");
        fetchMyRequests();
      } else {
        toast.error(res.data?.error || "Failed to cancel");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel request.");
    }
  };

  // 6. Execute HR Action (Approve / Reject / Reverse)
  const handleActionExecute = async () => {
    const { type, record, remarks, reversalStatus } = actionModal;
    if (!record) return;

    if (type === "REJECT" && !remarks.trim()) {
      toast.error("Rejection remarks are mandatory.");
      return;
    }

    setActionLoading(true);
    try {
      let res;
      if (type === "APPROVE") {
        res = await api.patch(`/attendance/regularization/${record.id}/approve`, {
          review_remarks: remarks.trim() || "Approved by HR.",
        });
      } else if (type === "REJECT") {
        res = await api.patch(`/attendance/regularization/${record.id}/reject`, {
          review_remarks: remarks.trim(),
        });
      } else if (type === "REVERSE") {
        res = await api.post(`/attendance/regularization/${record.id}/reverse`, {
          reversal_target_status: reversalStatus,
          reversal_notes: remarks.trim(),
        });
      }

      if (res.data?.success) {
        toast.success(res.data.message || `Action ${type} completed!`);
        setActionModal({ show: false, type: "APPROVE", record: null, remarks: "", reversalStatus: "Absent" });
        fetchAllRequests();
      } else {
        toast.error(res.data?.error || "Action failed");
      }
    } catch (err) {
      console.error("Action error:", err);
      toast.error(err.response?.data?.error || "Action could not be executed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Badge Formatter
  const renderStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <LuCircleCheck size={12} /> Approved & Synced
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <LuCircleX size={12} /> Rejected
          </span>
        );
      case "REVERSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <LuRotateCcw size={12} /> Reversal Executed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <LuClock size={12} className="animate-pulse" /> Pending HR Review
          </span>
        );
    }
  };

  const getRequestTypeLabel = (type) => {
    const found = REQUEST_TYPES.find((t) => t.value === type);
    return found ? found.label : type.replace(/_/g, " ");
  };

  return (
    <div className="px-4 space-y-6 max-w-7xl mx-auto text-slate-800">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
              Attendance Management
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md">
              Punch Correction & Reversal Workflow
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Attendance Regularization & Reversal Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit missed punch corrections, client on-duty requests, or discrepancy reversals directly to HR with automatic attendance log sync.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeTab === "my_requests") fetchMyRequests();
              else fetchAllRequests();
            }}
            className="p-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Refresh list"
          >
            <LuRefreshCw size={14} className={myLoading || allLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowApplyModal(true);
              handleDateChange(todayStr);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <LuPlus size={16} />
            <span>Request Regularization</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("my_requests")}
            className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "my_requests"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuUser size={16} />
            <span>My Regularization Requests</span>
            {myStats.pending > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                {myStats.pending}
              </span>
            )}
          </button>

          {canApprove && (
            <button
              type="button"
              onClick={() => setActiveTab("approval_desk")}
              className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "approval_desk"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <LuShieldCheck size={16} />
              <span>HR / Manager Approval Desk</span>
              {allStats.pending > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-800 rounded-full font-bold animate-pulse">
                  {allStats.pending}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MY REGULARIZATION REQUESTS */}
      {activeTab === "my_requests" && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Requests</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{myStats.total}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-amber-700 uppercase">Pending Review</span>
              <div className="text-xl font-black text-amber-800 mt-0.5">{myStats.pending}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">Approved & Synced</span>
              <div className="text-xl font-black text-emerald-800 mt-0.5">{myStats.approved}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-rose-700 uppercase">Rejected</span>
              <div className="text-xl font-black text-rose-800 mt-0.5">{myStats.rejected}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-purple-700 uppercase">Reversals</span>
              <div className="text-xl font-black text-purple-800 mt-0.5">{myStats.reversed}</div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["ALL", "PENDING", "APPROVED", "REJECTED", "REVERSED"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setMyFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  myFilter === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Request Details</th>
                    <th className="py-3 px-3">Discrepancy Date</th>
                    <th className="py-3 px-3">Correction Requested</th>
                    <th className="py-3 px-3">Reason & Notes</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">HR Feedback / Audit</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {myLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading your regularization requests...
                      </td>
                    </tr>
                  ) : myRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <LuFileText className="mx-auto mb-2 text-slate-300" size={32} />
                        No regularization requests found.
                      </td>
                    </tr>
                  ) : (
                    myRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono">{r.request_no}</div>
                          <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                            {getRequestTypeLabel(r.request_type)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{r.attendance_date}</div>
                          <div className="text-[10px] text-slate-400">
                            Recorded: {r.original_status} ({r.original_check_in || "—"} - {r.original_check_out || "—"})
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">
                            {r.requested_check_in} – {r.requested_check_out}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            {r.requested_status} • {r.calculated_work_hours || 9.0} hrs
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="truncate text-slate-700" title={r.reason}>
                            {r.reason}
                          </div>
                          {r.supporting_doc_url && (
                            <a
                              href={getUploadUrl(r.supporting_doc_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-[11px] inline-flex items-center gap-1 mt-0.5 font-semibold"
                            >
                              <LuExternalLink size={11} /> Proof Attached
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3">{renderStatusBadge(r.status)}</td>
                        <td className="py-3 px-3 max-w-xs">
                          {r.reviewed_at ? (
                            <div>
                              <div className="text-[11px] font-semibold text-slate-800">
                                {r.reviewed_by_name} ({new Date(r.reviewed_at).toLocaleDateString()})
                              </div>
                              <div className="text-[10px] text-slate-500 truncate" title={r.review_remarks}>
                                {r.review_remarks || "—"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Awaiting review</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {r.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(r.id, r.request_no)}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          )}
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

      {/* TAB 2: HR / MANAGER APPROVAL DESK */}
      {activeTab === "approval_desk" && canApprove && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-rose-700 uppercase">Pending Review</span>
              <div className="text-xl font-black text-rose-800 mt-0.5">{allStats.pending}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">Approved This Month</span>
              <div className="text-xl font-black text-emerald-800 mt-0.5">{allStats.approved}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Rejected Requests</span>
              <div className="text-xl font-black text-slate-800 mt-0.5">{allStats.rejected}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-purple-700 uppercase">Reversals Processed</span>
              <div className="text-xl font-black text-purple-800 mt-0.5">{allStats.reversed}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-blue-700 uppercase">Total Queue</span>
              <div className="text-xl font-black text-blue-900 mt-0.5">{allStats.total}</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search staff name, ID, request #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAllRequests()}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {["PENDING", "APPROVED", "REJECTED", "REVERSED", "ALL"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAllFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    allFilter === f
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Approvals Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Staff Details</th>
                    <th className="py-3 px-3">Date & Type</th>
                    <th className="py-3 px-3">Original Punch</th>
                    <th className="py-3 px-3">Requested Correction</th>
                    <th className="py-3 px-3">Reason & Proof</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {allLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading regularization requests queue...
                      </td>
                    </tr>
                  ) : allRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <LuFileText className="mx-auto mb-2 text-slate-300" size={32} />
                        No requests found in this queue.
                      </td>
                    </tr>
                  ) : (
                    allRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{r.employee_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {r.employee_id} • {r.department}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{r.request_no}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{r.attendance_date}</div>
                          <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                            {getRequestTypeLabel(r.request_type)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-500 font-mono text-[11px]">
                            {r.original_check_in || "—"} to {r.original_check_out || "—"}
                          </div>
                          <div className="text-[10px] text-rose-600 font-bold uppercase mt-0.5">
                            {r.original_status || "Absent"}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {r.requested_check_in} – {r.requested_check_out}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            {r.requested_status} • {r.calculated_work_hours || 9.0} hrs
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-slate-700 truncate" title={r.reason}>
                            {r.reason}
                          </div>
                          {r.supporting_doc_url && (
                            <a
                              href={getUploadUrl(r.supporting_doc_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-[11px] inline-flex items-center gap-1 font-semibold mt-0.5"
                            >
                              <LuExternalLink size={12} /> View Proof Document
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-3">{renderStatusBadge(r.status)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      show: true,
                                      type: "APPROVE",
                                      record: r,
                                      remarks: "",
                                      reversalStatus: "Absent",
                                    })
                                  }
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                                  title="Approve & sync to live attendance log"
                                >
                                  <LuCheck size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      show: true,
                                      type: "REJECT",
                                      record: r,
                                      remarks: "",
                                      reversalStatus: "Absent",
                                    })
                                  }
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors"
                                  title="Reject request"
                                >
                                  <LuCircleX size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : r.status === "APPROVED" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setActionModal({
                                    show: true,
                                    type: "REVERSE",
                                    record: r,
                                    remarks: "",
                                    reversalStatus: "Absent",
                                  })
                                }
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Reverse approved regularization"
                              >
                                <LuRotateCcw size={12} />
                                <span>Reverse</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Reviewed</span>
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
      )}

      {/* MODAL 1: REQUEST ATTENDANCE REGULARIZATION */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <LuClock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Attendance Regularization</h3>
                  <p className="text-[11px] text-slate-500">Correct missed punches or request on-duty hours.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-5 space-y-4 text-xs">
              {/* Date Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discrepancy Attendance Date *</label>
                <input
                  type="date"
                  max={todayStr}
                  required
                  value={applyForm.attendance_date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Current Date Punch Preview Banner */}
              <div className="p-3 rounded-xl border text-xs flex items-center justify-between bg-slate-50 border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Recorded In System For This Date:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {lookupLoading ? (
                      <span className="text-slate-400">Looking up attendance record...</span>
                    ) : existingDateRecord ? (
                      <span>
                        Status: <strong className="text-rose-600">{existingDateRecord.status}</strong> (In: {existingDateRecord.check_in || "—"}, Out: {existingDateRecord.check_out || "—"})
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">Absent / No Check-In Punch Recorded</span>
                    )}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  {existingDateRecord ? "Log Found" : "No Punch"}
                </div>
              </div>

              {/* Request Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discrepancy Category *</label>
                <select
                  value={applyForm.request_type}
                  onChange={(e) => setApplyForm({ ...applyForm, request_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* In and Out Timings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Check-In *</label>
                  <input
                    type="time"
                    required
                    value={applyForm.requested_check_in}
                    onChange={(e) => setApplyForm({ ...applyForm, requested_check_in: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Check-Out *</label>
                  <input
                    type="time"
                    required
                    value={applyForm.requested_check_out}
                    onChange={(e) => setApplyForm({ ...applyForm, requested_check_out: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Target Status & Calculated Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Status</label>
                  <select
                    value={applyForm.requested_status}
                    onChange={(e) => setApplyForm({ ...applyForm, requested_status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Present">Present</option>
                    <option value="On Duty">On Duty / Client Visit</option>
                    <option value="WFH">WFH (Work From Home)</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Calculated Work Duration</label>
                  <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold font-mono">
                    {calculatedHours} Hours
                  </div>
                </div>
              </div>

              {/* Reason Explanation */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Explanation & Justification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Attended outdoor client audit at ABC Corp between 10 AM and 5 PM; could not punch biometric scanner. Approved by manager over email."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Proof File Attachment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Optional Proof Document (Email confirmation, Travel slip, Client note)
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 hover:border-blue-500 rounded-lg cursor-pointer text-xs font-medium text-slate-600">
                  <LuUpload className="text-blue-600" size={15} />
                  <span>{applyForm.proof_file ? applyForm.proof_file.name : "Choose File (PDF/Image up to 10MB)"}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setApplyForm({ ...applyForm, proof_file: e.target.files?.[0] || null })}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submittingApply ? "Submitting..." : "Submit Regularization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HR ACTION (APPROVE / REJECT / REVERSE) */}
      {actionModal.show && actionModal.record && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white ${
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-600"
                      : actionModal.type === "REJECT"
                      ? "bg-rose-600"
                      : "bg-purple-600"
                  }`}
                >
                  {actionModal.type === "APPROVE" ? (
                    <LuCheck size={20} />
                  ) : actionModal.type === "REJECT" ? (
                    <LuCircleX size={20} />
                  ) : (
                    <LuRotateCcw size={20} />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {actionModal.type === "APPROVE"
                      ? "Approve Attendance Regularization"
                      : actionModal.type === "REJECT"
                      ? "Reject Regularization Request"
                      : "Execute Attendance Reversal"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {actionModal.record.employee_name} ({actionModal.record.employee_id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal({ show: false, type: "APPROVE", record: null, remarks: "", reversalStatus: "Absent" })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Summary of request */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Discrepancy Date:</span>
                  <span className="font-bold text-slate-800">{actionModal.record.attendance_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-blue-700">
                    {getRequestTypeLabel(actionModal.record.request_type)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Correction:</span>
                  <span className="font-bold text-emerald-700">
                    {actionModal.record.requested_check_in} - {actionModal.record.requested_check_out} ({actionModal.record.requested_status})
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Staff Reason:</span>
                  <div className="text-slate-700 italic bg-white p-2 rounded border border-slate-200">
                    "{actionModal.record.reason}"
                  </div>
                </div>
              </div>

              {/* If Reverse: Target Status */}
              {actionModal.type === "REVERSE" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Reversion Status *</label>
                  <select
                    value={actionModal.reversalStatus}
                    onChange={(e) => setActionModal({ ...actionModal, reversalStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold"
                  >
                    <option value="Absent">Revert to Absent (Deduct Day)</option>
                    <option value="Half Day">Revert to Half Day</option>
                    <option value="Present">Force Mark Present</option>
                  </select>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {actionModal.type === "REJECT" ? "Rejection Reason * (Mandatory)" : "HR Audit Remarks"}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    actionModal.type === "APPROVE"
                      ? "e.g. Approved. Biometric machine sync confirmed with facilities."
                      : actionModal.type === "REJECT"
                      ? "e.g. Discrepancy reason could not be verified by reporting manager."
                      : "e.g. Regularization reversed due to audit discrepancy."
                  }
                  value={actionModal.remarks}
                  onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {actionModal.type === "APPROVE" && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] leading-relaxed">
                  <strong>Automatic Attendance Sync:</strong> Approving will immediately update the live Attendance record for {actionModal.record.attendance_date} with In: {actionModal.record.requested_check_in}, Out: {actionModal.record.requested_check_out}, and status: {actionModal.record.requested_status}.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal({ show: false, type: "APPROVE", record: null, remarks: "", reversalStatus: "Absent" })}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleActionExecute}
                  className={`px-5 py-2 text-white rounded-lg font-bold flex items-center gap-2 shadow-md disabled:opacity-50 ${
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : actionModal.type === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
                  }`}
                >
                  {actionLoading ? "Processing..." : actionModal.type === "APPROVE" ? "Confirm Approval" : actionModal.type === "REJECT" ? "Confirm Rejection" : "Confirm Reversal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
