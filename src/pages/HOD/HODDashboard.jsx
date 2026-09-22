import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, ProgressBar, Form, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuUsers,
  // LuUserPlus,
  // LuBriefcase,
  // LuCheckCircle2,
  // LuXCircle,
  LuClock,
  // LuCalendar,
  LuTrendingUp,
  LuBuilding2,
  LuShieldCheck,
  LuFileText,
  LuPlus,
  LuChevronRight,
  LuLaptop,
  LuUserCheck,
  LuUserMinus,
  // LuDollarSign,
  LuTarget,
  // LuAward,
  // LuAlertCircle,
  LuRefreshCw
} from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import { FaRegTimesCircle } from "react-icons/fa";
import { getApiBaseUrl } from "../../api/axios";
import { exportToExcel } from "../../utils/excelExport";

const API = getApiBaseUrl();

const HODDashboard = () => {
  const navigate = useNavigate();

  // Active User Context & RBAC
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || localStorage.getItem("userName") || "Department Head";
  const userEmpId = storedUser.employee_id || localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";

  // Data States
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState({
    departmentName: "IT",
    activeHeadcount: 14,
    newJoinersCount: 3,
    openRequisitions: [
      { id: 1, title: "Senior Developer", dept: "IT", count: 2, status: "Active Interviews" },
      { id: 2, title: "UI/UX Designer", dept: "Design", count: 2, status: "Active Interviews" },
      { id: 3, title: "Associate Engineer", dept: "IT", count: 2, status: "Active Interviews" },
      { id: 4, title: "Lead Engineer", dept: "IT", count: 1, status: "Shortlisting" },
      { id: 5, title: "Product Analyst", dept: "IT", count: 1, status: "Screening" }
    ],
    pendingLeaves: [],
    attendanceSnapshot: { inOffice: 10, wfh: 3, onLeave: 1, capacityUtilized: 86 },
    departmentOKRs: [
      { id: 1, title: "Deliver Q3 Enterprise Release", progress: 88, status: "On Track" },
      { id: 2, title: "Reduce UI Bug Backlog", progress: 72, status: "In Progress" },
      { id: 3, title: "Team Upskilling & Certifications", progress: 90, status: "Ahead" }
    ],
    directReports: []
  });

  // Action States
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState({ title: "", count: 1, priority: "High", reason: "" });
  const [savingReq, setSavingReq] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);

  // Today Clock & Attendance States
  const [liveTime, setLiveTime] = useState(new Date());
  const [checking, setChecking] = useState(false);
  const [todayStatus, setTodayStatus] = useState({
    checkedIn: false,
    checkedOut: false,
    checkInTime: null,
    checkOutTime: null,
    record: null
  });

  // Rejection Comment Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Live Ticking Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch HOD Today Attendance Status
  const fetchTodayAttendance = async () => {
    try {
      const res = await fetch(`${API}/attendance/today-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTodayStatus({
          checkedIn: data.checkedIn || false,
          checkedOut: data.checkedOut || false,
          checkInTime: data.record?.check_in || null,
          checkOutTime: data.record?.check_out || null,
          record: data.record || null
        });
      }
    } catch (err) {
      console.error("Error fetching today attendance:", err);
    }
  };

  // Fetch Dashboard Stats & Real-Time Pending Leaves
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch HOD Dashboard Data
      const resStats = await fetch(`${API}/hod/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataStats = await resStats.json();

      // 2. Fetch Real-time Leave Requests for HOD's Department
      const resLeaves = await fetch(`${API}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataLeaves = await resLeaves.json();

      let realTeamLeaves = [];
      if (dataLeaves.success && Array.isArray(dataLeaves.data)) {
        realTeamLeaves = dataLeaves.data;
      }

      if (dataStats.success && dataStats.data) {
        setDashData({
          ...dataStats.data,
          pendingLeaves: realTeamLeaves.length > 0 ? realTeamLeaves : (dataStats.data.pendingLeaves || [])
        });
      }
    } catch (err) {
      console.error("Error fetching HOD dashboard data:", err);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchTodayAttendance();
  }, []);

  // Handle HOD Check-In
  const handleCheckIn = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API}/attendance/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Checked in successfully!");
        fetchTodayAttendance();
        fetchDashboardStats();
      } else {
        toast.error(data.error || "Check-in failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Check-in request failed");
    } finally {
      setChecking(false);
    }
  };

  // Handle HOD Check-Out
  const handleCheckOut = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API}/attendance/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Checked out successfully!");
        fetchTodayAttendance();
        fetchDashboardStats();
      } else {
        toast.error(data.error || "Check-out failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Check-out request failed");
    } finally {
      setChecking(false);
    }
  };

  // Quick Action Approve / Reject Leave
  const handleQuickLeaveAction = async (leaveId, newStatus, comments = "") => {
    try {
      const res = await fetch(`${API}/leave/${leaveId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          comments: comments || `Processed by HOD ${userName}`
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Leave request ${newStatus.toLowerCase()} successfully!`);
        setShowRejectModal(false);
        setRejectReason("");
        fetchDashboardStats();
      } else {
        toast.error(data.error || "Failed to update leave");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating leave status.");
    }
  };

  // Submit Open Requisition Form
  const handleReqSubmit = (e) => {
    e.preventDefault();
    setSavingReq(true);
    setTimeout(() => {
      toast.success(`Requisition submitted for ${reqForm.count} x ${reqForm.title}! Sent to HR for approval.`);
      setSavingReq(false);
      setShowReqModal(false);
      setReqForm({ title: "", count: 1, priority: "High", reason: "" });
    }, 600);
  };

  // Export Department Report (Excel)
  const handleExportReport = () => {
    const headers = ["Employee ID", "Name", "Role", "Department", "Status", "Work Mode"];
    const rows = (dashData.directReports || []).map((r) => [
      r.employee_id || "",
      r.name || "",
      r.role || "",
      r.dept || "",
      r.status || "",
      r.workMode || ""
    ]);

    exportToExcel({
      data: [headers, ...rows],
      fileName: `HOD_${dashData.departmentName || "Dept"}_Report_Q3_2026.xlsx`,
      sheetName: `${dashData.departmentName || "Dept"} Report`,
    });

    toast.success("Department Report exported to Excel successfully!");
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="max-w-6xl mx-auto pb-16 pt-6">
      {/* Custom Styles */}
      <style>{`
        .hod-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.03);
          transition: all 0.25s ease;
        }
        .hod-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }
        .table-hod th {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .table-hod td {
          font-size: 12px;
          color: #1e293b;
          padding: 12px 14px;
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

      {/* HEADER BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">HOD Management Dashboard</h1>
              <span className="bg-amber-50 text-amber-700 text-[11px] font-extrabold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <LuBuilding2 className="h-3.5 w-3.5" /> {dashData.departmentName} Department
              </span>
              <span className="bg-slate-100 text-slate-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
                Q3 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold m-0 mt-1">
              Welcome back, {userName}! <br /> Real-time department headcount, pending approvals, shift status, and OKR progress.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
              title="Export Department Report (Excel)"
            >
              <LuFileText className="h-4 w-4 text-slate-500" /> Department Report
            </button>
            <button
              onClick={() => setShowReqModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
            >
              <LuPlus className="h-4 w-4" /> Open Requisition
            </button>
          </div>
        </div>
      </div>

      <Container fluid className="px-4 max-w-7xl mx-auto">
        {/* TODAY CLOCK & ATTENDANCE ACTION WIDGET */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <LuClock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily Attendance Clock</div>
              <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                {liveTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                <span className="text-xs font-bold text-slate-500">
                  ({liveTime.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })})
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Badge */}
            <div className="text-right mr-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today Status</div>
              {todayStatus.checkedOut ? (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold flex items-center gap-1">
                  Checked Out ({todayStatus.checkOutTime || "Completed"})
                </span>
              ) : todayStatus.checkedIn ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center gap-1">
                  Checked In ({todayStatus.checkInTime || "Active"})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-extrabold flex items-center gap-1">
                  Not Checked In
                </span>
              )}
            </div>

            {/* Check-In Button */}
            <button
              onClick={handleCheckIn}
              disabled={checking || todayStatus.checkedIn || todayStatus.checkedOut}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <LuUserCheck className="h-4 w-4" /> Check In
            </button>

            {/* Check-Out Button */}
            <button
              onClick={handleCheckOut}
              disabled={checking || !todayStatus.checkedIn || todayStatus.checkedOut}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <LuUserMinus className="h-4 w-4" /> Check Out
            </button>
          </div>
        </div>

        {/* ROW 1: APPROVAL CENTER (URGENT PENDING ACTIONS AT TOP LEFT) & TEAM OVERVIEW */}
        <Row className="g-4 mb-6">
          {/* TOP LEFT: APPROVAL CENTER (HIGH PRIORITY ACTION DRAWER) */}
          <Col xs={12} lg={6}>
            <div className="hod-card h-full border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-indigo-100/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                      <LuShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 m-0">Approval Center</h3>
                      <p className="text-[10px] text-slate-500 font-semibold m-0">Team leave requests & active status</p>
                    </div>
                  </div>
                  {(() => {
                    const pCount = (dashData.pendingLeaves || []).filter(l => l.status === "Pending" || l.status === "Processing").length;
                    return (
                      <Badge bg={pCount > 0 ? "danger" : "secondary"} className="text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                        {pCount} Pending
                      </Badge>
                    );
                  })()}
                </div>

                {loading ? (
                  <div className="space-y-3 py-2">
                    <div className="skeleton-pulse h-14 w-full"></div>
                    <div className="skeleton-pulse h-14 w-full"></div>
                  </div>
                ) : dashData.pendingLeaves?.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <FaRegCircleCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    No leave requests found for {dashData.departmentName} Department.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {[...dashData.pendingLeaves]
                      .sort((a, b) => {
                        const aPending = a.status === "Pending" || a.status === "Processing";
                        const bPending = b.status === "Pending" || b.status === "Processing";
                        if (aPending && !bPending) return -1;
                        if (!aPending && bPending) return 1;
                        return new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0);
                      })
                      .map((l) => {
                        const isPending = l.status === "Pending" || l.status === "Processing";
                        const isApproved = l.status === "Approved";
                        const isRejected = l.status === "Rejected";

                        const statusStyle = isApproved
                          ? { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" }
                          : isRejected
                          ? { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" }
                          : { bg: "#fffbeb", color: "#b45309", border: "#fde68a" };

                        const startDateFormatted = (l.start_date || "").split("T")[0].split("-").reverse().join("-");
                        const endDateFormatted = (l.end_date || "").split("T")[0].split("-").reverse().join("-");

                        return (
                          <div key={l.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-col gap-2.5 shadow-2xs hover:border-indigo-200 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                                {l.name}
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {l.employee_id || "EMP"}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  {l.leave_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border"
                                  style={{
                                    backgroundColor: statusStyle.bg,
                                    color: statusStyle.color,
                                    borderColor: statusStyle.border
                                  }}
                                >
                                  {l.status}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                  {l.total_days} Day{l.total_days > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-600 font-medium">
                              📅 <strong>{startDateFormatted}</strong> → <strong>{endDateFormatted}</strong>
                              {l.reason && <span className="block text-slate-500 mt-0.5">💬 <em>"{l.reason}"</em></span>}
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-0.5">
                              <div className="text-[10px] font-bold text-slate-400">
                                {isPending
                                  ? `Submitted: ${l.created_at ? new Date(l.created_at).toLocaleDateString() : "Recently"}`
                                  : `Approver: ${l.approver || "HOD"}`}
                              </div>
                              {isPending && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setRejectingLeaveId(l.id);
                                      setShowRejectModal(true);
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleQuickLeaveAction(l.id, "Approved")}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                                  >
                                    Approve Request
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Leave Management Portal:</span>
                <button onClick={() => navigate("/leave")} className="text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                  View All Requests <LuChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Col>

          {/* TOP RIGHT: TEAM OVERVIEW WIDGET */}
          <Col xs={12} lg={6}>
            <div className="hod-card h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <LuUsers className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 m-0">Team Overview</h3>
                      <p className="text-[10px] text-slate-500 font-semibold m-0">Active headcount & capacity utilization</p>
                    </div>
                  </div>
                  <button onClick={fetchDashboardStats} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <LuRefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <Row className="g-3 mb-4">
                  <Col xs={4}>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</div>
                      <div className="text-2xl font-extrabold text-slate-900 mt-1">{dashData.activeHeadcount}</div>
                      <div className="text-[10px] font-bold text-emerald-600 mt-1">+2 this month</div>
                    </div>
                  </Col>

                  <Col xs={4}>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Joiners</div>
                      <div className="text-2xl font-extrabold text-blue-600 mt-1">{dashData.newJoinersCount}</div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-1">Last 30 Days</div>
                    </div>
                  </Col>

                  <Col xs={4}>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Positions</div>
                      <div className="text-2xl font-extrabold text-indigo-600 mt-1">{dashData.openRequisitions?.length || 3}</div>
                      <div className="text-[10px] font-bold text-indigo-600 mt-1">Active Hiring</div>
                    </div>
                  </Col>
                </Row>

                {/* Capacity Progress Bar */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Department Capacity Utilized</span>
                    <span className="text-indigo-600 font-extrabold">{dashData.attendanceSnapshot?.capacityUtilized || 86}%</span>
                  </div>
                  <ProgressBar now={dashData.attendanceSnapshot?.capacityUtilized || 86} variant="indigo" style={{ height: "8px", borderRadius: "9999px" }} />
                  <div className="text-[10px] font-medium text-slate-400 mt-1">
                    Optimal workload allocation across active team projects.
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* ROW 2: ATTENDANCE & SHIFT STATUS TODAY (REAL-TIME SNAPSHOT WITH SVG TREND GRAPH) */}
        <Row className="g-4 mb-6">
          <Col xs={12} lg={7}>
            <div className="hod-card h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <LuClock className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 m-0">Attendance & Shift Status Today</h3>
                      <p className="text-[10px] text-slate-500 font-semibold m-0">Real-time snapshot of in-office, remote (WFH), & on leave staff</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Today
                  </span>
                </div>

                <Row className="g-3 mb-4">
                  <Col xs={4}>
                    <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                        <LuBuilding2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{dashData.attendanceSnapshot?.inOffice || 10} Staff</div>
                        <div className="text-[10px] font-bold text-emerald-700">In-Office (67%)</div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={4}>
                    <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                        <LuLaptop className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{dashData.attendanceSnapshot?.wfh || 3} Staff</div>
                        <div className="text-[10px] font-bold text-blue-700">Working WFH (21%)</div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={4}>
                    <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-600 text-white">
                        <LuUserMinus className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{dashData.attendanceSnapshot?.onLeave || 1} Staff</div>
                        <div className="text-[10px] font-bold text-purple-700">On Leave (12%)</div>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* Clean SVG Line Graph Visualization for 7-Day Attendance Trend */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <LuTrendingUp className="text-blue-600" /> 7-Day Department Attendance Trend
                    </span>
                    <span className="text-slate-400 font-semibold text-[11px]">Mon - Sun</span>
                  </div>

                  <div className="relative h-28 w-full flex items-end justify-between px-2 pt-4">
                    {/* SVG Curve Line */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 50">
                      <path
                        d="M 0 35 Q 15 20, 30 15 T 60 25 T 90 10 L 100 20"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                      />
                    </svg>

                    {/* Day Points */}
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                      <div key={day} className="flex flex-col items-center z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-xs mb-1"></div>
                        <span className="text-[10px] font-bold text-slate-500">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* ROW 2 RIGHT: PERFORMANCE & DEPARTMENT OKRs */}
          <Col xs={12} lg={5}>
            <div className="hod-card h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <LuTarget className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 m-0">Performance & Department OKRs</h3>
                      <p className="text-[10px] text-slate-500 font-semibold m-0">Progress on key department goals</p>
                    </div>
                  </div>
                  <button onClick={() => navigate("/appraisal")} className="text-xs font-bold text-indigo-600 hover:underline">
                    View OKRs
                  </button>
                </div>

                <div className="space-y-4">
                  {dashData.departmentOKRs?.map((okr) => (
                    <div key={okr.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                        <span>{okr.title}</span>
                        <span className="text-purple-700 font-extrabold">{okr.progress}%</span>
                      </div>
                      <ProgressBar now={okr.progress} variant="purple" style={{ height: "6px", borderRadius: "9999px" }} />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-semibold">
                        <span>Status: <strong className="text-slate-700">{okr.status}</strong></span>
                        <span>Target: Q3 End</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Upcoming Review Cycle:</span>
                <span className="font-extrabold text-slate-800 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Sept 15 1-on-1s Due
                </span>
              </div>
            </div>
          </Col>
        </Row>

        {/* ROW 3: DIRECT REPORTS & ROLE-BASED ACCESS CONTROL VIEW */}
        <div className="hod-card shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <LuUsers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Direct Reports ({dashData.directReports?.length || 8})
                </h3>
                <p className="text-xs text-slate-500 font-semibold m-0 mt-0.5">
                  Roster of direct team members reporting to {dashData.departmentName} Department
                </p>
              </div>
            </div>

            {/* Role-Based Compensation Control Notice Button */}
            <button
              onClick={() => setShowCompModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors border border-slate-200"
            >
              <LuShieldCheck className="h-4 w-4 text-emerald-600" /> Scoped Role-Based Access Active
            </button>
          </div>

          <div className="overflow-x-auto">
            <Table className="table-hod mb-0 align-middle">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Designated Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Today Work Mode</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {dashData.directReports?.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-bold text-slate-900 text-xs">{emp.employee_id}</td>
                    <td className="font-bold text-slate-900 text-xs">{emp.name}</td>
                    <td className="text-xs text-slate-600 font-medium">{emp.role}</td>
                    <td>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700">
                        {emp.dept}
                      </span>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${emp.workMode === "In-Office" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                        {emp.workMode}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => navigate(`/employee/profile/${emp.employee_id}`)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Container>

      {/* OPEN REQUISITION MODAL */}
      <Modal show={showReqModal} onHide={() => setShowReqModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuPlus className="text-indigo-600" /> Open Position Requisition
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Form onSubmit={handleReqSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-slate-700">Position Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                value={reqForm.title}
                onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                required
                className="text-xs py-2.5 rounded-xl"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Headcount Needed</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={reqForm.count}
                  onChange={(e) => setReqForm({ ...reqForm, count: e.target.value })}
                  required
                  className="text-xs py-2 rounded-xl"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-slate-700">Priority Level</Form.Label>
                <Form.Select
                  value={reqForm.priority}
                  onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                  className="text-xs py-2 rounded-xl"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-slate-700">Business Justification</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe project demand or team capacity gap..."
                value={reqForm.reason}
                onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setShowReqModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingReq} className="bg-indigo-600 text-xs font-bold rounded-xl border-0">
                {savingReq ? "Submitting..." : "Submit Requisition"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ROLE-BASED ACCESS CONTROL INFORMATION MODAL */}
      <Modal show={showCompModal} onHide={() => setShowCompModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <LuShieldCheck className="text-emerald-600" /> Scoped Role-Based Access Info
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <div className="space-y-3 text-xs text-slate-600">
            <p className="m-0 font-medium">
              In compliance with enterprise HR security policies, <strong>compensation and deep payroll figures are restricted</strong> to authorized HR and Finance administrators.
            </p>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 font-bold">
              As HOD for {dashData.departmentName}, your portal access is scoped to team performance, attendance, leave approvals, shift roster management, and hiring requisitions for your direct reports.
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* LEAVE REJECTION COMMENT MODAL */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered className="rounded-4">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-slate-900 fs-5 flex items-center gap-2">
            <FaRegTimesCircle className="text-rose-600" /> Reject Leave Request
          </Modal.Title>
        </Modal.Header>Approved by
        <Modal.Body className="pt-3">
          <Form onSubmit={(e) => {
            e.preventDefault();
            if (rejectingLeaveId) {
              handleQuickLeaveAction(rejectingLeaveId, "Rejected", rejectReason);
            }
          }}>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold text-slate-700">Reason for Rejection</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Provide feedback for the employee..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                className="text-xs rounded-xl"
              />
            </Form.Group>

            <div className="flex justify-end gap-2">
              <Button variant="light" onClick={() => setShowRejectModal(false)} className="text-xs font-semibold rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl border-0">
                Confirm Rejection
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default HODDashboard;
