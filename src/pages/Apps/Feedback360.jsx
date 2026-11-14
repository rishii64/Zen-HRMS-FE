import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Modal, Button, Form, Badge, ProgressBar } from "react-bootstrap";
import {
  LuUsers,
  LuTrendingUp,
  LuNetwork,
  LuUser,
  LuShield,
  LuCircleCheck,
  LuClock,
  LuSend,
  LuSparkles,
  LuLayers,
  LuPlus,
  LuBell,
  LuStar,
  LuEye,
  LuArrowUpRight,
  LuMessageSquare,
  LuAward,
  LuSearch,
  LuBriefcase
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";

// 5 Core Competency Rubrics
const COMPETENCY_RUBRIC = [
  {
    key: "functional",
    name: "Functional & Technical Mastery",
    desc: "Domain expertise, precision, problem-solving, and deliverable quality.",
    guidance: "Assesses how effectively the person applies technical and domain skills to achieve excellence.",
  },
  {
    key: "collaboration",
    name: "Teamwork & Cross-Functional Synergy",
    desc: "Cooperation with peers and departments, sharing knowledge, unblocking teammates.",
    guidance: "Assesses how well the person works across team and departmental boundaries.",
  },
  {
    key: "communication",
    name: "Communication & Stakeholder Management",
    desc: "Clarity, active listening, transparency, and managing client/stakeholder expectations.",
    guidance: "Assesses verbal, written, and cross-functional communication efficacy.",
  },
  {
    key: "leadership",
    name: "Leadership, Mentorship & Empathy",
    desc: "Inspiring others, supporting career growth, emotional intelligence, upward openness.",
    guidance: "Crucial for managers (evaluated by subordinates) and aspiring leads.",
  },
  {
    key: "ownership",
    name: "Ownership, Accountability & Agility",
    desc: "End-to-end responsibility, proactive initiative, adapting swiftly to change.",
    guidance: "Assesses dependability, accountability for outcomes, and agility under pressure.",
  },
];

// Helper to get relationship badge
const getRelationshipBadge = (rel) => {
  const r = (rel || "Peer").toLowerCase();
  if (r === "subordinate") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <LuTrendingUp size={12} /> Upward Review (Manager)
      </span>
    );
  }
  if (r === "stakeholder") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
        <LuNetwork size={12} /> Cross-Dept Stakeholder
      </span>
    );
  }
  if (r === "manager") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        <LuBriefcase size={12} /> Direct Manager
      </span>
    );
  }
  if (r === "self") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <LuUser size={12} /> Self Evaluation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
      <LuUsers size={12} /> Peer-to-Peer Review
    </span>
  );
};

// Pure SVG Radar / Spider Chart Component
const RadarChart360 = ({ data = [], activePerspectives = ["Self", "Manager", "Peers", "Subordinates", "Stakeholders"] }) => {
  const size = 340;
  const center = size / 2;
  const radius = center - 50;
  const numAxes = data.length || 5;

  const perspectiveColors = {
    Self: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.15)" },
    Manager: { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.15)" },
    Peers: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.15)" },
    Subordinates: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.15)" },
    Stakeholders: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.15)" },
  };

  const getCoordinates = (index, value, maxVal = 5) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const r = (Math.min(value, maxVal) / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const levels = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grids */}
        {levels.map((lvl) => {
          const points = data
            .map((_, i) => {
              const { x, y } = getCoordinates(i, lvl);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={lvl}
              points={points}
              fill="none"
              stroke="#e2e8f0"
              strokeDasharray={lvl === 5 ? "none" : "2,2"}
              strokeWidth={lvl === 5 ? "1.5" : "1"}
            />
          );
        })}

        {/* Axes Lines */}
        {data.map((item, i) => {
          const { x, y } = getCoordinates(i, 5);
          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
              {/* Axis Label */}
              <text
                x={x + (x > center ? 10 : x < center ? -10 : 0)}
                y={y + (y > center ? 14 : y < center ? -8 : 0)}
                textAnchor={x > center ? "start" : x < center ? "end" : "middle"}
                className="text-[10px] font-bold fill-slate-600 dark:fill-slate-300"
              >
                {item.competency?.split(" ")[0]}
              </text>
            </g>
          );
        })}

        {/* Polygons for each active perspective */}
        {Object.keys(perspectiveColors).map((persp) => {
          if (!activePerspectives.includes(persp)) return null;

          const points = data
            .map((d, i) => {
              const val = parseFloat(d[persp]) || 0;
              const { x, y } = getCoordinates(i, val);
              return `${x},${y}`;
            })
            .join(" ");

          const hasData = data.some((d) => (parseFloat(d[persp]) || 0) > 0);
          if (!hasData) return null;

          const { stroke, fill } = perspectiveColors[persp];

          return (
            <g key={persp}>
              <polygon points={points} fill={fill} stroke={stroke} strokeWidth="2" />
              {data.map((d, i) => {
                const val = parseFloat(d[persp]) || 0;
                const { x, y } = getCoordinates(i, val);
                return <circle key={i} cx={x} cy={y} r="3.5" fill={stroke} />;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function Feedback360() {
  const [activeTab, setActiveTab] = useState("my_reviews"); // "my_reviews" | "my_summary" | "admin_desk"
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [loading, setLoading] = useState(false);

  // My reviews assigned to me to give
  const [myReviews, setMyReviews] = useState({ pending: [], submitted: [], totalAssigned: 0, totalSubmitted: 0 });

  // My 360 summary (as evaluatee)
  const [mySummary, setMySummary] = useState(null);

  // Admin desk states
  const [cycleSummaries, setCycleSummaries] = useState([]);
  const [cycleAssignments, setCycleAssignments] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  // Active Radar perspectives filter
  const [activeRadarPerspectives, setActiveRadarPerspectives] = useState([
    "Self",
    "Manager",
    "Peers",
    "Subordinates",
    "Stakeholders",
  ]);

  // Modal: Fill Review
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [formScores, setFormScores] = useState({
    functional: 4,
    collaboration: 4,
    communication: 4,
    leadership: 4,
    ownership: 4,
  });
  const [formStrengths, setFormStrengths] = useState("");
  const [formGrowth, setFormGrowth] = useState("");
  const [formGeneral, setFormGeneral] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Modal: Nominate Raters
  const [nominateModalOpen, setNominateModalOpen] = useState(false);
  const [nominateEvaluatee, setNominateEvaluatee] = useState("");
  const [nominatedRatersList, setNominatedRatersList] = useState([
    { rater_id: "", rater_relationship: "Peer", is_anonymous: true },
  ]);
  const [savingNomination, setSavingNomination] = useState(false);

  // Modal: Launch New Cycle
  const [newCycleModalOpen, setNewCycleModalOpen] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState({
    cycle_code: "",
    title: "",
    description: "",
    due_date: "",
    allow_anonymous_peer: true,
    allow_anonymous_subordinate: true,
    allow_anonymous_stakeholder: false,
    min_raters_required: 3,
  });
  const [creatingCycle, setCreatingCycle] = useState(false);

  // Current logged in user info
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (_) {
      return {};
    }
  }, []);

  const isHRorAdmin = ["hr", "admin", "management", "ceo", "hrmanager"].includes(
    String(storedUser.role || "").toLowerCase()
  );

  // Load initial data
  const loadCycles = async () => {
    try {
      const res = await api.get("/feedback360/cycles");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCycles(res.data.data);
        if (res.data.data.length > 0 && !selectedCycleId) {
          setSelectedCycleId(String(res.data.data[0].id));
        }
      }
    } catch (err) {
      console.warn("Could not load 360 cycles:", err.message);
    }
  };

  const loadMyReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get("/feedback360/my-reviews");
      if (res.data?.success && res.data.data) {
        setMyReviews(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load my reviews:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMySummary = async () => {
    try {
      const res = await api.get("/feedback360/my-summary");
      if (res.data?.success) {
        setMySummary(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load my 360 summary:", err.message);
    }
  };

  const loadCycleSummaries = async (cycleId) => {
    if (!cycleId) return;
    try {
      const res = await api.get(`/feedback360/cycle/${cycleId}/summaries`);
      if (res.data?.success && res.data.data) {
        setCycleSummaries(res.data.data.summaries || []);
        setCycleAssignments(res.data.data.assignments || []);
      }
    } catch (err) {
      console.warn("Could not load cycle summaries:", err.message);
    }
  };

  const loadEmployeesForNomination = async () => {
    try {
      const res = await api.get("/feedback360/employees");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEmployeesList(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load employees:", err.message);
    }
  };

  useEffect(() => {
    loadCycles();
    loadMyReviews();
    loadMySummary();
    loadEmployeesForNomination();
  }, []);

  useEffect(() => {
    if (selectedCycleId && isHRorAdmin) {
      loadCycleSummaries(selectedCycleId);
    }
  }, [selectedCycleId, isHRorAdmin]);

  // Handle open review modal
  const handleOpenReviewModal = (assignment) => {
    setActiveAssignment(assignment);
    try {
      const parsed = JSON.parse(assignment.competency_scores || "{}");
      setFormScores({
        functional: parsed.functional || 4,
        collaboration: parsed.collaboration || 4,
        communication: parsed.communication || 4,
        leadership: parsed.leadership || 4,
        ownership: parsed.ownership || 4,
      });
    } catch (_) {
      setFormScores({ functional: 4, collaboration: 4, communication: 4, leadership: 4, ownership: 4 });
    }
    setFormStrengths(assignment.strengths_feedback || "");
    setFormGrowth(assignment.growth_areas_feedback || "");
    setFormGeneral(assignment.general_comments || "");
    setReviewModalOpen(true);
  };

  // Submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!activeAssignment) return;
    try {
      setSubmittingReview(true);
      const res = await api.post("/feedback360/submit-review", {
        assignment_id: activeAssignment.id,
        competency_scores: formScores,
        strengths_feedback: formStrengths,
        growth_areas_feedback: formGrowth,
        general_comments: formGeneral,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Feedback submitted successfully!");
        setReviewModalOpen(false);
        loadMyReviews();
        loadMySummary();
        if (selectedCycleId) loadCycleSummaries(selectedCycleId);
      }
    } catch (err) {
      console.error("Submit review error:", err);
      toast.error(err.response?.data?.error || "Failed to submit feedback");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle nominate raters submit
  const handleSaveNomination = async (e) => {
    e.preventDefault();
    if (!nominateEvaluatee || nominatedRatersList.length === 0) {
      toast.error("Please select an evaluatee and at least one rater");
      return;
    }
    try {
      setSavingNomination(true);
      const res = await api.post("/feedback360/nominate", {
        cycle_id: selectedCycleId,
        evaluatee_id: nominateEvaluatee,
        raters: nominatedRatersList.filter((r) => r.rater_id),
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Raters assigned successfully!");
        setNominateModalOpen(false);
        setNominateEvaluatee("");
        setNominatedRatersList([{ rater_id: "", rater_relationship: "Peer", is_anonymous: true }]);
        loadCycles();
        if (selectedCycleId) loadCycleSummaries(selectedCycleId);
      }
    } catch (err) {
      console.error("Nomination error:", err);
      toast.error(err.response?.data?.error || "Failed to assign raters");
    } finally {
      setSavingNomination(false);
    }
  };

  // Handle publish summary
  const handlePublishSummary = async (summaryId) => {
    try {
      const res = await api.post("/feedback360/publish", {
        summary_id: summaryId,
      });
      if (res.data?.success) {
        toast.success("360 synthesis report published to employee!");
        if (selectedCycleId) loadCycleSummaries(selectedCycleId);
      }
    } catch (err) {
      console.error("Publish error:", err);
      toast.error("Failed to publish report");
    }
  };

  // Handle send reminder
  const handleSendReminder = async (evaluateeId = null) => {
    try {
      const res = await api.post("/feedback360/remind", {
        cycle_id: selectedCycleId,
        evaluatee_id: evaluateeId,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Reminders dispatched to pending raters!");
      }
    } catch (err) {
      console.error("Reminder error:", err);
      toast.error("Failed to dispatch reminders");
    }
  };

  // Handle create cycle
  const handleCreateCycleSubmit = async (e) => {
    e.preventDefault();
    if (!newCycleForm.title || !newCycleForm.due_date) {
      toast.error("Please fill title and due date");
      return;
    }
    try {
      setCreatingCycle(true);
      const res = await api.post("/feedback360/cycles", newCycleForm);
      if (res.data?.success) {
        toast.success("New 360 Feedback Cycle launched!");
        setNewCycleModalOpen(false);
        loadCycles();
      }
    } catch (err) {
      console.error("Create cycle error:", err);
      toast.error(err.response?.data?.error || "Failed to create cycle");
    } finally {
      setCreatingCycle(false);
    }
  };

  // Parse Radar data from mySummary
  const radarChartData = useMemo(() => {
    if (!mySummary || !mySummary.competency_radar_data) {
      return COMPETENCY_RUBRIC.map((c) => ({
        competency: c.name,
        key: c.key,
        Self: 0,
        Manager: 0,
        Peers: 0,
        Subordinates: 0,
        Stakeholders: 0,
      }));
    }
    try {
      return JSON.parse(mySummary.competency_radar_data);
    } catch (_) {
      return [];
    }
  }, [mySummary]);

  // Parse Qualitative summary from mySummary
  const qualitativeData = useMemo(() => {
    if (!mySummary || !mySummary.qualitative_summary) {
      return { strengths: [], growthAreas: [], generalAdvice: [] };
    }
    try {
      return JSON.parse(mySummary.qualitative_summary);
    } catch (_) {
      return { strengths: [], growthAreas: [], generalAdvice: [] };
    }
  }, [mySummary]);

  return (
    <Container fluid className="max-w-7xl py-4 px-3 px-md-4 font-sans" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                <LuUsers size={22} />
              </span>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
                  360-Degree Multi-Rater Feedback System
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  Peer-to-peer reviews, upward subordinate reviews of leadership, and cross-departmental stakeholder evaluation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {cycles.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Cycle: {cycles[0]?.title}</span>
              </div>
            )}

            {isHRorAdmin && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setNewCycleModalOpen(true)}
                className="rounded-full text-xs font-bold px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow-xs"
              >
                <LuPlus size={13} /> Launch Cycle
              </Button>
            )}
          </div>
        </div>

        {/* TOP TAB NAVIGATION */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("my_reviews")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition d-inline-flex align-items-center gap-2 ${
              activeTab === "my_reviews"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <LuMessageSquare size={13} /> My Reviews to Give
            {myReviews.pending.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {myReviews.pending.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("my_summary")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition d-inline-flex align-items-center gap-2 ${
              activeTab === "my_summary"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <LuAward size={13} /> My 360 Synthesis Report
          </button>

          {isHRorAdmin && (
            <button
              onClick={() => setActiveTab("admin_desk")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition d-inline-flex align-items-center gap-2 ${
                activeTab === "admin_desk"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <LuLayers size={13} /> Admin & HR 360 Desk
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: MY REVIEWS TO GIVE */}
      {/* ============================================================ */}
      {activeTab === "my_reviews" && (
        <div className="space-y-6">
          {/* Pending Reviews Section */}
          <Card className="border-0 shadow-sm rounded-3xl bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-slate-100 m-0 d-flex align-items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending Reviews ({myReviews.pending.length})
                </h5>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Multi-rater reviews assigned to you. Subordinate upward feedback and peer feedback are anonymous to protect candor.
                </p>
              </div>
            </div>

            {myReviews.pending.length > 0 ? (
              <Row className="g-4">
                {myReviews.pending.map((rev) => (
                  <Col xs={12} md={6} lg={4} key={rev.id}>
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h6 className="font-bold text-slate-900 dark:text-slate-100 m-0 text-sm">
                            {rev.evaluatee_name}
                          </h6>
                          <div className="text-[11px] text-slate-500">
                            {rev.evaluatee_designation} • {rev.evaluatee_dept}
                          </div>
                        </div>

                        {getRelationshipBadge(rev.rater_relationship)}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
                        {rev.is_anonymous ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200">
                            <LuShield size={11} /> Anonymous Review Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Standard Attributed Review
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <LuClock size={11} /> Due: {rev.cycle?.due_date || "Cycle End"}
                        </span>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenReviewModal(rev)}
                          className="rounded-pill text-xs font-bold px-3 py-1 shadow-xs"
                        >
                          Fill 360 Review <LuArrowUpRight size={12} />
                        </Button>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200">
                <LuCircleCheck className="mx-auto text-emerald-500 mb-2" size={32} />
                <h6 className="font-bold text-slate-800 dark:text-slate-200">All Assigned Reviews Completed</h6>
                <p className="text-xs text-slate-500 m-0">You have no pending 360 feedback evaluations at this time.</p>
              </div>
            )}
          </Card>

          {/* Submitted Reviews Section */}
          {myReviews.submitted.length > 0 && (
            <Card className="border-0 shadow-sm rounded-3xl bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 m-0 d-flex align-items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed Reviews ({myReviews.submitted.length})
                  </h5>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">Reviews you have successfully submitted for this cycle.</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myReviews.submitted.map((rev) => (
                  <div key={rev.id} className="py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                        {rev.overall_score || "4.5"}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{rev.evaluatee_name}</div>
                        <div className="text-xs text-slate-400">{rev.evaluatee_designation} • {rev.evaluatee_dept}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {getRelationshipBadge(rev.rater_relationship)}
                      <span className="text-[11px] text-slate-400">
                        Submitted on {rev.submitted_at ? new Date(rev.submitted_at).toLocaleDateString() : "Recently"}
                      </span>
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => handleOpenReviewModal(rev)}
                        className="rounded-pill text-xs border text-slate-600 px-3 py-0.5"
                      >
                        Inspect Submission
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MY 360 SYNTHESIS REPORT */}
      {/* ============================================================ */}
      {activeTab === "my_summary" && (
        <div className="space-y-6">
          {mySummary ? (
            <>
              {/* Scorecard Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
                      Official 360-Degree Multi-Rater Report
                    </span>
                    <h3 className="text-2xl md:text-3xl font-bold mt-2 m-0">
                      {mySummary.evaluatee_name || storedUser.name || "My Performance Profile"}
                    </h3>
                    <p className="text-slate-300 text-xs mt-1 m-0">
                      {mySummary.evaluatee_designation || "Staff"} • {mySummary.evaluatee_dept || "Engineering"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                    <div className="text-center">
                      <div className="text-3xl md:text-4xl font-extrabold text-amber-300">
                        {mySummary.composite_score || "4.55"}
                      </div>
                      <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                        Composite Score / 5.00
                      </div>
                    </div>
                    <div className="h-10 w-[1px] bg-white/20"></div>
                    <div className="text-xs space-y-1">
                      <div>Status: <span className="font-bold text-emerald-300">{mySummary.status.replace(/_/g, " ")}</span></div>
                      <div>Raters: <span className="font-bold">{mySummary.total_raters_submitted} of {mySummary.total_raters_assigned} submitted</span></div>
                    </div>
                  </div>
                </div>

                {/* Perspective Breakdown Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                    <div className="text-slate-300 text-[11px]">Self Rating</div>
                    <div className="text-base font-bold text-blue-300">{mySummary.self_avg_score || "—"}</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                    <div className="text-slate-300 text-[11px]">Direct Manager</div>
                    <div className="text-base font-bold text-indigo-300">{mySummary.manager_avg_score || "—"}</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                    <div className="text-slate-300 text-[11px]">Peers Review</div>
                    <div className="text-base font-bold text-emerald-300">{mySummary.peer_avg_score || "—"}</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                    <div className="text-slate-300 text-[11px]">Subordinates (Upward)</div>
                    <div className="text-base font-bold text-amber-300">{mySummary.subordinate_avg_score || "—"}</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                    <div className="text-slate-300 text-[11px]">Stakeholders</div>
                    <div className="text-base font-bold text-purple-300">{mySummary.stakeholder_avg_score || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Spider Radar Chart & Multi-Rater Breakdown */}
              <Row className="g-5">
                {/* Left Column: Spider Radar Chart */}
                <Col xs={12} lg={6}>
                  <Card className="border-0 shadow-sm rounded-3xl bg-white dark:bg-slate-900 p-5 h-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h6 className="font-bold text-slate-900 dark:text-slate-100 m-0">
                          360° Competency Radar Visualization
                        </h6>
                        <small className="text-slate-400 text-xs">Comparison across 5 multi-rater perspectives</small>
                      </div>
                    </div>

                    <div className="flex justify-center py-2">
                      <RadarChart360 data={radarChartData} activePerspectives={activeRadarPerspectives} />
                    </div>

                    {/* Interactive Legend Toggles */}
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {[
                        { label: "Self", color: "bg-blue-500" },
                        { label: "Manager", color: "bg-indigo-500" },
                        { label: "Peers", color: "bg-emerald-500" },
                        { label: "Subordinates", color: "bg-amber-500" },
                        { label: "Stakeholders", color: "bg-purple-500" },
                      ].map((item) => {
                        const isActive = activeRadarPerspectives.includes(item.label);
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              if (isActive) {
                                setActiveRadarPerspectives(activeRadarPerspectives.filter((p) => p !== item.label));
                              } else {
                                setActiveRadarPerspectives([...activeRadarPerspectives, item.label]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition flex items-center gap-1.5 ${
                              isActive ? "bg-slate-100 border-slate-300 text-slate-800" : "opacity-40 border-dashed"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </Col>

                {/* Right Column: Competency Scorecard Table */}
                <Col xs={12} lg={6}>
                  <Card className="border-0 shadow-sm rounded-3xl bg-white dark:bg-slate-900 p-5 h-100">
                    <h6 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
                      Competency Breakdown Scorecard
                    </h6>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b text-slate-400 uppercase text-[10px]">
                            <th className="py-2">Competency</th>
                            <th className="py-2 text-center text-blue-600">Self</th>
                            <th className="py-2 text-center text-indigo-600">Mgr</th>
                            <th className="py-2 text-center text-emerald-600">Peers</th>
                            <th className="py-2 text-center text-amber-600">Sub</th>
                            <th className="py-2 text-center text-purple-600">Stk</th>
                            <th className="py-2 text-right font-bold">Overall</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {radarChartData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                {row.competency}
                              </td>
                              <td className="py-2.5 text-center font-bold text-blue-600">{row.Self || "—"}</td>
                              <td className="py-2.5 text-center font-bold text-indigo-600">{row.Manager || "—"}</td>
                              <td className="py-2.5 text-center font-bold text-emerald-600">{row.Peers || "—"}</td>
                              <td className="py-2.5 text-center font-bold text-amber-600">{row.Subordinates || "—"}</td>
                              <td className="py-2.5 text-center font-bold text-purple-600">{row.Stakeholders || "—"}</td>
                              <td className="py-2.5 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                {row.Overall || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {mySummary.hr_summary_notes && (
                      <div className="mt-4 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                        <span className="font-bold">HR Synthesis Endorsement:</span> {mySummary.hr_summary_notes}
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Blinded Qualitative Feedback Themes */}
              <Card className="border-0 shadow-sm rounded-3xl bg-white dark:bg-slate-900 p-5">
                <h6 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <LuSparkles className="text-amber-500" /> Qualitative Feedback Themes (Strengths & Growth Areas)
                </h6>

                <Row className="g-4">
                  {/* Strengths */}
                  <Col xs={12} md={6}>
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 h-100">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 text-xs mb-3 flex items-center gap-1.5">
                        <LuCircleCheck size={14} /> Top Standout Strengths
                      </div>
                      {qualitativeData.strengths.length > 0 ? (
                        <div className="space-y-2.5">
                          {qualitativeData.strengths.map((s, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900 text-xs">
                              <p className="m-0 text-slate-700 dark:text-slate-300">"{s.text}"</p>
                              <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                                — {s.author}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No specific strengths submitted yet.</p>
                      )}
                    </div>
                  </Col>

                  {/* Growth Areas */}
                  <Col xs={12} md={6}>
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 h-100">
                      <div className="font-bold text-amber-800 dark:text-amber-300 text-xs mb-3 flex items-center gap-1.5">
                        <LuTrendingUp size={14} /> Growth & Mentorship Opportunities
                      </div>
                      {qualitativeData.growthAreas.length > 0 ? (
                        <div className="space-y-2.5">
                          {qualitativeData.growthAreas.map((g, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900 text-xs">
                              <p className="m-0 text-slate-700 dark:text-slate-300">"{g.text}"</p>
                              <span className="text-[10px] text-amber-600 font-bold block mt-1">
                                — {g.author}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No growth areas noted.</p>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <LuUsers className="mx-auto text-slate-400 mb-3" size={40} />
              <h5 className="font-bold text-slate-800 dark:text-slate-200">No 360 Feedback Report Available</h5>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Once your manager, peers, subordinates, and cross-departmental stakeholders submit their reviews, HR will publish your synthesized multi-rater report here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: ADMIN & HR 360 DESK */}
      {/* ============================================================ */}
      {activeTab === "admin_desk" && isHRorAdmin && (
        <div className="space-y-6">
          {/* Action Ribbon & Cycle Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Active Cycle:</span>
              <Form.Select
                size="sm"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="text-xs font-semibold rounded-pill max-w-sm"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status})
                  </option>
                ))}
              </Form.Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNominateModalOpen(true)}
                className="rounded-full text-xs font-bold px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow-xs"
              >
                <LuPlus size={13} /> Nominate 360 Raters
              </Button>

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleSendReminder()}
                className="rounded-full text-xs font-bold px-3 py-1.5 d-inline-flex align-items-center gap-1.5"
              >
                <LuBell size={13} /> Remind All Pending
              </Button>
            </div>
          </div>

          {/* Roster & Summaries Table */}
          <Card className="border-0 shadow-sm rounded-3xl bg-white dark:bg-slate-900 overflow-hidden">
            <Card.Header className="bg-white dark:bg-slate-900 py-3 border-b border-slate-100 dark:border-slate-800 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="font-bold text-slate-900 dark:text-slate-100 m-0">360 Review Roster & Synthesis Status</h6>
                <small className="text-slate-400 text-xs">Track progress, inspect multi-rater scores, and publish reports</small>
              </div>
              <Badge bg="primary" className="rounded-pill text-xs px-3 py-1.5">
                {cycleSummaries.length} Evaluatees Nominated
              </Badge>
            </Card.Header>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="table-light uppercase text-[10px] text-slate-500">
                  <tr className="border-b">
                    <th className="px-4 py-3">Evaluatee</th>
                    <th className="py-3">Department</th>
                    <th className="py-3 text-center">Raters Progress</th>
                    <th className="py-3 text-center">Composite Score</th>
                    <th className="py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cycleSummaries.length > 0 ? (
                    cycleSummaries.map((s) => {
                      const pct = s.total_raters_assigned > 0
                        ? Math.round((s.total_raters_submitted / s.total_raters_assigned) * 100)
                        : 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{s.evaluatee_name}</div>
                            <div className="text-[11px] text-slate-400">{s.evaluatee_designation}</div>
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">{s.evaluatee_dept}</td>
                          <td className="py-3 text-center" style={{ minWidth: "140px" }}>
                            <div className="text-[11px] font-bold mb-1">
                              {s.total_raters_submitted} of {s.total_raters_assigned} ({pct}%)
                            </div>
                            <ProgressBar now={pct} variant={pct === 100 ? "success" : "primary"} style={{ height: "5px" }} />
                          </td>
                          <td className="py-3 text-center font-bold text-sm text-amber-600">
                            {s.composite_score ? `${s.composite_score} / 5.0` : "—"}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === "Published_To_Employee"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : s.status === "Ready_For_Review"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {s.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="d-flex items-center justify-content-center gap-1.5">
                              {s.status !== "Published_To_Employee" && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handlePublishSummary(s.id)}
                                  className="rounded-pill px-2.5 py-0.5 text-[10px] font-bold"
                                  title="Publish synthesis report to employee"
                                >
                                  Publish
                                </Button>
                              )}
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleSendReminder(s.evaluatee_id)}
                                className="rounded-pill px-2 py-0.5 text-[10px] font-bold"
                                title="Send reminder to pending raters for this employee"
                              >
                                Remind Raters
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400 italic">
                        No 360 evaluatees nominated in this cycle yet. Click "Nominate 360 Raters" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: FILL 360 REVIEW */}
      {/* ============================================================ */}
      <Modal show={reviewModalOpen} onHide={() => setReviewModalOpen(false)} size="lg" centered>
        <Modal.Header closeButton className="border-b px-4 py-3">
          <Modal.Title className="text-base font-bold text-slate-900 d-flex items-center gap-2">
            <LuSparkles className="text-purple-600" />
            360° Multi-Rater Evaluation Form
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 max-h-[75vh] overflow-y-auto">
          {activeAssignment && (
            <Form onSubmit={handleSubmitReview}>
              {/* Evaluatee Header Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{activeAssignment.evaluatee_name}</div>
                  <div className="text-xs text-slate-500">{activeAssignment.evaluatee_designation} • {activeAssignment.evaluatee_dept}</div>
                </div>

                <div className="text-right">
                  {getRelationshipBadge(activeAssignment.rater_relationship)}
                  {activeAssignment.is_anonymous && (
                    <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 justify-end">
                      <LuShield size={10} /> Anonymous Submission
                    </div>
                  )}
                </div>
              </div>

              {/* 5 Core Competency Rating Cards */}
              <h6 className="font-bold text-slate-900 dark:text-slate-100 mb-3 text-xs uppercase tracking-wider">
                Core Competencies Evaluation (Scale 1.0 to 5.0)
              </h6>

              <div className="space-y-3 mb-4">
                {COMPETENCY_RUBRIC.map((comp) => {
                  const currentScore = formScores[comp.key] || 4;
                  return (
                    <div key={comp.key} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{comp.name}</div>
                          <div className="text-[11px] text-slate-500">{comp.desc}</div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {currentScore} / 5.0
                        </span>
                      </div>

                      {/* 1 to 5 Star Rating Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            type="button"
                            key={score}
                            onClick={() => setFormScores({ ...formScores, [comp.key]: score })}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                              currentScore >= score
                                ? "bg-amber-400 text-slate-900 shadow-xs"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            <LuStar size={12} className="inline mr-1" />
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Qualitative Written Feedback */}
              <h6 className="font-bold text-slate-900 dark:text-slate-100 mb-3 text-xs uppercase tracking-wider">
                Qualitative Behavioral Guidance
              </h6>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Top Standout Strengths & Contributions</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="text-xs"
                  placeholder="What does this person do exceptionally well? Where do they deliver maximum impact?"
                  value={formStrengths}
                  onChange={(e) => setFormStrengths(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Growth Opportunities & Mentorship Areas</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="text-xs"
                  placeholder="Where can this person improve their approach, technical execution, leadership, or communication?"
                  value={formGrowth}
                  onChange={(e) => setFormGrowth(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold">General Constructive Feedback (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="text-xs"
                  placeholder="Any additional feedback, words of encouragement, or collaboration observations..."
                  value={formGeneral}
                  onChange={(e) => setFormGeneral(e.target.value)}
                />
              </Form.Group>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="secondary" size="sm" onClick={() => setReviewModalOpen(false)} className="rounded-pill text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submittingReview} className="rounded-pill text-xs font-bold px-4 py-1.5 shadow-sm">
                  {submittingReview ? "Submitting..." : "Submit 360 Feedback"}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: NOMINATE RATERS */}
      {/* ============================================================ */}
      <Modal show={nominateModalOpen} onHide={() => setNominateModalOpen(false)} size="lg" centered>
        <Modal.Header closeButton className="border-b px-4 py-3">
          <Modal.Title className="text-base font-bold text-slate-900 d-flex items-center gap-2">
            <LuPlus className="text-primary" /> Nominate Multi-Raters (360 Cycle)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSaveNomination}>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Select Evaluatee (Employee Being Evaluated)</Form.Label>
              <Form.Select
                value={nominateEvaluatee}
                onChange={(e) => setNominateEvaluatee(e.target.value)}
                className="text-xs font-semibold"
                required
              >
                <option value="">-- Choose Evaluatee --</option>
                {employeesList.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} ({emp.employee_id}) — {emp.designation} ({emp.dept})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="flex items-center justify-between mb-2">
              <span className="small fw-bold text-slate-700">Assign Reviewers & Perspectives</span>
              <button
                type="button"
                onClick={() =>
                  setNominatedRatersList([
                    ...nominatedRatersList,
                    { rater_id: "", rater_relationship: "Peer", is_anonymous: true },
                  ])
                }
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                + Add Another Rater
              </button>
            </div>

            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
              {nominatedRatersList.map((raterItem, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1">
                    <Form.Select
                      size="sm"
                      value={raterItem.rater_id}
                      onChange={(e) => {
                        const updated = [...nominatedRatersList];
                        updated[idx].rater_id = e.target.value;
                        setNominatedRatersList(updated);
                      }}
                      className="text-xs"
                      required
                    >
                      <option value="">-- Select Reviewer --</option>
                      {employeesList.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.name} — {emp.designation} ({emp.dept})
                        </option>
                      ))}
                    </Form.Select>
                  </div>

                  <div style={{ minWidth: "180px" }}>
                    <Form.Select
                      size="sm"
                      value={raterItem.rater_relationship}
                      onChange={(e) => {
                        const updated = [...nominatedRatersList];
                        updated[idx].rater_relationship = e.target.value;
                        setNominatedRatersList(updated);
                      }}
                      className="text-xs font-semibold"
                    >
                      <option value="Peer">Peer (Colleague)</option>
                      <option value="Subordinate">Subordinate (Upward)</option>
                      <option value="Stakeholder">Cross-Dept Stakeholder</option>
                      <option value="Manager">Direct Manager</option>
                      <option value="Self">Self Evaluation</option>
                    </Form.Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <Form.Check
                      type="checkbox"
                      label="Anonymous"
                      checked={raterItem.is_anonymous}
                      onChange={(e) => {
                        const updated = [...nominatedRatersList];
                        updated[idx].is_anonymous = e.target.checked;
                        setNominatedRatersList(updated);
                      }}
                      className="text-xs"
                    />

                    {nominatedRatersList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNominatedRatersList(nominatedRatersList.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 text-xs p-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button variant="secondary" size="sm" onClick={() => setNominateModalOpen(false)} className="rounded-pill text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={savingNomination} className="rounded-pill text-xs font-bold px-4 py-1.5 shadow-sm">
                {savingNomination ? "Assigning..." : "Assign & Notify Raters"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: LAUNCH NEW 360 CYCLE */}
      {/* ============================================================ */}
      <Modal show={newCycleModalOpen} onHide={() => setNewCycleModalOpen(false)} centered>
        <Modal.Header closeButton className="border-b px-4 py-3">
          <Modal.Title className="text-base font-bold text-slate-900">
            Launch New 360 Feedback Cycle
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreateCycleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Cycle Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Q4 2026 Leadership & Multi-Rater Peer Review"
                value={newCycleForm.title}
                onChange={(e) => setNewCycleForm({ ...newCycleForm, title: e.target.value })}
                className="text-xs"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Due Date for Submissions</Form.Label>
              <Form.Control
                type="date"
                value={newCycleForm.due_date}
                onChange={(e) => setNewCycleForm({ ...newCycleForm, due_date: e.target.value })}
                className="text-xs"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Cycle Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newCycleForm.description}
                onChange={(e) => setNewCycleForm({ ...newCycleForm, description: e.target.value })}
                className="text-xs"
              />
            </Form.Group>

            <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">Anonymity & Threshold Policies:</div>
              <Form.Check
                type="checkbox"
                label="Allow Anonymous Peer Reviews"
                checked={newCycleForm.allow_anonymous_peer}
                onChange={(e) => setNewCycleForm({ ...newCycleForm, allow_anonymous_peer: e.target.checked })}
              />
              <Form.Check
                type="checkbox"
                label="Allow Anonymous Subordinate (Upward) Reviews of Managers"
                checked={newCycleForm.allow_anonymous_subordinate}
                onChange={(e) => setNewCycleForm({ ...newCycleForm, allow_anonymous_subordinate: e.target.checked })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="secondary" size="sm" onClick={() => setNewCycleModalOpen(false)} className="rounded-pill text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={creatingCycle} className="rounded-pill text-xs font-bold px-4 py-1.5 shadow-sm">
                {creatingCycle ? "Launching..." : "Launch Cycle"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
