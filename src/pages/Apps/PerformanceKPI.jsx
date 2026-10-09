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
  ProgressBar,
  Alert,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuAward,
  LuTarget,
  LuTrendingUp,
  LuUsers,
  LuCircleCheck,
  LuClock,
  LuSparkles,
  LuLayers,
  LuPlus,
  LuTrash2,
  LuPencil,
  LuSend,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuUserCheck,
  LuSlidersHorizontal,
  LuStar,
  LuInfo,
  LuArrowRight,
  LuFileSpreadsheet,
  LuChevronRight,
  LuShieldAlert,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api";
import ProbationAppraisalReviews from "./ProbationAppraisalReviews";

// Available cycles
const CYCLES = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "Annual 2025-2026"];

// Departments list
const DEPARTMENTS = [
  "All",
  "Engineering",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Operations",
  "Design",
  "IT Support",
];

// Rating descriptions
const RATING_DESC = {
  1: "1.0 - Needs Improvement",
  2: "2.0 - Developing",
  3: "3.0 - Meets Expectations",
  4: "4.0 - Exceeds Expectations",
  5: "5.0 - Outstanding",
};

// Manager recommendation options
const RECOMMENDATIONS = [
  "Promote / Fast-Track Career Progression",
  "Eligible for Merit Salary Increment",
  "Meets All Key Objectives - Maintain Current Trajectory",
  "Requires Skill Upgradation / Coaching",
  "Enroll in Performance Improvement Plan (PIP)",
];

export default function PerformanceKPI() {
  const navigate = useNavigate();

  // Auth & Role
  const rawRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const isHRorAdmin = ["hr", "admin"].includes(rawRole);
  const isHOD = ["hod", "manager", "teamlead"].includes(rawRole);
  const employeeId = localStorage.getItem("employee_id") || "";
  const userName = localStorage.getItem("name") || "Employee";

  // Tab State: "my_kpi" | "team_reviews" | "calibration" | "templates"
  const defaultTab = isHRorAdmin ? "calibration" : isHOD ? "team_reviews" : "my_kpi";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Selected Review Cycle
  const [selectedCycle, setSelectedCycle] = useState("Q1 2026");

  // Loading states
  const [loadingMyKpi, setLoadingMyKpi] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingAllCompany, setLoadingAllCompany] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // -------------------------------------------------------------
  // Data States
  // -------------------------------------------------------------
  // 1. My KPI (Self-Assessment)
  const [myAssignment, setMyAssignment] = useState(null);
  const [selfGoalDrafts, setSelfGoalDrafts] = useState({});
  const [savingSelf, setSavingSelf] = useState(false);

  // 2. Team Reviews (HOD View)
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [teamDeptFilter, setTeamDeptFilter] = useState("All");

  // 3. Company Cycles (HR View)
  const [companyAssignments, setCompanyAssignments] = useState([]);
  const [hrStatusFilter, setHrStatusFilter] = useState("All");
  const [hrDeptFilter, setHrDeptFilter] = useState("All");
  const [hrSearchQuery, setHrSearchQuery] = useState("");

  // 4. KPI Master Templates
  const [templates, setTemplates] = useState([]);
  const [templateDeptFilter, setTemplateDeptFilter] = useState("All");

  // 5. Employees Master List for Goal Assignment
  const [allEmployees, setAllEmployees] = useState([]);

  // -------------------------------------------------------------
  // Modals
  // -------------------------------------------------------------
  // Modal: Evaluate Team Member (HOD)
  const [evaluateModalOpen, setEvaluateModalOpen] = useState(false);
  const [evaluatingAssignment, setEvaluatingAssignment] = useState(null);
  const [evalGoals, setEvalGoals] = useState([]);
  const [evalRecommendation, setEvalRecommendation] = useState("");
  const [evalRemarks, setEvalRemarks] = useState("");
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  // Modal: HR Calibrate & Sign-Off
  const [calibrateModalOpen, setCalibrateModalOpen] = useState(false);
  const [calibratingItem, setCalibratingItem] = useState(null);
  const [calibratedScore, setCalibratedScore] = useState("4.5");
  const [hrRemarks, setHrRemarks] = useState("");
  const [calibrating, setCalibrating] = useState(false);

  // Modal: Assign Individual Goals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignCycle, setAssignCycle] = useState("Q1 2026");
  const [assignGoalRows, setAssignGoalRows] = useState([
    { title: "", description: "", target: 100, unit: "%", weightage: 25 },
  ]);
  const [assigning, setAssigning] = useState(false);

  // Modal: Bulk Assign Department
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkDept, setBulkDept] = useState("Engineering");
  const [bulkCycle, setBulkCycle] = useState("Q1 2026");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Modal: Create / Edit Template
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    department: "Engineering",
    designation: "All",
    title: "",
    description: "",
    target_metric: 100,
    unit: "%",
    default_weight: 25,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // -------------------------------------------------------------
  // API Fetching Callbacks
  // -------------------------------------------------------------

  // Fetch My KPI Assignment
  const fetchMyKpi = useCallback(async () => {
    setLoadingMyKpi(true);
    try {
      const res = await api.get(`/kpi/my-goals`, {
        params: { cycle_name: selectedCycle },
      });
      if (res.data?.success) {
        const asg = res.data.assignment;
        setMyAssignment(asg);
        // Pre-fill self drafts
        if (asg && asg.goals) {
          const draftMap = {};
          asg.goals.forEach((g) => {
            draftMap[g.id] = {
              actual_achieved: g.actual_achieved !== null && g.actual_achieved !== undefined ? g.actual_achieved : "",
              self_rating: g.self_rating || 3,
              self_comment: g.self_comment || "",
            };
          });
          setSelfGoalDrafts(draftMap);
        } else {
          setSelfGoalDrafts({});
        }
      }
    } catch (err) {
      console.error("Error fetching my KPI:", err);
      // Non-blocking toast on initial load
    } finally {
      setLoadingMyKpi(false);
    }
  }, [selectedCycle]);

  // Fetch Team Reviews (for HOD / HR)
  const fetchTeamReviews = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const params = { cycle_name: selectedCycle };
      if (teamDeptFilter !== "All") params.department = teamDeptFilter;
      const res = await api.get(`/kpi/team-reviews`, { params });
      if (res.data?.success) {
        setTeamAssignments(res.data.assignments || []);
      }
    } catch (err) {
      console.error("Error fetching team reviews:", err);
    } finally {
      setLoadingTeam(false);
    }
  }, [selectedCycle, teamDeptFilter]);

  // Fetch All Company Cycles (for HR Admin)
  const fetchAllCompany = useCallback(async () => {
    setLoadingAllCompany(true);
    try {
      const params = { cycle_name: selectedCycle };
      if (hrStatusFilter !== "All") params.status = hrStatusFilter;
      if (hrDeptFilter !== "All") params.department = hrDeptFilter;
      const res = await api.get(`/kpi/all-cycles`, { params });
      if (res.data?.success) {
        setCompanyAssignments(res.data.assignments || []);
      }
    } catch (err) {
      console.error("Error fetching company KPI cycles:", err);
    } finally {
      setLoadingAllCompany(false);
    }
  }, [selectedCycle, hrStatusFilter, hrDeptFilter]);

  // Fetch KPI Templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const params = {};
      if (templateDeptFilter !== "All") params.department = templateDeptFilter;
      const res = await api.get(`/kpi/templates`, { params });
      if (res.data?.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [templateDeptFilter]);

  // Fetch All Employees for assignment picker
  const fetchEmployeesList = useCallback(async () => {
    try {
      const res = await api.get(`/employees`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAllEmployees(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching employees list:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMyKpi();
    fetchTemplates();
    fetchEmployeesList();
  }, [fetchMyKpi, fetchTemplates, fetchEmployeesList]);

  useEffect(() => {
    if (activeTab === "team_reviews" || isHOD || isHRorAdmin) {
      fetchTeamReviews();
    }
    if (activeTab === "calibration" || isHRorAdmin) {
      fetchAllCompany();
    }
  }, [activeTab, fetchTeamReviews, fetchAllCompany, isHOD, isHRorAdmin]);

  // -------------------------------------------------------------
  // Self-Assessment Actions (Employee)
  // -------------------------------------------------------------
  const handleSaveSelfAssessment = async (isFinalSubmit = false) => {
    if (!myAssignment) return;
    setSavingSelf(true);

    try {
      const payloadGoals = (myAssignment.goals || []).map((g) => {
        const draft = selfGoalDrafts[g.id] || {};
        return {
          id: g.id,
          actual_achieved: parseFloat(draft.actual_achieved) || 0,
          self_rating: parseFloat(draft.self_rating) || 3,
          self_comment: draft.self_comment || "",
        };
      });

      const res = await api.post(`/kpi/my-goals/save`, {
        assignment_id: myAssignment.id,
        goals: payloadGoals,
        is_final_submit: isFinalSubmit,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Self assessment saved!");
        setMyAssignment(res.data.assignment);
      }
    } catch (err) {
      console.error("Save self assessment error:", err);
      toast.error(err.response?.data?.error || "Failed to save self-assessment");
    } finally {
      setSavingSelf(false);
    }
  };

  // -------------------------------------------------------------
  // HOD Evaluation Actions
  // -------------------------------------------------------------
  const openEvaluateModal = (asg) => {
    setEvaluatingAssignment(asg);
    // Pre-populate evaluation goals
    const goalsInit = (asg.goals || []).map((g) => ({
      id: g.id,
      title: g.title,
      target: g.target,
      unit: g.unit,
      weightage: g.weightage,
      actual_achieved: g.actual_achieved,
      self_rating: g.self_rating,
      self_comment: g.self_comment,
      manager_rating: g.manager_rating || g.self_rating || 3,
      manager_comment: g.manager_comment || "",
    }));
    setEvalGoals(goalsInit);
    setEvalRecommendation(asg.manager_recommendation || RECOMMENDATIONS[2]);
    setEvalRemarks(asg.manager_remarks || "");
    setEvaluateModalOpen(true);
  };

  const handleGoalEvalChange = (id, field, value) => {
    setEvalGoals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Dynamically calculate manager weighted score preview
  const calculatedManagerScore = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;
    evalGoals.forEach((g) => {
      const r = parseFloat(g.manager_rating) || 0;
      const w = parseFloat(g.weightage) || 0;
      weightedSum += r * (w / 100);
      totalWeight += w;
    });
    if (totalWeight === 0) return 0;
    return ((weightedSum * 100) / totalWeight).toFixed(2);
  }, [evalGoals]);

  const handleSubmitEvaluation = async () => {
    if (!evaluatingAssignment) return;
    setEvalSubmitting(true);
    try {
      const res = await api.post(`/kpi/team-reviews/${evaluatingAssignment.id}/evaluate`, {
        goals: evalGoals.map((g) => ({
          id: g.id,
          manager_rating: parseFloat(g.manager_rating),
          manager_comment: g.manager_comment,
        })),
        manager_recommendation: evalRecommendation,
        manager_remarks: evalRemarks,
      });

      if (res.data?.success) {
        toast.success("Manager evaluation submitted successfully!");
        setEvaluateModalOpen(false);
        fetchTeamReviews();
        if (isHRorAdmin) fetchAllCompany();
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      toast.error(err.response?.data?.error || "Failed to submit evaluation");
    } finally {
      setEvalSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HR Calibration Actions
  // -------------------------------------------------------------
  const openCalibrateModal = (item) => {
    setCalibratingItem(item);
    // Suggest calibrated score: manager_overall_score or self_overall_score or 4.5
    const initialScore =
      item.final_calibrated_score ||
      item.manager_overall_score ||
      item.self_overall_score ||
      4.5;
    setCalibratedScore(parseFloat(initialScore).toFixed(1));
    setHrRemarks(item.hr_remarks || "Approved and calibrated for the current performance cycle.");
    setCalibrateModalOpen(true);
  };

  const handleCalibrateAndApprove = async () => {
    if (!calibratingItem) return;
    setCalibrating(true);
    try {
      const res = await api.post(`/kpi/calibrate/${calibratingItem.id}`, {
        final_calibrated_score: parseFloat(calibratedScore),
        hr_remarks: hrRemarks,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "KPI Cycle calibrated & profile synced!");
        setCalibrateModalOpen(false);
        fetchAllCompany();
        if (isHOD) fetchTeamReviews();
        // If calibrating self
        if (calibratingItem.employee_id === employeeId) {
          fetchMyKpi();
        }
      }
    } catch (err) {
      console.error("Calibration error:", err);
      toast.error(err.response?.data?.error || "Failed to finalize calibration");
    } finally {
      setCalibrating(false);
    }
  };

  // -------------------------------------------------------------
  // Goal Assignment Wizards (HR / HOD)
  // -------------------------------------------------------------
  const handleAddAssignRow = () => {
    setAssignGoalRows((prev) => [
      ...prev,
      { title: "", description: "", target: 100, unit: "%", weightage: 25 },
    ]);
  };

  const handleRemoveAssignRow = (index) => {
    setAssignGoalRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAssignRowChange = (index, field, value) => {
    setAssignGoalRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const handlePreloadFromTemplates = (dept) => {
    const matched = templates.filter((t) => t.department === dept);
    if (matched.length > 0) {
      setAssignGoalRows(
        matched.map((t) => ({
          title: t.title,
          description: t.description || "",
          target: t.target_metric,
          unit: t.unit,
          weightage: t.default_weight,
        }))
      );
      toast.success(`Pre-loaded ${matched.length} template goals for ${dept}`);
    } else {
      toast("No templates for this department yet. You can add custom goals below.");
    }
  };

  const handleSubmitAssign = async () => {
    if (!assignEmpId) {
      return toast.error("Please select an employee");
    }
    if (assignGoalRows.length === 0) {
      return toast.error("Please add at least one goal");
    }
    const hasEmptyTitle = assignGoalRows.some((g) => !g.title.trim());
    if (hasEmptyTitle) {
      return toast.error("All goals must have a title");
    }

    const totalWeight = assignGoalRows.reduce(
      (acc, g) => acc + (parseFloat(g.weightage) || 0),
      0
    );
    if (Math.abs(totalWeight - 100) > 1) {
      return toast.error(`Total weightage must sum to 100% (currently ${totalWeight}%)`);
    }

    setAssigning(true);
    try {
      const res = await api.post(`/kpi/assign`, {
        employee_id: assignEmpId,
        cycle_name: assignCycle,
        goals: assignGoalRows,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "KPI goals assigned successfully!");
        setAssignModalOpen(false);
        setAssignGoalRows([{ title: "", description: "", target: 100, unit: "%", weightage: 25 }]);
        if (isHRorAdmin) fetchAllCompany();
        if (isHOD) fetchTeamReviews();
        if (assignEmpId === employeeId) fetchMyKpi();
      }
    } catch (err) {
      console.error("Assign error:", err);
      toast.error(err.response?.data?.error || "Failed to assign KPI goals");
    } finally {
      setAssigning(false);
    }
  };

  // Bulk Assign Department
  const handleBulkAssign = async () => {
    if (!bulkDept) return toast.error("Please select a department");
    setBulkAssigning(true);
    try {
      const res = await api.post(`/kpi/bulk-assign`, {
        department: bulkDept,
        cycle_name: bulkCycle,
        template_ids: selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Bulk assignment complete!");
        setBulkAssignModalOpen(false);
        if (isHRorAdmin) fetchAllCompany();
        if (isHOD) fetchTeamReviews();
      }
    } catch (err) {
      console.error("Bulk assign error:", err);
      toast.error(err.response?.data?.error || "Failed to bulk assign KPI");
    } finally {
      setBulkAssigning(false);
    }
  };

  // -------------------------------------------------------------
  // Template CRUD
  // -------------------------------------------------------------
  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      department: "Engineering",
      designation: "All",
      title: "",
      description: "",
      target_metric: 100,
      unit: "%",
      default_weight: 25,
    });
    setTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      department: tpl.department,
      designation: tpl.designation || "All",
      title: tpl.title,
      description: tpl.description || "",
      target_metric: tpl.target_metric,
      unit: tpl.unit,
      default_weight: tpl.default_weight,
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim()) {
      return toast.error("Template title is required");
    }
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        const res = await api.put(`/kpi/templates/${editingTemplate.id}`, templateForm);
        if (res.data?.success) {
          toast.success("Template updated successfully");
          setTemplateModalOpen(false);
          fetchTemplates();
        }
      } else {
        const res = await api.post(`/kpi/templates`, templateForm);
        if (res.data?.success) {
          toast.success("Template created successfully");
          setTemplateModalOpen(false);
          fetchTemplates();
        }
      }
    } catch (err) {
      console.error("Template save error:", err);
      toast.error(err.response?.data?.error || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this template?")) return;
    try {
      const res = await api.delete(`/kpi/templates/${id}`);
      if (res.data?.success) {
        toast.success("Template removed");
        fetchTemplates();
      }
    } catch (err) {
      console.error("Template delete error:", err);
      toast.error("Failed to delete template");
    }
  };

  // -------------------------------------------------------------
  // Helpers & Status Badges
  // -------------------------------------------------------------
  const getStatusBadge = (status) => {
    switch (status) {
      case "Assigned":
        return (
          <Badge bg="primary" className="fw-medium px-2.5 py-1.5 rounded-full text-xs">
            🎯 Goals Set
          </Badge>
        );
      case "Self_Submitted":
        return (
          <Badge bg="warning" text="dark" className="fw-medium px-2.5 py-1.5 rounded-full text-xs">
            ⏳ Self-Submitted (Awaiting HOD)
          </Badge>
        );
      case "HOD_Reviewed":
        return (
          <Badge bg="info" text="dark" className="fw-medium px-2.5 py-1.5 rounded-full text-xs">
            📝 HOD Evaluated (Awaiting HR)
          </Badge>
        );
      case "HR_Approved":
        return (
          <Badge bg="success" className="fw-medium px-2.5 py-1.5 rounded-full text-xs">
            🌟 Approved & Profile Synced
          </Badge>
        );
      default:
        return (
          <Badge bg="secondary" className="fw-medium px-2.5 py-1.5 rounded-full text-xs">
            {status || "Draft"}
          </Badge>
        );
    }
  };

  // Filtered Company Assignments
  const filteredCompanyAssignments = useMemo(() => {
    return companyAssignments.filter((asg) => {
      const query = hrSearchQuery.toLowerCase().trim();
      const empName = (asg.employee?.name || "").toLowerCase();
      const empCode = (asg.employee_id || "").toLowerCase();
      const dept = (asg.department || "").toLowerCase();
      const desig = (asg.designation || "").toLowerCase();

      const matchesQuery =
        !query ||
        empName.includes(query) ||
        empCode.includes(query) ||
        dept.includes(query) ||
        desig.includes(query);

      return matchesQuery;
    });
  }, [companyAssignments, hrSearchQuery]);

  // Dynamic self assessment live calculation
  const liveSelfScore = useMemo(() => {
    if (!myAssignment || !myAssignment.goals) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    myAssignment.goals.forEach((g) => {
      const draft = selfGoalDrafts[g.id] || {};
      const rating = parseFloat(draft.self_rating) || 0;
      const weight = parseFloat(g.weightage) || 0;
      weightedSum += rating * (weight / 100);
      totalWeight += weight;
    });
    if (totalWeight === 0) return 0;
    return ((weightedSum * 100) / totalWeight).toFixed(2);
  }, [myAssignment, selfGoalDrafts]);

  return (
    <div className="performance-kpi-container max-w-7xl mx-auto py-4 bg-slate-50 min-h-screen">
      <Container fluid="2xl px-4">
        {/* Top Header Banner */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="d-flex align-items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white d-flex align-items-center justify-center shadow-md flex-shrink-0">
              <LuAward size={26} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="fw-bold text-slate-800 m-0 text-xl md:text-2xl">
                  Performance & KPI Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  {selectedCycle}
                </span>
              </div>
              <p className="text-slate-500 text-xs md:text-sm m-0 mt-0.5">
                Goal setting, self-assessment, HOD evaluation, and calibrated scorecards synced with your corporate profile.
              </p>
            </div>
          </div>

          {/* Quick cycle & action buttons */}
          <div className="d-flex align-items-center gap-2 flex-wrap justify-end">
            <Form.Select
              size="sm"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="rounded-lg border-slate-300 text-xs font-semibold text-slate-700 w-auto shadow-sm"
            >
              {CYCLES.map((c) => (
                <option key={c} value={c}>
                  Cycle: {c}
                </option>
              ))}
            </Form.Select>

            {(isHRorAdmin || isHOD) && (
              <Button
                variant="outline-primary"
                size="sm"
                className="rounded-lg text-xs font-semibold d-flex align-items-center gap-1.5 shadow-sm"
                onClick={() => setAssignModalOpen(true)}
              >
                <LuPlus size={14} /> Assign Goals
              </Button>
            )}

            {isHRorAdmin && (
              <Button
                variant="primary"
                size="sm"
                className="rounded-lg text-xs font-semibold d-flex align-items-center gap-1.5 shadow-sm bg-indigo-600 border-indigo-600"
                onClick={() => setBulkAssignModalOpen(true)}
              >
                <LuLayers size={14} /> Bulk Assign Dept
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 mb-4 d-flex flex-wrap justify-around align-items-center gap-1">
          <button
            onClick={() => setActiveTab("probation_appraisals")}
            className={`px-2 py-2 rounded-xl text-xs font-semibold d-flex align-items-center gap-1 transition-all ${
              activeTab === "probation_appraisals"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LuAward size={15} /> 6M Probation & Appraisal Reviews
            <span
              className={`ml-1 text-[10px] px-1 py-0.2 rounded-full font-bold ${
                activeTab === "probation_appraisals"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              Questionnaires
            </span>
          </button>

          <button
            onClick={() => setActiveTab("my_kpi")}
            className={`px-2 py-2 rounded-xl text-xs font-semibold d-flex align-items-center gap-1 transition-all ${
              activeTab === "my_kpi"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LuTarget size={15} /> My Scorecard & Self-Assessment
            {myAssignment && (
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "my_kpi"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {myAssignment.status}
              </span>
            )}
          </button>

          {(isHOD || isHRorAdmin) && (
            <button
              onClick={() => setActiveTab("team_reviews")}
              className={`px-2 py-2 rounded-xl text-xs font-semibold d-flex align-items-center gap-1 transition-all ${
                activeTab === "team_reviews"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LuUsers size={15} /> Team Reviews & Evaluations
              {teamAssignments.length > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "team_reviews"
                      ? "bg-white/20 text-white"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {teamAssignments.length}
                </span>
              )}
            </button>
          )}

          {isHRorAdmin && (
            <button
              onClick={() => setActiveTab("calibration")}
              className={`px-2 py-2 rounded-xl text-xs font-semibold d-flex align-items-center gap-1 transition-all ${
                activeTab === "calibration"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LuSlidersHorizontal size={15} /> Company Calibration & Sign-Off
              {companyAssignments.length > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "calibration"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {companyAssignments.length}
                </span>
              )}
            </button>
          )}

          {(isHRorAdmin || isHOD) && (
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-2 py-2 rounded-xl text-xs font-semibold d-flex align-items-center gap-1 transition-all ${
                activeTab === "templates"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LuFileSpreadsheet size={15} /> KPI Master Templates
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "templates"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {templates.length}
              </span>
            </button>
          )}
        </div>

        {/* ============================================================= */}
        {/* TAB 0: 6-MONTH PROBATION & ANNUAL APPRAISAL REVIEWS */}
        {/* ============================================================= */}
        {activeTab === "probation_appraisals" && (
          <ProbationAppraisalReviews />
        )}

        {/* ============================================================= */}
        {/* TAB 1: MY SCORECARD & SELF-ASSESSMENT */}
        {/* ============================================================= */}
        {activeTab === "my_kpi" && (
          <div>
            {loadingMyKpi ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-slate-500 text-sm">Loading your KPI scorecard...</p>
              </div>
            ) : !myAssignment ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 d-flex align-items-center justify-center text-slate-400 mb-3">
                  <LuTarget size={30} />
                </div>
                <h5 className="fw-bold text-slate-800">No KPI Assigned for {selectedCycle}</h5>
                <p className="text-slate-500 text-xs md:text-sm max-w-md mx-auto mb-4">
                  Goals for this performance cycle haven't been assigned yet. Please contact your reporting manager, HOD, or HR team.
                </p>
                {(isHRorAdmin || isHOD) && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-xl px-4 py-2 font-semibold text-xs"
                    onClick={() => {
                      setAssignEmpId(employeeId);
                      setAssignModalOpen(true);
                    }}
                  >
                    Set My Own Goals / Set Team Goals
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {/* Scorecard Hero Banner */}
                <Card className="border-0 shadow-sm rounded-2xl mb-4 overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
                  <Card.Body className="p-4 md:p-6">
                    <Row className="align-items-center gy-4">
                      <Col md={7}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                            {myAssignment.cycle_name}
                          </span>
                          <span className="text-slate-400 text-xs">
                            Dept: <b className="text-white">{myAssignment.department || "General"}</b>
                          </span>
                          <span className="text-slate-400 text-xs">
                            Role: <b className="text-white">{myAssignment.designation || "Member"}</b>
                          </span>
                        </div>
                        <h4 className="fw-bold mb-1">
                          {userName}'s Performance Review
                        </h4>
                        <p className="text-slate-300 text-xs md:text-sm mb-3">
                          Review each assigned key performance objective, record your actual deliverables, and submit your self-rating out of 5.0 stars.
                        </p>
                        <div className="d-flex align-items-center gap-3">
                          {getStatusBadge(myAssignment.status)}
                          {myAssignment.status === "HR_Approved" && (
                            <span className="text-emerald-400 text-xs font-semibold d-flex align-items-center gap-1">
                              <LuCircleCheck size={14} /> Synced to Employee Profile
                            </span>
                          )}
                        </div>
                      </Col>

                      <Col md={5}>
                        <div className="grid grid-cols-3 gap-2 bg-white/10 rounded-xl p-3 border border-white/10 text-center">
                          <div className="p-2">
                            <span className="text-[11px] text-slate-300 block mb-1">Self Rating</span>
                            <div className="text-xl md:text-2xl font-bold text-amber-300">
                              {myAssignment.self_overall_score
                                ? `${parseFloat(myAssignment.self_overall_score).toFixed(1)}`
                                : liveSelfScore > 0
                                ? `${liveSelfScore}`
                                : "—"}
                              <span className="text-xs text-slate-400 font-normal">/5.0</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Employee</span>
                          </div>

                          <div className="p-2 border-l border-white/10">
                            <span className="text-[11px] text-slate-300 block mb-1">HOD Rating</span>
                            <div className="text-xl md:text-2xl font-bold text-indigo-300">
                              {myAssignment.manager_overall_score
                                ? `${parseFloat(myAssignment.manager_overall_score).toFixed(1)}`
                                : "—"}
                              <span className="text-xs text-slate-400 font-normal">/5.0</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Manager</span>
                          </div>

                          <div className="p-2 border-l border-white/10 bg-emerald-500/20 rounded-lg">
                            <span className="text-[11px] text-emerald-200 block mb-1">Final Calibrated</span>
                            <div className="text-xl md:text-2xl font-bold text-emerald-300">
                              {myAssignment.final_calibrated_score
                                ? `${parseFloat(myAssignment.final_calibrated_score).toFixed(1)}`
                                : "—"}
                              <span className="text-xs text-emerald-400 font-normal">/5.0</span>
                            </div>
                            <span className="text-[10px] text-emerald-300">Official KPI</span>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Notice if submitted or finalized */}
                {myAssignment.status === "HR_Approved" && (
                  <Alert variant="success" className="rounded-2xl border-0 shadow-sm mb-4">
                    <div className="d-flex align-items-center gap-2">
                      <LuSparkles className="text-emerald-700" size={20} />
                      <div>
                        <h6 className="fw-bold mb-0 text-emerald-900">
                          Appraisal Completed & Calibrated at {parseFloat(myAssignment.final_calibrated_score).toFixed(1)} / 5.0
                        </h6>
                        <small className="text-emerald-800">
                          HR sign-off was completed. Your official score is automatically shown in the Employee Directory, Profile popup, and analytics.
                          {myAssignment.hr_remarks && ` HR Remarks: "${myAssignment.hr_remarks}"`}
                        </small>
                      </div>
                    </div>
                  </Alert>
                )}

                {myAssignment.status === "Self_Submitted" && (
                  <Alert variant="warning" className="rounded-2xl border-0 shadow-sm mb-4">
                    <div className="d-flex align-items-center gap-2">
                      <LuClock className="text-amber-800" size={20} />
                      <div>
                        <h6 className="fw-bold mb-0 text-amber-900">Self-Assessment Submitted to Manager</h6>
                        <small className="text-amber-800">
                          Your ratings and evidence have been sent to your HOD for formal performance evaluation.
                        </small>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Goal Items List */}
                <div className="space-y-4 mb-4">
                  {(myAssignment.goals || []).map((goal, idx) => {
                    const draft = selfGoalDrafts[goal.id] || {
                      actual_achieved: goal.actual_achieved || "",
                      self_rating: goal.self_rating || 3,
                      self_comment: goal.self_comment || "",
                    };
                    const isReadOnly = myAssignment.status === "HR_Approved";

                    return (
                      <Card
                        key={goal.id}
                        className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:border-slate-300 transition-all bg-white"
                      >
                        <Card.Header className="bg-slate-50/70 border-b border-slate-100 py-3 px-4 d-flex flex-wrap align-items-center justify-between gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs d-flex align-items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="fw-bold text-slate-800 text-sm md:text-base">
                              {goal.title}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <span className="text-xs text-slate-500">
                              Target: <b className="text-slate-800">{goal.target} {goal.unit}</b>
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Weightage: {goal.weightage}%
                            </span>
                          </div>
                        </Card.Header>

                        <Card.Body className="p-4">
                          {goal.description && (
                            <p className="text-xs text-slate-500 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              {goal.description}
                            </p>
                          )}

                          <Row className="gy-3">
                            {/* Actual Achieved */}
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                                  Deliverable Achieved ({goal.unit})
                                </Form.Label>
                                <Form.Control
                                  type="number"
                                  size="sm"
                                  disabled={isReadOnly}
                                  value={draft.actual_achieved}
                                  placeholder={`e.g. ${goal.target}`}
                                  onChange={(e) =>
                                    setSelfGoalDrafts((prev) => ({
                                      ...prev,
                                      [goal.id]: {
                                        ...draft,
                                        actual_achieved: e.target.value,
                                      },
                                    }))
                                  }
                                  className="rounded-lg text-xs"
                                />
                                <div className="text-[11px] text-slate-400 mt-1">
                                  Assigned Target: {goal.target} {goal.unit}
                                </div>
                              </Form.Group>
                            </Col>

                            {/* Self Rating */}
                            <Col md={8}>
                              <Form.Group>
                                <div className="d-flex align-items-center justify-between mb-1">
                                  <Form.Label className="text-xs font-semibold text-slate-700 m-0">
                                    Self-Rating (1.0 - 5.0)
                                  </Form.Label>
                                  <span className="text-xs font-bold text-amber-600">
                                    {RATING_DESC[draft.self_rating] || `${draft.self_rating} Stars`}
                                  </span>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      type="button"
                                      key={star}
                                      disabled={isReadOnly}
                                      onClick={() =>
                                        setSelfGoalDrafts((prev) => ({
                                          ...prev,
                                          [goal.id]: {
                                            ...draft,
                                            self_rating: star,
                                          },
                                        }))
                                      }
                                      className={`p-1.5 rounded-lg border text-sm transition-all d-flex align-items-center justify-center flex-1 ${
                                        draft.self_rating >= star
                                          ? "bg-amber-50 border-amber-300 text-amber-500 shadow-sm"
                                          : "bg-slate-50 border-slate-200 text-slate-300 hover:text-slate-400"
                                      }`}
                                    >
                                      <LuStar
                                        className={draft.self_rating >= star ? "fill-amber-400 text-amber-400" : ""}
                                        size={18}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </Form.Group>
                            </Col>

                            {/* Self Comment / Deliverable evidence */}
                            <Col xs={12}>
                              <Form.Group>
                                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                                  Self-Assessment Comments & Evidence
                                </Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={2}
                                  size="sm"
                                  disabled={isReadOnly}
                                  value={draft.self_comment}
                                  placeholder="Describe how you met or exceeded this metric, key accomplishments, or challenges..."
                                  onChange={(e) =>
                                    setSelfGoalDrafts((prev) => ({
                                      ...prev,
                                      [goal.id]: {
                                        ...draft,
                                        self_comment: e.target.value,
                                      },
                                    }))
                                  }
                                  className="rounded-lg text-xs"
                                />
                              </Form.Group>
                            </Col>

                            {/* Manager Evaluation Readonly if reviewed */}
                            {goal.manager_rating && (
                              <Col xs={12}>
                                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                                  <div className="d-flex align-items-center justify-between mb-1">
                                    <span className="font-semibold text-indigo-900 d-flex align-items-center gap-1">
                                      <LuUserCheck size={14} /> HOD / Manager Evaluation
                                    </span>
                                    <span className="font-bold text-indigo-700">
                                      Rating: {goal.manager_rating} / 5.0
                                    </span>
                                  </div>
                                  <p className="m-0 text-indigo-800">
                                    {goal.manager_comment || "No specific comments recorded by manager."}
                                  </p>
                                </div>
                              </Col>
                            )}
                          </Row>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>

                {/* Footer Save & Submit Bar */}
                {myAssignment.status !== "HR_Approved" && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 d-flex flex-wrap align-items-center justify-between gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-xs text-slate-500">Live Weighted Self Score:</span>
                      <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {liveSelfScore} / 5.0
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={savingSelf}
                        onClick={() => handleSaveSelfAssessment(false)}
                        className="rounded-xl px-4 py-2 text-xs font-semibold"
                      >
                        Save Draft
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={savingSelf}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Submit this self-assessment to your HOD? Once submitted, your ratings will be reviewed by your manager."
                            )
                          ) {
                            handleSaveSelfAssessment(true);
                          }
                        }}
                        className="rounded-xl px-5 py-2 text-xs font-semibold d-flex align-items-center gap-1.5 bg-indigo-600 border-indigo-600"
                      >
                        {savingSelf ? (
                          <>
                            <Spinner size="sm" animation="border" /> Submitting...
                          </>
                        ) : (
                          <>
                            <LuSend size={14} /> Submit to Manager
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: TEAM REVIEWS & EVALUATIONS (HOD) */}
        {/* ============================================================= */}
        {activeTab === "team_reviews" && (
          <div>
            {/* Filters Bar */}
            <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-200 mb-4 d-flex flex-wrap align-items-center justify-between gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500">Department:</span>
                <Form.Select
                  size="sm"
                  value={teamDeptFilter}
                  onChange={(e) => setTeamDeptFilter(e.target.value)}
                  className="rounded-lg text-xs w-auto border-slate-300"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={fetchTeamReviews}
                  className="rounded-lg text-xs font-semibold d-flex align-items-center gap-1"
                >
                  <LuRefreshCw size={13} /> Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setAssignModalOpen(true)}
                  className="rounded-lg text-xs font-semibold d-flex align-items-center gap-1 bg-indigo-600 border-indigo-600"
                >
                  <LuPlus size={13} /> Assign Goals
                </Button>
              </div>
            </div>

            {/* Team Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingTeam ? (
                <div className="p-12 text-center">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-slate-500 text-sm">Loading team reviews...</p>
                </div>
              ) : teamAssignments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <LuUsers size={32} className="mx-auto text-slate-400 mb-2" />
                  <h6 className="fw-bold text-slate-700">No Team KPI Cycles Found</h6>
                  <p className="text-xs max-w-sm mx-auto mb-3">
                    No team members have been assigned KPI goals for {selectedCycle} in this department.
                  </p>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-xl text-xs font-semibold"
                    onClick={() => setAssignModalOpen(true)}
                  >
                    Assign Goals to Team Member
                  </Button>
                </div>
              ) : (
                <Table responsive hover className="m-0 align-middle">
                  <thead className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4 text-center">Self Score</th>
                      <th className="py-3 px-4 text-center">HOD Score</th>
                      <th className="py-3 px-4 text-center">Final Calibrated</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {teamAssignments.map((asg) => {
                      const empName = asg.employee?.name || asg.employee_id;
                      const empEmail = asg.employee?.email || "";
                      const empPhoto = asg.employee?.profile_photo;

                      return (
                        <tr key={asg.id}>
                          <td className="py-3 px-4">
                            <div className="d-flex align-items-center gap-2.5">
                              {empPhoto ? (
                                <img
                                  src={getUploadUrl(empPhoto)}
                                  alt={empName}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold d-flex align-items-center justify-center text-xs">
                                  {empName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="fw-bold text-slate-800 block">{empName}</span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {asg.employee_id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="fw-semibold text-slate-700 block">{asg.department}</span>
                            <span className="text-slate-400 text-[11px]">{asg.designation}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {asg.self_overall_score ? (
                              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                {parseFloat(asg.self_overall_score).toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {asg.manager_overall_score ? (
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                {parseFloat(asg.manager_overall_score).toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {asg.final_calibrated_score ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                {parseFloat(asg.final_calibrated_score).toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">{getStatusBadge(asg.status)}</td>
                          <td className="py-3 px-4 text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="rounded-lg !text-xs font-semibold px-3 py-1"
                              onClick={() => openEvaluateModal(asg)}
                            >
                              {asg.status === "Assigned"
                                ? "Evaluate Early"
                                : asg.status === "Self_Submitted"
                                ? "Evaluate & Score"
                                : "Review"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: COMPANY CALIBRATION & FINAL APPROVAL (HR ADMIN) */}
        {/* ============================================================= */}
        {activeTab === "calibration" && (
          <div>
            {/* Quick KPI stats */}
            <Row className="g-3 mb-4">
              <Col sm={6} lg={3}>
                <Card className="border-0 shadow-sm rounded-2xl bg-white p-3.5 border border-slate-200">
                  <div className="d-flex align-items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Total Appraisals</span>
                      <h4 className="fw-bold text-slate-800 m-0 mt-1">{companyAssignments.length}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 d-flex align-items-center justify-center">
                      <LuLayers size={20} />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col sm={6} lg={3}>
                <Card className="border-0 shadow-sm rounded-2xl bg-white p-3.5 border border-slate-200">
                  <div className="d-flex align-items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Ready for HR Calibration</span>
                      <h4 className="fw-bold text-amber-600 m-0 mt-1">
                        {companyAssignments.filter((a) => a.status === "HOD_Reviewed").length}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 d-flex align-items-center justify-center">
                      <LuSlidersHorizontal size={20} />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col sm={6} lg={3}>
                <Card className="border-0 shadow-sm rounded-2xl bg-white p-3.5 border border-slate-200">
                  <div className="d-flex align-items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Approved & Profile Synced</span>
                      <h4 className="fw-bold text-emerald-600 m-0 mt-1">
                        {companyAssignments.filter((a) => a.status === "HR_Approved").length}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 d-flex align-items-center justify-center">
                      <LuCircleCheck size={20} />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col sm={6} lg={3}>
                <Card className="border-0 shadow-sm rounded-2xl bg-white p-3.5 border border-slate-200">
                  <div className="d-flex align-items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Pending Evaluations</span>
                      <h4 className="fw-bold text-slate-600 m-0 mt-1">
                        {companyAssignments.filter((a) => ["Assigned", "Self_Submitted"].includes(a.status)).length}
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 d-flex align-items-center justify-center">
                      <LuClock size={20} />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Filter Controls */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-4 d-flex flex-wrap align-items-center justify-between gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
                <div className="relative flex-grow-1">
                  <LuSearch className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <Form.Control
                    size="sm"
                    type="text"
                    value={hrSearchQuery}
                    onChange={(e) => setHrSearchQuery(e.target.value)}
                    placeholder="Search by employee name, ID, or designation..."
                    className="!pl-8 rounded-lg text-xs border-slate-300 !w-[350px]"
                  />
                </div>

                <Form.Select
                  size="sm"
                  value={hrStatusFilter}
                  onChange={(e) => setHrStatusFilter(e.target.value)}
                  className="rounded-lg text-xs w-auto border-slate-300"
                >
                  <option value="All">All Statuses</option>
                  <option value="Assigned">Goals Assigned</option>
                  <option value="Self_Submitted">Self-Submitted</option>
                  <option value="HOD_Reviewed">HOD Evaluated</option>
                  <option value="HR_Approved">HR Approved</option>
                </Form.Select>

                <Form.Select
                  size="sm"
                  value={hrDeptFilter}
                  onChange={(e) => setHrDeptFilter(e.target.value)}
                  className="rounded-lg text-xs w-auto border-slate-300"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      Dept: {d}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={fetchAllCompany}
                  className="rounded-lg text-xs font-semibold d-flex align-items-center gap-1"
                >
                  <LuRefreshCw size={13} /> Refresh
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingAllCompany ? (
                <div className="p-12 text-center">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-slate-500 text-sm">Loading company KPI cycles...</p>
                </div>
              ) : filteredCompanyAssignments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <LuShieldAlert size={32} className="mx-auto text-slate-400 mb-2" />
                  <h6 className="fw-bold text-slate-700">No Records Found</h6>
                  <p className="text-xs max-w-sm mx-auto">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              ) : (
                <Table responsive hover className="m-0 align-middle">
                  <thead className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4 text-center">Self Score</th>
                      <th className="py-3 px-4 text-center">HOD Score</th>
                      <th className="py-3 px-4 text-center">Calibrated Score</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {filteredCompanyAssignments.map((asg) => {
                      const empName = asg.employee?.name || asg.employee_id;
                      const empPhoto = asg.employee?.profile_photo;

                      return (
                        <tr key={asg.id}>
                          <td className="py-3 px-4">
                            <div className="d-flex align-items-center gap-2.5">
                              {empPhoto ? (
                                <img
                                  src={getUploadUrl(empPhoto)}
                                  alt={empName}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold d-flex align-items-center justify-center text-xs">
                                  {empName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="fw-bold text-slate-800 block">{empName}</span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {asg.employee_id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="fw-semibold text-slate-700 block">{asg.department}</span>
                            <span className="text-slate-400 text-[11px]">{asg.designation}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {asg.self_overall_score ? (
                              <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                {parseFloat(asg.self_overall_score).toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {asg.manager_overall_score ? (
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                {parseFloat(asg.manager_overall_score).toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {asg.final_calibrated_score ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                {parseFloat(asg.final_calibrated_score).toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">{getStatusBadge(asg.status)}</td>
                          <td className="py-3 px-4 text-end">
                            <Button
                              variant={asg.status === "HR_Approved" ? "outline-secondary" : "primary"}
                              size="sm"
                              className={`rounded-lg !text-xs font-semibold px-3 py-1 ${
                                asg.status !== "HR_Approved" ? "bg-indigo-600 border-indigo-600" : ""
                              }`}
                              onClick={() => openCalibrateModal(asg)}
                            >
                              {asg.status === "HR_Approved" ? "Recalibrate" : "Calibrate & Sign-off"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: MASTER TEMPLATES (HR / HOD) */}
        {/* ============================================================= */}
        {activeTab === "templates" && (
          <div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-4 d-flex flex-wrap align-items-center justify-between gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500">Filter Department:</span>
                <Form.Select
                  size="sm"
                  value={templateDeptFilter}
                  onChange={(e) => setTemplateDeptFilter(e.target.value)}
                  className="rounded-lg text-xs w-auto border-slate-300"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openCreateTemplateModal}
                  className="rounded-lg text-xs font-semibold d-flex align-items-center gap-1.5 bg-indigo-600 border-indigo-600"
                >
                  <LuPlus size={14} /> New KPI Template
                </Button>
              </div>
            </div>

            {/* Template Cards Grid */}
            {loadingTemplates ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-slate-500 text-sm">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
                <LuFileSpreadsheet size={32} className="mx-auto text-slate-400 mb-2" />
                <h6 className="fw-bold text-slate-700">No Templates Found</h6>
                <p className="text-xs max-w-sm mx-auto mb-3">
                  Create master KPI templates to rapidly assign standard deliverables across departments.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                  onClick={openCreateTemplateModal}
                >
                  Create First Template
                </Button>
              </div>
            ) : (
              <Row className="g-3">
                {templates.map((tpl) => (
                  <Col md={6} lg={4} key={tpl.id}>
                    <Card className="border border-slate-200 rounded-2xl shadow-sm h-100 hover:border-slate-300 transition-all bg-white">
                      <Card.Body className="p-4 d-flex flex-column justify-between">
                        <div>
                          <div className="d-flex align-items-center justify-between mb-2">
                            <Badge bg="secondary" className="px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              {tpl.department}
                            </Badge>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              Weight: {tpl.default_weight}%
                            </span>
                          </div>

                          <h6 className="fw-bold text-slate-800 mb-1">{tpl.title}</h6>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {tpl.description || "Standard departmental deliverable metric."}
                          </p>
                        </div>

                        <div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-3 d-flex align-items-center justify-between">
                            <span className="text-slate-500">Default Target:</span>
                            <b className="text-slate-800">
                              {tpl.target_metric} {tpl.unit}
                            </b>
                          </div>

                          <div className="d-flex align-items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="rounded-lg text-xs p-1.5 text-slate-600 hover:text-indigo-600"
                              onClick={() => openEditTemplateModal(tpl)}
                            >
                              <LuPencil size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-lg text-xs p-1.5 text-rose-500 hover:text-rose-700"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                            >
                              <LuTrash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </Container>

      {/* ============================================================= */}
      {/* MODAL 1: EVALUATE TEAM MEMBER (HOD) */}
      {/* ============================================================= */}
      <Modal
        show={evaluateModalOpen}
        onHide={() => setEvaluateModalOpen(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <h5 className="fw-bold text-slate-800 mb-0">HOD Performance Evaluation</h5>
            <small className="text-slate-500">
              Evaluating: <b className="text-slate-800">{evaluatingAssignment?.employee?.name || evaluatingAssignment?.employee_id}</b> ({evaluatingAssignment?.designation}, {evaluatingAssignment?.department})
            </small>
          </div>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 d-flex flex-wrap align-items-center justify-between gap-2">
            <div>
              <span className="text-xs text-slate-500">Cycle: <b>{evaluatingAssignment?.cycle_name}</b></span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-xs text-slate-500">
                Self Rating: <b className="text-amber-600">{evaluatingAssignment?.self_overall_score ? `${evaluatingAssignment.self_overall_score} / 5.0` : "Not Submitted"}</b>
              </span>
            </div>
            <div className="d-flex align-items-center gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Live Manager Score:</span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm">
                {calculatedManagerScore} / 5.0
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {evalGoals.map((g, idx) => (
              <div key={g.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="d-flex align-items-center justify-between mb-2">
                  <div className="fw-bold text-slate-800 text-xs">
                    {idx + 1}. {g.title}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-[11px] text-slate-500">Target: {g.target} {g.unit}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                      {g.weightage}%
                    </span>
                  </div>
                </div>

                {/* Subordinate inputs preview */}
                <div className="p-2 bg-slate-50 rounded-lg text-xs mb-2 border border-slate-100">
                  <div className="d-flex align-items-center justify-between mb-1">
                    <span className="text-slate-500">Subordinate Achieved: <b>{g.actual_achieved || "0"} {g.unit}</b></span>
                    <span className="text-amber-700 font-semibold">Self Rating: {g.self_rating || "—"} / 5.0</span>
                  </div>
                  {g.self_comment && (
                    <p className="m-0 text-slate-600 italic text-[11px]">"{g.self_comment}"</p>
                  )}
                </div>

                {/* Manager rating controls */}
                <Row className="gy-2 align-items-center">
                  <Col md={5}>
                    <Form.Label className="text-[11px] font-semibold text-slate-600 mb-1">
                      Manager Rating ({g.manager_rating} / 5.0)
                    </Form.Label>
                    <div className="d-flex align-items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => handleGoalEvalChange(g.id, "manager_rating", star)}
                          className={`p-1.5 rounded-lg border text-xs flex-1 transition-all d-flex align-items-center justify-center ${
                            g.manager_rating >= star
                              ? "bg-indigo-50 border-indigo-300 text-indigo-600"
                              : "bg-slate-50 border-slate-200 text-slate-300"
                          }`}
                        >
                          <LuStar
                            className={g.manager_rating >= star ? "fill-indigo-600 text-indigo-600" : ""}
                            size={15}
                          />
                        </button>
                      ))}
                    </div>
                  </Col>

                  <Col md={7}>
                    <Form.Label className="text-[11px] font-semibold text-slate-600 mb-1">
                      Manager Feedback on Goal
                    </Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="e.g. Delivered on time with high accuracy"
                      value={g.manager_comment}
                      onChange={(e) => handleGoalEvalChange(g.id, "manager_comment", e.target.value)}
                      className="rounded-lg text-xs"
                    />
                  </Col>
                </Row>
              </div>
            ))}
          </div>

          {/* Overall Recommendation */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <Row className="gy-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                    Formal Manager Recommendation
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={evalRecommendation}
                    onChange={(e) => setEvalRecommendation(e.target.value)}
                    className="rounded-lg text-xs"
                  >
                    {RECOMMENDATIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                    Overall HOD Remarks / Notes for HR
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    size="sm"
                    placeholder="Summary of performance, strengths, areas for coaching..."
                    value={evalRemarks}
                    onChange={(e) => setEvalRemarks(e.target.value)}
                    className="rounded-lg text-xs"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setEvaluateModalOpen(false)}
            className="rounded-xl px-3 py-1.5 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={evalSubmitting}
            onClick={handleSubmitEvaluation}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold bg-indigo-600 border-indigo-600"
          >
            {evalSubmitting ? "Submitting..." : "Submit Evaluation to HR"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: HR CALIBRATION & PROFILE SYNC */}
      {/* ============================================================= */}
      <Modal
        show={calibrateModalOpen}
        onHide={() => setCalibrateModalOpen(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <h5 className="fw-bold text-slate-800 mb-0">Calibrate & Finalize KPI</h5>
            <small className="text-slate-500">
              Employee: <b className="text-slate-800">{calibratingItem?.employee?.name || calibratingItem?.employee_id}</b>
            </small>
          </div>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 text-center text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Self Score</span>
              <b className="text-amber-600 text-sm">
                {calibratingItem?.self_overall_score
                  ? `${parseFloat(calibratingItem.self_overall_score).toFixed(1)} / 5.0`
                  : "N/A"}
              </b>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">HOD Score</span>
              <b className="text-indigo-700 text-sm">
                {calibratingItem?.manager_overall_score
                  ? `${parseFloat(calibratingItem.manager_overall_score).toFixed(1)} / 5.0`
                  : "N/A"}
              </b>
            </div>
          </div>

          {calibratingItem?.manager_recommendation && (
            <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs mb-3 text-indigo-900">
              <span className="font-semibold block mb-0.5">Manager Recommendation:</span>
              <span>{calibratingItem.manager_recommendation}</span>
              {calibratingItem.manager_remarks && (
                <div className="text-[11px] text-indigo-800 mt-1 italic">
                  "{calibratingItem.manager_remarks}"
                </div>
              )}
            </div>
          )}

          <Form.Group className="mb-3">
            <div className="d-flex align-items-center justify-between mb-1">
              <Form.Label className="text-xs font-semibold text-slate-700 m-0">
                Official Calibrated Score (1.0 to 5.0)
              </Form.Label>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {calibratedScore} / 5.0
              </span>
            </div>
            <Form.Range
              min={1.0}
              max={5.0}
              step={0.1}
              value={calibratedScore}
              onChange={(e) => setCalibratedScore(e.target.value)}
              className="w-full"
            />
            <div className="d-flex justify-between text-[10px] text-slate-400 px-1 mt-0.5">
              <span>1.0 (Low)</span>
              <span>3.0 (Meets)</span>
              <span>5.0 (Outstanding)</span>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
              HR Calibration Remarks
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              size="sm"
              value={hrRemarks}
              onChange={(e) => setHrRemarks(e.target.value)}
              placeholder="e.g. Approved for annual salary increment and talent pool."
              className="rounded-lg text-xs"
            />
          </Form.Group>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 d-flex align-items-center gap-2">
            <LuSparkles size={18} className="text-emerald-600 flex-shrink-0" />
            <span>
              <b>Automatic Profile Synchronization:</b> Approving this will immediately update the employee's official rating ({calibratedScore}/5.0) in the Employee Directory, Profile modals, and company dashboards.
            </span>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setCalibrateModalOpen(false)}
            className="rounded-xl px-3 py-1.5 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={calibrating}
            onClick={handleCalibrateAndApprove}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold bg-emerald-600 border-emerald-600 hover:bg-emerald-700"
          >
            {calibrating ? "Finalizing & Syncing..." : "Approve & Sync Profile"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: ASSIGN INDIVIDUAL GOALS */}
      {/* ============================================================= */}
      <Modal
        show={assignModalOpen}
        onHide={() => setAssignModalOpen(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <h5 className="fw-bold text-slate-800 mb-0">Assign KPI Goals to Employee</h5>
            <small className="text-slate-500">
              Customize deliverables, targets, and percentage weightages totaling 100%.
            </small>
          </div>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <Row className="gy-3 mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Select Employee *
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={assignEmpId}
                  onChange={(e) => {
                    const empCode = e.target.value;
                    setAssignEmpId(empCode);
                    const selected = allEmployees.find(
                      (emp) => (emp.employee_code || "").toLowerCase() === empCode.toLowerCase()
                    );
                    if (selected && selected.dept) {
                      handlePreloadFromTemplates(selected.dept);
                    }
                  }}
                  className="rounded-lg text-xs"
                >
                  <option value="">-- Choose Employee --</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.employee_code || emp.id} value={emp.employee_code}>
                      {emp.name} ({emp.employee_code}) - {emp.dept || "General"}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Performance Review Cycle
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={assignCycle}
                  onChange={(e) => setAssignCycle(e.target.value)}
                  className="rounded-lg text-xs"
                >
                  {CYCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex align-items-center justify-between mb-2">
            <h6 className="fw-bold text-slate-800 text-xs m-0">Goals & Key Deliverables</h6>
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleAddAssignRow}
                className="rounded-lg text-xs py-1 px-2.5 font-semibold d-flex align-items-center gap-1"
              >
                <LuPlus size={13} /> Add Goal
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {assignGoalRows.map((row, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="d-flex align-items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Goal #{idx + 1}</span>
                  {assignGoalRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignRow(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs d-flex align-items-center gap-0.5"
                    >
                      <LuTrash2 size={13} /> Remove
                    </button>
                  )}
                </div>

                <Row className="gy-2">
                  <Col md={6}>
                    <Form.Control
                      size="sm"
                      placeholder="Goal Title (e.g. Code Quality & Test Coverage)"
                      value={row.title}
                      onChange={(e) => handleAssignRowChange(idx, "title", e.target.value)}
                      className="rounded-lg text-xs mb-1"
                    />
                    <Form.Control
                      size="sm"
                      placeholder="Description & Expectations"
                      value={row.description}
                      onChange={(e) => handleAssignRowChange(idx, "description", e.target.value)}
                      className="rounded-lg text-xs"
                    />
                  </Col>

                  <Col md={2} xs={4}>
                    <Form.Label className="text-[10px] text-slate-500 mb-0.5">Target</Form.Label>
                    <Form.Control
                      type="number"
                      size="sm"
                      value={row.target}
                      onChange={(e) => handleAssignRowChange(idx, "target", e.target.value)}
                      className="rounded-lg text-xs"
                    />
                  </Col>

                  <Col md={2} xs={4}>
                    <Form.Label className="text-[10px] text-slate-500 mb-0.5">Unit</Form.Label>
                    <Form.Control
                      size="sm"
                      value={row.unit}
                      placeholder="%, hrs, ₹"
                      onChange={(e) => handleAssignRowChange(idx, "unit", e.target.value)}
                      className="rounded-lg text-xs"
                    />
                  </Col>

                  <Col md={2} xs={4}>
                    <Form.Label className="text-[10px] text-slate-500 mb-0.5">Weight %</Form.Label>
                    <Form.Control
                      type="number"
                      size="sm"
                      value={row.weightage}
                      onChange={(e) => handleAssignRowChange(idx, "weightage", e.target.value)}
                      className="rounded-lg text-xs"
                    />
                  </Col>
                </Row>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-slate-100 d-flex align-items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">Total Weightage:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                Math.abs(
                  assignGoalRows.reduce((a, b) => a + (parseFloat(b.weightage) || 0), 0) - 100
                ) <= 1
                  ? "text-emerald-700 bg-emerald-100"
                  : "text-rose-700 bg-rose-100"
              }`}
            >
              {assignGoalRows.reduce((a, b) => a + (parseFloat(b.weightage) || 0), 0)}% (Must equal 100%)
            </span>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setAssignModalOpen(false)}
            className="rounded-xl px-3 py-1.5 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={assigning}
            onClick={handleSubmitAssign}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold bg-indigo-600 border-indigo-600"
          >
            {assigning ? "Assigning..." : "Confirm & Assign Goals"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 4: BULK ASSIGN DEPARTMENT */}
      {/* ============================================================= */}
      <Modal
        show={bulkAssignModalOpen}
        onHide={() => setBulkAssignModalOpen(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <h5 className="fw-bold text-slate-800 mb-0">Bulk Assign KPI by Department</h5>
            <small className="text-slate-500">
              Instantly assign master template goals to all active staff in a department.
            </small>
          </div>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <Form.Group className="mb-3">
            <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
              Select Department
            </Form.Label>
            <Form.Select
              size="sm"
              value={bulkDept}
              onChange={(e) => setBulkDept(e.target.value)}
              className="rounded-lg text-xs"
            >
              {DEPARTMENTS.filter((d) => d !== "All").map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
              Review Cycle
            </Form.Label>
            <Form.Select
              size="sm"
              value={bulkCycle}
              onChange={(e) => setBulkCycle(e.target.value)}
              className="rounded-lg text-xs"
            >
              {CYCLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900">
            <span className="font-semibold block mb-1">Matched Templates for {bulkDept}:</span>
            {templates.filter((t) => t.department === bulkDept).length > 0 ? (
              <ul className="m-0 pl-4 space-y-0.5">
                {templates
                  .filter((t) => t.department === bulkDept)
                  .map((t) => (
                    <li key={t.id}>
                      {t.title} (Target: {t.target_metric} {t.unit}, Weight: {t.default_weight}%)
                    </li>
                  ))}
              </ul>
            ) : (
              <span className="text-rose-600">
                No active templates found for {bulkDept}. Please create templates in the Templates tab first.
              </span>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setBulkAssignModalOpen(false)}
            className="rounded-xl px-3 py-1.5 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={bulkAssigning}
            onClick={handleBulkAssign}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold bg-indigo-600 border-indigo-600"
          >
            {bulkAssigning ? "Assigning..." : `Bulk Assign to All in ${bulkDept}`}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 5: CREATE / EDIT KPI TEMPLATE */}
      {/* ============================================================= */}
      <Modal
        show={templateModalOpen}
        onHide={() => setTemplateModalOpen(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <div>
            <h5 className="fw-bold text-slate-800 mb-0">
              {editingTemplate ? "Edit KPI Template" : "New KPI Master Template"}
            </h5>
            <small className="text-slate-500">
              Define standard measurable goals and default weightages.
            </small>
          </div>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <Row className="gy-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Department
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={templateForm.department}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, department: e.target.value })
                  }
                  className="rounded-lg text-xs"
                >
                  {DEPARTMENTS.filter((d) => d !== "All").map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={templateForm.designation}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, designation: e.target.value })
                  }
                  placeholder="e.g. All or Software Engineer"
                  className="rounded-lg text-xs"
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Goal Title *
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="e.g. Sprint Deliverables On-Time Completion Rate"
                  className="rounded-lg text-xs"
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Description & Measuring Methodology
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  size="sm"
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, description: e.target.value })
                  }
                  placeholder="Explain how this KPI will be measured and scored..."
                  className="rounded-lg text-xs"
                />
              </Form.Group>
            </Col>

            <Col md={4} xs={6}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Target Metric
                </Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  value={templateForm.target_metric}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, target_metric: e.target.value })
                  }
                  className="rounded-lg text-xs"
                />
              </Form.Group>
            </Col>

            <Col md={4} xs={6}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">Unit</Form.Label>
                <Form.Control
                  size="sm"
                  value={templateForm.unit}
                  placeholder="%, score, count"
                  onChange={(e) => setTemplateForm({ ...templateForm, unit: e.target.value })}
                  className="rounded-lg text-xs"
                />
              </Form.Group>
            </Col>

            <Col md={4} xs={12}>
              <Form.Group>
                <Form.Label className="text-xs font-semibold text-slate-700 mb-1">
                  Default Weight %
                </Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  value={templateForm.default_weight}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, default_weight: e.target.value })
                  }
                  className="rounded-lg text-xs"
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setTemplateModalOpen(false)}
            className="rounded-xl px-3 py-1.5 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={savingTemplate}
            onClick={handleSaveTemplate}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold bg-indigo-600 border-indigo-600"
          >
            {savingTemplate ? "Saving..." : "Save Template"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
