import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  Form, Button, Card, Container, Row, Col,
  Badge, Table, ProgressBar, Alert, Spinner, Modal
} from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LuCalendarDays,
  LuCalendarPlus,
  LuHistory,
  LuCheckCheck,
  LuCheck,
  LuX,
  LuClock,
  LuBuilding2,
  LuUser,
  LuDownload,
  LuUpload,
  LuEye,
  LuTrash2,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuCircleAlert,
  LuShieldCheck,
  LuIndianRupee,
  LuBriefcase,
  LuFileText,
  LuFileSpreadsheet,
  LuChevronRight,
  LuArrowRight,
  LuInfo,
  LuSparkles,
  LuTrendingUp,
  LuUsers,
  LuFileCheck,
  LuCalendar,
  LuTriangleAlert
} from "react-icons/lu";

import { getApiBaseUrl, getBackendBaseUrl } from "../../api";
import toast from "react-hot-toast";

const API_BASE = getApiBaseUrl();
const UPLOAD_API = `${API_BASE}/leave/apply`;
const FILE_BASE = getBackendBaseUrl();

// ── LEAVE POLICIES (Indian Standard) ─────────────────────────
// Policy Rules:
// 1. Calculated YEARLY, not monthly.
// 2. Granted only AFTER BEING PERMANENT.
// 3. Exception: Non-permanent employees (Probation, Intern, Contractual) CAN also take Casual Leave (CL).
const LEAVE_POLICY = [
  { code: "CL", name: "Casual Leave", maxDays: 5, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0", permOnly: false, desc: "Annual Quota • Accessible to all staff (Permanent & Non-Permanent)" },
  { code: "SL", name: "Sick Leave", maxDays: 5, isPaid: true, requiresDoc: true, docThreshold: 3, gender: "All", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", permOnly: true, desc: "Annual Quota • Available only after permanent confirmation" },
  { code: "EL", name: "Earned Leave", maxDays: 12, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", permOnly: true, desc: "Annual Quota • Available only after permanent confirmation" },
  { code: "HL", name: "Holidays", maxDays: 10, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", permOnly: true, desc: "Annual Quota • Available only after permanent confirmation" },
  { code: "LOP", name: "Loss of Pay", maxDays: 0, isPaid: false, requiresDoc: false, docThreshold: 0, gender: "All", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", permOnly: false, desc: "Salary deduction applies as per India 26 working days standard" },
  { code: "ML", name: "Maternity Leave", maxDays: 90, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "Female", color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", permOnly: true, desc: "Annual Quota • Female permanent staff only" },
  { code: "PL", name: "Paternity Leave", maxDays: 5, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "Male", color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc", permOnly: true, desc: "Annual Quota • Male permanent staff only" },
  { code: "CO", name: "Comp Off", maxDays: 0, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All", color: "#f97316", bg: "#fff7ed", border: "#fed7aa", permOnly: false, desc: "Credited for approved weekend or holiday overtime duty" },
  { code: "BL", name: "Bereavement Leave", maxDays: 5, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", permOnly: true, desc: "Annual Quota • Compassionate leave for permanent staff" },
];

const WORKING_DAYS = 26;
const calcLOPDays = (taken, balance) => Math.max(0, taken - balance);
const calcPerDay = (gross, wd) => (gross && wd ? gross / wd : 0);
const calcLOPDeduction = (gross, wd, lop) => (gross && wd && lop ? parseFloat(((gross / wd) * lop).toFixed(2)) : 0);
const calcNetSalary = (gross, lopAmt) => (gross ? parseFloat((gross - lopAmt).toFixed(2)) : 0);
const getBalanceByCode = (list, code) => list.find(b => b.leave_code === code)?.balance ?? 0;

const APPROVAL_WORKFLOW = [
  { step: 1, action: "Employee Applies", desc: "Selects leave type, dates, reason & attachments" },
  { step: 2, action: "Team Lead / HOD", desc: "First-level review and departmental approval" },
  { step: 3, action: "HR Final Approval", desc: "Validates policy, documentation & balance deduction" },
  { step: 4, action: "Balance Updated", desc: "Live closing balance automatically adjusted in DB" },
  { step: 5, action: "Payroll LOP Sync", desc: "Loss of Pay deduction reflected in monthly salary" },
];

// ── Local Image Preview Portal ────────────────────────────────
const LocalImagePreview = ({ src, name }) => {
  const [preview, setPreview] = useState(null);
  return (
    <>
      <img
        src={src}
        alt={name || "preview"}
        onClick={() => setPreview(src)}
        className="rounded-3 border border-emerald-300 cursor-pointer object-cover shadow-2xs hover:scale-105 transition-transform"
        style={{ width: 44, height: 44 }}
      />
      {preview && ReactDOM.createPortal(
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            className="fixed top-5 right-5 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
          >
            ✕
          </button>
          <img
            src={preview}
            alt="full preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>,
        document.body
      )}
    </>
  );
};

// ── DocViewModal ──────────────────────────────────────────────
const DocViewModal = ({ url, isPDF, onClose }) =>
  ReactDOM.createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed top-5 right-5 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
      >
        ✕
      </button>
      {isPDF ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[92vw] h-[88vh] rounded-2xl overflow-hidden shadow-2xl bg-white"
        >
          <iframe src={url} title="Document Preview" width="100%" height="100%" className="border-0" />
        </div>
      ) : (
        <img
          src={url}
          alt="preview"
          onClick={(e) => e.stopPropagation()}
          className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
        />
      )}
    </div>,
    document.body
  );

// ── DocCell ───────────────────────────────────────────────────
const DocCell = ({ docPath }) => {
  const [broken, setBroken] = useState(false);
  const [preview, setPreview] = useState(null);

  if (!docPath) return <span className="text-slate-400 text-xs font-medium">—</span>;
  const cleanPath = docPath.replace(/\.jpg\.jpeg$/i, ".jpg").replace(/\.jpeg\.jpeg$/i, ".jpeg").replace(/\.png\.jpeg$/i, ".png");
  const isImage = /\.(jpg|jpeg|png)$/i.test(cleanPath);
  const isPDF = /\.pdf$/i.test(cleanPath);
  const url = `${FILE_BASE}${cleanPath}`;

  if (isImage && !broken) {
    return (
      <>
        <div className="relative group inline-block">
          <img
            src={url}
            alt="Medical Document"
            onClick={() => setPreview(url)}
            onError={() => setBroken(true)}
            className="w-10 h-10 object-cover rounded-xl border border-indigo-200 shadow-2xs cursor-pointer group-hover:scale-105 transition-transform"
          />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600" />
          </span>
        </div>
        {preview && <DocViewModal url={preview} isPDF={false} onClose={() => setPreview(null)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPreview(url)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
      >
        <LuFileText className="h-3.5 w-3.5" />
        <span>View Proof</span>
      </button>
      {preview && <DocViewModal url={preview} isPDF={isPDF || broken} onClose={() => setPreview(null)} />}
    </>
  );
};

// ── PDF Generator ─────────────────────────────────────────────
const generatePDF = (formData, grossSalary, balanceList) => {
  const doc = new jsPDF();
  const sal = parseFloat(grossSalary) || 0;
  const lopD = parseInt(formData.lop_days) || 0;
  const lopAmt = sal > 0 ? calcLOPDeduction(sal, WORKING_DAYS, lopD) : 0;
  const netSal = sal > 0 ? calcNetSalary(sal, lopAmt) : sal;
  const perDay = sal > 0 ? calcPerDay(sal, WORKING_DAYS).toFixed(2) : 0;

  doc.setFillColor(79, 70, 229); // Material Indigo
  doc.rect(0, 0, 220, 38, "F");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("ZENTELEX PVT. LTD.", 105, 16, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Leave Application & Salary Impact Slip", 105, 28, { align: "center" });

  autoTable(doc, {
    startY: 44,
    head: [["Employee Details", ""]],
    body: [
      ["Employee Name", formData.employee_name || "—"],
      ["Employee Code", formData.employee_code || "—"],
      ["Department", formData.department || "—"],
      ["Designation", formData.designation || "—"],
      ["Joining Date", formData.joining_date || "—"]
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], fontSize: 11 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } }
  });

  const leaveRows = [];
  if (formData.leave_type) leaveRows.push(["Leave Type", `${formData.leave_type} (${formData.leave_code || ""})`]);
  if (formData.from_date) leaveRows.push(["From Date", formData.from_date]);
  if (formData.to_date) leaveRows.push(["To Date", formData.to_date]);
  if (formData.total_days) leaveRows.push(["Total Days", String(formData.total_days)]);
  if (formData.reason) leaveRows.push(["Reason", formData.reason]);
  leaveRows.push(["LOP Days", lopD > 0 ? `${lopD} Day(s)` : "None (Fully Paid)"]);
  leaveRows.push(["Leave Status", formData.status || "Pending"]);
  if (formData.doc_original_name) {
    leaveRows.push(["Supporting Document", formData.doc_original_name]);
    leaveRows.push(["Document Status", "Uploaded & Verified"]);
  } else {
    leaveRows.push(["Supporting Document", "Not Uploaded"]);
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Leave Request Details", ""]],
    body: leaveRows,
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], fontSize: 11 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } }
  });

  if (sal > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Payroll & LOP Calculation Breakdown", ""]],
      body: [
        ["Gross Monthly Salary", `INR ${sal.toLocaleString("en-IN")}/-`],
        ["Monthly Working Days", String(WORKING_DAYS)],
        ["Per Day Salary Rate", `INR ${perDay}/-`],
        ["LOP Days Applied", `${lopD} Day(s)`],
        ["Total LOP Deduction", lopD > 0 ? `INR ${lopAmt.toLocaleString("en-IN")}/-` : "NIL (INR 0.00)"],
        ["Estimated Net Payable", `INR ${netSal.toLocaleString("en-IN")}/-`],
        ["Status", lopD > 0 ? "LOP Deduction Applicable" : "100% Paid Leave"]
      ],
      theme: "grid",
      headStyles: { fillColor: [245, 158, 11], fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } }
    });
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Leave Type", "Opening", "Accrued", "Availed", "Closing Balance"]],
    body: balanceList.map(b => [b.leave_type, String(b.opening), String(b.accrued), String(b.availed), String(b.balance)]),
    theme: "striped",
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 10 }
  });

  const y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Compliance Formulas Applied:", 20, y);
  doc.text("• Closing Balance = Opening + Accrued – Availed", 20, y + 5);
  doc.text("• LOP Days = Max(0, Days Requested – Eligible Remaining Balance)", 20, y + 10);
  doc.text("• Per Day Salary Rate = Gross Salary / 26 Working Days", 20, y + 15);
  doc.text("• LOP Deduction Amount = Per Day Salary Rate × LOP Days", 20, y + 20);
  doc.text("• Net Estimated Salary = Gross Salary – LOP Deduction", 20, y + 25);
  doc.text("System-generated official slip. ZENTELEX PVT. LTD. HRMS Portal.", 20, y + 34);

  doc.save(`Leave_Slip_${formData.employee_name || "Employee"}_${formData.from_date || "2026"}.pdf`);
};

// ============================================================
// MAIN COMPONENT: LEAVES PAGE (MATERIAL DESIGN 3)
// ============================================================
const LeavesPage = () => {
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (localStorage.getItem("role") || storedUser.role || "employee").toLowerCase();

  // Tab State
  const [activeTab, setActiveTab] = useState("approvals"); // Default to pending approvals for HR
  const [allLeaves, setAllLeaves] = useState([]);
  const [balanceList, setBalanceList] = useState([]);
  const [balanceLoad, setBalanceLoad] = useState(true);
  const [leavesLoad, setLeavesLoad] = useState(true);
  const [salary, setSalary] = useState("50000"); // Sensible default for live preview
  const [lastForm, setLastForm] = useState(null);

  // Search & Filter State for Leave History
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("All");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("All");

  // Approval comment state
  const [approvalComments, setApprovalComments] = useState({});
  const [processingId, setProcessingId] = useState(null);

  // Fetch Leaves
  const fetchLeaves = useCallback(async () => {
    setLeavesLoad(true);
    try {
      const res = await fetch(`${API_BASE}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllLeaves(data.data);
      } else if (Array.isArray(data)) {
        setAllLeaves(data);
      }
    } catch (e) {
      console.error("Error fetching leaves:", e);
    } finally {
      setLeavesLoad(false);
    }
  }, [token]);

  // Fetch Leave Balances
  const fetchBalance = useCallback(async () => {
    setBalanceLoad(true);
    try {
      const res = await fetch(`${API_BASE}/leave/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const b = data.data;
        const isPerm = b.isPermanent !== false;
        const list = [
          { leave_type: "Casual Leave", leave_code: "CL", opening: b.casual?.total ?? 5, balance: b.casual?.remaining ?? 5, accrued: b.casual?.total ?? 5, availed: b.casual?.used || 0, color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0", permOnly: false },
          { leave_type: "Sick Leave", leave_code: "SL", opening: b.sick?.total ?? (isPerm ? 5 : 0), balance: b.sick?.remaining ?? (isPerm ? 5 : 0), accrued: b.sick?.total ?? (isPerm ? 5 : 0), availed: b.sick?.used || 0, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", permOnly: true },
          { leave_type: "Earned Leave", leave_code: "EL", opening: b.earned?.total ?? (isPerm ? 12 : 0), balance: b.earned?.remaining ?? (isPerm ? 12 : 0), accrued: b.earned?.total ?? (isPerm ? 12 : 0), availed: b.earned?.used || 0, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", permOnly: true },
          { leave_type: "Holidays", leave_code: "HL", opening: b.holidays?.total ?? (isPerm ? 10 : 0), balance: b.holidays?.remaining ?? (isPerm ? 10 : 0), accrued: b.holidays?.total ?? (isPerm ? 10 : 0), availed: b.holidays?.used || 0, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", permOnly: true },
          { leave_type: "Maternity Leave", leave_code: "ML", opening: b.maternity?.total ?? 0, balance: b.maternity?.remaining ?? 0, accrued: b.maternity?.total ?? 0, availed: b.maternity?.used || 0, color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", permOnly: true },
          { leave_type: "Paternity Leave", leave_code: "PL", opening: b.paternity?.total ?? 0, balance: b.paternity?.remaining ?? 0, accrued: b.paternity?.total ?? 0, availed: b.paternity?.used || 0, color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc", permOnly: true }
        ];
        setBalanceList(list);
      }
    } catch (e) {
      console.error("Error fetching balance:", e);
    } finally {
      setBalanceLoad(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaves();
    fetchBalance();
  }, [fetchLeaves, fetchBalance]);

  // Handle Cancel Record
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) return;
    try {
      const res = await fetch(`${API_BASE}/leave/${id}/cancel`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave record cancelled successfully");
        fetchLeaves();
        fetchBalance();
      } else {
        toast.error(data.error || "Failed to cancel leave");
      }
    } catch (e) {
      toast.error("Error cancelling leave request");
    }
  };

  // Handle Approve / Reject
  const handleApprove = async (id, status) => {
    setProcessingId(id);
    try {
      const res = await fetch(`${API_BASE}/leave/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          comments: approvalComments[id] || (status === "Approved" ? "Approved by HR" : "Rejected by HR")
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully`);
        fetchLeaves();
        fetchBalance();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch (e) {
      toast.error("Network error while updating leave status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPDF = () => {
    if (!lastForm) {
      if (allLeaves.length > 0) {
        const latest = allLeaves[0];
        generatePDF({
          employee_name: latest.name || latest.employee_name,
          employee_code: latest.employee_id || latest.employee_code,
          department: latest.dept,
          leave_type: latest.leave_type,
          from_date: latest.start_date || latest.from_date,
          to_date: latest.end_date || latest.to_date,
          total_days: latest.total_days,
          reason: latest.reason,
          lop_days: latest.lop_days || 0,
          status: latest.status
        }, salary, balanceList);
        return;
      }
      toast.error("No leave records available to generate slip");
      return;
    }
    generatePDF(lastForm, salary, balanceList);
  };

  // Export Leave History to CSV
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) {
      toast.error("No records to export");
      return;
    }
    const headers = ["Employee Name", "Employee ID", "Department", "Leave Type", "Start Date", "End Date", "Total Days", "LOP Days", "Status", "Reason"];
    const rows = filteredHistory.map(l => [
      `"${l.name || l.employee_name || "Employee"}"`,
      `"${l.employee_id || l.employee_code || "—"}"`,
      `"${l.dept || "General"}"`,
      `"${l.leave_type || "—"}"`,
      `"${(l.start_date || l.from_date || "").slice(0, 10)}"`,
      `"${(l.end_date || l.to_date || "").slice(0, 10)}"`,
      l.total_days || 1,
      l.lop_days || 0,
      `"${l.status || "Pending"}"`,
      `"${(l.reason || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leave_History_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report downloaded successfully!");
  };

  // Filtered pending leaves & analytics
  const pendingLeaves = useMemo(() => allLeaves.filter(l => l.status === "Pending"), [allLeaves]);
  const approvedLeaves = useMemo(() => allLeaves.filter(l => l.status === "Approved"), [allLeaves]);
  const totalLopDaysCount = useMemo(() => allLeaves.reduce((acc, curr) => acc + (parseInt(curr.lop_days) || 0), 0), [allLeaves]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return allLeaves.filter(l => {
      const q = historySearch.toLowerCase();
      const matchesSearch =
        !q ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.employee_name && l.employee_name.toLowerCase().includes(q)) ||
        (l.employee_id && l.employee_id.toLowerCase().includes(q)) ||
        (l.employee_code && l.employee_code.toLowerCase().includes(q)) ||
        (l.leave_type && l.leave_type.toLowerCase().includes(q)) ||
        (l.reason && l.reason.toLowerCase().includes(q));

      const matchesStatus = historyStatusFilter === "All" || l.status === historyStatusFilter;
      const matchesType = historyTypeFilter === "All" || l.leave_type === historyTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allLeaves, historySearch, historyStatusFilter, historyTypeFilter]);

  const uniqueBalance = useMemo(() => {
    return balanceList.filter((item, index, self) =>
      index === self.findIndex((t) => t.leave_type === item.leave_type)
    );
  }, [balanceList]);

  // Real-time calculations
  const sal = parseFloat(salary) || 0;
  const perDay = sal > 0 ? calcPerDay(sal, WORKING_DAYS).toFixed(2) : 0;
  const totalLopAmount = sal > 0 ? calcLOPDeduction(sal, WORKING_DAYS, totalLopDaysCount) : 0;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* ── TOP MATERIAL APP BAR / HEADER ── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-white/95">
        <Container fluid className="px-4 py-3.5 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Context */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
                <LuCalendarDays className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight m-0">
                    Leave Management & Approvals
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live DB Synced
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                  India HR Policy Standard (26 Working Days) &bull; Automated Loss of Pay (LOP) Payroll Engine
                </p>
              </div>
            </div>

            {/* Quick Actions & Salary Engine Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Gross Salary Live Input with Material Elevation */}
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400 font-bold text-xs pointer-events-none">
                  ₹
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="Gross Salary (INR)"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="pl-7 pr-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all w-36 shadow-2xs"
                  title="Monthly base gross salary for real-time LOP deduction calculations"
                />
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => { fetchLeaves(); fetchBalance(); toast.success("Refreshed latest leave data"); }}
                className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all shadow-2xs cursor-pointer group"
                title="Refresh Records"
              >
                <LuRefreshCw className={`h-4 w-4 ${leavesLoad || balanceLoad ? "animate-spin text-indigo-600" : ""}`} />
              </button>

              {/* PDF Slip Download Button */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <LuDownload className="h-4 w-4" />
                <span>Export Leave Slip</span>
              </button>
            </div>
          </div>
        </Container>
      </div>

      <Container fluid className="px-4 pt-6 max-w-7xl mx-auto">
        {/* ── 4 PRIMARY KPI METRIC CARDS (MATERIAL 3 ELEVATION) ── */}
        <Row className="g-3 mb-5">
          {/* Card 1: Pending Approvals */}
          <Col xs={12} sm={6} lg={3}>
            <div
              onClick={() => setActiveTab("approvals")}
              className={`p-4 rounded-3xl bg-white border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group ${activeTab === "approvals" ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-200/80 hover:border-amber-300"
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pending Approvals
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                  <LuClock className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-slate-900 m-0">
                  {pendingLeaves.length}
                </h2>
                <span className="text-xs font-semibold text-amber-600">
                  {pendingLeaves.length === 1 ? "Request awaiting action" : "Requests awaiting action"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:underline">
                <span>View approval queue</span>
                <LuArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Col>

          {/* Card 2: Approved Leaves */}
          <Col xs={12} sm={6} lg={3}>
            <div
              onClick={() => { setActiveTab("history"); setHistoryStatusFilter("Approved"); }}
              className={`p-4 rounded-3xl bg-white border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group ${activeTab === "history" && historyStatusFilter === "Approved" ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-200/80 hover:border-emerald-300"
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Approved Leaves
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                  <LuCheckCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-slate-900 m-0">
                  {approvedLeaves.length}
                </h2>
                <span className="text-xs font-semibold text-emerald-600">
                  Total sanctioned
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>Healthy staff attendance rate</span>
              </div>
            </div>
          </Col>

          {/* Card 3: Total LOP Days */}
          <Col xs={12} sm={6} lg={3}>
            <div
              onClick={() => setActiveTab("reports")}
              className={`p-4 rounded-3xl bg-white border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group ${activeTab === "reports" ? "border-rose-400 ring-2 ring-rose-400/20" : "border-slate-200/80 hover:border-rose-300"
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Loss of Pay (LOP)
                </span>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                  <LuIndianRupee className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-rose-600 m-0">
                  {totalLopDaysCount} <span className="text-sm font-bold text-slate-500">Days</span>
                </h2>
                {sal > 0 && totalLopAmount > 0 && (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    -₹{totalLopAmount.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:underline">
                <span>View salary deduction breakdown</span>
                <LuArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Col>

          {/* Card 4: Total Applications Recorded */}
          <Col xs={12} sm={6} lg={3}>
            <div
              onClick={() => { setActiveTab("history"); setHistoryStatusFilter("All"); }}
              className={`p-4 rounded-3xl bg-white border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group ${activeTab === "history" && historyStatusFilter === "All" ? "border-indigo-400 ring-2 ring-indigo-400/20" : "border-slate-200/80 hover:border-indigo-300"
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  All Leave Records
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                  <LuHistory className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black text-slate-900 m-0">
                  {allLeaves.length}
                </h2>
                <span className="text-xs font-semibold text-indigo-600">
                  Lifetime requests
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>Filtered, searchable records</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* ── MATERIAL DESIGN SEGMENTED TABS ── */}
        <div className="bg-slate-200/60 p-1.5 rounded-2xl mb-6 inline-flex flex-wrap items-center gap-1 border border-slate-200 shadow-2xs w-full sm:w-auto">
          {[
            { id: "apply", label: "Apply Leave", icon: LuCalendarPlus },
            { id: "approvals", label: "Approvals Queue", icon: LuCheckCheck, badge: pendingLeaves.length, badgeVariant: "amber" },
            { id: "history", label: "Leave History", icon: LuHistory, badge: allLeaves.length, badgeVariant: "slate" },
            { id: "balances", label: "Policy & Balances", icon: LuShieldCheck },
            { id: "reports", label: "Admin Reports", icon: LuTrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-white text-indigo-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tab.badgeVariant === "amber" && tab.badge > 0
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-slate-200 text-slate-700"
                      }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB CONTENT ── */}
        <div>
          {/* ════════════════════════════════════════════════════════
              TAB 1: APPROVALS QUEUE (PENDING LEAVE REQUESTS)
             ════════════════════════════════════════════════════════ */}
          {activeTab === "approvals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">
                    Pending Leave Applications Awaiting Review
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Review incoming employee leaves, verify balance constraints, and make real-time decisions.
                  </p>
                </div>
                <Badge bg="warning" text="dark" className="px-3 py-1.5 rounded-pill font-semibold">
                  {pendingLeaves.length} Pending Actions
                </Badge>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                    <LuCheckCheck className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 m-0">All Clear! No Pending Leave Requests</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    All employee leave applications have been reviewed and resolved. New applications will appear here automatically.
                  </p>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-pill px-4 font-semibold"
                    onClick={() => setActiveTab("history")}
                  >
                    View Leave History
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingLeaves.map((req) => {
                    const isProcessing = processingId === req.id;
                    const days = parseFloat(req.total_days) || 1;
                    const eligBal = getBalanceByCode(balanceList, req.leave_type);
                    const willTriggerLop = days > eligBal;
                    const lopCount = calcLOPDays(days, eligBal);

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Request Header */}
                          <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm flex-shrink-0">
                                {(req.name || req.employee_name || "EM").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-1.5 flex-wrap">
                                  <span>{req.name || req.employee_name || "Employee"}</span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                                    {req.employee_id || req.employee_code || "EMP"}
                                  </span>
                                </h4>
                                <span className="text-xs font-semibold text-slate-500">
                                  {req.dept || "General"} Department
                                </span>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                              Pending Approval
                            </span>
                          </div>

                          {/* Request Details Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Leave Type
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {req.leave_type || "Casual Leave"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Duration
                              </span>
                              <span className="text-xs font-bold text-indigo-700">
                                {req.total_days} Day(s) ({req.day_type || "Full Day"})
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Date Span
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {(req.start_date || req.from_date || "").slice(0, 10)} &rarr; {(req.end_date || req.to_date || "").slice(0, 10)}
                              </span>
                            </div>
                          </div>

                          {/* Reason Quote */}
                          {req.reason && (
                            <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 border-l-4 border-indigo-400 text-xs text-slate-700 italic">
                              "{req.reason}"
                            </div>
                          )}

                          {/* Supporting Document View */}
                          {(req.doc_url || req.doc_path) && (
                            <div className="mb-3 flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                                <LuFileCheck className="h-4 w-4 text-indigo-600" />
                                <span>Attached Supporting Proof</span>
                              </span>
                              <DocCell docPath={req.doc_url || req.doc_path} />
                            </div>
                          )}

                          {/* Balance Assessment Callout */}
                          <div className="mb-3">
                            {willTriggerLop ? (
                              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                                <LuTriangleAlert className="h-4 w-4 text-rose-600 flex-shrink-0" />
                                <span>
                                  <strong>Exceeds Available Balance:</strong> Eligible balance is {eligBal}d. Approving will trigger <strong>{lopCount} Day(s) Loss of Pay (LOP)</strong>.
                                </span>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                                <LuShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                <span>
                                  <strong>Within Eligible Quota:</strong> Available balance is {eligBal}d. Fully paid leave without salary deductions.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Approval Actions Toolbar */}
                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Optional note for approval..."
                            value={approvalComments[req.id] || ""}
                            onChange={(e) => setApprovalComments({ ...approvalComments, [req.id]: e.target.value })}
                            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                          />
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(req.id, "Approved")}
                            className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                          >
                            <LuCheck className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(req.id, "Rejected")}
                            className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                          >
                            <LuX className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2: APPLY FOR LEAVE (MATERIAL DESIGN FORM)
             ════════════════════════════════════════════════════════ */}
          {activeTab === "apply" && (
            <Row className="g-4">
              {/* Left Column: Form */}
              <Col xs={12} lg={8}>
                <EmployeeLeaveForm
                  salary={salary}
                  balanceList={balanceList}
                  onSubmitSuccess={(fd) => {
                    setLastForm(fd);
                    fetchLeaves();
                    fetchBalance();
                    setActiveTab("history");
                  }}
                />
              </Col>

              {/* Right Column: Live Policy & Balance Health Sidebar */}
              <Col xs={12} lg={4}>
                <div className="space-y-4 sticky top-24">
                  {/* Live Balance Summary Card */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <LuShieldCheck className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 m-0">Leave Quota Balances</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active Accruals
                      </span>
                    </div>

                    <div className="space-y-3">
                      {uniqueBalance.map((b) => {
                        const pct = b.opening > 0 ? Math.min(100, Math.round((b.balance / b.opening) * 100)) : 0;
                        return (
                          <div key={`${b.employee_code || "all"}_${b.leave_code}`} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">{b.leave_type}</span>
                              <span className="font-mono text-slate-500">
                                <strong className="text-indigo-600 font-bold">{b.balance}</strong> / {b.opening} Days
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${b.balance <= 2 ? "bg-rose-500" : b.balance <= 5 ? "bg-amber-500" : "bg-indigo-600"
                                  }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* LOP Payroll Engine Information Card */}
                  <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-indigo-300">
                        <LuSparkles className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Payroll Rule Engine</span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2">Automated Loss of Pay (LOP)</h4>
                      <p className="text-xs text-indigo-200/90 leading-relaxed mb-3">
                        When leave days exceed an employee's accrued balance, the excess is automatically classified as <strong>Loss of Pay (LOP)</strong>. Deductions are calculated using the standard 26-day salary division rule.
                      </p>
                      <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono space-y-1">
                        <div>&bull; Daily Rate = Gross / 26</div>
                        <div>&bull; LOP Deduction = Daily Rate &times; LOP Days</div>
                        <div>&bull; Net Salary = Gross &minus; LOP Deduction</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 3: LEAVE HISTORY (MATERIAL DATA TABLE)
             ════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Table Controls Bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <LuHistory className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">All Leave Records</h3>
                    <p className="text-xs text-slate-400 m-0">
                      Historical audit log of all applied, approved, and cancelled leaves.
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search employee, reason..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl px-3.5 py-2 pl-8.5 bg-slate-50 hover:bg-white focus:bg-white text-slate-700 focus:outline-none focus:border-indigo-600 w-48 shadow-2xs"
                    />
                    <LuSearch className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="All">All Status ▾</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {/* Type Filter */}
                  <select
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="All">All Types ▾</option>
                    {LEAVE_POLICY.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {/* CSV Export Button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
                    title="Export table data to CSV"
                  >
                    <LuFileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
                    <span>CSV Export</span>
                  </button>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <Table hover responsive className="mb-0 align-middle text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">#</th>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Dates Span</th>
                      <th>LOP Impact</th>
                      <th>Reason</th>
                      <th>Medical Proof</th>
                      <th>Status</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leavesLoad ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-slate-400">
                          <Spinner animation="border" variant="primary" size="sm" />
                          <p className="mt-2 text-xs font-medium m-0">Loading leave applications...</p>
                        </td>
                      </tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                          No leave applications match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((l, idx) => {
                        const lop = parseInt(l.lop_days) || 0;
                        const statusColors = {
                          Approved: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
                          Pending: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
                          Rejected: { bg: "#fff1f2", color: "#9f1239", border: "#fecdd3" },
                          Cancelled: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
                        };
                        const sc = statusColors[l.status] || statusColors.Pending;

                        return (
                          <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                                  {(l.name || l.employee_name || "EM").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{l.name || l.employee_name || "Employee"}</div>
                                  <div className="text-[11px] font-mono text-slate-400">{l.employee_id || l.employee_code || "—"}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="font-semibold text-slate-800">{l.leave_type}</span>
                            </td>
                            <td>
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {l.total_days} Day(s)
                              </span>
                            </td>
                            <td className="font-medium text-slate-600 whitespace-nowrap">
                              {(l.start_date || l.from_date || "").slice(0, 10)} &rarr; {(l.end_date || l.to_date || "").slice(0, 10)}
                            </td>
                            <td>
                              {lop > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <LuCircleAlert className="h-3 w-3" />
                                  <span>{lop}d LOP</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <LuCheck className="h-3 w-3" />
                                  <span>Paid Leave</span>
                                </span>
                              )}
                            </td>
                            <td className="max-w-[200px] truncate text-slate-600" title={l.reason || "—"}>
                              {l.reason || "—"}
                            </td>
                            <td>
                              <DocCell docPath={l.doc_url || l.doc_path} />
                            </td>
                            <td>
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs"
                                style={{ backgroundColor: sc.bg, color: sc.color, borderColor: sc.border }}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td className="text-center">
                              {l.status === "Pending" ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(l.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Cancel Leave"
                                >
                                  <LuTrash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-slate-300 font-mono">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Table Footer */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                <span>Showing {filteredHistory.length} of {allLeaves.length} total applications</span>
                <span className="font-semibold text-slate-700">Official HRMS Record Log</span>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 4: POLICY & BALANCES (MATRIX VIEW)
             ════════════════════════════════════════════════════════ */}
          {activeTab === "balances" && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                    <LuShieldCheck className="h-5 w-5 text-indigo-600" />
                    <span>Company Leave Policy & Active Balance Quotas</span>
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-1">
                    India Statutory Leave Framework &bull; Formula: <strong>Closing Balance = Opening + Accrued &minus; Availed</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchBalance}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <LuRefreshCw className="h-3.5 w-3.5" />
                  <span>Sync DB Balances</span>
                </button>
              </div>

              {/* Statutory Policy Framework Callout */}
              <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-purple-50/50 rounded-2xl p-4 border border-indigo-100 mb-5 flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl flex-shrink-0 mt-0.5 shadow-xs">
                  <LuShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <div className="font-extrabold text-indigo-950 text-sm mb-1 flex items-center gap-2 flex-wrap">
                    <span>Yearly Allocation & Permanent Eligibility Rules</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-200/80 text-indigo-800">Annual Quota • Not Monthly</span>
                  </div>
                  <p className="m-0 text-slate-600 mb-1">
                    <strong>1. Annual Cadence:</strong> Leaves are calculated and allocated <strong>yearly</strong> across the company, not incrementally per month.
                  </p>
                  <p className="m-0 text-slate-600 mb-1">
                    <strong>2. Permanent Staff Benefits:</strong> Statutory paid categories (<strong>SL 5d</strong>, <strong>EL 12d</strong>, <strong>HL 10d</strong>, <strong>ML 90d</strong>, <strong>PL 5d</strong>) are unlocked <strong>exclusively after being permanent</strong>.
                  </p>
                  <p className="m-0 text-slate-600">
                    <strong>3. Casual Leave Exception:</strong> Non-permanent staff (Probation, Intern, Contractual) can also take <strong>Casual Leave (CL)</strong> (5 days yearly). Other leaves taken by non-permanent employees will incur <strong>Loss of Pay (LOP)</strong>.
                  </p>
                </div>
              </div>

              {/* 6 Grid Cards for Policy Types */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LEAVE_POLICY.map((policy) => {
                  const balObj = balanceList.find((b) => b.leave_code === policy.code);
                  const available = balObj ? balObj.balance : policy.maxDays;
                  const availed = balObj ? balObj.availed : 0;
                  const opening = balObj ? balObj.opening : policy.maxDays;

                  return (
                    <div
                      key={policy.code}
                      className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                          <span
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs"
                            style={{ backgroundColor: policy.bg, color: policy.color, border: `1px solid ${policy.border}` }}
                          >
                            {policy.code}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              policy.permOnly ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {policy.permOnly ? "Permanent Only" : "All Employees (Incl. Non-Perm)"}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {policy.isPaid ? "Paid Leave" : "Unpaid (LOP)"}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 mb-1">{policy.name}</h4>
                        <p className="text-xs text-slate-500 mb-4">
                          Annual Allotment: {policy.maxDays > 0 ? `${policy.maxDays} Days` : "As per requirement"} &bull; Gender: {policy.gender}
                        </p>

                        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl mb-4 text-center border border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Opening</span>
                            <span className="text-sm font-bold text-slate-700">{opening}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Availed</span>
                            <span className="text-sm font-bold text-amber-600">{availed}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Closing</span>
                            <span className="text-sm font-bold text-indigo-700">{available}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {policy.requiresDoc && (
                          <div className="text-[11px] font-medium text-amber-700 bg-amber-50 p-2 rounded-xl mb-3 border border-amber-200 flex items-center gap-1.5">
                            <LuTriangleAlert className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Medical proof mandatory if &gt; {policy.docThreshold} days</span>
                          </div>
                        )}
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="w-full rounded-xl text-xs font-bold"
                          onClick={() => {
                            setActiveTab("apply");
                          }}
                        >
                          Apply for {policy.code}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 5: ADMIN REPORTS & PAYROLL LOP BREAKDOWN
             ════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* LOP Simulator Engine */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                      <LuIndianRupee className="h-5 w-5 text-indigo-600" />
                      <span>Loss of Pay (LOP) Payroll Engine Simulator</span>
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Verify exactly how days without pay deduct from base monthly earnings.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Gross Monthly Salary:</span>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-32 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table bordered responsive className="text-xs mb-3">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th>Metric</th>
                        <th>Standard Value</th>
                        <th>Applied Formula</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold text-slate-800">Gross Monthly Salary</td>
                        <td className="font-bold text-slate-900 font-mono">₹{sal.toLocaleString("en-IN")}</td>
                        <td className="font-mono text-slate-500">Fixed Base</td>
                        <td className="text-slate-500">Set per employee contract</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-800">Standard Working Days</td>
                        <td className="font-mono font-bold text-slate-900">{WORKING_DAYS} Days</td>
                        <td className="font-mono text-slate-500">Fixed Statutory Standard</td>
                        <td className="text-slate-500">Excludes Sundays and standard holidays</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-800">Per Day Salary Rate</td>
                        <td className="font-mono font-bold text-indigo-700">₹{perDay} / day</td>
                        <td className="font-mono text-indigo-600">= Gross / {WORKING_DAYS}</td>
                        <td className="text-slate-500">Daily compensation base</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-800">Total Unpaid LOP Days</td>
                        <td className="font-mono font-bold text-rose-600">{totalLopDaysCount} Day(s)</td>
                        <td className="font-mono text-rose-600">Calculated across requests</td>
                        <td className="text-slate-500">Days exceeding available balances</td>
                      </tr>
                      <tr className="bg-rose-50/60">
                        <td className="font-bold text-rose-900">Total LOP Deduction</td>
                        <td className="font-mono font-extrabold text-rose-700 text-sm">
                          -₹{totalLopAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="font-mono text-rose-700">= Per Day Rate &times; LOP Days</td>
                        <td className="font-bold text-rose-800">Direct deduction on pay slip</td>
                      </tr>
                      <tr className="bg-emerald-50/60">
                        <td className="font-bold text-emerald-900">Estimated Net Payable Salary</td>
                        <td className="font-mono font-extrabold text-emerald-700 text-sm">
                          ₹{calcNetSalary(sal, totalLopAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="font-mono text-emerald-700">= Gross &minus; Total LOP Deduction</td>
                        <td className="font-bold text-emerald-800">Estimated payout before tax & PF</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </div>

              {/* 5-Step Approval Workflow Graphic */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">Standard Leave Approval Workflow</h3>
                <p className="text-xs text-slate-500 mb-6">Visual pipeline illustrating the lifecycle of leave requests.</p>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
                  {APPROVAL_WORKFLOW.map((step, idx) => (
                    <div
                      key={step.step}
                      className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center relative group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center mx-auto mb-2 shadow-xs group-hover:scale-110 transition-transform">
                        {step.step}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1">{step.action}</h4>
                      <p className="text-[11px] text-slate-500 m-0 leading-tight">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

// ============================================================
// EMPLOYEE LEAVE FORM (MATERIAL DESIGN 3)
// ============================================================
const EmployeeLeaveForm = ({ salary, balanceList, onSubmitSuccess }) => {
  const [empName, setEmpName] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [leaveCode, setLeaveCode] = useState("CL");
  const [dayType, setDayType] = useState("Full Day");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [totalDays, setTotalDays] = useState(1);
  const [lopDays, setLopDays] = useState(0);
  const [docFile, setDocFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);

  const [empType, setEmpType] = useState("Permanent");

  // Available staff list for quick selection
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const list = data.data || data.employees || [];
        if (Array.isArray(list)) {
          setEmployeeOptions(list);
          // Autofill logged-in user if available
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          const me = list.find(e => e.employee_code === storedUser.employee_id || e.email === storedUser.email);
          if (me) {
            setEmpName(me.name || "");
            setEmpCode(me.employee_code || "");
            setDepartment(me.dept || "Engineering");
            setDesignation(me.designation || "");
            setEmpType(me.employment_type || storedUser.employment_type || "Permanent");
            if (me.joining_date) setJoiningDate(String(me.joining_date).split("T")[0]);
          }
        }
      })
      .catch((err) => console.warn("Failed to load staff list for leave form:", err));
  }, []);

  const handleSelectEmployee = (code) => {
    const found = employeeOptions.find((e) => e.employee_code === code);
    if (found) {
      setEmpName(found.name || "");
      setEmpCode(found.employee_code || "");
      setDepartment(found.dept || "Engineering");
      setDesignation(found.designation || "");
      setEmpType(found.employment_type || "Permanent");
      if (found.joining_date) setJoiningDate(String(found.joining_date).split("T")[0]);
    }
  };

  const isEmpPermanent = (empType || "Permanent").toLowerCase() === "permanent";
  const isElig = isEmpPermanent || leaveCode === "CL" || leaveCode === "LOP" || leaveCode === "CO";
  const eligBal = isElig ? getBalanceByCode(balanceList, leaveCode) : 0;

  useEffect(() => {
    if (leaveCode && totalDays > 0) {
      setLopDays(calcLOPDays(totalDays, eligBal));
    } else {
      setLopDays(0);
    }
  }, [totalDays, leaveCode, eligBal]);

  const showDocField = leaveCode === "SL";
  const isDocRequired = leaveCode === "SL" && totalDays > 3;

  useEffect(() => {
    setDocFile(null);
    setUploadStatus(null);
    setLocalPreview(null);
  }, [leaveCode]);

  const sal = parseFloat(salary) || 0;
  const lopAmt = sal > 0 && lopDays > 0 ? calcLOPDeduction(sal, WORKING_DAYS, lopDays) : 0;
  const netSal = sal > 0 ? calcNetSalary(sal, lopAmt) : 0;
  const perDay = sal > 0 ? calcPerDay(sal, WORKING_DAYS).toFixed(2) : 0;

  const handleDateChange = (field, value) => {
    const from = field === "from" ? value : fromDate;
    const to = field === "to" ? value : toDate;
    if (field === "from") setFromDate(value);
    else setToDate(value);

    if (from && to) {
      const diff = Math.floor((new Date(to) - new Date(from)) / 86400000) + 1;
      const computed = diff > 0 ? diff : 1;
      setTotalDays(dayType === "Full Day" ? computed : 0.5);
    }
  };

  const handleDayTypeChange = (dt) => {
    setDayType(dt);
    if (dt === "First Half" || dt === "Second Half") {
      setTotalDays(0.5);
    } else {
      if (fromDate && toDate) {
        const diff = Math.floor((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
        setTotalDays(diff > 0 ? diff : 1);
      } else {
        setTotalDays(1);
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocFile(file);
    setUploadStatus(null);
    setUploading(true);
    setError(null);
    setLocalPreview(null);

    const isImage = /\.(jpg|jpeg|png)$/i.test(file.name);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => setLocalPreview(ev.target.result);
      reader.readAsDataURL(file);
    }

    try {
      const fd = new FormData();
      fd.append("document", file);
      const res = await fetch(UPLOAD_API, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadStatus({ filename: data.filename, path: data.path, originalname: data.originalname });
    } catch (err) {
      setError("File upload failed: " + err.message);
      setDocFile(null);
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!empName.trim()) {
      setError("Employee name is required.");
      return;
    }
    if (!fromDate || !toDate) {
      setError("Please specify both start and end dates.");
      return;
    }
    if (isDocRequired && !uploadStatus && !docFile) {
      toast.error("Medical certificate required for Sick Leave exceeding 3 days.");
      return;
    }

    if (!isEmpPermanent && leaveCode !== "CL" && leaveCode !== "LOP" && leaveCode !== "CO") {
      setError(`Employee (${empType}) is non-permanent and eligible only for Casual Leave (CL). Other leave categories are granted yearly upon permanent confirmation.`);
      toast.error(`Non-permanent employees can only apply for Casual Leave (CL).`);
      return;
    }

    const leaveType = LEAVE_POLICY.find((p) => p.code === leaveCode)?.name || "Casual Leave";
    const formData = {
      employee_name: empName.trim(),
      employee_code: empCode.trim() || "EMP001",
      department: department.trim() || "Engineering",
      designation: designation.trim() || "Staff",
      joining_date: joiningDate || "—",
      leave_code: leaveCode,
      leave_type: leaveType,
      day_type: dayType,
      from_date: fromDate,
      to_date: toDate,
      total_days: totalDays,
      reason: reason,
      lop_days: lopDays,
      doc_filename: uploadStatus?.filename || null,
      doc_path: uploadStatus?.path || null,
      doc_original_name: uploadStatus?.originalname || (docFile ? docFile.name : null),
      monthly_salary: sal,
      status: "Pending",
    };

    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("leave_type", leaveType);
      fd.append("day_type", dayType);
      fd.append("start_date", fromDate);
      fd.append("end_date", toDate);
      fd.append("total_days", totalDays);
      fd.append("reason", reason);
      if (docFile) {
        fd.append("doc_url", docFile);
      }

      const res = await fetch(`${API_BASE}/leave/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to submit leave application");

      toast.success("Leave application submitted successfully!");
      setSubmitted(true);
      onSubmitSuccess(formData);

      setTimeout(() => {
        setSubmitted(false);
        setReason("");
        setTotalDays(1);
        setLopDays(0);
        setDocFile(null);
        setUploadStatus(null);
        setLocalPreview(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to submit leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
            <LuCalendarPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">Apply for Leave</h3>
            <p className="text-xs text-slate-400 m-0">Fill in application details with automatic LOP detection.</p>
          </div>
        </div>

        {employeeOptions.length > 0 && (
          <div className="w-48 sm:w-60">
            <select
              onChange={(e) => handleSelectEmployee(e.target.value)}
              value={empCode}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full focus:outline-none focus:border-indigo-600 shadow-2xs"
            >
              <option value="">Select Employee Quick-Fill...</option>
              {employeeOptions.map((e) => (
                <option key={e.employee_code} value={e.employee_code}>
                  {e.name} ({e.employee_code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {submitted && (
        <Alert variant="success" className="rounded-2xl text-xs font-semibold mb-4 border-0 bg-emerald-50 text-emerald-800">
          ✅ Leave application submitted successfully and queued for approval.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="rounded-2xl text-xs font-semibold mb-4 border-0 bg-rose-50 text-rose-800">
          ❌ Error: {error}
        </Alert>
      )}

      {/* Real-Time LOP Warning Banner */}
      {leaveCode && totalDays > 0 && (
        <div
          className={`p-3.5 rounded-2xl mb-5 text-xs flex items-center justify-between flex-wrap gap-2 border ${lopDays > 0
              ? "bg-amber-50/80 border-amber-200 text-amber-900"
              : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            }`}
        >
          <div className="flex items-center gap-2">
            {lopDays > 0 ? (
              <LuTriangleAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            ) : (
              <LuShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>
              {!isEmpPermanent && leaveCode !== "CL" && leaveCode !== "LOP" && leaveCode !== "CO" ? (
                <>
                  <strong>Non-Permanent Policy Alert ({empType}):</strong> Only <strong>Casual Leave (CL)</strong> is available to non-permanent staff. 
                  Requesting {leaveCode} ({totalDays}d) triggers <strong>{lopDays} Day(s) Loss of Pay (LOP)</strong> as statutory leave benefits are calculated yearly upon permanent confirmation.
                </>
              ) : lopDays > 0 ? (
                <>
                  <strong>Loss of Pay Warning:</strong> Available quota is <strong>{eligBal}d</strong>. You requested{" "}
                  <strong>{totalDays}d</strong> &rarr; <strong>{lopDays} Day(s) Loss of Pay (LOP)</strong>.
                </>
              ) : (
                <>
                  <strong>Within Quota:</strong> {totalDays}d requested against {eligBal}d available. Fully paid leave without salary reduction.
                </>
              )}
            </span>
          </div>

          {sal > 0 && lopDays > 0 && (
            <span className="font-mono font-bold text-rose-700 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
              Est. Deduction: ₹{lopAmt.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      )}

      <Form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Employee Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employee Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              placeholder="e.g. Rishi Mitra"
              className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employee Code / ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              placeholder="e.g. EMP-RM-66"
              className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Row 2: Department & Designation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
            >
              <option value="IT & Systems">IT & Systems</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources (HR)">Human Resources (HR)</option>
              <option value="Accounts & Finance">Accounts & Finance</option>
              <option value="Design & Creative">Design & Creative</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Designation / Role
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Associate Engineer"
              className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Row 3: Leave Type Selection Chips / Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Leave Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LEAVE_POLICY.filter(p => p.gender === "All").map((p) => {
              const isPermReq = p.permOnly;
              const isEligType = isEmpPermanent || !isPermReq;
              const bal = isEligType ? getBalanceByCode(balanceList, p.code) : 0;
              const isSelected = leaveCode === p.code;
              return (
                <div
                  key={p.code}
                  onClick={() => setLeaveCode(p.code)}
                  className={`p-2.5 rounded-2xl border text-center cursor-pointer transition-all ${isSelected
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-indigo-700">{p.code}</span>
                    <span className={`text-[10px] font-mono font-semibold ${isEligType ? "text-slate-500" : "text-amber-600 font-bold"}`}>
                      {isEligType ? `${bal}d left` : "Perm Only"}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={p.name}>
                    {p.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 4: Day Type Pill Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Day Duration Type
          </label>
          <div className="flex items-center gap-2">
            {["Full Day", "First Half", "Second Half"].map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => handleDayTypeChange(dt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${dayType === dt
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {dt}
              </button>
            ))}
          </div>
        </div>

        {/* Row 5: Dates Span & Calculated Days */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              From Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={fromDate}
              onChange={(e) => handleDateChange("from", e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              To Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={toDate}
              onChange={(e) => handleDateChange("to", e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Computed Days
            </label>
            <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-indigo-700 text-center font-mono">
              {totalDays} Day(s)
            </div>
          </div>
        </div>

        {/* Row 6: Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Reason for Leave <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please detail reason for absence, emergency handover, or details..."
            className="w-full text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all shadow-2xs"
          />
        </div>

        {/* Row 7: Supporting Document Upload */}
        {showDocField && isDocRequired && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-amber-900 m-0 flex items-center gap-1.5">
                <LuFileText className="h-4 w-4 text-amber-600" />
                <span>Supporting Medical Certificate Mandatory</span>
                <span className="text-rose-600">* (SL exceeds 3 days)</span>
              </label>
              <span className="text-[10px] text-amber-700">PDF, JPG, PNG &bull; Max 5MB</span>
            </div>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              required={isDocRequired}
              className="w-full text-xs bg-white rounded-xl border border-amber-300 p-2 shadow-2xs"
            />

            {uploading && (
              <div className="mt-2 text-xs text-indigo-600 font-semibold flex items-center gap-2">
                <Spinner animation="border" size="sm" /> Uploading medical document to server...
              </div>
            )}

            {uploadStatus && !uploading && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                {localPreview ? (
                  <LocalImagePreview src={localPreview} name={uploadStatus.originalname} />
                ) : (
                  <DocCell docPath={uploadStatus.path} />
                )}
                <div>
                  <div className="text-xs font-bold text-emerald-800">✅ File uploaded and verified</div>
                  <div className="text-[11px] text-slate-500 font-mono">{uploadStatus.originalname}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" />
              <span>Submitting Application...</span>
            </>
          ) : (
            <>
              <LuCheck className="h-4 w-4" />
              <span>Submit Leave Application</span>
            </>
          )}
        </button>
      </Form>
    </div>
  );
};

export default LeavesPage;