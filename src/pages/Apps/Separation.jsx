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
  FiChevronDown,
  FiDownload,
  FiShield,
  FiMessageSquare,
  FiCheck,
  FiX,
  FiSend,
  FiEdit2,
  FiTrash2,
  FiVideo,
  FiBriefcase,
  FiLock,
  FiStar,
  FiHelpCircle,
  FiBell,
  FiArrowUp,
  FiArrowDown,
  FiArchive
} from "react-icons/fi";
import {
  LuLogOut,
  LuBuilding,
  LuCheckCheck,
  LuBookOpen,
  LuMonitor,
  LuShieldCheck,
  LuWallet,
  LuGripVertical,
  LuArrowUpDown
} from "react-icons/lu";
import toast from "react-hot-toast";
import ResignationModal from "../../components/Resignation/ResignationModal";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

const AVAILABLE_CUSTOM_DEPTS = [
  "Service",
  "Marketing",
  "Security & Facilities",
  "Operations",
  "Laboratory / Testing",
  "Store & Inventory",
  "Legal & Compliance",
  "Quality Assurance (QA)",
  "Research & Development (R&D)",
  "Customer Support"
];

const DEFAULT_EXIT_QUESTIONS = [
  {
    id: 1,
    category: "Reason for Leaving",
    question: "What is your primary reason for deciding to leave the organization?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 2,
    category: "Management & Leadership",
    question: "How would you describe your overall experience working with your immediate team lead / manager?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 3,
    category: "Tools & Resources",
    question: "Did you feel you were provided with adequate tools, technology, and training to perform your job effectively?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 4,
    category: "Career Growth",
    question: "How would you rate the opportunities for professional learning, advancement, and skill development provided to you?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 5,
    category: "Company Culture",
    question: "What are your thoughts on the organizational culture, team collaboration, and work environment?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 6,
    category: "Work-Life Balance",
    question: "Did the company support and maintain a fair balance between your work responsibilities and personal life?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 7,
    category: "Compensation & Benefits",
    question: "How satisfied were you with your overall compensation, benefits package, and employee recognition?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 8,
    category: "Role Expectations",
    question: "Were your daily responsibilities, targets, and job expectations clearly communicated throughout your tenure?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 9,
    category: "Key Highlights",
    question: "What did you enjoy the most about working here, and what do you consider your greatest accomplishment?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 10,
    category: "Suggestions & Future Rehire",
    question: "What key improvements would you recommend for the management, and would you recommend this company or return in the future?",
    rating: 0,
    answer: "",
    notes: ""
  }
];

export default function Separation() {
  const token = localStorage.getItem("token");
  const storedRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const userEmpId = localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";
  const userName = localStorage.getItem("userName") || "User";

  // RBAC checks
  const isHR = storedRole === "hr" || storedRole === "admin" || storedRole === "hrmanager";
  const isHOD = storedRole === "hod";
  const isManager = storedRole === "manager";
  const isTeamLead = storedRole === "teamlead";
  const isAccounts = storedRole === "accounts" || storedRole === "payroll";
  const isEmployeeOnly = !isHR && !isHOD && !isManager && !isTeamLead && !isAccounts;

  // Data states
  const [loading, setLoading] = useState(true);
  const [resignations, setResignations] = useState([]);
  const [myResignation, setMyResignation] = useState(null);
  const [resignationHistory, setResignationHistory] = useState([]);
  const [employees, setEmployees] = useState([]);

  // UI state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState(null);
  const [selectedRecordForAction, setSelectedRecordForAction] = useState(null);
  const [actionType, setActionType] = useState(""); // "tl_action" | "manager_action" | "hod_action" | "hr_action"
  const [activeTab, setActiveTab] = useState(isEmployeeOnly ? "my_resignation" : "team_queue");

  // History Tab Filters (for HR & Supervisors)
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("All");
  const [historyDeptFilter, setHistoryDeptFilter] = useState("All");

  // Specific Employee Resignation History Modal
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);
  const [employeeHistoryRecords, setEmployeeHistoryRecords] = useState([]);
  const [loadingEmployeeHistory, setLoadingEmployeeHistory] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  // Action form state (for TL, Manager, HOD, HR reviews)
  const [actionDecision, setActionDecision] = useState("Approved");
  const [actionComments, setActionComments] = useState("");
  const [actionLwd, setActionLwd] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);

  // Clearance Modal States & Pipeline Reordering
  const [showRaiseClearanceModal, setShowRaiseClearanceModal] = useState(false);
  const [selectedRecordForClearance, setSelectedRecordForClearance] = useState(null);
  const [clearancePipeline, setClearancePipeline] = useState([]);
  const [draggedDeptIndex, setDraggedDeptIndex] = useState(null);
  const [customDeptsToAdd, setCustomDeptsToAdd] = useState([]);
  const [selectedCustomDeptInput, setSelectedCustomDeptInput] = useState("");
  const [customDeptTextInput, setCustomDeptTextInput] = useState("");
  const [clearanceActiveStepRemarks, setClearanceActiveStepRemarks] = useState("");
  const [clearanceProcessing, setClearanceProcessing] = useState(false);

  // Exit Interview Modal States
  const [showExitInterviewModal, setShowExitInterviewModal] = useState(false);
  const [selectedRecordForExitInterview, setSelectedRecordForExitInterview] = useState(null);
  const [exitInterviewForm, setExitInterviewForm] = useState({
    interview_date: "",
    interview_time: "10:30 AM",
    interview_interviewer: "",
    interview_mode: "In person",
    interview_location: "HR Conference Room / Google Meet",
    interview_notes: "",
    questions: []
  });
  const [exitInterviewProcessing, setExitInterviewProcessing] = useState(false);

  // Handover workflow states
  const [assignedHandovers, setAssignedHandovers] = useState([]);

  // HOD Handover Assignment Form State
  const [hodHandoverPersonId, setHodHandoverPersonId] = useState("");
  const [hodHandoverPersonName, setHodHandoverPersonName] = useState("");
  const [hodHandoverTargetDate, setHodHandoverTargetDate] = useState("");
  const [hodHandoverNote, setHodHandoverNote] = useState("");
  const [hodHandoverChecklist, setHodHandoverChecklist] = useState([
    { item: "Project files, repositories & documentation handover", done: false },
    { item: "Client / internal communication & active contacts handover", done: false },
    { item: "Pending tasks & deliverables status documentation", done: false },
    { item: "Access credentials & team physical materials transfer", done: false }
  ]);

  // Employee Submit Handover Modal States
  const [showSubmitHandoverModal, setShowSubmitHandoverModal] = useState(false);
  const [selectedRecordForHandover, setSelectedRecordForHandover] = useState(null);
  const [handoverRemarks, setHandoverRemarks] = useState("");
  const [handoverChecklist, setHandoverChecklist] = useState([]);
  const [handoverProcessing, setHandoverProcessing] = useState(false);

  // Assignee Confirm Handover Modal States
  const [showConfirmHandoverModal, setShowConfirmHandoverModal] = useState(false);
  const [selectedRecordForConfirmHandover, setSelectedRecordForConfirmHandover] = useState(null);
  const [confirmDecision, setConfirmDecision] = useState("Confirmed");
  const [confirmRemarks, setConfirmRemarks] = useState("");
  const [confirmChecklist, setConfirmChecklist] = useState([]);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  // Calculate Tenure
  const calculateTenure = (joiningDate, endDate) => {
    if (!joiningDate) return "—";
    try {
      const start = new Date(joiningDate);
      const end = endDate ? new Date(endDate) : new Date();
      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      const parts = [];
      if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
      if (months > 0) parts.push(`${months} mo${months > 1 ? "s" : ""}`);
      return parts.length > 0 ? parts.join(" ") : "< 1 month";
    } catch {
      return "—";
    }
  };

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

  // Fetch all resignations & my resignation
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
        setResignationHistory(myData.data?.history || []);
        setAssignedHandovers(myData.data?.assignedHandovers || []);
      }

      // 2. Fetch scoped list for supervisors / HR
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

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Helper for Department Clearance Icon
  const getDeptIcon = (id) => {
    switch (id) {
      case "dept":
        return <LuBuilding className="w-4 h-4" />;
      case "library":
        return <LuBookOpen className="w-4 h-4" />;
      case "it":
        return <LuMonitor className="w-4 h-4" />;
      case "admin":
        return <FiShield className="w-4 h-4" />;
      case "hr":
        return <LuShieldCheck className="w-4 h-4" />;
      case "accounts":
        return <LuWallet className="w-4 h-4" />;
      default:
        return <FiBriefcase className="w-4 h-4" />;
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40">
            <FiCheck className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "Pending Handover Completion":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40">
            <FiClock className="w-3.5 h-3.5 text-amber-600" /> Pending Handover
          </span>
        );
      case "Awaiting Handover Confirmation":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40">
            <FiShield className="w-3.5 h-3.5 text-blue-600" /> Awaiting Handover Confirmation
          </span>
        );
      case "Clearance In Progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40">
            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> Clearance In Progress
          </span>
        );
      case "Clearance Completed - Pending Exit Interview":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40">
            <LuCheckCheck className="w-3.5 h-3.5" /> All Clearances Done
          </span>
        );
      case "Exit Interview Scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/40">
            <FiMessageSquare className="w-3.5 h-3.5" /> Exit Interview Scheduled
          </span>
        );
      case "Separation Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300">
            <LuCheckCheck className="w-3.5 h-3.5" /> Separation Concluded
          </span>
        );
      case "Pending HR Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40">
            <FiShield className="w-3.5 h-3.5" /> Pending HR Approval
          </span>
        );
      case "Pending HOD Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40">
            <LuBuilding className="w-3.5 h-3.5" /> Pending HOD Approval
          </span>
        );
      case "Pending Manager Review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40">
            <FiClock className="w-3.5 h-3.5" /> Pending Manager Review
          </span>
        );
      case "Pending TL Review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/40">
            <FiClock className="w-3.5 h-3.5" /> Pending TL Review
          </span>
        );
      case "Draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <FiEdit2 className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case "Cancelled":
      case "Withdrawn":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
            <FiAlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Withdrawn
          </span>
        );
      default:
        if (status && status.startsWith("Rejected")) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400">
              <FiX className="w-3.5 h-3.5" /> {status}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-50 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // -------------------------------------------------------------
  // APPROVAL SUBMISSION HANDLERS: TL -> Manager -> HOD -> HR
  // -------------------------------------------------------------
  const handleReviewSubmit = async () => {
    if (!selectedRecordForAction) return;
    setActionProcessing(true);

    let endpoint = "";
    if (actionType === "tl_action") endpoint = `${API}/resignation/${selectedRecordForAction.id}/tl-action`;
    else if (actionType === "manager_action") endpoint = `${API}/resignation/${selectedRecordForAction.id}/manager-action`;
    else if (actionType === "hod_action") endpoint = `${API}/resignation/${selectedRecordForAction.id}/hod-action`;
    else if (actionType === "hr_action") endpoint = `${API}/resignation/${selectedRecordForAction.id}/hr-action`;

    try {
      // If HOD is approving, require assigning an employee for handover
      if (actionType === "hod_action" && actionDecision === "Approved") {
        if (!hodHandoverPersonId || !hodHandoverPersonName) {
          toast.error("Please assign an employee for document & task handover before Department Head approval.");
          setActionProcessing(false);
          return;
        }
      }

      const payload = {
        decision: actionDecision,
        comments: actionComments,
        recommended_lwd: actionLwd || selectedRecordForAction.last_working_date,
        confirmed_lwd: actionLwd || selectedRecordForAction.hod_recommended_lwd || selectedRecordForAction.last_working_date
      };

      if (actionType === "hod_action" && actionDecision === "Approved") {
        payload.handover_person_id = hodHandoverPersonId;
        payload.handover_person_name = hodHandoverPersonName;
        payload.handover_target_date = hodHandoverTargetDate || actionLwd || selectedRecordForAction.last_working_date;
        payload.handover_note = hodHandoverNote;
        payload.handover_docs_checklist = hodHandoverChecklist;
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review submission failed");

      toast.success(data.message || "Review action recorded successfully!");
      setSelectedRecordForAction(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to process review");
    } finally {
      setActionProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // HANDOVER SUBMISSION & CONFIRMATION HANDLERS
  // -------------------------------------------------------------
  const handleSubmitHandover = async () => {
    if (!selectedRecordForHandover) return;
    setHandoverProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForHandover.id}/submit-handover`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remarks: handoverRemarks,
          checklist: handoverChecklist
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit handover documentation");
      toast.success(data.message || "Handover submitted! Awaiting colleague confirmation.");
      setShowSubmitHandoverModal(false);
      setSelectedRecordForHandover(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Error submitting handover");
    } finally {
      setHandoverProcessing(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!selectedRecordForConfirmHandover) return;
    setConfirmProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForConfirmHandover.id}/confirm-handover`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: confirmDecision,
          remarks: confirmRemarks,
          checklist: confirmChecklist
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm handover");
      toast.success(data.message || "Handover confirmation recorded!");
      setShowConfirmHandoverModal(false);
      setSelectedRecordForConfirmHandover(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Error confirming handover");
    } finally {
      setConfirmProcessing(false);
    }
  };

  const openSubmitHandoverModal = (record) => {
    setSelectedRecordForHandover(record);
    setHandoverRemarks(record.handover_employee_remarks || "");
    setHandoverChecklist(
      Array.isArray(record.handover_docs_checklist) && record.handover_docs_checklist.length > 0
        ? record.handover_docs_checklist
        : [
            { item: "Project files, repositories & documentation handover", done: false },
            { item: "Client / internal communication & active contacts handover", done: false },
            { item: "Pending tasks & deliverables status documentation", done: false },
            { item: "Access credentials & team physical materials transfer", done: false }
          ]
    );
    setShowSubmitHandoverModal(true);
  };

  const openConfirmHandoverModal = (record) => {
    setSelectedRecordForConfirmHandover(record);
    setConfirmDecision("Confirmed");
    setConfirmRemarks(record.handover_assignee_remarks || "");
    setConfirmChecklist(
      Array.isArray(record.handover_docs_checklist) && record.handover_docs_checklist.length > 0
        ? record.handover_docs_checklist
        : [
            { item: "Project files, repositories & documentation handover", done: true },
            { item: "Client / internal communication & active contacts handover", done: true },
            { item: "Pending tasks & deliverables status documentation", done: true },
            { item: "Access credentials & team physical materials transfer", done: true }
          ]
    );
    setShowConfirmHandoverModal(true);
  };

  // -------------------------------------------------------------
  // CLEARANCE FORM HANDLERS (SERIAL ORDER + REORDERING + CUSTOM DEPTS)
  // -------------------------------------------------------------
  const getDefaultClearancePipeline = (record) => {
    const deptName = record?.dept || "Department";
    return [
      {
        id: "dept",
        name: `${deptName} Clearance`,
        dept_key: deptName,
        desc: "Project handovers, team assets, and knowledge transfer",
        is_custom: false
      },
      {
        id: "library",
        name: "Library Clearance",
        dept_key: "Library",
        desc: "Return of books, journals, membership cards, and no dues",
        is_custom: false
      },
      {
        id: "it",
        name: "IT Clearance",
        dept_key: "IT",
        desc: "Laptop, peripherals, email deactivation, and VPN revocation",
        is_custom: false
      },
      {
        id: "admin",
        name: "Admin Clearance",
        dept_key: "Admin",
        desc: "ID badge, physical access keys, parking, and uniform return",
        is_custom: false
      },
      {
        id: "hr",
        name: "HR Clearance",
        dept_key: "HR",
        desc: "HR documents, insurance delisting, and statutory compliance",
        is_custom: false
      },
      {
        id: "accounts",
        name: "Accounts Clearance",
        dept_key: "Accounts",
        desc: "Pending advances, reimbursements, and full & final dues",
        is_custom: false
      }
    ];
  };

  const openRaiseClearanceModal = (item) => {
    setSelectedRecordForClearance(item);
    setClearancePipeline(getDefaultClearancePipeline(item));
    setSelectedCustomDeptInput("");
    setCustomDeptTextInput("");
    setShowRaiseClearanceModal(true);
  };

  const moveDeptUp = (index) => {
    if (index <= 0) return;
    setClearancePipeline((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveDeptDown = (index) => {
    if (index >= clearancePipeline.length - 1) return;
    setClearancePipeline((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleDragStart = (e, index) => {
    setDraggedDeptIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedDeptIndex === null || draggedDeptIndex === dropIndex) return;
    setClearancePipeline((prev) => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedDeptIndex, 1);
      next.splice(dropIndex, 0, draggedItem);
      return next;
    });
    setDraggedDeptIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedDeptIndex(null);
  };

  const addCustomDeptToPipeline = (deptName) => {
    const trimmed = (deptName || "").trim();
    if (!trimmed) {
      toast.error("Please enter or select a department name");
      return;
    }
    if (clearancePipeline.some((d) => d.dept_key.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already included in the clearance pipeline`);
      return;
    }
    setClearancePipeline((prev) => [
      ...prev,
      {
        id: `custom_${trimmed.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${trimmed} Clearance`,
        dept_key: trimmed,
        desc: `Surrender of assets and no dues verification from ${trimmed}`,
        is_custom: true
      }
    ]);
    setSelectedCustomDeptInput("");
    setCustomDeptTextInput("");
    toast.success(`Added "${trimmed}" to the clearance sequence! You can reorder it using arrows or drag & drop.`);
  };

  const removeDeptFromPipeline = (index) => {
    if (clearancePipeline.length <= 1) {
      toast.error("At least one department must remain in the clearance pipeline.");
      return;
    }
    const removed = clearancePipeline[index];
    setClearancePipeline((prev) => prev.filter((_, i) => i !== index));
    toast.success(`Removed "${removed.dept_key}" from clearance pipeline`);
  };

  const resetClearancePipeline = () => {
    if (selectedRecordForClearance) {
      setClearancePipeline(getDefaultClearancePipeline(selectedRecordForClearance));
      toast.success("Reset clearance sequence to standard order");
    }
  };

  const openEmployeeHistoryModal = async (emp) => {
    setSelectedEmployeeForHistory(emp);
    setLoadingEmployeeHistory(true);
    try {
      const res = await fetch(`${API}/resignation/employee/${emp.employee_id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmployeeHistoryRecords(data.data || []);
      } else {
        setEmployeeHistoryRecords(resignations.filter((r) => r.employee_id === emp.employee_id));
      }
    } catch (err) {
      console.error("Error loading employee resignation history:", err);
      setEmployeeHistoryRecords(resignations.filter((r) => r.employee_id === emp.employee_id));
    } finally {
      setLoadingEmployeeHistory(false);
    }
  };

  const handleRaiseClearanceSubmit = async () => {
    if (!isHR) {
      toast.error("Only HR can raise the clearance form workflow");
      return;
    }
    if (!selectedRecordForClearance) return;
    if (!clearancePipeline || clearancePipeline.length === 0) {
      toast.error("Please configure at least one department in the clearance pipeline.");
      return;
    }
    setClearanceProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForClearance.id}/raise-clearance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ordered_departments: clearancePipeline.map((d, index) => ({
            ...d,
            order: index + 1
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to raise clearance form");

      toast.success("Clearance form raised successfully! Serial department clearances initiated in your configured sequence.");
      setShowRaiseClearanceModal(false);
      setSelectedRecordForClearance(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to raise clearance form");
    } finally {
      setClearanceProcessing(false);
    }
  };

  const handleAddCustomDeptToPipeline = async (deptName) => {
    if (!isHR) {
      toast.error("Only HR can add custom clearance departments");
      return;
    }
    if (!selectedRecordForClearance || !deptName.trim()) return;
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForClearance.id}/add-clearance-dept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ department_name: deptName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add department");

      toast.success(data.message || `Department "${deptName}" added to clearance chain!`);
      setSelectedRecordForClearance(data.data);
      fetchResignations();
      setSelectedCustomDeptInput("");
      setCustomDeptTextInput("");
    } catch (err) {
      toast.error(err.message || "Failed to add custom department");
    }
  };

  const handleClearDeptStep = async (stepId) => {
    if (!selectedRecordForClearance) return;
    if (selectedRecordForClearance.employee_id === userEmpId && !isHR) {
      toast.error("You cannot clear your own department clearance steps");
      return;
    }
    setClearanceProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForClearance.id}/clear-dept`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          step_id: stepId,
          remarks: clearanceActiveStepRemarks || "Cleared with no outstanding dues"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clearance failed");

      toast.success(data.message || "Department clearance marked as Cleared (Green Tick)!");
      setSelectedRecordForClearance(data.data);
      setClearanceActiveStepRemarks("");
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to clear department step");
    } finally {
      setClearanceProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // EXIT INTERVIEW FORM HANDLERS (DETAILS & 10 QUESTIONS)
  // -------------------------------------------------------------
  const handleOpenExitInterviewModal = (record) => {
    if (!isHR) {
      toast.error("Only HR can schedule or conduct exit interviews");
      return;
    }
    setSelectedRecordForExitInterview(record);
    const existingQuestions = Array.isArray(record.exit_interview_questions) && record.exit_interview_questions.length > 0
      ? record.exit_interview_questions
      : DEFAULT_EXIT_QUESTIONS;

    setExitInterviewForm({
      interview_date: record.exit_interview_date || record.hr_confirmed_lwd || record.last_working_date || "",
      interview_time: record.exit_interview_time || "10:30 AM",
      interview_interviewer: record.exit_interview_interviewer || userName || "HR Manager",
      interview_mode: record.exit_interview_mode || "In person",
      interview_location: record.exit_interview_location || "HR Conference Room / Google Meet",
      interview_notes: record.exit_interview_notes || "",
      questions: JSON.parse(JSON.stringify(existingQuestions))
    });
    setShowExitInterviewModal(true);
  };

  const handleQuestionRatingChange = (qIndex, rating) => {
    setExitInterviewForm(prev => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], rating };
      return { ...prev, questions: updated };
    });
  };

  const handleQuestionAnswerChange = (qIndex, answer) => {
    setExitInterviewForm(prev => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], answer };
      return { ...prev, questions: updated };
    });
  };

  const handleScheduleExitInterview = async () => {
    if (!isHR) {
      toast.error("Only HR can schedule exit interviews");
      return;
    }
    if (!selectedRecordForExitInterview) return;
    setExitInterviewProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForExitInterview.id}/raise-exit-interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          interview_date: exitInterviewForm.interview_date,
          interview_time: exitInterviewForm.interview_time,
          interview_interviewer: exitInterviewForm.interview_interviewer,
          interview_mode: exitInterviewForm.interview_mode,
          interview_location: exitInterviewForm.interview_location,
          interview_notes: exitInterviewForm.interview_notes,
          custom_questions: exitInterviewForm.questions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule exit interview");

      toast.success("Exit interview form raised and scheduled! Employee notified with the set of 10 questions.");
      setShowExitInterviewModal(false);
      setSelectedRecordForExitInterview(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to raise exit interview");
    } finally {
      setExitInterviewProcessing(false);
    }
  };

  const handleCompleteExitInterview = async () => {
    if (!isHR) {
      toast.error("Only HR can conduct and complete exit interviews");
      return;
    }
    if (!selectedRecordForExitInterview) return;
    setExitInterviewProcessing(true);
    try {
      const res = await fetch(`${API}/resignation/${selectedRecordForExitInterview.id}/submit-exit-interview`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          questions: exitInterviewForm.questions,
          feedback: exitInterviewForm.interview_notes,
          completion_notes: "Exit interview successfully concluded by HR.",
          mark_completed: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize exit interview");

      toast.success("Exit interview completed and separation process concluded successfully!");
      setShowExitInterviewModal(false);
      setSelectedRecordForExitInterview(null);
      fetchResignations();
    } catch (err) {
      toast.error(err.message || "Failed to finalize exit interview");
    } finally {
      setExitInterviewProcessing(false);
    }
  };

  // Withdraw Resignation
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
    setActionLwd(
      record.hr_confirmed_lwd ||
      record.hod_recommended_lwd ||
      record.manager_recommended_lwd ||
      record.tl_recommended_lwd ||
      record.last_working_date ||
      ""
    );
    if (type === "hod_action") {
      setHodHandoverPersonId(record.handover_person_id || "");
      setHodHandoverPersonName(record.handover_person_name || "");
      setHodHandoverTargetDate(record.handover_target_date || record.last_working_date || "");
      setHodHandoverNote(record.handover_note || "");
      setHodHandoverChecklist(
        Array.isArray(record.handover_docs_checklist) && record.handover_docs_checklist.length > 0
          ? record.handover_docs_checklist
          : [
              { item: "Project files, repositories & documentation handover", done: false },
              { item: "Client / internal communication & active contacts handover", done: false },
              { item: "Pending tasks & deliverables status documentation", done: false },
              { item: "Access credentials & team physical materials transfer", done: false }
            ]
      );
    }
  };

  // Filtered resignations list (Active Queue)
  const filteredResignations = resignations.filter((r) => {
    const matchesSearch =
      (r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.employee_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All"
        ? true
        : statusFilter === "Withdrawn"
        ? (r.status === "Withdrawn" || r.status === "Cancelled")
        : statusFilter === "Historical"
        ? (r.status === "Withdrawn" || r.status === "Cancelled" || r.status === "Separation Completed" || (r.status && r.status.startsWith("Rejected")))
        : r.status === statusFilter;
    const matchesDept = deptFilter === "All" || (r.dept || "").toLowerCase() === deptFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesDept;
  });

  // Historical resignations for HR & Supervisors History Tab
  const historicalResignations = resignations.filter((r) => {
    const isHistorical =
      r.status === "Withdrawn" ||
      r.status === "Cancelled" ||
      r.status === "Separation Completed" ||
      (r.status && r.status.startsWith("Rejected"));

    const matchesSearch =
      (r.name || "").toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      (r.employee_id || "").toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      (r.designation || "").toLowerCase().includes(historySearchQuery.toLowerCase());

    const matchesStatus =
      historyStatusFilter === "All"
        ? isHistorical
        : historyStatusFilter === "Withdrawn"
        ? (r.status === "Withdrawn" || r.status === "Cancelled")
        : historyStatusFilter === "Completed"
        ? r.status === "Separation Completed"
        : historyStatusFilter === "Rejected"
        ? (r.status && r.status.startsWith("Rejected"))
        : r.status === historyStatusFilter;

    const matchesDept =
      historyDeptFilter === "All" || (r.dept || "").toLowerCase() === historyDeptFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Calculate high-level stats
  const totalCount = resignations.length;
  const pendingTlCount = resignations.filter((r) => r.status === "Pending TL Review").length;
  const pendingManagerCount = resignations.filter((r) => r.status === "Pending Manager Review").length;
  const pendingHodCount = resignations.filter((r) => r.status === "Pending HOD Approval").length;
  const pendingHandoverCount = resignations.filter((r) => r.status === "Pending Handover Completion" || r.status === "Awaiting Handover Confirmation" || r.approval_stage === "HANDOVER_IN_PROGRESS" || r.approval_stage === "HANDOVER_SUBMITTED").length;
  const pendingHrCount = resignations.filter((r) => r.status === "Pending HR Approval").length;
  const clearanceInProgressCount = resignations.filter((r) => r.clearance_raised && r.clearance_overall_status !== "Completed").length;
  const exitInterviewCount = resignations.filter((r) => r.clearance_overall_status === "Completed" && r.status !== "Separation Completed").length;

  const isMyResignationWithdrawn = myResignation && (
    myResignation.status === "Cancelled" ||
    myResignation.status === "Withdrawn" ||
    myResignation.approval_stage === "CANCELLED"
  );

  const totalHistoricalCount = resignations.filter(
    (r) =>
      r.status === "Withdrawn" ||
      r.status === "Cancelled" ||
      r.status === "Separation Completed" ||
      (r.status && r.status.startsWith("Rejected"))
  ).length;
  const totalWithdrawnCount = resignations.filter(
    (r) => r.status === "Withdrawn" || r.status === "Cancelled"
  ).length;
  const totalCompletedCount = resignations.filter(
    (r) => r.status === "Separation Completed"
  ).length;
  const totalRejectedCount = resignations.filter(
    (r) => r.status && r.status.startsWith("Rejected")
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs">
                <LuLogOut className="w-7 h-7" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Employee Resignation & Separation Portal
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hierarchical Approval (TL ➔ Manager ➔ HOD ➔ HR) • Serial Department Clearances • Exit Interview Form
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchResignations}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-xs"
              title="Refresh records"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowApplyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all"
            >
              <FiPlus className="w-4 h-4" />
              <span>Apply Resignation</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs for Supervisors / HR / Accounts */}
        {!isEmployeeOnly && (
          <div className="flex gap-2 mt-6 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("team_queue")}
              className={`pb-3 px-3 text-xs font-bold relative transition-colors ${
                activeTab === "team_queue"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {isHR ? "Organization Separation Hub (Active Queue & Clearances)" : "Department Review Queue"}
              {activeTab === "team_queue" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            {(isHR || isHOD || isManager || isTeamLead) && (
              <button
                type="button"
                onClick={() => setActiveTab("resignation_history")}
                className={`pb-3 px-3 text-xs font-bold relative transition-colors flex items-center gap-1.5 ${
                  activeTab === "resignation_history"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <FiArchive className="w-3.5 h-3.5" />
                Resignation History & Archives
                {totalWithdrawnCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {totalWithdrawnCount} Withdrawn
                  </span>
                )}
                {activeTab === "resignation_history" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("my_resignation")}
              className={`pb-3 px-3 text-xs font-bold relative transition-colors ${
                activeTab === "my_resignation"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              My Resignation Status & Progress
              {activeTab === "my_resignation" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* ASSIGNED HANDOVERS BANNER (When current employee is assigned handover by HOD) */}
        {assignedHandovers.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <FiBriefcase className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Colleague Handovers Assigned to You by Department Head ({assignedHandovers.length})
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You have been assigned to receive documents & work handover. The resignation remains held until you confirm completion.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {assignedHandovers.map((item) => (
                <div key={item.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-slate-800 flex items-center justify-between text-xs gap-3">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {item.name} ({item.employee_id})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.dept} • Target: {formatDate(item.handover_target_date || item.last_working_date)}
                    </div>
                    <div className="mt-1">{getStatusBadge(item.status)}</div>
                  </div>

                  <div>
                    {item.handover_status === "SUBMITTED_BY_EMPLOYEE" ? (
                      <button
                        type="button"
                        onClick={() => openConfirmHandoverModal(item)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <FiCheck className="w-3.5 h-3.5" />
                        Review & Confirm
                      </button>
                    ) : item.handover_status === "CONFIRMED_BY_ASSIGNEE" ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        ✓ Confirmed Complete
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                        Awaiting Docs from Employee
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Content */}
        <div className="mt-6 space-y-6">
          {/* TAB 1: MY RESIGNATION STATUS (Employee View) */}
          {(activeTab === "my_resignation" || isEmployeeOnly) && (
            <div className="space-y-6">
              {myResignation ? (
                /* Active Resignation Card with Multi-Stage Stepper, Clearances & Exit Interview */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                  {/* Card Top Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                          {isMyResignationWithdrawn ? "Resignation Request (Withdrawn)" : "Active Resignation Request"}
                        </span>
                        {getStatusBadge(myResignation.status)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Submitted on <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(myResignation.created_at)}</span> •
                        Notice Period: <span className="font-semibold text-slate-700 dark:text-slate-300">{myResignation.notice_period}</span> •
                        Tenure: <span className="font-semibold text-slate-700 dark:text-slate-300">{calculateTenure(myResignation.joining_date, myResignation.last_working_date)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isMyResignationWithdrawn ? (
                        <button
                          type="button"
                          onClick={() => setShowApplyModal(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl transition-colors"
                        >
                          <FiPlus className="w-3.5 h-3.5" />
                          Apply Resignation Again
                        </button>
                      ) : (
                        <>
                          {myResignation.status === "Draft" && (
                            <button
                              type="button"
                              onClick={() => setShowApplyModal(true)}
                              className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                            >
                              Continue Editing Draft
                            </button>
                          )}
                          {(myResignation.status === "Pending TL Review" ||
                            myResignation.status === "Pending Manager Review" ||
                            myResignation.status === "Pending HOD Approval" ||
                            myResignation.status === "Pending Handover Completion" ||
                            myResignation.status === "Awaiting Handover Confirmation" ||
                            myResignation.status === "Pending HR Approval" ||
                            myResignation.status === "Draft") && (
                            <button
                              type="button"
                              onClick={() => handleCancelResignation(myResignation.id)}
                              className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                            >
                              Withdraw Resignation
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isMyResignationWithdrawn ? (
                    /* ---------------------------------------------------------- */
                    /* PROMINENT WITHDRAWN NOTIFICATION INSTEAD OF EACH STEP APPROVAL */
                    /* ---------------------------------------------------------- */
                    <div className="p-6 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 dark:from-amber-950/30 dark:via-orange-950/10 dark:to-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-amber-200/60 dark:border-amber-900/40">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
                            <FiAlertCircle className="w-6 h-6" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                                Resignation Request Withdrawn
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                Workflow Terminated
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              This resignation application was withdrawn by {myResignation.withdrawn_by || "the employee"}.
                              The multi-level approval pipeline (TL, Manager, HOD, and HR), colleague handovers, and department clearance checklists for this request have been cancelled.
                            </p>
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowApplyModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                          >
                            <FiPlus className="w-3.5 h-3.5" />
                            Apply Resignation Again
                          </button>
                        </div>
                      </div>

                      {/* Withdrawn Parameters Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        <div className="p-3 bg-white/80 dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Withdrawn Date</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                            {formatDate(myResignation.withdrawn_at || myResignation.updated_at)}
                          </span>
                        </div>
                        <div className="p-3 bg-white/80 dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Originally Submitted</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                            {formatDate(myResignation.created_at)}
                          </span>
                        </div>
                        <div className="p-3 bg-white/80 dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Notice Period & Target LWD</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                            {myResignation.notice_period} • {formatDate(myResignation.last_working_date)}
                          </span>
                        </div>
                        <div className="p-3 bg-white/80 dark:bg-slate-800/60 rounded-xl border border-amber-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Stated Reason</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block truncate" title={myResignation.reason}>
                            {myResignation.reason}
                          </span>
                        </div>
                      </div>

                      {myResignation.withdrawal_reason && myResignation.withdrawal_reason !== "Withdrawn by employee" && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                          <span className="font-bold">Withdrawal Note:</span> "{myResignation.withdrawal_reason}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* 1. HIERARCHICAL APPROVAL TRACKER (TL ➔ Manager ➔ HOD ➔ Handover ➔ HR) */}
                      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <FiShield className="w-4 h-4 text-blue-600" />
                        Multi-Level Approval & Handover Chain
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        HR live copy active & monitoring
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {/* Step 1: Team Lead (TL) */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">1. TL Review</span>
                            <span className={`w-2 h-2 rounded-full ${myResignation.tl_decision === "Approved" ? "bg-emerald-500" : (myResignation.status === "Pending TL Review" ? "bg-cyan-500 animate-ping" : "bg-slate-300")}`} />
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {myResignation.tl_name || "Team Lead (Optional)"}
                          </div>
                          <div className="text-[10px] mt-1 font-semibold">
                            {myResignation.tl_decision === "Approved" ? (
                              <span className="text-emerald-600">✓ Endorsed by TL</span>
                            ) : myResignation.tl_decision === "Rejected" ? (
                              <span className="text-rose-600">✕ Rejected by TL</span>
                            ) : myResignation.status === "Pending TL Review" ? (
                              <span className="text-cyan-600 font-bold">⏳ Awaiting TL Review</span>
                            ) : (
                              <span className="text-slate-400">Direct to Manager/HOD</span>
                            )}
                          </div>
                        </div>
                        {myResignation.tl_comments && (
                          <div className="mt-2 text-[10px] text-slate-500 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                            "{myResignation.tl_comments}"
                          </div>
                        )}
                      </div>

                      {/* Step 2: Manager */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">2. Manager Review</span>
                            <span className={`w-2 h-2 rounded-full ${myResignation.manager_decision === "Approved" ? "bg-emerald-500" : (myResignation.status === "Pending Manager Review" ? "bg-amber-500 animate-ping" : "bg-slate-300")}`} />
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {myResignation.manager_name || "Reporting Manager"}
                          </div>
                          <div className="text-[10px] mt-1 font-semibold">
                            {myResignation.manager_decision === "Approved" ? (
                              <span className="text-emerald-600">✓ Endorsed by Manager</span>
                            ) : myResignation.manager_decision === "Rejected" ? (
                              <span className="text-rose-600">✕ Rejected by Manager</span>
                            ) : myResignation.status === "Pending Manager Review" ? (
                              <span className="text-amber-600 font-bold">⏳ Awaiting Manager Review</span>
                            ) : (
                              <span className="text-slate-400">Waiting / Direct</span>
                            )}
                          </div>
                        </div>
                        {myResignation.manager_comments && (
                          <div className="mt-2 text-[10px] text-slate-500 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                            "{myResignation.manager_comments}"
                          </div>
                        )}
                      </div>

                      {/* Step 3: HOD (Final Departmental Approval & Handover Assignment) */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">3. Dept Head (HOD)</span>
                            <span className={`w-2 h-2 rounded-full ${myResignation.hod_decision === "Approved" ? "bg-emerald-500" : (myResignation.status === "Pending HOD Approval" ? "bg-indigo-500 animate-ping" : "bg-slate-300")}`} />
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {myResignation.hod_name || `${myResignation.dept} HOD`}
                          </div>
                          <div className="text-[10px] mt-1 font-semibold">
                            {myResignation.hod_decision === "Approved" ? (
                              <span className="text-emerald-600">✓ Approved & Assigned Handover</span>
                            ) : myResignation.hod_decision === "Rejected" ? (
                              <span className="text-rose-600">✕ Rejected by HOD</span>
                            ) : myResignation.status === "Pending HOD Approval" ? (
                              <span className="text-indigo-600 font-bold">⏳ Awaiting HOD Endorsement</span>
                            ) : (
                              <span className="text-slate-400">Waiting for prior steps</span>
                            )}
                          </div>
                        </div>
                        {myResignation.hod_comments && (
                          <div className="mt-2 text-[10px] text-slate-500 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                            "{myResignation.hod_comments}"
                          </div>
                        )}
                      </div>

                      {/* Step 4: Handover Completion & Colleague Confirmation */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">4. Colleague Handover</span>
                            <span className={`w-2 h-2 rounded-full ${myResignation.handover_status === "CONFIRMED_BY_ASSIGNEE" ? "bg-emerald-500" : (myResignation.handover_status === "SUBMITTED_BY_EMPLOYEE" ? "bg-blue-500 animate-ping" : (myResignation.handover_status === "ASSIGNED" ? "bg-amber-500 animate-ping" : "bg-slate-300"))}`} />
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {myResignation.handover_person_name || "Assignee (by HOD)"}
                          </div>
                          <div className="text-[10px] mt-1 font-semibold">
                            {myResignation.handover_status === "CONFIRMED_BY_ASSIGNEE" ? (
                              <span className="text-emerald-600">✓ Handover Confirmed</span>
                            ) : myResignation.handover_status === "SUBMITTED_BY_EMPLOYEE" ? (
                              <span className="text-blue-600 font-bold">⏳ Held: Awaiting Assignee</span>
                            ) : myResignation.handover_status === "ASSIGNED" ? (
                              <span className="text-amber-600 font-bold">⏳ Handover in Progress</span>
                            ) : (
                              <span className="text-slate-400">Waiting for HOD</span>
                            )}
                          </div>
                        </div>
                        {myResignation.handover_target_date && (
                          <div className="mt-2 text-[10px] text-slate-500 bg-amber-50/60 dark:bg-slate-800 p-1.5 rounded">
                            Target: {formatDate(myResignation.handover_target_date)}
                          </div>
                        )}
                      </div>

                      {/* Step 5: HR Final Approval */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">5. HR Final Sign-off</span>
                            <span className={`w-2 h-2 rounded-full ${myResignation.status === "Approved" || myResignation.clearance_raised ? "bg-emerald-500" : (myResignation.status === "Pending HR Approval" ? "bg-purple-500 animate-ping" : "bg-slate-300")}`} />
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {myResignation.hr_name || "HR Head / Operations"}
                          </div>
                          <div className="text-[10px] mt-1 font-semibold">
                            {myResignation.status === "Approved" || myResignation.clearance_raised ? (
                              <span className="text-emerald-600">✓ Final HR Approval Granted</span>
                            ) : myResignation.status === "Pending HR Approval" ? (
                              <span className="text-purple-600 font-bold">⏳ Awaiting HR Final Sign-off</span>
                            ) : (
                              <span className="text-slate-400">Monitoring Process</span>
                            )}
                          </div>
                        </div>
                        {myResignation.hr_confirmed_lwd && (
                          <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-300 font-bold bg-purple-50 dark:bg-purple-950/40 p-1.5 rounded">
                            Confirmed LWD: {formatDate(myResignation.hr_confirmed_lwd)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* HANDOVER PROCESS CARD (HOD Assigned Handover) */}
                  {myResignation.handover_status && myResignation.handover_status !== "NOT_ASSIGNED" && (
                    <div className="p-5 bg-gradient-to-r from-amber-50/70 to-indigo-50/50 dark:from-amber-950/20 dark:to-indigo-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-amber-200/60 dark:border-amber-900/40">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                            <FiBriefcase className="w-4 h-4" />
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              Document & Task Handover Stage
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                Assigned by HOD
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Department Head assigned {myResignation.handover_person_name} to take over your documents, projects, and work handover.
                            </p>
                          </div>
                        </div>

                        <div>
                          {myResignation.handover_status === "ASSIGNED" && (
                            <button
                              type="button"
                              onClick={() => openSubmitHandoverModal(myResignation)}
                              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                              Complete & Submit Handover
                            </button>
                          )}
                          {myResignation.handover_status === "SUBMITTED_BY_EMPLOYEE" && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                <FiClock className="w-3.5 h-3.5 animate-spin" />
                                Held: Awaiting {myResignation.handover_person_name}'s Confirmation
                              </span>
                              <button
                                type="button"
                                onClick={() => openSubmitHandoverModal(myResignation)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl"
                              >
                                Update Submission
                              </button>
                            </div>
                          )}
                          {myResignation.handover_status === "CONFIRMED_BY_ASSIGNEE" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                              <FiCheck className="w-4 h-4" />
                              Handover Confirmed Complete ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Handover Details Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200/60 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Colleague</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {myResignation.handover_person_name || "—"} ({myResignation.handover_person_id})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned By</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {myResignation.handover_assigned_by_name || myResignation.hod_name || "Department Head"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Handover Date</span>
                          <span className="font-bold text-blue-600">
                            {formatDate(myResignation.handover_target_date || myResignation.last_working_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">HR Supervision</span>
                          <span className="font-semibold text-purple-600">
                            Actively Monitoring Live
                          </span>
                        </div>
                      </div>

                      {myResignation.handover_note && (
                        <div className="p-2.5 bg-amber-50/80 dark:bg-slate-800/60 rounded-xl border border-amber-200/50 text-xs text-amber-900 dark:text-amber-200">
                          <span className="font-bold block text-[10px] uppercase">HOD Instructions:</span>
                          "{myResignation.handover_note}"
                        </div>
                      )}

                      {/* Stage Notification Alert Banner */}
                      {myResignation.handover_status === "SUBMITTED_BY_EMPLOYEE" && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2.5">
                          <FiAlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Handover Completed & Submitted by You</span>
                            <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                              You completed your handover documentation on {formatDate(myResignation.handover_employee_completed_at)}.
                              As per company policy, this resignation is <strong>held at this stage</strong> until {myResignation.handover_person_name} confirms the handover process completion. HR is actively monitoring throughout.
                            </p>
                            {myResignation.handover_employee_remarks && (
                              <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-blue-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-slate-500">Your Submitted Remarks / Links:</span> {myResignation.handover_employee_remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {myResignation.handover_status === "CONFIRMED_BY_ASSIGNEE" && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                          <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Handover Process Verified & Confirmed!</span>
                            <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                              {myResignation.handover_person_name} verified and confirmed your handover completion on {formatDate(myResignation.handover_assignee_confirmed_at)}.
                              Workflow has unlocked and advanced to HR for final sign-off!
                            </p>
                            {myResignation.handover_assignee_remarks && (
                              <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                                <span className="font-bold text-slate-500">Colleague Confirmation Remarks:</span> {myResignation.handover_assignee_remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. SERIAL DEPARTMENT CLEARANCE TRACKER (RED PENDING -> GREEN CLEARED TICK) */}
                  {myResignation.clearance_raised ? (
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <LuCheckCheck className="w-5 h-5 text-emerald-600" />
                              Serial Department Clearance Pipeline
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              Order Enforced
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Clearances execute in strict serial sequence. Green tick indicates cleared; red indicates pending by default.
                          </p>
                        </div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                          {myResignation.clearance_steps?.filter(s => s.status === "Cleared").length || 0} of {myResignation.clearance_steps?.length || 6} Cleared
                        </div>
                      </div>

                      {/* Clearance Steps Horizontal / Vertical Timeline */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {myResignation.clearance_steps?.map((step, idx) => {
                          const isCleared = step.status === "Cleared";
                          return (
                            <div
                              key={step.id || idx}
                              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                                isCleared
                                  ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                                  : "bg-rose-50/30 border-rose-200/70 dark:bg-rose-950/20 dark:border-rose-900/40"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-slate-400">Step {step.order}</span>
                                  {isCleared ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs" title="Cleared">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs" title="Pending">
                                      ✕
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {getDeptIcon(step.id)}
                                  <span className="truncate">{step.name}</span>
                                </div>

                                <div className="mt-2 text-[10px]">
                                  {isCleared ? (
                                    <span className="font-bold text-emerald-600 block">
                                      Cleared by {step.cleared_by_name || "Lead"}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-rose-600 block">
                                      Pending Clearance
                                    </span>
                                  )}
                                  {step.cleared_at && (
                                    <span className="text-slate-400 block text-[9px]">
                                      {formatDate(step.cleared_at)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {step.remarks && (
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 italic truncate" title={step.remarks}>
                                  "{step.remarks}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* 3. EXIT INTERVIEW SECTION (RAISED AFTER ACCOUNTS CLEARANCE) */}
                  {myResignation.exit_interview_raised ? (
                    <div className="p-5 bg-gradient-to-r from-violet-50/60 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/20 rounded-2xl border border-violet-200 dark:border-violet-900/40 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-violet-200/60 dark:border-violet-900/40">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-violet-600 text-white shadow-xs">
                            <FiMessageSquare className="w-4 h-4" />
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-violet-900 dark:text-violet-200">
                              Exit Interview Form (10 Questions Scheduled)
                            </h3>
                            <p className="text-xs text-violet-700/80 dark:text-violet-300">
                              HR has raised your Exit Interview following final accounts clearance.
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                          Status: {myResignation.exit_interview_status}
                        </span>
                      </div>

                      {/* Interview Schedule Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-violet-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Date</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{formatDate(myResignation.exit_interview_date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Time</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{myResignation.exit_interview_time || "10:30 AM"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Interviewer</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{myResignation.exit_interview_interviewer || "HR Manager"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Mode & Venue</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{myResignation.exit_interview_mode} ({myResignation.exit_interview_location || "HQ"})</span>
                        </div>
                      </div>

                      {/* The 10 Questions Preview */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-violet-900 dark:text-violet-200 uppercase tracking-wide block">
                          Set of 10 Exit Questions Raised for Interview
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {(myResignation.exit_interview_questions || DEFAULT_EXIT_QUESTIONS).slice(0, 10).map((q, qIdx) => (
                            <div key={q.id || qIdx} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-violet-100 dark:border-slate-800">
                              <span className="font-bold text-violet-700 text-[10px] block">
                                Question {qIdx + 1} • {q.category}
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 font-medium text-[11px] mt-0.5">
                                {q.question}
                              </p>
                              {q.answer && (
                                <p className="text-slate-500 text-[10px] mt-1 italic">
                                  Response: {q.answer}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                    </>
                  )}
                </div>
              ) : (
                /* Empty state: No active resignation */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mb-4">
                    <LuLogOut className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    No Active Resignation Filed
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 mb-6 leading-relaxed">
                    You currently have no active separation or resignation request. Filing a resignation routes it through
                    TL, Manager, HOD, and HR, followed by serial department clearances and an Exit Interview.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>File Resignation Form</span>
                  </button>
                </div>
              )}

              {/* EMPLOYEE RESIGNATION APPLICATION HISTORY */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <FiClock className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Resignation History & Prior Applications
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {resignationHistory.length}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Complete chronological record of all resignation submissions by you.
                      </p>
                    </div>
                  </div>
                </div>

                {resignationHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No previous resignation records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold whitespace-nowrap">
                          <th className="py-2.5 px-3 whitespace-nowrap">Submitted On</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Target LWD</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Notice Period</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Reason</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Final Status</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                        {resignationHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                            <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(item.created_at)}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(item.hr_confirmed_lwd || item.last_working_date)}
                            </td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {item.notice_period}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              <span className="whitespace-nowrap inline-block" title={item.reason}>
                                {item.reason}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedRecordForDetail(item)}
                                className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TEAM & ORGANIZATION SEPARATION QUEUE (Manager / HOD / HR / Accounts View) */}
          {!isEmployeeOnly && activeTab === "team_queue" && (
            <div className="space-y-6">
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Filed
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {totalCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-cyan-200/80 dark:border-cyan-900/40 p-3 shadow-xs bg-cyan-50/20">
                  <div className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
                    TL Review
                  </div>
                  <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                    {pendingTlCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 p-3 shadow-xs bg-amber-50/20">
                  <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Manager
                  </div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {pendingManagerCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 p-3 shadow-xs bg-indigo-50/20">
                  <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    HOD Approval
                  </div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {pendingHodCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300/80 dark:border-amber-900/40 p-3 shadow-xs bg-amber-100/20">
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Handover Stage
                  </div>
                  <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
                    {pendingHandoverCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 p-3 shadow-xs bg-purple-50/20">
                  <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                    HR Sign-off
                  </div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                    {pendingHrCount}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 p-3 shadow-xs bg-emerald-50/20">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Clearances
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {clearanceInProgressCount}
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
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
                    <option value="Pending TL Review">Pending TL Review</option>
                    <option value="Pending Manager Review">Pending Manager Review</option>
                    <option value="Pending HOD Approval">Pending HOD Approval</option>
                    <option value="Pending Handover Completion">Pending Handover Completion</option>
                    <option value="Awaiting Handover Confirmation">Awaiting Handover Confirmation</option>
                    <option value="Pending HR Approval">Pending HR Approval</option>
                    <option value="Approved">Approved (Awaiting Clearance)</option>
                    <option value="Clearance In Progress">Clearance In Progress</option>
                    <option value="Clearance Completed - Pending Exit Interview">Clearance Completed</option>
                    <option value="Exit Interview Scheduled">Exit Interview Scheduled</option>
                    <option value="Separation Completed">Separation Completed</option>
                    <option value="Withdrawn">Withdrawn / Cancelled</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Historical">All Historical Records</option>
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
                    <option value="HR">HR</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Marketing">Marketing</option>
                    <option value="IT">IT</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
              </div>

              {/* Applications Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left text-xs border-collapse min-w-[1150px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                        <th className="py-3.5 px-4 whitespace-nowrap">Employee</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Department</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Reason</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Notice & Tenure</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Last Working Date</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Current Workflow Stage</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                      {filteredResignations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 whitespace-nowrap">
                            No resignation records found matching criteria
                          </td>
                        </tr>
                      ) : (
                        filteredResignations.map((item) => {
                          const isClearedCount = item.clearance_steps?.filter(s => s.status === "Cleared").length || 0;
                          const totalClearances = item.clearance_steps?.length || 6;
                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors whitespace-nowrap"
                            >
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2.5 whitespace-nowrap">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                    {item.name ? item.name[0] : "E"}
                                  </div>
                                  <div className="whitespace-nowrap">
                                    <span className="font-bold text-slate-800 dark:text-slate-100 block whitespace-nowrap">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block whitespace-nowrap">
                                      ID: {item.employee_id} • {item.designation || "Staff"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                                {item.dept || "General"}
                              </td>

                              <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">
                                <span className="whitespace-nowrap inline-block" title={item.reason}>
                                  {item.reason}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                <div className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">{item.notice_period}</div>
                                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                  Tenure: {calculateTenure(item.joining_date, item.last_working_date)}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                  {formatDate(item.hr_confirmed_lwd || item.hod_recommended_lwd || item.manager_recommended_lwd || item.last_working_date)}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="whitespace-nowrap">{getStatusBadge(item.status)}</div>
                                {isHR && item.status !== "Approved" && item.status !== "Separation Completed" && (
                                  <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 mt-1 inline-block whitespace-nowrap">
                                    HR Monitoring
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                                  {/* 1. Team Lead Review */}
                                  {(isTeamLead || isHR) && item.status === "Pending TL Review" && (
                                    <button
                                      type="button"
                                      onClick={() => openActionModal(item, "tl_action")}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 transition-colors whitespace-nowrap shrink-0"
                                    >
                                      TL Review
                                    </button>
                                  )}

                                  {/* 2. Manager Review */}
                                  {(isManager || isHR) && item.status === "Pending Manager Review" && (
                                    <button
                                      type="button"
                                      onClick={() => openActionModal(item, "manager_action")}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors whitespace-nowrap shrink-0"
                                    >
                                      Manager Review
                                    </button>
                                  )}

                                  {/* 3. Department Head (HOD) Approval */}
                                  {(isHOD || isHR) && item.status === "Pending HOD Approval" && (
                                    <button
                                      type="button"
                                      onClick={() => openActionModal(item, "hod_action")}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors whitespace-nowrap shrink-0"
                                    >
                                      HOD Approval
                                    </button>
                                  )}

                                  {/* Handover Confirmation by Assigned Colleague, HOD, or HR */}
                                  {(item.handover_person_id === userEmpId || isHOD || isHR) && item.handover_status === "SUBMITTED_BY_EMPLOYEE" && (
                                    <button
                                      type="button"
                                      onClick={() => openConfirmHandoverModal(item)}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                                    >
                                      <FiCheck className="w-3.5 h-3.5" />
                                      Confirm Handover
                                    </button>
                                  )}

                                  {/* 4. HR Final Approval */}
                                  {isHR && item.status === "Pending HR Approval" && (
                                    <button
                                      type="button"
                                      onClick={() => openActionModal(item, "hr_action")}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors whitespace-nowrap shrink-0"
                                    >
                                      HR Approval
                                    </button>
                                  )}

                                  {/* HR Monitoring Handover Stage Indicator */}
                                  {isHR && (item.status === "Pending Handover Completion" || item.status === "Awaiting Handover Confirmation") && (
                                    <span
                                      className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                                      title={`Handover assigned to ${item.handover_person_name || "colleague"}. HR is monitoring until completion confirmation.`}
                                    >
                                      <FiClock className="w-3 h-3 text-amber-500" />
                                      Handover Pending
                                    </span>
                                  )}

                                  {/* 5. Raise Clearance Form Button (for HR upon approval) */}
                                  {isHR && (item.status === "Approved" || item.approval_stage === "HR_APPROVED") && !item.clearance_raised && (
                                    <button
                                      type="button"
                                      onClick={() => openRaiseClearanceModal(item)}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                                    >
                                      <FiPlus className="w-3.5 h-3.5" />
                                      Raise Clearance Form
                                    </button>
                                  )}

                                  {/* 6. Manage Serial Clearance Pipeline */}
                                  {!isEmployeeOnly && item.clearance_raised && item.clearance_overall_status !== "Completed" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedRecordForClearance(item);
                                        setClearanceActiveStepRemarks("");
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                                    >
                                      <LuCheckCheck className="w-3.5 h-3.5 text-blue-600" />
                                      Clearance ({isClearedCount}/{totalClearances})
                                    </button>
                                  )}

                                  {/* 7. Exit Interview Form Button (Triggered after all clearances completed - HR Only) */}
                                  {isHR && item.clearance_overall_status === "Completed" && item.status !== "Separation Completed" && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenExitInterviewModal(item)}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700 shadow-xs transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                                    >
                                      <FiMessageSquare className="w-3.5 h-3.5" />
                                      {item.exit_interview_raised ? "Conduct Exit Interview" : "Raise Exit Interview"}
                                    </button>
                                  )}

                                  {/* Employee Resignation History */}
                                  {(isHR || isHOD || isManager) && (
                                    <button
                                      type="button"
                                      onClick={() => openEmployeeHistoryModal(item)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                                      title="View employee resignation history"
                                    >
                                      <FiClock className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Details View */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecordForDetail(item)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                    title="View full timeline & details"
                                  >
                                    <FiFileText className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESIGNATION HISTORY & ARCHIVES (HR & Supervisors View) */}
          {(isHR || isHOD || isManager || isTeamLead) && activeTab === "resignation_history" && (
            <div className="space-y-6">
              {/* Historical KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Historical</span>
                    <FiArchive className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {totalHistoricalCount}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Withdrawn, completed & rejected requests</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 p-4 shadow-xs bg-amber-50/20">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Withdrawn / Cancelled</span>
                    <FiAlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                    {totalWithdrawnCount}
                  </div>
                  <p className="text-[11px] text-amber-600/80 mt-1">Retracted by employees</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 p-4 shadow-xs bg-emerald-50/20">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Separations Completed</span>
                    <LuCheckCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {totalCompletedCount}
                  </div>
                  <p className="text-[11px] text-emerald-600/80 mt-1">Full clearances & exit signed off</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 p-4 shadow-xs bg-rose-50/20">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Rejected Requests</span>
                    <FiXCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                    {totalRejectedCount}
                  </div>
                  <p className="text-[11px] text-rose-600/80 mt-1">Rejected at review or approval stage</p>
                </div>
              </div>

              {/* History Filter Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search historical records by employee name, code, designation, or reason..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                    <FiFilter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500">Status:</span>
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="All">All Historical</option>
                      <option value="Withdrawn">Withdrawn / Cancelled</option>
                      <option value="Completed">Separation Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Dept:</span>
                    <select
                      value={historyDeptFilter}
                      onChange={(e) => setHistoryDeptFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="All">All Departments</option>
                      {Array.from(new Set(resignations.map((r) => r.dept).filter(Boolean))).map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {(historySearchQuery || historyStatusFilter !== "All" || historyDeptFilter !== "All") && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySearchQuery("");
                        setHistoryStatusFilter("All");
                        setHistoryDeptFilter("All");
                      }}
                      className="p-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Clear filters"
                    >
                      <FiRefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Historical Resignations Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiArchive className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Historical Resignation Records ({historicalResignations.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Includes all withdrawn, concluded, and archived applications
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 uppercase text-[10px] font-bold whitespace-nowrap">
                        <th className="py-3 px-4 whitespace-nowrap">Employee</th>
                        <th className="py-3 px-4 whitespace-nowrap">Submitted On</th>
                        <th className="py-3 px-4 whitespace-nowrap">Notice & Target LWD</th>
                        <th className="py-3 px-4 whitespace-nowrap">Reason & Notes</th>
                        <th className="py-3 px-4 whitespace-nowrap">Final Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                      {historicalResignations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                            <FiArchive className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-slate-600 dark:text-slate-300">No historical records found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or status filter.</p>
                          </td>
                        </tr>
                      ) : (
                        historicalResignations.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                                  {(item.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="whitespace-nowrap">
                                  <div className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.name}</div>
                                  <div className="text-[11px] text-slate-400 whitespace-nowrap">{item.employee_id} • {item.dept}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(item.created_at)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block whitespace-nowrap">
                                {formatDate(item.hr_confirmed_lwd || item.last_working_date)}
                              </span>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">Notice: {item.notice_period}</span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap" title={item.reason}>
                                {item.reason}
                              </div>
                              {(item.status === "Withdrawn" || item.status === "Cancelled") && (
                                <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                  <FiAlertCircle className="w-3 h-3 shrink-0" />
                                  <span className="whitespace-nowrap" title={item.withdrawal_reason || "Withdrawn"}>
                                    {item.withdrawal_reason || `Withdrawn by ${item.withdrawn_by || "Employee"}`}
                                  </span>
                                </div>
                              )}
                              {item.reason_details && !item.withdrawal_reason && (
                                <div className="text-[10px] text-slate-400 italic whitespace-nowrap" title={item.reason_details}>
                                  "{item.reason_details}"
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openEmployeeHistoryModal(item)}
                                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                                  title="View full employee resignation timeline"
                                >
                                  <FiClock className="w-3.5 h-3.5" />
                                  Timeline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecordForDetail(item)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                  title="View dossier & log"
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: HIERARCHICAL APPROVAL REVIEW (TL, Manager, HOD, HR) */}
      {/* ------------------------------------------------------------- */}
      {selectedRecordForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FiShield className="w-4 h-4 text-blue-600" />
                {actionType === "tl_action" && "Team Lead (TL) Review"}
                {actionType === "manager_action" && "Department Manager Review"}
                {actionType === "hod_action" && "Department Head (HOD) Final Approval"}
                {actionType === "hr_action" && "HR Final Approval & LWD Confirmation"}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecordForAction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Details Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedRecordForAction.name} ({selectedRecordForAction.employee_id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department & Designation:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedRecordForAction.dept} • {selectedRecordForAction.designation || "Staff"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Notice Period:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedRecordForAction.notice_period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Last Working Date:</span>
                <span className="font-bold text-blue-600">{formatDate(selectedRecordForAction.last_working_date)}</span>
              </div>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <span className="font-semibold block text-[11px]">Reason: {selectedRecordForAction.reason}</span>
                {selectedRecordForAction.reason_details && <p className="italic text-[11px] mt-0.5">"{selectedRecordForAction.reason_details}"</p>}
              </div>
            </div>

            {/* Decision Radio Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Decision Recommendation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionDecision("Approved")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    actionDecision === "Approved"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600"
                  }`}
                >
                  <FiCheck className="w-4 h-4 text-emerald-600" />
                  {actionType === "hr_action" ? "Grant Final Approval" : "Recommend & Endorse"}
                </button>
                <button
                  type="button"
                  onClick={() => setActionDecision("Rejected")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    actionDecision === "Rejected"
                      ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600"
                  }`}
                >
                  <FiX className="w-4 h-4 text-rose-600" />
                  Reject Request
                </button>
              </div>
            </div>

            {/* HOD Handover Assignment Section */}
            {actionType === "hod_action" && actionDecision === "Approved" && (
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <div>
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 block uppercase tracking-wide flex items-center gap-1.5">
                    <FiBriefcase className="w-4 h-4 text-indigo-600" />
                    Assign Colleague for Handover (Required)
                  </span>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300 mt-0.5">
                    Select an employee who will receive {selectedRecordForAction.name}'s documents and work handover. Both will be notified and the resignation process will be held until the assigned colleague confirms completion.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Handover Colleague *
                  </label>
                  <select
                    value={hodHandoverPersonId}
                    onChange={(e) => {
                      const selectedEmp = employees.find(
                        (emp) => (emp.employee_id || emp.employeeCode || emp.id) === e.target.value
                      );
                      setHodHandoverPersonId(e.target.value);
                      if (selectedEmp) {
                        const name = selectedEmp.name || `${selectedEmp.first_name || ""} ${selectedEmp.last_name || ""}`.trim() || selectedEmp.employee_name;
                        setHodHandoverPersonName(name);
                      } else {
                        setHodHandoverPersonName("");
                      }
                    }}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Choose employee to take over docs & tasks --</option>
                    {employees
                      .filter((emp) => (emp.employee_id || emp.employeeCode || emp.id) !== selectedRecordForAction.employee_id)
                      .map((emp) => {
                        const empId = emp.employee_id || emp.employeeCode || emp.id;
                        const empName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_name;
                        return (
                          <option key={empId} value={empId}>
                            {empName} ({empId}) {emp.dept || emp.department ? `• ${emp.dept || emp.department}` : ""}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Handover Target Date
                    </label>
                    <input
                      type="date"
                      value={hodHandoverTargetDate}
                      onChange={(e) => setHodHandoverTargetDate(e.target.value)}
                      className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Scope / Priority Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Repositories, client files, keys..."
                      value={hodHandoverNote}
                      onChange={(e) => setHodHandoverNote(e.target.value)}
                      className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Last Working Date Recommendation/Confirmation */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {actionType === "hr_action" ? "Confirmed Last Working Date (LWD)" : "Recommended Last Working Date"}
              </label>
              <input
                type="date"
                value={actionLwd}
                onChange={(e) => setActionLwd(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Review Comments & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Enter feedback, handover instructions, or rationale for decision..."
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecordForAction(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={actionProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {actionProcessing ? "Saving..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: RAISE CLEARANCE FORM (HR ACTION) */}
      {/* ------------------------------------------------------------- */}
      {showRaiseClearanceModal && selectedRecordForClearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LuCheckCheck className="w-5 h-5 text-emerald-600" />
                  Raise Department Clearance Form
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Initiate the serial clearance pipeline for {selectedRecordForClearance.name} ({selectedRecordForClearance.employee_id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRaiseClearanceModal(false);
                  setSelectedRecordForClearance(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Serial Clearance Sequence Reordering Banner & Controls */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wide flex items-center gap-1.5">
                  <LuArrowUpDown className="w-4 h-4 text-blue-600" />
                  Rearrange Serial Clearance Sequence
                </span>
                <button
                  type="button"
                  onClick={resetClearancePipeline}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-700 hover:bg-blue-50 transition-colors"
                >
                  <FiRefreshCw className="w-3 h-3" />
                  Reset Standard Order
                </button>
              </div>
              <p className="text-[11px] text-blue-700/90 dark:text-blue-300">
                Clearance will be enforced in <strong>strict serial order</strong> (one department after another).
                <strong> Drag & drop</strong> rows by the handle or click the <strong>Up (↑) / Down (↓)</strong> arrows to change which department comes first, second, etc.
              </p>
            </div>

            {/* Reorderable Clearance Pipeline List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Configured Sequence ({clearancePipeline.length} Departments)</span>
                <span className="text-[11px] text-slate-400">Step 1 starts immediately upon launch</span>
              </div>

              <div className="space-y-1.5">
                {clearancePipeline.map((dept, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === clearancePipeline.length - 1;
                  const isDragging = draggedDeptIndex === idx;

                  return (
                    <div
                      key={dept.id || idx}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                        isDragging
                          ? "bg-blue-100/70 border-blue-400 shadow-md scale-[0.99] dark:bg-blue-950/60"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-slate-600"
                      }`}
                    >
                      {/* Left: Drag Handle + Step Indicator + Dept Info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5 rounded touch-none"
                          title="Click & drag to reorder"
                        >
                          <LuGripVertical className="w-4 h-4" />
                        </div>

                        <span
                          className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs ${
                            isFirst
                              ? "bg-emerald-600 text-white"
                              : isLast
                              ? "bg-purple-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {dept.name}
                            </span>
                            {dept.is_custom && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                                Custom
                              </span>
                            )}
                            {isFirst && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                1st Step
                              </span>
                            )}
                            {isLast && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                                Final Step
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {dept.desc || `Serial verification and dues clearance for ${dept.dept_key}`}
                          </span>
                        </div>
                      </div>

                      {/* Right: Up / Down Position Switchers & Remove */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => moveDeptUp(idx)}
                          disabled={isFirst}
                          className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                          title="Move step up (earlier in sequence)"
                        >
                          <FiArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDeptDown(idx)}
                          disabled={isLast}
                          className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                          title="Move step down (later in sequence)"
                        >
                          <FiArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDeptFromPipeline(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove from clearance chain"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Department to Clearance Sequence */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Add Another Department to Clearance Sequence
              </span>

              <div className="flex gap-2">
                <select
                  value={selectedCustomDeptInput}
                  onChange={(e) => setSelectedCustomDeptInput(e.target.value)}
                  className="flex-1 h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose department to include --</option>
                  {AVAILABLE_CUSTOM_DEPTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const deptToAdd = selectedCustomDeptInput || customDeptTextInput;
                    if (deptToAdd) {
                      addCustomDeptToPipeline(deptToAdd);
                    } else {
                      toast.error("Please choose or type a department name");
                    }
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all"
                >
                  + Add Step
                </button>
              </div>

              {/* Custom Write-in */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or type custom department name (e.g. Operations, Security, Legal)..."
                  value={customDeptTextInput}
                  onChange={(e) => setCustomDeptTextInput(e.target.value)}
                  className="flex-1 h-8 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customDeptTextInput.trim()) {
                      e.preventDefault();
                      addCustomDeptToPipeline(customDeptTextInput.trim());
                    }
                  }}
                />
                {customDeptTextInput.trim() && (
                  <button
                    type="button"
                    onClick={() => addCustomDeptToPipeline(customDeptTextInput.trim())}
                    className="px-3 py-1 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowRaiseClearanceModal(false);
                  setSelectedRecordForClearance(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRaiseClearanceSubmit}
                disabled={clearanceProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <FiSend className="w-3.5 h-3.5" />
                {clearanceProcessing ? "Launching..." : `Launch Serial Clearance Pipeline (${clearancePipeline.length} Steps)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: SERIAL CLEARANCE PIPELINE MANAGEMENT & SIGN-OFF */}
      {/* ------------------------------------------------------------- */}
      {selectedRecordForClearance && !showRaiseClearanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LuCheckCheck className="w-5 h-5 text-emerald-600" />
                  Serial Department Clearance Pipeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clearance for: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedRecordForClearance.name} ({selectedRecordForClearance.employee_id})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForClearance(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Department Serial Steps List */}
            <div className="space-y-3">
              {selectedRecordForClearance.clearance_steps?.map((step, idx) => {
                const isCleared = step.status === "Cleared";
                // Step is active if all prior steps are cleared and this one is pending
                const isPriorCleared = selectedRecordForClearance.clearance_steps.slice(0, idx).every(s => s.status === "Cleared");
                const isActive = !isCleared && isPriorCleared;
                const isLocked = !isCleared && !isPriorCleared;

                return (
                  <div
                    key={step.id || idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isCleared
                        ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                        : isActive
                        ? "bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                        : "bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {/* Status Icon Indicator: Green Cleared Tick vs Red Pending Tick */}
                        {isCleared ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0" title="Cleared">
                            <FiCheck className="w-5 h-5" />
                          </div>
                        ) : isLocked ? (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold shadow-xs shrink-0" title="Locked">
                            <FiLock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 animate-pulse" title="Active Pending">
                            <FiX className="w-5 h-5" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                              Step {step.order}: {step.name}
                            </span>
                            {isCleared ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                ✓ Cleared (Green)
                              </span>
                            ) : isLocked ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                🔒 Locked
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                                ✕ Red (Pending Active)
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {isCleared ? (
                              <span>Cleared by <span className="font-semibold text-slate-700 dark:text-slate-300">{step.cleared_by_name || "Lead"}</span> on {formatDate(step.cleared_at)}</span>
                            ) : isLocked ? (
                              <span className="text-slate-400">Waiting for Step {step.order - 1} clearance first</span>
                            ) : (
                              <span className="text-blue-700 dark:text-blue-400 font-semibold">Active in serial sequence — Awaiting department approval</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action for Active Step */}
                      {isActive && (isHR || ((isAccounts || isHOD || isManager) && selectedRecordForClearance.employee_id !== userEmpId)) && (
                        <div className="flex items-center gap-2 pt-2 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleClearDeptStep(step.id)}
                            disabled={clearanceProcessing}
                            className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1"
                          >
                            <FiCheck className="w-3.5 h-3.5" />
                            Mark Cleared (Green Tick)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step Remarks */}
                    {step.remarks && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
                        "{step.remarks}"
                      </div>
                    )}

                    {/* Active Step Remarks Input */}
                    {isActive && (
                      <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/50">
                        <input
                          type="text"
                          placeholder="Optional remarks (e.g. All assets returned, no dues pending)..."
                          value={clearanceActiveStepRemarks}
                          onChange={(e) => setClearanceActiveStepRemarks(e.target.value)}
                          className="w-full h-8 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* HR Add Custom Department Feature */}
            {isHR && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Add Custom Dept:</span>
                <select
                  value={selectedCustomDeptInput}
                  onChange={(e) => setSelectedCustomDeptInput(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex-1"
                >
                  <option value="">Select department to add...</option>
                  {AVAILABLE_CUSTOM_DEPTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddCustomDeptToPipeline(selectedCustomDeptInput)}
                  disabled={!selectedCustomDeptInput}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  + Add to Chain
                </button>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecordForClearance(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: EXIT INTERVIEW FORM (DETAILS & 10 QUESTIONS) */}
      {/* ------------------------------------------------------------- */}
      {showExitInterviewModal && selectedRecordForExitInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FiMessageSquare className="w-5 h-5 text-violet-600" />
                  Exit Interview Form & Final HR Clearance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Raised for: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecordForExitInterview.name} ({selectedRecordForExitInterview.employee_id})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExitInterviewModal(false);
                  setSelectedRecordForExitInterview(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Required Employee Details Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-black text-slate-700 dark:text-slate-300 block mb-2 uppercase tracking-wide text-[10px]">
                Employee Separation Dossier
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Employee</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedRecordForExitInterview.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Department & Role</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{selectedRecordForExitInterview.dept} • {selectedRecordForExitInterview.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Tenure</span>
                  <span className="font-bold text-blue-600">{calculateTenure(selectedRecordForExitInterview.joining_date, selectedRecordForExitInterview.hr_confirmed_lwd || selectedRecordForExitInterview.last_working_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Confirmed LWD</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatDate(selectedRecordForExitInterview.hr_confirmed_lwd || selectedRecordForExitInterview.last_working_date)}</span>
                </div>
              </div>
            </div>

            {/* 2. Interview Details Card */}
            <div className="p-3.5 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-200/80 dark:border-violet-900/50 text-xs space-y-3">
              <span className="font-black text-violet-900 dark:text-violet-300 block uppercase tracking-wide text-[10px]">
                Interview Schedule & Location
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Interview Date</label>
                  <input
                    type="date"
                    value={exitInterviewForm.interview_date}
                    onChange={(e) => setExitInterviewForm({ ...exitInterviewForm, interview_date: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="10:30 AM"
                    value={exitInterviewForm.interview_time}
                    onChange={(e) => setExitInterviewForm({ ...exitInterviewForm, interview_time: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Interviewer Name</label>
                  <input
                    type="text"
                    value={exitInterviewForm.interview_interviewer}
                    onChange={(e) => setExitInterviewForm({ ...exitInterviewForm, interview_interviewer: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Mode</label>
                  <select
                    value={exitInterviewForm.interview_mode}
                    onChange={(e) => setExitInterviewForm({ ...exitInterviewForm, interview_mode: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="In person">In person</option>
                    <option value="Video call">Video call</option>
                    <option value="Phone call">Phone call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Location / Meeting Link</label>
                  <input
                    type="text"
                    placeholder="Room 3B / Google Meet Link..."
                    value={exitInterviewForm.interview_location}
                    onChange={(e) => setExitInterviewForm({ ...exitInterviewForm, interview_location: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. The 10 Questions Form */}
            <div className="space-y-3">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide block">
                The 10 Exit Interview Questions & Evaluation
              </span>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {exitInterviewForm.questions?.map((q, idx) => (
                  <div key={q.id || idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400">
                        Question {idx + 1} • {q.category}
                      </span>
                      {/* Rating stars / level */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleQuestionRatingChange(idx, star)}
                            className={`p-1 rounded ${q.rating >= star ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs">
                      {q.question}
                    </p>

                    <textarea
                      rows={2}
                      placeholder="Record employee feedback or response..."
                      value={q.answer || ""}
                      onChange={(e) => handleQuestionAnswerChange(idx, e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowExitInterviewModal(false);
                  setSelectedRecordForExitInterview(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleScheduleExitInterview}
                  disabled={exitInterviewProcessing}
                  className="px-4 py-2 text-xs font-bold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-xl shadow-xs"
                >
                  Save Schedule & Notify Employee
                </button>
                <button
                  type="button"
                  onClick={handleCompleteExitInterview}
                  disabled={exitInterviewProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <LuCheckCheck className="w-4 h-4" />
                  Complete Interview & Conclude Separation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: EMPLOYEE HANDOVER SUBMISSION MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSubmitHandoverModal && selectedRecordForHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FiBriefcase className="w-5 h-5 text-blue-600" />
                  Submit Document & Task Handover
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned by HOD to: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecordForHandover.handover_person_name} ({selectedRecordForHandover.handover_person_id})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitHandoverModal(false);
                  setSelectedRecordForHandover(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* HOD Handover Directive Overview */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Completion Date:</span>
                <span className="font-bold text-blue-600">
                  {formatDate(selectedRecordForHandover.handover_target_date || selectedRecordForHandover.last_working_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned By:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedRecordForHandover.handover_assigned_by_name || selectedRecordForHandover.hod_name || "Department Head"}
                </span>
              </div>
              {selectedRecordForHandover.handover_note && (
                <div className="pt-1 border-t border-amber-200/50 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">HOD Scope:</span> "{selectedRecordForHandover.handover_note}"
                </div>
              )}
            </div>

            {/* Handover Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                Handover Checklist & Deliverables
              </span>
              <div className="space-y-2">
                {handoverChecklist.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs cursor-pointer hover:bg-slate-100/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.done || false}
                      onChange={() => {
                        const updated = handoverChecklist.map((c, i) =>
                          i === idx ? { ...c, done: !c.done } : c
                        );
                        setHandoverChecklist(updated);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <span className={`font-medium ${item.done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                      {item.item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Handover Documentation Remarks / Links */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Handover Documentation Notes & Asset Links *
              </label>
              <textarea
                rows={4}
                placeholder="Include Google Drive/SharePoint links, GitHub/GitLab repositories, Jira tickets status, client communications transfer, and team access credentials transfer notes..."
                value={handoverRemarks}
                onChange={(e) => setHandoverRemarks(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
              />
            </div>

            {/* Policy Holding Notice */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Process Policy:</strong> Once submitted, this resignation will be held at this stage until <strong>{selectedRecordForHandover.handover_person_name}</strong> verifies and confirms completion. HR monitors the whole process live.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowSubmitHandoverModal(false);
                  setSelectedRecordForHandover(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitHandover}
                disabled={handoverProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <FiSend className="w-3.5 h-3.5" />
                {handoverProcessing ? "Submitting..." : `Submit Handover to ${selectedRecordForHandover.handover_person_name ? selectedRecordForHandover.handover_person_name.split(" ")[0] : "Colleague"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 7: ASSIGNEE HANDOVER CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {showConfirmHandoverModal && selectedRecordForConfirmHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                  Verify & Confirm Handover Completion
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resigning Employee: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecordForConfirmHandover.name} ({selectedRecordForConfirmHandover.employee_id})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmHandoverModal(false);
                  setSelectedRecordForConfirmHandover(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Submitted Handover Review Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted On:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {formatDate(selectedRecordForConfirmHandover.handover_employee_completed_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-semibold">Employee Handover Notes & Links:</span>
                <p className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                  {selectedRecordForConfirmHandover.handover_employee_remarks || "No additional remarks entered."}
                </p>
              </div>
            </div>

            {/* Checklist Verification */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                Verify Handover Checklist Items
              </span>
              <div className="space-y-2">
                {confirmChecklist.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs cursor-pointer hover:bg-slate-100/50"
                  >
                    <input
                      type="checkbox"
                      checked={item.done || false}
                      onChange={() => {
                        const updated = confirmChecklist.map((c, i) =>
                          i === idx ? { ...c, done: !c.done } : c
                        );
                        setConfirmChecklist(updated);
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {item.item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confirmation Decision */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Assignee Verification Decision
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDecision("Confirmed")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    confirmDecision === "Confirmed"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600"
                  }`}
                >
                  <FiCheck className="w-4 h-4 text-emerald-600" />
                  Confirm Handover Completed
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDecision("Revision_Requested")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    confirmDecision === "Revision_Requested"
                      ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600"
                  }`}
                >
                  <FiX className="w-4 h-4 text-rose-600" />
                  Request Revisions
                </button>
              </div>
            </div>

            {/* Assignee Confirmation Remarks */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Confirmation Feedback / Notes
              </label>
              <textarea
                rows={3}
                placeholder={
                  confirmDecision === "Confirmed"
                    ? "Enter confirmation notes (e.g. Received all repository rights, client contacts, and team assets in good order)..."
                    : "Specify what items or documents are missing or require revision before handover can be completed..."
                }
                value={confirmRemarks}
                onChange={(e) => setConfirmRemarks(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs resize-none"
              />
            </div>

            {/* Consequence Notification */}
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              confirmDecision === "Confirmed"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200"
            }`}>
              {confirmDecision === "Confirmed" ? (
                <>
                  <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Advancement:</strong> Confirming completion will mark the handover verified, unlock the resignation, and advance it to <strong>HR for final sign-off</strong>.
                  </p>
                </>
              ) : (
                <>
                  <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Revision:</strong> The employee will be notified to update their handover documentation. The resignation process will remain held at the handover stage.
                  </p>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmHandoverModal(false);
                  setSelectedRecordForConfirmHandover(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={confirmProcessing}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                  confirmDecision === "Confirmed"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                <FiCheck className="w-3.5 h-3.5" />
                {confirmProcessing
                  ? "Processing..."
                  : confirmDecision === "Confirmed"
                  ? "Confirm Handover Completed ✓"
                  : "Send Revision Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: DETAIL VIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Resignation Dossier & Event Log
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              {(selectedRecordForDetail.status === "Withdrawn" || selectedRecordForDetail.status === "Cancelled") && (
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
                    <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Resignation Request Withdrawn</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      Cancelled
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    This resignation was withdrawn on <strong>{formatDate(selectedRecordForDetail.withdrawn_at || selectedRecordForDetail.updated_at)}</strong> by <strong>{selectedRecordForDetail.withdrawn_by || "Employee"}</strong>.
                  </p>
                  {selectedRecordForDetail.withdrawal_reason && selectedRecordForDetail.withdrawal_reason !== "Withdrawn by employee" && (
                    <div className="mt-1 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] italic">
                      Withdrawal Note: "{selectedRecordForDetail.withdrawal_reason}"
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold">{selectedRecordForDetail.name} ({selectedRecordForDetail.employee_id})</span>
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
                  <span className="text-slate-500">Confirmed LWD:</span>
                  <span className="font-bold text-blue-600">{formatDate(selectedRecordForDetail.hr_confirmed_lwd || selectedRecordForDetail.last_working_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span>{getStatusBadge(selectedRecordForDetail.status)}</span>
                </div>
              </div>

              {/* Handover Audit Section */}
              {selectedRecordForDetail.handover_status && selectedRecordForDetail.handover_status !== "NOT_ASSIGNED" && (
                <div className="p-3 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5 bg-amber-50/30 dark:bg-amber-950/20 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200 block uppercase tracking-wide text-[10px]">
                    Document & Task Handover Audit
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Handover Assignee:</span>
                    <span className="font-bold">{selectedRecordForDetail.handover_person_name} ({selectedRecordForDetail.handover_person_id})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Date:</span>
                    <span className="font-semibold text-blue-600">{formatDate(selectedRecordForDetail.handover_target_date)}</span>
                  </div>
                  {selectedRecordForDetail.handover_note && (
                    <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                      <span className="font-semibold">HOD Scope:</span> "{selectedRecordForDetail.handover_note}"
                    </div>
                  )}
                  {selectedRecordForDetail.handover_employee_remarks && (
                    <div className="text-slate-600 dark:text-slate-300 text-[11px] pt-1 border-t border-amber-100 dark:border-amber-900/40">
                      <span className="font-semibold">Employee Submission ({formatDate(selectedRecordForDetail.handover_employee_completed_at)}):</span> "{selectedRecordForDetail.handover_employee_remarks}"
                    </div>
                  )}
                  {selectedRecordForDetail.handover_assignee_remarks && (
                    <div className="text-slate-600 dark:text-slate-300 text-[11px] pt-1 border-t border-amber-100 dark:border-amber-900/40">
                      <span className="font-semibold">Assignee Confirmation ({formatDate(selectedRecordForDetail.handover_assignee_confirmed_at)}):</span> "{selectedRecordForDetail.handover_assignee_remarks}"
                    </div>
                  )}
                </div>
              )}

              {/* Multi-step Approval Chain History */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wide text-[10px]">
                  Endorsement Audit Trail
                </span>
                {selectedRecordForDetail.tl_name && (
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-bold">Team Lead:</span> {selectedRecordForDetail.tl_name} ({selectedRecordForDetail.tl_decision})
                    {selectedRecordForDetail.tl_comments && <p className="italic text-[11px]">"{selectedRecordForDetail.tl_comments}"</p>}
                  </div>
                )}
                {selectedRecordForDetail.manager_name && (
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-bold">Manager:</span> {selectedRecordForDetail.manager_name} ({selectedRecordForDetail.manager_decision})
                    {selectedRecordForDetail.manager_comments && <p className="italic text-[11px]">"{selectedRecordForDetail.manager_comments}"</p>}
                  </div>
                )}
                {selectedRecordForDetail.hod_name && (
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-bold">Department Head (HOD):</span> {selectedRecordForDetail.hod_name} ({selectedRecordForDetail.hod_decision})
                    {selectedRecordForDetail.hod_comments && <p className="italic text-[11px]">"{selectedRecordForDetail.hod_comments}"</p>}
                  </div>
                )}
                {selectedRecordForDetail.hr_name && (
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-bold">HR Head:</span> {selectedRecordForDetail.hr_name} ({selectedRecordForDetail.hr_decision})
                    {selectedRecordForDetail.hr_comments && <p className="italic text-[11px]">"{selectedRecordForDetail.hr_comments}"</p>}
                  </div>
                )}
              </div>

              {/* Notifications Timeline */}
              {Array.isArray(selectedRecordForDetail.notifications) && selectedRecordForDetail.notifications.length > 0 && (
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <FiBell className="w-3.5 h-3.5 text-blue-600" />
                    Process Notification Log
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedRecordForDetail.notifications.map((n, i) => (
                      <div key={n.id || i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px]">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{n.title}</div>
                        <div className="text-slate-500 mt-0.5">{n.message}</div>
                        <div className="text-slate-400 text-[9px] mt-1">{formatDate(n.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: EMPLOYEE RESIGNATION HISTORY TIMELINE MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedEmployeeForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <FiClock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Resignation History — {selectedEmployeeForHistory.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedEmployeeForHistory.employee_id} • {selectedEmployeeForHistory.dept} • {selectedEmployeeForHistory.designation || "Staff"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployeeForHistory(null);
                  setEmployeeHistoryRecords([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {loadingEmployeeHistory ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span>Loading complete employee resignation history...</span>
              </div>
            ) : employeeHistoryRecords.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                <FiArchive className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No resignation records found for this employee.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="text-xs text-slate-500 font-semibold flex items-center justify-between px-1">
                  <span>Total Submissions: {employeeHistoryRecords.length}</span>
                  <span className="text-[11px] text-slate-400">Chronological history from newest to oldest</span>
                </div>

                <div className="space-y-3">
                  {employeeHistoryRecords.map((record, index) => {
                    const isWithdrawn = record.status === "Withdrawn" || record.status === "Cancelled";
                    return (
                      <div
                        key={record.id || index}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          isWithdrawn
                            ? "bg-amber-50/40 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40"
                            : record.status === "Separation Completed"
                            ? "bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                            : "bg-slate-50/70 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700/80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-700/60">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              Submission #{employeeHistoryRecords.length - index}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              Submitted: {formatDate(record.created_at)}
                            </span>
                          </div>
                          <div>
                            {getStatusBadge(record.status)}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Notice Period</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{record.notice_period}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Requested LWD</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(record.last_working_date)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Confirmed LWD</span>
                            <span className="font-bold text-blue-600">{formatDate(record.hr_confirmed_lwd || record.last_working_date)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Approval Stage</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{record.approval_stage || "—"}</span>
                          </div>
                        </div>

                        {/* Stated Reason */}
                        <div className="text-xs space-y-0.5 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <span className="font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase block">Stated Reason:</span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">{record.reason}</p>
                          {record.reason_details && (
                            <p className="text-slate-500 italic text-[11px] mt-0.5">"{record.reason_details}"</p>
                          )}
                        </div>

                        {/* If Withdrawn Banner */}
                        {isWithdrawn && (
                          <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/40 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">
                                Withdrawn on {formatDate(record.withdrawn_at || record.updated_at)} by {record.withdrawn_by || "Employee"}
                              </span>
                              {record.withdrawal_reason && (
                                <span className="text-[11px] italic block mt-0.5">
                                  Withdrawal Note: "{record.withdrawal_reason}"
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action to View Dossier */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordForDetail(record);
                            }}
                            className="px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <FiFileText className="w-3.5 h-3.5" />
                            View Full Dossier
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployeeForHistory(null);
                  setEmployeeHistoryRecords([]);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resignation Application Modal */}
      <ResignationModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        employees={employees}
        onSuccess={() => fetchResignations()}
      />
    </div>
  );
}
