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
  ProgressBar,
} from "react-bootstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuUser,
  LuCalendar,
  LuClock,
  LuVideo,
  LuBriefcase,
  LuBuilding2,
  LuGraduationCap,
  LuStar,
  LuCircleCheck,
  LuTriangleAlert,
  LuFileText,
  LuArrowLeft,
  LuSearch,
  LuPrinter,
  LuBadgeCheck,
  LuAward,
  LuSparkles,
  LuThumbsUp,
  LuThumbsDown,
  LuCirclePause,
  LuSend,
  LuExternalLink,
  LuDownload,
  LuUsers,
  LuCheck,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api";

// ── ROUND METADATA & CONSTANTS ──────────────────────────────────────────────────
const ROUNDS = [
  {
    key: "ROUND_1_HR",
    label: "Round 1 — HR Screening",
    shortLabel: "Round 1 (HR)",
    ownerRole: "hr",
    description: "Initial screening on communication, personal conduct, background & role fitment.",
  },
  {
    key: "ROUND_2_TECH",
    label: "Round 2 — Technical (HOD)",
    shortLabel: "Round 2 (Tech)",
    ownerRole: "hod",
    description: "Deep dive technical evaluation, domain mastery, analytical capability & problem solving.",
  },
  {
    key: "ROUND_3_FINAL",
    label: "Round 3 — Final Round",
    shortLabel: "Round 3 (Final)",
    ownerRole: "all",
    description: "Leadership fitment, strategic contribution, cultural alignment & final offer recommendation.",
  },
];

const JOB_ROLE_OPTIONS = [
  { value: "high", label: "High — Exceeds Job Expectations & Core Competencies", badgeColor: "success" },
  { value: "satisfactory", label: "Satisfactory — Meets Role Requirements & Standards", badgeColor: "primary" },
  { value: "poor", label: "Poor — Below Expected Level / Notable Skill Gap", badgeColor: "danger" },
];

const RECOMMENDATION_OPTIONS = [
  { value: "NEXT_ROUND", label: "Advance to Next Round", icon: <LuSend />, color: "primary" },
  { value: "SELECTED", label: "Shortlist / Recommend Offer", icon: <LuThumbsUp />, color: "success" },
  { value: "HOLD", label: "Keep on Hold", icon: <LuCirclePause />, color: "warning" },
  { value: "REJECTED", label: "Reject Candidate", icon: <LuThumbsDown />, color: "danger" },
];

export default function InterviewForm() {
  const navigate = useNavigate();
  const { candidateId: routeCandidateId } = useParams();
  const location = useLocation();

  // Active Evaluator Role & Identity
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const rawRole = (localStorage.getItem("role") || storedUser.role || "").toLowerCase();
  const designation = (storedUser.designation || "").toLowerCase();
  const isHodRole =
    ["hod", "manager", "department head"].includes(rawRole) ||
    designation.includes("hod") ||
    designation.includes("head") ||
    designation.includes("manager");
  const isHR = ["hr", "admin", "hrmanager"].includes(rawRole);
  const isHOD = isHodRole && !isHR;

  // Active Tabs: "evaluation" or "reports"
  const [activeTab, setActiveTab] = useState("evaluation");

  // Candidates list & selection
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loadingCandidateDetails, setLoadingCandidateDetails] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");

  // Resume Modal
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Form State: 4 Core Evaluation Criteria + Feedback
  const [evalRound, setEvalRound] = useState("ROUND_1_HR");
  const [formData, setFormData] = useState({
    personal_appearance_and_behaviour: "",
    personal_appearance_rating: 4,
    domain_knowledge: "",
    domain_knowledge_rating: 4,
    education: "",
    education_rating: 4,
    job_role: "satisfactory", // "satisfactory" | "high" | "poor"
    detailed_feedback: "",
    recommendation: "NEXT_ROUND",
    next_interview_date: "",
    next_interview_time: "11:00 AM",
    next_interview_mode: "Online (Google Meet)",
    next_interview_link: "",
  });
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);

  // Load candidate list from backend
  const fetchCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true);
      const res = await api.get("/recruitment/candidates");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCandidates(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load recruitment candidates:", err);
      toast.error("Could not load candidate list.");
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Load single candidate details when candidateId changes or route params exist
  const loadCandidateById = useCallback(async (id, fallbackCandidate = null) => {
    if (!id) {
      if (fallbackCandidate) setSelectedCandidate(fallbackCandidate);
      return;
    }
    try {
      setLoadingCandidateDetails(true);
      const res = await api.get(`/recruitment/candidates/${id}`);
      if (res.data?.success && res.data.data) {
        setSelectedCandidate(res.data.data);
      } else if (fallbackCandidate) {
        setSelectedCandidate(fallbackCandidate);
      }
    } catch (err) {
      console.warn("Could not load candidate by ID, using state fallback:", err.message);
      if (fallbackCandidate) setSelectedCandidate(fallbackCandidate);
    } finally {
      setLoadingCandidateDetails(false);
    }
  }, []);

  // Initial candidate resolution from route or state
  useEffect(() => {
    const targetId = routeCandidateId || location.state?.candidateId || location.state?.candidate?.id;
    const fallback = location.state?.candidate || location.state?.prefillCandidate;
    if (targetId) {
      loadCandidateById(targetId, fallback);
    } else if (fallback) {
      setSelectedCandidate(fallback);
    } else if (candidates.length > 0 && !selectedCandidate) {
      // Pick first candidate in scheduled or interview pipeline
      const scheduledOne = candidates.find(
        (c) =>
          c.interview_stage &&
          ["SCHEDULED", "ROUND_1_HR", "ROUND_2_TECH", "ROUND_3_FINAL", "INTERVIEW_REQUESTED"].includes(
            c.interview_stage
          )
      ) || candidates[0];
      setSelectedCandidate(scheduledOne);
    }
  }, [routeCandidateId, location.state, candidates, loadCandidateById, selectedCandidate]);

  // Auto-sync evaluation round with candidate's scheduled stage
  useEffect(() => {
    if (selectedCandidate?.interview_stage) {
      const stage = selectedCandidate.interview_stage;
      if (["ROUND_1_HR", "SCHEDULED", "INTERVIEW_REQUESTED"].includes(stage)) {
        setEvalRound("ROUND_1_HR");
      } else if (stage === "ROUND_2_TECH") {
        setEvalRound("ROUND_2_TECH");
      } else if (stage === "ROUND_3_FINAL") {
        setEvalRound("ROUND_3_FINAL");
      }
    }
  }, [selectedCandidate]);

  // Pre-fill form if an existing evaluation for this round is recorded
  useEffect(() => {
    if (selectedCandidate?.interview_evaluations && Array.isArray(selectedCandidate.interview_evaluations)) {
      const existing = selectedCandidate.interview_evaluations.find((e) => e.round === evalRound);
      if (existing) {
        setFormData({
          personal_appearance_and_behaviour: existing.personal_appearance_and_behaviour || "",
          personal_appearance_rating: existing.personal_appearance_rating || 4,
          domain_knowledge: existing.domain_knowledge || "",
          domain_knowledge_rating: existing.domain_knowledge_rating || 4,
          education: existing.education || "",
          education_rating: existing.education_rating || 4,
          job_role: existing.job_role || "satisfactory",
          detailed_feedback: existing.detailed_feedback || "",
          recommendation: existing.recommendation || "NEXT_ROUND",
          next_interview_date: "",
          next_interview_time: "11:00 AM",
          next_interview_mode: "Online (Google Meet)",
          next_interview_link: "",
        });
        return;
      }
    }
    // Default reset when switching round without previous review
    setFormData((prev) => ({
      ...prev,
      personal_appearance_and_behaviour: "",
      personal_appearance_rating: 4,
      domain_knowledge: "",
      domain_knowledge_rating: 4,
      education: "",
      education_rating: 4,
      job_role: "satisfactory",
      detailed_feedback: "",
      recommendation: evalRound === "ROUND_3_FINAL" ? "SELECTED" : "NEXT_ROUND",
    }));
  }, [selectedCandidate, evalRound]);

  // Handle Form Submission
  const handleSubmitEvaluation = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCandidate?.id) {
      toast.error("Please select a valid candidate for evaluation.");
      return;
    }
    if (!formData.job_role) {
      toast.error("Please select the candidate's Job Role fitment (High / Satisfactory / Poor).");
      return;
    }

    try {
      setSubmittingEvaluation(true);
      const payload = {
        round: evalRound,
        ...formData,
      };

      const res = await api.post(`/recruitment/candidates/${selectedCandidate.id}/evaluation`, payload);

      if (res.data?.success) {
        toast.success(`Evaluation recorded successfully for ${ROUND_LABEL(evalRound)}!`);
        // Refresh candidate data
        await loadCandidateById(selectedCandidate.id);
        await fetchCandidates();
        // Switch to reports tab to view updated evaluation report
        setActiveTab("reports");
      }
    } catch (err) {
      console.error("Evaluation submission error:", err);
      toast.error(err.response?.data?.error || "Failed to submit candidate evaluation.");
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  // Helper Labels & Badges
  const ROUND_LABEL = (key) => {
    const found = ROUNDS.find((r) => r.key === key);
    return found ? found.label : key || "Interview Session";
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case "ROUND_1_HR":
        return <Badge bg="primary">Round 1 (HR Screening)</Badge>;
      case "ROUND_2_TECH":
        return <Badge bg="info" className="text-dark">Round 2 (Technical - HOD)</Badge>;
      case "ROUND_3_FINAL":
        return <Badge bg="purple" style={{ backgroundColor: "#8b5cf6" }}>Round 3 (Final)</Badge>;
      case "SELECTED":
        return <Badge bg="success">Selected / Offer</Badge>;
      case "REJECTED":
        return <Badge bg="danger">Rejected</Badge>;
      case "ON_HOLD":
        return <Badge bg="warning" className="text-dark">On Hold</Badge>;
      case "SCHEDULED":
        return <Badge bg="primary">Interview Scheduled</Badge>;
      default:
        return <Badge bg="secondary">{stage || "Pending"}</Badge>;
    }
  };

  // Candidate evaluations list
  const candidateEvaluations = useMemo(() => {
    return Array.isArray(selectedCandidate?.interview_evaluations)
      ? selectedCandidate.interview_evaluations
      : [];
  }, [selectedCandidate]);

  // Overall Score Calculation (Average across completed evaluations)
  const averageCandidateScore = useMemo(() => {
    if (!candidateEvaluations.length) return null;
    const sum = candidateEvaluations.reduce((acc, curr) => acc + (Number(curr.overall_score) || 0), 0);
    return Math.round(sum / candidateEvaluations.length);
  }, [candidateEvaluations]);

  // Filter candidates for search
  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates;
    const q = candidateSearch.toLowerCase();
    return candidates.filter(
      (c) =>
        c.candidate_name?.toLowerCase().includes(q) ||
        c.requisition?.position?.toLowerCase().includes(q) ||
        c.requisition?.department?.toLowerCase().includes(q) ||
        c.current_designation?.toLowerCase().includes(q)
    );
  }, [candidates, candidateSearch]);

  return (
    <div className="interview-assessment-page bg-slate-50 min-vh-100 py-4 px-3 px-md-4">
      <Container fluid="xl">
        {/* ── TOP HEADER / BREADCRUMB ─────────────────────────────────── */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            {/* <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => navigate("/recruitment")}
              className="d-flex align-items-center gap-1.5 text-xs rounded-2 bg-white shadow-xs"
            >
              <LuArrowLeft size={14} /> Back to Recruitment
            </Button> */}
            <div>
              <h4 className="fs-5 fw-bold text-slate-900 mb-0 d-flex align-items-center gap-2">
                <LuAward className="text-indigo-600" /> Candidate Interview Assessment
              </h4>
              <p className="text-slate-500 text-xs mb-0">
                Dynamic Candidate Evaluation · Multi-Round Feedback · Candidate Dossier
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="text-end me-1 d-none d-sm-block">
              <div className="fw-semibold text-xs text-slate-800">{storedUser.name || "Panel Member"}</div>
              <div className="text-xs text-slate-500">
                {isHR ? "HR Operations Panel" : isHOD ? "HOD Technical Panel" : "Assessment Committee"}
              </div>
            </div>
            <Badge
              bg={isHR ? "primary" : isHOD ? "warning" : "info"}
              className={`text-xs px-2.5 py-1.5 rounded-pill ${isHOD ? "text-dark" : ""}`}
            >
              {isHR ? "HR Mode" : isHOD ? "HOD Panel" : "Admin Review"}
            </Badge>
          </div>
        </div>

        {/* ── CANDIDATE SELECTOR QUICK SWITCHER BAR ───────────────────── */}
        <Card className="border-slate-200 shadow-xs mb-3.5 rounded-3 bg-white">
          <Card.Body className="py-2 px-3">
            <Row className="align-items-center g-2">
              <Col md={4} sm={6}>
                <div className="d-flex align-items-center gap-2">
                  <LuUsers className="text-indigo-600 fs-6 flex-shrink-0" />
                  <div className="w-100">
                    <Form.Select
                      size="sm"
                      value={selectedCandidate?.id || ""}
                      onChange={(e) => {
                        const target = candidates.find((c) => c.id === e.target.value);
                        if (target) setSelectedCandidate(target);
                      }}
                      className="border-slate-300 !text-xs rounded-2 fw-medium"
                    >
                      <option value="" disabled>
                        {loadingCandidates ? "Loading candidates..." : "Select candidate to evaluate..."}
                      </option>
                      {candidates.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.candidate_name} — {cand.requisition?.position || "Role"} (
                          {cand.interview_stage || "Pending"})
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
              </Col>

              <Col md={4} sm={6}>
                <div className="position-relative">
                  <LuSearch
                    size={13}
                    className="text-slate-400 position-absolute"
                    style={{ left: 10, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Search candidate by name, role, dept..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="border-slate-300 !text-xs rounded-2 ps-4"
                  />
                </div>
              </Col>

              <Col md={4} className="text-md-end text-sm-start text-xs text-slate-500">
                <span>Active Pipeline: </span>
                <strong className="text-slate-800">{candidates.length} candidates</strong>
                {selectedCandidate && (
                  <span className="ms-2 badge bg-indigo-50 text-black border border-indigo-200">
                    Code: {selectedCandidate.requisition?.requisition_code || "N/A"}
                  </span>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── MAIN NAVIGATION TABS ────────────────────────────────────── */}
        <Nav variant="tabs" className="border-slate-200 mb-3.5 fs-7 fw-semibold">
          <Nav.Item>
            <Nav.Link
              active={activeTab === "evaluation"}
              onClick={() => setActiveTab("evaluation")}
              className={`d-flex align-items-center gap-2 cursor-pointer ${
                activeTab === "evaluation" ? "text-indigo-600 border-indigo-600 fw-bold" : "text-slate-600"
              }`}
            >
              <LuFileText size={15} /> Candidate Evaluation Form
            </Nav.Link>
          </Nav.Item>

          <Nav.Item>
            <Nav.Link
              active={activeTab === "reports"}
              onClick={() => setActiveTab("reports")}
              className={`d-flex align-items-center gap-2 cursor-pointer ${
                activeTab === "reports" ? "text-indigo-600 border-indigo-600 fw-bold" : "text-slate-600"
              }`}
            >
              <LuBadgeCheck size={15} /> Detailed Reports & Assessment Dossier
              {candidateEvaluations.length > 0 && (
                <span className="badge bg-indigo-100 text-indigo-700 rounded-pill ms-1 text-2xs">
                  {candidateEvaluations.length} {candidateEvaluations.length === 1 ? "round" : "rounds"}
                </span>
              )}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {loadingCandidateDetails && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-xs text-slate-500 mt-2">Loading candidate profile...</p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: CANDIDATE EVALUATION FORM                             */}
        {/* ───────────────────────────────────────────────────────────── */}
        {!loadingCandidateDetails && activeTab === "evaluation" && (
          <div>
            {selectedCandidate ? (
              <Row className="g-3.5">
                {/* LEFT COLUMN: CANDIDATE PRE-FILLED PROFILE DOSSIER */}
                <Col lg={4}>
                  <Card className="border-slate-200 shadow-xs rounded-3 bg-white sticky-top z-0" style={{ top: 20 }}>
                    <Card.Header className="bg-slate-50 border-bottom border-slate-200 py-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="fs-7 fw-bold text-slate-800 d-flex align-items-center gap-2">
                          <LuUser className="text-indigo-600" /> Candidate Profile
                        </span>
                        {getStageBadge(selectedCandidate.interview_stage)}
                      </div>
                    </Card.Header>

                    <Card.Body className="p-3 text-xs">
                      {/* Name & Initials */}
                      <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom border-slate-100">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white bg-indigo-600 shadow-xs flex-shrink-0"
                          style={{ width: 44, height: 44, fontSize: 16 }}
                        >
                          {(selectedCandidate.candidate_name || "C").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h6 className="fw-bold text-slate-900 mb-0 fs-6">
                            {selectedCandidate.candidate_name}
                          </h6>
                          <div className="text-slate-500">
                            {selectedCandidate.current_designation || "Applicant"} •{" "}
                            {selectedCandidate.current_company || "Direct Applicant"}
                          </div>
                        </div>
                      </div>

                      {/* Applied Role & Department */}
                      <div className="mb-2.5 pb-2.5 border-bottom border-slate-100">
                        <div className="text-2xs text-slate-400 uppercase font-semibold">Applied Position</div>
                        <div className="fw-semibold text-slate-800 fs-7 mt-0.5">
                          {selectedCandidate.requisition?.position || "General Position"}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <Badge bg="light" className="text-black border border-slate-200 d-flex items-center">
                            <LuBuilding2 size={11} className="me-1" />
                            {selectedCandidate.requisition?.department || "General"}
                          </Badge>
                          <Badge bg="light" className="text-black border border-slate-200 w-auto">
                            {selectedCandidate.requisition?.requisition_code || "REQ-CODE"}
                          </Badge>
                        </div>
                      </div>

                      {/* Contact & Experience */}
                      <div className="mb-2.5 pb-2.5 border-bottom border-slate-100">
                        <div className="text-2xs text-slate-400 uppercase font-semibold">Experience & Notice</div>
                        <div className="d-flex justify-content-between text-slate-700 mt-1">
                          <span>Total Experience:</span>
                          <strong className="text-slate-900">{selectedCandidate.experience_years || "N/A"}</strong>
                        </div>
                        <div className="d-flex justify-content-between text-slate-700 mt-1">
                          <span>Notice Period:</span>
                          <strong className="text-slate-900">{selectedCandidate.notice_period || "30 Days"}</strong>
                        </div>
                      </div>

                      {/* CTC Details */}
                      <div className="mb-2.5 pb-2.5 border-bottom border-slate-100">
                        <div className="text-2xs text-slate-400 uppercase font-semibold">Salary Expectations</div>
                        <div className="d-flex justify-content-between text-slate-700 mt-1">
                          <span>Current CTC:</span>
                          <strong className="text-slate-900">
                            {selectedCandidate.current_ctc ? `₹${selectedCandidate.current_ctc}` : "Undisclosed"}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between text-slate-700 mt-1">
                          <span>Expected CTC:</span>
                          <strong className="text-emerald-700">
                            {selectedCandidate.expected_ctc ? `₹${selectedCandidate.expected_ctc}` : "As per budget"}
                          </strong>
                        </div>
                      </div>

                      {/* Scheduled Meeting Info */}
                      <div className="mb-3 bg-slate-50 p-2.5 rounded-2 border border-slate-200">
                        <div className="fw-semibold text-slate-800 mb-1 d-flex align-items-center gap-1.5">
                          <LuCalendar size={13} className="text-indigo-600" /> Scheduled Meeting
                        </div>
                        <div className="text-slate-600">
                          Date: <strong>{selectedCandidate.interview_date || "Not set yet"}</strong>
                        </div>
                        <div className="text-slate-600">
                          Time: <strong>{selectedCandidate.interview_time || "11:00 AM"}</strong>
                        </div>
                        <div className="text-slate-600">
                          Mode: <strong>{selectedCandidate.interview_mode || "Online"}</strong>
                        </div>

                        {selectedCandidate.interview_meeting_link && (
                          <div className="mt-1.5 pt-1.5 border-top border-slate-200">
                            {selectedCandidate.interview_meeting_link.startsWith("http") ? (
                              <a
                                href={selectedCandidate.interview_meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 d-inline-flex align-items-center gap-1 text-2xs fw-semibold"
                              >
                                <LuVideo size={12} /> Open Meeting Link
                              </a>
                            ) : (
                              <span className="text-2xs text-slate-500">
                                Room: {selectedCandidate.interview_meeting_link}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resume & Notes Actions */}
                      <div className="d-grid gap-2">
                        {selectedCandidate.resume_url ? (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => setShowResumeModal(true)}
                            className="text-xs d-flex align-items-center justify-content-center gap-1.5"
                          >
                            <LuFileText size={13} /> View Attached Resume
                          </Button>
                        ) : (
                          <div className="text-slate-400 text-2xs text-center py-1">
                            No resume file uploaded for this candidate
                          </div>
                        )}
                      </div>

                      {/* HOD Feedback note */}
                      {selectedCandidate.hod_feedback && (
                        <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-2 text-2xs text-emerald-800">
                          <strong>HOD Shortlist Note:</strong> {selectedCandidate.hod_feedback}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                {/* RIGHT COLUMN: EVALUATION FORM */}
                <Col lg={8}>
                  <Card className="border-slate-200 shadow-xs rounded-3 bg-white">
                    <Card.Header className="bg-white border-bottom border-slate-200 py-3">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div>
                          <h5 className="fs-6 fw-bold text-slate-900 mb-0 d-flex align-items-center gap-2">
                            <LuSparkles className="text-amber-500" /> Evaluation Feedback Panel
                          </h5>
                          <span className="text-slate-500 text-xs">
                            Provide structured feedback on candidate performance across the 4 key criteria.
                          </span>
                        </div>

                        {/* Round Switcher Pills */}
                        <div className="d-flex align-items-center gap-1 bg-slate-100 p-1 rounded-2">
                          {ROUNDS.map((r) => (
                            <button
                              key={r.key}
                              type="button"
                              onClick={() => setEvalRound(r.key)}
                              className={`btn btn-sm text-xs py-1 px-2.5 rounded-2 border-0 fw-semibold transition-all ${
                                evalRound === r.key
                                  ? "bg-white text-indigo-700 shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {r.shortLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Card.Header>

                    <Card.Body className="p-3.5">
                      <Form onSubmit={handleSubmitEvaluation}>
                        {/* Active Round Banner */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2 p-3 mb-3.5 d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-bold text-indigo-950 fs-7">{ROUND_LABEL(evalRound)}</div>
                            <div className="text-indigo-700 text-xs">
                              {ROUNDS.find((r) => r.key === evalRound)?.description}
                            </div>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-indigo-600 text-white text-2xs px-2 py-1 rounded">
                              Evaluator: {storedUser.name || "Interviewer"}
                            </span>
                          </div>
                        </div>

                        {/* ── 1. PERSONAL APPEARANCE & BEHAVIOUR ───────────────── */}
                        <Card className="border-slate-200 mb-3 rounded-2 shadow-2xs">
                          <Card.Body className="p-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                              <div>
                                <label className="fw-bold text-sm text-slate-900 mb-0 d-flex align-items-center gap-1.5">
                                  <span className="badge bg-slate-200 text-black rounded-circle">1</span>
                                  Personal Appearance & Behaviour <span className="text-danger">*</span>
                                </label>
                                <div className="text-xs text-slate-500">
                                  Grooming, punctuality, professional demeanor, confidence, attitude & body language.
                                </div>
                              </div>

                              {/* Star / Rating Selector */}
                              <div className="d-flex align-items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      setFormData({ ...formData, personal_appearance_rating: star })
                                    }
                                    className={`btn btn-sm p-1 border-0 ${
                                      star <= formData.personal_appearance_rating
                                        ? "text-amber-500"
                                        : "text-slate-300"
                                    }`}
                                    title={`${star} out of 5 stars`}
                                  >
                                    <LuStar size={18} fill={star <= formData.personal_appearance_rating ? "currentColor" : "none"} />
                                  </button>
                                ))}
                                <span className="text-xs fw-bold text-slate-700 ms-1">
                                  {formData.personal_appearance_rating}/5
                                </span>
                              </div>
                            </div>

                            <Form.Control
                              as="textarea"
                              rows={2}
                              placeholder="Notes on candidate's appearance, punctuality, active listening, poise, and attitude..."
                              value={formData.personal_appearance_and_behaviour}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  personal_appearance_and_behaviour: e.target.value,
                                })
                              }
                              className="border-slate-300 !text-sm rounded-2"
                            />
                          </Card.Body>
                        </Card>

                        {/* ── 2. DOMAIN KNOWLEDGE ─────────────────────────────── */}
                        <Card className="border-slate-200 mb-3 rounded-2 shadow-2xs">
                          <Card.Body className="p-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                              <div>
                                <label className="fw-bold text-sm text-slate-900 mb-0 d-flex align-items-center gap-1.5">
                                  <span className="badge bg-slate-200 text-black rounded-circle">2</span>
                                  Domain Knowledge <span className="text-danger">*</span>
                                </label>
                                <div className="text-xs text-slate-500">
                                  Subject matter expertise, functional competence, technical depth & problem solving.
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      setFormData({ ...formData, domain_knowledge_rating: star })
                                    }
                                    className={`btn btn-sm p-1 border-0 ${
                                      star <= formData.domain_knowledge_rating
                                        ? "text-amber-500"
                                        : "text-slate-300"
                                    }`}
                                    title={`${star} out of 5 stars`}
                                  >
                                    <LuStar size={18} fill={star <= formData.domain_knowledge_rating ? "currentColor" : "none"} />
                                  </button>
                                ))}
                                <span className="text-xs fw-bold text-slate-700 ms-1">
                                  {formData.domain_knowledge_rating}/5
                                </span>
                              </div>
                            </div>

                            <Form.Control
                              as="textarea"
                              rows={2}
                              placeholder="Notes on core domain principles, tooling skills, architectural knowledge, or problem-solving speed..."
                              value={formData.domain_knowledge}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  domain_knowledge: e.target.value,
                                })
                              }
                              className="border-slate-300 !text-sm rounded-2"
                            />
                          </Card.Body>
                        </Card>

                        {/* ── 3. EDUCATION ────────────────────────────────────── */}
                        <Card className="border-slate-200 mb-3 rounded-2 shadow-2xs">
                          <Card.Body className="p-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                              <div>
                                <label className="fw-bold text-sm text-slate-900 mb-0 d-flex align-items-center gap-1.5">
                                  <span className="badge bg-slate-200 text-black rounded-circle">3</span>
                                  Education & Credentials <span className="text-danger">*</span>
                                </label>
                                <div className="text-xs text-slate-500">
                                  Academic background, degree alignment with job requirements, and industry certifications.
                                </div>
                              </div>

                              <div className="d-flex align-items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      setFormData({ ...formData, education_rating: star })
                                    }
                                    className={`btn btn-sm p-1 border-0 ${
                                      star <= formData.education_rating ? "text-amber-500" : "text-slate-300"
                                    }`}
                                    title={`${star} out of 5 stars`}
                                  >
                                    <LuStar size={18} fill={star <= formData.education_rating ? "currentColor" : "none"} />
                                  </button>
                                ))}
                                <span className="text-xs fw-bold text-slate-700 ms-1">
                                  {formData.education_rating}/5
                                </span>
                              </div>
                            </div>

                            <Form.Control
                              as="textarea"
                              rows={2}
                              placeholder="Notes on qualifications, college degree credibility, academic record & relevant certifications..."
                              value={formData.education}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  education: e.target.value,
                                })
                              }
                              className="border-slate-300 !text-sm rounded-2"
                            />
                          </Card.Body>
                        </Card>

                        {/* ── 4. JOB ROLE (DROPDOWN: SATISFACTORY / HIGH / POOR) ── */}
                        <Card className="border-slate-200 mb-3 rounded-2 shadow-2xs bg-slate-50">
                          <Card.Body className="p-3">
                            <div className="mb-2">
                              <label className="fw-bold text-sm text-slate-900 mb-0 d-flex align-items-center gap-1.5">
                                <span className="badge bg-indigo-600 text-white rounded-circle">4</span>
                                Job Role Fitment <span className="text-danger">*</span>
                              </label>
                              <div className="text-xs text-slate-500">
                                Match between candidate's capabilities and the day-to-day responsibilities of the role.
                              </div>
                            </div>

                            <Row className="g-2.5">
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="text-xs fw-bold text-slate-700 mb-1">
                                    Role Fit Rating (Dropdown Selection)
                                  </Form.Label>
                                  <Form.Select
                                    size="sm"
                                    value={formData.job_role}
                                    onChange={(e) =>
                                      setFormData({ ...formData, job_role: e.target.value })
                                    }
                                    className="border-slate-300 !text-xs rounded-2 fw-semibold"
                                    required
                                  >
                                    <option value="high">High — Exceeds Job Expectations</option>
                                    <option value="satisfactory">Satisfactory — Meets Required Standards</option>
                                    <option value="poor">Poor — Below Standards / Significant Gap</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>

                              <Col md={6}>
                                <div className="p-2 rounded border bg-white text-xs d-flex align-items-center gap-2 h-100">
                                  {formData.job_role === "high" && (
                                    <>
                                      <LuCircleCheck className="text-success fs-5 flex-shrink-0" />
                                      <div>
                                        <strong className="text-success">High Fitment:</strong> Candidate
                                        comfortably fulfills all job requirements and can scale quickly.
                                      </div>
                                    </>
                                  )}
                                  {formData.job_role === "satisfactory" && (
                                    <>
                                      <LuCheck className="text-primary fs-5 flex-shrink-0" />
                                      <div>
                                        <strong className="text-primary">Satisfactory Fitment:</strong> Meets the
                                        baseline criteria and core job requirements for the opening.
                                      </div>
                                    </>
                                  )}
                                  {formData.job_role === "poor" && (
                                    <>
                                      <LuTriangleAlert className="text-danger fs-5 flex-shrink-0" />
                                      <div>
                                        <strong className="text-danger">Poor Fitment:</strong> Noticeable
                                        deficiencies in expected job role competencies.
                                      </div>
                                    </>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>

                        {/* ── OVERALL ASSESSMENT & RECOMMENDATION ───────────────── */}
                        <div className="bg-slate-50 p-3 rounded-2 border border-slate-200 mb-3">
                          <Row className="g-2.5">
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="fw-bold text-sm text-slate-800 mb-1">
                                  Overall Recommendation <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                  size="sm"
                                  value={formData.recommendation}
                                  onChange={(e) =>
                                    setFormData({ ...formData, recommendation: e.target.value })
                                  }
                                  className="border-slate-300 !text-xs rounded-2 fw-semibold"
                                >
                                  {RECOMMENDATION_OPTIONS.map((rec) => (
                                    <option key={rec.value} value={rec.value}>
                                      {rec.label}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>

                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="fw-bold text-sm text-slate-800 mb-1">
                                  Calculated Score
                                </Form.Label>
                                <div className="p-1.5 bg-white border rounded-2 d-flex align-items-center justify-content-between">
                                  <span className="text-xs text-slate-600">Criteria Weighted:</span>
                                  <strong className="text-indigo-700 fs-7">
                                    {Math.round(
                                      ((Number(formData.personal_appearance_rating) || 3) +
                                        (Number(formData.domain_knowledge_rating) || 3) +
                                        (Number(formData.education_rating) || 3) +
                                        (formData.job_role === "high"
                                          ? 5
                                          : formData.job_role === "poor"
                                          ? 2
                                          : 4)) *
                                        5
                                    )}
                                    % / 100
                                  </strong>
                                </div>
                              </Form.Group>
                            </Col>

                              <Col md={12}>
                                <Form.Group>
                                  <Form.Label className="fw-bold text-sm text-slate-800 mb-1">
                                    Interviewer Summary & Overall Feedback
                                  </Form.Label>
                                  <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Provide comprehensive summary notes, key strengths, weaknesses, or specific guidance for subsequent interviewers..."
                                    value={formData.detailed_feedback}
                                    onChange={(e) =>
                                      setFormData({ ...formData, detailed_feedback: e.target.value })
                                    }
                                    className="border-slate-300 !text-sm rounded-2"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>

                          {/* Optional Next Round Scheduling */}
                          {formData.recommendation === "NEXT_ROUND" && (
                            <div className="mt-3 pt-3 border-top border-slate-200">
                              <div className="text-sm fw-bold text-slate-800 mb-2 d-flex align-items-center gap-1.5">
                                <LuCalendar size={13} className="text-indigo-600" />
                                Schedule Next Round (Optional — will send email to Candidate, HR & HOD)
                              </div>

                              <Row className="g-2">
                                <Col md={4}>
                                  <Form.Group>
                                    <Form.Label className="text-sm text-slate-600 mb-1">Next Interview Date</Form.Label>
                                    <Form.Control
                                      size="sm"
                                      type="date"
                                      value={formData.next_interview_date}
                                      onChange={(e) =>
                                        setFormData({ ...formData, next_interview_date: e.target.value })
                                      }
                                      className="border-slate-300 text-xs rounded-2"
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={4}>
                                  <Form.Group>
                                    <Form.Label className="text-sm text-slate-600 mb-1">Time</Form.Label>
                                    <Form.Control
                                      size="sm"
                                      type="text"
                                      placeholder="11:30 AM"
                                      value={formData.next_interview_time}
                                      onChange={(e) =>
                                        setFormData({ ...formData, next_interview_time: e.target.value })
                                      }
                                      className="border-slate-300 text-xs rounded-2"
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={4}>
                                  <Form.Group>
                                    <Form.Label className="text-sm text-slate-600 mb-1">Mode</Form.Label>
                                    <Form.Select
                                      size="sm"
                                      value={formData.next_interview_mode}
                                      onChange={(e) =>
                                        setFormData({ ...formData, next_interview_mode: e.target.value })
                                      }
                                      className="border-slate-300 text-xs rounded-2"
                                    >
                                      <option value="Online (Google Meet)">Online (Google Meet)</option>
                                      <option value="Online (Zoom)">Online (Zoom)</option>
                                      <option value="In-Person Office">In-Person Office</option>
                                      <option value="Telephonic">Telephonic</option>
                                    </Form.Select>
                                  </Form.Group>
                                </Col>
                                <Col md={12}>
                                  <Form.Group>
                                    <Form.Label className="text-sm text-slate-600 mb-1">Meeting Link</Form.Label>
                                    <Form.Control
                                      size="sm"
                                      type="text"
                                      placeholder="https://meet.google.com/..."
                                      value={formData.next_interview_link}
                                      onChange={(e) =>
                                        setFormData({ ...formData, next_interview_link: e.target.value })
                                      }
                                      className="border-slate-300 text-xs rounded-2"
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                            </div>
                          )}
                        </div>

                        {/* Submit Action Buttons */}
                        <div className="d-flex align-items-center justify-content-between pt-2">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            type="button"
                            onClick={() =>
                              setFormData({
                                personal_appearance_and_behaviour: "",
                                personal_appearance_rating: 4,
                                domain_knowledge: "",
                                domain_knowledge_rating: 4,
                                education: "",
                                education_rating: 4,
                                job_role: "satisfactory",
                                detailed_feedback: "",
                                recommendation: "NEXT_ROUND",
                                next_interview_date: "",
                                next_interview_time: "11:00 AM",
                                next_interview_mode: "Online (Google Meet)",
                                next_interview_link: "",
                              })
                            }
                            className="text-xs"
                          >
                            Reset Form
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={submittingEvaluation}
                            className="bg-indigo-600 border-indigo-600 text-xs px-4 py-2 d-flex align-items-center gap-1.5 shadow-xs"
                          >
                            {submittingEvaluation ? (
                              <>
                                <Spinner size="sm" animation="border" /> Submitting...
                              </>
                            ) : (
                              <>
                                <LuSend size={13} /> Submit Evaluation for {ROUND_LABEL(evalRound)}
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            ) : (
              <Card className="border-slate-200 text-center py-5 shadow-xs rounded-3 bg-white">
                <Card.Body>
                  <LuUser className="text-slate-400 fs-1 mb-2" />
                  <h6 className="fw-bold text-slate-800 mb-1">No Candidate Selected for Evaluation</h6>
                  <p className="text-slate-500 text-xs mb-3">
                    Please choose a candidate from the switcher dropdown above or select from the pipeline below.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate("/recruitment")}
                      className="text-xs bg-indigo-600 border-indigo-600"
                    >
                      Go to Recruitment Pipeline
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: DETAILED REPORTS ABOUT CANDIDATE                      */}
        {/* ───────────────────────────────────────────────────────────── */}
        {!loadingCandidateDetails && activeTab === "reports" && (
          <div>
            {selectedCandidate ? (
              <div>
                {/* REPORT ACTIONS BAR */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 bg-white p-3 rounded-3 border border-slate-200 shadow-xs">
                  <div>
                    <h5 className="fs-6 fw-bold text-slate-900 mb-0 d-flex align-items-center gap-2">
                      <LuFileText className="text-indigo-600" /> Comprehensive Assessment Dossier:{" "}
                      {selectedCandidate.candidate_name}
                    </h5>
                    <span className="text-slate-500 text-xs">
                      Complete evaluation breakdown across interview rounds, criteria scorecard, and hiring recommendations.
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => window.print()}
                      className="text-xs d-flex align-items-center gap-1.5 bg-white"
                    >
                      <LuPrinter size={13} /> Print / Export Report
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab("evaluation")}
                      className="text-xs bg-indigo-600 border-indigo-600 d-flex align-items-center gap-1.5"
                    >
                      <LuSparkles size={13} /> Evaluate Next Round
                    </Button>
                  </div>
                </div>

                <Row className="g-3.5">
                  {/* LEFT: CANDIDATE EXECUTIVE SUMMARY & SCORECARD */}
                  <Col lg={4}>
                    <Card className="border-slate-200 shadow-xs rounded-3 bg-white mb-3">
                      <Card.Header className="bg-slate-50 border-bottom border-slate-200 py-3">
                        <span className="fs-7 fw-bold text-slate-800 d-flex align-items-center gap-2">
                          <LuAward className="text-indigo-600" /> Executive Scorecard
                        </span>
                      </Card.Header>

                      <Card.Body className="p-3 text-xs">
                        {/* Overall Score Dial */}
                        <div className="text-center py-3 bg-indigo-50 border border-indigo-100 rounded-3 mb-3">
                          <div className="text-2xs text-indigo-700 uppercase fw-bold tracking-wide">
                            Overall Assessment Score
                          </div>
                          <div className="fs-2 fw-bolder text-indigo-900 mt-1">
                            {averageCandidateScore ? `${averageCandidateScore}%` : "Pending"}
                          </div>
                          <div className="text-2xs text-indigo-600">
                            {averageCandidateScore >= 80
                              ? "🌟 Highly Recommended for Role"
                              : averageCandidateScore >= 65
                              ? "✅ Competent / Meets Role Standards"
                              : averageCandidateScore
                              ? "⚠️ Below Benchmark / Skill Deficit"
                              : "No evaluations submitted yet"}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {averageCandidateScore && (
                          <div className="mb-3">
                            <div className="d-flex justify-content-between text-2xs text-slate-500 mb-1">
                              <span>Score Benchmark</span>
                              <span>{averageCandidateScore} / 100</span>
                            </div>
                            <ProgressBar
                              now={averageCandidateScore}
                              variant={
                                averageCandidateScore >= 80
                                  ? "success"
                                  : averageCandidateScore >= 65
                                  ? "primary"
                                  : "warning"
                              }
                              style={{ height: 6 }}
                              className="rounded-pill"
                            />
                          </div>
                        )}

                        {/* Summary Details */}
                        <div className="pb-2 mb-2 border-bottom border-slate-100">
                          <div className="d-flex justify-content-between text-slate-600 py-1">
                            <span>Candidate Name:</span>
                            <strong className="text-slate-900">{selectedCandidate.candidate_name}</strong>
                          </div>
                          <div className="d-flex justify-content-between text-slate-600 py-1">
                            <span>Applied Position:</span>
                            <strong className="text-slate-900">
                              {selectedCandidate.requisition?.position || "N/A"}
                            </strong>
                          </div>
                          <div className="d-flex justify-content-between text-slate-600 py-1">
                            <span>Department:</span>
                            <span className="text-slate-800">
                              {selectedCandidate.requisition?.department || "General"}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-slate-600 py-1">
                            <span>Requisition Code:</span>
                            <span className="badge bg-slate-100 text-slate-700">
                              {selectedCandidate.requisition?.requisition_code || "N/A"}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-slate-600 py-1">
                            <span>Current Stage:</span>
                            {getStageBadge(selectedCandidate.interview_stage)}
                          </div>
                          <div className="d-flex justify-content-between text-slate-600 py-1">
                            <span>Evaluated Rounds:</span>
                            <strong className="text-indigo-700">
                              {candidateEvaluations.length} Completed
                            </strong>
                          </div>
                        </div>

                        {/* Compensation Comparison */}
                        <div className="bg-slate-50 p-2.5 rounded-2 border border-slate-200">
                          <div className="text-2xs fw-bold text-slate-700 mb-1">Compensation Overview</div>
                          <div className="d-flex justify-content-between text-2xs text-slate-600 py-0.5">
                            <span>Current CTC:</span>
                            <strong>{selectedCandidate.current_ctc ? `₹${selectedCandidate.current_ctc}` : "N/A"}</strong>
                          </div>
                          <div className="d-flex justify-content-between text-2xs text-slate-600 py-0.5">
                            <span>Expected CTC:</span>
                            <strong className="text-emerald-700">
                              {selectedCandidate.expected_ctc ? `₹${selectedCandidate.expected_ctc}` : "N/A"}
                            </strong>
                          </div>
                          <div className="d-flex justify-content-between text-2xs text-slate-600 py-0.5">
                            <span>Max Budget:</span>
                            <strong>
                              {selectedCandidate.requisition?.max_salary
                                ? `₹${selectedCandidate.requisition.max_salary}`
                                : "N/A"}
                            </strong>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* RIGHT: ROUND-BY-ROUND DETAILED EVALUATION CARDS */}
                  <Col lg={8}>
                    <Card className="border-slate-200 shadow-xs rounded-3 bg-white mb-3">
                      <Card.Header className="bg-slate-50 border-bottom border-slate-200 py-3 d-flex align-items-center justify-content-between">
                        <span className="fs-7 fw-bold text-slate-800 d-flex align-items-center gap-2">
                          <LuBadgeCheck className="text-indigo-600" /> Round-by-Round Evaluation Breakdown
                        </span>
                        <span className="text-2xs text-slate-500">
                          {candidateEvaluations.length} evaluation record(s) on file
                        </span>
                      </Card.Header>

                      <Card.Body className="p-3">
                        {candidateEvaluations.length === 0 ? (
                          <div className="text-center py-5">
                            <LuFileText className="text-slate-300 fs-1 mb-2" />
                            <h6 className="fw-bold text-slate-700 mb-1">No Round Evaluations Yet</h6>
                            <p className="text-slate-500 text-xs mb-3">
                              This candidate has not been formally evaluated yet. Switch to the evaluation form to submit feedback.
                            </p>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setActiveTab("evaluation")}
                              className="text-xs bg-indigo-600 border-indigo-600"
                            >
                              Begin Evaluation
                            </Button>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3.5">
                            {candidateEvaluations.map((evalItem, idx) => (
                              <Card key={evalItem.id || idx} className="border-slate-200 rounded-3 shadow-xs">
                                <Card.Header className="bg-slate-50 py-2.5 px-3 border-bottom border-slate-200 d-flex flex-wrap align-items-center justify-content-between gap-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-indigo-600 text-white rounded-pill px-2.5 py-1 text-2xs">
                                      {evalItem.round || `Round ${idx + 1}`}
                                    </span>
                                    <strong className="fs-7 text-slate-900">
                                      {ROUND_LABEL(evalItem.round)}
                                    </strong>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-2xs text-slate-500">
                                      Evaluator: <strong>{evalItem.evaluator_name}</strong> (
                                      {(evalItem.evaluator_role || "HR").toUpperCase()})
                                    </span>
                                    <Badge
                                      bg={
                                        evalItem.recommendation === "SELECTED"
                                          ? "success"
                                          : evalItem.recommendation === "REJECTED"
                                          ? "danger"
                                          : evalItem.recommendation === "HOLD"
                                          ? "warning"
                                          : "primary"
                                      }
                                      className={`text-2xs ${evalItem.recommendation === "HOLD" ? "text-dark" : ""}`}
                                    >
                                      {evalItem.recommendation || "NEXT_ROUND"}
                                    </Badge>
                                  </div>
                                </Card.Header>

                                <Card.Body className="p-3 text-xs">
                                  {/* 4 Criteria Grid */}
                                  <Row className="g-2.5 mb-3">
                                    {/* 1. Personal Appearance & Behaviour */}
                                    <Col md={6}>
                                      <div className="p-2.5 rounded-2 bg-slate-50 border border-slate-200 h-100">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                          <strong className="text-slate-800 text-2xs">
                                            1. Personal Appearance & Behaviour
                                          </strong>
                                          <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-2xs">
                                            ★ {evalItem.personal_appearance_rating || "N/A"}/5
                                          </span>
                                        </div>
                                        <p className="text-slate-600 text-xs mb-0">
                                          {evalItem.personal_appearance_and_behaviour || (
                                            <em className="text-slate-400">No specific remarks entered</em>
                                          )}
                                        </p>
                                      </div>
                                    </Col>

                                    {/* 2. Domain Knowledge */}
                                    <Col md={6}>
                                      <div className="p-2.5 rounded-2 bg-slate-50 border border-slate-200 h-100">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                          <strong className="text-slate-800 text-2xs">2. Domain Knowledge</strong>
                                          <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-2xs">
                                            ★ {evalItem.domain_knowledge_rating || "N/A"}/5
                                          </span>
                                        </div>
                                        <p className="text-slate-600 text-xs mb-0">
                                          {evalItem.domain_knowledge || (
                                            <em className="text-slate-400">No specific remarks entered</em>
                                          )}
                                        </p>
                                      </div>
                                    </Col>

                                    {/* 3. Education */}
                                    <Col md={6}>
                                      <div className="p-2.5 rounded-2 bg-slate-50 border border-slate-200 h-100">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                          <strong className="text-slate-800 text-2xs">
                                            3. Education & Credentials
                                          </strong>
                                          <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-2xs">
                                            ★ {evalItem.education_rating || "N/A"}/5
                                          </span>
                                        </div>
                                        <p className="text-slate-600 text-xs mb-0">
                                          {evalItem.education || (
                                            <em className="text-slate-400">No specific remarks entered</em>
                                          )}
                                        </p>
                                      </div>
                                    </Col>

                                    {/* 4. Job Role Fit */}
                                    <Col md={6}>
                                      <div className="p-2.5 rounded-2 bg-slate-50 border border-slate-200 h-100">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                          <strong className="text-slate-800 text-2xs">4. Job Role Fit</strong>
                                          <Badge
                                            bg={
                                              evalItem.job_role === "high"
                                                ? "success"
                                                : evalItem.job_role === "poor"
                                                ? "danger"
                                                : "primary"
                                            }
                                            className="text-2xs uppercase"
                                          >
                                            {evalItem.job_role || "Satisfactory"}
                                          </Badge>
                                        </div>
                                        <p className="text-slate-600 text-xs mb-0">
                                          Fit Level:{" "}
                                          <strong className="text-capitalize text-slate-800">
                                            {evalItem.job_role || "satisfactory"}
                                          </strong>{" "}
                                          —{" "}
                                          {evalItem.job_role === "high"
                                            ? "Exceeds Job Requirements"
                                            : evalItem.job_role === "poor"
                                            ? "Below Standards"
                                            : "Meets Core Standards"}
                                        </p>
                                      </div>
                                    </Col>
                                  </Row>

                                  {/* Detailed Remarks */}
                                  {evalItem.detailed_feedback && (
                                    <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-2 text-xs text-slate-700">
                                      <strong className="text-indigo-900 d-block mb-1">
                                        Evaluator Summary Remarks:
                                      </strong>
                                      <span style={{ whiteSpace: "pre-wrap" }}>{evalItem.detailed_feedback}</span>
                                    </div>
                                  )}

                                  <div className="d-flex justify-content-between align-items-center text-2xs text-slate-400 mt-2.5 pt-2 border-top border-slate-100">
                                    <span>
                                      Evaluated on:{" "}
                                      {evalItem.evaluated_at
                                        ? new Date(evalItem.evaluated_at).toLocaleString()
                                        : "Recent"}
                                    </span>
                                    <span>
                                      Round Score: <strong>{evalItem.overall_score || 80}%</strong>
                                    </span>
                                  </div>
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        )}
                      </Card.Body>
                    </Card>

                    {/* ALL PIPELINE CANDIDATES COMPARISON TABLE */}
                    <Card className="border-slate-200 shadow-xs rounded-3 bg-white">
                      <Card.Header className="bg-slate-50 border-bottom border-slate-200 py-3 d-flex align-items-center justify-content-between">
                        <span className="fs-7 fw-bold text-slate-800 d-flex align-items-center gap-2">
                          <LuUsers className="text-indigo-600" /> Pipeline Candidates Overview
                        </span>
                        <span className="text-2xs text-slate-500">
                          Showing {filteredCandidates.length} candidate(s)
                        </span>
                      </Card.Header>

                      <div className="table-responsive">
                        <Table hover className="align-middle mb-0 text-xs">
                          <thead className="bg-slate-50 text-slate-600 text-2xs uppercase">
                            <tr>
                              <th className="ps-3">Candidate</th>
                              <th>Position & Dept</th>
                              <th>Stage</th>
                              <th>Evaluations</th>
                              <th className="text-end pe-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCandidates.map((cand) => {
                              const evalsCount = Array.isArray(cand.interview_evaluations)
                                ? cand.interview_evaluations.length
                                : 0;
                              const isCurrent = cand.id === selectedCandidate.id;
                              return (
                                <tr key={cand.id} className={isCurrent ? "table-primary" : ""}>
                                  <td className="ps-3">
                                    <div className="fw-bold text-slate-900">{cand.candidate_name}</div>
                                    <div className="text-2xs text-slate-500">
                                      {cand.current_designation || "Applicant"}
                                    </div>
                                  </td>
                                  <td>
                                    <div>{cand.requisition?.position || "Role"}</div>
                                    <div className="text-2xs text-slate-500">
                                      {cand.requisition?.department || "General"}
                                    </div>
                                  </td>
                                  <td>{getStageBadge(cand.interview_stage)}</td>
                                  <td>
                                    {evalsCount > 0 ? (
                                      <Badge bg="success" className="text-2xs">
                                        {evalsCount} evaluated
                                      </Badge>
                                    ) : (
                                      <span className="text-slate-400 text-2xs">No rounds yet</span>
                                    )}
                                  </td>
                                  <td className="text-end pe-3">
                                    <Button
                                      variant={isCurrent ? "primary" : "outline-primary"}
                                      size="sm"
                                      onClick={() => setSelectedCandidate(cand)}
                                      className="text-xs py-1 px-2.5"
                                    >
                                      {isCurrent ? "Selected" : "View / Evaluate"}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              <Card className="border-slate-200 text-center py-5 shadow-xs rounded-3 bg-white">
                <Card.Body>
                  <LuFileText className="text-slate-400 fs-1 mb-2" />
                  <h6 className="fw-bold text-slate-800 mb-1">No Candidate Selected for Report</h6>
                  <p className="text-slate-500 text-xs mb-3">
                    Select a candidate from the dropdown above to view their complete assessment report.
                  </p>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        {/* ── RESUME MODAL ────────────────────────────────────────────── */}
        <Modal show={showResumeModal} onHide={() => setShowResumeModal(false)} size="lg" centered>
          <Modal.Header closeButton className="bg-slate-50 border-bottom border-slate-200 py-3">
            <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-slate-900">
              <LuFileText className="text-indigo-600" /> Candidate Resume: {selectedCandidate?.candidate_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-3 text-center">
            {selectedCandidate?.resume_url ? (
              <div>
                <iframe
                  src={getUploadUrl(selectedCandidate.resume_url)}
                  title="Resume Document"
                  style={{ width: "100%", height: "550px", border: "1px solid #cbd5e1", borderRadius: 8 }}
                />
                <div className="mt-3">
                  <a
                    href={getUploadUrl(selectedCandidate.resume_url)}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn btn-outline-primary btn-sm text-xs d-inline-flex align-items-center gap-1.5"
                  >
                    <LuDownload size={13} /> Open / Download File in New Tab
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs py-4">No resume file URL available.</p>
            )}
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
}