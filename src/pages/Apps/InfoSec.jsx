import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Table, Tab, Nav, Spinner, ProgressBar } from "react-bootstrap";
import {
  LuShieldAlert,
  LuShieldCheck,
  LuLock,
  LuFileText,
  LuDownload,
  LuClock,
  LuSearch,
  LuPlus,
  LuUsers,
  LuEye,
  LuRefreshCw,
  LuCircleCheck,
  LuInfo,
  LuPencil,
  LuCheck,
  LuX,
  LuCircleAlert,
  LuPrinter,
  LuAward,
  LuFileSpreadsheet,
  LuCalendar,
  LuSend,
  LuBuilding2,
  LuMonitor,
  LuKey,
  LuMail,
  LuSmartphone,
} from "react-icons/lu";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import api from "../../api/axios";
import { getAuthRole, getAuthEmployeeCode } from "../../utils/auth";

const CORPORATE_ROLES = [
  "hr",
  "admin",
  "accounts",
  "payroll",
  "finance",
  "management",
  "ceo",
  "coo",
  "hrmanager",
];

export default function InfoSec() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my_campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [myCompliance, setMyCompliance] = useState(null);

  // User role & employee code
  const userRole = (getAuthRole() || localStorage.getItem("role") || "employee").toLowerCase();
  const userEmpCode = getAuthEmployeeCode() || localStorage.getItem("employeeCode") || "";
  const isHRorAdmin = CORPORATE_ROLES.includes(userRole);

  // Active Training / Acknowledgment Modal State
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [trainingStep, setTrainingStep] = useState(1); // 1: Guidelines, 2: Phishing Scenarios, 3: Micro-Quiz, 4: Digital Sign-off
  const [quizAnswers, setQuizAnswers] = useState({});
  const [agreedDeclaration, setAgreedDeclaration] = useState(false);
  const [submittingAck, setSubmittingAck] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  // Admin Desk Roster & Filter State
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterCampaignFilter, setRosterCampaignFilter] = useState("All");
  const [rosterDeptFilter, setRosterDeptFilter] = useState("All");
  const [rosterStatusFilter, setRosterStatusFilter] = useState("All");
  const [sendingReminder, setSendingReminder] = useState(false);

  // Create Campaign Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    category: "Phishing & Social Engineering",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    target_departments: "All",
    mandatory: true,
    passing_score: 80,
  });
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Fetch all campaigns and personal compliance
  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, compRes] = await Promise.allSettled([
        api.get("/infosec/campaigns"),
        api.get("/infosec/my-compliance"),
      ]);

      if (campRes.status === "fulfilled" && campRes.value.data?.success) {
        setCampaigns(campRes.value.data.campaigns || []);
        setMetrics(campRes.value.data.metrics || null);
      }

      if (compRes.status === "fulfilled" && compRes.value.data?.success) {
        setMyCompliance(compRes.value.data.compliance || null);
      }
    } catch (err) {
      console.error("Error fetching InfoSec data:", err);
      toast.error("Failed to load InfoSec awareness campaigns");
    } finally {
      setLoading(false);
    }
  };

  // Fetch admin roster
  const fetchRoster = async () => {
    if (!isHRorAdmin) return;
    try {
      setLoadingRoster(true);
      const params = {};
      if (rosterCampaignFilter !== "All") params.campaign_id = rosterCampaignFilter;
      if (rosterDeptFilter !== "All") params.department = rosterDeptFilter;
      if (rosterStatusFilter !== "All") params.status = rosterStatusFilter;
      if (rosterSearch) params.search = rosterSearch;

      const res = await api.get("/infosec/roster", { params });
      if (res.data?.success) {
        setRoster(res.data.roster || []);
      }
    } catch (err) {
      console.error("Error fetching InfoSec roster:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "admin_roster" && isHRorAdmin) {
      fetchRoster();
    }
  }, [activeTab, rosterCampaignFilter, rosterDeptFilter, rosterStatusFilter]);

  // Open Training & Acknowledgment Flow
  const handleOpenTraining = async (campaign) => {
    try {
      const res = await api.get(`/infosec/campaign/${campaign.id}`);
      if (res.data?.success) {
        setSelectedCampaign(res.data.campaign);
        setTrainingStep(1);
        setQuizAnswers({});
        setAgreedDeclaration(false);
        setQuizResult(null);
        setShowTrainingModal(true);
      }
    } catch (err) {
      console.error("Error loading campaign details:", err);
      toast.error("Failed to open campaign training");
    }
  };

  // Handle Quiz Option Selection
  const handleSelectQuizAnswer = (qIdx, optIdx) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx,
    }));
  };

  // Submit Knowledge Check & Acknowledgment Sign-off
  const handleSubmitAcknowledgment = async (e) => {
    if (e) e.preventDefault();
    if (!agreedDeclaration) {
      toast.error("Please read and tick the formal InfoSec compliance declaration.");
      return;
    }

    try {
      setSubmittingAck(true);
      const res = await api.post("/infosec/acknowledge", {
        campaign_id: selectedCampaign.id,
        answers: quizAnswers,
        confirmation_agreed: true,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "InfoSec Compliance Signed Successfully!");
        setQuizResult({
          passed: true,
          score: res.data.score,
          certificate: res.data.certificate,
        });
        fetchData();
        if (isHRorAdmin) fetchRoster();
      }
    } catch (err) {
      console.error("Error submitting acknowledgment:", err);
      if (err.response?.data?.passed === false) {
        setQuizResult({
          passed: false,
          score: err.response.data.score,
          passing_score: err.response.data.passing_score,
          message: err.response.data.message,
        });
      } else {
        toast.error(err.response?.data?.error || "Failed to submit InfoSec acknowledgment");
      }
    } finally {
      setSubmittingAck(false);
    }
  };

  // View Certificate
  const handleOpenCertificate = (cert) => {
    setSelectedCert(cert);
    setShowCertModal(true);
  };

  // Send Reminders (Admin Action)
  const handleSendReminders = async (campaignId, empId = null) => {
    if (sendingReminder) return;
    try {
      setSendingReminder(true);
      const res = await api.post(`/infosec/campaign/${campaignId}/remind`, {
        employee_id: empId,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Reminders dispatched successfully!", {
          id: `infosec-remind-${campaignId}-${empId || "all"}`,
        });
      }
    } catch (err) {
      console.error("Error sending reminders:", err);
      toast.error("Failed to dispatch reminders");
    } finally {
      setSendingReminder(false);
    }
  };

  // Create Campaign (Admin Action)
  const handleCreateCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.end_date) {
      toast.error("Please fill in campaign title and deadline date");
      return;
    }

    try {
      setCreatingCampaign(true);
      const res = await api.post("/infosec/campaign", createForm);
      if (res.data?.success) {
        toast.success(res.data.message || "Campaign created successfully!");
        setShowCreateModal(false);
        fetchData();
        if (isHRorAdmin) fetchRoster();
      }
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast.error(err.response?.data?.error || "Failed to launch campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  // Export Roster to Excel
  const handleExportRosterExcel = () => {
    if (!roster || roster.length === 0) {
      toast.error("No compliance roster records to export");
      return;
    }

    const exportRows = roster.map((r, idx) => ({
      "Sl No": idx + 1,
      "Employee ID": r.employee_id,
      "Employee Name": r.employee_name || "—",
      "Department": r.department || "General",
      "Designation": r.designation || "Staff",
      "Campaign Title": r.campaign?.title || "—",
      "Campaign Code": r.campaign?.campaign_code || "—",
      "Compliance Status": r.status,
      "Knowledge Check Score": r.quiz_score !== null ? `${r.quiz_score}%` : "—",
      "Quiz Attempts": r.quiz_attempts || 0,
      "Acknowledged At": r.acknowledged_at ? new Date(r.acknowledged_at).toLocaleString("en-IN") : "Pending",
      "Signed IP Address": r.ip_address || "—",
      "Certificate Number": r.certificate_number || "—",
      "Verification Hash": r.compliance_hash || "—",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "InfoSec Compliance");
    XLSX.writeFile(workbook, `InfoSec_Compliance_Audit_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("InfoSec compliance audit roster exported to Excel!");
  };

  // Extract distinct departments for filter
  const distinctDepts = useMemo(() => {
    const s = new Set();
    roster.forEach((r) => {
      if (r.department) s.add(r.department);
    });
    return Array.from(s).sort();
  }, [roster]);

  return (
    <Container fluid className="max-w-7xl px-3 px-md-4 py-3">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span className="p-2 rounded-2xl bg-slate-900 text-sky-400">
                <LuShieldAlert size={22} />
              </span>
              <h3 className="fw-black text-slate-900 m-0 text-xl tracking-tight">
                Information Security (InfoSec) Awareness & Compliance Hub
              </h3>
              <Badge bg="dark" className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-pill">
                ISO 27001 &bull; SOC 2 Ready
              </Badge>
              {isHRorAdmin && (
                <Badge bg="primary" className="text-[10px] font-bold px-2 py-1 rounded-pill">
                  Admin / Compliance Desk
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-xs m-0">
              Mandatory periodic cybersecurity training, interactive phishing defense simulations & verified digital compliance acknowledgments.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {isHRorAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="d-flex align-items-center gap-1.5 !rounded-xl !text-xs py-2 px-3 font-semibold bg-slate-900 border-slate-900 hover:bg-slate-800"
              >
                <LuPlus size={15} /> Launch Campaign
              </Button>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={fetchData}
              className="d-flex align-items-center gap-1.5 !rounded-xl !text-xs py-2 px-3 bg-white"
            >
              <LuRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </div>

        {/* EMPLOYEE COMPLIANCE STATUS BANNER */}
        {myCompliance && (
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <Row className="g-3 align-items-center">
              <Col xs={12} md={6}>
                <div className="d-flex align-items-center gap-3">
                  <div className={`p-3 rounded-2xl ${myCompliance.isFullyCompliant ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    {myCompliance.isFullyCompliant ? <LuShieldCheck size={28} /> : <LuCircleAlert size={28} />}
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">My InfoSec Compliance Status:</span>
                      <span className={`badge text-[10px] px-2 py-0.5 rounded-full ${myCompliance.isFullyCompliant ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                        {myCompliance.isFullyCompliant ? "✓ 100% Certified & Compliant" : `Action Required (${myCompliance.pendingCount} Pending)`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      {myCompliance.isFullyCompliant
                        ? "You have completed all mandatory cybersecurity and phishing defense acknowledgments for the current period."
                        : `You have ${myCompliance.pendingCount} campaign(s) awaiting your training review and digital acknowledgment.`}
                    </p>
                  </div>
                </div>
              </Col>

              <Col xs={12} md={6}>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 d-flex justify-content-between align-items-center gap-3">
                  <div className="text-center px-3 border-e border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned</span>
                    <strong className="text-sm font-black text-slate-800">{myCompliance.totalAssigned}</strong>
                  </div>
                  <div className="text-center px-3 border-e border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Completed</span>
                    <strong className="text-sm font-black text-emerald-700">{myCompliance.acknowledgedCount}</strong>
                  </div>
                  <div className="text-center px-3 border-e border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">Pending</span>
                    <strong className="text-sm font-black text-amber-700">{myCompliance.pendingCount}</strong>
                  </div>
                  <div className="flex-grow-1 pe-2">
                    <div className="d-flex justify-content-between text-[10px] font-bold text-slate-600 mb-1">
                      <span>Compliance Score</span>
                      <span>{myCompliance.complianceRate}%</span>
                    </div>
                    <ProgressBar
                      now={myCompliance.complianceRate}
                      variant={myCompliance.isFullyCompliant ? "success" : "warning"}
                      style={{ height: "6px" }}
                      className="rounded-full"
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 mb-4">
          <Nav variant="pills" className="d-flex flex-wrap align-items-center gap-1.5">
            <Nav.Item>
              <Nav.Link
                eventKey="my_campaigns"
                className={`d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer ${activeTab === "my_campaigns" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <LuShieldAlert size={15} />
                <span>Active Awareness Campaigns ({campaigns.length})</span>
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link
                eventKey="security_guidelines"
                className={`d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer ${activeTab === "security_guidelines" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <LuFileText size={15} />
                <span>Security Guidelines & Phishing Red Flags</span>
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link
                eventKey="my_certificates"
                className={`d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer ${activeTab === "my_certificates" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <LuAward size={15} />
                <span>My Certificates ({myCompliance?.certificates?.length || 0})</span>
              </Nav.Link>
            </Nav.Item>

            {isHRorAdmin && (
              <Nav.Item>
                <Nav.Link
                  eventKey="admin_roster"
                  className={`d-flex align-items-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer ${activeTab === "admin_roster" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <LuUsers size={15} />
                  <span>Compliance Audit Roster & Metrics</span>
                  {metrics?.totalPending > 0 && (
                    <Badge bg="danger" className="text-[10px] rounded-full px-1.5 py-0.5">
                      {metrics.totalPending} Pending
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
            )}
          </Nav>
        </div>

        <Tab.Content>
          {/* TAB 1: ACTIVE AWARENESS CAMPAIGNS */}
          <Tab.Pane eventKey="my_campaigns">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" size="sm" />
                <p className="text-xs text-slate-400 mt-2">Loading InfoSec campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-3xl p-5 text-center bg-white">
                <LuShieldCheck size={40} className="text-slate-300 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-800">No Active Campaigns</h5>
                <p className="text-xs text-slate-400 m-0">There are currently no active InfoSec awareness campaigns scheduled.</p>
              </Card>
            ) : (
              <Row className="g-3">
                {campaigns.map((camp) => {
                  const ack = camp.my_acknowledgment;
                  const isCompleted = ack?.status === "Acknowledged";
                  const daysLeft = camp.days_remaining;

                  let urgencyBadge = { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: `${daysLeft} Days Left` };
                  if (isCompleted) {
                    urgencyBadge = { bg: "bg-emerald-50 text-emerald-700 border-emerald-300", label: "✓ Acknowledged" };
                  } else if (daysLeft < 0) {
                    urgencyBadge = { bg: "bg-rose-50 text-rose-700 border-rose-300", label: "Overdue" };
                  } else if (daysLeft <= 3) {
                    urgencyBadge = { bg: "bg-rose-50 text-rose-700 border-rose-300", label: `CRITICAL: ${daysLeft}d left` };
                  } else if (daysLeft <= 7) {
                    urgencyBadge = { bg: "bg-amber-50 text-amber-700 border-amber-300", label: `Warning: ${daysLeft}d left` };
                  }

                  return (
                    <Col xs={12} lg={6} key={camp.id}>
                      <Card className={`border shadow-sm rounded-3xl p-4 h-100 transition-all ${isCompleted ? "border-emerald-200 bg-white" : "border-slate-200 bg-white hover:shadow-md"}`}>
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="badge bg-slate-900 text-sky-300 text-[10px] font-mono px-2 py-1 rounded-md">
                              {camp.campaign_code}
                            </span>
                            <span className="badge bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md">
                              {camp.category}
                            </span>
                          </div>
                          <span className={`badge border text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyBadge.bg}`}>
                            {urgencyBadge.label}
                          </span>
                        </div>

                        <h5 className="font-bold text-slate-900 text-sm mb-1">{camp.title}</h5>
                        <p className="text-slate-500 text-xs mb-3 line-clamp-2">{camp.description}</p>

                        {/* Campaign Meta */}
                        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Compliance Window</span>
                            <span className="font-semibold text-slate-700 text-[11px]">{camp.start_date} to {camp.end_date}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Pass Requirement</span>
                            <span className="font-semibold text-slate-700 text-[11px]">{camp.passing_score}% Score</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Target</span>
                            <span className="font-semibold text-slate-700 text-[11px]">{camp.target_departments}</span>
                          </div>
                        </div>

                        {/* Status / Action Footer */}
                        <div className="d-flex justify-content-between align-items-center pt-2 border-t border-slate-100 mt-auto">
                          {isCompleted ? (
                            <div className="d-flex align-items-center gap-2">
                              <LuCircleCheck size={16} className="text-emerald-600" />
                              <span className="text-xs font-bold text-emerald-700">
                                Completed ({ack.quiz_score}% Score)
                              </span>
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <LuClock size={15} className={daysLeft <= 3 ? "text-rose-600" : "text-amber-600"} />
                              <span className="text-xs font-semibold text-slate-600">
                                {ack?.quiz_attempts > 0 ? `Attempts: ${ack.quiz_attempts} (Score: ${ack.quiz_score}%)` : "Pending Review"}
                              </span>
                            </div>
                          )}

                          <div className="d-flex gap-2">
                            {isCompleted ? (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() =>
                                  handleOpenCertificate({
                                    certificate_number: ack.certificate_number,
                                    compliance_hash: ack.compliance_hash,
                                    employee_name: userEmpCode,
                                    employee_id: userEmpCode,
                                    campaign_title: camp.title,
                                    campaign_code: camp.campaign_code,
                                    campaign_category: camp.category,
                                    quiz_score: ack.quiz_score,
                                    acknowledged_at: ack.acknowledged_at,
                                  })
                                }
                                className="!rounded-xl !text-xs py-1.5 px-3 d-flex align-items-center gap-1 font-semibold"
                              >
                                <LuAward size={13} /> View Certificate
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenTraining(camp)}
                                className="!rounded-xl !text-xs py-1.5 px-3.5 d-flex align-items-center gap-1 font-semibold bg-slate-900 border-slate-900 hover:bg-slate-800"
                              >
                                <LuShieldCheck size={14} /> Start Training & Acknowledgment
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Tab.Pane>

          {/* TAB 2: SECURITY GUIDELINES & PHISHING RED FLAGS */}
          <Tab.Pane eventKey="security_guidelines">
            <Card className="border-0 shadow-sm rounded-3xl p-4 bg-white mb-4">
              <h4 className="fw-bold text-slate-900 text-base mb-1 d-flex align-items-center gap-2">
                <LuLock className="text-indigo-600" /> Corporate Information Security Guidelines & Red Flags
              </h4>
              <p className="text-slate-500 text-xs mb-4">
                Reference standards enforced under ISO 27001 Information Security Management Systems & corporate IT governance.
              </p>

              <Row className="g-3">
                <Col xs={12} md={4}>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 h-100">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                        <LuMail size={18} />
                      </span>
                      <strong className="text-xs text-slate-800">Phishing & URL Inspection</strong>
                    </div>
                    <ul className="text-xs text-slate-600 ps-3 space-y-1.5 m-0">
                      <li>Always verify sender domains letter-by-letter (e.g. <code>zente1ex.com</code> vs <code>zentelex.com</code>).</li>
                      <li>Hover over hyperlinks before clicking to preview the exact target host.</li>
                      <li>Never enter credentials on unverified third-party forms or unfamiliar login pages.</li>
                    </ul>
                  </div>
                </Col>

                <Col xs={12} md={4}>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 h-100">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                        <LuKey size={18} />
                      </span>
                      <strong className="text-xs text-slate-800">Passwords & MFA Hygiene</strong>
                    </div>
                    <ul className="text-xs text-slate-600 ps-3 space-y-1.5 m-0">
                      <li>Use complex passphrases of at least 14 characters combining letters, numbers, and symbols.</li>
                      <li>Never reuse corporate passwords across personal portals (social media, banking, shopping).</li>
                      <li>Deny unauthorized MFA authenticator prompts immediately and notify IT Security.</li>
                    </ul>
                  </div>
                </Col>

                <Col xs={12} md={4}>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 h-100">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                        <LuMonitor size={18} />
                      </span>
                      <strong className="text-xs text-slate-800">Clean Desk & Screen Lock</strong>
                    </div>
                    <ul className="text-xs text-slate-600 ps-3 space-y-1.5 m-0">
                      <li>Lock workstation screen (<code>Win + L</code>) whenever stepping away from your desk.</li>
                      <li>Never leave confidential documents or customer PII exposed on unattended desks.</li>
                      <li>Securely shred printed drafts containing sensitive financial or personal data.</li>
                    </ul>
                  </div>
                </Col>
              </Row>
            </Card>
          </Tab.Pane>

          {/* TAB 3: MY CERTIFICATES */}
          <Tab.Pane eventKey="my_certificates">
            <Card className="border-0 shadow-sm rounded-3xl p-4 bg-white">
              <h4 className="fw-bold text-slate-900 text-base mb-1 d-flex align-items-center gap-2">
                <LuAward className="text-amber-500" /> Earned InfoSec Compliance Certificates
              </h4>
              <p className="text-slate-500 text-xs mb-4">
                Verified digital compliance credentials issued upon completion of periodic InfoSec awareness campaigns.
              </p>

              {!myCompliance?.certificates || myCompliance.certificates.length === 0 ? (
                <div className="text-center py-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <LuAward size={36} className="text-slate-300 mb-2" />
                  <h6 className="text-xs font-bold text-slate-700">No Certificates Earned Yet</h6>
                  <p className="text-xs text-slate-400 m-0">Complete active campaign acknowledgments to earn compliance certificates.</p>
                </div>
              ) : (
                <Row className="g-3">
                  {myCompliance.certificates.map((cert) => (
                    <Col xs={12} md={6} key={cert.id}>
                      <div className="p-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 shadow-xs position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="badge bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            VERIFIED &bull; ISO 27001
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {cert.certificate_number}
                          </span>
                        </div>

                        <h6 className="font-bold text-slate-900 text-sm mb-1">{cert.campaign_title}</h6>
                        <p className="text-[11px] text-slate-500 mb-3">
                          Issued to <strong>{cert.employee_name}</strong> ({cert.employee_id}) on {new Date(cert.acknowledged_at).toLocaleDateString("en-IN")}.
                        </p>

                        <div className="d-flex justify-content-between align-items-center pt-2 border-t border-amber-100">
                          <span className="text-xs font-bold text-emerald-700">
                            Knowledge Score: {cert.quiz_score}%
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenCertificate(cert)}
                            className="!rounded-xl !text-xs py-1.5 px-3 d-flex align-items-center gap-1 bg-slate-900 border-slate-900"
                          >
                            <LuEye size={13} /> View Certificate
                          </Button>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Tab.Pane>

          {/* TAB 4: ADMIN ROSTER & AUDIT DESK */}
          {isHRorAdmin && (
            <Tab.Pane eventKey="admin_roster">
              <Card className="border-0 shadow-sm rounded-3xl p-4 bg-white mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-b border-slate-200 pb-3 mb-4">
                  <div>
                    <h4 className="fw-bold text-slate-900 m-0 text-lg d-flex align-items-center gap-2">
                      <LuFileSpreadsheet className="text-indigo-600" /> Information Security Compliance Audit Desk
                    </h4>
                    <p className="text-slate-500 text-xs m-0">
                      Track employee compliance rates, inspect digital acknowledgment audit trails, send automated reminders, and export records for SOC 2 / ISO 27001 audits.
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={handleExportRosterExcel}
                      className="d-flex align-items-center gap-1.5 !rounded-lg !text-xs py-2 px-3 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                      <LuFileSpreadsheet size={16} /> Excel Audit Export
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={fetchRoster}
                      className="!rounded-lg !text-xs py-2 px-3 d-inline-flex align-items-center gap-1.5"
                    >
                      <LuRefreshCw size={14} className={loadingRoster ? "animate-spin" : ""} /> Refresh
                    </Button>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <Row className="g-3 mb-4">
                  <Col xs={6} md={3}>
                    <div className="p-3 rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-xs">
                      <div className="text-[11px] uppercase font-bold opacity-75">Active Campaigns</div>
                      <div className="text-xl font-black mt-1">{metrics?.activeCampaigns || 0}</div>
                      <div className="text-[10px] opacity-60">Scheduled in-force</div>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs">
                      <div className="text-[11px] uppercase font-bold">Org Compliance Rate</div>
                      <div className="text-xl font-black mt-1">{metrics?.orgComplianceRate || 0}%</div>
                      <div className="text-[10px] opacity-75">{metrics?.totalAcknowledged || 0} of {metrics?.totalAssigned || 0} signed</div>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 shadow-xs">
                      <div className="text-[11px] uppercase font-bold">Pending Actions</div>
                      <div className="text-xl font-black mt-1">{metrics?.totalPending || 0}</div>
                      <div className="text-[10px] opacity-75">Employees in progress</div>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-950 shadow-xs">
                      <div className="text-[11px] uppercase font-bold">Overdue / Non-Compliant</div>
                      <div className="text-xl font-black mt-1">{metrics?.totalOverdue || 0}</div>
                      <div className="text-[10px] opacity-75">Past compliance deadline</div>
                    </div>
                  </Col>
                </Row>

                {/* Filter Controls */}
                <Row className="g-2 mb-3 align-items-center">
                  <Col xs={12} md={4}>
                    <div className="position-relative">
                      <LuSearch className="position-absolute text-slate-400" style={{ top: "11px", left: "12px" }} size={15} />
                      <Form.Control
                        type="text"
                        placeholder="Search employee name, code, certificate #..."
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchRoster()}
                        className="rounded-xl !text-xs py-2 ps-5"
                      />
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Select
                      value={rosterCampaignFilter}
                      onChange={(e) => setRosterCampaignFilter(e.target.value)}
                      className="rounded-xl !text-xs py-2"
                    >
                      <option value="All">All Campaigns</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col xs={6} md={3}>
                    <Form.Select
                      value={rosterStatusFilter}
                      onChange={(e) => setRosterStatusFilter(e.target.value)}
                      className="rounded-xl !text-xs py-2"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Acknowledged">Acknowledged (Compliant)</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </Form.Select>
                  </Col>
                  <Col xs={12} md={2}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={fetchRoster}
                      className="w-100 !rounded-lg !text-xs py-2 bg-slate-900 border-slate-900"
                    >
                      Apply Filter
                    </Button>
                  </Col>
                </Row>

                {/* Audit Roster Table */}
                {loadingRoster ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="text-xs text-slate-400 mt-2 mb-0">Loading employee compliance audit roster...</p>
                  </div>
                ) : roster.length === 0 ? (
                  <div className="text-center py-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <LuUsers size={36} className="text-slate-300 mb-2" />
                    <h6 className="text-xs font-bold text-slate-700">No Roster Records Found</h6>
                    <p className="text-xs text-slate-400 m-0">No employee acknowledgments match the current filters.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 text-xs">
                      <thead className="bg-slate-50 text-slate-600 text-[11px] text-uppercase">
                        <tr>
                          <th className="py-2.5">Employee</th>
                          <th className="py-2.5">Campaign</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Quiz Score</th>
                          <th className="py-2.5">Signed Timestamp</th>
                          <th className="py-2.5">IP & Certificate</th>
                          <th className="py-2.5 text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((r) => {
                          const isAck = r.status === "Acknowledged";
                          return (
                            <tr key={r.id}>
                              <td>
                                <div>
                                  <strong className="text-slate-800 d-block">{r.employee_name || "—"}</strong>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {r.employee_id} &bull; {r.department || "General"}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <strong className="text-slate-800 d-block text-xs">{r.campaign?.title || "—"}</strong>
                                <span className="text-[10px] text-slate-400">{r.campaign?.category || "—"}</span>
                              </td>
                              <td>
                                {isAck ? (
                                  <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 rounded-full">
                                    ✓ Acknowledged
                                  </span>
                                ) : r.status === "Overdue" ? (
                                  <span className="badge bg-rose-100 text-rose-800 border border-rose-300 text-[10px] px-2 py-0.5 rounded-full">
                                    Overdue
                                  </span>
                                ) : (
                                  <span className="badge bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded-full">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td>
                                {r.quiz_score !== null ? (
                                  <div>
                                    <strong className="text-slate-800">{r.quiz_score}%</strong>
                                    <span className="d-block text-[10px] text-slate-400">{r.quiz_attempts} attempt(s)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td>
                                {r.acknowledged_at ? (
                                  <div>
                                    <span className="text-[11px] text-slate-700 d-block">
                                      {new Date(r.acknowledged_at).toLocaleDateString("en-IN")}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(r.acknowledged_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Not signed</span>
                                )}
                              </td>
                              <td>
                                {r.certificate_number ? (
                                  <div>
                                    <span className="font-mono text-[10px] font-bold text-indigo-700 d-block">
                                      {r.certificate_number}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      IP: {r.ip_address || "127.0.0.1"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="text-end">
                                {isAck ? (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenCertificate({
                                        certificate_number: r.certificate_number,
                                        compliance_hash: r.compliance_hash,
                                        employee_name: r.employee_name,
                                        employee_id: r.employee_id,
                                        department: r.department,
                                        campaign_title: r.campaign?.title,
                                        campaign_code: r.campaign?.campaign_code,
                                        campaign_category: r.campaign?.category,
                                        quiz_score: r.quiz_score,
                                        acknowledged_at: r.acknowledged_at,
                                      })
                                    }
                                    className="rounded-lg text-xs py-1 px-2.5"
                                  >
                                    View Certificate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    disabled={sendingReminder}
                                    onClick={() => handleSendReminders(r.campaign_id, r.employee_id)}
                                    className="rounded-lg text-xs py-1 px-2.5 d-inline-flex align-items-center gap-1"
                                  >
                                    <LuSend size={12} /> Remind
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card>
            </Tab.Pane>
          )}
        </Tab.Content>
      </Tab.Container>

      {/* INTERACTIVE INFOSEC TRAINING & ACKNOWLEDGMENT MODAL */}
      <Modal show={showTrainingModal} onHide={() => setShowTrainingModal(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton className="border-b border-slate-200">
          <div>
            <span className="badge bg-slate-900 text-sky-400 text-[10px] font-mono px-2 py-0.5 rounded-md me-2">
              {selectedCampaign?.campaign_code}
            </span>
            <Modal.Title className="text-base font-bold text-slate-900 d-inline align-middle">
              {selectedCampaign?.title}
            </Modal.Title>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4">
          {/* Progress Steps Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            {[
              { num: 1, label: "Guidelines" },
              { num: 2, label: "Phishing Scenarios" },
              { num: 3, label: "Knowledge Check" },
              { num: 4, label: "Digital Sign-off" },
            ].map((step) => (
              <div
                key={step.num}
                onClick={() => setTrainingStep(step.num)}
                className={`flex-fill text-center py-1.5 px-2 rounded-xl cursor-pointer text-xs font-bold transition-all ${trainingStep === step.num
                    ? "bg-slate-900 text-white shadow-xs"
                    : trainingStep > step.num
                      ? "bg-emerald-100 text-emerald-800"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
              >
                <span>{trainingStep > step.num ? "✓" : step.num}.</span> {step.label}
              </div>
            ))}
          </div>

          {/* STEP 1: GUIDELINES & MODULES */}
          {trainingStep === 1 && (
            <div className="space-y-3">
              <h5 className="text-sm font-bold text-slate-900 mb-2">Core Security Guidelines & Procedures</h5>
              {(!selectedCampaign?.training_modules || selectedCampaign.training_modules.length === 0) ? (
                <p className="text-xs text-slate-500">Please review standard security guidelines.</p>
              ) : (
                selectedCampaign.training_modules.map((mod, idx) => (
                  <div key={mod.id || idx} className="p-3.5 rounded-2xl border border-slate-200 bg-white">
                    <strong className="text-xs text-slate-800 d-block mb-1.5">
                      {idx + 1}. {mod.title}
                    </strong>
                    <ul className="text-xs text-slate-600 ps-3 m-0 space-y-1">
                      {mod.key_points?.map((pt, ptIdx) => (
                        <li key={ptIdx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}

              <div className="d-flex justify-content-end pt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setTrainingStep(2)}
                  className="rounded-xl px-4 py-2 text-xs bg-slate-900 border-slate-900 font-semibold"
                >
                  Continue to Phishing Scenarios &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PHISHING SCENARIOS */}
          {trainingStep === 2 && (
            <div className="space-y-3">
              <h5 className="text-sm font-bold text-slate-900 mb-1">Real-World Phishing Simulation Scenarios</h5>
              <p className="text-xs text-slate-500 mb-3">
                Inspect how real spear-phishing attacks unfold and learn how to identify hidden indicators before clicking.
              </p>

              {(!selectedCampaign?.quiz_questions?.scenarios || selectedCampaign.quiz_questions.scenarios.length === 0) ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Standard scenario: Watch out for urgent password expiration and external sender domains.
                </div>
              ) : (
                selectedCampaign.quiz_questions.scenarios.map((sim, sIdx) => (
                  <div key={sim.id || sIdx} className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong className="text-xs text-slate-900">{sim.scenario_title}</strong>
                      <span className="badge bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-2 py-0.5 rounded-full">
                        Simulated Attack
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono mb-2">
                      <div className="text-slate-500 text-[11px]">From: <span className="text-rose-700 font-bold">{sim.sender}</span></div>
                      <div className="text-slate-500 text-[11px]">Subject: <span className="text-slate-800 font-bold">{sim.subject}</span></div>
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-slate-700 text-[11px] font-sans">
                        {sim.body_preview}
                      </div>
                    </div>

                    <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-xs">
                      <strong className="text-amber-900 text-[11px] uppercase tracking-wider block mb-1">
                        🚨 Attack Red Flags:
                      </strong>
                      <ul className="text-xs text-amber-800 ps-3 m-0 space-y-0.5">
                        {sim.red_flags?.map((rf, rfIdx) => (
                          <li key={rfIdx}>{rf}</li>
                        ))}
                      </ul>
                      <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 text-emerald-800 font-semibold text-[11px]">
                        ✓ Correct Safe Action: {sim.safe_action}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="d-flex justify-content-between pt-3">
                <Button variant="light" size="sm" onClick={() => setTrainingStep(1)} className="rounded-xl text-xs px-3">
                  &larr; Back to Guidelines
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setTrainingStep(3)}
                  className="rounded-xl px-4 py-2 text-xs bg-slate-900 border-slate-900 font-semibold"
                >
                  Proceed to Knowledge Check &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: KNOWLEDGE CHECK (MICRO-QUIZ) */}
          {trainingStep === 3 && (
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-bold text-slate-900 mb-1">Cybersecurity & Phishing Defense Knowledge Check</h5>
                <p className="text-xs text-slate-500 m-0">
                  Passing threshold is <strong>{selectedCampaign?.passing_score || 80}%</strong>. Select the best cybersecurity action for each practical scenario.
                </p>
              </div>

              {quizResult && !quizResult.passed && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-800">
                  <strong>Notice:</strong> {quizResult.message}
                </div>
              )}

              {(!selectedCampaign?.quiz_questions?.questions || selectedCampaign.quiz_questions.questions.length === 0) ? (
                <p className="text-xs text-slate-500">No quiz questions defined.</p>
              ) : (
                selectedCampaign.quiz_questions.questions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="p-3.5 rounded-2xl border border-slate-200 bg-white">
                    <strong className="text-xs text-slate-800 d-block mb-2">
                      Question {qIdx + 1}: {q.question}
                    </strong>

                    <div className="space-y-2">
                      {q.options?.map((opt, optIdx) => (
                        <Form.Check
                          key={optIdx}
                          type="radio"
                          id={`q-${qIdx}-opt-${optIdx}`}
                          name={`question-${qIdx}`}
                          label={<span className="text-xs text-slate-700">{opt}</span>}
                          checked={quizAnswers[qIdx] === optIdx}
                          onChange={() => handleSelectQuizAnswer(qIdx, optIdx)}
                          className="cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}

              <div className="d-flex justify-content-between pt-3">
                <Button variant="light" size="sm" onClick={() => setTrainingStep(2)} className="rounded-xl text-xs px-3">
                  &larr; Back to Scenarios
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setTrainingStep(4)}
                  className="rounded-xl px-4 py-2 text-xs bg-slate-900 border-slate-900 font-semibold"
                >
                  Proceed to Digital Sign-off &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: DIGITAL SIGN-OFF & ACKNOWLEDGMENT */}
          {trainingStep === 4 && (
            <div>
              {quizResult?.passed ? (
                <div className="text-center py-4 bg-emerald-50 rounded-3xl border border-emerald-200 mb-3">
                  <LuCircleCheck size={48} className="text-emerald-600 mx-auto mb-2" />
                  <h5 className="font-bold text-emerald-900 text-base">InfoSec Awareness Verified!</h5>
                  <p className="text-xs text-emerald-700 mb-3">
                    You scored <strong>{quizResult.score}%</strong> on the knowledge check and successfully signed the compliance declaration.
                  </p>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setShowTrainingModal(false);
                      handleOpenCertificate(quizResult.certificate);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-semibold"
                  >
                    <LuAward className="me-1 d-inline" /> View & Print Certificate
                  </Button>
                </div>
              ) : (
                <Form onSubmit={handleSubmitAcknowledgment}>
                  <h5 className="text-sm font-bold text-slate-900 mb-2">Formal InfoSec Compliance Declaration</h5>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-700 mb-3 font-mono whitespace-pre-line leading-relaxed">
                    {selectedCampaign?.acknowledgment_statement}
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="agreed-declaration-chk"
                      checked={agreedDeclaration}
                      onChange={(e) => setAgreedDeclaration(e.target.checked)}
                      label={
                        <span className="text-xs font-bold text-slate-900">
                          I certify that I have read, understood, and agree to strictly comply with all Information Security policies, clean desk rules, and phishing defense protocols.
                        </span>
                      }
                      className="cursor-pointer"
                      required
                    />
                  </Form.Group>

                  <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-[11px] text-blue-800 mb-3">
                    <LuInfo size={14} className="me-1 d-inline" />
                    Your digital sign-off timestamp and client IP address will be recorded in the audit trail for ISO 27001 & SOC 2 compliance verification.
                  </div>

                  <div className="d-flex justify-content-between pt-2">
                    <Button variant="light" size="sm" onClick={() => setTrainingStep(3)} className="rounded-xl text-xs px-3">
                      &larr; Back to Quiz
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={submittingAck || !agreedDeclaration}
                      className="rounded-xl px-4 py-2 text-xs font-bold bg-slate-900 border-slate-900"
                    >
                      {submittingAck ? "Verifying & Signing..." : "Digitally Sign & Complete Acknowledgment"}
                    </Button>
                  </div>
                </Form>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* CERTIFICATE DISPLAY & PRINT MODAL */}
      <Modal show={showCertModal} onHide={() => setShowCertModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-b border-slate-200">
          <Modal.Title className="text-sm font-bold d-flex align-items-center gap-2">
            <LuAward className="text-amber-500" /> Certificate of InfoSec Awareness & Compliance
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedCert && (
            <div id="infosec-printable-cert" className="border-4 border-amber-300 rounded-3xl p-4 p-md-5 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 text-center position-relative shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                🛡️ Zentelex Corporate Cybersecurity & IT Governance
              </div>
              <h2 className="fw-black text-slate-900 text-2xl tracking-tight mb-2">
                CERTIFICATE OF COMPLIANCE
              </h2>
              <div className="w-16 h-1 bg-amber-400 mx-auto rounded-full mb-3" />

              <p className="text-xs text-slate-500 mb-2">This is to officially certify that</p>
              <h3 className="fw-bold text-slate-900 text-xl text-decoration-underline mb-1">
                {selectedCert.employee_name || selectedCert.employee_id}
              </h3>
              <p className="text-xs text-slate-500 mb-3 font-mono">
                Employee Code: {selectedCert.employee_id} &bull; {selectedCert.department || "General"}
              </p>

              <p className="text-xs text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
                has successfully completed mandatory Information Security awareness training, passed the phishing defense knowledge check with a score of <strong>{selectedCert.quiz_score}%</strong>, and digitally signed the annual cybersecurity compliance declaration for:
              </p>

              <div className="bg-slate-900 text-white py-2 px-4 rounded-xl d-inline-block text-xs font-bold mb-4 shadow-xs">
                {selectedCert.campaign_title}
              </div>

              <div className="d-flex justify-content-between align-items-end pt-3 border-t border-slate-200 text-start text-xs text-slate-500">
                <div>
                  <span className="text-[10px] uppercase font-bold block text-slate-400">Certificate No:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">{selectedCert.certificate_number}</span>
                  <span className="text-[10px] uppercase font-bold block text-slate-400 mt-1">Audit Hash:</span>
                  <span className="font-mono text-[9px] text-slate-500">{selectedCert.compliance_hash}</span>
                </div>
                <div className="text-end">
                  <span className="text-[10px] uppercase font-bold block text-slate-400">Date Completed:</span>
                  <strong className="text-slate-800 text-[11px]">
                    {selectedCert.acknowledged_at ? new Date(selectedCert.acknowledged_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}
                  </strong>
                  <div className="mt-1 pt-1 border-t border-slate-300 text-[10px] text-emerald-700 font-bold">
                    ✓ Verified Digital Signature
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="light" size="sm" onClick={() => setShowCertModal(false)} className="rounded-xl text-xs px-3">
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl text-xs px-4 bg-slate-900 border-slate-900 d-flex align-items-center gap-1.5"
            >
              <LuPrinter size={13} /> Print Certificate
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* CREATE CAMPAIGN MODAL (ADMIN) */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton className="border-b border-slate-200">
          <Modal.Title className="text-sm font-bold d-flex align-items-center gap-2">
            <LuPlus className="text-indigo-600" /> Launch New InfoSec Awareness Campaign
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreateCampaignSubmit}>
            <Row className="g-3">
              <Col xs={12} md={8}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Campaign Title *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Q2 2026 Remote Work & Device Security Awareness"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="rounded-xl !text-xs py-2"
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Category *</Form.Label>
                  <Form.Select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="rounded-xl !text-xs py-2"
                  >
                    <option value="Phishing & Social Engineering">Phishing & Social Engineering</option>
                    <option value="Clean Desk & Clear Screen">Clean Desk & Clear Screen</option>
                    <option value="Password Security & MFA">Password Security & MFA</option>
                    <option value="Data Classification & Privacy">Data Classification & Privacy</option>
                    <option value="Incident Reporting & BYOD">Incident Reporting & BYOD</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Describe the campaign objectives, scope, and expected employee compliance outcomes..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="rounded-xl !text-xs"
                  />
                </Form.Group>
              </Col>

              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="rounded-xl !text-xs py-2"
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Compliance Deadline *</Form.Label>
                  <Form.Control
                    type="date"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="rounded-xl !text-xs py-2"
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Passing Score (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="50"
                    max="100"
                    value={createForm.passing_score}
                    onChange={(e) => setCreateForm({ ...createForm, passing_score: e.target.value })}
                    className="rounded-xl !text-xs py-2"
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label className="text-xs fw-bold text-slate-700">Target Departments</Form.Label>
                  <Form.Select
                    value={createForm.target_departments}
                    onChange={(e) => setCreateForm({ ...createForm, target_departments: e.target.value })}
                    className="rounded-xl !text-xs py-2"
                  >
                    <option value="All">All Departments</option>
                    {distinctDepts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <Button variant="light" size="sm" onClick={() => setShowCreateModal(false)} className="rounded-xl text-xs px-3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={creatingCampaign} className="rounded-xl text-xs px-4 bg-slate-900 border-slate-900 font-semibold">
                {creatingCampaign ? "Launching Campaign..." : "Launch Campaign & Assign Roster"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #infosec-printable-cert, #infosec-printable-cert * {
            visibility: visible;
          }
          #infosec-printable-cert {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Container>
  );
}
