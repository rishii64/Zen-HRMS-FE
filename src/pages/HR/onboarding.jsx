import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  LuUserCheck,
  LuFileText,
  LuGraduationCap,
  LuBuilding2,
  LuScale,
  LuLaptop,
  LuMail,
  LuCreditCard,
  LuFingerprint,
  LuShoppingBag,
  LuPenTool,
  LuCheck,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCircleAlert,
  LuSearch,
  LuFilter,
  LuPlus,
  LuChevronRight,
  LuUpload,
  LuEye,
  LuExternalLink,
  LuSparkles,
  LuStar,
  LuBriefcase,
  LuShieldCheck,
  LuUsers,
  LuCalendar,
  LuArrowLeft,
  LuRefreshCw,
  LuLock,
  LuCheckCheck,
  LuAward,
  LuArrowRight,
  LuX,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api";

const DEPARTMENTS = [
  "IT",
  "Engineering",
  "HR",
  "Accounts",
  "Sales",
  "Marketing",
  "Operations",
  "Retail",
  "Quality Assurance",
  "Customer Success",
  "General",
];

const STAGES = [
  { key: "JOINING", step: "1", label: "Joining & Assets", icon: LuLaptop, desc: "Email, ID, Biometric, Laptop, Bag, Stationery" },
  { key: "DOCUMENTATION", step: "2", label: "Documentation", icon: LuFileText, desc: "Aadhaar, PAN, Degrees, Relieving, NDA, Bank" },
  { key: "TRAINING", step: "3", label: "4-Stage Training", icon: LuGraduationCap, desc: "HR, Admin, POS & Dept. Training Tracks" },
  { key: "DEPT_ASSIGNMENT", step: "4", label: "Dept. Assignment", icon: LuBuilding2, desc: "Formal HOD Placement (Post Training)" },
  { key: "PROBATION_EVALUATION", step: "5", label: "6-Mo Probation Review", icon: LuScale, desc: "HOD Analysis & Permanent vs Reject" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();

  // Current logged in user context
  const [currentUserRole, setCurrentUserRole] = useState(
    (localStorage.getItem("role") || "").toLowerCase()
  );
  const [currentEmpId, setCurrentEmpId] = useState(
    localStorage.getItem("empId") || localStorage.getItem("employeeCode") || ""
  );
  const [currentUserName, setCurrentUserName] = useState(
    localStorage.getItem("userName") || "User"
  );
  const [currentUserDept, setCurrentUserDept] = useState(
    localStorage.getItem("dept") || ""
  );

  // Main data state
  const [onboardings, setOnboardings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inJoining: 0,
    inDocs: 0,
    inTraining: 0,
    inDeptAssignment: 0,
    inProbation: 0,
    confirmedPermanent: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterStage, setFilterStage] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Active view: "pipeline" or "workspace"
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [activeStepTab, setActiveStepTab] = useState("JOINING");

  // Modals state
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  // Candidate / Employee pool for initiating onboarding
  const [candidatesPool, setCandidatesPool] = useState([]);
  const [employeesPool, setEmployeesPool] = useState([]);

  // Form states
  const [initiateForm, setInitiateForm] = useState({
    type: "candidate", // "candidate" | "employee" | "direct"
    candidate_id: "",
    employee_id: "",
    employee_name: "",
    personal_email: "",
    phone: "",
    designation: "Associate Trainee",
    target_department: "Engineering",
    joining_date: new Date().toISOString().split("T")[0],
  });

  // Joining assets form
  const [assetsForm, setAssetsForm] = useState({
    email_issued: false,
    email_address: "",
    email_issued_date: "",
    id_card_issued: false,
    id_card_number: "",
    id_card_issued_date: "",
    biometric_registered: false,
    biometric_device_id: "",
    biometric_registered_date: "",
    laptop_issued: false,
    laptop_serial_no: "",
    laptop_model: "",
    laptop_issued_date: "",
    bag_issued: false,
    bag_type: "",
    bag_issued_date: "",
    stationery_issued: false,
    stationery_details: "",
    stationery_issued_date: "",
    joining_remarks: "",
  });

  // Document upload state
  const [selectedDocKey, setSelectedDocKey] = useState("aadhaar");
  const [uploadFile, setUploadFile] = useState(null);
  const [docNumberInput, setDocNumberInput] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Training editing state
  const [editingModuleKey, setEditingModuleKey] = useState("hr");
  const [trainingEditForm, setTrainingEditForm] = useState({
    status: "IN_PROGRESS",
    trainer_name: "",
    mentor_name: "",
    department_name: "",
    scheduled_date: "",
    completed_date: "",
    score: 85,
    feedback: "",
  });

  // Department assignment form
  const [deptAssignForm, setDeptAssignForm] = useState({
    assigned_department: "Engineering",
    assigned_hod_id: "",
    assigned_hod_name: "",
    assigned_reporting_manager: "",
    assigned_date: new Date().toISOString().split("T")[0],
    assignment_notes: "",
    probation_period_months: 6,
  });

  // HOD probation review form
  const [hodReviewForm, setHodReviewForm] = useState({
    hod_performance_rating: 4.5,
    hod_kpi_rating: 4,
    hod_discipline_rating: 5,
    hod_culture_fit_rating: 4.5,
    hod_analysis_remarks: "",
    hod_decision: "PERMANENT", // "PERMANENT" | "REJECTED" | "EXTENDED"
    hod_decision_reason: "",
    hod_extension_months: 3,
  });

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  const fetchPipelineData = useCallback(async () => {
    try {
      setLoading(true);
      const [resOnboardings, resStats] = await Promise.all([
        api.get("/onboarding", {
          params: {
            stage: filterStage,
            status: filterStatus,
            department: filterDept,
            search: searchTerm,
          },
        }),
        api.get("/onboarding/stats"),
      ]);

      if (resOnboardings.data?.success) {
        setOnboardings(resOnboardings.data.data || []);
      }
      if (resStats.data?.success) {
        setStats(resStats.data.data || {});
      }
    } catch (err) {
      console.error("Error loading onboarding data:", err);
      toast.error(err.response?.data?.error || "Failed to load onboarding pipeline");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStage, filterStatus, filterDept, searchTerm]);

  // Load candidate and employee pools for the Initiate Onboarding modal
  const fetchPools = useCallback(async () => {
    try {
      const [candRes, empRes] = await Promise.allSettled([
        api.get("/recruitment/candidates"),
        api.get("/employees"),
      ]);

      if (candRes.status === "fulfilled" && candRes.value.data) {
        const rawCands = Array.isArray(candRes.value.data.data)
          ? candRes.value.data.data
          : Array.isArray(candRes.value.data)
          ? candRes.value.data
          : [];
        setCandidatesPool(rawCands);
      }

      if (empRes.status === "fulfilled" && empRes.value.data) {
        const rawEmps = Array.isArray(empRes.value.data.data)
          ? empRes.value.data.data
          : Array.isArray(empRes.value.data)
          ? empRes.value.data
          : [];
        setEmployeesPool(rawEmps);
      }
    } catch (e) {
      console.warn("Could not load candidate/employee pool:", e);
    }
  }, []);

  useEffect(() => {
    fetchPipelineData();
    fetchPools();
  }, [fetchPipelineData, fetchPools]);

  // Sync active record into forms when selected
  useEffect(() => {
    if (selectedOnboarding) {
      setAssetsForm({
        email_issued: !!selectedOnboarding.email_issued,
        email_address: selectedOnboarding.email_address || "",
        email_issued_date: selectedOnboarding.email_issued_date || "",
        id_card_issued: !!selectedOnboarding.id_card_issued,
        id_card_number: selectedOnboarding.id_card_number || "",
        id_card_issued_date: selectedOnboarding.id_card_issued_date || "",
        biometric_registered: !!selectedOnboarding.biometric_registered,
        biometric_device_id: selectedOnboarding.biometric_device_id || "",
        biometric_registered_date: selectedOnboarding.biometric_registered_date || "",
        laptop_issued: !!selectedOnboarding.laptop_issued,
        laptop_serial_no: selectedOnboarding.laptop_serial_no || "",
        laptop_model: selectedOnboarding.laptop_model || "",
        laptop_issued_date: selectedOnboarding.laptop_issued_date || "",
        bag_issued: !!selectedOnboarding.bag_issued,
        bag_type: selectedOnboarding.bag_type || "",
        bag_issued_date: selectedOnboarding.bag_issued_date || "",
        stationery_issued: !!selectedOnboarding.stationery_issued,
        stationery_details: selectedOnboarding.stationery_details || "",
        stationery_issued_date: selectedOnboarding.stationery_issued_date || "",
        joining_remarks: selectedOnboarding.joining_remarks || "",
      });

      setDeptAssignForm({
        assigned_department:
          selectedOnboarding.assigned_department ||
          selectedOnboarding.target_department ||
          "Engineering",
        assigned_hod_id: selectedOnboarding.assigned_hod_id || "",
        assigned_hod_name: selectedOnboarding.assigned_hod_name || "",
        assigned_reporting_manager: selectedOnboarding.assigned_reporting_manager || "",
        assigned_date: selectedOnboarding.assigned_date || new Date().toISOString().split("T")[0],
        assignment_notes: selectedOnboarding.assignment_notes || "",
        probation_period_months: selectedOnboarding.probation_period_months || 6,
      });

      setHodReviewForm({
        hod_performance_rating: selectedOnboarding.hod_performance_rating || 4.5,
        hod_kpi_rating: selectedOnboarding.hod_kpi_rating || 4,
        hod_discipline_rating: selectedOnboarding.hod_discipline_rating || 5,
        hod_culture_fit_rating: selectedOnboarding.hod_culture_fit_rating || 4.5,
        hod_analysis_remarks: selectedOnboarding.hod_analysis_remarks || "",
        hod_decision: selectedOnboarding.hod_decision || "PERMANENT",
        hod_decision_reason: selectedOnboarding.hod_decision_reason || "",
        hod_extension_months: selectedOnboarding.hod_extension_months || 3,
      });

      if (selectedOnboarding.current_stage) {
        setActiveStepTab(selectedOnboarding.current_stage);
      }
    }
  }, [selectedOnboarding]);

  const refreshCurrentOnboarding = async (id) => {
    try {
      const res = await api.get(`/onboarding/${id}`);
      if (res.data?.success) {
        setSelectedOnboarding(res.data.data);
        setOnboardings((prev) =>
          prev.map((item) => (item.id === id ? res.data.data : item))
        );
      }
    } catch (e) {
      console.warn("Could not reload record:", e);
    }
  };

  // =========================================================================
  // ACTIONS: INITIATE ONBOARDING
  // =========================================================================

  const handleCandidateSelect = (candId) => {
    const cand = candidatesPool.find((c) => c.id === candId);
    if (cand) {
      setInitiateForm((prev) => ({
        ...prev,
        candidate_id: cand.id,
        employee_name: cand.candidate_name,
        personal_email: cand.email || "",
        phone: cand.phone || "",
        designation: cand.current_designation || cand.requisition?.position || prev.designation,
        target_department: cand.requisition?.department || prev.target_department,
      }));
    }
  };

  const handleEmployeeSelect = (empCode) => {
    const emp = employeesPool.find((e) => e.employee_id === empCode);
    if (emp) {
      setInitiateForm((prev) => ({
        ...prev,
        employee_id: emp.employee_id,
        employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name,
        personal_email: emp.email || emp.personal_email || "",
        phone: emp.phone_no || "",
        designation: emp.designation || prev.designation,
        target_department: emp.dept || prev.target_department,
      }));
    }
  };

  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (!initiateForm.employee_name.trim()) {
      toast.error("Employee / Candidate name is required");
      return;
    }

    try {
      const payload = {
        ...initiateForm,
        candidate_id: initiateForm.type === "candidate" ? initiateForm.candidate_id : null,
        employee_id: initiateForm.type === "employee" ? initiateForm.employee_id : null,
      };

      const res = await api.post("/onboarding/initiate", payload);
      if (res.data?.success) {
        toast.success("Onboarding process initiated successfully!");
        setShowInitiateModal(false);
        fetchPipelineData();
        setSelectedOnboarding(res.data.data);
        setActiveStepTab("JOINING");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to initiate onboarding");
    }
  };

  // =========================================================================
  // STAGE A: JOINING — ASSET & IDENTITY ISSUANCE
  // =========================================================================

  const handleSaveAssets = async (markComplete = false) => {
    if (!selectedOnboarding) return;
    try {
      const payload = {
        ...assetsForm,
        mark_completed: markComplete,
      };

      const res = await api.patch(
        `/onboarding/${selectedOnboarding.id}/joining-assets`,
        payload
      );
      if (res.data?.success) {
        toast.success(
          markComplete
            ? "Joining stage completed! Proceeding to Documentation."
            : "Joining assets updated successfully"
        );
        refreshCurrentOnboarding(selectedOnboarding.id);
        if (markComplete) {
          setActiveStepTab("DOCUMENTATION");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update assets");
    }
  };

  // =========================================================================
  // STAGE B: DOCUMENTATION PROCESS
  // =========================================================================

  const handleVerifyDocument = async (docKey, newStatus) => {
    if (!selectedOnboarding) return;
    try {
      const currentDocs = Array.isArray(selectedOnboarding.documents)
        ? [...selectedOnboarding.documents]
        : [];
      const updatedDocs = currentDocs.map((doc) =>
        doc.key === docKey ? { ...doc, status: newStatus } : doc
      );

      const res = await api.patch(
        `/onboarding/${selectedOnboarding.id}/documentation`,
        { documents: updatedDocs }
      );
      if (res.data?.success) {
        toast.success(`Document marked as ${newStatus}`);
        refreshCurrentOnboarding(selectedOnboarding.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update document status");
    }
  };

  const handleUploadDocSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please choose a file to upload");
      return;
    }

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("doc_file", uploadFile);
      formData.append("doc_key", selectedDocKey);
      formData.append("doc_number", docNumberInput);

      const res = await api.post(
        `/onboarding/${selectedOnboarding.id}/documentation/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        toast.success("Document uploaded successfully!");
        setShowUploadModal(false);
        setUploadFile(null);
        setDocNumberInput("");
        refreshCurrentOnboarding(selectedOnboarding.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleMarkAllDocsVerified = async () => {
    if (!selectedOnboarding) return;
    try {
      const currentDocs = Array.isArray(selectedOnboarding.documents)
        ? [...selectedOnboarding.documents]
        : [];
      const updatedDocs = currentDocs.map((doc) => ({
        ...doc,
        status: "VERIFIED",
      }));

      const res = await api.patch(
        `/onboarding/${selectedOnboarding.id}/documentation`,
        {
          documents: updatedDocs,
          mark_verified: true,
        }
      );
      if (res.data?.success) {
        toast.success("All documents verified! Stage advanced to 4-Stage Training.");
        refreshCurrentOnboarding(selectedOnboarding.id);
        setActiveStepTab("TRAINING");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to complete documentation");
    }
  };

  // =========================================================================
  // STAGE C: 4-STAGE INTRO & TRAINING (HR, ADMIN, POS, DEPT)
  // =========================================================================

  const openTrainingModal = (moduleKey) => {
    setEditingModuleKey(moduleKey);
    const mod = selectedOnboarding?.[`${moduleKey}_training`] || {};
    setTrainingEditForm({
      status: mod.status || "IN_PROGRESS",
      trainer_name: mod.trainer_name || "",
      mentor_name: mod.mentor_name || "",
      department_name: mod.department_name || selectedOnboarding?.target_department || "",
      scheduled_date: mod.scheduled_date || "",
      completed_date: mod.completed_date || (mod.status === "COMPLETED" ? new Date().toISOString().split("T")[0] : ""),
      score: mod.score !== undefined && mod.score !== null ? mod.score : 85,
      feedback: mod.feedback || "",
    });
    setShowTrainingModal(true);
  };

  const handleSaveTrainingModule = async (e) => {
    e.preventDefault();
    if (!selectedOnboarding) return;

    try {
      const res = await api.patch(
        `/onboarding/${selectedOnboarding.id}/training`,
        {
          module_key: editingModuleKey,
          ...trainingEditForm,
        }
      );

      if (res.data?.success) {
        toast.success(`${editingModuleKey.toUpperCase()} training updated!`);
        setShowTrainingModal(false);
        refreshCurrentOnboarding(selectedOnboarding.id);

        if (
          res.data.data?.trainings_completed &&
          res.data.data?.current_stage === "DEPT_ASSIGNMENT"
        ) {
          toast.success(
            "🎉 All 4 trainings completed! Employee is ready for Department Assignment."
          );
          setActiveStepTab("DEPT_ASSIGNMENT");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update training");
    }
  };

  // =========================================================================
  // STAGE D: DEPARTMENT ASSIGNMENT (Unlocked after Dept Training)
  // =========================================================================

  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    if (!selectedOnboarding) return;

    if (selectedOnboarding.dept_training?.status !== "COMPLETED") {
      toast.error("Department Training must be COMPLETED before assigning department!");
      return;
    }

    try {
      const res = await api.patch(
        `/onboarding/${selectedOnboarding.id}/assign-department`,
        deptAssignForm
      );

      if (res.data?.success) {
        toast.success(
          `Assigned to ${deptAssignForm.assigned_department}! 6-Month Probation Period started.`
        );
        refreshCurrentOnboarding(selectedOnboarding.id);
        setActiveStepTab("PROBATION_EVALUATION");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign department");
    }
  };

  // =========================================================================
  // STAGE E: 6-MONTH PROBATION REVIEW & HOD PERMANENT / REJECT DECISION
  // =========================================================================

  const handleSubmitHodDecision = async (e) => {
    e.preventDefault();
    if (!selectedOnboarding) return;

    if (!selectedOnboarding.is_assigned_to_dept) {
      toast.error("Employee has not been assigned to a department yet!");
      return;
    }

    try {
      const res = await api.patch(
        `/onboarding/${selectedOnboarding.id}/probation-decision`,
        hodReviewForm
      );

      if (res.data?.success) {
        toast.success(
          hodReviewForm.hod_decision === "PERMANENT"
            ? "🌟 Employee confirmed as Permanent!"
            : hodReviewForm.hod_decision === "REJECTED"
            ? "Employee rejected after probation review"
            : "Probation extended successfully"
        );
        refreshCurrentOnboarding(selectedOnboarding.id);
        fetchPipelineData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit HOD decision");
    }
  };

  // =========================================================================
  // MATERIAL DESIGN 3 HELPERS & BADGES (Zero text wrapping)
  // =========================================================================

  const getStageBadge = (stage) => {
    switch (stage) {
      case "JOINING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap shadow-xs">
            <LuLaptop size={12} className="flex-shrink-0" />
            <span>1. Joining Assets</span>
          </span>
        );
      case "DOCUMENTATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap shadow-xs">
            <LuFileText size={12} className="flex-shrink-0" />
            <span>2. Documentation</span>
          </span>
        );
      case "TRAINING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shadow-xs">
            <LuGraduationCap size={12} className="flex-shrink-0" />
            <span>3. 4-Stage Training</span>
          </span>
        );
      case "DEPT_ASSIGNMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap shadow-xs">
            <LuBuilding2 size={12} className="flex-shrink-0" />
            <span>4. Dept. Assignment</span>
          </span>
        );
      case "PROBATION_EVALUATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200/80 whitespace-nowrap shadow-xs">
            <LuScale size={12} className="flex-shrink-0" />
            <span>5. 6-Mo Probation</span>
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-xs">
            <LuAward size={12} className="flex-shrink-0" />
            <span>Confirmed Permanent</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-xs">
            <LuCircleX size={12} className="flex-shrink-0" />
            <span>Probation Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
            {stage}
          </span>
        );
    }
  };

  const getStageProgressPercent = (rec) => {
    if (!rec) return 0;
    if (rec.probation_status === "CONFIRMED_PERMANENT" || rec.overall_status === "COMPLETED")
      return 100;
    if (rec.probation_status === "REJECTED") return 100;
    if (rec.current_stage === "PROBATION_EVALUATION" || rec.is_assigned_to_dept) return 80;
    if (rec.current_stage === "DEPT_ASSIGNMENT") return 65;
    if (rec.current_stage === "TRAINING") return 45;
    if (rec.current_stage === "DOCUMENTATION") return 25;
    return 10;
  };

  const getTrainingsSummary = (rec) => {
    if (!rec) return { count: 0, total: 4, pct: 0 };
    let c = 0;
    if (rec.hr_training?.status === "COMPLETED") c++;
    if (rec.admin_training?.status === "COMPLETED") c++;
    if (rec.pos_training?.status === "COMPLETED") c++;
    if (rec.dept_training?.status === "COMPLETED") c++;
    return { count: c, total: 4, pct: Math.round((c / 4) * 100) };
  };

  // Filtered onboardings list
  const filteredList = useMemo(() => {
    return onboardings.filter((item) => {
      const matchStage = filterStage === "ALL" || item.current_stage === filterStage;
      const matchStatus = filterStatus === "ALL" || item.overall_status === filterStatus;
      const matchDept =
        filterDept === "ALL" ||
        item.target_department?.toLowerCase().includes(filterDept.toLowerCase()) ||
        item.assigned_department?.toLowerCase().includes(filterDept.toLowerCase());
      const matchSearch =
        !searchTerm.trim() ||
        item.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.personal_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email_address?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchStage && matchStatus && matchDept && matchSearch;
    });
  }, [onboardings, filterStage, filterStatus, filterDept, searchTerm]);

  // =========================================================================
  // VIEW A: PIPELINE DASHBOARD (MATERIAL DESIGN 3 & ZERO TEXT WRAPPING)
  // =========================================================================

  const renderPipelineView = () => (
    <div className="space-y-5">
      {/* 4 Material Design 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="bg-white text-center rounded-2xl p-4 sm:p-5 border-1 border-gray-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Total Onboarding
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <LuUsers size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
              {stats.total || 0}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 truncate whitespace-nowrap">
              Active & Completed Candidates
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white text-center rounded-2xl p-4 sm:p-5 border-1 border-gray-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Joining & Docs
            </span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
              <LuFileText size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600 tracking-tight whitespace-nowrap">
              {(stats.inJoining || 0) + (stats.inDocs || 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 whitespace-nowrap">
              {stats.inJoining || 0} Assets Pending • {stats.inDocs || 0} In Docs
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white text-center rounded-2xl p-4 sm:p-5 border-1 border-gray-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              4-Stage Training
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <LuGraduationCap size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight whitespace-nowrap">
              {stats.inTraining || 0}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 whitespace-nowrap">
              HR, Admin, POS & Dept. Tracks
            </div>
          </div>
        </div>

        {/* Card 4 - Clean single-line layout without wrapping */}
        <div className="bg-white text-center rounded-2xl p-4 sm:p-5 border-1 border-gray-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              6-Mo Probation
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <LuAward size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight whitespace-nowrap flex items-baseline gap-1.5">
              <span>{stats.confirmedPermanent || 0}</span>
              <span className="text-xs sm:text-sm font-normal text-slate-500 whitespace-nowrap">
                / {stats.inProbation || 0} in review
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1 whitespace-nowrap">
              HOD Confirmations
            </div>
          </div>
        </div>
      </div>

      {/* Material 3 Responsive Filter Strip */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-2 sm:gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <LuSearch
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name, ID, email..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 whitespace-nowrap"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Stage */}
          <div className="lg:col-span-3">
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all whitespace-nowrap cursor-pointer"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
            >
              <option value="ALL">All Stages (Pipeline)</option>
              <option value="JOINING">1. Joining Assets</option>
              <option value="DOCUMENTATION">2. Documentation</option>
              <option value="TRAINING">3. 4-Stage Training</option>
              <option value="DEPT_ASSIGNMENT">4. Dept. Placement</option>
              <option value="PROBATION_EVALUATION">5. 6-Mo Probation Review</option>
              <option value="COMPLETED">Confirmed Permanent</option>
              <option value="REJECTED">Probation Rejected</option>
            </select>
          </div>

          {/* Filter Department */}
          <div className="lg:col-span-3">
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all whitespace-nowrap cursor-pointer"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="lg:col-span-2">
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all whitespace-nowrap cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Material 3 Data Table (Horizontally Scrollable, Zero Wrapping) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-slate-500 font-medium text-sm mt-3 whitespace-nowrap">
                Loading onboarding pipeline records...
              </div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <LuUserCheck size={28} />
              </div>
              <h6 className="font-bold text-slate-800 text-base mb-1 whitespace-nowrap">
                No Onboarding Records Found
              </h6>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
                No active onboarding candidates match the selected filters. Click "+ Initiate Onboarding" to begin.
              </p>
              <button
                onClick={() => setShowInitiateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap"
              >
                <LuPlus size={16} /> Initiate First Candidate
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[240px]">Employee / Candidate</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[210px]">Target Dept & Role</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">Current Stage</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Lifecycle Progress</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">4 Trainings Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">6-Mo Probation Review</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredList.map((item) => {
                  const trSummary = getTrainingsSummary(item);
                  const progressPct = getStageProgressPercent(item);

                  const hrDone = item.hr_training?.status === "COMPLETED";
                  const adminDone = item.admin_training?.status === "COMPLETED";
                  const posDone = item.pos_training?.status === "COMPLETED";
                  const deptDone = item.dept_training?.status === "COMPLETED";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* 1. Employee / Candidate (Zero wrapping) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs flex-shrink-0"
                            style={{
                              background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                              fontSize: 14,
                            }}
                          >
                            {item.employee_name?.charAt(0)?.toUpperCase() || "E"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 whitespace-nowrap flex items-center gap-1.5">
                              <span>{item.employee_name}</span>
                              {item.employee_id && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                  {item.employee_id}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 whitespace-nowrap truncate max-w-[220px]">
                              {item.email_address || item.personal_email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Target Dept & Role (Zero wrapping) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 whitespace-nowrap">
                          {item.designation || "Trainee"}
                        </div>
                        <div className="text-xs whitespace-nowrap mt-0.5">
                          {item.assigned_department ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <LuCircleCheck size={12} className="flex-shrink-0" />
                              <span>Assigned: {item.assigned_department}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Target: {item.target_department || "General"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Current Stage Chip */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStageBadge(item.current_stage)}
                      </td>

                      {/* 4. Lifecycle Progress */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5 whitespace-nowrap">
                          <span>Progress</span>
                          <span className="text-slate-900 font-bold">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.probation_status === "CONFIRMED_PERMANENT"
                                ? "bg-emerald-500"
                                : item.probation_status === "REJECTED"
                                ? "bg-rose-500"
                                : "bg-blue-600"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      {/* 5. 4 Trainings Status (Single line, zero wrapping) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                              trSummary.count === 4
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {trSummary.count}/4 Done
                          </span>
                        </div>
                        {/* 4 compact badges strictly on one single line */}
                        <div className="flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded whitespace-nowrap ${
                              hrDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            HR {hrDone ? "✓" : "○"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded whitespace-nowrap ${
                              adminDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            Admin {adminDone ? "✓" : "○"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded whitespace-nowrap ${
                              posDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            POS {posDone ? "✓" : "○"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded whitespace-nowrap ${
                              deptDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            Dept {deptDone ? "✓" : "○"}
                          </span>
                        </div>
                      </td>

                      {/* 6. 6-Mo Probation Review */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.probation_status === "CONFIRMED_PERMANENT" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-xs">
                            <LuAward size={13} className="flex-shrink-0" />
                            <span>Confirmed Permanent</span>
                          </span>
                        ) : item.probation_status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-xs">
                            <LuCircleX size={13} className="flex-shrink-0" />
                            <span>Probation Rejected</span>
                          </span>
                        ) : item.probation_status === "IN_PROBATION" ? (
                          <div className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shadow-xs">
                              <LuClock size={13} className="flex-shrink-0" />
                              <span>6-Mo Probation</span>
                            </span>
                            <div className="text-[11px] text-slate-400 mt-1 whitespace-nowrap">
                              Ends: {item.probation_end_date || "6 Months"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            Pending Dept Training
                          </span>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setSelectedOnboarding(item);
                            setActiveStepTab(item.current_stage || "JOINING");
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-700 border border-blue-200/80 transition-all duration-150 whitespace-nowrap shadow-xs active:scale-95 cursor-pointer"
                        >
                          <span>Workspace</span>
                          <LuChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // VIEW B: EMPLOYEE WORKSPACE VIEW (5-STEP PROCESS & TABS)
  // =========================================================================

  const renderWorkspaceView = () => {
    if (!selectedOnboarding) return null;

    return (
      <div className="space-y-4">
        {/* Workspace Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              setSelectedOnboarding(null);
              fetchPipelineData();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all whitespace-nowrap shadow-xs cursor-pointer"
          >
            <LuArrowLeft size={16} />
            <span>Back to Pipeline</span>
          </button>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              onClick={() => refreshCurrentOnboarding(selectedOnboarding.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-all whitespace-nowrap shadow-xs cursor-pointer"
            >
              <LuRefreshCw size={13} />
              <span>Refresh</span>
            </button>
            {getStageBadge(selectedOnboarding.current_stage)}
          </div>
        </div>

        {/* Hero Card of Selected Employee */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                  fontSize: 22,
                }}
              >
                {selectedOnboarding.employee_name?.charAt(0)?.toUpperCase() || "E"}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                    {selectedOnboarding.employee_name}
                  </h3>
                  {selectedOnboarding.employee_id && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                      {selectedOnboarding.employee_id}
                    </span>
                  )}
                  {selectedOnboarding.probation_status === "CONFIRMED_PERMANENT" && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                      🌟 Permanent Employee
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 whitespace-nowrap">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <LuBriefcase size={13} className="text-slate-400" />
                    <strong>Role:</strong> {selectedOnboarding.designation || "Trainee"}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <LuBuilding2 size={13} className="text-slate-400" />
                    <strong>Dept:</strong>{" "}
                    {selectedOnboarding.assigned_department ? (
                      <span className="text-emerald-700 font-semibold">
                        {selectedOnboarding.assigned_department} (Assigned)
                      </span>
                    ) : (
                      <span>{selectedOnboarding.target_department || "General"} (Target)</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <LuCalendar size={13} className="text-slate-400" />
                    <strong>Joining:</strong> {selectedOnboarding.joining_date || "Immediate"}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <LuMail size={13} className="text-slate-400" />
                    <strong>Email:</strong>{" "}
                    {selectedOnboarding.email_address ||
                      selectedOnboarding.personal_email ||
                      "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall progress on right */}
            <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex-shrink-0">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap mb-1">
                Lifecycle Progress
              </span>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${getStageProgressPercent(selectedOnboarding)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                  {getStageProgressPercent(selectedOnboarding)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Stage Material 3 Segmented Pill Navigation Bar (Horizontally scrollable on mobile, zero wrapping) */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none whitespace-nowrap">
            {STAGES.map((s) => {
              const IconComp = s.icon;
              const isActive = activeStepTab === s.key;

              let isDone = false;
              if (s.key === "JOINING" && selectedOnboarding.joining_completed) isDone = true;
              if (s.key === "DOCUMENTATION" && selectedOnboarding.documentation_status === "VERIFIED")
                isDone = true;
              if (s.key === "TRAINING" && selectedOnboarding.trainings_completed) isDone = true;
              if (s.key === "DEPT_ASSIGNMENT" && selectedOnboarding.is_assigned_to_dept)
                isDone = true;
              if (s.key === "PROBATION_EVALUATION" && selectedOnboarding.hod_analysis_completed)
                isDone = true;

              return (
                <button
                  key={s.key}
                  onClick={() => setActiveStepTab(s.key)}
                  className={`flex-1 inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <IconComp size={16} className={isActive ? "text-white" : "text-slate-400"} />
                    <span className="whitespace-nowrap">{s.step}. {s.label}</span>
                  </div>
                  {isDone ? (
                    <LuCircleCheck
                      size={15}
                      className={isActive ? "text-white" : "text-emerald-500"}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP CONTENT SWITCHER */}
        {activeStepTab === "JOINING" && renderStageA_Joining()}
        {activeStepTab === "DOCUMENTATION" && renderStageB_Documentation()}
        {activeStepTab === "TRAINING" && renderStageC_Training()}
        {activeStepTab === "DEPT_ASSIGNMENT" && renderStageD_DeptAssignment()}
        {activeStepTab === "PROBATION_EVALUATION" && renderStageE_ProbationReview()}
      </div>
    );
  };

  // =========================================================================
  // STAGE A: JOINING — ASSET & IDENTITY ISSUANCE
  // =========================================================================

  const renderStageA_Joining = () => {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuLaptop className="text-blue-600" /> a) Joining — Asset & Identity Issuance
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 whitespace-nowrap">
              Issue company Email ID, ID Card, Biometric registration, Laptop, Corporate Bag, Stationery kit, etc.
            </p>
          </div>
          <div>
            {selectedOnboarding.joining_completed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                <LuCircleCheck size={14} /> Joining Stage Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                <LuClock size={14} /> Assets Issuance Pending
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Email ID */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                  <LuMail size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm whitespace-nowrap">Official Email ID</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">Corporate mailbox</div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assetsForm.email_issued}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, email_issued: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assetsForm.email_issued ? "Issued" : "Pending"}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Assigned Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. employee@company.com"
                value={assetsForm.email_address}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, email_address: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Issue Date
              </label>
              <input
                type="date"
                value={assetsForm.email_issued_date}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, email_issued_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>

          {/* 2. ID Card */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                  <LuCreditCard size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm whitespace-nowrap">Employee ID Card</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">RFID badge & card number</div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assetsForm.id_card_issued}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, id_card_issued: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assetsForm.id_card_issued ? "Issued" : "Pending"}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                ID Card / Badge Number
              </label>
              <input
                type="text"
                placeholder="e.g. IDC-2026-9041"
                value={assetsForm.id_card_number}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, id_card_number: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Issue Date
              </label>
              <input
                type="date"
                value={assetsForm.id_card_issued_date}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, id_card_issued_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>

          {/* 3. Biometric Registration */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                  <LuFingerprint size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm whitespace-nowrap">Biometric Registration</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">Fingerprint / Facial punch</div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assetsForm.biometric_registered}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, biometric_registered: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assetsForm.biometric_registered ? "Registered" : "Pending"}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Biometric Device Terminal ID
              </label>
              <input
                type="text"
                placeholder="e.g. BIO-HQ-TERMINAL-01"
                value={assetsForm.biometric_device_id}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, biometric_device_id: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Registration Date
              </label>
              <input
                type="date"
                value={assetsForm.biometric_registered_date}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, biometric_registered_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>

          {/* 4. Company Laptop */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                  <LuLaptop size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm whitespace-nowrap">Company Laptop</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">Asset tag & serial number</div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assetsForm.laptop_issued}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, laptop_issued: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assetsForm.laptop_issued ? "Issued" : "Pending"}
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Serial / Tag No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. LP-DELL-8921"
                  value={assetsForm.laptop_serial_no}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, laptop_serial_no: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Brand & Model
                </label>
                <input
                  type="text"
                  placeholder="Dell Latitude 5440"
                  value={assetsForm.laptop_model}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, laptop_model: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Issue Date
              </label>
              <input
                type="date"
                value={assetsForm.laptop_issued_date}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, laptop_issued_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>

          {/* 5. Corporate Bag */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                  <LuShoppingBag size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm whitespace-nowrap">Corporate Bag</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">Laptop backpack / messenger</div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assetsForm.bag_issued}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, bag_issued: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assetsForm.bag_issued ? "Issued" : "Pending"}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Bag Model / Type
              </label>
              <input
                type="text"
                placeholder="Corporate Anti-Theft Backpack"
                value={assetsForm.bag_type}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, bag_type: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Issue Date
              </label>
              <input
                type="date"
                value={assetsForm.bag_issued_date}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, bag_issued_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>

          {/* 6. Stationery Kit */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                  <LuPenTool size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm whitespace-nowrap">Stationery Kit</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">Diary, pen & folder pack</div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assetsForm.stationery_issued}
                  onChange={(e) =>
                    setAssetsForm((p) => ({ ...p, stationery_issued: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {assetsForm.stationery_issued ? "Issued" : "Pending"}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Kit Details
              </label>
              <input
                type="text"
                placeholder="Executive Diary, Metal Pen, Sticky Notes"
                value={assetsForm.stationery_details}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, stationery_details: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Issue Date
              </label>
              <input
                type="date"
                value={assetsForm.stationery_issued_date}
                onChange={(e) =>
                  setAssetsForm((p) => ({ ...p, stationery_issued_date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>
        </div>

        {/* Joining Remarks */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
            Asset Allocation Notes & Handover Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Asset condition, warranty tags, accessories issued..."
            value={assetsForm.joining_remarks}
            onChange={(e) =>
              setAssetsForm((p) => ({ ...p, joining_remarks: e.target.value }))
            }
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleSaveAssets(false)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all whitespace-nowrap cursor-pointer shadow-xs"
          >
            Save Draft Assets
          </button>
          <button
            type="button"
            onClick={() => handleSaveAssets(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <LuCheckCheck size={18} />
            <span>Mark Joining Completed & Proceed to Docs</span>
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // STAGE B: DOCUMENTATION PROCESS
  // =========================================================================

  const renderStageB_Documentation = () => {
    const docs = Array.isArray(selectedOnboarding.documents)
      ? selectedOnboarding.documents
      : [];

    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuFileText className="text-sky-600" /> b) Documentation Process
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 whitespace-nowrap">
              Collect and verify essential employee documents: Aadhaar, PAN, Education, Relieving letters, NDA & Bank details.
            </p>
          </div>
          <div>
            {selectedOnboarding.documentation_status === "VERIFIED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                <LuCircleCheck size={14} /> All Documents Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                <LuClock size={14} /> Verification Pending
              </span>
            )}
          </div>
        </div>

        {/* Document Checklist Table (Horizontally scrollable with zero wrapping) */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">Document Type</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Document ID / Number</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[150px]">Attachment</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[120px]">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right min-w-[180px]">HR Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {docs.map((doc) => (
                  <tr key={doc.key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 whitespace-nowrap">
                        {doc.label || doc.key}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {doc.remarks || "Mandatory KYC proof"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 whitespace-nowrap">
                        {doc.number || "Not Provided"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {doc.doc_url ? (
                        <a
                          href={getUploadUrl(doc.doc_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all whitespace-nowrap cursor-pointer"
                        >
                          <LuEye size={13} />
                          <span>View File</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 whitespace-nowrap">No file</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {doc.status === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                          ✓ Verified
                        </span>
                      ) : doc.status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 whitespace-nowrap">
                          ✗ Rejected
                        </span>
                      ) : doc.status === "SUBMITTED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                          Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedDocKey(doc.key);
                            setDocNumberInput(doc.number || "");
                            setShowUploadModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all whitespace-nowrap cursor-pointer"
                        >
                          <LuUpload size={13} /> Upload
                        </button>
                        <button
                          title="Verify Document"
                          onClick={() => handleVerifyDocument(doc.key, "VERIFIED")}
                          className="p-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
                        >
                          <LuCheck size={14} />
                        </button>
                        <button
                          title="Reject Document"
                          onClick={() => handleVerifyDocument(doc.key, "REJECTED")}
                          className="p-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                        >
                          <LuCircleX size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Verification Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="text-xs text-slate-600 whitespace-nowrap">
            {selectedOnboarding.documentation_verified_by_name ? (
              <span>
                Verified by: <strong>{selectedOnboarding.documentation_verified_by_name}</strong> on{" "}
                {new Date(selectedOnboarding.documentation_completed_at).toLocaleDateString()}
              </span>
            ) : (
              <span>HR verification sign-off pending</span>
            )}
          </div>

          <button
            onClick={handleMarkAllDocsVerified}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <LuCircleCheck size={18} />
            <span>Mark All Verified & Proceed to Training</span>
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // STAGE C: 4-STAGE INTRO & TRAINING (HR, ADMIN, POS, DEPT)
  // =========================================================================

  const renderStageC_Training = () => {
    const modules = [
      {
        key: "hr",
        num: "(i)",
        title: "HR Training",
        icon: LuUsers,
        color: "#4f46e5",
        bg: "bg-indigo-50",
        data: selectedOnboarding.hr_training || {},
        curriculum: [
          "Company Culture, History & Core Values",
          "HR Policies, Attendance & Clock-in Protocol",
          "Leave Management & Shift Timings",
          "POSH & Workplace Code of Conduct",
          "Payroll Cycle & Benefits Overview",
        ],
      },
      {
        key: "admin",
        num: "(ii)",
        title: "Admin Training",
        icon: LuShieldCheck,
        color: "#0891b2",
        bg: "bg-cyan-50",
        data: selectedOnboarding.admin_training || {},
        curriculum: [
          "Office Facilities & Floor Protocol",
          "Badge Security, Access Keys & Visitor Entry",
          "Emergency Evacuation & Fire Safety",
          "Desk Ergonomics & Clean Desk Policy",
          "Asset Care & Admin Helpdesk",
        ],
      },
      {
        key: "pos",
        num: "(iii)",
        title: "POS Training",
        icon: LuCreditCard,
        color: "#ea580c",
        bg: "bg-orange-50",
        data: selectedOnboarding.pos_training || {},
        curriculum: [
          "Point-of-Sale System Setup & Login",
          "Billing, Invoicing & Cash Register Mgmt",
          "Discounts, Returns & Customer Support",
          "Inventory Sync & Stock Count Audits",
          "Day-End Reconciliation Reports",
        ],
      },
      {
        key: "dept",
        num: "(iv)",
        title: "Dept. Training",
        icon: LuLaptop,
        color: "#7c3aed",
        bg: "bg-purple-50",
        data: selectedOnboarding.dept_training || {},
        curriculum: [
          "Department Architecture, Tools & Tech Stack",
          "Standard Operating Procedures (SOP)",
          "Live Project Setup & Git Repository Access",
          "Key Result Areas (KRAs) & KPI Overview",
          "First Milestone & Mentorship Review",
        ],
      },
    ];

    const trSummary = getTrainingsSummary(selectedOnboarding);

    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuGraduationCap className="text-amber-600" /> c) Intro & 4-Stage Training
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 whitespace-nowrap">
              Mandatory completion of all 4 tracks: (i) HR Training, (ii) Admin Training, (iii) POS Training, and (iv) Dept. Training.
            </p>
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                trSummary.count === 4
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {trSummary.count} of 4 Modules Done ({trSummary.pct}%)
            </span>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => {
            const IconC = m.icon;
            const isCompleted = m.data.status === "COMPLETED";
            const isInProgress = m.data.status === "IN_PROGRESS";

            return (
              <div
                key={m.key}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: m.color }}
                      >
                        <IconC size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base whitespace-nowrap">
                          <span className="text-slate-400 font-normal mr-1">{m.num}</span>
                          {m.title}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {m.key === "dept"
                            ? `Dept: ${m.data.department_name || selectedOnboarding.target_department || "Engineering"}`
                            : "Foundation Induction Track"}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                          ✓ Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">
                          Not Started
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Curriculum list */}
                  <div className="mb-3 space-y-1">
                    <div className="text-xs font-semibold text-slate-600 whitespace-nowrap mb-1">
                      Topics Covered:
                    </div>
                    {m.curriculum.map((item, i) => (
                      <div key={i} className="text-xs text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="whitespace-nowrap">{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between whitespace-nowrap">
                      <span>Trainer / Mentor:</span>
                      <strong className="text-slate-900 whitespace-nowrap">
                        {m.data.trainer_name || m.data.mentor_name || "Unassigned"}
                      </strong>
                    </div>
                    <div className="flex justify-between whitespace-nowrap">
                      <span>Completion Date:</span>
                      <strong className="text-slate-900 whitespace-nowrap">
                        {m.data.completed_date || "Pending"}
                      </strong>
                    </div>
                    {m.data.score !== undefined && m.data.score !== null && (
                      <div className="flex justify-between whitespace-nowrap">
                        <span>Assessment Score:</span>
                        <strong className="text-emerald-700 font-bold whitespace-nowrap">
                          {m.data.score} / 100
                        </strong>
                      </div>
                    )}
                    {m.data.feedback && (
                      <div className="pt-1 border-t border-slate-200/60 text-slate-500 italic truncate whitespace-nowrap">
                        "{m.data.feedback}"
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openTrainingModal(m.key)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isCompleted
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  }`}
                >
                  {isCompleted ? "Edit Training Details" : "Record / Complete Training"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Transition Alert */}
        {selectedOnboarding.dept_training?.status === "COMPLETED" ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="whitespace-nowrap">
              <div className="font-bold text-emerald-900 text-sm whitespace-nowrap">
                🎉 Department Training Completed!
              </div>
              <div className="text-xs text-emerald-700 whitespace-nowrap">
                Employee is now eligible for formal placement into their respective department.
              </div>
            </div>
            <button
              onClick={() => setActiveStepTab("DEPT_ASSIGNMENT")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all whitespace-nowrap shadow-xs cursor-pointer flex-shrink-0"
            >
              <span>Proceed to Dept. Assignment</span>
              <LuArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2 whitespace-nowrap">
            <LuCircleAlert size={16} className="text-blue-600 flex-shrink-0" />
            <span className="whitespace-nowrap">
              Policy Rule: <strong>Department Training (iv)</strong> must be completed before employee can be assigned to their department.
            </span>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // STAGE D: DEPARTMENT ASSIGNMENT (Unlocked post Dept Training)
  // =========================================================================

  const renderStageD_DeptAssignment = () => {
    const deptTrainingDone = selectedOnboarding.dept_training?.status === "COMPLETED";

    if (!deptTrainingDone) {
      return (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <LuLock size={28} />
          </div>
          <div>
            <h5 className="font-bold text-slate-900 text-lg whitespace-nowrap">
              Department Assignment Locked
            </h5>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
              "After department training employee gets assigned to their respective departments."
              <br />
              Please complete <strong>(iv) Dept. Training</strong> under Stage 3 before unlocking this placement step.
            </p>
          </div>
          <button
            onClick={() => setActiveStepTab("TRAINING")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all whitespace-nowrap shadow-xs cursor-pointer"
          >
            Go to Training Modules
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuBuilding2 className="text-purple-600" /> d) Department Assignment & 6-Month Probation Window
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 whitespace-nowrap">
              Formally place the employee into their department and initialize the 6-month probation period.
            </p>
          </div>
          <div>
            {selectedOnboarding.is_assigned_to_dept ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                <LuCircleCheck size={14} /> Department Assigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                Ready for Assignment
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleAssignDepartment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Assigned Department *
              </label>
              <select
                value={deptAssignForm.assigned_department}
                onChange={(e) =>
                  setDeptAssignForm((p) => ({ ...p, assigned_department: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                required
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Formal Assignment Date *
              </label>
              <input
                type="date"
                value={deptAssignForm.assigned_date}
                onChange={(e) =>
                  setDeptAssignForm((p) => ({ ...p, assigned_date: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Department Head (HOD) Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Connor (Head of Engineering)"
                value={deptAssignForm.assigned_hod_name}
                onChange={(e) =>
                  setDeptAssignForm((p) => ({ ...p, assigned_hod_name: e.target.value }))
                }
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Reporting Manager / Mentor
              </label>
              <input
                type="text"
                placeholder="e.g. David TechLead"
                value={deptAssignForm.assigned_reporting_manager}
                onChange={(e) =>
                  setDeptAssignForm((p) => ({
                    ...p,
                    assigned_reporting_manager: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
              Department Handover & Assignment Notes
            </label>
            <textarea
              rows={2}
              placeholder="Initial project allocation, mentor briefing, desk seat location..."
              value={deptAssignForm.assignment_notes}
              onChange={(e) =>
                setDeptAssignForm((p) => ({ ...p, assignment_notes: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* 6-Month Probation Window Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <LuClock className="text-amber-600" size={18} />
              <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
                Initial 6-Month Probation Window
              </div>
            </div>
            <p className="text-xs text-slate-500 whitespace-nowrap">
              Department assignment establishes the official 6-month probation period.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1 text-xs">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
                <span className="text-slate-500">Probation Start: </span>
                <strong className="text-slate-800">{deptAssignForm.assigned_date}</strong>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
                <span className="text-slate-500">Duration: </span>
                <strong className="text-blue-600">6 Months</strong>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
                <span className="text-slate-500">HOD Target Evaluation Date: </span>
                <strong className="text-emerald-700">
                  {(() => {
                    const d = new Date(deptAssignForm.assigned_date);
                    d.setMonth(d.getMonth() + 6);
                    return d.toISOString().split("T")[0];
                  })()}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <LuCheckCheck size={18} />
              <span>Confirm Department Assignment & Start 6-Month Probation</span>
            </button>
          </div>
        </form>
      </div>
    );
  };

  // =========================================================================
  // STAGE E: 6-MONTH PROBATION REVIEW & HOD PERMANENT / REJECT DECISION
  // =========================================================================

  const renderStageE_ProbationReview = () => {
    if (!selectedOnboarding.is_assigned_to_dept) {
      return (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <LuLock size={28} />
          </div>
          <div>
            <h5 className="font-bold text-slate-900 text-lg whitespace-nowrap">
              Probation Review Unavailable
            </h5>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
              Employee has not been assigned to a department yet. Please complete Stage 4 (Department Assignment) first.
            </p>
          </div>
          <button
            onClick={() => setActiveStepTab("DEPT_ASSIGNMENT")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all whitespace-nowrap shadow-xs cursor-pointer"
          >
            Go to Department Assignment
          </button>
        </div>
      );
    }

    const hasDecision = !!selectedOnboarding.hod_analysis_completed;
    const isPermanent = selectedOnboarding.hod_decision === "PERMANENT";
    const isRejected = selectedOnboarding.hod_decision === "REJECTED";

    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuScale className="text-emerald-600" /> e) 6-Month Probation Evaluation & HOD Decision
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 whitespace-nowrap">
              Department analysis by Department Head to choose between <strong>Permanent Confirmation</strong> or <strong>Rejection</strong> after the initial 6 months probation period.
            </p>
          </div>
          <div>
            {isPermanent ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                🌟 Confirmed as Permanent Employee
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                ❌ Probation Rejected / Separated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                ⚖️ 6-Month Probation Active
              </span>
            )}
          </div>
        </div>

        {/* Timeline Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <div className="text-xs text-slate-500 whitespace-nowrap">Assigned Department</div>
            <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
              {selectedOnboarding.assigned_department}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 whitespace-nowrap">Probation Start</div>
            <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
              {selectedOnboarding.probation_start_date || "N/A"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 whitespace-nowrap">6-Month End Date</div>
            <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
              {selectedOnboarding.probation_end_date || "N/A"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 whitespace-nowrap">Review Status</div>
            <div className="font-bold text-blue-600 text-sm whitespace-nowrap">
              {selectedOnboarding.probation_status || "IN_PROBATION"}
            </div>
          </div>
        </div>

        {/* If HOD Decision Already Submitted — Show Decision Certificate Stamp */}
        {hasDecision && (
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              isPermanent
                ? "bg-emerald-50/60 border-emerald-200"
                : isRejected
                ? "bg-rose-50/60 border-rose-200"
                : "bg-amber-50/60 border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center flex-shrink-0 shadow-xs ${
                    isPermanent ? "bg-emerald-600" : isRejected ? "bg-rose-600" : "bg-amber-600"
                  }`}
                >
                  {isPermanent ? <LuAward size={20} /> : <LuCircleX size={20} />}
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-base mb-0.5 whitespace-nowrap">
                    Official HOD Decision:{" "}
                    <span
                      className={
                        isPermanent
                          ? "text-emerald-700"
                          : isRejected
                          ? "text-rose-700"
                          : "text-amber-700"
                      }
                    >
                      {selectedOnboarding.hod_decision}
                    </span>
                  </h5>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    Evaluated by {selectedOnboarding.hod_decision_by_name || "Department Head"} on{" "}
                    {selectedOnboarding.hod_decision_date
                      ? new Date(selectedOnboarding.hod_decision_date).toLocaleDateString()
                      : "Recent"}
                  </div>
                </div>
              </div>
            </div>

            {/* Ratings 4 Columns (Zero wrapping) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] text-slate-500 whitespace-nowrap">Performance</div>
                <div className="font-bold text-slate-900 text-sm whitespace-nowrap mt-0.5">
                  {selectedOnboarding.hod_performance_rating || "—"} / 5 ⭐
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] text-slate-500 whitespace-nowrap">KPI Achievement</div>
                <div className="font-bold text-slate-900 text-sm whitespace-nowrap mt-0.5">
                  {selectedOnboarding.hod_kpi_rating || "—"} / 5 ⭐
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] text-slate-500 whitespace-nowrap">Attendance & Punctuality</div>
                <div className="font-bold text-slate-900 text-sm whitespace-nowrap mt-0.5">
                  {selectedOnboarding.hod_discipline_rating || "—"} / 5 ⭐
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] text-slate-500 whitespace-nowrap">Culture & Teamwork</div>
                <div className="font-bold text-slate-900 text-sm whitespace-nowrap mt-0.5">
                  {selectedOnboarding.hod_culture_fit_rating || "—"} / 5 ⭐
                </div>
              </div>
            </div>

            {selectedOnboarding.hod_analysis_remarks && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                <strong className="text-slate-800">HOD Analysis Remarks:</strong>
                <p className="text-slate-600 mt-1 mb-0">{selectedOnboarding.hod_analysis_remarks}</p>
              </div>
            )}
            {selectedOnboarding.hod_decision_reason && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                <strong className="text-slate-800">Decision Justification:</strong>
                <p className="text-slate-600 mt-1 mb-0">{selectedOnboarding.hod_decision_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* HOD Analysis Form */}
        <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-4">
          <div>
            <h5 className="font-bold text-slate-900 text-base flex items-center gap-2 whitespace-nowrap">
              <LuStar className="text-amber-500" /> Conduct Department Analysis & Submit Final Choice
            </h5>
            <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
              Evaluate performance metrics across the 6-month probation and decide whether to confirm as Permanent or Reject.
            </p>
          </div>

          <form onSubmit={handleSubmitHodDecision} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  1. Job Execution (1-5 ⭐)
                </label>
                <select
                  value={hodReviewForm.hod_performance_rating}
                  onChange={(e) =>
                    setHodReviewForm((p) => ({
                      ...p,
                      hod_performance_rating: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  <option value={5}>5 - Outstanding</option>
                  <option value={4.5}>4.5 - Exceeds Expectations</option>
                  <option value={4}>4 - Meets Expectations</option>
                  <option value={3}>3 - Satisfactory</option>
                  <option value={2}>2 - Below Average</option>
                  <option value={1}>1 - Unsatisfactory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  2. KPI Achievement (1-5 ⭐)
                </label>
                <select
                  value={hodReviewForm.hod_kpi_rating}
                  onChange={(e) =>
                    setHodReviewForm((p) => ({
                      ...p,
                      hod_kpi_rating: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  <option value={5}>5 - 100%+ Targets</option>
                  <option value={4}>4 - 85-99% Targets</option>
                  <option value={3}>3 - 70-84% Targets</option>
                  <option value={2}>2 - 50-69% Targets</option>
                  <option value={1}>1 - &lt;50% Targets</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  3. Attendance & Discipline (1-5 ⭐)
                </label>
                <select
                  value={hodReviewForm.hod_discipline_rating}
                  onChange={(e) =>
                    setHodReviewForm((p) => ({
                      ...p,
                      hod_discipline_rating: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  <option value={5}>5 - Punctual & Disciplined</option>
                  <option value={4}>4 - Good Punctuality</option>
                  <option value={3}>3 - Acceptable Attendance</option>
                  <option value={2}>2 - Frequent Tardiness</option>
                  <option value={1}>1 - Chronic Issues</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  4. Culture & Teamwork (1-5 ⭐)
                </label>
                <select
                  value={hodReviewForm.hod_culture_fit_rating}
                  onChange={(e) =>
                    setHodReviewForm((p) => ({
                      ...p,
                      hod_culture_fit_rating: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  <option value={5}>5 - Exemplary Team Player</option>
                  <option value={4.5}>4.5 - Highly Collaborative</option>
                  <option value={4}>4 - Good Collaboration</option>
                  <option value={3}>3 - Average Fit</option>
                  <option value={2}>2 - Poor Integration</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                HOD Qualitative Department Analysis Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Technical accomplishments during 6-month probation, key project deliveries, overall fit..."
                value={hodReviewForm.hod_analysis_remarks}
                onChange={(e) =>
                  setHodReviewForm((p) => ({
                    ...p,
                    hod_analysis_remarks: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Department Head Final Choice Radio Cards */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block font-bold text-slate-900 text-sm whitespace-nowrap">
                Department Head Final Choice:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Permanent */}
                <label
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer block ${
                    hodReviewForm.hod_decision === "PERMANENT"
                      ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/10"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <input
                      type="radio"
                      name="hodChoice"
                      checked={hodReviewForm.hod_decision === "PERMANENT"}
                      onChange={() =>
                        setHodReviewForm((p) => ({ ...p, hod_decision: "PERMANENT" }))
                      }
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <strong className="text-emerald-800 text-sm whitespace-nowrap">
                      🌟 Keep as Permanent
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 pl-5 whitespace-nowrap">
                    Confirm full-time permanent corporate status.
                  </div>
                </label>

                {/* 2. Reject */}
                <label
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer block ${
                    hodReviewForm.hod_decision === "REJECTED"
                      ? "bg-white border-rose-500 shadow-xs ring-2 ring-rose-500/10"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <input
                      type="radio"
                      name="hodChoice"
                      checked={hodReviewForm.hod_decision === "REJECTED"}
                      onChange={() =>
                        setHodReviewForm((p) => ({ ...p, hod_decision: "REJECTED" }))
                      }
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <strong className="text-rose-800 text-sm whitespace-nowrap">
                      ❌ Reject Employee
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 pl-5 whitespace-nowrap">
                    End employment after 6-month probation review.
                  </div>
                </label>

                {/* 3. Extend */}
                <label
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer block ${
                    hodReviewForm.hod_decision === "EXTENDED"
                      ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/10"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <input
                      type="radio"
                      name="hodChoice"
                      checked={hodReviewForm.hod_decision === "EXTENDED"}
                      onChange={() =>
                        setHodReviewForm((p) => ({ ...p, hod_decision: "EXTENDED" }))
                      }
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <strong className="text-amber-800 text-sm whitespace-nowrap">
                      ⏱️ Extend Probation
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 pl-5 whitespace-nowrap">
                    Grant 1-3 months grace observation period.
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Formal Rationale & Official Recommendation
                </label>
                <textarea
                  rows={2}
                  placeholder="Official comments for permanent confirmation or probation separation..."
                  value={hodReviewForm.hod_decision_reason}
                  onChange={(e) =>
                    setHodReviewForm((p) => ({
                      ...p,
                      hod_decision_reason: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all whitespace-nowrap shadow-sm active:scale-95 cursor-pointer ${
                  hodReviewForm.hod_decision === "PERMANENT"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                    : hodReviewForm.hod_decision === "REJECTED"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                }`}
              >
                <LuCheckCheck size={18} />
                <span>Submit HOD Final Decision</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MODALS
  // =========================================================================

  // 1. Initiate Modal
  const renderInitiateModal = () => {
    if (!showInitiateModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuSparkles className="text-blue-600" /> Initiate Employee Onboarding
            </h4>
            <button
              onClick={() => setShowInitiateModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <LuX size={18} />
            </button>
          </div>

          {/* Segmented type buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl whitespace-nowrap">
            <button
              type="button"
              onClick={() => setInitiateForm((p) => ({ ...p, type: "candidate" }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                initiateForm.type === "candidate"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              From Candidate
            </button>
            <button
              type="button"
              onClick={() => setInitiateForm((p) => ({ ...p, type: "employee" }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                initiateForm.type === "employee"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              From Directory
            </button>
            <button
              type="button"
              onClick={() => setInitiateForm((p) => ({ ...p, type: "direct" }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                initiateForm.type === "direct"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Direct Entry
            </button>
          </div>

          <form onSubmit={handleInitiateSubmit} className="space-y-3.5">
            {initiateForm.type === "candidate" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Select Recruited Candidate
                </label>
                <select
                  value={initiateForm.candidate_id}
                  onChange={(e) => handleCandidateSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidatesPool.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.candidate_name} ({c.current_designation || "Candidate"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {initiateForm.type === "employee" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Select from Employee Directory
                </label>
                <select
                  value={initiateForm.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {employeesPool.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      [{e.employee_id}] {e.first_name} {e.last_name} ({e.dept || "General"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alice Johnson"
                  value={initiateForm.employee_name}
                  onChange={(e) =>
                    setInitiateForm((p) => ({ ...p, employee_name: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Personal Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. alice@gmail.com"
                  value={initiateForm.personal_email}
                  onChange={(e) =>
                    setInitiateForm((p) => ({ ...p, personal_email: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={initiateForm.phone}
                  onChange={(e) =>
                    setInitiateForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={initiateForm.joining_date}
                  onChange={(e) =>
                    setInitiateForm((p) => ({ ...p, joining_date: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={initiateForm.designation}
                  onChange={(e) =>
                    setInitiateForm((p) => ({ ...p, designation: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Target Department
                </label>
                <select
                  value={initiateForm.target_department}
                  onChange={(e) =>
                    setInitiateForm((p) => ({ ...p, target_department: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-xs cursor-pointer"
              >
                Start Onboarding
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 2. Upload Document Modal
  const renderUploadModal = () => {
    if (!showUploadModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuUpload className="text-blue-600" /> Upload {selectedDocKey.toUpperCase()}
            </h4>
            <button
              onClick={() => setShowUploadModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <LuX size={18} />
            </button>
          </div>

          <form onSubmit={handleUploadDocSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Document Number / Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. Aadhaar / PAN / Certificate No."
                value={docNumberInput}
                onChange={(e) => setDocNumberInput(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Choose Document File (PDF, PNG, JPG) *
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingDoc}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-xs cursor-pointer"
              >
                {uploadingDoc ? "Uploading..." : "Upload & Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 3. Training Modal
  const renderTrainingModal = () => {
    if (!showTrainingModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <LuGraduationCap className="text-amber-500" /> Update {editingModuleKey.toUpperCase()} Training
            </h4>
            <button
              onClick={() => setShowTrainingModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <LuX size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveTrainingModule} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Training Status
              </label>
              <select
                value={trainingEditForm.status}
                onChange={(e) =>
                  setTrainingEditForm((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap cursor-pointer"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Trainer / Evaluator
                </label>
                <input
                  type="text"
                  placeholder="Trainer name"
                  value={trainingEditForm.trainer_name}
                  onChange={(e) =>
                    setTrainingEditForm((p) => ({ ...p, trainer_name: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>

              {editingModuleKey === "dept" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Assigned Mentor
                  </label>
                  <input
                    type="text"
                    placeholder="Mentor name"
                    value={trainingEditForm.mentor_name}
                    onChange={(e) =>
                      setTrainingEditForm((p) => ({ ...p, mentor_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={trainingEditForm.scheduled_date}
                    onChange={(e) =>
                      setTrainingEditForm((p) => ({ ...p, scheduled_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Completion Date
                </label>
                <input
                  type="date"
                  value={trainingEditForm.completed_date}
                  onChange={(e) =>
                    setTrainingEditForm((p) => ({ ...p, completed_date: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                  Assessment Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={trainingEditForm.score}
                  onChange={(e) =>
                    setTrainingEditForm((p) => ({ ...p, score: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 whitespace-nowrap"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 whitespace-nowrap">
                Trainer Feedback / Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Candidate participation, test performance..."
                value={trainingEditForm.feedback}
                onChange={(e) =>
                  setTrainingEditForm((p) => ({ ...p, feedback: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTrainingModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-xs cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN CONTAINER RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-slate-50/60 py-5 font-sans">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Material 3 Top Header Strip (Single-line zero wrapping title and breadcrumb) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100/80 mb-2 whitespace-nowrap">
              <LuBuilding2 size={13} className="text-blue-600" />
              <span>Enterprise HR Lifecycle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
              Employee Onboarding Hub
            </h1>
            {/* Horizontal single-line process breadcrumb with zero wrapping */}
            <div className="overflow-x-auto scrollbar-none mt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <span>Joining Assets</span>
                <span className="text-slate-300">➔</span>
                <span>Documentation</span>
                <span className="text-slate-300">➔</span>
                <span>4-Stage Training</span>
                <span className="text-slate-300">➔</span>
                <span>Dept. Placement</span>
                <span className="text-slate-300">➔</span>
                <span className="text-emerald-700 font-semibold">6-Month Probation Review</span>
              </div>
            </div>
          </div>

          {/* Action buttons on top right */}
          <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 self-start sm:self-center">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchPipelineData();
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all whitespace-nowrap cursor-pointer active:scale-95"
            >
              <LuRefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowInitiateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all whitespace-nowrap cursor-pointer active:scale-95"
            >
              <LuPlus size={16} />
              <span>Initiate Onboarding</span>
            </button>
          </div>
        </div>

        {/* Dynamic View: Pipeline List OR Employee Workspace */}
        {selectedOnboarding ? renderWorkspaceView() : renderPipelineView()}
      </div>

      {/* Material Modals */}
      {renderInitiateModal()}
      {renderUploadModal()}
      {renderTrainingModal()}
    </div>
  );
}