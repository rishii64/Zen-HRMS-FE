import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "react-bootstrap";
import {
  LuGraduationCap,
  LuBookOpen,
  LuCalendar,
  LuClock,
  LuMapPin,
  LuVideo,
  LuUsers,
  LuAward,
  LuCircleCheck,
  LuCircleAlert,
  LuFileText,
  LuUpload,
  LuFilter,
  LuSearch,
  LuPlus,
  LuRefreshCw,
  LuExternalLink,
  LuDownload,
  LuCheck,
  LuX,
  LuStar,
  LuBuilding2,
  LuClipboardCheck,
  LuEye,
  LuPencil,
  LuTrash2,
  LuSend,
  LuTimer,
  LuLayers,
  LuShieldAlert,
  LuFileCheck,
  LuPrinter,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api, { getUploadUrl } from "../../api/axios";
import { getAuthRole, getAuthUser, isDepartmentHeadOrManager } from "../../utils/auth";
import * as XLSX from "xlsx";

// Categories available for Training
const TRAINING_CATEGORIES = [
  "Technical",
  "Compliance",
  "Soft Skills",
  "Safety",
  "Induction",
  "Leadership",
  "Process",
  "Quality",
];

const DELIVERY_MODES = ["All Modes", "Offline", "Online", "Blended"];

export default function Training() {
  const currentUser = getAuthUser() || {};
  const rawRole = (getAuthRole() || localStorage.getItem("role") || "").toLowerCase().trim();
  const userRole = rawRole === "employees" ? "employee" : rawRole;

  const isHR = [
    "hr",
    "admin",
    "management",
    "hrmanager",
    "ceo",
    "coo",
    "cto",
    "cfo",
    "vp",
    "secretary",
  ].includes(userRole);

  const isHOD = ["hod", "manager", "teamlead"].includes(userRole) || isDepartmentHeadOrManager();

  // Active Tab state
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "departmental") return "departmental";
    if (tabParam === "certifications") return "certifications";
    if (tabParam === "my-training" || !isHR) return "my-training";
    if (tabParam === "reports" && (isHR || isHOD)) return "reports";
    return "hr";
  });

  // Loading states
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState({
    totalPrograms: 0,
    completedPrograms: 0,
    upcomingSessions: 0,
    pendingApprovals: 0,
    pendingDeptProposals: 0,
    complianceRate: 100,
    myAssignedTrainings: 0,
    myCompletedTrainings: 0,
    myPendingAssessments: 0,
    myCertificationsCount: 0,
  });

  const [programs, setPrograms] = useState([]);
  const [myTrainings, setMyTrainings] = useState([]);
  const [myCertifications, setMyCertifications] = useState([]);
  const [certQueue, setCertQueue] = useState([]);
  const [reportsData, setReportsData] = useState(null);

  // Certificate Viewer Modal (Printable Official Certificate)
  const [showCertViewerModal, setShowCertViewerModal] = useState(false);
  const [activeCert, setActiveCert] = useState(null);

  // Logo Customization for Certificates before publishing
  const [publishingLogoFile, setPublishingLogoFile] = useState(null);
  const [publishingLogoPreview, setPublishingLogoPreview] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [programLogoFile, setProgramLogoFile] = useState(null);
  const [programLogoPreview, setProgramLogoPreview] = useState(null);

  // Tab 3 Sub-tab & Internal Issued Certifications
  const [certSubTab, setCertSubTab] = useState("internal"); // "internal" | "queue" | "my"
  const [issuedInternalCerts, setIssuedInternalCerts] = useState([]);

  // Program Details Modal extra data (tabs: "overview", "enrollments", "feedback")
  const [programDetailsTab, setProgramDetailsTab] = useState("overview");
  const [programDetailsFeedback, setProgramDetailsFeedback] = useState(null);
  const [programEnrollmentsList, setProgramEnrollmentsList] = useState([]);
  const [loadingDetailsExtra, setLoadingDetailsExtra] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All Modes");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  // Modals state
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showProgramDetailsModal, setShowProgramDetailsModal] = useState(false);

  // Sessions Modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    batch_name: "Cohort 1",
    session_date: "",
    start_time: "10:00 AM",
    end_time: "01:00 PM",
    venue_or_link: "",
    trainer_name: "",
    capacity: 50,
  });

  // Attendance Modal
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceEnrollments, setAttendanceEnrollments] = useState([]);
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState({});

  // Assessment Config Modal (HR)
  const [showAssessmentBuilderModal, setShowAssessmentBuilderModal] = useState(false);
  const [assessmentFormData, setAssessmentFormData] = useState({
    title: "",
    instructions: "",
    duration_minutes: 30,
    total_marks: 100,
    pass_percentage: 60,
    max_attempts: 2,
    questions: [],
  });

  // Interactive Student Exam Modal
  const [showExamModal, setShowExamModal] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examTimeRemaining, setExamTimeRemaining] = useState(0);
  const [examStartedAt, setExamStartedAt] = useState(null);

  // Descriptive Grading & Submissions Modal (HR)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [programSubmissions, setProgramSubmissions] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradingMarks, setGradingMarks] = useState({});
  const [gradingFeedback, setGradingFeedback] = useState({});


  // Feedback Modal (Student)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTargetProgram, setFeedbackTargetProgram] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    content_quality_rating: 5,
    trainer_effectiveness_rating: 5,
    relevance_to_job_rating: 5,
    overall_satisfaction_rating: 5,
    suggestions: "",
    is_anonymous: false,
  });

  // Feedback Summary Modal (HR)
  const [showFeedbackSummaryModal, setShowFeedbackSummaryModal] = useState(false);
  const [feedbackSummaryData, setFeedbackSummaryData] = useState(null);

  // Submit Certification Modal (Student / Employee)
  const [showCertSubmitModal, setShowCertSubmitModal] = useState(false);
  const [certFormData, setCertFormData] = useState({
    source_type: "EXTERNAL",
    course_name: "",
    provider_institution: "",
    skills_acquired: "",
    start_date: "",
    completion_date: "",
    duration_hours: 0,
    credential_id: "",
    verification_url: "",
    issue_date: "",
    expiry_date: "",
    status: "Submitted",
  });
  const [certFile, setCertFile] = useState(null);

  // HR Review Certification Modal
  const [showCertReviewModal, setShowCertReviewModal] = useState(false);
  const [selectedCertForReview, setSelectedCertForReview] = useState(null);
  const [certReviewData, setCertReviewData] = useState({
    status: "Approved",
    review_comments: "",
    rejection_reason: "",
    is_verified: true,
  });

  // Assign Employees Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assign_type: "DEPARTMENT",
    department: "IT / Engineering",
    employee_ids: "",
    assign_all: false,
    due_date: "",
  });

  // Program Form state
  const [programForm, setProgramForm] = useState({
    title: "",
    description: "",
    objectives: "",
    type: "HR",
    category: "Technical",
    delivery_mode: "Offline",
    department: "",
    target_audience_type: "ALL",
    is_mandatory: false,
    is_onboarding_mandatory: false,
    duration_hours: 2.0,
    completion_criteria: "",
    trainer_type: "INTERNAL",
    trainer_name: "",
    trainer_email: "",
    trainer_bio: "",
    venue: "",
    meeting_link: "",
    session_instructions: "",
    learning_materials: [],
    start_date: "",
    end_date: "",
    due_date: "",
    capacity: 50,
    assessment_required: false,
    feedback_required: true,
    certificate_provided: true,
    initial_session_date: "",
    initial_session_start_time: "10:00 AM",
    initial_session_end_time: "01:00 PM",
  });

  // Load Dashboard Stats
  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get("/training/dashboard-stats");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("loadDashboardStats error:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Programs
  const loadPrograms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/training/programs");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPrograms(res.data.data);
      }
    } catch (err) {
      console.error("loadPrograms error:", err);
      toast.error("Failed to load training programs");
    } finally {
      setLoading(false);
    }
  };

  // Load My Trainings
  const loadMyTrainings = async () => {
    try {
      const res = await api.get("/training/my-trainings");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMyTrainings(res.data.data);
      }
    } catch (err) {
      console.error("loadMyTrainings error:", err);
    }
  };

  // Load My Certifications
  const loadMyCertifications = async () => {
    try {
      const res = await api.get("/training/certifications/my");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMyCertifications(res.data.data);
      }
    } catch (err) {
      console.error("loadMyCertifications error:", err);
    }
  };

  // Load Certifications Queue (HR)
  const loadCertQueue = async () => {
    if (!isHR) return;
    try {
      const res = await api.get("/training/certifications/queue");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCertQueue(res.data.data);
      }
    } catch (err) {
      console.error("loadCertQueue error:", err);
    }
  };

  // Load Issued Internal Training Certificates
  const loadIssuedInternalCerts = async () => {
    try {
      const res = await api.get("/training/certificates/issued");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setIssuedInternalCerts(res.data.data);
      }
    } catch (err) {
      console.error("loadIssuedInternalCerts error:", err);
    }
  };

  // Open Program Details with automatic feedback & enrollments fetch
  const handleOpenProgramDetails = async (prog) => {
    setSelectedProgram(prog);
    setProgramDetailsTab("overview");
    setShowProgramDetailsModal(true);
    setLoadingDetailsExtra(true);
    try {
      const [feedRes, enrRes] = await Promise.all([
        api.get(`/training/programs/${prog.id}/feedback`).catch(() => ({ data: null })),
        api.get(`/training/programs/${prog.id}/enrollments`).catch(() => ({ data: null })),
      ]);
      if (feedRes?.data?.success) {
        setProgramDetailsFeedback(feedRes.data.data);
      } else {
        setProgramDetailsFeedback(null);
      }
      if (enrRes?.data?.success && Array.isArray(enrRes.data.data)) {
        setProgramEnrollmentsList(enrRes.data.data);
      } else {
        setProgramEnrollmentsList([]);
      }
    } catch (err) {
      console.error("Error loading program details extra data:", err);
    } finally {
      setLoadingDetailsExtra(false);
    }
  };

  // View / Print Official Internal Certificate
  const handleViewInternalCertificate = async (enr, prog = null) => {
    const p = prog || enr?.program || {};
    const certPayload = {
      enrollment_id: enr?.id || enr?.enrollment_id,
      certificate_number: enr?.certificate_number || `CERT-${enr?.employee_id || currentUser.employee_id || "EMP"}-${Math.floor(1000 + Math.random() * 9000)}`,
      employee_id: enr?.employee_id || currentUser.employee_id || "EMP",
      employee_name: enr?.employee_name || currentUser.name || "Employee",
      department: enr?.department || currentUser.dept || "Staff",
      program_code: p.code || "TRN",
      program_title: p.title || "Corporate Training",
      category: p.category || "Professional Development",
      delivery_mode: p.delivery_mode || "Blended",
      duration_hours: p.duration_hours || 2,
      trainer_name: p.trainer_name || "Lead Corporate Trainer",
      company_logo_url: enr?.company_logo_url || p?.company_logo_url || selectedProgram?.company_logo_url || null,
      completion_status: enr?.completion_status || "Completed",
      completed_at: enr?.completed_at || enr?.updated_at || new Date().toISOString(),
      assessment_score: enr?.assessment_score ?? enr?.published_submission?.percentage ?? null,
      issue_date: enr?.completed_at || enr?.updated_at || new Date().toISOString(),
    };
    setActiveCert(certPayload);
    setShowCertViewerModal(true);

    try {
      const eid = enr?.id || enr?.enrollment_id;
      if (eid) {
        const res = await api.get(`/training/certificates/${eid}`);
        if (res.data?.success && res.data.data) {
          setActiveCert(res.data.data);
        }
      }
    } catch (err) {
      // Fallback already set
    }
  };

  // Load Reports Data
  const loadReportsData = async () => {
    if (!isHR && !isHOD) return;
    try {
      const res = await api.get("/training/reports");
      if (res.data?.success) {
        setReportsData(res.data.data);
      }
    } catch (err) {
      console.error("loadReportsData error:", err);
    }
  };

  // Initial Load
  useEffect(() => {
    loadDashboardStats();
    loadPrograms();
    loadMyTrainings();
    loadMyCertifications();
    loadIssuedInternalCerts();
    if (isHR) loadCertQueue();
    if (isHR || isHOD) loadReportsData();
  }, []);

  // Exam Countdown Timer
  useEffect(() => {
    if (!showExamModal || examTimeRemaining <= 0) return;
    const interval = setInterval(() => {
      setExamTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showExamModal, examTimeRemaining]);

  const handleAutoSubmitExam = () => {
    toast("Time expired! Submitting assessment automatically...", { icon: "⏰" });
    handleSubmitExam();
  };

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (activeTab === "hr" && p.type !== "HR") return false;
      if (activeTab === "departmental" && p.type !== "DEPARTMENTAL") return false;

      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        p.title?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.trainer_name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);

      const matchCat =
        selectedCategory === "All" || p.category === selectedCategory;

      const matchMode =
        selectedMode === "All Modes" || p.delivery_mode === selectedMode;

      const matchDept =
        selectedDeptFilter === "All" ||
        p.department === selectedDeptFilter ||
        !p.department;

      return matchSearch && matchCat && matchMode && matchDept;
    });
  }, [programs, activeTab, searchTerm, selectedCategory, selectedMode, selectedDeptFilter]);

  // Program Create / Edit Handlers
  const handleOpenCreateProgram = (type = "HR") => {
    setIsEditingProgram(false);
    setSelectedProgram(null);
    setProgramLogoFile(null);
    setProgramLogoPreview(null);
    setProgramForm({
      title: "",
      description: "",
      objectives: "",
      type,
      category: "Technical",
      delivery_mode: "Offline",
      department: type === "DEPARTMENTAL" ? currentUser.dept || "IT / Engineering" : "",
      target_audience_type: "ALL",
      is_mandatory: false,
      is_onboarding_mandatory: false,
      duration_hours: 2.0,
      completion_criteria: "Complete session attendance and assessment.",
      trainer_type: "INTERNAL",
      trainer_name: currentUser.name || "",
      trainer_email: currentUser.email || "",
      trainer_bio: "",
      venue: "Main Conference Room, 2nd Floor",
      meeting_link: "",
      session_instructions: "Please arrive 10 minutes prior to scheduled start time.",
      learning_materials: [],
      start_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      end_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      due_date: new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0],
      capacity: 50,
      assessment_required: false,
      feedback_required: true,
      certificate_provided: true,
      initial_session_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      initial_session_start_time: "10:00 AM",
      initial_session_end_time: "01:00 PM",
    });
    setShowProgramModal(true);
  };

  const handleOpenEditProgram = (prog) => {
    setIsEditingProgram(true);
    setSelectedProgram(prog);
    setProgramLogoFile(null);
    setProgramLogoPreview(prog.company_logo_url ? getUploadUrl(prog.company_logo_url) : null);
    setProgramForm({
      title: prog.title || "",
      description: prog.description || "",
      objectives: prog.objectives || "",
      type: prog.type || "HR",
      category: prog.category || "Technical",
      delivery_mode: prog.delivery_mode || "Offline",
      department: prog.department || "",
      target_audience_type: prog.target_audience_type || "ALL",
      is_mandatory: !!prog.is_mandatory,
      is_onboarding_mandatory: !!prog.is_onboarding_mandatory,
      duration_hours: prog.duration_hours || 2.0,
      completion_criteria: prog.completion_criteria || "",
      trainer_type: prog.trainer_type || "INTERNAL",
      trainer_name: prog.trainer_name || "",
      trainer_email: prog.trainer_email || "",
      trainer_bio: prog.trainer_bio || "",
      venue: prog.venue || "",
      meeting_link: prog.meeting_link || "",
      session_instructions: prog.session_instructions || "",
      learning_materials: prog.learning_materials || [],
      start_date: prog.start_date ? prog.start_date.split("T")[0] : "",
      end_date: prog.end_date ? prog.end_date.split("T")[0] : "",
      due_date: prog.due_date ? prog.due_date.split("T")[0] : "",
      capacity: prog.capacity || 50,
      assessment_required: !!prog.assessment_required,
      feedback_required: prog.feedback_required !== false,
      certificate_provided: prog.certificate_provided !== false,
      initial_session_date: prog.start_date ? prog.start_date.split("T")[0] : "",
      initial_session_start_time: "10:00 AM",
      initial_session_end_time: "01:00 PM",
    });
    setShowProgramModal(true);
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!programForm.title.trim()) {
      toast.error("Please enter a training title");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(programForm).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
            formData.append(key, JSON.stringify(val));
          } else {
            formData.append(key, val);
          }
        }
      });
      if (programLogoFile) {
        formData.append("company_logo", programLogoFile);
      }

      if (isEditingProgram && selectedProgram) {
        await api.put(`/training/programs/${selectedProgram.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Training program updated successfully");
      } else {
        const res = await api.post("/training/programs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(res.data?.message || "Training program created successfully");
      }
      setShowProgramModal(false);
      loadPrograms();
      loadDashboardStats();
    } catch (err) {
      console.error("Save program error:", err);
      toast.error(err.response?.data?.error || "Failed to save training program");
    }
  };

  // Departmental Proposal Review (HR action)
  const handleReviewProposal = async (programId, decision) => {
    const reason =
      decision === "Rejected" || decision === "Changes Requested"
        ? window.prompt(`Enter remarks for ${decision}:`)
        : null;

    if (decision !== "Approved" && !reason) return;

    try {
      const res = await api.patch(`/training/programs/${programId}/review-proposal`, {
        decision,
        rejection_reason: reason,
      });
      toast.success(res.data?.message || `Proposal ${decision}`);
      loadPrograms();
      loadDashboardStats();
    } catch (err) {
      console.error("Review proposal error:", err);
      toast.error(err.response?.data?.error || "Failed to review proposal");
    }
  };

  // Session Create Handler
  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!selectedProgram) return;

    try {
      await api.post(`/training/programs/${selectedProgram.id}/sessions`, sessionFormData);
      toast.success("New batch session added successfully");
      setShowSessionModal(false);
      loadPrograms();
    } catch (err) {
      console.error("Add session error:", err);
      toast.error(err.response?.data?.error || "Failed to add session");
    }
  };

  // Open Attendance Modal
  const handleOpenAttendance = async (prog) => {
    setSelectedProgram(prog);
    try {
      const res = await api.get(`/training/programs/${prog.id}/enrollments`);
      if (res.data?.success) {
        setAttendanceEnrollments(res.data.data);
        const map = {};
        res.data.data.forEach((e) => {
          map[e.id] = e.attendance_status || "Pending";
        });
        setSelectedAttendanceStatus(map);
      }
      setShowAttendanceModal(true);
    } catch (err) {
      console.error("load enrollments error:", err);
      toast.error("Failed to load participant list");
    }
  };

  // Save Bulk Attendance
  const handleSaveAttendance = async () => {
    try {
      const records = Object.entries(selectedAttendanceStatus).map(([id, status]) => ({
        enrollment_id: id,
        attendance_status: status,
      }));
      await api.post("/training/attendance/bulk", { attendanceRecords: records });
      toast.success("Attendance records updated successfully");
      setShowAttendanceModal(false);
      loadPrograms();
      loadDashboardStats();
    } catch (err) {
      console.error("Save attendance error:", err);
      toast.error(err.response?.data?.error || "Failed to update attendance");
    }
  };

  // Assessment Builder Handlers (HR / HOD)
  const handleOpenAssessmentBuilder = async (prog) => {
    setSelectedProgram(prog);
    try {
      const res = await api.get(`/training/programs/${prog.id}/assessment`);
      if (res.data?.success && res.data.data) {
        setAssessmentFormData({
          title: res.data.data.title || `${prog.title} — Assessment`,
          instructions: res.data.data.instructions || "Read each question carefully. Once submitted, retakes are strictly not permitted.",
          duration_minutes: res.data.data.duration_minutes || 30,
          total_marks: res.data.data.total_marks || 100,
          pass_percentage: res.data.data.pass_percentage || 60,
          max_attempts: 1,
          questions: res.data.data.questions || [],
        });
      } else {
        // Default new questions template if not yet created
        setAssessmentFormData({
          title: `${prog.title} — Certification Assessment`,
          instructions: "Read each question carefully. Single attempt only; retakes are not permitted.",
          duration_minutes: 30,
          total_marks: 30,
          pass_percentage: 60,
          max_attempts: 1,
          questions: [
            {
              id: "q_1",
              type: "MCQ",
              question: "Sample Multiple Choice Question 1?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correct_answer: "Option A",
              marks: 10,
              explanation: "",
            },
            {
              id: "q_2",
              type: "TRUE_FALSE",
              question: "Sample statement is true or false?",
              options: ["True", "False"],
              correct_answer: "True",
              marks: 10,
              explanation: "",
            },
            {
              id: "q_3",
              type: "DESCRIPTIVE",
              question: "Describe your key learning takeaways and practical workplace application.",
              options: [],
              correct_answer: "",
              marks: 10,
              explanation: "",
            },
          ],
        });
      }
    } catch (err) {
      // Default template on error
      setAssessmentFormData({
        title: `${prog.title} — Certification Assessment`,
        instructions: "Read each question carefully. Single attempt only; retakes are not permitted.",
        duration_minutes: 30,
        total_marks: 30,
        pass_percentage: 60,
        max_attempts: 1,
        questions: [
          {
            id: "q_1",
            type: "MCQ",
            question: "Sample Question 1?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: "Option A",
            marks: 10,
            explanation: "",
          },
        ],
      });
    }
    setShowAssessmentBuilderModal(true);
  };

  const handleAddAssessmentQuestion = (type = "MCQ") => {
    const newQ = {
      id: `q_${Date.now()}`,
      type,
      question: "",
      options: type === "MCQ" ? ["Option A", "Option B", "Option C", "Option D"] : type === "TRUE_FALSE" ? ["True", "False"] : [],
      correct_answer: type === "MCQ" ? "Option A" : type === "TRUE_FALSE" ? "True" : "",
      marks: 10,
      explanation: "",
    };
    setAssessmentFormData((prev) => {
      const updatedQs = [...prev.questions, newQ];
      const newTotal = updatedQs.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      return {
        ...prev,
        questions: updatedQs,
        total_marks: newTotal || prev.total_marks,
      };
    });
  };

  const handleUpdateAssessmentQuestion = (index, field, value) => {
    setAssessmentFormData((prev) => {
      const updatedQs = [...prev.questions];
      updatedQs[index] = { ...updatedQs[index], [field]: value };
      const newTotal = updatedQs.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      return { ...prev, questions: updatedQs, total_marks: newTotal || prev.total_marks };
    });
  };

  const handleDeleteAssessmentQuestion = (index) => {
    setAssessmentFormData((prev) => {
      const updatedQs = prev.questions.filter((_, i) => i !== index);
      const newTotal = updatedQs.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      return { ...prev, questions: updatedQs, total_marks: newTotal };
    });
  };

  const handleAddOptionToMCQ = (qIndex) => {
    setAssessmentFormData((prev) => {
      const updatedQs = [...prev.questions];
      const curOptions = updatedQs[qIndex].options || [];
      updatedQs[qIndex] = {
        ...updatedQs[qIndex],
        options: [...curOptions, `Option ${String.fromCharCode(65 + curOptions.length)}`],
      };
      return { ...prev, questions: updatedQs };
    });
  };

  const handleUpdateOption = (qIndex, optIndex, value) => {
    setAssessmentFormData((prev) => {
      const updatedQs = [...prev.questions];
      const curOptions = [...(updatedQs[qIndex].options || [])];
      const oldVal = curOptions[optIndex];
      curOptions[optIndex] = value;
      const wasCorrect = updatedQs[qIndex].correct_answer === oldVal;
      updatedQs[qIndex] = {
        ...updatedQs[qIndex],
        options: curOptions,
        correct_answer: wasCorrect ? value : updatedQs[qIndex].correct_answer,
      };
      return { ...prev, questions: updatedQs };
    });
  };

  const handleSaveAssessment = async () => {
    if (!selectedProgram) return;
    try {
      await api.post(`/training/programs/${selectedProgram.id}/assessment`, assessmentFormData);
      toast.success("Assessment configuration saved successfully");
      setShowAssessmentBuilderModal(false);
      loadPrograms();
    } catch (err) {
      console.error("Save assessment error:", err);
      toast.error("Failed to save assessment configuration");
    }
  };

  // Student Starts Exam (Single attempt strictly enforced; retakes prohibited)
  const handleStartExam = async (prog, enr = null) => {
    if (
      enr?.has_attended_exam ||
      enr?.submission ||
      (enr?.assessment_attempts_used && enr.assessment_attempts_used > 0) ||
      enr?.published_submission ||
      enr?.assessment_status === "Passed" ||
      enr?.assessment_status === "Failed" ||
      enr?.assessment_status === "Under Evaluation"
    ) {
      toast.error("You have already completed this examination. Retakes are not permitted.");
      return;
    }

    try {
      const res = await api.get(`/training/programs/${prog.id}/assessment`);
      if (res.data?.success && res.data.data) {
        const exam = res.data.data;
        if (exam.already_attended || (exam.attempts_remaining !== undefined && exam.attempts_remaining <= 0)) {
          toast.error("You have already attended this examination. Retakes are strictly not permitted.");
          return;
        }
        if (!exam.questions || exam.questions.length === 0) {
          toast.error("No questions configured for this examination yet.");
          return;
        }
        setActiveExam({ ...exam, program_id: prog.id, program_title: prog.title });
        setExamAnswers({});
        setExamTimeRemaining((exam.duration_minutes || 30) * 60);
        setExamStartedAt(new Date().toISOString());
        setShowExamModal(true);
      } else {
        toast.error("Assessment is not yet available for this program.");
      }
    } catch (err) {
      console.error("Start exam error:", err);
      toast.error(err.response?.data?.error || "Assessment is not active or available");
    }
  };

  // Student Submits Exam
  const handleSubmitExam = async () => {
    if (!activeExam) return;
    try {
      const answersPayload = Object.entries(examAnswers).map(([qid, ans]) => ({
        question_id: qid,
        employee_answer: ans,
      }));

      const res = await api.post(`/training/programs/${activeExam.program_id}/assessment/submit`, {
        answers: answersPayload,
        started_at: examStartedAt,
      });

      toast.success(res.data?.message || "Assessment submitted successfully!");
      const progToPrompt = { id: activeExam.program_id, title: activeExam.program_title || "Training" };
      setShowExamModal(false);
      setActiveExam(null);
      loadMyTrainings();
      loadDashboardStats();
      loadIssuedInternalCerts();
      setTimeout(() => {
        handleOpenFeedback(progToPrompt);
      }, 500);
    } catch (err) {
      console.error("Submit exam error:", err);
      toast.error(err.response?.data?.error || "Failed to submit assessment");
    }
  };

  // Open Submissions / Results Modal (HR)
  const handleOpenSubmissions = async (prog) => {
    setSelectedProgram(prog);
    setPublishingLogoFile(null);
    setPublishingLogoPreview(prog?.company_logo_url ? getUploadUrl(prog.company_logo_url) : null);
    try {
      const res = await api.get(`/training/programs/${prog.id}/submissions`);
      if (res.data?.success) {
        setProgramSubmissions(res.data.data);
        setShowSubmissionsModal(true);
      }
    } catch (err) {
      console.error("Load submissions error:", err);
      toast.error("Failed to load participant submissions");
    }
  };

  // Handle Logo Selection in Publishing Modal
  const handlePublishingLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }
      setPublishingLogoFile(file);
      setPublishingLogoPreview(URL.createObjectURL(file));
    }
  };

  // Upload and Save Company Logo explicitly
  const handleUploadCompanyLogo = async () => {
    if (!publishingLogoFile) {
      toast.error("Please choose a logo file first");
      return;
    }
    const pid = selectedProgram?.id;
    if (!pid) return;

    try {
      setIsUploadingLogo(true);
      const formData = new FormData();
      formData.append("company_logo", publishingLogoFile);

      const res = await api.post(`/training/programs/${pid}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success(res.data?.message || "Company logo updated successfully!");
        const updatedLogoUrl = res.data?.data?.company_logo_url;
        setSelectedProgram((prev) => (prev ? { ...prev, company_logo_url: updatedLogoUrl } : prev));
        setPublishingLogoPreview(updatedLogoUrl ? getUploadUrl(updatedLogoUrl) : publishingLogoPreview);
        setPublishingLogoFile(null);
        loadPrograms();
      }
    } catch (err) {
      console.error("Upload logo error:", err);
      toast.error(err.response?.data?.error || "Failed to upload company logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // HR Publishes Results & Issues Verified Certificates to Employees
  const handlePublishResults = async (progId) => {
    try {
      const pid = progId || selectedProgram?.id;
      let res;
      if (publishingLogoFile) {
        const formData = new FormData();
        formData.append("company_logo", publishingLogoFile);
        formData.append("publish_all", "true");
        res = await api.post(`/training/programs/${pid}/publish-results`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post(`/training/programs/${pid}/publish-results`, {
          publish_all: true,
          company_logo_url: selectedProgram?.company_logo_url || null,
        });
      }

      toast.success(res.data?.message || "Assessment results & completion certificates released to employees!");
      if (res.data?.data?.company_logo_url) {
        const updatedLogo = res.data.data.company_logo_url;
        setSelectedProgram((prev) => (prev ? { ...prev, company_logo_url: updatedLogo } : prev));
        setPublishingLogoPreview(getUploadUrl(updatedLogo));
        setPublishingLogoFile(null);
      }
      handleOpenSubmissions(selectedProgram);
      loadPrograms();
      loadIssuedInternalCerts();
    } catch (err) {
      console.error("Publish results error:", err);
      toast.error(err.response?.data?.error || "Failed to publish assessment results");
    }
  };

  // Preview Certificate from Publishing Desk
  const handlePreviewCertificateBeforePublishing = () => {
    const passedSub = programSubmissions.find((s) => s.pass_status === "Passed") || programSubmissions[0];
    const previewCert = {
      enrollment_id: passedSub?.id || 9999,
      certificate_number: `PREVIEW-${selectedProgram?.code || "TRN"}-DRAFT`,
      employee_id: passedSub?.employee_id || currentUser.employee_id || "EMP001",
      employee_name: passedSub?.employee_name || currentUser.name || "Sample Employee",
      department: currentUser.dept || "Talent Development",
      program_code: selectedProgram?.code || "TRN",
      program_title: selectedProgram?.title || "Corporate Training Program",
      category: selectedProgram?.category || "Professional Development",
      delivery_mode: selectedProgram?.delivery_mode || "Blended",
      duration_hours: selectedProgram?.duration_hours || 2,
      trainer_name: selectedProgram?.trainer_name || "Lead Corporate Trainer",
      company_logo_url: publishingLogoPreview || (selectedProgram?.company_logo_url ? getUploadUrl(selectedProgram.company_logo_url) : null),
      completion_status: "Completed",
      completed_at: new Date().toISOString(),
      assessment_score: passedSub?.percentage ?? passedSub?.score_percentage ?? 92,
      issue_date: new Date().toISOString(),
    };
    setActiveCert(previewCert);
    setShowCertViewerModal(true);
  };

  // Grade Descriptive Answer
  const handleSaveGrading = async () => {
    if (!gradingSubmission) return;
    try {
      const manualEvaluations = Object.entries(gradingMarks).map(([qid, marks]) => ({
        question_id: qid,
        marks_awarded: marks,
        feedback: gradingFeedback[qid] || "",
      }));

      await api.post(`/training/submissions/${gradingSubmission.id}/evaluate`, {
        manualEvaluations,
      });

      toast.success("Evaluation saved successfully");
      setGradingSubmission(null);
      handleOpenSubmissions(selectedProgram);
    } catch (err) {
      console.error("Save grading error:", err);
      toast.error("Failed to save evaluation marks");
    }
  };

  // Submit Feedback Handler
  const handleOpenFeedback = (prog) => {
    setFeedbackTargetProgram(prog);
    setFeedbackForm({
      content_quality_rating: 5,
      trainer_effectiveness_rating: 5,
      relevance_to_job_rating: 5,
      overall_satisfaction_rating: 5,
      suggestions: "",
      is_anonymous: false,
    });
    setShowFeedbackModal(true);
  };

  const handleSaveFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackTargetProgram) return;
    try {
      await api.post(`/training/programs/${feedbackTargetProgram.id}/feedback`, feedbackForm);
      toast.success("Thank you! Feedback recorded successfully.");
      setShowFeedbackModal(false);
      loadMyTrainings();
    } catch (err) {
      console.error("Feedback error:", err);
      toast.error(err.response?.data?.error || "Failed to submit feedback");
    }
  };

  // View Aggregated Feedback (HR)
  const handleOpenFeedbackSummary = async (prog) => {
    setSelectedProgram(prog);
    try {
      const res = await api.get(`/training/programs/${prog.id}/feedback`);
      if (res.data?.success) {
        setFeedbackSummaryData(res.data.data);
        setShowFeedbackSummaryModal(true);
      }
    } catch (err) {
      console.error("Load feedback summary error:", err);
      toast.error("Failed to load feedback summary");
    }
  };

  // Submit Certification (Employee)
  const handleSaveCertification = async (e) => {
    e.preventDefault();
    if (!certFormData.course_name.trim() || !certFormData.provider_institution.trim() || !certFormData.completion_date) {
      toast.error("Please enter course name, provider institution, and completion date");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(certFormData).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          if (["start_date", "completion_date", "issue_date", "expiry_date"].includes(key)) {
            const strVal = String(val).trim();
            if (strVal && strVal !== "Invalid date") {
              formData.append(key, strVal);
            }
          } else {
            formData.append(key, val);
          }
        }
      });
      if (certFile) {
        formData.append("certificate_file", certFile);
      }

      await api.post("/training/certifications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Certification submitted successfully for HR verification");
      setShowCertSubmitModal(false);
      setCertFile(null);
      setCertFormData({
        source_type: "EXTERNAL",
        course_name: "",
        provider_institution: "",
        skills_acquired: "",
        start_date: "",
        completion_date: "",
        duration_hours: 0,
        credential_id: "",
        verification_url: "",
        issue_date: "",
        expiry_date: "",
        status: "Submitted",
      });
      loadMyCertifications();
      if (isHR) loadCertQueue();
      loadDashboardStats();
    } catch (err) {
      console.error("Submit cert error:", err);
      toast.error(err.response?.data?.error || "Failed to submit certification");
    }
  };

  // HR Review Certification
  const handleSaveCertReview = async () => {
    if (!selectedCertForReview) return;
    try {
      await api.patch(`/training/certifications/${selectedCertForReview.id}/review`, certReviewData);
      toast.success(`Certification marked as ${certReviewData.status}`);
      setShowCertReviewModal(false);
      loadCertQueue();
      loadDashboardStats();
    } catch (err) {
      console.error("Review cert error:", err);
      toast.error("Failed to update certification review");
    }
  };

  // Assign Employees
  const handleOpenAssignModal = (prog) => {
    setSelectedProgram(prog);
    setAssignForm({
      assign_type: "DEPARTMENT",
      department: prog.department || "IT / Engineering",
      employee_ids: "",
      assign_all: prog.target_audience_type === "ALL",
      due_date: prog.due_date || "",
    });
    setShowAssignModal(true);
  };

  const handleExecuteAssignment = async (e) => {
    e.preventDefault();
    if (!selectedProgram) return;

    try {
      const payload = {
        assign_all: assignForm.assign_type === "ALL",
        department: assignForm.assign_type === "DEPARTMENT" ? assignForm.department : null,
        employee_ids:
          assignForm.assign_type === "SPECIFIC"
            ? assignForm.employee_ids.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
        due_date: assignForm.due_date || null,
      };

      const res = await api.post(`/training/programs/${selectedProgram.id}/assign`, payload);
      toast.success(res.data?.message || "Training assigned successfully");
      setShowAssignModal(false);
      loadPrograms();
      loadDashboardStats();
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error(err.response?.data?.error || "Failed to assign training");
    }
  };

  // Export to Excel / CSV
  const handleExportReports = () => {
    if (!reportsData) {
      toast.error("No reports data available to export");
      return;
    }

    const wsData = [
      ["Training & Development Enterprise Summary Report"],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Total Programs Created", reportsData.summary.totalTrainings],
      ["Completed Programs", reportsData.summary.completedTrainings],
      ["Total Participants Enrolled", reportsData.summary.totalEnrolled],
      ["Total Attended", reportsData.summary.totalAttended],
      ["Attendance Rate (%)", `${reportsData.summary.attendanceRate}%`],
      ["Completion Rate (%)", `${reportsData.summary.completionRate}%`],
      ["Assessment Pass Rate (%)", `${reportsData.summary.passPercentage}%`],
      ["Average Feedback Rating", `${reportsData.summary.avgFeedbackRating} / 5.0`],
      [],
      ["Department Breakdown"],
      ["Department", "Enrolled", "Attended", "Completed", "Completion %"],
      ...reportsData.department_breakdown.map((d) => [
        d.department,
        d.enrolled,
        d.attended,
        d.completed,
        d.enrolled > 0 ? `${Math.round((d.completed / d.enrolled) * 100)}%` : "0%",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Training_Report");
    XLSX.writeFile(wb, `HRMS_Training_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel report exported successfully!");
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ============================================================ */}
        {/* TOP HERO BANNER & KPI METRICS (Modern Glassmorphic Light)    */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-xs p-3 md:p-5">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200/70 text-cyan-700 text-xs font-bold uppercase tracking-wider shadow-2xs">
                  <LuGraduationCap className="w-4 h-4 text-cyan-600" />
                  Enterprise Learning & Development
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Role: {userRole.toUpperCase()}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Training & Development Hub
              </h1>
              <p className="text-slate-600 text-sm max-w-2xl mt-1 leading-relaxed">
                Centralized HR learning tracks, department-specific masterclasses, employee upskilling certifications, examinations, and feedback.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
              <button
                onClick={() => {
                  loadDashboardStats();
                  loadPrograms();
                  loadMyTrainings();
                  if (isHR) loadCertQueue();
                  toast.success("Refreshed training data");
                }}
                title="Refresh"
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-semibold shadow-2xs transition-all active:scale-95"
              >
                <LuRefreshCw className={`w-4 h-4 ${loading || statsLoading ? "animate-spin text-cyan-600" : ""}`} />
              </button>

              {isHR && (
                <button
                  onClick={() => handleOpenCreateProgram("HR")}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 hover:from-cyan-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <LuPlus className="w-4 h-4" />
                  <span>Create Program</span>
                </button>
              )}

              {isHOD && !isHR && (
                <button
                  onClick={() => handleOpenCreateProgram("DEPARTMENTAL")}
                  className="text-xs inline-flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <LuPlus className="w-4 h-4" />
                  <span>Create Training</span>
                </button>
              )}

              <button
                onClick={() => setShowCertSubmitModal(true)}
                className="!text-xs inline-flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all active:scale-98"
              >
                <LuAward className="w-4 h-4 text-amber-400" />
                <span>Upload Certificate</span>
              </button>
            </div>
          </div>

          {/* 4 Interactive KPI Metric Cards */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            {/* Card 1 */}
            <div className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                  {isHR ? "Total Programs" : "My Assigned"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuBookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {isHR ? stats.totalPrograms : stats.myAssignedTrainings}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {isHR ? "Active catalog offerings" : "Curated for your profile"}
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-cyan-50/40 hover:bg-white rounded-2xl p-4 border border-cyan-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-900 text-xs font-bold uppercase tracking-wider">Upcoming Sessions</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuCalendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-cyan-600 tracking-tight">
                {stats.upcomingSessions}
              </div>
              <div className="text-xs text-cyan-700 font-medium truncate mt-0.5">
                Live & offline batches
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-emerald-50/40 hover:bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-900 text-xs font-bold uppercase tracking-wider">
                  {isHR ? "Compliance Rate" : "Completed Tracks"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuCircleCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 tracking-tight">
                {isHR ? `${stats.complianceRate}%` : stats.myCompletedTrainings}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-0.5">
                {isHR ? "Org-wide mandatory compliance" : "Credentials successfully earned"}
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-amber-50/40 hover:bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-900 text-xs font-bold uppercase tracking-wider">
                  {isHR ? "Pending Approvals" : "Pending Exams"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuAward className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 tracking-tight">
                {isHR ? stats.pendingApprovals : stats.myPendingAssessments}
              </div>
              <div className="text-xs text-amber-700 font-medium mt-0.5">
                {isHR ? "External certs awaiting review" : "Assessments ready to take"}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* NAVIGATION TABS BAR                                          */}
        {/* ============================================================ */}
        <div className="w-full flex items-center border-b border-slate-200 pb-3 overflow-x-auto">
          <div className="flex items-center gap-2 w-full justify-around">
            {isHR && (
              <button
                onClick={() => setActiveTab("hr")}
                className={`px-4 py-2 rounded-xl !text-xs sm:text-sm font-bold w-auto flex items-center gap-2 transition-all ${activeTab === "hr"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <LuLayers className="w-4 h-4" />
                <span>1. HR Training</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("departmental")}
              className={`px-4 py-2 rounded-xl !text-xs sm:text-sm font-bold w-auto flex items-center gap-2 transition-all ${activeTab === "departmental"
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
                }`}
            >
              <LuBuilding2 className="w-4 h-4" />
              <span>2. Departmental Training</span>
            </button>

            <button
              onClick={() => setActiveTab("certifications")}
              className={`px-4 py-2 rounded-xl !text-xs sm:text-sm font-bold w-auto flex items-center gap-2 transition-all ${activeTab === "certifications"
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
                }`}
            >
              <LuAward className="w-4 h-4" />
              <span>3. Training & Certification</span>
              {isHR && stats.pendingApprovals > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {stats.pendingApprovals}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("my-training")}
              className={`px-4 py-2 rounded-xl !text-xs sm:text-sm font-bold w-auto flex items-center gap-2 transition-all ${activeTab === "my-training"
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
                }`}
            >
              <LuGraduationCap className="w-4 h-4" />
              <span>4. My Training</span>
              {stats.myPendingAssessments > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {stats.myPendingAssessments}
                </span>
              )}
            </button>

            {(isHR || isHOD) && (
              <button
                onClick={() => {
                  setActiveTab("reports");
                  loadReportsData();
                }}
                className={`px-4 py-2 rounded-xl !text-xs sm:text-sm font-bold w-auto flex items-center gap-2 transition-all ${activeTab === "reports"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <LuFileCheck className="w-4 h-4" />
                <span>5. Training Reports</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1 & 2: HR & DEPARTMENTAL TRAINING PROGRAM CATALOG         */}
        {/* ============================================================ */}
        {(activeTab === "hr" || activeTab === "departmental") && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-sm">
                  <LuSearch className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, code, trainer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden text-slate-700 font-medium"
                >
                  <option value="All">All Categories</option>
                  {TRAINING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden text-slate-700 font-medium"
                >
                  {DELIVERY_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex md:flex-col gap-1 text-end sm:flex-row">
                {(isHR || isHOD) && (
                  <button
                    onClick={() => handleOpenCreateProgram(activeTab === "hr" ? "HR" : "DEPARTMENTAL")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <LuPlus className="w-4 h-4" />
                    <span>{activeTab === "hr" ? "New HR Program" : "New Dept Program"}</span>
                  </button>
                )}
                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredPrograms.length} programs
                </div>
              </div>
            </div>

            {/* Program Cards Grid */}
            {filteredPrograms.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
                <LuGraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No training programs found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {activeTab === "departmental"
                    ? "No department-specific training programs recorded for this criteria."
                    : "No HR company training programs found matching your filters."}
                </p>
                {(isHR || isHOD) && (
                  <button
                    onClick={() => handleOpenCreateProgram(activeTab === "hr" ? "HR" : "DEPARTMENTAL")}
                    className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700"
                  >
                    + Create First Program
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPrograms.map((prog) => {
                  const isPendingProposal = prog.proposal_status === "Pending Approval";

                  return (
                    <div
                      key={prog.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-3 pt-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md">
                            {prog.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {prog.is_mandatory && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                Mandatory
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${prog.delivery_mode === "Online"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : prog.delivery_mode === "Offline"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                            >
                              {prog.delivery_mode}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-1">
                            {prog.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {prog.description || "Comprehensive structured workplace training track."}
                          </p>
                        </div>

                        {/* Proposal Alert Banner if Pending */}
                        {isPendingProposal && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-1.5">
                              <LuClock className="w-3.5 h-3.5" /> Dept Proposal: Pending Review
                            </span>
                            {isHR && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleReviewProposal(prog.id, "Approved")}
                                  className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewProposal(prog.id, "Rejected")}
                                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Details meta */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Category:</span>
                            <span className="font-semibold text-slate-700">{prog.category}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Trainer:</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                              {prog.trainer_name || "Internal Staff"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Duration:</span>
                            <span className="font-semibold text-slate-700">{prog.duration_hours} hrs</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Enrolled:</span>
                            <span className="font-semibold text-slate-700">
                              {prog.enrolled_count || 0} / {prog.capacity || 50}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedProgram(prog);
                            setShowProgramDetailsModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                        >
                          View Details
                        </button>

                        <div className="flex items-center gap-1.5">
                          {(isHR || isHOD) && (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(prog)}
                                title="Assign Participants"
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-colors"
                              >
                                + Assign
                              </button>
                              <button
                                onClick={() => handleOpenAttendance(prog)}
                                title="Attendance & Batches"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
                              >
                                <LuClipboardCheck className="w-4 h-4 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => handleOpenAssessmentBuilder(prog)}
                                title="Manage Exam"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
                              >
                                <LuFileText className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleOpenSubmissions(prog)}
                                title="Scores & Publish"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
                              >
                                <LuSend className="w-4 h-4 text-purple-600" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProgram(prog)}
                                title="Edit Program & Logo"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
                              >
                                <LuPencil className="w-4 h-4 text-slate-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: TRAINING & CERTIFICATION — EMPLOYEE UPSKILLING         */}
        {/* ============================================================ */}
        {activeTab === "certifications" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isHR ? "Employee Upskilling & Verification Queue" : "My Professional Development Records"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record internal trainings, external industry credentials (AWS, Google, Coursera), verify credentials, and view approval audits.
                </p>
              </div>

              <button
                onClick={() => setShowCertSubmitModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <LuUpload className="w-4 h-4" />
                <span>Submit New Certification</span>
              </button>
            </div>

            {/* Sub-tab Switcher for Tab 3 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setCertSubTab("internal")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${certSubTab === "internal"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
              >
                <LuAward className="w-4 h-4 text-amber-400" />
                <span>Issued Internal Certificates ({issuedInternalCerts.length})</span>
              </button>

              {isHR && (
                <button
                  type="button"
                  onClick={() => setCertSubTab("queue")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${certSubTab === "queue"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                >
                  <LuClipboardCheck className="w-4 h-4 text-amber-500" />
                  <span>External Review Queue ({certQueue.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCertSubTab("my")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${certSubTab === "my"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
              >
                <LuGraduationCap className="w-4 h-4 text-cyan-400" />
                <span>My Uploaded Credentials ({myCertifications.length})</span>
              </button>
            </div>

            {/* SUBTAB 1: ISSUED INTERNAL TRAINING CERTIFICATES */}
            {certSubTab === "internal" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <LuAward className="w-4 h-4 text-amber-600" />
                    Verified Internal Training Certificates Registry ({issuedInternalCerts.length} issued)
                  </span>
                  <button
                    onClick={loadIssuedInternalCerts}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Refresh certificates"
                  >
                    <LuRefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Program / Track</th>
                        <th className="py-3 px-4">Category & Mode</th>
                        <th className="py-3 px-4">Completion Date</th>
                        <th className="py-3 px-4">Assessment / Score</th>
                        <th className="py-3 px-4">Certificate ID</th>
                        <th className="py-3 px-4 text-right">Certificate Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {issuedInternalCerts.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No internal training certificates issued yet. Certificates are issued automatically upon attendance / examination completion.
                          </td>
                        </tr>
                      ) : (
                        issuedInternalCerts.map((c) => {
                          const p = c.program || {};
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{c.employee_name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {c.employee_id} • {c.department || "Staff"}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{p.title || "Corporate Training Track"}</div>
                                <div className="text-[11px] text-cyan-700 font-mono font-semibold">{p.code || "TRN"}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-700">{p.category || "General"}</span>
                                <div className="text-[10px] text-slate-400">{p.delivery_mode || "Blended"} • {p.duration_hours || 2}h</div>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-700">
                                {c.completed_at ? new Date(c.completed_at).toLocaleDateString() : (c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "Completed")}
                              </td>
                              <td className="py-3 px-4">
                                {c.assessment_score !== null && c.assessment_score !== undefined ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Passed ({c.assessment_score}%)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    {c.attendance_status || "Attended"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-amber-800 text-[11px]">
                                {c.certificate_number || `CERT-${c.employee_id}-${(c.id || "").slice(0, 4).toUpperCase()}`}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleViewInternalCertificate(c, p)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <LuAward className="w-3.5 h-3.5 text-amber-300" />
                                  <span>View Certificate</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB 2: HR Review Queue Table */}
            {isHR && certSubTab === "queue" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <LuClipboardCheck className="w-4 h-4 text-amber-600" />
                    HR Review & Verification Queue ({certQueue.length} submissions)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Course / Program</th>
                        <th className="py-3 px-4">Provider</th>
                        <th className="py-3 px-4">Completion Date</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {certQueue.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No certifications currently in the review queue.
                          </td>
                        </tr>
                      ) : (
                        certQueue.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{c.employee_name}</div>
                              <div className="text-[11px] text-slate-400">{c.employee_id} • {c.department || "Staff"}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {c.course_name}
                              {c.skills_acquired && (
                                <div className="text-[10px] text-cyan-700 font-normal truncate max-w-xs">
                                  {c.skills_acquired}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">{c.provider_institution}</td>
                            <td className="py-3 px-4 font-mono">{c.completion_date}</td>
                            <td className="py-3 px-4">
                              {c.verification_url ? (
                                <a
                                  href={c.verification_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-600 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  Verify URL <LuExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400">Manual review</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : c.status === "Rejected"
                                    ? "bg-rose-100 text-rose-800"
                                    : c.status === "Changes Requested"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedCertForReview(c);
                                  setCertReviewData({
                                    status: c.status === "Submitted" ? "Approved" : c.status,
                                    review_comments: c.review_comments || "",
                                    rejection_reason: c.rejection_reason || "",
                                    is_verified: true,
                                  });
                                  setShowCertReviewModal(true);
                                }}
                                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB 3: Employee's Own Submitted Certifications Grid */}
            {certSubTab === "my" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800">
                  {isHR ? "Your Personal External Credentials" : "My Uploaded Credentials"}
                </h4>

                {myCertifications.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80">
                    <LuAward className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      You haven't uploaded any professional certifications yet. Click "Submit New Certification" above to upload external industry certificates.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myCertifications.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {c.source_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.status === "Rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-blue-100 text-blue-800"
                                }`}
                            >
                              {c.status}
                            </span>
                          </div>

                          <h5 className="font-bold text-slate-900 text-sm line-clamp-1">{c.course_name}</h5>
                          <p className="text-xs text-slate-500">{c.provider_institution}</p>

                          <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                            <div>📅 Completed: <span className="font-semibold">{c.completion_date}</span></div>
                            {c.credential_id && (
                              <div>🔖 ID: <span className="font-mono text-cyan-700">{c.credential_id}</span></div>
                            )}
                            {c.review_comments && (
                              <div className="p-2 bg-slate-50 rounded-lg text-slate-600 text-[10px] italic">
                                "{c.review_comments}"
                              </div>
                            )}
                          </div>
                        </div>

                        {c.certificate_file_url && (
                          <div className="pt-2 border-t border-slate-100">
                            <a
                              href={getUploadUrl(c.certificate_file_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-700 hover:underline text-xs font-bold flex items-center gap-1.5"
                            >
                              <LuDownload className="w-3.5 h-3.5" /> View Certificate File
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: MY TRAINING (EMPLOYEE PERSONAL LEARNING DESK)         */}
        {/* ============================================================ */}
        {activeTab === "my-training" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Welcome to Your Learning Workspace, {currentUser.name || "Colleague"}!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track assigned modules, join live session meeting links, take examinations, and collect verified certificates.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">
                  {myTrainings.filter((t) => t.completion_status === "Completed").length} of {myTrainings.length} Finished
                </span>
              </div>
            </div>

            {myTrainings.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
                <LuGraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 text-base">No active trainings assigned yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When HR or your Department Manager schedules training programs for you, they will appear right here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myTrainings.map((enr) => {
                  const prog = enr.program || {};
                  const isDone = enr.completion_status === "Completed";
                  const hasAssessment = prog.assessment_required;
                  const assessmentPassed = enr.assessment_status === "Passed";

                  return (
                    <div
                      key={enr.id}
                      className="bg-white rounded-2xl p-3 pt-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                            {prog.code || "TRN"}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : enr.completion_status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                              }`}
                          >
                            {enr.completion_status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-base line-clamp-1">{prog.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prog.description}</p>
                        </div>

                        {/* Session / Meeting link banner */}
                        {prog.delivery_mode === "Online" && prog.meeting_link && (
                          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-blue-800 font-semibold truncate">
                              <LuVideo className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="truncate">Live Online Session</span>
                            </div>
                            <a
                              href={prog.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                            >
                              Join Meet
                            </a>
                          </div>
                        )}

                        {prog.delivery_mode === "Offline" && prog.venue && (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                            <LuMapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            <span className="truncate">Venue: {prog.venue}</span>
                          </div>
                        )}

                        {/* Progress checklist */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Attendance:</span>
                            <span
                              className={`font-semibold ${enr.attendance_status === "Attended"
                                ? "text-emerald-600"
                                : "text-slate-700"
                                }`}
                            >
                              {enr.attendance_status}
                            </span>
                          </div>

                          {hasAssessment && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Assessment:</span>
                              <span
                                className={`font-semibold ${assessmentPassed
                                  ? "text-emerald-600"
                                  : enr.assessment_status === "Failed"
                                    ? "text-rose-600"
                                    : "text-amber-600"
                                  }`}
                              >
                                {enr.assessment_status}
                                {enr.assessment_score !== null && ` (${enr.assessment_score}%)`}
                              </span>
                            </div>
                          )}

                          {enr.due_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Due Date:</span>
                              <span className="font-semibold text-slate-700">{enr.due_date}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        {hasAssessment && (
                          (enr.has_attended_exam || (enr.assessment_attempts_used && enr.assessment_attempts_used > 0) || enr.submission || enr.published_submission || enr.assessment_status === "Under Evaluation" || enr.assessment_status === "Passed" || enr.assessment_status === "Failed") ? (
                            enr.published_submission ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                                <LuCircleCheck className="w-4 h-4 text-emerald-600" />
                                <span>Exam Attended ({enr.published_submission.percentage || enr.published_submission.score_percentage || enr.assessment_score}%)</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1.5">
                                <LuClock className="w-4 h-4 text-amber-600" />
                                <span>Exam Attended (Pending Review)</span>
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleStartExam(prog, enr)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 shadow-2xs"
                            >
                              <LuFileText className="w-3.5 h-3.5" />
                              <span>Take Exam</span>
                            </button>
                          )
                        )}

                        {!enr.feedback_submitted && (isDone || enr.has_attended_exam || enr.attendance_status === "Attended") && (
                          <button
                            onClick={() => handleOpenFeedback(prog)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <LuStar className="w-3.5 h-3.5 fill-white text-white" /> Feedback
                          </button>
                        )}

                        {enr.feedback_submitted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            <LuCheck className="w-3.5 h-3.5 text-emerald-600" /> Feedback Sent
                          </span>
                        )}

                        {enr.certificate_issued && (
                          <button
                            onClick={() => handleViewInternalCertificate(enr, prog)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
                            title="Click to view and print official certificate"
                          >
                            <LuAward className="w-4 h-4 text-amber-300" />
                            <span>Certificate Ready</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: TRAINING REPORTS & ANALYTICS                          */}
        {/* ============================================================ */}
        {activeTab === "reports" && reportsData && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Training & Development Metrics & Compliance Reporting
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time aggregation of attendance, completion rates, examination pass percentages, and departmental distribution.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportReports}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  <LuDownload className="w-4 h-4" /> Export Excel
                </button>
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 font-bold text-sm text-slate-800">
                Departmental Participation & Completion Rate
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Participants Enrolled</th>
                      <th className="py-3 px-4">Sessions Attended</th>
                      <th className="py-3 px-4">Full Completed</th>
                      <th className="py-3 px-4">Completion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportsData.department_breakdown.map((d) => {
                      const pct = d.enrolled > 0 ? Math.round((d.completed / d.enrolled) * 100) : 0;
                      return (
                        <tr key={d.department} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold text-slate-900">{d.department}</td>
                          <td className="py-3 px-4 font-semibold">{d.enrolled}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{d.attended}</td>
                          <td className="py-3 px-4 font-semibold text-cyan-700">{d.completed}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-cyan-600 h-2 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-700">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employee Feedbacks & Course Evaluations Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <LuStar className="w-4 h-4 text-amber-500 fill-amber-500" />
                        Employee Course Evaluations & Feedback Registry ({(reportsData.feedbacks_list || []).length} submissions)
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        Average Org Rating: ⭐ {reportsData.summary?.avgFeedbackRating || 5.0} / 5
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Program</th>
                            <th className="py-3 px-4">Participant</th>
                            <th className="py-3 px-4">Content</th>
                            <th className="py-3 px-4">Trainer</th>
                            <th className="py-3 px-4">Relevance</th>
                            <th className="py-3 px-4">Overall</th>
                            <th className="py-3 px-4">Remarks & Suggestions</th>
                            <th className="py-3 px-4">Submitted Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {(!reportsData.feedbacks_list || reportsData.feedbacks_list.length === 0) ? (
                            <tr>
                              <td colSpan="8" className="py-8 text-center text-slate-400">
                                No employee feedback submitted yet.
                              </td>
                            </tr>
                          ) : (
                            reportsData.feedbacks_list.map((fb) => (
                              <tr key={fb.id} className="hover:bg-slate-50/60">
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  <div>{fb.program_title}</div>
                                  <span className="text-[10px] font-mono text-cyan-700">{fb.program_code}</span>
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-800">
                                  {fb.is_anonymous ? (
                                    <span className="italic text-slate-400">Anonymous</span>
                                  ) : (
                                    <>
                                      <div>{fb.employee_name}</div>
                                      <span className="text-[10px] text-slate-400 font-mono">{fb.employee_id}</span>
                                    </>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-bold text-amber-600">⭐ {fb.content_quality_rating}/5</td>
                                <td className="py-3 px-4 font-bold text-amber-600">⭐ {fb.trainer_effectiveness_rating}/5</td>
                                <td className="py-3 px-4 font-bold text-amber-600">⭐ {fb.relevance_to_job_rating}/5</td>
                                <td className="py-3 px-4 font-bold text-emerald-600">⭐ {fb.overall_satisfaction_rating}/5</td>
                                <td className="py-3 px-4 max-w-xs text-slate-600 italic">
                                  {fb.suggestions ? `"${fb.suggestions}"` : <span className="text-slate-400 not-italic">None</span>}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-500">
                                  {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : "—"}
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

              {/* ============================================================ */}
              {/* MODAL 1: CREATE / EDIT TRAINING PROGRAM                      */}
              {/* ============================================================ */}
              <Modal show={showProgramModal} onHide={() => setShowProgramModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-b border-slate-100">
                  <Modal.Title className="text-base font-bold text-slate-900">
                    {isEditingProgram ? "Edit Training Program" : "Create New Training Program"}
                  </Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSaveProgram}>
                  <Modal.Body className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="font-bold text-slate-700 mb-1 block">Training Title *</label>
                        <input
                          type="text"
                          required
                          value={programForm.title}
                          onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                          placeholder="e.g. POSH Compliance 2026 or React 19 Architecture"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Category</label>
                        <select
                          value={programForm.category}
                          onChange={(e) => setProgramForm({ ...programForm, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        >
                          {TRAINING_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Delivery Mode</label>
                        <select
                          value={programForm.delivery_mode}
                          onChange={(e) => setProgramForm({ ...programForm, delivery_mode: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        >
                          <option value="Offline">Offline (Classroom / Venue)</option>
                          <option value="Online">Online (Zoom / Meet Link)</option>
                          <option value="Blended">Blended (Online + Offline)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Target Department</label>
                        <input
                          type="text"
                          value={programForm.department}
                          onChange={(e) => setProgramForm({ ...programForm, department: e.target.value })}
                          placeholder="Leave empty for all company departments"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Duration (Hours)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={programForm.duration_hours}
                          onChange={(e) => setProgramForm({ ...programForm, duration_hours: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Trainer Name</label>
                        <input
                          type="text"
                          value={programForm.trainer_name}
                          onChange={(e) => setProgramForm({ ...programForm, trainer_name: e.target.value })}
                          placeholder="Trainer or Subject Matter Expert"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Trainer Email</label>
                        <input
                          type="email"
                          value={programForm.trainer_email}
                          onChange={(e) => setProgramForm({ ...programForm, trainer_email: e.target.value })}
                          placeholder="trainer@company.com"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>

                      {programForm.delivery_mode !== "Offline" && (
                        <div className="md:col-span-2">
                          <label className="font-bold text-slate-700 mb-1 block">Meeting Link (Online / Blended)</label>
                          <input
                            type="url"
                            value={programForm.meeting_link}
                            onChange={(e) => setProgramForm({ ...programForm, meeting_link: e.target.value })}
                            placeholder="https://meet.google.com/xxx or Zoom URL"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                          />
                        </div>
                      )}

                      {programForm.delivery_mode !== "Online" && (
                        <div className="md:col-span-2">
                          <label className="font-bold text-slate-700 mb-1 block">Venue & Room Details (Offline)</label>
                          <input
                            type="text"
                            value={programForm.venue}
                            onChange={(e) => setProgramForm({ ...programForm, venue: e.target.value })}
                            placeholder="e.g. Auditorium Hall 2, 4th Floor HQ"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                          />
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="font-bold text-slate-700 mb-1 block">Program Description & Objectives</label>
                        <textarea
                          rows="3"
                          value={programForm.description}
                          onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                          placeholder="Key concepts, syllabus overview, prerequisites..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>

                      {/* Company Logo Upload */}
                      <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <label className="font-bold text-slate-700 block text-xs">
                          Company Logo for Certificates (Optional)
                        </label>
                        <div className="flex items-center gap-4">
                          {programLogoPreview ? (
                            <div className="h-12 w-24 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                              <img
                                src={programLogoPreview}
                                alt="Logo Preview"
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-24 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-[10px] font-bold">
                              No Logo
                            </div>
                          )}
                          <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                            <LuUpload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Upload Logo Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setProgramLogoFile(f);
                                  setProgramLogoPreview(URL.createObjectURL(f));
                                }
                              }}
                            />
                          </label>
                          {programLogoPreview && (
                            <button
                              type="button"
                              onClick={() => {
                                setProgramLogoFile(null);
                                setProgramLogoPreview(null);
                              }}
                              className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Recommended format: Transparent PNG, SVG, or high-res JPG (Max 5MB).
                        </p>
                      </div>

                      <div className="flex items-center gap-3 md:col-span-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={programForm.is_mandatory}
                            onChange={(e) => setProgramForm({ ...programForm, is_mandatory: e.target.checked })}
                            className="rounded text-cyan-600"
                          />
                          Mandatory Training
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 ml-4">
                          <input
                            type="checkbox"
                            checked={programForm.is_onboarding_mandatory}
                            onChange={(e) => setProgramForm({ ...programForm, is_onboarding_mandatory: e.target.checked })}
                            className="rounded text-cyan-600"
                          />
                          Mandatory for New Hire Onboarding
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 ml-4">
                          <input
                            type="checkbox"
                            checked={programForm.assessment_required}
                            onChange={(e) => setProgramForm({ ...programForm, assessment_required: e.target.checked })}
                            className="rounded text-cyan-600"
                          />
                          Requires Post-Training Exam
                        </label>
                      </div>
                    </div>
                  </Modal.Body>
                  <Modal.Footer className="border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowProgramModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
                    >
                      {isEditingProgram ? "Save Changes" : "Publish Program"}
                    </button>
                  </Modal.Footer>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 2: INTERACTIVE ASSESSMENT / EXAM (STUDENT)             */}
              {/* ============================================================ */}
              <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="lg" backdrop="static" centered>
                <Modal.Header className="bg-slate-900 text-white border-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <LuFileText className="w-5 h-5 text-cyan-400" />
                      <span className="font-bold text-base">{activeExam?.title || "Examination Desk"}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-amber-400 font-mono text-sm font-bold">
                      <LuTimer className="w-4 h-4 animate-spin" />
                      <span>
                        {Math.floor(examTimeRemaining / 60)}:
                        {String(examTimeRemaining % 60).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
                  <p className="text-slate-600 italic border-b border-slate-100 pb-3">
                    {activeExam?.instructions || "Answer all questions. Multiple-choice and True/False questions are auto-graded."}
                  </p>

                  {(activeExam?.questions || []).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-start justify-between gap-3 font-bold text-slate-900">
                        <span>Q{idx + 1}. {q.question}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                          {q.marks || 10} Marks
                        </span>
                      </div>

                      {q.type === "MCQ" && (
                        <div className="space-y-2 pt-1">
                          {(q.options || []).map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${examAnswers[q.id] === opt
                                ? "bg-cyan-50 border-cyan-400 font-bold text-cyan-900"
                                : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                value={opt}
                                checked={examAnswers[q.id] === opt}
                                onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "TRUE_FALSE" && (
                        <div className="flex items-center gap-3 pt-1">
                          {["True", "False"].map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${examAnswers[q.id] === opt
                                ? "bg-cyan-50 border-cyan-400 font-bold text-cyan-900"
                                : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                value={opt}
                                checked={examAnswers[q.id] === opt}
                                onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "DESCRIPTIVE" && (
                        <textarea
                          rows="3"
                          value={examAnswers[q.id] || ""}
                          onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                          placeholder="Type your answer explanation here..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                        />
                      )}
                    </div>
                  ))}
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Answered {Object.keys(examAnswers).length} of {activeExam?.questions?.length || 0}
                  </span>
                  <button
                    onClick={handleSubmitExam}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    Submit Assessment
                  </button>
                </Modal.Footer>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 3: ATTENDANCE TRACKING & MARKING                       */}
              {/* ============================================================ */}
              <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-b border-slate-100">
                  <Modal.Title className="text-base font-bold text-slate-900">
                    Attendance Desk: {selectedProgram?.title}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-5 max-h-[70vh] overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Dept</th>
                          <th className="py-2.5 px-3">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceEnrollments.map((e) => (
                          <tr key={e.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {e.employee_name} ({e.employee_id})
                            </td>
                            <td className="py-2.5 px-3">{e.department || "General"}</td>
                            <td className="py-2.5 px-3">
                              <select
                                value={selectedAttendanceStatus[e.id] || "Pending"}
                                onChange={(ev) =>
                                  setSelectedAttendanceStatus({
                                    ...selectedAttendanceStatus,
                                    [e.id]: ev.target.value,
                                  })
                                }
                                className="px-2 py-1 rounded border border-slate-200 text-xs font-semibold"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Attended">Attended</option>
                                <option value="Absent">Absent</option>
                                <option value="Excused">Excused</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex justify-between">
                  <button
                    onClick={() => setShowAttendanceModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAttendance}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    Save Attendance
                  </button>
                </Modal.Footer>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 4: SUBMIT EXTERNAL / INTERNAL CERTIFICATION            */}
              {/* ============================================================ */}
              <Modal show={showCertSubmitModal} onHide={() => setShowCertSubmitModal(false)} size="md" centered>
                <Modal.Header closeButton className="border-b border-slate-100">
                  <Modal.Title className="text-base font-bold text-slate-900">
                    Submit Professional Certification
                  </Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSaveCertification}>
                  <Modal.Body className="p-5 space-y-3.5 text-xs sm:text-sm">
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Certification Track</label>
                      <select
                        value={certFormData.source_type}
                        onChange={(e) => setCertFormData({ ...certFormData, source_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                      >
                        <option value="EXTERNAL">External Training / Public Institution</option>
                        <option value="INTERNAL_HR">Internal HR Training</option>
                        <option value="DEPARTMENTAL">Departmental Upskilling Program</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Course / Program Title *</label>
                      <input
                        type="text"
                        required
                        value={certFormData.course_name}
                        onChange={(e) => setCertFormData({ ...certFormData, course_name: e.target.value })}
                        placeholder="e.g. AWS Solutions Architect or Data Engineering"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Provider / University / Authority *</label>
                      <input
                        type="text"
                        required
                        value={certFormData.provider_institution}
                        onChange={(e) => setCertFormData({ ...certFormData, provider_institution: e.target.value })}
                        placeholder="e.g. AWS, Microsoft, Coursera, Harvard, Internal HR"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Completion Date *</label>
                        <input
                          type="date"
                          required
                          value={certFormData.completion_date}
                          onChange={(e) => setCertFormData({ ...certFormData, completion_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Credential / Cert No</label>
                        <input
                          type="text"
                          value={certFormData.credential_id}
                          onChange={(e) => setCertFormData({ ...certFormData, credential_id: e.target.value })}
                          placeholder="e.g. CERT-98210"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Public Verification URL</label>
                      <input
                        type="url"
                        value={certFormData.verification_url}
                        onChange={(e) => setCertFormData({ ...certFormData, verification_url: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Issue Date (Optional)</label>
                        <input
                          type="date"
                          value={certFormData.issue_date}
                          onChange={(e) => setCertFormData({ ...certFormData, issue_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Expiry Date (Optional)</label>
                        <input
                          type="date"
                          value={certFormData.expiry_date}
                          onChange={(e) => setCertFormData({ ...certFormData, expiry_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Upload Certificate (PDF / Image)</label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setCertFile(e.target.files[0])}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600"
                      />
                    </div>
                  </Modal.Body>
                  <Modal.Footer className="border-t border-slate-100 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCertSubmitModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
                    >
                      Submit for HR Approval
                    </button>
                  </Modal.Footer>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 5: HR REVIEW CERTIFICATION                             */}
              {/* ============================================================ */}
              <Modal show={showCertReviewModal} onHide={() => setShowCertReviewModal(false)} size="md" centered>
                <Modal.Header closeButton className="border-b border-slate-100">
                  <Modal.Title className="text-base font-bold text-slate-900">
                    Verify Certificate: {selectedCertForReview?.employee_name}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-5 space-y-3.5 text-xs sm:text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <div><span className="font-bold">Course:</span> {selectedCertForReview?.course_name}</div>
                    <div><span className="font-bold">Provider:</span> {selectedCertForReview?.provider_institution}</div>
                    {selectedCertForReview?.verification_url && (
                      <div>
                        <span className="font-bold">URL:</span>{" "}
                        <a
                          href={selectedCertForReview.verification_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-700 underline font-semibold"
                        >
                          Open Directory
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Review Decision</label>
                    <select
                      value={certReviewData.status}
                      onChange={(e) => setCertReviewData({ ...certReviewData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-800"
                    >
                      <option value="Approved">Approve Certificate</option>
                      <option value="Changes Requested">Request Changes</option>
                      <option value="Rejected">Reject Submission</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Review Comments</label>
                    <textarea
                      rows="3"
                      value={certReviewData.review_comments}
                      onChange={(e) => setCertReviewData({ ...certReviewData, review_comments: e.target.value })}
                      placeholder="Comments or reason for decision..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex justify-between">
                  <button
                    onClick={() => setShowCertReviewModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCertReview}
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold"
                  >
                    Save Review Decision
                  </button>
                </Modal.Footer>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 6: HR ASSIGN PARTICIPANTS MODAL                        */}
              {/* ============================================================ */}
              <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} size="md" centered>
                <Modal.Header closeButton className="border-b border-slate-100">
                  <Modal.Title className="text-base font-bold text-slate-900">
                    Assign Training: {selectedProgram?.title}
                  </Modal.Title>
                </Modal.Header>
                <form onSubmit={handleExecuteAssignment}>
                  <Modal.Body className="p-5 space-y-3.5 text-xs sm:text-sm">
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Assignment Scope</label>
                      <select
                        value={assignForm.assign_type}
                        onChange={(e) => setAssignForm({ ...assignForm, assign_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800"
                      >
                        <option value="DEPARTMENT">Specific Department</option>
                        <option value="SPECIFIC">Individual Employee IDs</option>
                        <option value="ALL">All Eligible Active Staff</option>
                      </select>
                    </div>

                    {assignForm.assign_type === "DEPARTMENT" && (
                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Department Name</label>
                        <input
                          type="text"
                          value={assignForm.department}
                          onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                        />
                      </div>
                    )}

                    {assignForm.assign_type === "SPECIFIC" && (
                      <div>
                        <label className="font-bold text-slate-700 mb-1 block">Employee IDs (Comma separated)</label>
                        <input
                          type="text"
                          value={assignForm.employee_ids}
                          onChange={(e) => setAssignForm({ ...assignForm, employee_ids: e.target.value })}
                          placeholder="e.g. EMP-RM-66, HR-PM-02"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Completion Due Date</label>
                      <input
                        type="date"
                        value={assignForm.due_date}
                        onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>
                  </Modal.Body>
                  <Modal.Footer className="border-t border-slate-100 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
                    >
                      Confirm Assignment
                    </button>
                  </Modal.Footer>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 7: STUDENT FEEDBACK FORM MODAL                         */}
              {/* ============================================================ */}
              <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} size="md" centered>
                <Modal.Header closeButton className="border-b border-slate-100">
                  <Modal.Title className="text-base font-bold text-slate-900">
                    Submit Training Feedback: {feedbackTargetProgram?.title}
                  </Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSaveFeedback}>
                  <Modal.Body className="p-5 space-y-4 text-xs sm:text-sm">
                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Training Content Quality (1 to 5 Stars)</label>
                      <select
                        value={feedbackForm.content_quality_rating}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, content_quality_rating: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      >
                        <option value="5">★★★★★ 5 - Outstanding</option>
                        <option value="4">★★★★☆ 4 - Good</option>
                        <option value="3">★★★☆☆ 3 - Average</option>
                        <option value="2">★★☆☆☆ 2 - Needs Improvement</option>
                        <option value="1">★☆☆☆☆ 1 - Poor</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Trainer Effectiveness (1 to 5 Stars)</label>
                      <select
                        value={feedbackForm.trainer_effectiveness_rating}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, trainer_effectiveness_rating: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      >
                        <option value="5">★★★★★ 5 - Very Effective & Engaging</option>
                        <option value="4">★★★★☆ 4 - Well Presented</option>
                        <option value="3">★★★☆☆ 3 - Satisfactory</option>
                        <option value="2">★★☆☆☆ 2 - Average</option>
                        <option value="1">★☆☆☆☆ 1 - Unclear</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Relevance to Your Job Role (1 to 5 Stars)</label>
                      <select
                        value={feedbackForm.relevance_to_job_rating}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, relevance_to_job_rating: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      >
                        <option value="5">★★★★★ 5 - Directly Applicable</option>
                        <option value="4">★★★★☆ 4 - Highly Relevant</option>
                        <option value="3">★★★☆☆ 3 - Moderately Relevant</option>
                        <option value="2">★★☆☆☆ 2 - Low Relevance</option>
                        <option value="1">★☆☆☆☆ 1 - Not Applicable</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 mb-1 block">Suggestions & Comments</label>
                      <textarea
                        rows="3"
                        value={feedbackForm.suggestions}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, suggestions: e.target.value })}
                        placeholder="Share what went well and what could be improved..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                      />
                    </div>
                  </Modal.Body>
                  <Modal.Footer className="border-t border-slate-100 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
                    >
                      Submit Feedback
                    </button>
                  </Modal.Footer>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 8: PROGRAM DETAILS MODAL                               */}
              {/* ============================================================ */}
              <Modal
                show={showProgramDetailsModal}
                onHide={() => setShowProgramDetailsModal(false)}
                size="xl"
                centered
              >
                {selectedProgram && (
                  <>
                    <Modal.Header closeButton className="border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100">
                            {selectedProgram.code}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedProgram.type === "HR"
                              ? "bg-cyan-100 text-cyan-800"
                              : "bg-purple-100 text-purple-800"
                              }`}
                          >
                            {selectedProgram.type === "HR"
                              ? "Central HR Training"
                              : `Departmental • ${selectedProgram.department || "General"}`}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {selectedProgram.delivery_mode}
                          </span>
                        </div>
                        <Modal.Title className="text-lg font-black text-slate-900">
                          {selectedProgram.title}
                        </Modal.Title>
                      </div>
                    </Modal.Header>

                    {/* Modal Sub-Tabs */}
                    <div className="flex items-center gap-1 border-b border-slate-200 px-6 pt-2 bg-slate-50/70">
                      <button
                        type="button"
                        onClick={() => setProgramDetailsTab("overview")}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                          programDetailsTab === "overview"
                            ? "border-cyan-600 text-cyan-700 font-extrabold"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <LuBookOpen className="w-3.5 h-3.5" /> Program Overview
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgramDetailsTab("enrollments")}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                          programDetailsTab === "enrollments"
                            ? "border-cyan-600 text-cyan-700 font-extrabold"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <LuUsers className="w-3.5 h-3.5" /> Participants &amp; Certificates
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
                          {programEnrollmentsList?.length || 0}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgramDetailsTab("feedback")}
                        className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                          programDetailsTab === "feedback"
                            ? "border-amber-500 text-amber-700 font-extrabold"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <LuStar className="w-3.5 h-3.5 text-amber-500" /> Employee Feedbacks
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                          {programDetailsFeedback?.reviews?.length || programDetailsFeedback?.total_feedbacks || 0}
                        </span>
                      </button>
                    </div>

                    <Modal.Body className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                      {programDetailsTab === "overview" && (
                        <div className="space-y-5">
                          {/* Description */}
                          {selectedProgram.description && (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Overview &amp; Description
                              </h4>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {selectedProgram.description}
                              </p>
                            </div>
                          )}

                          {/* Objectives */}
                          {selectedProgram.objectives && (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Learning Objectives
                              </h4>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {selectedProgram.objectives}
                              </p>
                            </div>
                          )}

                          {/* Program Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium">Category</div>
                              <div className="font-bold text-slate-800">{selectedProgram.category}</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium">Duration</div>
                              <div className="font-bold text-slate-800">{selectedProgram.duration_hours} hrs</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium">Enrolled</div>
                              <div className="font-bold text-slate-800">
                                {selectedProgram.enrolled_count || 0} / {selectedProgram.capacity || 50}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-400 font-medium">Status</div>
                              <div className="font-bold text-emerald-600">{selectedProgram.status}</div>
                            </div>
                          </div>

                          {/* Trainer & Access */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                <LuUsers className="w-4 h-4 text-cyan-600" /> Trainer Information
                              </h4>
                              <div className="font-bold text-slate-900">
                                {selectedProgram.trainer_name || "Internal Staff Trainer"}
                              </div>
                              {selectedProgram.trainer_email && (
                                <div className="text-xs text-slate-500">{selectedProgram.trainer_email}</div>
                              )}
                              {selectedProgram.trainer_bio && (
                                <div className="text-xs text-slate-600 mt-1">{selectedProgram.trainer_bio}</div>
                              )}
                            </div>

                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                <LuMapPin className="w-4 h-4 text-purple-600" /> Venue &amp; Access
                              </h4>
                              {selectedProgram.delivery_mode === "Online" ? (
                                <div>
                                  <div className="text-xs text-slate-500 font-medium">Virtual Classroom Link:</div>
                                  {selectedProgram.meeting_link ? (
                                    <a
                                      href={selectedProgram.meeting_link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-cyan-600 hover:underline font-semibold break-all"
                                    >
                                      {selectedProgram.meeting_link}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400">Meeting link will be shared prior to session</span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className="text-xs text-slate-500 font-medium">Location / Venue:</div>
                                  <div className="font-semibold text-slate-800">
                                    {selectedProgram.venue || "HQ Main Training Hall, 2nd Floor"}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Batches / Sessions */}
                          {Array.isArray(selectedProgram.sessions) && selectedProgram.sessions.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                <LuCalendar className="w-4 h-4 text-indigo-600" /> Scheduled Batches &amp; Sessions
                              </h4>
                              <div className="space-y-2">
                                {selectedProgram.sessions.map((s, idx) => (
                                  <div
                                    key={s.id || idx}
                                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800">{s.batch_name}</span>
                                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                                        <span>📅 {s.session_date}</span>
                                        <span>⏰ {s.start_time} - {s.end_time}</span>
                                      </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                                      {s.status || "Scheduled"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {programDetailsTab === "enrollments" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <LuUsers className="w-4 h-4 text-cyan-600" /> Enrolled Participants ({programEnrollmentsList.length})
                            </h4>
                            {(isHR || isHOD) && (
                              <button
                                onClick={() => {
                                  setShowProgramDetailsModal(false);
                                  handleOpenAssignModal(selectedProgram);
                                }}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <LuPlus className="w-3.5 h-3.5" /> Assign More
                              </button>
                            )}
                          </div>

                          {loadingDetailsExtra ? (
                            <div className="p-8 text-center text-slate-500 font-medium">
                              <LuRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-600" />
                              Loading participants...
                            </div>
                          ) : programEnrollmentsList.length === 0 ? (
                            <div className="p-8 text-center border border-slate-200 rounded-2xl bg-slate-50/50">
                              <LuUsers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-600 font-semibold text-xs">No participants assigned yet.</p>
                              <p className="text-slate-400 text-[11px] mt-1">
                                Click "+ Assign More" above or in the footer to enroll employees into this training.
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3">Participant</th>
                                    <th className="py-2.5 px-3">Department</th>
                                    <th className="py-2.5 px-3">Attendance</th>
                                    <th className="py-2.5 px-3">Exam Result</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3 text-right">Certificate</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {programEnrollmentsList.map((enr) => {
                                    const isDone = enr.completion_status === "Completed" || enr.certificate_issued;
                                    return (
                                      <tr key={enr.id} className="hover:bg-slate-50/60">
                                        <td className="py-2.5 px-3 font-bold text-slate-900">
                                          {enr.employee_name || "Employee"}
                                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                                            {enr.employee_id}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600">
                                          {enr.department || "General"}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              enr.attendance_status === "Attended"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : enr.attendance_status === "Absent"
                                                ? "bg-rose-100 text-rose-800"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {enr.attendance_status || "Pending"}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {enr.assessment_score != null ? (
                                            <span className="font-bold text-slate-800 font-mono">
                                              {enr.assessment_score}%
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 text-[11px]">—</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              isDone
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-blue-100 text-blue-800"
                                            }`}
                                          >
                                            {enr.completion_status || "Enrolled"}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          {isDone ? (
                                            <button
                                              onClick={() => handleViewInternalCertificate(enr, selectedProgram)}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs inline-flex items-center gap-1 transition-all"
                                              title="View Printable Certificate"
                                            >
                                              <LuAward className="w-3.5 h-3.5 text-emerald-600" /> View Cert
                                            </button>
                                          ) : (
                                            <span className="text-[11px] text-slate-400 italic">Not issued</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {programDetailsTab === "feedback" && (
                        <div className="space-y-4">
                          {loadingDetailsExtra ? (
                            <div className="p-8 text-center text-slate-500 font-medium">
                              <LuRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                              Loading participant feedback...
                            </div>
                          ) : (
                            <>
                              {/* Metric Cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                                <div>
                                  <div className="text-[11px] text-amber-800 font-semibold">Content Quality</div>
                                  <div className="text-lg font-black text-amber-600 flex items-center gap-1 mt-0.5">
                                    ⭐ {programDetailsFeedback?.summary?.avg_content_quality ?? programDetailsFeedback?.avg_content_quality ?? "—"}/5
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-amber-800 font-semibold">Trainer Effectiveness</div>
                                  <div className="text-lg font-black text-amber-600 flex items-center gap-1 mt-0.5">
                                    ⭐ {programDetailsFeedback?.summary?.avg_trainer_effectiveness ?? programDetailsFeedback?.avg_trainer_effectiveness ?? "—"}/5
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-amber-800 font-semibold">Job Relevance</div>
                                  <div className="text-lg font-black text-amber-600 flex items-center gap-1 mt-0.5">
                                    ⭐ {programDetailsFeedback?.summary?.avg_job_relevance ?? programDetailsFeedback?.avg_relevance ?? "—"}/5
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-amber-800 font-semibold">Overall Satisfaction</div>
                                  <div className="text-lg font-black text-amber-600 flex items-center gap-1 mt-0.5">
                                    ⭐ {programDetailsFeedback?.summary?.avg_overall_satisfaction ?? programDetailsFeedback?.avg_satisfaction ?? "—"}/5
                                  </div>
                                </div>
                              </div>

                              {/* Reviews List */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <LuStar className="w-4 h-4 text-amber-500" /> Detailed Participant Reviews ({programDetailsFeedback?.reviews?.length || 0})
                                  </h4>
                                </div>

                                {(!programDetailsFeedback?.reviews || programDetailsFeedback.reviews.length === 0) ? (
                                  <div className="p-8 text-center border border-slate-200 rounded-2xl bg-slate-50/50">
                                    <LuStar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-600 font-semibold text-xs">No feedback submitted yet for this program.</p>
                                    <p className="text-slate-400 text-[11px] mt-1">
                                      Once employees finish the training or examination and submit their feedback, responses will appear here in real time.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {programDetailsFeedback.reviews.map((rev, idx) => (
                                      <div key={rev.id || idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                                              {rev.is_anonymous ? "?" : (rev.employee_name || "E")[0].toUpperCase()}
                                            </div>
                                            <div>
                                              <div className="font-bold text-slate-900 text-xs">
                                                {rev.is_anonymous ? "Anonymous Participant" : rev.employee_name}
                                                {!rev.is_anonymous && rev.department && (
                                                  <span className="text-slate-400 font-normal ml-1">({rev.department})</span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-slate-400">
                                                {rev.created_at || rev.createdAt ? new Date(rev.created_at || rev.createdAt).toLocaleString() : ""}
                                              </div>
                                            </div>
                                          </div>
                                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                                            ⭐ {rev.overall_satisfaction_rating} / 5
                                          </span>
                                        </div>

                                        {/* Rating Pills */}
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                            Content: <strong>⭐ {rev.content_quality_rating}</strong>
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                            Trainer: <strong>⭐ {rev.trainer_effectiveness_rating}</strong>
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                            Relevance: <strong>⭐ {rev.relevance_to_job_rating}</strong>
                                          </span>
                                        </div>

                                        {/* Suggestions text */}
                                        {rev.suggestions ? (
                                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                            "{rev.suggestions}"
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-slate-400 italic">No additional suggestions provided.</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </Modal.Body>
                    <Modal.Footer className="border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(isHR || isHOD) && (
                          <>
                            <button
                              onClick={() => {
                                setShowProgramDetailsModal(false);
                                handleOpenAssignModal(selectedProgram);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-colors"
                            >
                              + Assign Participants
                            </button>
                            <button
                              onClick={() => {
                                setShowProgramDetailsModal(false);
                                handleOpenAssessmentBuilder(selectedProgram);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-colors"
                            >
                              Manage Exam
                            </button>
                            <button
                              onClick={() => {
                                setShowProgramDetailsModal(false);
                                handleOpenSubmissions(selectedProgram);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors"
                            >
                              Scores & Publish
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => setShowProgramDetailsModal(false)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </Modal.Footer>
                  </>
                )}
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 9: ASSESSMENT BUILDER MODAL (HR / HOD)                 */}
              {/* ============================================================ */}
              <Modal
                show={showAssessmentBuilderModal}
                onHide={() => setShowAssessmentBuilderModal(false)}
                size="xl"
                centered
              >
                <Modal.Header closeButton className="border-b border-slate-100">
                  <div>
                    <Modal.Title className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <LuFileText className="w-5 h-5 text-blue-600" />
                      <span>Manage Examination / Assessment — {selectedProgram?.title}</span>
                    </Modal.Title>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure MCQ, True/False, and Descriptive questions. Single attempt policy strictly enforced.
                    </p>
                  </div>
                </Modal.Header>
                <Modal.Body className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                  {/* Single Attempt Policy Banner */}
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                    <LuCircleCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="text-xs text-blue-800 font-medium">
                      <strong className="font-bold">Strict Exam Policy:</strong> Employees are allowed exactly{" "}
                      <strong className="underline">ONE attempt</strong>. After attending and submitting, employees cannot
                      retake the examination.
                    </div>
                  </div>

                  {/* Assessment Meta Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <div className="md:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Exam Title</label>
                      <input
                        type="text"
                        value={assessmentFormData.title}
                        onChange={(e) =>
                          setAssessmentFormData({ ...assessmentFormData, title: e.target.value })
                        }
                        placeholder="e.g., Post-Training Certification Exam"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={assessmentFormData.duration_minutes}
                        onChange={(e) =>
                          setAssessmentFormData({
                            ...assessmentFormData,
                            duration_minutes: parseInt(e.target.value, 10) || 30,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Pass Score (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={assessmentFormData.pass_percentage}
                        onChange={(e) =>
                          setAssessmentFormData({
                            ...assessmentFormData,
                            pass_percentage: parseInt(e.target.value, 10) || 60,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="font-bold text-slate-700 block mb-1">Exam Instructions</label>
                      <textarea
                        rows="2"
                        value={assessmentFormData.instructions}
                        onChange={(e) =>
                          setAssessmentFormData({ ...assessmentFormData, instructions: e.target.value })
                        }
                        placeholder="Instructions for participants before starting..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  {/* Questions Header & Quick Add Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <span>Assessment Questions</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                        {assessmentFormData.questions?.length || 0} Questions • Total {assessmentFormData.total_marks || 0} Marks
                      </span>
                    </h4>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddAssessmentQuestion("MCQ")}
                        className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> + MCQ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddAssessmentQuestion("TRUE_FALSE")}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> + True / False
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddAssessmentQuestion("DESCRIPTIVE")}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> + Descriptive
                      </button>
                    </div>
                  </div>

                  {/* Questions List */}
                  {(!assessmentFormData.questions || assessmentFormData.questions.length === 0) ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <LuFileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 font-medium text-xs">
                        No questions created yet. Click "+ MCQ", "+ True / False", or "+ Descriptive" above to add questions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assessmentFormData.questions.map((q, qIndex) => (
                        <div
                          key={q.id || qIndex}
                          className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                                {qIndex + 1}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${q.type === "MCQ"
                                  ? "bg-cyan-100 text-cyan-800"
                                  : q.type === "TRUE_FALSE"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-amber-100 text-amber-800"
                                  }`}
                              >
                                {q.type}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-400 font-medium">Marks:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={q.marks || 10}
                                  onChange={(e) =>
                                    handleUpdateAssessmentQuestion(
                                      qIndex,
                                      "marks",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-center font-bold text-slate-800"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteAssessmentQuestion(qIndex)}
                                title="Delete Question"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Question Prompt
                            </label>
                            <textarea
                              rows="2"
                              value={q.question}
                              onChange={(e) =>
                                handleUpdateAssessmentQuestion(qIndex, "question", e.target.value)
                              }
                              placeholder="Type question text..."
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-slate-50/50 focus:bg-white"
                            />
                          </div>

                          {/* MCQ Options */}
                          {q.type === "MCQ" && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Choices & Correct Answer
                              </label>
                              {(q.options || []).map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct_${q.id || qIndex}`}
                                    checked={q.correct_answer === opt}
                                    onChange={() =>
                                      handleUpdateAssessmentQuestion(qIndex, "correct_answer", opt)
                                    }
                                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      handleUpdateOption(qIndex, optIndex, e.target.value)
                                    }
                                    placeholder={`Option ${optIndex + 1}`}
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleAddOptionToMCQ(qIndex)}
                                className="text-xs text-cyan-700 font-bold hover:underline flex items-center gap-1 mt-1"
                              >
                                <LuPlus className="w-3.5 h-3.5" /> Add Another Option
                              </button>
                            </div>
                          )}

                          {/* True / False Options */}
                          {q.type === "TRUE_FALSE" && (
                            <div className="pt-2 border-t border-slate-100">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Select Correct Answer
                              </label>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                                  <input
                                    type="radio"
                                    name={`tf_${q.id || qIndex}`}
                                    checked={q.correct_answer === "True"}
                                    onChange={() =>
                                      handleUpdateAssessmentQuestion(qIndex, "correct_answer", "True")
                                    }
                                    className="w-4 h-4 text-purple-600"
                                  />
                                  <span>True</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                                  <input
                                    type="radio"
                                    name={`tf_${q.id || qIndex}`}
                                    checked={q.correct_answer === "False"}
                                    onChange={() =>
                                      handleUpdateAssessmentQuestion(qIndex, "correct_answer", "False")
                                    }
                                    className="w-4 h-4 text-purple-600"
                                  />
                                  <span>False</span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Descriptive Helper */}
                          {q.type === "DESCRIPTIVE" && (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
                              💡 <strong>Descriptive Free-Response Question:</strong> Participants will type a
                              detailed answer. Evaluators award marks manually in the "Scores & Publish" view.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentBuilderModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssessment}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
                  >
                    <LuCircleCheck className="w-4 h-4" /> Save Assessment Configuration
                  </button>
                </Modal.Footer>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 10: PARTICIPANT SUBMISSIONS & PUBLISHING MODAL (HR)    */}
              {/* ============================================================ */}
              <Modal
                show={showSubmissionsModal}
                onHide={() => {
                  setShowSubmissionsModal(false);
                  setGradingSubmission(null);
                }}
                size="xl"
                centered
              >
                <Modal.Header closeButton className="border-b border-slate-100">
                  <div>
                    <Modal.Title className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <LuSend className="w-5 h-5 text-purple-600" />
                      <span>Participant Exam Submissions & Score Publishing — {selectedProgram?.title}</span>
                    </Modal.Title>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review objective & descriptive scores, grade manual answers, and release verified examination results.
                    </p>
                  </div>
                </Modal.Header>
                <Modal.Body className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                  {/* If currently evaluating a specific submission */}
                  {gradingSubmission ? (
                    <div className="space-y-5">
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                            Evaluating Participant Submission
                          </span>
                          <h4 className="text-base font-black text-purple-900">
                            {gradingSubmission.employee_name} ({gradingSubmission.employee_id})
                          </h4>
                        </div>
                        <button
                          onClick={() => setGradingSubmission(null)}
                          className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-white text-purple-800 text-xs font-bold hover:bg-purple-100"
                        >
                          ← Back to Submissions
                        </button>
                      </div>

                      {/* Answers Breakdown */}
                      <div className="space-y-4">
                        {(gradingSubmission.answers || []).map((ans, aIdx) => (
                          <div
                            key={ans.question_id || aIdx}
                            className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">
                                Q{aIdx + 1}: {ans.question}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${ans.type === "DESCRIPTIVE"
                                  ? "bg-amber-100 text-amber-800"
                                  : ans.is_correct
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                  }`}
                              >
                                {ans.type === "DESCRIPTIVE"
                                  ? "Manual Grading"
                                  : ans.is_correct
                                    ? `Correct (+${ans.marks_awarded} marks)`
                                    : "Incorrect (0 marks)"}
                              </span>
                            </div>

                            {/* Student Response */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="text-[11px] text-slate-400 font-medium">Participant's Answer:</div>
                              <div className="font-semibold text-slate-800 mt-0.5">
                                {ans.employee_answer || "(No answer submitted)"}
                              </div>
                            </div>

                            {/* Manual Grading inputs for Descriptive */}
                            {ans.type === "DESCRIPTIVE" && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Award Marks (Max: {ans.max_marks || 10})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={ans.max_marks || 10}
                                    value={gradingMarks[ans.question_id] ?? ""}
                                    onChange={(e) =>
                                      setGradingMarks({
                                        ...gradingMarks,
                                        [ans.question_id]: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-800"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Feedback / Remarks
                                  </label>
                                  <input
                                    type="text"
                                    value={gradingFeedback[ans.question_id] || ""}
                                    onChange={(e) =>
                                      setGradingFeedback({
                                        ...gradingFeedback,
                                        [ans.question_id]: e.target.value,
                                      })
                                    }
                                    placeholder="Remarks for the participant..."
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Submissions Table & Publishing Controls */
                    <div className="space-y-4">
                      {/* Metric Summary row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div>
                          <div className="text-[11px] text-slate-400 font-medium">Total Submissions</div>
                          <div className="text-xl font-black text-slate-800">{programSubmissions.length}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400 font-medium">Passed</div>
                          <div className="text-xl font-black text-emerald-600">
                            {programSubmissions.filter((s) => s.pass_status === "Passed").length}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400 font-medium">Under Review</div>
                          <div className="text-xl font-black text-amber-600">
                            {programSubmissions.filter((s) => s.pass_status === "Pending Evaluation").length}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400 font-medium">Results Published</div>
                          <div className="text-xl font-black text-purple-600">
                            {programSubmissions.filter((s) => s.is_published).length}
                          </div>
                        </div>
                      </div>

                      {/* Certificate Customization & Company Logo Setup Before Publishing */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-amber-50/40 border border-purple-200/80 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                                <LuBuilding2 className="w-4 h-4" />
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">
                                Certificate Customization &amp; Corporate Branding
                              </h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 ml-8">
                              Upload your organization's official logo before publishing. It will be embossed atop the verified certificates issued to employees upon release.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handlePreviewCertificateBeforePublishing}
                            className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 self-start sm:self-center flex-shrink-0 cursor-pointer"
                            title="Preview how the certificate will appear to employees"
                          >
                            <LuEye className="w-3.5 h-3.5 text-amber-600" />
                            <span>Preview Certificate</span>
                          </button>
                        </div>

                        {/* Logo Upload & Preview Area */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                          <div className="flex items-center gap-3">
                            <div className="w-28 h-14 bg-white rounded-xl border border-slate-200 shadow-2xs p-1.5 flex items-center justify-center overflow-hidden">
                              {publishingLogoPreview || selectedProgram?.company_logo_url ? (
                                <img
                                  src={publishingLogoPreview || getUploadUrl(selectedProgram?.company_logo_url)}
                                  alt="Company Logo Preview"
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="text-center">
                                  <LuGraduationCap className="w-5 h-5 text-slate-400 mx-auto" />
                                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Default Crest</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white border border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5">
                                  <LuUpload className="w-3.5 h-3.5 text-purple-600" />
                                  <span>{publishingLogoPreview || selectedProgram?.company_logo_url ? "Change Logo" : "Upload Company Logo"}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePublishingLogoChange}
                                  />
                                </label>

                                {publishingLogoFile && (
                                  <button
                                    type="button"
                                    disabled={isUploadingLogo}
                                    onClick={handleUploadCompanyLogo}
                                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                  >
                                    <LuCheck className="w-3.5 h-3.5" />
                                    <span>{isUploadingLogo ? "Saving..." : "Save Logo"}</span>
                                  </button>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block">
                                {publishingLogoFile
                                  ? `Selected: ${publishingLogoFile.name} (${(publishingLogoFile.size / 1024).toFixed(0)} KB)`
                                  : selectedProgram?.company_logo_url
                                  ? "Active company logo loaded for this program."
                                  : "No custom logo uploaded yet. High-res PNG or SVG recommended (max 5MB)."}
                              </span>
                            </div>
                          </div>

                          {/* Publish Trigger Button */}
                          <button
                            type="button"
                            onClick={() => handlePublishResults(selectedProgram?.id)}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                          >
                            <LuSend className="w-4 h-4" />
                            <span>Publish &amp; Release to Employees</span>
                          </button>
                        </div>
                      </div>

                      {/* Submissions Table */}
                      {programSubmissions.length === 0 ? (
                        <div className="p-8 text-center border border-slate-200 rounded-2xl">
                          <LuFileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 font-medium text-xs">
                            No examination submissions recorded for this program yet.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-3 px-4">Employee</th>
                                <th className="py-3 px-4">Submitted At</th>
                                <th className="py-3 px-4">Score</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Release</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {programSubmissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50/60">
                                  <td className="py-3 px-4 font-bold text-slate-900">
                                    {sub.employee_name}
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {sub.employee_id}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-600">
                                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                                  </td>
                                  <td className="py-3 px-4 font-black text-slate-800">
                                    {sub.percentage ?? sub.score_percentage ?? "—"}%
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.pass_status === "Passed"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : sub.pass_status === "Failed"
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-amber-100 text-amber-800"
                                        }`}
                                    >
                                      {sub.pass_status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.is_published
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                      {sub.is_published ? "Released" : "Pending Release"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {sub.pass_status === "Passed" && (
                                        <button
                                          onClick={() => handleViewInternalCertificate(sub, selectedProgram)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs inline-flex items-center gap-1 transition-all"
                                          title="View Printable Certificate"
                                        >
                                          <LuAward className="w-3.5 h-3.5 text-emerald-600" /> Certificate
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setGradingSubmission(sub);
                                          const marks = {};
                                          const fb = {};
                                          (sub.answers || []).forEach((a) => {
                                            marks[a.question_id] =
                                              a.marks_awarded !== undefined ? a.marks_awarded : "";
                                            fb[a.question_id] = a.evaluator_feedback || "";
                                          });
                                          setGradingMarks(marks);
                                          setGradingFeedback(fb);
                                        }}
                                        className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs"
                                      >
                                        {sub.requires_manual_grading ? "Grade Answers" : "View Answers"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex items-center justify-between">
                  {gradingSubmission ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setGradingSubmission(null)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50"
                      >
                        Back to Submissions
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveGrading}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <LuCircleCheck className="w-4 h-4" /> Save Evaluation & Update Score
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSubmissionsModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50 ml-auto"
                    >
                      Close
                    </button>
                  )}
                </Modal.Footer>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 11: FEEDBACK SUMMARY MODAL (HR)                        */}
              {/* ============================================================ */}
              <Modal
                show={showFeedbackSummaryModal}
                onHide={() => setShowFeedbackSummaryModal(false)}
                size="lg"
                centered
              >
                <Modal.Header closeButton className="border-b border-slate-100">
                  <div>
                    <Modal.Title className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <LuStar className="w-5 h-5 text-amber-500" />
                      <span>Employee Feedback Summary — {selectedProgram?.title}</span>
                    </Modal.Title>
                    {selectedProgram?.code && (
                      <span className="font-mono text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100 inline-block mt-1">
                        {selectedProgram.code}
                      </span>
                    )}
                  </div>
                </Modal.Header>
                <Modal.Body className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                  {feedbackSummaryData ? (
                    <div className="space-y-4">
                      {/* Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                        <div>
                          <div className="text-[11px] text-amber-800 font-semibold">Content Quality</div>
                          <div className="text-lg font-black text-amber-600 mt-0.5">
                            ⭐ {feedbackSummaryData.summary?.avg_content_quality ?? feedbackSummaryData.avg_content_quality ?? "—"}/5
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-amber-800 font-semibold">Trainer Effectiveness</div>
                          <div className="text-lg font-black text-amber-600 mt-0.5">
                            ⭐ {feedbackSummaryData.summary?.avg_trainer_effectiveness ?? feedbackSummaryData.avg_trainer_effectiveness ?? "—"}/5
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-amber-800 font-semibold">Job Relevance</div>
                          <div className="text-lg font-black text-amber-600 mt-0.5">
                            ⭐ {feedbackSummaryData.summary?.avg_job_relevance ?? feedbackSummaryData.avg_relevance ?? "—"}/5
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-amber-800 font-semibold">Overall Satisfaction</div>
                          <div className="text-lg font-black text-amber-600 mt-0.5">
                            ⭐ {feedbackSummaryData.summary?.avg_overall_satisfaction ?? feedbackSummaryData.avg_satisfaction ?? "—"}/5
                          </div>
                        </div>
                      </div>

                      {/* Participant Reviews List */}
                      <div>
                        {(() => {
                          const reviewsList = feedbackSummaryData.reviews || feedbackSummaryData.feedbacks || [];
                          return (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <LuStar className="w-4 h-4 text-amber-500" /> Participant Reviews &amp; Suggestions ({reviewsList.length})
                                </h4>
                              </div>

                              {reviewsList.length === 0 ? (
                                <div className="p-8 text-center border border-slate-200 rounded-2xl bg-slate-50/50">
                                  <LuStar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                  <p className="text-slate-600 font-semibold text-xs">No detailed feedback comments submitted yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {reviewsList.map((fb, idx) => (
                                    <div key={fb.id || idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                                            {fb.is_anonymous ? "?" : (fb.employee_name || "E")[0].toUpperCase()}
                                          </div>
                                          <div>
                                            <div className="font-bold text-slate-900 text-xs">
                                              {fb.is_anonymous ? "Anonymous Participant" : fb.employee_name}
                                              {!fb.is_anonymous && fb.department && (
                                                <span className="text-slate-400 font-normal ml-1">({fb.department})</span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                              {fb.created_at || fb.createdAt ? new Date(fb.created_at || fb.createdAt).toLocaleString() : ""}
                                            </div>
                                          </div>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                                          ⭐ {fb.overall_satisfaction_rating} / 5
                                        </span>
                                      </div>

                                      {/* Rating Breakdown */}
                                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                          Content: <strong>⭐ {fb.content_quality_rating}</strong>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                          Trainer: <strong>⭐ {fb.trainer_effectiveness_rating}</strong>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                          Relevance: <strong>⭐ {fb.relevance_to_job_rating}</strong>
                                        </span>
                                      </div>

                                      {/* Remarks / Suggestions */}
                                      {fb.suggestions ? (
                                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                          "{fb.suggestions}"
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 italic">No additional suggestions provided.</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-6">No feedback submitted yet.</p>
                  )}
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setShowFeedbackSummaryModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Close
                  </button>
                </Modal.Footer>
              </Modal>

              {/* ============================================================ */}
              {/* MODAL 12: PRINTABLE OFFICIAL CERTIFICATE VIEWER MODAL        */}
              {/* ============================================================ */}
              <Modal
                show={showCertViewerModal}
                onHide={() => setShowCertViewerModal(false)}
                size="xl"
                centered
                className="certificate-modal-wrapper"
              >
                <Modal.Header closeButton className="border-b border-slate-100 bg-slate-50/80">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <LuAward className="w-5 h-5 text-amber-500" />
                      <Modal.Title className="text-base font-bold text-slate-900">
                        Official Certificate of Training Completion
                      </Modal.Title>
                    </div>
                    {/* <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <LuPrinter className="w-4 h-4" /> Print / Save as PDF
                    </button> */}
                  </div>
                </Modal.Header>
                <Modal.Body className="p-4 sm:p-8 bg-slate-100/60 overflow-y-auto max-h-[80vh] flex justify-center">
                  {activeCert ? (
                    <div
                      id="certificate-print-area"
                      className="w-full max-w-4xl bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-2xl border-8 border-slate-800 relative overflow-hidden select-none"
                      style={{
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                      }}
                    >
                      {/* Decorative Inner Border */}
                      <div className="border-2 border-amber-400 p-6 sm:p-10 rounded-lg relative flex flex-col justify-between min-h-[520px]">
                        {/* Decorative Corner Accents */}
                        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500" />
                        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-500" />
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-500" />
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500" />

                        {/* Header / Academy Title */}
                        <div className="text-center space-y-1">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            {activeCert.company_logo_url ? (
                              <img
                                src={
                                  activeCert.company_logo_url.startsWith("blob:") ||
                                  activeCert.company_logo_url.startsWith("data:") ||
                                  activeCert.company_logo_url.startsWith("http")
                                    ? activeCert.company_logo_url
                                    : getUploadUrl(activeCert.company_logo_url)
                                }
                                alt="Company Logo"
                                className="h-14 sm:h-16 max-w-[240px] object-contain mx-auto mb-1"
                              />
                            ) : (
                              <LuGraduationCap className="w-8 h-8 text-amber-600" />
                            )}
                          </div>
                          <div className="text-xs uppercase tracking-[0.3em] font-extrabold text-slate-500">
                            Enterprise Learning &amp; Talent Development Academy
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wider text-slate-900 uppercase">
                            Certificate of Completion
                          </h2>
                          <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-2" />
                          <p className="text-xs sm:text-sm text-slate-500 italic">
                            This is officially presented to
                          </p>
                        </div>

                        {/* Recipient Details */}
                        <div className="text-center my-4 space-y-1">
                          <h1 className="text-2xl sm:text-4xl font-serif font-black text-slate-900 tracking-wide">
                            {activeCert.employee_name || "Employee"}
                          </h1>
                          <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
                            <span>Employee ID: <strong className="font-mono text-slate-700">{activeCert.employee_id}</strong></span>
                            <span>•</span>
                            <span>Department: <strong className="text-slate-700">{activeCert.department || "General"}</strong></span>
                          </div>
                        </div>

                        {/* Achievement Text */}
                        <div className="text-center max-w-2xl mx-auto space-y-2">
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            for successfully fulfilling all coursework, assessments, and corporate requirements for
                          </p>
                          <div className="text-lg sm:text-xl font-bold text-cyan-900 bg-cyan-50/50 py-2 px-4 rounded-xl border border-cyan-100/80 inline-block">
                            {activeCert.program_title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1">
                            <span>Course Code: <strong className="font-mono text-slate-700">{activeCert.program_code || "TRN"}</strong></span>
                            <span>•</span>
                            <span>Duration: <strong className="text-slate-700">{activeCert.duration_hours || 2} Hours</strong></span>
                            <span>•</span>
                            <span>Mode: <strong className="text-slate-700">{activeCert.delivery_mode || "Blended"}</strong></span>
                            {activeCert.assessment_score != null && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold">Exam Score: {activeCert.assessment_score}% (Passed)</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Signatures & Seal Section */}
                        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 items-end text-center">
                          {/* Left: Date & Credential ID */}
                          <div className="text-left space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Date of Issue</div>
                            <div className="text-xs font-bold text-slate-800">
                              {activeCert.issue_date
                                ? new Date(activeCert.issue_date).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : new Date().toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1 break-all">
                              ID: {activeCert.certificate_number}
                            </div>
                            <div className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1">
                              <LuCircleCheck className="w-3 h-3 text-emerald-600" /> Verified Credential
                            </div>
                          </div>

                          {/* Center: Gold Rosette Seal Badge */}
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-1 shadow-lg flex items-center justify-center">
                              <div className="w-full h-full rounded-full border-2 border-white/60 bg-amber-500 flex flex-col items-center justify-center text-white">
                                <LuAward className="w-6 h-6 sm:w-8 sm:h-8" />
                                <span className="text-[7px] font-black uppercase tracking-tighter">Certified</span>
                              </div>
                            </div>
                            <div className="text-[9px] font-bold text-amber-800 mt-1 uppercase tracking-wider">
                              Official Seal
                            </div>
                          </div>

                          {/* Right: Signatures */}
                          <div className="text-right space-y-1">
                            <div className="font-serif italic text-sm sm:text-base font-bold text-slate-800 border-b border-slate-300 pb-1">
                              {activeCert.trainer_name || "Lead Corporate Trainer"}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                              Corporate Training Director
                            </div>
                            <div className="text-[9px] text-slate-500">
                              Human Resources &amp; Talent Office
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-6">No certificate data available.</p>
                  )}
                </Modal.Body>
                <Modal.Footer className="border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    💡 Tip: Click "Print / Save as PDF" to generate a landscape corporate certificate.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <LuPrinter className="w-4 h-4" /> Print / Save PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCertViewerModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </Modal.Footer>

                {/* Embedded Print Stylesheet */}
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #certificate-print-area, #certificate-print-area * {
                      visibility: visible !important;
                    }
                    #certificate-print-area {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100vw !important;
                      height: 100vh !important;
                      margin: 0 !important;
                      padding: 32px !important;
                      box-shadow: none !important;
                      border: 6px solid #0f172a !important;
                      background: #ffffff !important;
                      z-index: 999999 !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                    }
                    @page {
                      size: landscape;
                      margin: 0;
                    }
                  }
                `}</style>
              </Modal>

            </div>
          </div>
        );
}
