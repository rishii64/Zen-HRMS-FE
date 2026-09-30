import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Table,
    Badge,
    Spinner,
    Form,
    Modal,
    Alert,
    Nav,
    InputGroup,
    Dropdown,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    LuBriefcase,
    LuPlus,
    LuUserCheck,
    LuClock,
    LuCircleCheck,
    LuCircleX,
    LuSearch,
    LuFileText,
    LuUpload,
    LuEye,
    LuExternalLink,
    LuCalendar,
    LuTriangleAlert,
    LuBuilding2,
    LuUsers,
    LuRefreshCw,
    LuCheck,
    LuSend,
    LuMessageSquare,
    LuVideo,
    LuArrowUpRight,
    LuEllipsisVertical,
    LuFileCheck,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api";

// Department presets
const DEPARTMENTS = [
    "All",
    "IT",
    "Engineering",
    "HR",
    "Accounts",
    "Sales",
    "Marketing",
    "Operations",
    "Quality Assurance",
];

// Experience brackets
const EXP_OPTIONS = [
    "0 - 1 Year (Fresher/Entry)",
    "1 - 3 Years (Junior)",
    "3 - 5 Years (Mid-Level)",
    "5 - 8 Years (Senior)",
    "8 - 12 Years (Lead / Principal)",
    "12+ Years (Executive / Director)",
];

const NOTICE_PERIODS = [
    "Immediate (Serving Notice)",
    "15 Days",
    "30 Days",
    "45 Days",
    "60 Days",
    "90 Days",
];

const Requisition = () => {
    const navigate = useNavigate();

    // Active User & RBAC: Permanent role based on user profile
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const rawRole = (localStorage.getItem("role") || storedUser.role || "").toLowerCase();
    const designation = (storedUser.designation || "").toLowerCase();
    const isHodRole =
        ["hod", "manager", "department head"].includes(rawRole) ||
        designation.includes("hod") ||
        designation.includes("head") ||
        designation.includes("manager");
    const activeRole = isHodRole ? "hod" : "hr";
    const employeeId = storedUser.employee_id || localStorage.getItem("employeeCode") || "EMP-001";
    const userName = storedUser.name || localStorage.getItem("userName") || "User";
    const userDept = storedUser.dept || localStorage.getItem("dept") || "IT";

    // Role permissions: Only HOD can raise requisition, only HR can list resume
    const isHOD = activeRole === "hod";
    const isHR = activeRole === "hr";

    // Active Tab
    const [activeTab, setActiveTab] = useState("requisitions");

    // Data State
    const [requisitions, setRequisitions] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [stats, setStats] = useState({
        totalRequisitions: 0,
        pendingApproval: 0,
        activeSourcing: 0,
        inHodReview: 0,
        interviewsActive: 0,
        totalCandidates: 0,
        shortlistedForInterview: 0,
        pendingHodReview: 0,
    });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedReqFilter, setSelectedReqFilter] = useState("ALL");

    // Modals
    const [showRaiseReqModal, setShowRaiseReqModal] = useState(false);
    const [showCeoApprovalModal, setShowCeoApprovalModal] = useState(false);
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
    const [showHodDecisionModal, setShowHodDecisionModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showViewReqModal, setShowViewReqModal] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);

    // Active Selected Items for Modals
    const [selectedRequisition, setSelectedRequisition] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Form State: Raise Requisition (HOD)
    const initialReqForm = {
        position: "",
        department: isHOD && userDept ? userDept : "IT",
        experience_required: "3 - 5 Years (Mid-Level)",
        job_description: "",
        max_salary: "",
        salary_frequency: "Per Annum (CTC)",
        joining_date_type: "Normal",
        tentative_joining_date: "",
        is_budgeted: "Yes",
        vacancies_count: 1,
        reason_for_hiring: "Team Expansion",
        replacement_for_employee: "",
    };
    const [reqForm, setReqForm] = useState(initialReqForm);
    const [approvalFile, setApprovalFile] = useState(null);
    const [submittingReq, setSubmittingReq] = useState(false);

    // Form State: CEO / COO Approval
    const [approvalAction, setApprovalAction] = useState("APPROVED");
    const [approvalComments, setApprovalComments] = useState("");
    const [submittingApproval, setSubmittingApproval] = useState(false);

    // Form State: Add Candidate Resume (HR)
    const initialCandidateForm = {
        requisition_id: "",
        candidate_name: "",
        email: "",
        phone: "",
        current_company: "",
        current_designation: "",
        experience_years: "4 Years",
        current_ctc: "",
        expected_ctc: "",
        notice_period: "30 Days",
        source: "LinkedIn",
        hr_screening_notes: "",
        resume_url: "",
    };
    const [candidateForm, setCandidateForm] = useState(initialCandidateForm);
    const [resumeFile, setResumeFile] = useState(null);
    const [submittingCandidate, setSubmittingCandidate] = useState(false);

    // Form State: HOD Decision
    const [hodDecisionAction, setHodDecisionAction] = useState("SHORTLIST_FOR_INTERVIEW");
    const [hodFeedback, setHodFeedback] = useState("");
    const [submittingHodDecision, setSubmittingHodDecision] = useState(false);

    // Form State: Schedule Interview (HR)
    const [scheduleData, setScheduleData] = useState({
        candidate_email: "",
        interview_date: "",
        interview_time: "11:00 AM",
        interview_mode: "Online (Google Meet)",
        interview_meeting_link: "",
        interview_notes: "",
        interview_stage: "SCHEDULED",
    });
    const [submittingSchedule, setSubmittingSchedule] = useState(false);

    // =========================================================================
    // API LOADERS
    // =========================================================================

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const [reqRes, candRes, statsRes] = await Promise.all([
                api.get("/recruitment/requisitions"),
                api.get("/recruitment/candidates"),
                api.get("/recruitment/stats"),
            ]);

            if (reqRes.data?.success) {
                setRequisitions(reqRes.data.data || []);
            }
            if (candRes.data?.success) {
                setCandidates(candRes.data.data || []);
            }
            if (statsRes.data?.success) {
                setStats(statsRes.data.data || {});
            }
        } catch (err) {
            console.error("Fetch recruitment data error:", err);
            toast.error(err.response?.data?.error || "Failed to load recruitment data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAllData();
    };

    // Format currency helper - strictly single line
    const formatCurrency = (val, freq = "Per Annum (CTC)") => {
        if (!val && val !== 0) return "—";
        const num = Number(val);
        const formatted = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(num);
        const freqSuffix = freq === "Per Month" ? "/mo" : "/yr";
        return `${formatted} ${freqSuffix}`;
    };

    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    // =========================================================================
    // MATERIAL DESIGN 3 CHIPS & BADGES (High-contrast, defined borders)
    // =========================================================================

    const renderStatusBadge = (status) => {
        switch (status) {
            case "PENDING_CEO_COO_APPROVAL":
                return (
                    <span className="md-chip md-chip-amber">
                        <span className="md-dot md-dot-amber" />
                        Pending CEO/COO
                    </span>
                );
            case "SOURCING_CANDIDATES":
                return (
                    <span className="md-chip md-chip-blue">
                        <span className="md-dot md-dot-blue" />
                        Sourcing Resumes
                    </span>
                );
            case "HOD_REVIEW":
                return (
                    <span className="md-chip md-chip-purple">
                        <span className="md-dot md-dot-purple" />
                        HOD Reviewing
                    </span>
                );
            case "INTERVIEWS_IN_PROGRESS":
                return (
                    <span className="md-chip md-chip-emerald">
                        <span className="md-dot md-dot-emerald" />
                        Interviews Active
                    </span>
                );
            case "CLOSED":
                return (
                    <span className="md-chip md-chip-slate">
                        <LuCircleCheck size={13} />
                        Closed
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="md-chip md-chip-rose">
                        <LuCircleX size={13} />
                        Budget Rejected
                    </span>
                );
            default:
                return (
                    <span className="md-chip md-chip-slate">
                        {status}
                    </span>
                );
        }
    };

    const renderHodSelectionBadge = (status) => {
        switch (status) {
            case "SHORTLISTED_FOR_INTERVIEW":
                return (
                    <span className="md-chip md-chip-emerald">
                        <LuCircleCheck size={13} />
                        Shortlisted for Interview
                    </span>
                );
            case "PENDING_REVIEW":
                return (
                    <span className="md-chip md-chip-amber">
                        <LuClock size={13} />
                        Awaiting HOD Review
                    </span>
                );
            case "ON_HOLD":
                return (
                    <span className="md-chip md-chip-slate">
                        <LuClock size={13} />
                        On Hold
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="md-chip md-chip-rose">
                        <LuCircleX size={13} />
                        Rejected by HOD
                    </span>
                );
            default:
                return <span className="md-chip md-chip-slate">{status}</span>;
        }
    };

    // =========================================================================
    // HANDLERS: RAISE REQUISITION (HOD ONLY)
    // =========================================================================

    const handleOpenRaiseModal = () => {
        setReqForm({
            ...initialReqForm,
            department: userDept || "IT",
        });
        setApprovalFile(null);
        setShowRaiseReqModal(true);
    };

    const handleSubmitRequisition = async (e) => {
        e.preventDefault();
        if (!reqForm.position.trim()) {
            toast.error("Please enter the Position / Designation");
            return;
        }
        if (!reqForm.job_description.trim()) {
            toast.error("Please provide the Job Description (JD)");
            return;
        }
        if (!reqForm.max_salary) {
            toast.error("Please enter the Maximum Salary for this position");
            return;
        }

        // If non-budgeted, CEO/COO approval PDF is strictly mandatory
        if (reqForm.is_budgeted === "No") {
            if (!approvalFile) {
                toast.error("CEO/COO approval document (PDF) is required for non-budgeted requisitions. Please upload the PDF.");
                return;
            }
            const isPdf =
                approvalFile.type === "application/pdf" ||
                approvalFile.name.toLowerCase().endsWith(".pdf");
            if (!isPdf) {
                toast.error("Only PDF files (.pdf) are allowed for the CEO/COO approval document.");
                return;
            }
        }

        try {
            setSubmittingReq(true);
            const formData = new FormData();
            formData.append("position", reqForm.position.trim());
            formData.append("department", reqForm.department);
            formData.append("experience_required", reqForm.experience_required);
            formData.append("job_description", reqForm.job_description.trim());
            formData.append("max_salary", reqForm.max_salary);
            formData.append("salary_frequency", reqForm.salary_frequency);
            formData.append("joining_date_type", reqForm.joining_date_type);
            if (reqForm.tentative_joining_date) {
                formData.append("tentative_joining_date", reqForm.tentative_joining_date);
            }
            formData.append("is_budgeted", reqForm.is_budgeted === "Yes");
            formData.append("vacancies_count", reqForm.vacancies_count);
            formData.append("reason_for_hiring", reqForm.reason_for_hiring);
            if (reqForm.replacement_for_employee) {
                formData.append("replacement_for_employee", reqForm.replacement_for_employee);
            }
            formData.append("hod_name", userName);
            formData.append("hod_id", employeeId);

            if (approvalFile) {
                formData.append("approval_document", approvalFile);
            }

            const res = await api.post("/recruitment/requisitions", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Requisition submitted successfully!");
                setShowRaiseReqModal(false);
                setApprovalFile(null);
                fetchAllData();
            }
        } catch (err) {
            console.error("Submit requisition error:", err);
            toast.error(err.response?.data?.error || "Failed to submit requisition");
        } finally {
            setSubmittingReq(false);
        }
    };

    // =========================================================================
    // HANDLERS: CEO / COO BUDGET APPROVAL
    // =========================================================================

    const handleOpenCeoApproval = (requisition) => {
        setSelectedRequisition(requisition);
        setApprovalAction("APPROVED");
        setApprovalComments("");
        setShowCeoApprovalModal(true);
    };

    const handleProcessBudgetApproval = async () => {
        if (!selectedRequisition) return;
        try {
            setSubmittingApproval(true);
            const res = await api.post(`/recruitment/requisitions/${selectedRequisition.id}/approve-budget`, {
                action: approvalAction,
                comments: approvalComments,
            });

            if (res.data?.success) {
                toast.success(res.data.message || `Requisition budget ${approvalAction.toLowerCase()} successfully!`);
                setShowCeoApprovalModal(false);
                fetchAllData();
            }
        } catch (err) {
            console.error("Budget approval error:", err);
            toast.error(err.response?.data?.error || "Failed to process approval");
        } finally {
            setSubmittingApproval(false);
        }
    };

    // =========================================================================
    // HANDLERS: HR RESUME SOURCING & LISTING
    // =========================================================================

    const handleOpenAddCandidate = (preselectedReq = null) => {
        const defaultReqId = preselectedReq?.id || (approvedRequisitions.length > 0 ? approvedRequisitions[0].id : "");
        setCandidateForm({
            ...initialCandidateForm,
            requisition_id: defaultReqId,
        });
        setResumeFile(null);
        setShowAddCandidateModal(true);
    };

    const handleSubmitCandidate = async (e) => {
        e.preventDefault();
        if (!candidateForm.requisition_id) {
            toast.error("Please select a target Requisition");
            return;
        }
        if (!candidateForm.candidate_name.trim()) {
            toast.error("Please enter Candidate Name");
            return;
        }

        try {
            setSubmittingCandidate(true);
            const formData = new FormData();
            Object.keys(candidateForm).forEach((key) => {
                if (candidateForm[key] !== null && candidateForm[key] !== undefined) {
                    formData.append(key, candidateForm[key]);
                }
            });

            if (resumeFile) {
                formData.append("resume", resumeFile);
            }

            const res = await api.post("/recruitment/candidates", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Candidate resume listed for HOD review!");
                setShowAddCandidateModal(false);
                fetchAllData();
            }
        } catch (err) {
            console.error("Add candidate error:", err);
            toast.error(err.response?.data?.error || "Failed to list candidate resume");
        } finally {
            setSubmittingCandidate(false);
        }
    };

    // =========================================================================
    // HANDLERS: HOD SHORTLISTING & INTERVIEW REQUEST
    // =========================================================================

    const handleOpenHodDecision = (candidate, actionType = "SHORTLIST_FOR_INTERVIEW") => {
        setSelectedCandidate(candidate);
        setHodDecisionAction(actionType);
        setHodFeedback(
            actionType === "SHORTLIST_FOR_INTERVIEW"
                ? "Profile fits our JD requirements well. Please proceed with Round 1 HR interview and schedule technical round."
                : ""
        );
        setShowHodDecisionModal(true);
    };

    const handleSubmitHodDecision = async () => {
        if (!selectedCandidate) return;
        try {
            setSubmittingHodDecision(true);
            const res = await api.post(`/recruitment/candidates/${selectedCandidate.id}/hod-action`, {
                action: hodDecisionAction,
                feedback: hodFeedback,
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Candidate decision saved successfully!");
                setShowHodDecisionModal(false);
                fetchAllData();
            }
        } catch (err) {
            console.error("HOD candidate action error:", err);
            toast.error(err.response?.data?.error || "Failed to record decision");
        } finally {
            setSubmittingHodDecision(false);
        }
    };

    // =========================================================================
    // HANDLERS: HR INTERVIEW SCHEDULING
    // =========================================================================

    const handleOpenScheduleModal = (candidate) => {
        setSelectedCandidate(candidate);
        setScheduleData({
            candidate_email: candidate.email || "",
            interview_date: candidate.interview_date || new Date().toISOString().split("T")[0],
            interview_time: candidate.interview_time || "11:00 AM",
            interview_mode: candidate.interview_mode || "Online (Google Meet)",
            interview_meeting_link: candidate.interview_meeting_link || "",
            interview_notes: candidate.interview_notes || (candidate.hod_feedback ? `Interview requested by HOD: ${candidate.hod_feedback}` : ""),
            interview_stage: candidate.interview_stage === "INTERVIEW_REQUESTED" ? "SCHEDULED" : (candidate.interview_stage || "SCHEDULED"),
        });
        setShowScheduleModal(true);
    };

    const handleSubmitSchedule = async () => {
        if (!selectedCandidate) return;
        if (!scheduleData.candidate_email || !scheduleData.candidate_email.trim()) {
            toast.error("Please enter the candidate's email address so the meeting invitation can be delivered.");
            return;
        }
        if (!scheduleData.interview_date) {
            toast.error("Please select an interview date.");
            return;
        }
        try {
            setSubmittingSchedule(true);
            const res = await api.patch(`/recruitment/candidates/${selectedCandidate.id}/stage`, scheduleData);

            if (res.data?.success) {
                if (res.data.emailSent) {
                    toast.success("Interview scheduled! Meeting invitation email sent to Candidate, HR & HOD.");
                } else {
                    toast.success("Interview scheduled & stage updated!");
                }
                setShowScheduleModal(false);
                fetchAllData();
            }
        } catch (err) {
            console.error("Schedule error:", err);
            toast.error(err.response?.data?.error || "Failed to schedule interview");
        } finally {
            setSubmittingSchedule(false);
        }
    };

    // =========================================================================
    // FILTERED DATA
    // =========================================================================

    const approvedRequisitions = useMemo(() => {
        return requisitions.filter(
            (r) => r.is_budgeted || r.budget_approval_status === "APPROVED_BY_CEO"
        );
    }, [requisitions]);

    const filteredRequisitions = useMemo(() => {
        return requisitions.filter((r) => {
            if (deptFilter !== "All" && r.department.toLowerCase() !== deptFilter.toLowerCase()) {
                return false;
            }
            if (statusFilter !== "ALL" && r.status !== statusFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchCode = r.requisition_code?.toLowerCase().includes(q);
                const matchPos = r.position?.toLowerCase().includes(q);
                const matchDept = r.department?.toLowerCase().includes(q);
                const matchHod = r.hod_name?.toLowerCase().includes(q);
                if (!matchCode && !matchPos && !matchDept && !matchHod) return false;
            }
            return true;
        });
    }, [requisitions, deptFilter, statusFilter, searchQuery]);

    const filteredCandidates = useMemo(() => {
        return candidates.filter((c) => {
            if (selectedReqFilter !== "ALL" && c.requisition_id !== selectedReqFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = c.candidate_name?.toLowerCase().includes(q);
                const matchEmail = c.email?.toLowerCase().includes(q);
                const matchCompany = c.current_company?.toLowerCase().includes(q);
                const matchReq = c.requisition?.position?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchCompany && !matchReq) return false;
            }
            return true;
        });
    }, [candidates, selectedReqFilter, searchQuery]);

    const shortlistedCandidates = useMemo(() => {
        return filteredCandidates.filter(
            (c) => c.interview_requested || c.hod_selection_status === "SHORTLISTED_FOR_INTERVIEW"
        );
    }, [filteredCandidates]);

    return (
        <Container fluid className="px-3 px-md-4 py-3 max-w-7xl recruitment-portal bg-slate-50 min-vh-100 font-sans">
            <style>{`
        /* Surface Card */
        .md-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 6px 16px -2px rgba(15, 23, 42, 0.04);
        }

        /* Material Search & Filter Toolbar */
        .md-toolbar {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }

        .md-search-group {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          height: 38px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .md-search-group:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .md-search-group input {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          font-size: 0.8125rem;
          color: #0f172a;
          width: 100%;
          padding: 6px 8px;
        }
        .md-search-group input::placeholder {
          color: #94a3b8;
        }

        .md-filter-select {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 10px !important;
          font-size: 0.8125rem !important;
          color: #1e293b !important;
          font-weight: 500 !important;
          padding: 6px 12px !important;
          height: 38px !important;
          box-shadow: none !important;
          transition: all 0.2s ease !important;
        }
        .md-filter-select:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        }

        /* Material Data Table */
        .md-table-wrap {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          position: relative;
        }

        .md-table-wrap::-webkit-scrollbar {
          height: 6px;
        }
        .md-table-wrap::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .md-table-wrap::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .md-table-wrap::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .md-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: 0;
        }

        .md-table th {
          background: #f8fafc !important;
          color: #334155 !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding: 13px 16px !important;
          border-bottom: 2px solid #e2e8f0 !important;
          border-top: none !important;
          white-space: nowrap !important;
          line-height: 1.2;
        }

        .md-table td {
          padding: 13px 16px !important;
          vertical-align: middle !important;
          border-bottom: 1px solid #f1f5f9 !important;
          border-top: none !important;
          font-size: 0.8125rem !important;
          white-space: nowrap !important;
          color: #0f172a;
          background: #ffffff;
        }

        .md-table tbody tr {
          transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .md-table tbody tr:hover td {
          background-color: #f8fafc !important;
        }

        /* Actions Column (Unpinned, Clean Material Dropdown) */
        .md-table th.col-actions,
        .md-table td.col-actions {
          position: static !important;
          text-align: right !important;
          border-left: none !important;
          box-shadow: none !important;
          white-space: nowrap !important;
          min-width: 100px !important;
          width: 100px !important;
        }

        .md-action-btn {
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          color: #334155 !important;
          font-weight: 600 !important;
          font-size: 0.75rem !important;
          padding: 4px 10px !important;
          border-radius: 6px !important;
          transition: all 0.15s ease-in-out !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 5px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        .md-action-btn:hover,
        .md-action-btn:focus,
        .dropdown.show .md-action-btn {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
          color: #0f172a !important;
        }
        .md-action-btn::after {
          display: none !important;
        }

        /* High-Contrast Material Chips (No washed-out text) */
        .md-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 10px !important;
          border-radius: 20px !important;
          font-size: 0.735rem !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
          letter-spacing: 0.01em !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
        }

        .md-chip-emerald {
          background-color: #ecfdf5 !important;
          color: #065f46 !important;
          border: 1px solid #6ee7b7 !important;
        }
        .md-chip-blue {
          background-color: #eff6ff !important;
          color: #1e40af !important;
          border: 1px solid #93c5fd !important;
        }
        .md-chip-amber {
          background-color: #fffbeb !important;
          color: #92400e !important;
          border: 1px solid #fcd34d !important;
        }
        .md-chip-purple {
          background-color: #faf5ff !important;
          color: #6b21a8 !important;
          border: 1px solid #d8b4fe !important;
        }
        .md-chip-rose {
          background-color: #fef2f2 !important;
          color: #991b1b !important;
          border: 1px solid #fca5a5 !important;
        }
        .md-chip-slate {
          background-color: #f1f5f9 !important;
          color: #334155 !important;
          border: 1px solid #cbd5e1 !important;
        }

        .md-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .md-dot-emerald { background: #059669; }
        .md-dot-blue { background: #2563eb; }
        .md-dot-amber { background: #d97706; }
        .md-dot-purple { background: #9333ea; }
        .md-dot-rose { background: #dc2626; }

        /* Material Buttons */
        .md-btn-tonal {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 12px;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .md-btn-tonal:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .md-btn-primary {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 14px;
          box-shadow: 0 1px 2px rgba(37, 99, 235, 0.25);
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .md-btn-primary:hover {
          background: #1d4ed8;
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.35);
        }

        .md-btn-success {
          background: #059669;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 14px;
          box-shadow: 0 1px 2px rgba(5, 150, 105, 0.25);
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .md-btn-success:hover {
          background: #047857;
          color: #ffffff;
        }

        .md-btn-warning {
          background: #d97706;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 14px;
          box-shadow: 0 1px 2px rgba(217, 119, 6, 0.25);
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .md-btn-warning:hover {
          background: #b45309;
          color: #ffffff;
        }

        /* Material Navigation Tabs */
        .md-tab-btn {
          background: transparent;
          border: none;
          border-radius: 24px;
          padding: 7px 18px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          cursor: pointer;
        }
        .md-tab-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .md-tab-btn.active {
          background: #1e3a8a;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(30, 58, 138, 0.25);
        }

        /* Material Table Footer */
        .md-table-footer {
          padding: 10px 16px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          font-size: 0.75rem;
          color: #64748b;
        }
      `}</style>

            {/* ─── TOP BAR ───────────────────────────────────────── */}
            <div className="md-card px-4 py-3 mb-3">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div
                            className="d-flex align-items-center justify-content-center text-white rounded-3 fs-5"
                            style={{ width: 44, height: 44, background: "linear-gradient(135deg, #1e3a8a, #3b82f6)" }}
                        >
                            <LuBriefcase />
                        </div>
                        <div>
                            <h5 className="fw-bold mb-0 text-slate-900 tracking-tight fs-6">Recruitment & Hiring Portal</h5>
                            <p className="text-slate-500 mb-0 text-xs">
                                HOD Requisition, Executive Budget Clearance, HR Resume Sourcing, and HOD Candidate Selection
                            </p>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap justify-content-md-end">
                        <div className="d-flex align-items-center gap-2 bg-slate-50 border border-slate-200 rounded-3 px-3 py-1.5 shadow-sm">
                            <span className="text-slate-500 text-xs whitespace-nowrap font-medium">Profile Role:</span>
                            <span className={`badge rounded-pill text-xs fw-bold px-2.5 py-1 d-flex align-items-center gap-1.5 ${isHOD ? "bg-blue-100 text-black border border-blue-200" : "bg-emerald-100 text-black border border-emerald-200"}`}>
                                <span className={`md-dot ${isHOD ? "md-dot-blue" : "md-dot-emerald"}`} />
                                {isHOD ? "HOD (Department Head)" : "HR / Recruiter"}
                            </span>
                        </div>

                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-1.5 text-slate-600 border-slate-200 bg-white rounded-2"
                            title="Refresh Portal Data"
                        >
                            <LuRefreshCw size={14} className={refreshing ? "spin" : ""} />
                        </Button>

                        {/* Strict RBAC: Only HOD can raise requisition */}
                        {isHOD && (
                            <button
                                type="button"
                                className="md-btn-primary d-inline-flex align-items-center gap-1.5 px-3 py-1.5"
                                onClick={handleOpenRaiseModal}
                            >
                                <LuPlus size={14} /> Raise Requisition
                            </button>
                        )}

                        {/* Strict RBAC: Only HR can list candidate resumes */}
                        {isHR && (
                            <button
                                type="button"
                                className="md-btn-tonal d-inline-flex align-items-center gap-1.5 px-3 py-1.5"
                                onClick={() => handleOpenAddCandidate()}
                            >
                                <LuUpload size={14} /> List Resume
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── MATERIAL METRIC STRIP ───────────────────────────────────────────── */}
            <div className="md-card px-4 py-2.5 mb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 text-nowrap">
                    <div className="border-end border-slate-200 flex-fill flex items-center justify-around">
                        <span className="text-slate-500 text-xs text-uppercase tracking-wider fw-bold d-block">
                            Total Requisitions
                        </span>
                        <div className="fs-5 fw-bold text-slate-900">{stats.totalRequisitions || 0}</div>
                    </div>

                    <div className="pe-3 border-end border-slate-200 flex-fill flex items-center justify-around">
                        <span className="text-slate-500 text-xs text-uppercase tracking-wider fw-bold d-block">
                            Pending CEO/COO
                        </span>
                        <div className="fs-5 fw-bold text-amber-600 d-flex align-items-center gap-1.5">
                            <span className="md-dot md-dot-amber" />
                            {stats.pendingApproval || 0}
                        </div>
                    </div>

                    <div className="pe-3 border-end border-slate-200 flex-fill flex items-center justify-around">
                        <span className="text-slate-500 text-xs text-uppercase tracking-wider fw-bold d-block">
                            Sourcing Active
                        </span>
                        <div className="fs-5 fw-bold text-blue-600 d-flex align-items-center gap-1.5">
                            <span className="md-dot md-dot-blue" />
                            {stats.activeSourcing || 0}
                        </div>
                    </div>

                    <div className="pe-3 border-end border-slate-200 flex-fill flex items-center justify-around">
                        <span className="text-slate-500 text-xs text-uppercase tracking-wider fw-bold d-block">
                            Resumes Bank
                        </span>
                        <div className="fs-5 fw-bold text-purple-600">{stats.totalCandidates || 0}</div>
                    </div>

                    <div className="pe-3 border-end border-slate-200 flex-fill flex items-center justify-around">
                        <span className="text-slate-500 text-xs text-uppercase tracking-wider fw-bold d-block">
                            Shortlisted / Interview
                        </span>
                        <div className="fs-5 fw-bold text-emerald-600 d-flex align-items-center gap-1.5">
                            <span className="md-dot md-dot-emerald" />
                            {stats.shortlistedForInterview || 0}
                        </div>
                    </div>

                    <div className="pe-3 flex-fill flex items-center justify-around">
                        <span className="text-slate-500 text-xs text-uppercase tracking-wider fw-bold d-block">
                            Pending HOD Review
                        </span>
                        <div className="fs-5 fw-bold text-slate-700">{stats.pendingHodReview || 0}</div>
                    </div>
                </div>
            </div>

            {/* ─── MATERIAL TABS & DATA TABLE SECTION ──────────────────────────────── */}
            <div className="md-card p-3 p-md-4 mb-4">
                {/* Navigation Tabs (Material Pill Style) */}
                <div className="d-flex align-items-center gap-2 overflow-x-auto text-nowrap pb-2.5 mb-3 border-bottom border-slate-100">
                    <button
                        type="button"
                        onClick={() => setActiveTab("requisitions")}
                        className={`md-tab-btn ${activeTab === "requisitions" ? "active" : ""}`}
                    >
                        <LuBriefcase size={14} /> Requisitions Hub
                        <span className={`badge rounded-pill text-3xs ms-1 ${activeTab === "requisitions" ? "bg-white text-black" : "bg-slate-200 text-black"}`}>
                            {requisitions.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("hod_shortlisting")}
                        className={`md-tab-btn ${activeTab === "hod_shortlisting" ? "active" : ""}`}
                    >
                        <LuUserCheck size={14} /> HOD Candidate Selection
                        {stats.pendingHodReview > 0 && (
                            <span className="badge rounded-pill bg-amber-400 text-amber-950 text-3xs ms-1">
                                {stats.pendingHodReview}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("candidates")}
                        className={`md-tab-btn ${activeTab === "candidates" ? "active" : ""}`}
                    >
                        <LuFileText size={14} /> Sourced Resumes Bank
                        <span className={`badge rounded-pill text-3xs ms-1 ${activeTab === "candidates" ? "bg-white text-black" : "bg-slate-200 text-black"}`}>
                            {candidates.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("interviews")}
                        className={`md-tab-btn ${activeTab === "interviews" ? "active" : ""}`}
                    >
                        <LuVideo size={14} /> Interview Pipeline
                        <span className={`badge rounded-pill text-3xs ms-1 ${activeTab === "interviews" ? "bg-white text-black" : "bg-slate-200 text-black"}`}>
                            {shortlistedCandidates.length}
                        </span>
                    </button>
                </div>

                {/* ───────────────────────────────────────────────────────────────── */}
                {/* TAB 1: REQUISITIONS HUB                                           */}
                {/* ───────────────────────────────────────────────────────────────── */}
                {activeTab === "requisitions" && (
                    <div>
                        {/* Material Design 3 Filter Toolbar */}
                        <div className="md-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2.5">
                            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: "260px" }}>
                                <div className="md-search-group flex-grow-1">
                                    <LuSearch size={15} className="text-slate-400 me-1 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search requisitions by position, code, department, HOD..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="border-0 bg-transparent text-slate-400 p-0 fs-6 hover:text-slate-600 cursor-pointer"
                                            title="Clear search"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <div style={{ minWidth: "160px" }}>
                                    <Form.Select
                                        size="sm"
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                        className="md-filter-select"
                                    >
                                        <option value="All">All Departments</option>
                                        {DEPARTMENTS.slice(1).map((dept) => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </div>

                                <div style={{ minWidth: "170px" }}>
                                    <Form.Select
                                        size="sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="md-filter-select"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="PENDING_CEO_COO_APPROVAL">Pending CEO/COO</option>
                                        <option value="SOURCING_CANDIDATES">Sourcing Resumes</option>
                                        <option value="HOD_REVIEW">HOD Reviewing</option>
                                        <option value="INTERVIEWS_IN_PROGRESS">Interviews Active</option>
                                        <option value="CLOSED">Closed / Filled</option>
                                    </Form.Select>
                                </div>

                                <button
                                    type="button"
                                    className="md-btn-tonal"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setDeptFilter("All");
                                        setStatusFilter("ALL");
                                    }}
                                    title="Clear Filters"
                                >
                                    <LuRefreshCw size={12} /> Reset
                                </button>
                            </div>
                        </div>

                        {/* Material Design Data Table */}
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" size="sm" variant="primary" />
                                <p className="mt-2 text-slate-500 text-xs">Loading requisitions...</p>
                            </div>
                        ) : filteredRequisitions.length === 0 ? (
                            <div className="text-center py-5 border rounded-3 bg-slate-50">
                                {/* <LuBriefcase className="text-slate-400 fs-2 mb-2" /> */}
                                <h6 className="fw-bold text-slate-800 mb-1">No Requisitions Found</h6>
                                <p className="text-slate-500 text-xs mb-3">
                                    {searchQuery || deptFilter !== "All"
                                        ? "No records match active filters. Reset filters to see all."
                                        : "No hiring requisitions have been raised yet."}
                                </p>
                                {isHOD && (
                                    <button
                                        type="button"
                                        onClick={handleOpenRaiseModal}
                                        className="md-btn-primary px-3 py-1.5"
                                    >
                                        <LuPlus size={14} /> Raise Requisition Now
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="md-table-wrap">
                                <table className="md-table">
                                    <thead>
                                        <tr>
                                            <th className="ps-3" style={{ minWidth: "220px" }}>Position</th>
                                            <th style={{ minWidth: "150px" }}>Department</th>
                                            <th style={{ minWidth: "140px" }}>Experience</th>
                                            <th style={{ minWidth: "140px" }}>Max Salary</th>
                                            <th style={{ minWidth: "140px" }}>Joining Urgency</th>
                                            <th style={{ minWidth: "150px" }}>Budget Status</th>
                                            <th style={{ minWidth: "160px" }}>Workflow Status</th>
                                            <th style={{ minWidth: "150px" }}>Candidates</th>
                                            <th className="text-end pe-3 col-actions" style={{ minWidth: "110px" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRequisitions.map((req) => {
                                            const candidateCount = req.candidates ? req.candidates.length : 0;
                                            const shortlistedCount = req.candidates
                                                ? req.candidates.filter((c) => c.interview_requested).length
                                                : 0;

                                            return (
                                                <tr key={req.id}>
                                                    {/* Code & Position */}
                                                    <td className="ps-3">
                                                        <div className="fw-bold text-slate-900 fs-7">{req.position}</div>
                                                        <div className="text-xs text-slate-500 d-flex align-items-center gap-1.5 mt-0.5">
                                                            <span
                                                                style={{
                                                                    background: "#f1f5f9",
                                                                    color: "#0f172a",
                                                                    fontFamily: "monospace",
                                                                    fontWeight: 700,
                                                                    fontSize: "11px",
                                                                    padding: "2px 6px",
                                                                    borderRadius: "4px",
                                                                    border: "1px solid #cbd5e1",
                                                                }}
                                                            >
                                                                {req.requisition_code}
                                                            </span>
                                                            <span>• {req.vacancies_count} Vacanc{req.vacancies_count > 1 ? "ies" : "y"}</span>
                                                        </div>
                                                    </td>

                                                    {/* Department & HOD */}
                                                    <td>
                                                        <div className="fw-bold text-slate-800">{req.department}</div>
                                                        <div className="text-xs text-slate-500 d-flex align-items-center gap-1">
                                                            <LuUsers size={11} className="text-slate-400" /> HOD: {req.hod_name}
                                                        </div>
                                                    </td>

                                                    {/* Experience */}
                                                    <td className="text-slate-700 fw-medium">
                                                        {req.experience_required}
                                                    </td>

                                                    {/* Max Salary (Strictly single line) */}
                                                    <td>
                                                        <span
                                                            style={{
                                                                fontFamily: "monospace",
                                                                fontWeight: 700,
                                                                color: "#0f172a",
                                                                fontSize: "13px",
                                                                background: "#f8fafc",
                                                                padding: "4px 8px",
                                                                borderRadius: "6px",
                                                                border: "1px solid #e2e8f0",
                                                                display: "inline-block",
                                                            }}
                                                        >
                                                            {formatCurrency(req.max_salary, req.salary_frequency)}
                                                        </span>
                                                    </td>

                                                    {/* Joining Urgency */}
                                                    <td>
                                                        {req.joining_date_type === "Immediate" ? (
                                                            <span className="md-chip md-chip-rose">
                                                                <span className="md-dot md-dot-rose" />
                                                                Immediate
                                                            </span>
                                                        ) : (
                                                            <span className="md-chip md-chip-slate">
                                                                <LuCalendar size={12} className="text-slate-600" />
                                                                Normal {req.tentative_joining_date ? `(${formatDate(req.tentative_joining_date)})` : ""}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Budget Status */}
                                                    <td>
                                                        {req.is_budgeted ? (
                                                            <span className="md-chip md-chip-emerald">
                                                                <LuCheck size={12} />
                                                                Budgeted: Yes
                                                            </span>
                                                        ) : (
                                                            <div className="d-flex flex-column align-items-start gap-1">
                                                                <span className="md-chip md-chip-amber">
                                                                    <LuTriangleAlert size={12} />
                                                                    Budgeted: No
                                                                </span>
                                                                {req.budget_approval_status === "PENDING_CEO_COO" && (
                                                                    <span className="md-chip md-chip-amber" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                                                                        <LuClock size={11} /> Pending CEO/COO
                                                                    </span>
                                                                )}
                                                                {req.budget_approval_status === "APPROVED_BY_CEO" && (
                                                                    <span className="md-chip md-chip-emerald" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                                                                        <LuCheck size={11} /> CEO Approved
                                                                    </span>
                                                                )}
                                                                {req.budget_approval_status === "REJECTED_BY_CEO" && (
                                                                    <span className="md-chip md-chip-rose" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                                                                        <LuCircleX size={11} /> CEO Rejected
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Workflow Status */}
                                                    <td>{renderStatusBadge(req.status)}</td>

                                                    {/* Candidates */}
                                                    <td>
                                                        <div className="d-flex align-items-center gap-1.5">
                                                            <span
                                                                className="md-chip md-chip-slate"
                                                                style={{
                                                                    padding: "3px 8px",
                                                                    background: candidateCount > 0 ? "#eff6ff" : "#f1f5f9",
                                                                    color: candidateCount > 0 ? "#1e40af" : "#475569",
                                                                    border: `1px solid ${candidateCount > 0 ? "#bfdbfe" : "#cbd5e1"}`,
                                                                }}
                                                            >
                                                                <LuUsers size={12} />
                                                                {candidateCount} Resumes
                                                            </span>
                                                            {shortlistedCount > 0 && (
                                                                <span
                                                                    className="md-chip md-chip-emerald"
                                                                    style={{ padding: "3px 8px" }}
                                                                >
                                                                    <LuCheck size={12} />
                                                                    {shortlistedCount} Selected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Actions Dropdown (Unpinned) */}
                                                    <td className="text-end pe-3 col-actions">
                                                        <Dropdown align="end">
                                                            <Dropdown.Toggle
                                                                as="button"
                                                                className="md-action-btn"
                                                                id={`req-actions-${req.id}`}
                                                            >
                                                                Actions
                                                                <LuEllipsisVertical size={13} className="text-slate-500" />
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu className="shadow-lg border-slate-200 py-1 rounded-2 text-xs" style={{ minWidth: "195px", zIndex: 1050 }}>
                                                                <Dropdown.Item
                                                                    as="button"
                                                                    className="d-flex align-items-center gap-2 py-1.5 text-xs text-slate-700"
                                                                    onClick={() => {
                                                                        setSelectedRequisition(req);
                                                                        setShowViewReqModal(true);
                                                                    }}
                                                                >
                                                                    <LuEye size={13} className="text-blue-600" /> View Full JD
                                                                </Dropdown.Item>

                                                                {req.approval_document_url && (
                                                                    <Dropdown.Item
                                                                        as="a"
                                                                        href={getUploadUrl(req.approval_document_url)}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="d-flex align-items-center gap-2 py-1.5 text-xs text-amber-800"
                                                                    >
                                                                        <LuFileCheck size={13} className="text-amber-600" /> View Approval PDF
                                                                    </Dropdown.Item>
                                                                )}

                                                                {/* HR Only: List Candidate Resume */}
                                                                {isHR && (req.is_budgeted || req.budget_approval_status === "APPROVED_BY_CEO") && (
                                                                    <Dropdown.Item
                                                                        as="button"
                                                                        className="d-flex align-items-center gap-2 py-1.5 text-xs text-emerald-800 fw-semibold"
                                                                        onClick={() => handleOpenAddCandidate(req)}
                                                                    >
                                                                        <LuUpload size={13} className="text-emerald-600" /> List Candidate Resume
                                                                    </Dropdown.Item>
                                                                )}

                                                                {/* HOD Candidate View & Shortlist */}
                                                                {candidateCount > 0 && (
                                                                    <Dropdown.Item
                                                                        as="button"
                                                                        className="d-flex align-items-center gap-2 py-1.5 text-xs text-purple-800 fw-semibold"
                                                                        onClick={() => {
                                                                            setSelectedReqFilter(req.id);
                                                                            setActiveTab("hod_shortlisting");
                                                                        }}
                                                                    >
                                                                        <LuUserCheck size={13} className="text-purple-600" /> Select Candidates ({candidateCount})
                                                                    </Dropdown.Item>
                                                                )}
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Material Table Footer */}
                                <div className="md-table-footer d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold text-slate-700">
                                            Showing {filteredRequisitions.length} of {requisitions.length} requisitions
                                        </span>
                                        {(searchQuery || deptFilter !== "All" || statusFilter !== "ALL") && (
                                            <span className="badge bg-slate-200 text-slate-700 font-medium">
                                                Filtered
                                            </span>
                                        )}
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-2xs text-slate-500">
                                        <span className="d-none d-md-inline">Scroll horizontally for full specifications</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ───────────────────────────────────────────────────────────────── */}
                {/* TAB 2: HOD CANDIDATE SELECTION & SHORTLISTING PORTAL               */}
                {/* ───────────────────────────────────────────────────────────────── */}
                {activeTab === "hod_shortlisting" && (
                    <div>
                        {/* Material Toolbar */}
                        <div className="md-toolbar d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2.5">
                            <div>
                                <h6 className="fw-bold mb-0.5 text-slate-900 fs-6 d-flex align-items-center gap-2">
                                    <LuUserCheck className="text-blue-600" /> Department Head Candidate Shortlisting
                                </h6>
                                <p className="text-slate-500 text-xs mb-0">
                                    Review candidate resumes listed by HR. Select candidates to interview and ask HR to proceed with interview rounds.
                                </p>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <span className="text-slate-600 text-xs whitespace-nowrap fw-semibold">Filter Requisition:</span>
                                <Form.Select
                                    size="sm"
                                    value={selectedReqFilter}
                                    onChange={(e) => setSelectedReqFilter(e.target.value)}
                                    style={{ minWidth: "220px" }}
                                    className="md-filter-select text-nowrap"
                                >
                                    <option value="ALL">All Requisitions ({candidates.length} Profiles)</option>
                                    {requisitions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.requisition_code} - {r.position} ({r.candidates ? r.candidates.length : 0})
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        </div>

                        {filteredCandidates.length === 0 ? (
                            <div className="text-center py-5 border rounded-3 bg-slate-50">
                                <LuFileText className="text-slate-400 fs-2 mb-2" />
                                <h6 className="fw-bold text-slate-800 mb-1">No Candidate Resumes Listed Yet</h6>
                                <p className="text-slate-500 text-xs mb-3">
                                    HR has not yet listed candidate resumes under this requisition.
                                </p>
                                {isHR && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenAddCandidate()}
                                        className="md-btn-primary px-3 py-1.5"
                                    >
                                        <LuUpload size={14} className="me-1" /> Source & List Candidate Resume
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Row className="g-3">
                                {filteredCandidates.map((cand) => {
                                    const isShortlisted = cand.interview_requested || cand.hod_selection_status === "SHORTLISTED_FOR_INTERVIEW";
                                    const isRejected = cand.hod_selection_status === "REJECTED";
                                    const isOnHold = cand.hod_selection_status === "ON_HOLD";

                                    return (
                                        <Col lg={6} key={cand.id}>
                                            <div
                                                className="md-card p-3.5 d-flex flex-column justify-content-between h-100"
                                                style={{
                                                    borderLeft: isShortlisted ? "4px solid #059669" : "1px solid #e2e8f0",
                                                    backgroundColor: isShortlisted ? "#f0fdf4" : "#ffffff",
                                                }}
                                            >
                                                <div>
                                                    {/* Header */}
                                                    <div className="d-flex justify-content-between align-items-start mb-2.5">
                                                        <div>
                                                            <h6 className="fw-bold mb-0.5 text-slate-900 d-flex align-items-center gap-2">
                                                                {cand.candidate_name}
                                                                {isShortlisted && (
                                                                    <span className="md-chip md-chip-emerald" style={{ padding: "2px 8px", fontSize: "11px" }}>
                                                                        <LuCircleCheck size={12} /> Interview Requested
                                                                    </span>
                                                                )}
                                                            </h6>
                                                            <div className="text-slate-500 text-xs">
                                                                {cand.current_designation || "Applicant"}
                                                                {cand.current_company ? ` • ${cand.current_company}` : ""}
                                                            </div>
                                                        </div>

                                                        <div>{renderHodSelectionBadge(cand.hod_selection_status)}</div>
                                                    </div>

                                                    {/* Target position */}
                                                    <div className="bg-slate-50 p-2 rounded-2 border border-slate-200 mb-2.5 text-xs d-flex justify-content-between align-items-center">
                                                        <span className="text-slate-600">
                                                            Position: <strong className="text-slate-900">{cand.requisition?.position}</strong>
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: "#f1f5f9",
                                                                color: "#0f172a",
                                                                fontFamily: "monospace",
                                                                fontWeight: 700,
                                                                fontSize: "11px",
                                                                padding: "2px 6px",
                                                                borderRadius: "4px",
                                                                border: "1px solid #cbd5e1",
                                                            }}
                                                        >
                                                            {cand.requisition?.requisition_code}
                                                        </span>
                                                    </div>

                                                    {/* Details Chips */}
                                                    <div className="d-flex flex-wrap gap-1.5 mb-3 text-xs">
                                                        <span className="md-chip md-chip-slate" style={{ padding: "3px 8px" }}>
                                                            Exp: <strong className="ms-1">{cand.experience_years}</strong>
                                                        </span>
                                                        <span className="md-chip md-chip-slate" style={{ padding: "3px 8px" }}>
                                                            Notice: <strong className="ms-1">{cand.notice_period}</strong>
                                                        </span>
                                                        <span className="md-chip md-chip-slate" style={{ padding: "3px 8px" }}>
                                                            Current: <strong className="ms-1">{cand.current_ctc ? formatCurrency(cand.current_ctc) : "—"}</strong>
                                                        </span>
                                                        <span className="md-chip md-chip-blue" style={{ padding: "3px 8px" }}>
                                                            Expected: <strong className="ms-1">{cand.expected_ctc ? formatCurrency(cand.expected_ctc) : "—"}</strong>
                                                        </span>
                                                    </div>

                                                    {/* HR notes */}
                                                    {cand.hr_screening_notes && (
                                                        <div className="p-2 mb-2 bg-slate-50 rounded-2 border border-slate-200 text-xs">
                                                            <span className="fw-bold text-slate-700 d-block text-2xs mb-0.5">HR Screening Notes:</span>
                                                            <span className="text-slate-700">{cand.hr_screening_notes}</span>
                                                        </div>
                                                    )}

                                                    {/* HOD Feedback */}
                                                    {cand.hod_feedback && (
                                                        <div className="p-2 mb-2 bg-emerald-50 rounded-2 border border-emerald-200 text-xs">
                                                            <span className="fw-bold text-emerald-800 d-block text-2xs mb-0.5">
                                                                <LuMessageSquare size={12} className="me-1" /> HOD Instructions for HR:
                                                            </span>
                                                            <span className="text-emerald-950">{cand.hod_feedback}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="pt-2.5 border-top border-slate-200 d-flex align-items-center justify-content-between gap-2 flex-wrap mt-2">
                                                    {cand.resume_url ? (
                                                        <button
                                                            type="button"
                                                            className="md-btn-tonal d-inline-flex align-items-center gap-1"
                                                            onClick={() => {
                                                                setSelectedCandidate(cand);
                                                                setShowResumeModal(true);
                                                            }}
                                                        >
                                                            <LuFileText size={13} /> View Resume
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-2xs">No resume attached</span>
                                                    )}

                                                    <div className="d-flex align-items-center gap-1.5">
                                                        {isHOD ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="md-btn-success d-inline-flex align-items-center gap-1"
                                                                    onClick={() => handleOpenHodDecision(cand, "SHORTLIST_FOR_INTERVIEW")}
                                                                    disabled={isShortlisted}
                                                                >
                                                                    <LuCheck size={14} /> {isShortlisted ? "Interview Requested" : "Select & Request Interview"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="md-btn-tonal"
                                                                    onClick={() => handleOpenHodDecision(cand, "ON_HOLD")}
                                                                    disabled={isOnHold}
                                                                    title="Hold"
                                                                >
                                                                    Hold
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="md-btn-tonal text-rose-700 border-rose-300"
                                                                    style={{ background: "#fef2f2" }}
                                                                    onClick={() => handleOpenHodDecision(cand, "REJECT")}
                                                                    disabled={isRejected}
                                                                    title="Reject"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-500 text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-2 fw-medium">
                                                                {isShortlisted
                                                                    ? "Selected by HOD"
                                                                    : isRejected
                                                                        ? "Rejected by HOD"
                                                                        : isOnHold
                                                                            ? "On Hold by HOD"
                                                                            : "View Only (HOD Action Pending)"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        )}
                    </div>
                )}

                {/* ───────────────────────────────────────────────────────────────── */}
                {/* TAB 3: CANDIDATE RESUMES BANK (HR VIEW)                           */}
                {/* ───────────────────────────────────────────────────────────────── */}
                {activeTab === "candidates" && (
                    <div>
                        {/* Material Design 3 Filter Toolbar */}
                        <div className="md-toolbar d-flex flex-wrap justify-content-between align-items-center gap-2.5">
                            <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap" style={{ maxWidth: "600px" }}>
                                <div className="md-search-group flex-grow-1" style={{ minWidth: "240px" }}>
                                    <LuSearch size={15} className="text-slate-400 me-1 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search candidates by name, email, company..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="border-0 bg-transparent text-slate-400 p-0 fs-6 hover:text-slate-600 cursor-pointer"
                                            title="Clear search"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                <div style={{ minWidth: "200px" }}>
                                    <Form.Select
                                        size="sm"
                                        value={selectedReqFilter}
                                        onChange={(e) => setSelectedReqFilter(e.target.value)}
                                        className="md-filter-select"
                                    >
                                        <option value="ALL">All Requisitions</option>
                                        {requisitions.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.requisition_code} - {r.position}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </div>
                            </div>

                            {isHR && (
                                <button
                                    type="button"
                                    className="md-btn-primary"
                                    onClick={() => handleOpenAddCandidate()}
                                >
                                    <LuPlus size={14} /> Add Candidate Resume
                                </button>
                            )}
                        </div>

                        {filteredCandidates.length === 0 ? (
                            <div className="text-center py-5 border rounded-3 bg-slate-50">
                                <LuFileText className="text-slate-400 fs-2 mb-2" />
                                <h6 className="fw-bold text-slate-800 mb-1">No Candidates Found</h6>
                                <p className="text-slate-500 text-xs">No candidate resumes match active filters.</p>
                            </div>
                        ) : (
                            <div className="md-table-wrap">
                                <table className="md-table">
                                    <thead>
                                        <tr>
                                            <th className="ps-3" style={{ minWidth: "200px" }}>Candidate</th>
                                            <th style={{ minWidth: "170px" }}>Requisition</th>
                                            <th style={{ minWidth: "120px" }}>Experience</th>
                                            <th style={{ minWidth: "130px" }}>Current CTC</th>
                                            <th style={{ minWidth: "130px" }}>Expected CTC</th>
                                            <th style={{ minWidth: "120px" }}>Notice Period</th>
                                            <th style={{ minWidth: "120px" }}>Source</th>
                                            <th style={{ minWidth: "160px" }}>HOD Decision</th>
                                            <th style={{ minWidth: "150px" }}>Interview Stage</th>
                                            <th className="text-end pe-3 col-actions" style={{ minWidth: "110px" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCandidates.map((c) => (
                                            <tr key={c.id}>
                                                <td className="ps-3">
                                                    <div className="fw-bold text-slate-900 fs-7">{c.candidate_name}</div>
                                                    <div className="text-2xs text-slate-500">
                                                        {c.current_designation ? `${c.current_designation}${c.current_company ? ` at ${c.current_company}` : ""}` : c.current_company || "Candidate Profile"}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="fw-bold text-slate-800">{c.requisition?.position}</div>
                                                    <div className="text-2xs text-slate-500 font-mono mt-0.5">
                                                        <span
                                                            style={{
                                                                background: "#f1f5f9",
                                                                color: "#0f172a",
                                                                fontFamily: "monospace",
                                                                fontWeight: 700,
                                                                fontSize: "11px",
                                                                padding: "2px 6px",
                                                                borderRadius: "4px",
                                                                border: "1px solid #cbd5e1",
                                                            }}
                                                        >
                                                            {c.requisition?.requisition_code}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="text-slate-700 fw-bold">
                                                    {c.experience_years}
                                                </td>

                                                <td className="font-mono text-slate-800">
                                                    {c.current_ctc ? formatCurrency(c.current_ctc) : "—"}
                                                </td>

                                                <td className="font-mono fw-bold text-blue-700">
                                                    {c.expected_ctc ? formatCurrency(c.expected_ctc) : "—"}
                                                </td>

                                                <td>
                                                    <span className="md-chip md-chip-slate" style={{ padding: "3px 8px" }}>
                                                        {c.notice_period}
                                                    </span>
                                                </td>

                                                <td className="text-slate-600 text-xs">
                                                    {c.source || "HR Sourced"}
                                                </td>

                                                <td>{renderHodSelectionBadge(c.hod_selection_status)}</td>

                                                <td>
                                                    <span className="md-chip md-chip-blue">
                                                        <span className="md-dot md-dot-blue" />
                                                        {c.interview_stage}
                                                    </span>
                                                </td>

                                                {/* Actions Dropdown (Unpinned) */}
                                                <td className="text-end pe-3 col-actions">
                                                    <Dropdown align="end">
                                                        <Dropdown.Toggle
                                                            as="button"
                                                            className="md-action-btn"
                                                            id={`cand-actions-${c.id}`}
                                                        >
                                                            Actions
                                                            <LuEllipsisVertical size={13} className="text-slate-500" />
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="shadow-lg border-slate-200 py-1 rounded-2 text-xs" style={{ minWidth: "195px", zIndex: 1050 }}>
                                                            {c.resume_url && (
                                                                <>
                                                                    <Dropdown.Item
                                                                        as="button"
                                                                        className="d-flex align-items-center gap-2 py-1.5 text-xs text-slate-700"
                                                                        onClick={() => {
                                                                            setSelectedCandidate(c);
                                                                            setShowResumeModal(true);
                                                                        }}
                                                                    >
                                                                        <LuEye size={13} className="text-blue-600" /> Preview Resume
                                                                    </Dropdown.Item>
                                                                    <Dropdown.Item
                                                                        as="a"
                                                                        href={getUploadUrl(c.resume_url)}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="d-flex align-items-center gap-2 py-1.5 text-xs text-slate-700"
                                                                    >
                                                                        <LuExternalLink size={13} className="text-slate-500" /> Open in New Tab
                                                                    </Dropdown.Item>
                                                                </>
                                                            )}

                                                            {isHR && c.interview_requested && (
                                                                <Dropdown.Item
                                                                    as="button"
                                                                    className="d-flex align-items-center gap-2 py-1.5 text-xs text-emerald-800 fw-semibold"
                                                                    onClick={() => handleOpenScheduleModal(c)}
                                                                >
                                                                    <LuCalendar size={13} className="text-emerald-600" /> Schedule Interview
                                                                </Dropdown.Item>
                                                            )}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Material Table Footer */}
                                <div className="md-table-footer d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold text-slate-700">
                                            Showing {filteredCandidates.length} of {candidates.length} candidates
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-2xs text-slate-500">
                                        <span className="d-none d-md-inline">Scroll horizontally for candidate profile metrics</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ───────────────────────────────────────────────────────────────── */}
                {/* TAB 4: INTERVIEW PIPELINE & HANDOVER                              */}
                {/* ───────────────────────────────────────────────────────────────── */}
                {activeTab === "interviews" && (
                    <div>
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-3 mb-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                            <div>
                                <h6 className="fw-bold mb-0.5 text-slate-900 fs-6 d-flex align-items-center gap-1.5">
                                    <LuVideo className="text-emerald-600" /> Shortlisted Interview Pipeline
                                </h6>
                                <p className="text-slate-500 text-xs mb-0">
                                    Candidates selected by HOD. HR schedules the rounds and conducts evaluation via the 3-round interview form.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="md-btn-tonal text-blue-700 border-blue-300"
                                style={{ background: "#eff6ff" }}
                                onClick={() => navigate("/interview")}
                            >
                                <LuExternalLink size={13} /> Candidate Evaluation (/interview)
                            </button>
                        </div>

                        {shortlistedCandidates.length === 0 ? (
                            <div className="text-center py-5 border rounded-3 bg-slate-50">
                                <LuVideo className="text-slate-400 fs-2 mb-2" />
                                <h6 className="fw-bold text-slate-800 mb-1">No Candidates Shortlisted Yet</h6>
                                <p className="text-slate-500 text-xs">
                                    When the HOD selects candidates, they will appear here ready for scheduling.
                                </p>
                            </div>
                        ) : (
                            <div className="md-table-wrap">
                                <table className="md-table">
                                    <thead>
                                        <tr>
                                            <th className="ps-3" style={{ minWidth: "200px" }}>Candidate</th>
                                            <th style={{ minWidth: "170px" }}>Requisition & Dept</th>
                                            <th style={{ minWidth: "240px" }}>HOD Instructions</th>
                                            <th style={{ minWidth: "180px" }}>Interview Schedule</th>
                                            <th style={{ minWidth: "150px" }}>Current Stage</th>
                                            <th className="text-end pe-3 col-actions" style={{ minWidth: "110px" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shortlistedCandidates.map((cand) => (
                                            <tr key={cand.id}>
                                                <td className="ps-3">
                                                    <div className="fw-bold text-slate-900 fs-7">{cand.candidate_name}</div>
                                                    <div className="text-2xs text-slate-500">
                                                        {cand.current_designation ? `${cand.current_designation}${cand.current_company ? ` at ${cand.current_company}` : ""}` : cand.current_company || "Candidate"}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="fw-bold text-slate-800">{cand.requisition?.position}</div>
                                                    <div className="text-2xs text-slate-500">{cand.requisition?.department}</div>
                                                </td>

                                                <td>
                                                    <div
                                                        style={{
                                                            background: "#f8fafc",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: "6px",
                                                            padding: "4px 8px",
                                                            fontSize: "12px",
                                                            color: "#1e293b",
                                                            display: "inline-block",
                                                        }}
                                                    >
                                                        <span className="fw-bold text-emerald-700 me-1">
                                                            By {cand.hod_decision_by_name || "HOD"}:
                                                        </span>
                                                        {cand.hod_feedback || "Shortlisted for interview"}
                                                    </div>
                                                </td>

                                                <td>
                                                    {cand.interview_date ? (
                                                        <div className="text-xs">
                                                            <div className="fw-bold text-slate-900 d-flex align-items-center gap-1">
                                                                <LuCalendar size={13} className="text-blue-600" /> {formatDate(cand.interview_date)} at {cand.interview_time || "11:00 AM"}
                                                            </div>
                                                            <div className="text-2xs text-slate-500">{cand.interview_mode || "Online"}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="md-chip md-chip-amber">
                                                            <LuClock size={11} />
                                                            Pending Schedule
                                                        </span>
                                                    )}
                                                </td>

                                                <td>
                                                    <span className="md-chip md-chip-emerald">
                                                        <span className="md-dot md-dot-emerald" />
                                                        {cand.interview_stage}
                                                    </span>
                                                </td>

                                                {/* Actions Dropdown (Unpinned) */}
                                                <td className="text-end pe-3 col-actions">
                                                    <Dropdown align="end">
                                                        <Dropdown.Toggle
                                                            as="button"
                                                            className="md-action-btn"
                                                            id={`interview-actions-${cand.id}`}
                                                        >
                                                            Actions
                                                            <LuEllipsisVertical size={13} className="text-slate-500" />
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu className="shadow-lg border-slate-200 py-1 rounded-2 text-xs" style={{ minWidth: "210px", zIndex: 1050 }}>
                                                            {isHR && (
                                                                <Dropdown.Item
                                                                    as="button"
                                                                    className="d-flex align-items-center gap-2 py-1.5 text-xs text-slate-700"
                                                                    onClick={() => handleOpenScheduleModal(cand)}
                                                                >
                                                                    <LuCalendar size={13} className="text-blue-600" /> {cand.interview_date ? "Reschedule Interview" : "Schedule Interview"}
                                                                </Dropdown.Item>
                                                            )}

                                                            <Dropdown.Item
                                                                as="button"
                                                                className="d-flex align-items-center gap-2 py-1.5 text-xs text-emerald-800 fw-semibold"
                                                                onClick={() => {
                                                                    navigate(`/interview/${cand.id}`, {
                                                                        state: {
                                                                            candidateId: cand.id,
                                                                            candidate: cand,
                                                                            prefillCandidate: {
                                                                                id: cand.id,
                                                                                name: cand.candidate_name,
                                                                                candidate_name: cand.candidate_name,
                                                                                email: cand.email,
                                                                                phone: cand.phone,
                                                                                designation: cand.current_designation || "",
                                                                                appliedRole: cand.requisition?.position || "",
                                                                                jobRole: cand.requisition?.position || "",
                                                                                department: cand.requisition?.department || "",
                                                                                requisition_code: cand.requisition?.requisition_code || "",
                                                                                expectedSalary: cand.expected_ctc ? String(cand.expected_ctc) : "",
                                                                                interview_stage: cand.interview_stage || "SCHEDULED",
                                                                                interview_date: cand.interview_date || "",
                                                                                interview_time: cand.interview_time || "",
                                                                                interview_mode: cand.interview_mode || "",
                                                                                interview_meeting_link: cand.interview_meeting_link || "",
                                                                            },
                                                                        },
                                                                    });
                                                                }}
                                                            >
                                                                <LuArrowUpRight size={13} className="text-emerald-600" /> Evaluate (/interview)
                                                            </Dropdown.Item>

                                                            {cand.resume_url && (
                                                                <Dropdown.Item
                                                                    as="button"
                                                                    className="d-flex align-items-center gap-2 py-1.5 text-xs text-slate-700"
                                                                    onClick={() => {
                                                                        setSelectedCandidate(cand);
                                                                        setShowResumeModal(true);
                                                                    }}
                                                                >
                                                                    <LuFileText size={13} className="text-slate-500" /> View Resume
                                                                </Dropdown.Item>
                                                            )}
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Material Table Footer */}
                                <div className="md-table-footer d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fw-bold text-slate-700">
                                            Showing {shortlistedCandidates.length} shortlisted candidates
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-2xs text-slate-500">
                                        <span className="d-none d-md-inline">Scroll horizontally for scheduled timeline details</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 1: RAISE REQUISITION (HOD)                                 */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showRaiseReqModal} onHide={() => setShowRaiseReqModal(false)} size="lg" centered backdrop="static">
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuBriefcase className="text-blue-600" /> Raise Requisition for Candidate Hiring
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmitRequisition}>
                    <Modal.Body className="p-3 p-md-4">
                        <Row className="g-3">
                            <Col md={8}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Position / Designation <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        placeholder="e.g. Senior Full Stack Engineer, QA Lead"
                                        value={reqForm.position}
                                        onChange={(e) => setReqForm({ ...reqForm, position: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Vacancies Count <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        min="1"
                                        value={reqForm.vacancies_count}
                                        onChange={(e) => setReqForm({ ...reqForm, vacancies_count: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Hiring Department <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={reqForm.department}
                                        onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        {DEPARTMENTS.slice(1).map((dept) => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Experience Required <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={reqForm.experience_required}
                                        onChange={(e) => setReqForm({ ...reqForm, experience_required: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        {EXP_OPTIONS.map((exp) => (
                                            <option key={exp} value={exp}>
                                                {exp}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Salary (Max for Position) (₹) <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-slate-50 border-slate-300 text-xs">₹</InputGroup.Text>
                                        <Form.Control
                                            type="number"
                                            placeholder="e.g. 1500000"
                                            value={reqForm.max_salary}
                                            onChange={(e) => setReqForm({ ...reqForm, max_salary: e.target.value })}
                                            required
                                            className="border-slate-300 text-xs"
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Salary Frequency</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={reqForm.salary_frequency}
                                        onChange={(e) => setReqForm({ ...reqForm, salary_frequency: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        <option value="Per Annum (CTC)">Per Annum (Annual CTC)</option>
                                        <option value="Per Month">Per Month</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700 d-block">
                                        Joining Date Urgency <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <div className="d-flex gap-3 mt-1.5 text-xs">
                                        <Form.Check
                                            type="radio"
                                            id="join-normal"
                                            label="Normal Notice Period"
                                            name="joining_date_type"
                                            checked={reqForm.joining_date_type === "Normal"}
                                            onChange={() => setReqForm({ ...reqForm, joining_date_type: "Normal" })}
                                            className="cursor-pointer"
                                        />
                                        <Form.Check
                                            type="radio"
                                            id="join-immediate"
                                            label={<span className="text-rose-700 fw-bold">Immediate Joining</span>}
                                            name="joining_date_type"
                                            checked={reqForm.joining_date_type === "Immediate"}
                                            onChange={() => setReqForm({ ...reqForm, joining_date_type: "Immediate" })}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Tentative Joining Date</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="date"
                                        value={reqForm.tentative_joining_date}
                                        onChange={(e) => setReqForm({ ...reqForm, tentative_joining_date: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={12}>
                                <div className="p-3 rounded-3 border border-slate-200 bg-slate-50/80">
                                    <Form.Label className="fw-bold text-xs text-slate-800 d-block mb-1">
                                        Is this recruitment budgeted? <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <div className="d-flex gap-4 my-1.5 text-xs">
                                        <Form.Check
                                            type="radio"
                                            id="budget-yes"
                                            label={<span className="fw-bold text-emerald-700">Yes (Budgeted in Department)</span>}
                                            name="is_budgeted"
                                            checked={reqForm.is_budgeted === "Yes"}
                                            onChange={() => {
                                                setReqForm({ ...reqForm, is_budgeted: "Yes" });
                                                setApprovalFile(null);
                                            }}
                                        />
                                        <Form.Check
                                            type="radio"
                                            id="budget-no"
                                            label={<span className="fw-bold text-amber-800">No (Non-Budgeted — Requires CEO/COO Approval PDF)</span>}
                                            name="is_budgeted"
                                            checked={reqForm.is_budgeted === "No"}
                                            onChange={() => setReqForm({ ...reqForm, is_budgeted: "No" })}
                                        />
                                    </div>

                                    {reqForm.is_budgeted === "No" && (
                                        <div className="mt-2.5 p-3 rounded-2 border border-amber-300 bg-amber-50">
                                            <div className="d-flex align-items-center gap-1.5 mb-1.5 text-amber-900 text-xs fw-bold">
                                                <LuTriangleAlert size={14} className="text-amber-700 flex-shrink-0" />
                                                <span>Non-Budgeted Requisition: CEO/COO Approval Document Required</span>
                                            </div>
                                            <p className="text-slate-600 text-xs mb-2.5">
                                                Please upload the signed CEO or COO approval memo in PDF format (.pdf). You cannot submit this requisition without this document.
                                            </p>

                                            <Form.Group controlId="approvalDocumentUpload">
                                                <Form.Label className="fw-bold text-xs text-slate-800 mb-1 d-flex align-items-center justify-content-between">
                                                    <span>Upload CEO / COO Approval Memo (PDF Only) <span className="text-rose-500">*</span></span>
                                                    {approvalFile && (
                                                        <span className="badge bg-emerald-100 text-emerald-800 font-medium">
                                                            <LuFileCheck size={11} className="me-1" />
                                                            PDF Attached
                                                        </span>
                                                    )}
                                                </Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) {
                                                            setApprovalFile(null);
                                                            return;
                                                        }
                                                        const isPdf =
                                                            file.type === "application/pdf" ||
                                                            file.name.toLowerCase().endsWith(".pdf");
                                                        if (!isPdf) {
                                                            toast.error("Only PDF files (.pdf) are allowed for the CEO/COO approval document.");
                                                            e.target.value = "";
                                                            setApprovalFile(null);
                                                            return;
                                                        }
                                                        setApprovalFile(file);
                                                        toast.success(`Approval PDF selected: ${file.name}`);
                                                    }}
                                                    className="border-slate-300 text-xs rounded-2 bg-white"
                                                    required={reqForm.is_budgeted === "No"}
                                                />

                                                {approvalFile ? (
                                                    <div className="d-flex align-items-center justify-content-between mt-2 p-2 bg-white rounded border border-emerald-300 text-xs">
                                                        <div className="d-flex align-items-center gap-1.5 text-emerald-900 fw-semibold text-truncate">
                                                            <LuFileCheck size={15} className="text-emerald-600 flex-shrink-0" />
                                                            <span className="text-truncate" style={{ maxWidth: "300px" }}>{approvalFile.name}</span>
                                                            <span className="text-slate-400 text-2xs flex-shrink-0">({(approvalFile.size / 1024).toFixed(1)} KB)</span>
                                                        </div>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="py-0 px-2 text-2xs"
                                                            onClick={() => {
                                                                setApprovalFile(null);
                                                                const fileInput = document.getElementById("approvalDocumentUpload");
                                                                if (fileInput) fileInput.value = "";
                                                            }}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-rose-600 text-xs mt-1.5 fw-bold d-flex align-items-center gap-1">
                                                        <LuTriangleAlert size={12} />
                                                        CEO/COO approval PDF is required. You cannot submit without uploading this file.
                                                    </div>
                                                )}
                                            </Form.Group>
                                        </div>
                                    )}
                                </div>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Reason for Hiring</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={reqForm.reason_for_hiring}
                                        onChange={(e) => setReqForm({ ...reqForm, reason_for_hiring: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        <option value="Team Expansion">Team Expansion / Scale-up</option>
                                        <option value="Backfill / Replacement">Backfill / Replacement</option>
                                        <option value="New Project / Client Requirement">New Project / Client Requirement</option>
                                        <option value="Specialized Skill Gap">Specialized Skill Gap</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Replacement For (Optional)</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        placeholder="Exiting employee name / ID"
                                        value={reqForm.replacement_for_employee}
                                        onChange={(e) => setReqForm({ ...reqForm, replacement_for_employee: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Job Description (JD) & Qualifications <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        placeholder="Describe roles, technical skill requirements, qualifications..."
                                        value={reqForm.job_description}
                                        onChange={(e) => setReqForm({ ...reqForm, job_description: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2.5">
                        <Button variant="outline-secondary" size="sm" onClick={() => setShowRaiseReqModal(false)} className="text-xs">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={submittingReq || (reqForm.is_budgeted === "No" && !approvalFile)}
                            className="text-xs px-3 bg-blue-600 border-blue-600"
                            title={reqForm.is_budgeted === "No" && !approvalFile ? "CEO/COO approval PDF is required to submit" : ""}
                        >
                            {submittingReq ? <Spinner size="sm" animation="border" /> : <LuSend size={12} className="me-1" />}
                            Submit Requisition to HR
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 2: CEO / COO BUDGET APPROVAL                               */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showCeoApprovalModal} onHide={() => setShowCeoApprovalModal(false)} size="md" centered>
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuTriangleAlert className="text-amber-500" /> Executive Budget Clearance (CEO / COO)
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3.5">
                    {selectedRequisition && (
                        <div>
                            <div className="bg-slate-50 p-2.5 rounded-2 border border-slate-200 mb-3 text-xs">
                                <div className="fw-bold text-slate-900 fs-6">{selectedRequisition.position}</div>
                                <div className="text-slate-500">{selectedRequisition.department} • HOD: {selectedRequisition.hod_name}</div>
                                <div className="mt-2 d-flex justify-content-between">
                                    <span className="text-slate-600">Max Salary: <strong className="text-slate-900 font-mono">{formatCurrency(selectedRequisition.max_salary)}</strong></span>
                                    <span className="text-slate-600">Exp: <strong className="text-slate-900">{selectedRequisition.experience_required}</strong></span>
                                </div>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold text-xs text-slate-700">Decision:</Form.Label>
                                <div className="d-flex gap-4 text-xs">
                                    <Form.Check
                                        type="radio"
                                        id="action-approve"
                                        label={<span className="fw-semibold text-emerald-700">Approve Budget & Clear for Sourcing</span>}
                                        name="approval_action"
                                        checked={approvalAction === "APPROVED"}
                                        onChange={() => setApprovalAction("APPROVED")}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="action-reject"
                                        label={<span className="fw-semibold text-rose-700">Reject</span>}
                                        name="approval_action"
                                        checked={approvalAction === "REJECTED"}
                                        onChange={() => setApprovalAction("REJECTED")}
                                    />
                                </div>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="fw-semibold text-xs text-slate-700">Executive Comments</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Enter approval note or justification..."
                                    value={approvalComments}
                                    onChange={(e) => setApprovalComments(e.target.value)}
                                    className="border-slate-300 text-xs rounded-2"
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2">
                    <Button variant="outline-secondary" size="sm" onClick={() => setShowCeoApprovalModal(false)} className="text-xs">
                        Close
                    </Button>
                    <Button
                        variant={approvalAction === "APPROVED" ? "success" : "danger"}
                        size="sm"
                        onClick={handleProcessBudgetApproval}
                        disabled={submittingApproval}
                        className="text-xs px-3"
                    >
                        {submittingApproval ? <Spinner size="sm" animation="border" /> : <LuCheck size={12} className="me-1" />}
                        Confirm {approvalAction === "APPROVED" ? "Approval" : "Rejection"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 3: HR ADD / LIST CANDIDATE RESUME                          */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showAddCandidateModal} onHide={() => setShowAddCandidateModal(false)} size="lg" centered backdrop="static">
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuUpload className="text-blue-600" /> List Candidate Resume for HOD Review
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmitCandidate}>
                    <Modal.Body className="p-3 p-md-4">
                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Target Requisition <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={candidateForm.requisition_id}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, requisition_id: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        <option value="">Select Requisition...</option>
                                        {approvedRequisitions.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.requisition_code} - {r.position} ({r.department} • Max {formatCurrency(r.max_salary)})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Candidate Full Name <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        placeholder="e.g. Rahul Sharma"
                                        value={candidateForm.candidate_name}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, candidate_name: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>



                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Total Experience <span className="text-rose-500">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        placeholder="e.g. 4.5 Years"
                                        value={candidateForm.experience_years}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, experience_years: e.target.value })}
                                        required
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Current Company</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        placeholder="e.g. TechCorp Solutions"
                                        value={candidateForm.current_company}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, current_company: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Current Designation</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="text"
                                        placeholder="e.g. Senior Software Engineer"
                                        value={candidateForm.current_designation}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, current_designation: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Current CTC (₹)</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        placeholder="e.g. 1200000"
                                        value={candidateForm.current_ctc}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, current_ctc: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Expected CTC (₹)</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        placeholder="e.g. 1500000"
                                        value={candidateForm.expected_ctc}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, expected_ctc: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Notice Period</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={candidateForm.notice_period}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, notice_period: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        {NOTICE_PERIODS.map((np) => (
                                            <option key={np} value={np}>
                                                {np}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">Sourcing Source</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={candidateForm.source}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    >
                                        <option value="LinkedIn">LinkedIn</option>
                                        <option value="Naukri.com">Naukri.com</option>
                                        <option value="Employee Referral">Employee Referral</option>
                                        <option value="Direct Application">Direct Application</option>
                                        <option value="Headhunter / Agency">Headhunter / Agency</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">
                                        Upload Candidate Resume (PDF / DOC / DOCX)
                                    </Form.Label>
                                    <Form.Control
                                        size="sm"
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => setResumeFile(e.target.files[0] || null)}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold text-xs text-slate-700">HR Screening Notes & Initial Remarks</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Candidate strengths, communication rating, technical fit summary for HOD..."
                                        value={candidateForm.hr_screening_notes}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, hr_screening_notes: e.target.value })}
                                        className="border-slate-300 text-xs rounded-2"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2.5">
                        <Button variant="outline-secondary" size="sm" onClick={() => setShowAddCandidateModal(false)} className="text-xs">
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" type="submit" disabled={submittingCandidate} className="text-xs px-3 bg-blue-600 border-blue-600">
                            {submittingCandidate ? <Spinner size="sm" animation="border" /> : <LuUpload size={12} className="me-1" />}
                            List in Portal for HOD Review
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 4: HOD CANDIDATE DECISION                                  */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showHodDecisionModal} onHide={() => setShowHodDecisionModal(false)} size="md" centered>
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuUserCheck className="text-emerald-600" /> HOD Candidate Selection
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3.5">
                    {selectedCandidate && (
                        <div>
                            <div className="bg-slate-50 p-2.5 rounded-2 border border-slate-200 mb-3 text-xs">
                                <div className="fw-bold text-slate-900 fs-6">{selectedCandidate.candidate_name}</div>
                                <div className="text-slate-500">{selectedCandidate.experience_years} Exp • Notice: {selectedCandidate.notice_period}</div>
                                <div className="text-blue-700 text-2xs mt-1">Requisition: {selectedCandidate.requisition?.position}</div>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold text-xs text-slate-700">Selection Decision:</Form.Label>
                                <div className="d-flex flex-column gap-2 text-xs">
                                    <Form.Check
                                        type="radio"
                                        id="hod-shortlist"
                                        label={<span className="fw-bold text-emerald-700">Select & Ask HR to Proceed with Interview</span>}
                                        name="hod_decision"
                                        checked={hodDecisionAction === "SHORTLIST_FOR_INTERVIEW"}
                                        onChange={() => setHodDecisionAction("SHORTLIST_FOR_INTERVIEW")}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="hod-hold"
                                        label={<span className="fw-medium text-slate-700">Put On Hold</span>}
                                        name="hod_decision"
                                        checked={hodDecisionAction === "ON_HOLD"}
                                        onChange={() => setHodDecisionAction("ON_HOLD")}
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="hod-reject"
                                        label={<span className="fw-medium text-rose-700">Reject Candidate</span>}
                                        name="hod_decision"
                                        checked={hodDecisionAction === "REJECT"}
                                        onChange={() => setHodDecisionAction("REJECT")}
                                    />
                                </div>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label className="fw-semibold text-xs text-slate-700">
                                    Instructions & Guidance for HR <span className="text-rose-500">*</span>
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="e.g. Please proceed with Round 1 HR interview and schedule technical round with me."
                                    value={hodFeedback}
                                    onChange={(e) => setHodFeedback(e.target.value)}
                                    required
                                    className="border-slate-300 text-xs rounded-2"
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2">
                    <Button variant="outline-secondary" size="sm" onClick={() => setShowHodDecisionModal(false)} className="text-xs">
                        Cancel
                    </Button>
                    <Button
                        variant={hodDecisionAction === "SHORTLIST_FOR_INTERVIEW" ? "success" : hodDecisionAction === "REJECT" ? "danger" : "secondary"}
                        size="sm"
                        onClick={handleSubmitHodDecision}
                        disabled={submittingHodDecision}
                        className="text-xs px-3"
                    >
                        {submittingHodDecision ? <Spinner size="sm" animation="border" /> : <LuSend size={12} className="me-1" />}
                        Confirm Selection
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 5: HR INTERVIEW SCHEDULING                                 */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} size="md" centered>
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuCalendar className="text-blue-600" /> Schedule Interview
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3.5">
                    {selectedCandidate && (
                        <div>
                            <div className="bg-slate-50 p-2.5 rounded-2 border border-slate-200 mb-3 text-xs">
                                <div className="fw-bold text-slate-900">{selectedCandidate.candidate_name}</div>
                                <div className="text-slate-500">{selectedCandidate.requisition?.position}</div>
                                <div className="text-emerald-700 text-2xs mt-1">
                                    <strong>HOD Request:</strong> {selectedCandidate.hod_feedback}
                                </div>
                            </div>

                            <Row className="g-2.5">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">
                                            Candidate Email Address <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="email"
                                            placeholder="e.g. candidate@example.com"
                                            value={scheduleData.candidate_email}
                                            onChange={(e) => setScheduleData({ ...scheduleData, candidate_email: e.target.value })}
                                            className="border-slate-300 text-xs rounded-2"
                                            required
                                        />
                                        <Form.Text className="text-2xs text-slate-500">
                                            Interview meeting invitation with agenda, date, time & link will be emailed to <strong>Candidate</strong>, <strong>HR</strong>, and <strong>HOD</strong>.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">Interview Date <span className="text-danger">*</span></Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="date"
                                            value={scheduleData.interview_date}
                                            onChange={(e) => setScheduleData({ ...scheduleData, interview_date: e.target.value })}
                                            className="border-slate-300 text-xs rounded-2"
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">Interview Time</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="text"
                                            placeholder="e.g. 11:30 AM"
                                            value={scheduleData.interview_time}
                                            onChange={(e) => setScheduleData({ ...scheduleData, interview_time: e.target.value })}
                                            className="border-slate-300 text-xs rounded-2"
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">Interview Mode</Form.Label>
                                        <Form.Select
                                            size="sm"
                                            value={scheduleData.interview_mode}
                                            onChange={(e) => setScheduleData({ ...scheduleData, interview_mode: e.target.value })}
                                            className="border-slate-300 text-xs rounded-2"
                                        >
                                            <option value="Online (Google Meet)">Online (Google Meet)</option>
                                            <option value="Online (Zoom)">Online (Zoom)</option>
                                            <option value="Online (Microsoft Teams)">Online (Microsoft Teams)</option>
                                            <option value="In-Person Office">In-Person Office</option>
                                            <option value="Telephonic Screening">Telephonic Screening</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">Interview Round</Form.Label>
                                        <Form.Select
                                            size="sm"
                                            value={scheduleData.interview_stage}
                                            onChange={(e) => setScheduleData({ ...scheduleData, interview_stage: e.target.value })}
                                            className="border-slate-300 text-xs rounded-2"
                                        >
                                            <option value="SCHEDULED">Scheduled</option>
                                            <option value="ROUND_1_HR">Round 1 — HR Screening</option>
                                            <option value="ROUND_2_TECH">Round 2 — Technical (HOD)</option>
                                            <option value="ROUND_3_FINAL">Round 3 — Final Round</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">Meeting Link / Room</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="text"
                                            placeholder="https://meet.google.com/..."
                                            value={scheduleData.interview_meeting_link}
                                            onChange={(e) => setScheduleData({ ...scheduleData, interview_meeting_link: e.target.value })}
                                            className="border-slate-300 text-xs rounded-2"
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold text-xs text-slate-700">Notes for Panel</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={5}
                                            value={scheduleData.interview_notes}
                                            onChange={(e) => setScheduleData({ ...scheduleData, interview_notes: e.target.value })}
                                            className="border-slate-300 !text-sm rounded-2"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2">
                    <Button variant="outline-secondary" size="sm" onClick={() => setShowScheduleModal(false)} className="text-xs">
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSubmitSchedule}
                        disabled={submittingSchedule}
                        className="text-xs px-3 bg-blue-600 border-blue-600 justify-content-center align-items-center"
                    >
                        {submittingSchedule ? <Spinner size="sm" animation="border" /> :
                            <div className="flex items-center gap-[0.8]">
                                <LuCalendar size={12} className="me-1" /> Schedule
                            </div>}

                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 6: VIEW REQUISITION DETAILS & JD                           */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showViewReqModal} onHide={() => setShowViewReqModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuFileText className="text-blue-600" /> Requisition: {selectedRequisition?.requisition_code}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3.5">
                    {selectedRequisition && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-2.5">
                                <div>
                                    <h5 className="fw-bold text-slate-900 mb-0">{selectedRequisition.position}</h5>
                                    <span className="text-slate-500 text-xs">
                                        {selectedRequisition.department} • Raised by: {selectedRequisition.hod_name}
                                    </span>
                                </div>
                                <div>{renderStatusBadge(selectedRequisition.status)}</div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-2 border border-slate-200 mb-3 text-xs">
                                <Row className="g-2.5">
                                    <Col md={4}>
                                        <span className="text-slate-500 d-block text-2xs">Max Salary Budget:</span>
                                        <strong className="text-slate-900 font-mono fs-6">
                                            {formatCurrency(selectedRequisition.max_salary, selectedRequisition.salary_frequency)}
                                        </strong>
                                    </Col>

                                    <Col md={4}>
                                        <span className="text-slate-500 d-block text-2xs">Experience:</span>
                                        <strong className="text-slate-900 fs-6">{selectedRequisition.experience_required}</strong>
                                    </Col>

                                    <Col md={4}>
                                        <span className="text-slate-500 d-block text-2xs">Joining Urgency:</span>
                                        <strong className="text-slate-900 fs-6">{selectedRequisition.joining_date_type} Joining</strong>
                                    </Col>

                                    <Col md={4}>
                                        <span className="text-slate-500 d-block text-2xs">Budget Status:</span>
                                        {selectedRequisition.is_budgeted ? (
                                            <span className="md-chip md-chip-emerald">Budgeted: Yes</span>
                                        ) : (
                                            <span className="md-chip md-chip-amber">
                                                Budgeted: No ({selectedRequisition.budget_approval_status})
                                            </span>
                                        )}
                                    </Col>

                                    <Col md={4}>
                                        <span className="text-slate-500 d-block text-2xs">Vacancies:</span>
                                        <strong className="text-slate-900">{selectedRequisition.vacancies_count}</strong>
                                    </Col>

                                    <Col md={4}>
                                        <span className="text-slate-500 d-block text-2xs">Reason:</span>
                                        <span className="text-slate-800">{selectedRequisition.reason_for_hiring}</span>
                                    </Col>
                                </Row>
                            </div>

                            {/* Executive Approver details if unbudgeted */}
                            {!selectedRequisition.is_budgeted && selectedRequisition.ceo_coo_approver_name && (
                                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2 mb-3 text-xs">
                                    <span className="fw-bold text-emerald-800 d-block mb-0.5">
                                        <LuCircleCheck size={12} className="me-1" /> Approved by Executive Management:
                                    </span>
                                    <div className="text-slate-700">Approver: {selectedRequisition.ceo_coo_approver_name} ({selectedRequisition.ceo_coo_approver_role})</div>
                                    <div className="text-slate-700">Comments: {selectedRequisition.ceo_coo_comments}</div>
                                    <div className="text-slate-400 text-2xs mt-0.5">Date: {formatDate(selectedRequisition.ceo_coo_decision_at)}</div>
                                </div>
                            )}

                            {/* CEO / COO Approval Document PDF if unbudgeted */}
                            {selectedRequisition.approval_document_url && (
                                <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-2 mb-3 text-xs d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center gap-2">
                                        <LuFileCheck className="text-amber-700 fs-5 flex-shrink-0" />
                                        <div>
                                            <span className="fw-bold text-amber-900 d-block">CEO / COO Approval Document (PDF Attached)</span>
                                            <span className="text-slate-500 text-2xs font-mono">{selectedRequisition.approval_document_filename || "CEO_COO_Approval.pdf"}</span>
                                        </div>
                                    </div>
                                    <a
                                        href={getUploadUrl(selectedRequisition.approval_document_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-xs btn-outline-warning text-amber-900 border-amber-400 bg-white d-inline-flex align-items-center gap-1 text-2xs fw-bold px-2 py-1"
                                    >
                                        <LuExternalLink size={12} /> View Approval PDF
                                    </a>
                                </div>
                            )}

                            <h6 className="fw-semibold text-slate-800 mb-1.5 text-xs">Job Description & Qualifications:</h6>
                            <div className="p-3 bg-white rounded-2 border border-slate-200 text-xs text-slate-700 lh-base" style={{ whiteSpace: "pre-wrap" }}>
                                {selectedRequisition.job_description}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-slate-50 border-top border-slate-200 py-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowViewReqModal(false)} className="text-xs">
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODAL 7: RESUME VIEWER MODAL                                     */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <Modal show={showResumeModal} onHide={() => setShowResumeModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-2.5">
                    <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
                        <LuFileText className="text-blue-600" /> Resume: {selectedCandidate?.candidate_name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-2.5 text-center">
                    {selectedCandidate?.resume_url ? (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                                <span className="text-2xs text-slate-500 font-mono">File: {selectedCandidate.resume_filename || "Resume Document"}</span>
                                <a
                                    href={getUploadUrl(selectedCandidate.resume_url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-xs btn-outline-primary d-inline-flex align-items-center gap-1 !text-xs"
                                >
                                    <LuExternalLink size={12} /> Open in New Tab
                                </a>
                            </div>
                            <iframe
                                src={getUploadUrl(selectedCandidate.resume_url)}
                                title="Candidate Resume"
                                style={{ width: "100%", height: "550px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                            />
                        </div>
                    ) : (
                        <div className="py-5 text-slate-400 text-xs">No resume uploaded for this candidate.</div>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default Requisition;
