import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LuAward,
  LuCircleCheck,
  LuClock,
  LuChevronRight,
  LuUsers,
  LuUserCheck,
  LuShieldCheck,
  LuFileText,
  LuSend,
  LuSparkles,
  LuCalendar,
  LuLayers,
  LuSearch,
  LuFilter,
  LuPlus,
  LuRefreshCw,
  LuEye,
  LuTrash2,
  LuArrowRight,
  LuInfo,
  LuTrendingUp,
  LuBriefcase,
  LuCheck,
  LuX,
  LuStar,
} from "react-icons/lu";
import { Modal, Button, Badge, Form, Row, Col, Spinner } from "react-bootstrap";
import toast from "react-hot-toast";
import api from "../../api";

const RATING_OPTIONS_10 = [
  { val: 10, label: "10 - Outstanding (Consistently exceeds job requirements)" },
  { val: 9, label: "9 - Outstanding (Consistently exceeds job requirements)" },
  { val: 8, label: "8 - Very Good (Exceeds job requirements at times)" },
  { val: 7, label: "7 - Very Good (Exceeds job requirements at times)" },
  { val: 6, label: "6 - Good (Meets job requirements)" },
  { val: 5, label: "5 - Good (Meets job requirements)" },
  { val: 4, label: "4 - Average (Falls short of job requirements at times)" },
  { val: 3, label: "3 - Average (Falls short of job requirements at times)" },
  { val: 2, label: "2 - Poor (Consistently falls short of job requirements)" },
  { val: 1, label: "1 - Poor (Consistently falls short of job requirements)" },
];

const STAR_LABELS = {
  10: "10 - Outstanding",
  9: "9 - Outstanding",
  8: "8 - Very Good",
  7: "7 - Very Good",
  6: "6 - Good",
  5: "5 - Good",
  4: "4 - Average",
  3: "3 - Average",
  2: "2 - Poor",
  1: "1 - Poor",
};

export default function ProbationAppraisalReviews({ activeSubTab = "pipeline" }) {
  // Current user auth
  const rawRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const isHRorAdmin = ["hr", "admin"].includes(rawRole);
  const isHOD = ["hod", "manager", "teamlead"].includes(rawRole);
  const currentEmpId = localStorage.getItem("employee_id") || "";
  const currentUserName = localStorage.getItem("name") || "Employee";

  // Sub-tabs: "pipeline" | "my_questionnaire" | "pending_evaluations"
  const [subTab, setSubTab] = useState(
    isHRorAdmin ? "pipeline" : isHOD ? "pending_evaluations" : "my_questionnaire"
  );

  // Filter States
  const [filterType, setFilterType] = useState("All"); // All | probation | appraisal
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Data States
  const [allReviews, setAllReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [demoQuestions, setDemoQuestions] = useState([]);
  const [hierarchyOptions, setHierarchyOptions] = useState({ teamLeads: [], managers: [], hods: [], allUsers: [] });
  const [allEmployeesList, setAllEmployeesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [initiateModalOpen, setInitiateModalOpen] = useState(false);
  const [initiateForm, setInitiateForm] = useState({
    employee_id: "",
    review_type: "probation", // "probation" | "appraisal"
    cycle_name: "",
    tl_id: "",
    tl_name: "",
    manager_id: "",
    manager_name: "",
    hod_id: "",
    hod_name: "",
  });
  const [initiating, setInitiating] = useState(false);

  // Active Review being viewed or evaluated in Modal
  const [activeReviewModal, setActiveReviewModal] = useState(null);
  const [activeModalType, setActiveModalType] = useState("view"); // "view" | "self" | "tl" | "manager" | "hod" | "hr"
  
  // Interactive Evaluation Form States
  const [evalAnswers, setEvalAnswers] = useState({}); // { [question_id]: { rating, comment } }
  const [evalDecision, setEvalDecision] = useState(""); // HOD decision or HR decision
  const [evalRemarks, setEvalRemarks] = useState("");
  const [evalRecommendation, setEvalRecommendation] = useState("");
  const [evalFinalScore, setEvalFinalScore] = useState(8.5);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch initial data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Demo / Official Questions
      try {
        const qRes = await api.get("/kpi/reviews/demo-questions");
        if (qRes.data?.success) setDemoQuestions(qRes.data.questions || []);
      } catch (err) {
        console.warn("Could not fetch questions:", err);
      }

      // 2. Fetch My Reviews
      try {
        const myRes = await api.get("/kpi/reviews/my-reviews");
        if (myRes.data?.success) setMyReviews(myRes.data.reviews || []);
      } catch (err) {
        console.warn("Could not fetch my reviews:", err);
      }

      // 3. Fetch Pending Reviews (for reviewers)
      try {
        const pRes = await api.get("/kpi/reviews/pending-reviews");
        if (pRes.data?.success) setPendingReviews(pRes.data.reviews || []);
      } catch (err) {
        console.warn("Could not fetch pending reviews:", err);
      }

      // 4. Fetch All Reviews & Employees (for HR / Admin / HOD pipeline)
      if (isHRorAdmin || isHOD) {
        try {
          const allRes = await api.get("/kpi/reviews/all");
          if (allRes.data?.success) setAllReviews(allRes.data.reviews || []);
        } catch (err) {
          console.warn("Could not fetch all reviews:", err);
        }

        try {
          const hRes = await api.get("/kpi/reviews/hierarchy-options");
          if (hRes.data?.success) setHierarchyOptions(hRes.data);
        } catch (err) {
          console.warn("Could not fetch hierarchy options:", err);
        }

        // Fetch eligible employees for initiation dropdown
        try {
          const eligRes = await api.get("/kpi/reviews/eligible-employees");
          if (eligRes.data?.success && Array.isArray(eligRes.data.employees)) {
            setAllEmployeesList(eligRes.data.employees);
          } else {
            // Fallback to /employees
            const empRes = await api.get("/employees");
            const raw =
              empRes.data?.data ||
              empRes.data?.employees ||
              (Array.isArray(empRes.data) ? empRes.data : []);
            const normalized = raw.map((e) => ({
              ...e,
              employee_id: e.employee_id || e.employee_code || `EMP-${e.id}`,
              employee_code: e.employee_code || e.employee_id || `EMP-${e.id}`,
              name: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Employee",
              dept: e.dept || e.department || "General",
              department: e.dept || e.department || "General",
              designation: e.designation || "Staff",
              status: e.status || "Active",
              employment_type: e.employment_type || "Permanent",
              reporting_manager: e.reporting_manager || "None",
            }));
            setAllEmployeesList(normalized);
          }
        } catch (err) {
          console.warn("Could not fetch eligible employees:", err);
          try {
            const empRes = await api.get("/employees");
            const raw =
              empRes.data?.data ||
              empRes.data?.employees ||
              (Array.isArray(empRes.data) ? empRes.data : []);
            const normalized = raw.map((e) => ({
              ...e,
              employee_id: e.employee_id || e.employee_code || `EMP-${e.id}`,
              employee_code: e.employee_code || e.employee_id || `EMP-${e.id}`,
              name: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Employee",
              dept: e.dept || e.department || "General",
              department: e.dept || e.department || "General",
              designation: e.designation || "Staff",
              status: e.status || "Active",
              employment_type: e.employment_type || "Permanent",
              reporting_manager: e.reporting_manager || "None",
            }));
            setAllEmployeesList(normalized);
          } catch (e2) {
            console.warn("Fallback failed:", e2);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isHRorAdmin, isHOD]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle Employee selection in Initiate Modal -> Auto-populate cycle & hierarchy
  const handleSelectEmployeeForInitiate = (empCode) => {
    const selectedEmp = allEmployeesList.find(
      (e) => (e.employee_id || e.employee_code) === empCode
    );

    const year = new Date().getFullYear();
    const cycle =
      initiateForm.review_type === "probation"
        ? `6-Month Probation Review (${year})`
        : `Annual Appraisal January (${year})`;

    let autoTl = "";
    let autoMgr = "";
    let autoHod = "";

    if (selectedEmp) {
      const dept = selectedEmp.dept || selectedEmp.department;
      // Find TL in same dept
      const tl = hierarchyOptions.teamLeads.find(
        (u) => u.dept === dept && u.employee_id !== empCode
      );
      if (tl) autoTl = tl.name;

      // Find Manager (reporting manager)
      if (selectedEmp.reporting_manager && selectedEmp.reporting_manager !== "N/A") {
        autoMgr = selectedEmp.reporting_manager;
      } else {
        const mgr = hierarchyOptions.managers.find(
          (u) => u.dept === dept && u.employee_id !== empCode
        );
        if (mgr) autoMgr = mgr.name;
      }

      // Find HOD
      const hod = hierarchyOptions.hods.find(
        (u) => u.dept === dept && u.employee_id !== empCode
      );
      if (hod) autoHod = hod.name;
    }

    setInitiateForm((prev) => ({
      ...prev,
      employee_id: empCode,
      cycle_name: cycle,
      tl_name: autoTl || "None",
      manager_name: autoMgr || "None",
      hod_name: autoHod || "Mr. Biswajit Bag",
    }));
  };

  // Submit Initiate Review
  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    if (!initiateForm.employee_id) {
      toast.error("Please select an employee.");
      return;
    }

    setInitiating(true);
    try {
      const res = await api.post("/kpi/reviews/initiate", initiateForm);
      if (res.data?.success) {
        toast.success(res.data.message || "Review questionnaire initiated successfully!");
        setInitiateModalOpen(false);
        setInitiateForm({
          employee_id: "",
          review_type: "probation",
          cycle_name: "",
          tl_id: "",
          tl_name: "",
          manager_id: "",
          manager_name: "",
          hod_id: "",
          hod_name: "",
        });
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to initiate review.");
    } finally {
      setInitiating(false);
    }
  };

  // Open Review Details or Evaluation Modal
  const openReviewModal = (review, modalType = "view") => {
    setActiveReviewModal(review);
    setActiveModalType(modalType);

    // Pre-populate evaluation answers
    const answersMap = {};
    if (Array.isArray(review.questions)) {
      review.questions.forEach((q) => {
        answersMap[q.id] = {
          self_rating: q.self_rating !== null && q.self_rating !== undefined ? parseFloat(q.self_rating) : 8.0,
          self_comment: q.self_comment || "",
          tl_rating: q.tl_rating !== null && q.tl_rating !== undefined ? parseFloat(q.tl_rating) : (parseFloat(q.self_rating) || 8.0),
          tl_comment: q.tl_comment || "",
          manager_rating: q.manager_rating !== null && q.manager_rating !== undefined ? parseFloat(q.manager_rating) : (parseFloat(q.tl_rating) || parseFloat(q.self_rating) || 8.0),
          manager_comment: q.manager_comment || "",
          hod_rating: q.hod_rating !== null && q.hod_rating !== undefined ? parseFloat(q.hod_rating) : (parseFloat(q.manager_rating) || parseFloat(q.self_rating) || 8.0),
          hod_comment: q.hod_comment || "",
        };
      });
    }
    setEvalAnswers(answersMap);

    // Pre-populate remarks and decisions
    if (modalType === "self") {
      setEvalRemarks(review.self_remarks || "");
    } else if (modalType === "tl") {
      setEvalRecommendation(review.tl_recommendation || "Recommend Confirmation");
      setEvalRemarks(review.tl_remarks || "");
    } else if (modalType === "manager") {
      setEvalRecommendation(review.manager_recommendation || "Recommend Confirmation");
      setEvalRemarks(review.manager_remarks || "");
    } else if (modalType === "hod") {
      setEvalDecision(
        review.hod_decision ||
          (review.review_type === "probation" ? "confirm_permanent" : "recommend_promotion")
      );
      setEvalRemarks(review.hod_remarks || "");
    } else if (modalType === "hr") {
      setEvalDecision(
        review.hr_decision ||
          (review.review_type === "probation" ? (review.hod_decision === "extend_probation_3m" ? "extend_probation_3m" : "confirm_permanent") : "approve_appraisal")
      );
      setEvalRemarks(review.hr_remarks || "");
      setEvalFinalScore(
        review.final_score ||
          review.hod_overall_score ||
          review.manager_overall_score ||
          review.self_overall_score ||
          8.5
      );
    }
  };

  // Submit Self-Rating
  const handleSelfSubmit = async (isFinal) => {
    if (!activeReviewModal) return;
    setSubmittingAction(true);
    try {
      const answersList = Object.keys(evalAnswers).map((qId) => ({
        id: parseInt(qId, 10),
        self_rating: parseFloat(evalAnswers[qId].self_rating) || 8.0,
        self_comment: evalAnswers[qId].self_comment || "",
      }));

      const res = await api.post(`/kpi/reviews/${activeReviewModal.id}/self-submit`, {
        answers: answersList,
        self_remarks: evalRemarks,
        is_final_submit: isFinal,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setActiveReviewModal(null);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit self evaluation");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit TL Review
  const handleTlSubmit = async () => {
    if (!activeReviewModal) return;
    setSubmittingAction(true);
    try {
      const answersList = Object.keys(evalAnswers).map((qId) => ({
        id: parseInt(qId, 10),
        tl_rating: parseFloat(evalAnswers[qId].tl_rating) || 8.0,
        tl_comment: evalAnswers[qId].tl_comment || "",
      }));

      const res = await api.post(`/kpi/reviews/${activeReviewModal.id}/tl-review`, {
        answers: answersList,
        tl_recommendation: evalRecommendation,
        tl_remarks: evalRemarks,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setActiveReviewModal(null);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit TL review");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Manager Review
  const handleManagerSubmit = async () => {
    if (!activeReviewModal) return;
    setSubmittingAction(true);
    try {
      const answersList = Object.keys(evalAnswers).map((qId) => ({
        id: parseInt(qId, 10),
        manager_rating: parseFloat(evalAnswers[qId].manager_rating) || 8.0,
        manager_comment: evalAnswers[qId].manager_comment || "",
      }));

      const res = await api.post(`/kpi/reviews/${activeReviewModal.id}/manager-review`, {
        answers: answersList,
        manager_recommendation: evalRecommendation,
        manager_remarks: evalRemarks,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setActiveReviewModal(null);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit Manager review");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit HOD Approval & Recommendation
  const handleHodSubmit = async () => {
    if (!activeReviewModal) return;
    if (!evalDecision) {
      toast.error("Please select a recommendation decision.");
      return;
    }
    setSubmittingAction(true);
    try {
      const answersList = Object.keys(evalAnswers).map((qId) => ({
        id: parseInt(qId, 10),
        hod_rating: parseFloat(evalAnswers[qId].hod_rating) || 8.0,
        hod_comment: evalAnswers[qId].hod_comment || "",
      }));

      const res = await api.post(`/kpi/reviews/${activeReviewModal.id}/hod-approve`, {
        answers: answersList,
        hod_decision: evalDecision,
        hod_remarks: evalRemarks,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setActiveReviewModal(null);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit HOD approval");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit HR Final Decision
  const handleHrDecisionSubmit = async () => {
    if (!activeReviewModal) return;
    if (!evalDecision) {
      toast.error("Please select an HR final decision.");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.post(`/kpi/reviews/${activeReviewModal.id}/hr-decision`, {
        hr_decision: evalDecision,
        hr_remarks: evalRemarks,
        final_score: parseFloat(evalFinalScore) || 8.5,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setActiveReviewModal(null);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit HR decision");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helper Badge Render
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Pending_Self":
        return <Badge bg="warning" className="text-dark px-2.5 py-1 text-xs font-semibold rounded-pill">1. Pending Employee Self-Rating</Badge>;
      case "Pending_TL":
        return <Badge bg="info" className="px-2.5 py-1 text-xs font-semibold rounded-pill">2. Pending Team Lead Review</Badge>;
      case "Pending_Manager":
        return <Badge bg="primary" className="px-2.5 py-1 text-xs font-semibold rounded-pill">3. Pending Manager Review</Badge>;
      case "Pending_HOD":
        return <Badge bg="dark" className="px-2.5 py-1 text-xs font-semibold rounded-pill">4. Pending HOD Approval</Badge>;
      case "Pending_HR":
        return <Badge bg="danger" className="px-2.5 py-1 text-xs font-semibold rounded-pill">5. Pending HR Final Sign-Off</Badge>;
      case "Confirmed_Permanent":
        return <Badge bg="success" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-emerald-600">🎉 Confirmed Permanent</Badge>;
      case "Probation_Extended_3M":
        return <Badge bg="warning" className="text-dark px-2.5 py-1 text-xs font-semibold rounded-pill bg-amber-400">⚠️ Probation Extended (+3M)</Badge>;
      case "HR_Approved_Appraisal":
        return <Badge bg="success" className="px-2.5 py-1 text-xs font-semibold rounded-pill bg-teal-600">🌟 Appraisal Approved</Badge>;
      case "Rejected":
        return <Badge bg="danger" className="px-2.5 py-1 text-xs font-semibold rounded-pill">❌ Rejected</Badge>;
      default:
        return <Badge bg="secondary" className="px-2.5 py-1 text-xs font-semibold rounded-pill">{status}</Badge>;
    }
  };

  // Filtered List for Pipeline
  const filteredPipelineReviews = useMemo(() => {
    return allReviews.filter((r) => {
      if (filterType !== "All" && r.review_type !== filterType) return false;
      if (filterDept !== "All" && r.department !== filterDept) return false;
      if (filterStatus !== "All" && r.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const empName = (r.employee?.name || "").toLowerCase();
        const empCode = (r.employee_id || "").toLowerCase();
        if (!empName.includes(q) && !empCode.includes(q)) return false;
      }
      return true;
    });
  }, [allReviews, filterType, filterDept, filterStatus, searchQuery]);

  // Active user's current review to answer in "My Questionnaire"
  const currentActiveMyReview = useMemo(() => {
    return myReviews[0] || null;
  }, [myReviews]);

  return (
    <div className="space-y-4">
      {/* ══ TOP NAVIGATION PILLS ══ */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 d-flex flex-wrap justify-between align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-1.5">
          {(isHRorAdmin || isHOD) && (
            <button
              onClick={() => setSubTab("pipeline")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold d-flex align-items-center gap-2 transition-all ${
                subTab === "pipeline"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LuLayers size={14} /> Review Pipeline
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20">
                {allReviews.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setSubTab("my_questionnaire")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold d-flex align-items-center gap-2 transition-all ${
              subTab === "my_questionnaire"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LuFileText size={14} /> My Review Questionnaire
            {myReviews.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-400 text-dark">
                {myReviews.filter((r) => r.status === "Pending_Self").length > 0 ? "Pending" : "Active"}
              </span>
            )}
          </button>

          {(isHOD || isHRorAdmin) && (
            <button
              onClick={() => setSubTab("pending_evaluations")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold d-flex align-items-center gap-2 transition-all ${
                subTab === "pending_evaluations"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LuUserCheck size={14} /> Pending My Evaluation
              {pendingReviews.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white">
                  {pendingReviews.length}
                </span>
              )}
            </button>
          )}
        </div>

        {isHRorAdmin && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setInitiateModalOpen(true)}
            className="d-flex align-items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 border-0 hover:bg-indigo-700 shadow-sm"
          >
            <LuPlus size={14} /> Initiate Review Questionnaire
          </Button>
        )}
      </div>

      {/* ══ TAB 1: REVIEW PIPELINE (HR & HOD VIEW) ══ */}
      {subTab === "pipeline" && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <Row className="g-3">
            <Col xs={12} sm={6} lg={3}>
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm d-flex align-items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Total Reviews
                  </span>
                  <h4 className="text-xl font-bold text-slate-800 m-0 mt-0.5">
                    {allReviews.length}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {allReviews.filter((r) => r.review_type === "probation").length} Probation / {allReviews.filter((r) => r.review_type === "appraisal").length} Appraisal
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <LuLayers size={20} />
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm d-flex align-items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                    In Progression (TL/Mgr/Self)
                  </span>
                  <h4 className="text-xl font-bold text-slate-800 m-0 mt-0.5">
                    {allReviews.filter((r) => ["Pending_Self", "Pending_TL", "Pending_Manager"].includes(r.status)).length}
                  </h4>
                  <span className="text-[10px] text-slate-400">Awaiting multi-tier ratings</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <LuClock size={20} />
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm d-flex align-items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                    Awaiting HOD / HR Approval
                  </span>
                  <h4 className="text-xl font-bold text-slate-800 m-0 mt-0.5">
                    {allReviews.filter((r) => ["Pending_HOD", "Pending_HR"].includes(r.status)).length}
                  </h4>
                  <span className="text-[10px] text-slate-400">Decision & sign-off pending</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                  <LuShieldCheck size={20} />
                </div>
              </div>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm d-flex align-items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                    Confirmed Permanent
                  </span>
                  <h4 className="text-xl font-bold text-slate-800 m-0 mt-0.5">
                    {allReviews.filter((r) => r.status === "Confirmed_Permanent").length}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    +{allReviews.filter((r) => r.status === "Probation_Extended_3M").length} Extended (+3M)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <LuCircleCheck size={20} />
                </div>
              </div>
            </Col>
          </Row>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm d-flex flex-wrap align-items-center justify-between gap-2.5">
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Type Filter */}
              <Form.Select
                size="sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-auto text-xs rounded-xl border-slate-300"
              >
                <option value="All">All Types (Probation & Appraisal)</option>
                <option value="probation">6-Month Probation Review</option>
                <option value="appraisal">Annual Appraisal</option>
              </Form.Select>

              {/* Status Filter */}
              <Form.Select
                size="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-auto text-xs rounded-xl border-slate-300"
              >
                <option value="All">All Statuses</option>
                <option value="Pending_Self">Pending Self-Rating</option>
                <option value="Pending_TL">Pending TL Review</option>
                <option value="Pending_Manager">Pending Manager Review</option>
                <option value="Pending_HOD">Pending HOD Approval</option>
                <option value="Pending_HR">Pending HR Confirmation</option>
                <option value="Confirmed_Permanent">Confirmed Permanent</option>
                <option value="Probation_Extended_3M">Probation Extended (+3M)</option>
                <option value="HR_Approved_Appraisal">Appraisal Approved</option>
              </Form.Select>

              {/* Department Filter */}
              <Form.Select
                size="sm"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-auto text-xs rounded-xl border-slate-300"
              >
                <option value="All">All Departments</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Accounts">Accounts</option>
                <option value="Sales">Sales</option>
                <option value="Engineering">Engineering</option>
              </Form.Select>
            </div>

            {/* Search Input */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search employee name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <LuSearch size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Reviews Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-xs">
                <thead className="bg-slate-50 border-bottom text-slate-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Review Type & Cycle</th>
                    <th className="py-3 px-3">Department & Role</th>
                    <th className="py-3 px-3">Review Hierarchy</th>
                    <th className="py-3 px-3 text-center">Score (Self/Mgr/HOD)</th>
                    <th className="py-3 px-3">Status / Next Stage</th>
                    <th className="py-3 px-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        <Spinner animation="border" size="sm" className="me-2" /> Loading review pipeline...
                      </td>
                    </tr>
                  ) : filteredPipelineReviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        <LuInfo size={28} className="mx-auto mb-2 text-slate-300" />
                        No review records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPipelineReviews.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold d-flex align-items-center justify-between justify-center flex-shrink-0 text-xs">
                              {(r.employee?.name || r.employee_id || "E")[0]}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">
                                {r.employee?.name || r.employee_id}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {r.employee_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            r.review_type === "probation" ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {r.review_type === "probation" ? "6-Month Probation" : "Annual Appraisal"}
                          </span>
                          <div className="text-[11px] font-medium text-slate-600 mt-0.5">
                            {r.cycle_name}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-700">{r.department}</div>
                          <div className="text-[11px] text-slate-400">{r.designation}</div>
                        </td>

                        <td className="py-3 px-3 text-[11px]">
                          <div className="text-slate-600">
                            <strong>TL:</strong> {r.tl_name || "—"}
                          </div>
                          <div className="text-slate-600">
                            <strong>Mgr:</strong> {r.manager_name || "—"}
                          </div>
                          <div className="text-slate-600">
                            <strong>HOD:</strong> {r.hod_name || "—"}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-slate-800">
                            {r.final_score ? (
                              <span className="text-emerald-600 font-bold">{parseFloat(r.final_score).toFixed(1)} / 10 ⭐</span>
                            ) : (
                              <span>
                                {r.self_overall_score ? parseFloat(r.self_overall_score).toFixed(1) : "—"} /{" "}
                                {r.manager_overall_score ? parseFloat(r.manager_overall_score).toFixed(1) : "—"} /{" "}
                                {r.hod_overall_score ? parseFloat(r.hod_overall_score).toFixed(1) : "—"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {renderStatusBadge(r.status)}
                          {r.hod_decision && (
                            <div className="text-[10px] font-semibold text-indigo-600 mt-1">
                              HOD: {r.hod_decision === "confirm_permanent" ? "Recommended Permanent" : "Extend Probation (+3M)"}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-end">
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => openReviewModal(r, "view")}
                              className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg border border-slate-200"
                              title="View Full Questionnaire Dossier"
                            >
                              <LuEye size={14} />
                            </Button>

                            {/* HR Final Action button */}
                            {isHRorAdmin && r.status === "Pending_HR" && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => openReviewModal(r, "hr")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 border-0 shadow-sm"
                              >
                                Sign-Off
                              </Button>
                            )}

                            {/* HOD Action button */}
                            {isHOD && r.status === "Pending_HOD" && (
                              <Button
                                size="sm"
                                variant="dark"
                                onClick={() => openReviewModal(r, "hod")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm"
                              >
                                Approve
                              </Button>
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

      {/* ══ TAB 2: MY REVIEW QUESTIONNAIRE (EMPLOYEE SELF-RATING) ══ */}
      {subTab === "my_questionnaire" && (
        <div className="space-y-4">
          {!currentActiveMyReview ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
              <LuAward size={48} className="mx-auto mb-3 text-slate-300" />
              <h5 className="font-bold text-slate-700 mb-1">No Active Review Questionnaire</h5>
              <p className="text-slate-500 text-xs max-w-md mx-auto mb-4">
                You do not have a pending 6-month probation or annual appraisal questionnaire at this time.
                When HR initiates your cycle, your questionnaire will appear here for self-rating.
              </p>
              {isHRorAdmin && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setInitiateModalOpen(true)}
                  className="rounded-xl px-4 py-2 text-xs font-bold bg-indigo-600 border-0"
                >
                  {/* <LuPlus size={14} className="me-1" />  */}
                  Initiate a Review Questionnaire
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-4 text-white d-flex flex-wrap justify-between align-items-center gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider mb-1">
                    {currentActiveMyReview.review_type === "probation" ? "6-Month Probation Review" : "Annual Appraisal"}
                  </span>
                  <h5 className="font-bold text-white m-0 text-lg">
                    {currentActiveMyReview.cycle_name}
                  </h5>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    Assigned Hierarchy: TL: {currentActiveMyReview.tl_name || "N/A"} → Manager: {currentActiveMyReview.manager_name || "N/A"} → HOD: {currentActiveMyReview.hod_name || "N/A"}
                  </span>
                </div>

                <div className="text-end">
                  {renderStatusBadge(currentActiveMyReview.status)}
                  {currentActiveMyReview.self_overall_score && (
                    <div className="text-xs font-bold text-amber-300 mt-1">
                      Self Score: {parseFloat(currentActiveMyReview.self_overall_score).toFixed(1)} / 5.0 ⭐
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Stepper Visualizer */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="d-flex flex-wrap items-center justify-between text-xs font-semibold text-slate-500 gap-2">
                  <div className={`d-flex align-items-center gap-1.5 ${
                    currentActiveMyReview.status === "Pending_Self" ? "text-amber-600 font-bold" : "text-emerald-600"
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-gray-300 text-black d-flex align-items-center justify-center text-[10px]">1</span>
                    Employee Self-Rating
                  </div>
                  <LuChevronRight size={14} className="text-slate-300" />

                  <div className={`d-flex align-items-center gap-1.5 ${
                    currentActiveMyReview.status === "Pending_TL" ? "text-blue-600 font-bold" : currentActiveMyReview.tl_reviewed_at ? "text-emerald-600" : ""
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-gray-300 text-black d-flex align-items-center justify-center text-[10px]">2</span>
                    Team Lead Review
                  </div>
                  <LuChevronRight size={14} className="text-slate-300" />

                  <div className={`d-flex align-items-center gap-1.5 ${
                    currentActiveMyReview.status === "Pending_Manager" ? "text-purple-600 font-bold" : currentActiveMyReview.manager_reviewed_at ? "text-emerald-600" : ""
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-gray-300 text-black d-flex align-items-center justify-center text-[10px]">3</span>
                    Manager Review
                  </div>
                  <LuChevronRight size={14} className="text-slate-300" />

                  <div className={`d-flex align-items-center gap-1.5 ${
                    currentActiveMyReview.status === "Pending_HOD" ? "text-indigo-600 font-bold" : currentActiveMyReview.hod_approved_at ? "text-emerald-600" : ""
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-gray-300 text-black d-flex align-items-center justify-center text-[10px]">4</span>
                    HOD Approval
                  </div>
                  <LuChevronRight size={14} className="text-slate-300" />

                  <div className={`d-flex align-items-center gap-1.5 ${
                    currentActiveMyReview.status === "Pending_HR" ? "text-rose-600 font-bold" : currentActiveMyReview.hr_completed_at ? "text-emerald-600" : ""
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-gray-300 text-black d-flex align-items-center justify-center text-[10px]">5</span>
                    HR Final Decision
                  </div>
                </div>
              </div>

              {/* Action Button to Open Interactive Evaluation */}
              <div className="d-flex justify-between align-items-center p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xs text-amber-900">
                  {currentActiveMyReview.status === "Pending_Self" ? (
                    <span><strong>Action Required:</strong> Please rate yourself on the 5 performance competency questions below and submit your self-assessment.</span>
                  ) : (
                    <span><strong>Assessment Submitted:</strong> Your questionnaire is currently progressing through the evaluation hierarchy. You can view your answers anytime.</span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => openReviewModal(currentActiveMyReview, currentActiveMyReview.status === "Pending_Self" ? "self" : "view")}
                  className="px-3 py-1.5 !text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 border-0 flex-shrink-0"
                >
                  {currentActiveMyReview.status === "Pending_Self" ? "Start / Complete Self-Rating" : "View My Answers & Dossier"}
                </Button>
              </div>

              {/* Preview of Questions in Set */}
              <div className="space-y-3">
                <h6 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Questionnaire Dimensions ({currentActiveMyReview.questions?.length || 0} Questions)
                </h6>
                {(currentActiveMyReview.questions || []).map((q, idx) => {
                  const questionsList = currentActiveMyReview.questions || [];
                  const isFirstOfCategory = idx === 0 || q.category !== questionsList[idx - 1]?.category;

                  return (
                    <React.Fragment key={q.id}>
                      {isFirstOfCategory && (
                        <div className="bg-gradient-to-r from-slate-100 to-indigo-50/50 p-2.5 rounded-xl border border-slate-200 mt-2 mb-2 d-flex justify-between items-center">
                          <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                            📌 {q.category}
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            Section Weightage: {q.category === "LEADERSHIP SKILLS" ? "40%" : "20%"}
                          </span>
                        </div>
                      )}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all">
                        <div className="d-flex justify-between items-start gap-2 mb-1">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md me-2">
                              {q.category}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {idx + 1}. {q.title}
                            </span>
                          </div>
                          <Badge bg="light" className="text-black border border-slate-200 text-[10px]">
                            Weight: {q.weightage}%
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-500 mb-2">{q.description}</p>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs d-flex flex-wrap justify-between items-center gap-2">
                          <div>
                            <span className="text-slate-400 font-semibold me-2">Your Self-Rating:</span>
                            <span className="font-bold text-amber-600">
                              {q.self_rating ? `${q.self_rating} / 10 (${STAR_LABELS[Math.round(q.self_rating)] || ""})` : "Not rated yet"}
                            </span>
                          </div>
                          {q.self_comment && (
                            <div className="text-slate-600 italic">
                              "{q.self_comment}"
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 3: PENDING MY EVALUATION (FOR TL, MANAGER, HOD, HR) ══ */}
      {subTab === "pending_evaluations" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h6 className="font-bold text-slate-800 text-sm mb-1 d-flex align-items-center gap-2">
              <LuUserCheck size={16} className="text-indigo-600" /> Questionnaires Awaiting Your Review
            </h6>
            <p className="text-xs text-slate-500 mb-4">
              Below are employees in your reporting line or department waiting for your evaluation, grading, and confirmation recommendations.
            </p>

            {pendingReviews.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <LuCircleCheck size={36} className="mx-auto mb-2 text-emerald-500" />
                <h6 className="font-bold text-slate-700">All Caught Up!</h6>
                <p className="text-xs text-slate-500">There are no questionnaires currently pending your evaluation.</p>
              </div>
            ) : (
              <Row className="g-3">
                {pendingReviews.map((rev) => {
                  // Determine what button action to show based on review's current stage and role
                  let actionType = "view";
                  let actionLabel = "View";

                  if (rev.current_stage === "tl") {
                    actionType = "tl";
                    actionLabel = "Evaluate as Team Lead";
                  } else if (rev.current_stage === "manager") {
                    actionType = "manager";
                    actionLabel = "Evaluate as Manager";
                  } else if (rev.current_stage === "hod") {
                    actionType = "hod";
                    actionLabel = "Review & Approve (HOD)";
                  } else if (rev.current_stage === "hr") {
                    actionType = "hr";
                    actionLabel = "HR Final Sign-Off";
                  }

                  return (
                    <Col xs={12} lg={6} key={rev.id}>
                      <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-sm space-y-3">
                        <div className="d-flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 uppercase tracking-wider block mb-1">
                              {rev.review_type === "probation" ? "6-Month Probation Review" : "Annual Appraisal"}
                            </span>
                            <h6 className="font-bold text-slate-800 m-0">
                              {rev.employee?.name || rev.employee_id}
                            </h6>
                            <span className="text-xs text-slate-400">
                              {rev.designation} • {rev.department}
                            </span>
                          </div>
                          {renderStatusBadge(rev.status)}
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1">
                          <div className="d-flex justify-between">
                            <span className="text-slate-500">Cycle:</span>
                            <span className="font-semibold text-slate-700">{rev.cycle_name}</span>
                          </div>
                          <div className="d-flex justify-between">
                            <span className="text-slate-500">Employee Self Score:</span>
                            <span className="font-bold text-amber-600">
                              {rev.self_overall_score ? `${parseFloat(rev.self_overall_score).toFixed(1)} / 10.0 ⭐` : "Pending"}
                            </span>
                          </div>
                          {rev.tl_overall_score && (
                            <div className="d-flex justify-between">
                              <span className="text-slate-500">TL Score:</span>
                              <span className="font-bold text-blue-600">
                                {parseFloat(rev.tl_overall_score).toFixed(1)} / 10.0 ⭐
                              </span>
                            </div>
                          )}
                          {rev.manager_overall_score && (
                            <div className="d-flex justify-between">
                              <span className="text-slate-500">Manager Score:</span>
                              <span className="font-bold text-purple-600">
                                {parseFloat(rev.manager_overall_score).toFixed(1)} / 10.0 ⭐
                              </span>
                            </div>
                          )}
                          {rev.hod_decision && (
                            <div className="d-flex justify-between">
                              <span className="text-slate-500">HOD Recommendation:</span>
                              <span className="font-bold text-indigo-600">
                                {rev.hod_decision === "confirm_permanent" ? "Confirm Permanent" : "Extend Probation (+3M)"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="d-flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            onClick={() => openReviewModal(rev, "view")}
                            className="text-xs font-semibold rounded-xl border border-slate-200"
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openReviewModal(rev, actionType)}
                            className="text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 border-0"
                          >
                            {actionLabel} <LuArrowRight size={14} className="ms-1 inline" />
                          </Button>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: INITIATE REVIEW QUESTIONNAIRE (HR ONLY)                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        show={initiateModalOpen}
        onHide={() => setInitiateModalOpen(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="font-bold text-slate-800 text-base d-flex align-items-center gap-2">
            <LuSparkles size={18} className="text-indigo-600" /> Initiate Review Questionnaire
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInitiateSubmit}>
          <Modal.Body className="space-y-3 pt-2">
            <p className="text-xs text-slate-500 mb-3">
              Initiates the review questionnaire and dispatches it directly to the employee for self-rating.
              Once submitted, it will sequentially flow: <strong>TL → Manager → HOD → HR Final Sign-Off</strong>.
            </p>

            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Review Type *</Form.Label>
                  <Form.Select
                    size="sm"
                    value={initiateForm.review_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const year = new Date().getFullYear();
                      setInitiateForm((prev) => ({
                        ...prev,
                        review_type: type,
                        cycle_name:
                          type === "probation"
                            ? `6-Month Probation Review (${year})`
                            : `Annual Appraisal January (${year})`,
                      }));
                    }}
                    className="text-xs rounded-xl"
                  >
                    <option value="probation">6-Month Probation Review</option>
                    <option value="appraisal">Annual Appraisal</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Select Employee *</Form.Label>
                  <Form.Select
                    size="sm"
                    value={initiateForm.employee_id}
                    onChange={(e) => handleSelectEmployeeForInitiate(e.target.value)}
                    required
                    className="text-xs rounded-xl"
                  >
                    <option value="">-- Select Employee --</option>
                    {allEmployeesList.filter(
                      (e) =>
                        e.employment_type?.toLowerCase() === "probation" ||
                        e.status?.toLowerCase().includes("probation")
                    ).length > 0 && (
                      <optgroup label="⭐ Employees Under Probation (Recommended for 6M Review)">
                        {allEmployeesList
                          .filter(
                            (e) =>
                              e.employment_type?.toLowerCase() === "probation" ||
                              e.status?.toLowerCase().includes("probation")
                          )
                          .map((emp) => (
                            <option
                              key={emp.employee_id || emp.employee_code}
                              value={emp.employee_id || emp.employee_code}
                            >
                              {emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()} ({emp.employee_id || emp.employee_code}) - {emp.dept || emp.department} [{emp.employment_type || emp.status}]
                            </option>
                          ))}
                      </optgroup>
                    )}

                    <optgroup label="📋 All Confirmed / Permanent Employees (For Annual Appraisal / Other)">
                      {allEmployeesList
                        .filter(
                          (e) =>
                            e.employment_type?.toLowerCase() !== "probation" &&
                            !e.status?.toLowerCase().includes("probation")
                        )
                        .map((emp) => (
                          <option
                            key={emp.employee_id || emp.employee_code}
                            value={emp.employee_id || emp.employee_code}
                          >
                            {emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()} ({emp.employee_id || emp.employee_code}) - {emp.dept || emp.department} [{emp.employment_type || emp.status}]
                          </option>
                        ))}
                    </optgroup>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Review Cycle Name *</Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    required
                    value={initiateForm.cycle_name}
                    onChange={(e) => setInitiateForm({ ...initiateForm, cycle_name: e.target.value })}
                    className="text-xs rounded-xl"
                    placeholder="e.g. 6-Month Probation Review (2026)"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Hierarchy Section */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 mt-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Review Hierarchy (Auto-detected with Skip Options)
              </span>

              <Row className="g-2">
                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-semibold text-slate-600">1. Team Lead (TL)</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={initiateForm.tl_name}
                      onChange={(e) => setInitiateForm({ ...initiateForm, tl_name: e.target.value })}
                      placeholder="e.g. Alex Dev or None"
                      className="text-xs rounded-xl"
                    />
                    <Form.Text className="text-[10px] text-slate-400">Leave "None" to skip TL stage</Form.Text>
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-semibold text-slate-600">2. Reporting Manager</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={initiateForm.manager_name}
                      onChange={(e) => setInitiateForm({ ...initiateForm, manager_name: e.target.value })}
                      placeholder="e.g. Sid Nayak or None"
                      className="text-xs rounded-xl"
                    />
                    <Form.Text className="text-[10px] text-slate-400">Leave "None" to skip Manager stage</Form.Text>
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-semibold text-slate-600">3. Department Head (HOD)</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={initiateForm.hod_name}
                      onChange={(e) => setInitiateForm({ ...initiateForm, hod_name: e.target.value })}
                      placeholder="e.g. Biswajit Bag"
                      required
                      className="text-xs rounded-xl"
                    />
                    <Form.Text className="text-[10px] text-slate-400">Required final dept approver</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Questions Set Preview */}
            <div className="mt-3">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                Questionnaire Dimensions (Standard Demo Set: 5 Questions)
              </span>
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 max-h-40 overflow-y-auto space-y-1.5 text-xs text-slate-600">
                {demoQuestions.map((q, idx) => (
                  <div key={q.question_key || idx} className="d-flex justify-between items-center py-1 border-bottom border-slate-100 last:border-0">
                    <span><strong>{idx + 1}. {q.title}</strong> ({q.category})</span>
                    <span className="text-[10px] text-slate-400 font-mono">Weight: {q.weightage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="border-0 pt-0">
            <Button size="sm" variant="light" onClick={() => setInitiateModalOpen(false)} className="rounded-xl px-3 py-1.5 text-xs">
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={initiating} className="rounded-xl px-4 py-1.5 text-xs font-bold bg-indigo-600 border-0">
              {initiating ? "Dispatching..." : "Send Questionnaire to Employee"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: INTERACTIVE EVALUATION & DOSSIER MODAL                     */}
      {/* (Handles Self, TL, Manager, HOD Approval, and HR Final Decision)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        show={!!activeReviewModal}
        onHide={() => setActiveReviewModal(null)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <Modal.Title className="font-bold text-slate-800 text-base d-flex align-items-center gap-2">
              <LuAward size={18} className="text-indigo-600" />
              {activeModalType === "self" && "Employee Self-Rating Questionnaire"}
              {activeModalType === "tl" && "Team Lead Evaluation & Rating"}
              {activeModalType === "manager" && "Manager Evaluation & Rating"}
              {activeModalType === "hod" && "HOD Approval & Confirmation Recommendation"}
              {activeModalType === "hr" && "HR Final Sign-Off & Employment Confirmation"}
              {activeModalType === "view" && "Full Performance Review Dossier"}
            </Modal.Title>
            <span className="text-xs text-slate-500">
              Employee: <strong>{activeReviewModal?.employee?.name || activeReviewModal?.employee_id}</strong> ({activeReviewModal?.employee_id}) • {activeReviewModal?.department} • {activeReviewModal?.cycle_name}
            </span>
          </div>
        </Modal.Header>

        <Modal.Body className="space-y-4 pt-2">
          {/* Status Bar */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 d-flex flex-wrap justify-between items-center gap-2 text-xs">
            <div>
              <strong>Current Stage:</strong> {activeReviewModal?.current_stage?.toUpperCase()} • {renderStatusBadge(activeReviewModal?.status)}
            </div>
            <div>
              <strong>Review Hierarchy:</strong> TL: {activeReviewModal?.tl_name || "None"} → Manager: {activeReviewModal?.manager_name || "None"} → HOD: {activeReviewModal?.hod_name || "None"}
            </div>
          </div>

          {/* Questions Rating Cards */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {(activeReviewModal?.questions || []).map((q, idx) => {
              const currentAns = evalAnswers[q.id] || {};
              const questionsList = activeReviewModal?.questions || [];
              const isFirstOfCategory = idx === 0 || q.category !== questionsList[idx - 1]?.category;

              return (
                <React.Fragment key={q.id}>
                  {isFirstOfCategory && (
                    <div className="bg-gradient-to-r from-slate-100 to-indigo-50/50 p-2.5 rounded-xl border border-slate-200 mt-2 mb-2 d-flex justify-between items-center shadow-xs">
                      <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                        📌 {q.category}
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Section Weightage: {q.category === "LEADERSHIP SKILLS" ? "40%" : "20%"}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-sm">
                    <div className="d-flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md me-2">
                          {q.category}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {idx + 1}. {q.title}
                        </span>
                      </div>
                      <Badge bg="light" className="text-black border border-slate-200 text-[10px]">
                        Weight: {q.weightage}%
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 m-0">{q.description}</p>

                    {/* ── Mode: Employee Self Rating ── */}
                    {activeModalType === "self" && (
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 space-y-2 mt-2">
                        <Row className="g-2 align-items-center">
                          <Col xs={12} sm={5}>
                            <Form.Label className="text-[11px] font-bold text-amber-900 m-0">
                              Your Self-Rating (1-10 Scale):
                            </Form.Label>
                            <Form.Select
                              size="sm"
                              value={currentAns.self_rating || 8.0}
                              onChange={(e) =>
                                setEvalAnswers({
                                  ...evalAnswers,
                                  [q.id]: { ...currentAns, self_rating: parseFloat(e.target.value) },
                                })
                              }
                              className="text-xs rounded-lg mt-1 font-bold text-amber-800"
                            >
                              {RATING_OPTIONS_10.map((opt) => (
                                <option key={opt.val} value={opt.val}>
                                  {opt.label}
                                </option>
                              ))}
                            </Form.Select>
                          </Col>
                          <Col xs={12} sm={7}>
                            <Form.Label className="text-[11px] font-bold text-amber-900 m-0">
                              Self-Justification / Key Contributions:
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              type="text"
                              value={currentAns.self_comment || ""}
                              onChange={(e) =>
                                setEvalAnswers({
                                  ...evalAnswers,
                                  [q.id]: { ...currentAns, self_comment: e.target.value },
                                })
                              }
                              placeholder="Provide brief evidence or examples..."
                              className="text-xs rounded-lg mt-1"
                            />
                          </Col>
                        </Row>
                      </div>
                    )}

                    {/* ── Mode: Team Lead Rating ── */}
                    {activeModalType === "tl" && (
                      <div className="space-y-2 mt-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600">
                          <strong>Employee Self-Rating:</strong> {currentAns.self_rating || q.self_rating || "—"} / 10 • <em>"{q.self_comment || "No comment"}"</em>
                        </div>
                        <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 space-y-2">
                          <Row className="g-2">
                            <Col xs={12} sm={5}>
                              <Form.Label className="text-[11px] font-bold text-blue-900 m-0">TL Rating (1-10 Scale):</Form.Label>
                              <Form.Select
                                size="sm"
                                value={currentAns.tl_rating || 8.0}
                                onChange={(e) =>
                                  setEvalAnswers({
                                    ...evalAnswers,
                                    [q.id]: { ...currentAns, tl_rating: parseFloat(e.target.value) },
                                  })
                                }
                                className="text-xs rounded-lg mt-1 font-bold text-blue-800"
                              >
                                {RATING_OPTIONS_10.map((opt) => (
                                  <option key={opt.val} value={opt.val}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Col>
                            <Col xs={12} sm={7}>
                              <Form.Label className="text-[11px] font-bold text-blue-900 m-0">TL Feedback Remarks:</Form.Label>
                              <Form.Control
                                size="sm"
                                type="text"
                                value={currentAns.tl_comment || ""}
                                onChange={(e) =>
                                  setEvalAnswers({
                                    ...evalAnswers,
                                    [q.id]: { ...currentAns, tl_comment: e.target.value },
                                  })
                                }
                                placeholder="TL observations..."
                                className="text-xs rounded-lg mt-1"
                              />
                            </Col>
                          </Row>
                        </div>
                      </div>
                    )}

                    {/* ── Mode: Manager Rating ── */}
                    {activeModalType === "manager" && (
                      <div className="space-y-2 mt-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 space-y-1">
                          <div><strong>Employee Self:</strong> {q.self_rating || "—"} / 10 • <em>"{q.self_comment || "—"}"</em></div>
                          {q.tl_rating && (
                            <div><strong>TL Rating:</strong> {q.tl_rating} / 10 • <em>"{q.tl_comment || "—"}"</em></div>
                          )}
                        </div>
                        <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200 space-y-2">
                          <Row className="g-2">
                            <Col xs={12} sm={5}>
                              <Form.Label className="text-[11px] font-bold text-purple-900 m-0">Manager Rating (1-10 Scale):</Form.Label>
                              <Form.Select
                                size="sm"
                                value={currentAns.manager_rating || 8.0}
                                onChange={(e) =>
                                  setEvalAnswers({
                                    ...evalAnswers,
                                    [q.id]: { ...currentAns, manager_rating: parseFloat(e.target.value) },
                                  })
                                }
                                className="text-xs rounded-lg mt-1 font-bold text-purple-800"
                              >
                                {RATING_OPTIONS_10.map((opt) => (
                                  <option key={opt.val} value={opt.val}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Col>
                            <Col xs={12} sm={7}>
                              <Form.Label className="text-[11px] font-bold text-purple-900 m-0">Manager Feedback Remarks:</Form.Label>
                              <Form.Control
                                size="sm"
                                type="text"
                                value={currentAns.manager_comment || ""}
                                onChange={(e) =>
                                  setEvalAnswers({
                                    ...evalAnswers,
                                    [q.id]: { ...currentAns, manager_comment: e.target.value },
                                  })
                                }
                                placeholder="Manager observations..."
                                className="text-xs rounded-lg mt-1"
                              />
                            </Col>
                          </Row>
                        </div>
                      </div>
                    )}

                    {/* ── Mode: HOD Approval ── */}
                    {activeModalType === "hod" && (
                      <div className="space-y-2 mt-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 space-y-1">
                          <div><strong>Employee:</strong> {q.self_rating || "—"} / 10 • <em>"{q.self_comment || "—"}"</em></div>
                          {q.tl_rating && <div><strong>TL:</strong> {q.tl_rating} / 10 • <em>"{q.tl_comment || "—"}"</em></div>}
                          {q.manager_rating && <div><strong>Manager:</strong> {q.manager_rating} / 10 • <em>"{q.manager_comment || "—"}"</em></div>}
                        </div>
                        <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200 space-y-2">
                          <Row className="g-2">
                            <Col xs={12} sm={5}>
                              <Form.Label className="text-[11px] font-bold text-indigo-900 m-0">HOD Final Rating (1-10 Scale):</Form.Label>
                              <Form.Select
                                size="sm"
                                value={currentAns.hod_rating || 8.0}
                                onChange={(e) =>
                                  setEvalAnswers({
                                    ...evalAnswers,
                                    [q.id]: { ...currentAns, hod_rating: parseFloat(e.target.value) },
                                  })
                                }
                                className="text-xs rounded-lg mt-1 font-bold text-indigo-800"
                              >
                                {RATING_OPTIONS_10.map((opt) => (
                                  <option key={opt.val} value={opt.val}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Col>
                            <Col xs={12} sm={7}>
                              <Form.Label className="text-[11px] font-bold text-indigo-900 m-0">HOD Feedback Remarks:</Form.Label>
                              <Form.Control
                                size="sm"
                                type="text"
                                value={currentAns.hod_comment || ""}
                                onChange={(e) =>
                                  setEvalAnswers({
                                    ...evalAnswers,
                                    [q.id]: { ...currentAns, hod_comment: e.target.value },
                                  })
                                }
                                placeholder="HOD observations..."
                                className="text-xs rounded-lg mt-1"
                              />
                            </Col>
                          </Row>
                        </div>
                      </div>
                    )}

                  {/* ── Mode: View / HR Sign-Off (Multi-Tier Dossier) ── */}
                  {(activeModalType === "view" || activeModalType === "hr") && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1 text-xs">
                      <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 block uppercase">1. Employee Self</span>
                        <div className="font-bold text-amber-900">{q.self_rating ? `${q.self_rating} ⭐` : "—"}</div>
                        <div className="text-[11px] text-slate-600 italic">{q.self_comment || "No remarks"}</div>
                      </div>

                      <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                        <span className="text-[10px] font-bold text-blue-800 block uppercase">2. Team Lead</span>
                        <div className="font-bold text-blue-900">{q.tl_rating ? `${q.tl_rating} ⭐` : "—"}</div>
                        <div className="text-[11px] text-slate-600 italic">{q.tl_comment || "No remarks"}</div>
                      </div>

                      <div className="bg-purple-50/70 p-2 rounded-lg border border-purple-200">
                        <span className="text-[10px] font-bold text-purple-800 block uppercase">3. Manager</span>
                        <div className="font-bold text-purple-900">{q.manager_rating ? `${q.manager_rating} ⭐` : "—"}</div>
                        <div className="text-[11px] text-slate-600 italic">{q.manager_comment || "No remarks"}</div>
                      </div>

                      <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-200">
                        <span className="text-[10px] font-bold text-indigo-800 block uppercase">4. HOD Final</span>
                        <div className="font-bold text-indigo-900">{q.hod_rating ? `${q.hod_rating} ⭐` : "—"}</div>
                        <div className="text-[11px] text-slate-600 italic">{q.hod_comment || "No remarks"}</div>
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          </div>

          {/* ── Summary & Recommendation Decision Panels ── */}

          {/* HOD Recommendation Decision Box */}
          {activeModalType === "hod" && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3.5 rounded-2xl border border-indigo-200 space-y-3">
              <span className="font-bold text-indigo-950 text-xs uppercase tracking-wider block">
                HOD Decision & Employment Recommendation (To HR) *
              </span>

              {activeReviewModal?.review_type === "probation" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    evalDecision === "confirm_permanent"
                      ? "bg-emerald-50 border-emerald-500 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="hod_decision"
                      value="confirm_permanent"
                      checked={evalDecision === "confirm_permanent"}
                      onChange={(e) => setEvalDecision(e.target.value)}
                      className="me-2"
                    />
                    <strong className="text-emerald-800 text-xs">Confirm Employment (Permanent)</strong>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      Employee has met and exceeded performance standards during 6 months probation. Recommends permanent appointment to HR.
                    </p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    evalDecision === "extend_probation_3m"
                      ? "bg-amber-50 border-amber-500 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="hod_decision"
                      value="extend_probation_3m"
                      checked={evalDecision === "extend_probation_3m"}
                      onChange={(e) => setEvalDecision(e.target.value)}
                      className="me-2"
                    />
                    <strong className="text-amber-800 text-xs">Assign 3 Months Probation Extension</strong>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      Employee needs further improvement in deliverables. Extends probation by 3 months for performance revising.
                    </p>
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "recommend_promotion" ? "bg-emerald-50 border-emerald-500 font-bold" : "bg-white"
                  }`}>
                    <input type="radio" name="hod_appr" value="recommend_promotion" checked={evalDecision === "recommend_promotion"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    Recommend Promotion & Top Hike
                  </label>
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "recommend_increment" ? "bg-indigo-50 border-indigo-500 font-bold" : "bg-white"
                  }`}>
                    <input type="radio" name="hod_appr" value="recommend_increment" checked={evalDecision === "recommend_increment"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    Standard Annual Increment
                  </label>
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "needs_pip" ? "bg-rose-50 border-rose-500 font-bold" : "bg-white"
                  }`}>
                    <input type="radio" name="hod_appr" value="needs_pip" checked={evalDecision === "needs_pip"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    Needs Improvement Plan (PIP)
                  </label>
                </div>
              )}

              <Form.Group>
                <Form.Label className="text-[11px] font-bold text-slate-700">HOD Remarks to HR *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={evalRemarks}
                  onChange={(e) => setEvalRemarks(e.target.value)}
                  placeholder="HOD comprehensive feedback & recommendation statement..."
                  className="text-xs rounded-xl"
                />
              </Form.Group>
            </div>
          )}

          {/* HR Final Decision Box */}
          {activeModalType === "hr" && (
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-3.5 rounded-2xl border border-rose-200 space-y-3">
              <span className="font-bold text-rose-950 text-xs uppercase tracking-wider block">
                HR Final Employment Action & System Sign-Off *
              </span>

              {activeReviewModal?.review_type === "probation" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "confirm_permanent" ? "bg-emerald-50 border-emerald-500 font-bold text-emerald-800" : "bg-white"
                  }`}>
                    <input type="radio" name="hr_dec" value="confirm_permanent" checked={evalDecision === "confirm_permanent"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    🎉 Confirm Permanent Employment
                  </label>
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "extend_probation_3m" ? "bg-amber-50 border-amber-500 font-bold text-amber-800" : "bg-white"
                  }`}>
                    <input type="radio" name="hr_dec" value="extend_probation_3m" checked={evalDecision === "extend_probation_3m"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    ⚠️ Extend Probation (+3 Months)
                  </label>
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "reject" ? "bg-rose-50 border-rose-500 font-bold text-rose-800" : "bg-white"
                  }`}>
                    <input type="radio" name="hr_dec" value="reject" checked={evalDecision === "reject"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    ❌ Reject Confirmation
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "approve_appraisal" ? "bg-emerald-50 border-emerald-500 font-bold text-emerald-800" : "bg-white"
                  }`}>
                    <input type="radio" name="hr_dec_appr" value="approve_appraisal" checked={evalDecision === "approve_appraisal"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    🌟 Approve Annual Appraisal & Hike
                  </label>
                  <label className={`p-2.5 rounded-xl border cursor-pointer text-xs ${
                    evalDecision === "reject" ? "bg-rose-50 border-rose-500 font-bold text-rose-800" : "bg-white"
                  }`}>
                    <input type="radio" name="hr_dec_appr" value="reject" checked={evalDecision === "reject"} onChange={(e) => setEvalDecision(e.target.value)} className="me-1.5" />
                    Defer / Reject Appraisal
                  </label>
                </div>
              )}

              <Row className="g-2">
                <Col xs={12} sm={4}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-bold text-slate-700">Official Calibrated Score (1-10 Scale):</Form.Label>
                    <Form.Control
                      size="sm"
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={evalFinalScore}
                      onChange={(e) => setEvalFinalScore(e.target.value)}
                      className="text-xs rounded-xl font-bold"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Group>
                    <Form.Label className="text-[11px] font-bold text-slate-700">HR Administrative Remarks:</Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={evalRemarks}
                      onChange={(e) => setEvalRemarks(e.target.value)}
                      placeholder="Official HR confirmation notes..."
                      className="text-xs rounded-xl"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}

          {/* Self Remarks Box (For Self-Evaluation) */}
          {activeModalType === "self" && (
            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Overall Self-Assessment Summary Statement</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={evalRemarks}
                onChange={(e) => setEvalRemarks(e.target.value)}
                placeholder="Summarize your key achievements during the probation/appraisal cycle..."
                className="text-xs rounded-xl"
              />
            </Form.Group>
          )}

          {/* TL / Manager Remarks Box */}
          {(activeModalType === "tl" || activeModalType === "manager") && (
            <Row className="g-2">
              <Col xs={12} sm={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Overall Recommendation</Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    value={evalRecommendation}
                    onChange={(e) => setEvalRecommendation(e.target.value)}
                    placeholder="e.g. Strongly Recommend Confirmation"
                    className="text-xs rounded-xl"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-bold text-slate-700">Overall Review Remarks</Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    value={evalRemarks}
                    onChange={(e) => setEvalRemarks(e.target.value)}
                    placeholder="General observations..."
                    className="text-xs rounded-xl"
                  />
                </Form.Group>
              </Col>
            </Row>
          )}
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button size="sm" variant="light" onClick={() => setActiveReviewModal(null)} className="rounded-xl px-3 py-1.5 text-xs">
            Close
          </Button>

          {activeModalType === "self" && (
            <>
              <Button size="sm" variant="outline-primary" onClick={() => handleSelfSubmit(false)} disabled={submittingAction} className="rounded-xl px-3 py-1.5 text-xs">
                Save Draft
              </Button>
              <Button size="sm" variant="primary" onClick={() => handleSelfSubmit(true)} disabled={submittingAction} className="rounded-xl px-4 py-1.5 text-xs font-bold bg-indigo-600 border-0">
                {submittingAction ? "Submitting..." : "Submit to Reviewers (TL/Manager/HOD)"}
              </Button>
            </>
          )}

          {activeModalType === "tl" && (
            <Button size="sm" variant="primary" onClick={handleTlSubmit} disabled={submittingAction} className="rounded-xl px-4 py-1.5 text-xs font-bold bg-blue-600 border-0">
              {submittingAction ? "Submitting..." : "Submit TL Review (Advance to Manager/HOD)"}
            </Button>
          )}

          {activeModalType === "manager" && (
            <Button size="sm" variant="primary" onClick={handleManagerSubmit} disabled={submittingAction} className="rounded-xl px-4 py-1.5 text-xs font-bold bg-purple-600 border-0">
              {submittingAction ? "Submitting..." : "Submit Manager Review (Advance to HOD)"}
            </Button>
          )}

          {activeModalType === "hod" && (
            <Button size="sm" variant="primary" onClick={handleHodSubmit} disabled={submittingAction} className="rounded-xl px-4 py-1.5 text-xs font-bold bg-indigo-600 border-0">
              {submittingAction ? "Submitting..." : "Approve & Send to HR for Final Sign-Off"}
            </Button>
          )}

          {activeModalType === "hr" && (
            <Button size="sm" variant="danger" onClick={handleHrDecisionSubmit} disabled={submittingAction} className="rounded-xl px-4 py-1.5 text-xs font-bold bg-rose-600 border-0">
              {submittingAction ? "Executing..." : "Confirm & Execute Final HR Action"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
