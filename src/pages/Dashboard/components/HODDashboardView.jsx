import React, { useState, useEffect } from "react";
import { Row, Col, Table, Badge, ProgressBar, Modal, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuUsers,
  LuClock,
  LuBuilding2,
  LuShieldCheck,
  LuChevronRight,
  LuLaptop,
  LuUserMinus,
  LuTarget,
  LuTrendingUp,
  LuRefreshCw,
} from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import { getApiBaseUrl } from "../../../api/axios";

const API = getApiBaseUrl();

export default function HODDashboardView() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || localStorage.getItem("userName") || "Department Head";

  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState({
    departmentName: "IT",
    activeHeadcount: 14,
    newJoinersCount: 3,
    openRequisitions: [
      { id: 1, title: "Senior Developer", dept: "IT", count: 2, status: "Active Interviews" },
      { id: 2, title: "UI/UX Designer", dept: "Design", count: 2, status: "Active Interviews" },
      { id: 3, title: "Associate Engineer", dept: "IT", count: 2, status: "Active Interviews" },
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

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const resStats = await fetch(`${API}/hod/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataStats = await resStats.json();

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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

  return (
    <div className="hod-dashboard-section">
      {/* ROW 1: APPROVAL CENTER & TEAM OVERVIEW */}
      <Row className="g-3 mb-4">
        {/* TOP LEFT: APPROVAL CENTER */}
        <Col xs={12} lg={6}>
          <div className="dash-card p-4 h-100 border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-indigo-100/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                    <LuShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 m-0">Approval Center</h3>
                    <p className="text-[10px] text-slate-500 font-semibold m-0">
                      Team leave requests & active status
                    </p>
                  </div>
                </div>
                {(() => {
                  const pCount = (dashData.pendingLeaves || []).filter(
                    (l) => l.status === "Pending" || l.status === "Processing"
                  ).length;
                  return (
                    <Badge
                      bg={pCount > 0 ? "danger" : "secondary"}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-full"
                    >
                      {pCount} Pending
                    </Badge>
                  );
                })()}
              </div>

              {loading ? (
                <div className="space-y-3 py-2">
                  <div className="skeleton-pulse h-14 w-full bg-slate-100 rounded-xl animate-pulse"></div>
                  <div className="skeleton-pulse h-14 w-full bg-slate-100 rounded-xl animate-pulse"></div>
                </div>
              ) : dashData.pendingLeaves?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  <FaRegCircleCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  No leave requests found for {dashData.departmentName} Department.
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {[...dashData.pendingLeaves]
                    .sort((a, b) => {
                      const aPending = a.status === "Pending" || a.status === "Processing";
                      const bPending = b.status === "Pending" || b.status === "Processing";
                      if (aPending && !bPending) return -1;
                      if (!aPending && bPending) return 1;
                      return (
                        new Date(b.created_at || b.start_date || 0) -
                        new Date(a.created_at || a.start_date || 0)
                      );
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

                      const startDateFormatted = (l.start_date || "")
                        .split("T")[0]
                        .split("-")
                        .reverse()
                        .join("-");
                      const endDateFormatted = (l.end_date || "")
                        .split("T")[0]
                        .split("-")
                        .reverse()
                        .join("-");

                      return (
                        <div
                          key={l.id}
                          className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col gap-2 shadow-2xs hover:border-indigo-200 transition-all mb-2"
                        >
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
                                  borderColor: statusStyle.border,
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
                            📅 <strong>{startDateFormatted}</strong> →{" "}
                            <strong>{endDateFormatted}</strong>
                            {l.reason && (
                              <span className="block text-slate-500 mt-0.5">
                                💬 <em>"{l.reason}"</em>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-0.5">
                            <div className="text-[10px] font-bold text-slate-400">
                              {isPending
                                ? `Submitted: ${
                                    l.created_at
                                      ? new Date(l.created_at).toLocaleDateString()
                                      : "Recently"
                                  }`
                                : `Approver: ${l.approver || "HOD"}`}
                            </div>
                            {isPending && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setRejectingLeaveId(l.id);
                                    setShowRejectModal(true);
                                  }}
                                  className="px-3 py-1 text-xs font-bold rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleQuickLeaveAction(l.id, "Approved")}
                                  className="px-3 py-1 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
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

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Leave Management Portal:</span>
              <button
                onClick={() => navigate("/leave")}
                className="text-indigo-600 font-bold flex items-center gap-1 hover:underline"
              >
                View All Requests <LuChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Col>

        {/* TOP RIGHT: TEAM OVERVIEW WIDGET */}
        <Col xs={12} lg={6}>
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <LuUsers className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 m-0">Team Overview</h3>
                    <p className="text-[10px] text-slate-500 font-semibold m-0">
                      Active headcount & capacity utilization
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchDashboardStats}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  title="Refresh stats"
                >
                  <LuRefreshCw className="h-4 w-4" />
                </button>
              </div>

              <Row className="g-3 mb-4">
                <Col xs={4}>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Active Staff
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">
                      {dashData.activeHeadcount}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 mt-1">
                      +2 this month
                    </div>
                  </div>
                </Col>

                <Col xs={4}>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      New Joiners
                    </div>
                    <div className="text-2xl font-extrabold text-blue-600 mt-1">
                      {dashData.newJoinersCount}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 mt-1">
                      Last 30 Days
                    </div>
                  </div>
                </Col>

                <Col xs={4}>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Open Positions
                    </div>
                    <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                      {dashData.openRequisitions?.length || 3}
                    </div>
                    <div className="text-[10px] font-bold text-indigo-600 mt-1">
                      Active Hiring
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Capacity Progress Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Department Capacity Utilized</span>
                  <span className="text-indigo-600 font-extrabold">
                    {dashData.attendanceSnapshot?.capacityUtilized || 86}%
                  </span>
                </div>
                <ProgressBar
                  now={dashData.attendanceSnapshot?.capacityUtilized || 86}
                  variant="primary"
                  style={{ height: "8px", borderRadius: "9999px" }}
                />
                <div className="text-[10px] font-medium text-slate-400 mt-1">
                  Optimal workload allocation across active team projects.
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ROW 2: ATTENDANCE & SHIFT STATUS TODAY + PERFORMANCE OKRs */}
      <Row className="g-3 mb-4">
        {/* Attendance & Shift Status Today */}
        <Col xs={12} lg={7}>
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <LuClock className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 m-0">
                      Attendance & Shift Status Today (Department-wise)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold m-0">
                      Real-time snapshot of in-office, remote (WFH), & on leave staff
                    </p>
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
                      <div className="text-xs font-extrabold text-slate-900">
                        {dashData.attendanceSnapshot?.inOffice || 10} Staff
                      </div>
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
                      <div className="text-xs font-extrabold text-slate-900">
                        {dashData.attendanceSnapshot?.wfh || 3} Staff
                      </div>
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
                      <div className="text-xs font-extrabold text-slate-900">
                        {dashData.attendanceSnapshot?.onLeave || 1} Staff
                      </div>
                      <div className="text-[10px] font-bold text-purple-700">On Leave (12%)</div>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* 7-Day Attendance Trend Curve */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <LuTrendingUp className="text-blue-600" /> 7-Day Department Attendance Trend
                  </span>
                  <span className="text-slate-400 font-semibold text-[11px]">Mon - Sun</span>
                </div>

                <div className="relative h-28 w-full flex items-end justify-between px-2 pt-4">
                  <svg
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 50"
                  >
                    <path
                      d="M 0 35 Q 15 20, 30 15 T 60 25 T 90 10 L 100 20"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                    />
                  </svg>

                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
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

        {/* Performance & Department OKRs */}
        <Col xs={12} lg={5}>
          <div className="dash-card p-4 h-100 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <LuTarget className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 m-0">
                      Performance & Department OKRs
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold m-0">
                      Progress on key department goals
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/appraisal")}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  View OKRs
                </button>
              </div>

              <div className="space-y-3">
                {dashData.departmentOKRs?.map((okr) => (
                  <div
                    key={okr.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                      <span>{okr.title}</span>
                      <span className="text-purple-700 font-extrabold">{okr.progress}%</span>
                    </div>
                    <ProgressBar
                      now={okr.progress}
                      variant="info"
                      style={{ height: "6px", borderRadius: "9999px" }}
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-semibold">
                      <span>
                        Status: <strong className="text-slate-700">{okr.status}</strong>
                      </span>
                      <span>Target: Q3 End</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Upcoming Review Cycle:</span>
              <span className="font-extrabold text-slate-800 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                Sept 15 1-on-1s Due
              </span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ROW 3: DIRECT REPORTS */}
      <div className="dash-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <LuUsers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Direct Reports ({dashData.directReports?.length || 2})
              </h3>
              <p className="text-xs text-slate-500 font-semibold m-0 mt-0.5">
                Roster of direct team members reporting to {dashData.departmentName || "IT"} Department
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/manage-employees")}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors border border-indigo-200"
          >
            Manage Department Team →
          </button>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-custom mb-0 align-middle">
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
              {dashData.directReports && dashData.directReports.length > 0 ? (
                dashData.directReports.map((emp) => (
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
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                          emp.workMode === "In-Office"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {emp.workMode || "In-Office"}
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
                ))
              ) : (
                <>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="font-bold text-slate-900 text-xs">EMP-1042</td>
                    <td className="font-bold text-slate-900 text-xs">Aarav Sharma</td>
                    <td className="text-xs text-slate-600 font-medium">Senior Frontend Engineer</td>
                    <td>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700">
                        IT
                      </span>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        In-Office
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => navigate(`/employee/profile/EMP-1042`)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="font-bold text-slate-900 text-xs">EMP-1049</td>
                    <td className="font-bold text-slate-900 text-xs">Priya Patel</td>
                    <td className="text-xs text-slate-600 font-medium">Fullstack Developer</td>
                    <td>
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700">
                        IT
                      </span>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                        WFH
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => navigate(`/employee/profile/EMP-1049`)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* REJECT LEAVE MODAL */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-sm font-bold text-slate-900">
            Reject Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label className="text-xs font-semibold text-slate-600">
              Reason for rejection (Optional)
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Provide a reason for the employee..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs rounded-xl"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            size="sm"
            onClick={() => setShowRejectModal(false)}
            className="rounded-xl text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleQuickLeaveAction(rejectingLeaveId, "Rejected", rejectReason)}
            className="rounded-xl text-xs font-bold"
          >
            Confirm Rejection
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
