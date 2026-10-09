import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Container,
  Spinner,
  Form,
  InputGroup,
  Badge,
  Row,
  Col,
  Modal,
  Table,
  Alert,
  Card,
  Dropdown,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuMail,
  LuPhone,
  LuEye,
  LuLayoutGrid,
  LuList,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuSettings,
  LuShieldCheck,
  LuFileText,
  LuSearch,
  LuRefreshCw,
  LuDownload,
  LuCheck,
  LuX,
  LuBriefcase,
  LuBuilding,
  LuCalendar,
  LuUser,
  LuExternalLink,
  LuFilter,
  LuArrowUpDown,
} from "react-icons/lu";
import { BsThreeDots } from "react-icons/bs";
import { getApiBaseUrl, getBackendBaseUrl, getUploadUrl, UPLOADS_BASE } from "../../api/axios";

const API = getApiBaseUrl();

const DEFAULT_USER_AVATAR = "/default-avatar.svg";

const getEmployeeAvatar = (emp) => {
  const photo = emp?.profile_photo || emp?.profile_pic || emp?.avatar;
  if (photo && typeof photo === "string" && photo.trim() !== "") {
    return getUploadUrl(photo.trim());
  }
  return DEFAULT_USER_AVATAR;
};

const ALL_TABS = [
  { id: 1, name: "Attendance Tracker", desc: "Track daily shift times, roster logs, and check-in history", badge: "Attendance" },
  { id: 2, name: "Leave Requests", desc: "Apply for leaves, view balances, and check status", badge: "Leaves" },
  { id: 3, name: "Payroll & Salary", desc: "Review monthly salary slips, tax records, and allowances", badge: "Payroll" },
  { id: 14, name: "Salary Slips (Payslips)", desc: "Download and view official monthly salary payslips and earnings", badge: "Payslip" },
  { id: 4, name: "Profile & Documents", desc: "Update personal records and upload files for HR review", badge: "Profile" },
  { id: 5, name: "Candidate Evaluation", desc: "Manage candidate interview evaluations, question bank, and feedback scorecards", badge: "Hiring" },
  { id: 6, name: "Performance Appraisal", desc: "Review annual/probation appraisals, feedback loops, and rating scorecards", badge: "Appraisal" },
  { id: 15, name: "Performance KPI", desc: "Set performance goals, track KPI achievements, and review PMS scorecards", badge: "KPI" },
  { id: 7, name: "Training Modules", desc: "Access company training modules, induction resources, and onboarding tasks", badge: "Training" },
  { id: 8, name: "IT Declaration", desc: "Declare tax investments, 80C/80D deductions, and tax regime", badge: "Taxation" },
  { id: 9, name: "ID-Card & Documents", desc: "Preview official corporate badge, upload ID proofs, and download digital ID", badge: "Identity" },
  { id: 10, name: "Mediclaim & Health Insurance", desc: "Digital health E-card, covered dependents, hospital list, and insurance claims", badge: "Mediclaim" },
  { id: 11, name: "Holiday Calendar", desc: "View company holiday list, festival breaks, and official days off", badge: "Calendar" },
  { id: 12, name: "Company Policies", desc: "Access company policies, code of conduct, and employee handbook", badge: "Policy" },
  { id: 13, name: "Separation & Resignation", desc: "Submit formal resignation notice, track clearances, and exit tasks", badge: "Exit" },
  { id: 16, name: "Work Schedule & Roster", desc: "View weekly shift schedules, roster duties, and timing allocations", badge: "Schedule" },
  { id: 17, name: "Job Requisition Desk", desc: "Raise workforce requisitions, job vacancies, and review candidate applications", badge: "Requisition" },
  { id: 18, name: "Employee Onboarding", desc: "Complete employee onboarding checklists, doc verification, and asset allocation", badge: "Onboarding" },
];

const EMPTY_FORM = {
  employee_code: "",
  salutation: "Mr.",
  name: "",
  dept: "",
  designation: "",
  email: "",
  work_email: "",
  personal_email: "",
  pan_no: "",
  aadhaar_no: "",
  request_documents: true,
  job_role: "employee",
  status: "Active",
  employment_type: "Permanent",
  current_salary: "",
  salary_type: "Monthly (In Hand)",
  reporting_manager: "",
  joining_date: "",
  phone_no: "",
  password: "User@123",
  kpi: "",
  tabs_enabled: false,
  facilities: {
    advance: true,
    loan: true,
    insurance: true,
    gratuity: true,
  },
  esi_threshold: "",
  esi_slab_type: "global",
  group_name: "TATA Company",
  company_name: "TATA Steel",
  work_location: "Kolkata",
};

const InfoRow = ({ label, value }) => (
  <div className="d-flex justify-content-between border-bottom mb-1 pb-1">
    <small className="text-muted fw-bold text-nowrap me-2">{label}:</small>
    <small className="text-end text-break">{value || "—"}</small>
  </div>
);

/* ── Salary Modal ── */
const SalaryStructureModal = ({
  show,
  onHide,
  employeeCode,
  employeeName,
  canEdit = false,
  role = "hr",
  onSalaryUpdated,
}) => {
  const [formData, setFormData] = useState({
    basic: 0,
    hra: 0,
    allowance: 0,
    conveyance: 0,
    medical: 0,
    professional_tax: 0,
    income_tax: 0,
    pf: 0,
    esi: 0,
    mediclaim: 0,
    tds: 0,
    lop: 0,
    employment_type: "Permanent",
  });
  const [esiThreshold, setEsiThreshold] = useState(21000);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [quickGross, setQuickGross] = useState("");

  // Determine if editing is allowed (HR, Accounts, Payroll, or Admin)
  const isHRUser =
    canEdit ||
    ["hr", "hrmanager", "admin", "accounts", "payroll"].includes(
      (role || localStorage.getItem("role") || "").toLowerCase()
    );

  useEffect(() => {
    if (show && employeeCode) {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      const cleanCode = String(employeeCode || "").replace(/^#/, "").trim();

      fetch(`${API}/employees/${cleanCode}/salary?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", role: role || "hr" },
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.salary) {
            const e = res.salary.earnings || {};
            const d = res.salary.deductions || {};
            const curSal = parseFloat(res.current_salary) || 0;
            let basicVal = parseFloat(e.basic) || 0;
            let hraVal = parseFloat(e.hra) || 0;
            let allowanceVal = parseFloat(e.allowance) || 0;
            let conveyanceVal = parseFloat(e.conveyance) || 0;
            let medicalVal = parseFloat(e.medical) || 0;

            let grossVal = res.salary.gross_salary != null
              ? parseFloat(res.salary.gross_salary)
              : (basicVal + hraVal + allowanceVal + conveyanceVal + medicalVal);

            // Automatically sync with current_salary if structure gross differs
            if (curSal > 0 && Math.abs(grossVal - curSal) > 1) {
              basicVal = Math.round(curSal * 0.45);
              hraVal = Math.round(curSal * 0.40);
              conveyanceVal = Math.round(curSal * 0.05) || 1600;
              medicalVal = Math.round(curSal * 0.05) || 1250;
              allowanceVal = Math.max(0, curSal - (basicVal + hraVal + conveyanceVal + medicalVal));
              grossVal = curSal;
            }

            const threshold = parseFloat(res.esi_threshold || res.salary?.esi_threshold) || 21000;
            setEsiThreshold(threshold);
            const isEsi = grossVal <= threshold;
            const empType = res.salary.employment_type || "Permanent";

            const esiVal = parseFloat(d.esi) || 0;
            const mediVal = parseFloat(d.mediclaim) || 0;

            const loaded = {
              basic: basicVal,
              hra: hraVal,
              allowance: allowanceVal,
              conveyance: conveyanceVal,
              medical: medicalVal,
              professional_tax: parseFloat(d.professional_tax) || 0,
              income_tax: parseFloat(d.income_tax) || 0,
              pf: parseFloat(d.pf) || 0,
              esi: isEsi ? esiVal : 0,
              mediclaim: !isEsi ? mediVal : 0,
              tds: parseFloat(d.tds) || 0,
              lop: parseFloat(d.lop) || 0,
              employment_type: empType,
            };
            setFormData(loaded);
            setQuickGross(grossVal || "");
          } else {
            setError(res.error || "Failed to load salary structure");
          }
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message || "Failed to fetch salary data");
          setLoading(false);
        });
    }
  }, [show, employeeCode, role]);

  const handleChange = (field, val) => {
    if (field === "employment_type") {
      setFormData((prev) => ({
        ...prev,
        employment_type: val,
      }));
      return;
    }

    const num = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
    setFormData((prev) => {
      const next = { ...prev, [field]: num };
      const earningFields = ["basic", "hra", "allowance", "conveyance", "medical"];
      if (earningFields.includes(field)) {
        const curGross =
          (parseFloat(next.basic) || 0) +
          (parseFloat(next.hra) || 0) +
          (parseFloat(next.allowance) || 0) +
          (parseFloat(next.conveyance) || 0) +
          (parseFloat(next.medical) || 0);
        if (curGross > esiThreshold && prev.esi > 0 && !prev.mediclaim) {
          next.mediclaim = prev.esi;
          next.esi = 0;
        } else if (curGross <= esiThreshold && prev.mediclaim > 0 && !prev.esi) {
          next.esi = prev.mediclaim;
          next.mediclaim = 0;
        }
      }
      return next;
    });
  };

  // Calculations
  const numBasic = parseFloat(formData.basic) || 0;
  const numHra = parseFloat(formData.hra) || 0;
  const numAllowance = parseFloat(formData.allowance) || 0;
  const numConveyance = parseFloat(formData.conveyance) || 0;
  const numMedical = parseFloat(formData.medical) || 0;

  const grossSalary =
    numBasic + numHra + numAllowance + numConveyance + numMedical;

  const numPT = parseFloat(formData.professional_tax) || 0;
  const numIT = parseFloat(formData.income_tax) || 0;
  const numPf = parseFloat(formData.pf) || 0;
  const isEsiEligible = grossSalary <= esiThreshold;
  const numEsi = isEsiEligible ? (parseFloat(formData.esi) || 0) : 0;
  const numMediclaim = !isEsiEligible ? (parseFloat(formData.mediclaim) || 0) : 0;
  const numTds = parseFloat(formData.tds) || 0;
  const numLop = parseFloat(formData.lop) || 0;

  const totalDeductions =
    numPT + numIT + numPf + (isEsiEligible ? numEsi : numMediclaim) + numTds + numLop;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Quick auto-distribution formula for HR
  const handleAutoDistribute = (amount) => {
    const gross = parseFloat(amount);
    if (isNaN(gross) || gross <= 0) return;

    const basic = Math.round(gross * 0.45);
    const hra = Math.round(gross * 0.40);
    const conveyance = Math.round(gross * 0.05) || 1600;
    const medical = Math.round(gross * 0.05) || 1250;
    const assigned = basic + hra + conveyance + medical;
    const allowance = Math.max(0, gross - assigned);

    const pf = Math.round(basic * 0.12);
    const isEligible = gross <= esiThreshold;
    const esi = isEligible ? Math.round(gross * 0.0075) : 0;
    const mediclaim = !isEligible ? (gross > 25000 ? 750 : 500) : 0;
    const pt = gross > 15000 ? 200 : 0;

    setFormData((prev) => ({
      ...prev,
      basic,
      hra,
      allowance,
      conveyance,
      medical,
      professional_tax: pt,
      income_tax: 0,
      pf,
      esi,
      mediclaim,
      tds: 0,
      lop: 0,
    }));
  };

  const handleSave = async () => {
    if (!isHRUser) {
      toast.error("Access denied: Only HR or Accounts can edit the salary structure.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const cleanCode = String(employeeCode || "").replace(/^#/, "").trim();
      const res = await fetch(`${API}/employees/${cleanCode}/salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role: role || "hr",
        },
        body: JSON.stringify({
          basic: numBasic,
          da: 0,
          hra: numHra,
          allowance: numAllowance,
          conveyance: numConveyance,
          medical: numMedical,
          professional_tax: numPT,
          income_tax: numIT,
          pf: numPf,
          esi: isEsiEligible ? numEsi : 0,
          mediclaim: !isEsiEligible ? numMediclaim : 0,
          tds: numTds,
          lop: numLop,
          employment_type: formData.employment_type || "Permanent",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Salary structure updated and saved successfully!");
        if (onSalaryUpdated) {
          onSalaryUpdated(data.current_salary || grossSalary, data.salary);
        }
        setTimeout(() => { setSuccessMsg(null); onHide(); }, 1500);
      } else {
        setError(data.error || "Failed to update salary structure");
      }
    } catch (e) {
      setError(e.message || "Server error while saving salary structure");
    }
    setSaving(false);
  };

  const fmt = (v) =>
    "₹" +
    parseFloat(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const month = new Date().toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header
        closeButton
        style={{
          background: "linear-gradient(135deg, #1e3c72, #2a5298)",
          color: "white",
        }}
      >
        <div className="w-100 d-flex justify-content-between align-items-center pe-3">
          <Modal.Title className="fs-5 d-flex align-items-center gap-2">
            <span>💰</span> Salary Structure
            {isHRUser ? (
              <Badge bg="success" className="fs-6 fw-normal px-2 py-1" style={{ fontSize: "11px" }}>
                ✏️ HR Edit Mode
              </Badge>
            ) : (
              <Badge bg="secondary" className="fs-6 fw-normal px-2 py-1" style={{ fontSize: "11px" }}>
                🔒 Read Only
              </Badge>
            )}
          </Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="p-3 p-md-4" style={{ backgroundColor: "#f8fafc" }}>
        {/* Subheader with employee details */}
        <div className="d-flex flex-wrap justify-content-between align-items-center bg-white p-3 rounded shadow-sm mb-3 border">
          <div>
            <h5 className="mb-0 fw-bold text-dark">{employeeName}</h5>
            <small className="text-muted">
              Employee ID: <strong className="text-primary">{employeeCode}</strong> • Effective: {month}
            </small>
          </div>
          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            {isHRUser ? (
              <div className="d-flex align-items-center gap-1.5">
                <span className="small fw-semibold text-muted">Employment:</span>
                <Form.Select
                  size="sm"
                  style={{ width: "140px", fontWeight: "600" }}
                  value={formData.employment_type || "Permanent"}
                  onChange={(e) => handleChange("employment_type", e.target.value)}
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Probation">Probation</option>
                  <option value="Intern">Intern</option>
                </Form.Select>
              </div>
            ) : (
              <Badge
                bg={
                  formData.employment_type === "Permanent"
                    ? "success"
                    : formData.employment_type === "Probation"
                    ? "warning"
                    : "secondary"
                }
                className="px-2.5 py-1.5"
              >
                {formData.employment_type || "Permanent"}
              </Badge>
            )}
            <span className="badge bg-light text-dark border px-2 py-1">
              {isHRUser ? "HR Full Rights" : "View-only"}
            </span>
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            ❌ {error}
          </Alert>
        )}

        {successMsg && (
          <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)}>
            ✅ {successMsg}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Loading salary structure...</p>
          </div>
        ) : (
          <>
            {/* Quick Auto-Distribute Toolbar (HR Only) */}
            {isHRUser && (
              <Card className="border-0 shadow-sm mb-3" style={{ background: "linear-gradient(135deg, #eff6ff, #f0fdf4)" }}>
                <Card.Body className="p-3">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <strong className="text-primary small">⚡ Quick Formula Allocation:</strong>
                      <div className="text-muted" style={{ fontSize: "11px" }}>
                        Enter target Gross Salary to auto-populate standard percentages (45% Basic, 40% HRA, 5% Conveyance, 5% Medical & PF/Deductions).
                      </div>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      <InputGroup size="sm" style={{ width: "160px" }}>
                        <InputGroup.Text>₹</InputGroup.Text>
                        <Form.Control
                          type="number"
                          placeholder="Gross Amount"
                          value={quickGross}
                          onChange={(e) => setQuickGross(e.target.value)}
                        />
                      </InputGroup>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleAutoDistribute(quickGross)}
                      >
                        Auto-Calculate
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Live Summary Bar */}
            <Row className="g-2 mb-3">
              <Col xs={12} sm={4}>
                <div className="p-2 p-md-3 rounded border text-center shadow-sm" style={{ background: "#ecfdf5", borderColor: "#a7f3d0" }}>
                  <small className="text-uppercase fw-bold text-success" style={{ fontSize: "11px" }}>Gross Salary</small>
                  <h5 className="mb-0 fw-bold text-success mt-1">{fmt(grossSalary)}</h5>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div className="p-2 p-md-3 rounded border text-center shadow-sm" style={{ background: "#fff1f2", borderColor: "#fecdd3" }}>
                  <small className="text-uppercase fw-bold text-danger" style={{ fontSize: "11px" }}>Total Deductions</small>
                  <h5 className="mb-0 fw-bold text-danger mt-1">{fmt(totalDeductions)}</h5>
                </div>
              </Col>
              <Col xs={12} sm={4}>
                <div className="p-2 p-md-3 rounded border text-center shadow-sm" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                  <small className="text-uppercase fw-bold text-primary" style={{ fontSize: "11px" }}>Net Take Home</small>
                  <h5 className="mb-0 fw-bold text-primary mt-1">{fmt(netSalary)}</h5>
                </div>
              </Col>
            </Row>

            {/* Two Column Structure: Earnings & Deductions */}
            <Row className="g-3">
              {/* Earnings Column */}
              <Col xs={12} md={6}>
                <Card className="h-100 shadow-sm border-0">
                  <Card.Header className="bg-success text-white py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                    <span>📋 1. Earnings & Allowances</span>
                    <span>{fmt(grossSalary)}</span>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <div className="d-flex flex-column gap-2">
                      {/* Basic */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Basic Salary</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Core Base</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.basic}
                              onChange={(e) => handleChange("basic", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.basic)}</div>
                        )}
                      </div>

                      {/* HRA */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">House Rent Allowance (HRA)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Housing</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.hra}
                              onChange={(e) => handleChange("hra", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.hra)}</div>
                        )}
                      </div>

                      {/* Allowance */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Special / Other Allowance</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Additional</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.allowance}
                              onChange={(e) => handleChange("allowance", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.allowance)}</div>
                        )}
                      </div>

                      {/* Conveyance */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Conveyance Allowance</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Travel & Commute</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.conveyance}
                              onChange={(e) => handleChange("conveyance", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.conveyance)}</div>
                        )}
                      </div>

                      {/* Medical */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Medical Allowance</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Healthcare</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.medical}
                              onChange={(e) => handleChange("medical", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.medical)}</div>
                        )}
                      </div>

                      <div className="pt-2 mt-2 border-top d-flex justify-content-between align-items-center">
                        <span className="fw-bold small text-success">Total Gross Earnings:</span>
                        <strong className="text-success fs-6">{fmt(grossSalary)}</strong>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Deductions Column */}
              <Col xs={12} md={6}>
                <Card className="h-100 shadow-sm border-0">
                  <Card.Header className="bg-danger text-white py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                    <span>📋 2. Deductions</span>
                    <span>{fmt(totalDeductions)}</span>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <div className="d-flex flex-column gap-2">
                      {/* Professional Tax */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Professional Tax (PT)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>State Tax</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.professional_tax}
                              onChange={(e) => handleChange("professional_tax", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.professional_tax)}</div>
                        )}
                      </div>

                      {/* Income Tax */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Income Tax (IT)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Direct Tax</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.income_tax}
                              onChange={(e) => handleChange("income_tax", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.income_tax)}</div>
                        )}
                      </div>

                      {/* PF */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Provident Fund (PF)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>12% of Basic</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.pf}
                              onChange={(e) => handleChange("pf", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.pf)}</div>
                        )}
                      </div>

                      {/* Conditional ESI (Total Salary <= 21000) or Mediclaim (Total Salary > 21000) */}
                      {isEsiEligible ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center">
                            <Form.Label className="small fw-semibold mb-1">Employee State Insurance (ESI)</Form.Label>
                            <Badge bg="info" className="fw-normal" style={{ fontSize: "9.5px" }}>
                              Total Salary ≤ ₹${esiThreshold.toLocaleString("en-IN")}
                            </Badge>
                          </div>
                          {isHRUser ? (
                            <InputGroup size="sm">
                              <InputGroup.Text>₹</InputGroup.Text>
                              <Form.Control
                                type="number"
                                min="0"
                                step="any"
                                value={formData.esi}
                                onChange={(e) => handleChange("esi", e.target.value)}
                                placeholder="0.00"
                              />
                            </InputGroup>
                          ) : (
                            <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.esi)}</div>
                          )}
                          <small className="text-muted d-block mt-0.5" style={{ fontSize: "10px" }}>
                            State insurance scheme for total salary ₹${esiThreshold.toLocaleString("en-IN")} or less
                          </small>
                        </div>
                      ) : (
                        <div>
                          <div className="d-flex justify-content-between align-items-center">
                            <Form.Label className="small fw-semibold mb-1">Mediclaim</Form.Label>
                            <Badge bg="primary" className="fw-normal" style={{ fontSize: "9.5px" }}>
                              Total Salary &gt; ₹${esiThreshold.toLocaleString("en-IN")}
                            </Badge>
                          </div>
                          {isHRUser ? (
                            <InputGroup size="sm">
                              <InputGroup.Text>₹</InputGroup.Text>
                              <Form.Control
                                type="number"
                                min="0"
                                step="any"
                                value={formData.mediclaim}
                                onChange={(e) => handleChange("mediclaim", e.target.value)}
                                placeholder="0.00"
                              />
                            </InputGroup>
                          ) : (
                            <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.mediclaim)}</div>
                          )}
                          <small className="text-muted d-block mt-0.5" style={{ fontSize: "10px" }}>
                            Corporate health mediclaim policy deduction for total salary above ₹${esiThreshold.toLocaleString("en-IN")}
                          </small>
                        </div>
                      )}

                      {/* TDS */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">TDS (Tax Deducted at Source)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Withholding Tax</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.tds}
                              onChange={(e) => handleChange("tds", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.tds)}</div>
                        )}
                      </div>

                      {/* LOP */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Loss of Pay (LOP)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Unpaid Absences</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.lop}
                              onChange={(e) => handleChange("lop", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.lop)}</div>
                        )}
                      </div>

                      <div className="pt-2 mt-2 border-top d-flex justify-content-between align-items-center">
                        <span className="fw-bold small text-danger">Total Deductions:</span>
                        <strong className="text-danger fs-6">{fmt(totalDeductions)}</strong>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Bottom Net Pay Card */}
            <div
              className="mt-3 p-3 rounded d-flex justify-content-between align-items-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white" }}
            >
              <div>
                <span className="text-uppercase fw-bold opacity-75" style={{ fontSize: "11px" }}>Net In-Hand Salary</span>
                <div className="small opacity-90">Gross Salary ({fmt(grossSalary)}) − Total Deductions ({fmt(totalDeductions)})</div>
              </div>
              <span className="fs-3 fw-bold">{fmt(netSalary)}</span>
            </div>

            {!isHRUser && (
              <div className="text-center text-muted small mt-3">
                🔒 You are currently viewing in read-only mode. Only HR managers can edit and save salary components.
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="p-2 px-3 bg-light">
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Close
        </Button>
        {isHRUser && (
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Saving...
              </>
            ) : (
              "💾 Save Salary Structure"
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

/* ══════════════════════════════════════════
   KPI PICKER
   - Primary: numbered rows 1,2,3,4,5 — HR types manually
   - Secondary: numbered rows 1,2,3 — HR types manually
   - No preset categories
══════════════════════════════════════════ */

const MAX_PRIMARY = 5;
const MAX_SECONDARY = 3;

// Parse kpi string → { primary: string[], secondary: string[] }
const parseKpi = (kpiStr) => {
  if (!kpiStr) return { primary: [], secondary: [] };
  try {
    const arr = JSON.parse(kpiStr);
    if (Array.isArray(arr)) {
      return {
        primary: arr.filter((i) => i.type === "primary").map((i) => i.text),
        secondary: arr.filter((i) => i.type === "secondary").map((i) => i.text),
      };
    }
  } catch { }
  // legacy plain string
  const items = kpiStr
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { primary: items, secondary: [] };
};

// Serialize back to JSON string
const serializeKpi = (primary, secondary) => {
  const arr = [
    ...primary.map((text) => ({ text, type: "primary" })),
    ...secondary.map((text) => ({ text, type: "secondary" })),
  ];
  return JSON.stringify(arr);
};

const KpiPicker = ({ kpi, onChange, canEdit }) => {
  const parsed = parseKpi(kpi);

  // Local state: arrays of strings for each numbered slot
  const [primaryRows, setPrimaryRows] = useState(() => {
    const rows = [...parsed.primary];
    while (rows.length < MAX_PRIMARY) rows.push("");
    return rows;
  });
  const [secondaryRows, setSecondaryRows] = useState(() => {
    const rows = [...parsed.secondary];
    while (rows.length < MAX_SECONDARY) rows.push("");
    return rows;
  });

  // Sync up whenever parent kpi changes (e.g. openEdit)
  useEffect(() => {
    const p = parseKpi(kpi);
    const pr = [...p.primary];
    while (pr.length < MAX_PRIMARY) pr.push("");
    const sr = [...p.secondary];
    while (sr.length < MAX_SECONDARY) sr.push("");
    setPrimaryRows(pr);
    setSecondaryRows(sr);
  }, [kpi]);

  const updatePrimary = (idx, val) => {
    const next = [...primaryRows];
    next[idx] = val;
    setPrimaryRows(next);
    onChange(serializeKpi(next.filter(Boolean), secondaryRows.filter(Boolean)));
  };

  const updateSecondary = (idx, val) => {
    const next = [...secondaryRows];
    next[idx] = val;
    setSecondaryRows(next);
    onChange(serializeKpi(primaryRows.filter(Boolean), next.filter(Boolean)));
  };

  return (
    <div className="kpi-picker-wrapper p-3 rounded-3">
      <Form.Label className="small fw-bold d-flex align-items-center gap-2 mb-3">
        <span>🎯</span>
        <span className="text-primary">KPI / Job Role Responsibilities</span>
      </Form.Label>

      <Row className="g-3">
        {/* ── PRIMARY BOX ── */}
        <Col xs={12} md={7}>
          <div className="kpi-box kpi-primary-box p-3 rounded-3">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="kpi-box-badge primary-badge">PRIMARY</span>
              <small className="text-muted" style={{ fontSize: "11px" }}>
                Core responsibilities
              </small>
            </div>

            {primaryRows.map((val, idx) => (
              <div key={idx} className="kpi-numbered-row mb-2">
                <span className="kpi-num primary-num">{idx + 1}</span>
                <Form.Control
                  size="sm"
                  placeholder={`Primary KPI ${idx + 1}...`}
                  value={val}
                  onChange={(e) => updatePrimary(idx, e.target.value)}
                  disabled={!canEdit}
                  className="kpi-input"
                />
                {canEdit && val && (
                  <span
                    className="kpi-clear-btn"
                    onClick={() => updatePrimary(idx, "")}
                  >
                    ✕
                  </span>
                )}
              </div>
            ))}
          </div>
        </Col>

        {/* ── SECONDARY BOX ── */}
        <Col xs={12} md={5}>
          <div className="kpi-box kpi-secondary-box p-3 rounded-3">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="kpi-box-badge secondary-badge">SECONDARY</span>
              <small className="text-muted" style={{ fontSize: "11px" }}>
                Supporting tasks
              </small>
            </div>

            {secondaryRows.map((val, idx) => (
              <div key={idx} className="kpi-numbered-row mb-2">
                <span className="kpi-num secondary-num">{idx + 1}</span>
                <Form.Control
                  size="sm"
                  placeholder={`Secondary KPI ${idx + 1}...`}
                  value={val}
                  onChange={(e) => updateSecondary(idx, e.target.value)}
                  disabled={!canEdit}
                  className="kpi-input"
                />
                {canEdit && val && (
                  <span
                    className="kpi-clear-btn"
                    onClick={() => updateSecondary(idx, "")}
                  >
                    ✕
                  </span>
                )}
              </div>
            ))}
          </div>
        </Col>
      </Row>

      {/* Preview pills */}
      {(primaryRows.some(Boolean) || secondaryRows.some(Boolean)) && (
        <div
          className="mt-3 p-2 rounded-2"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <small className="text-muted fw-bold">
            Preview — Primary: {primaryRows.filter(Boolean).length}{" "}
            &nbsp;|&nbsp; Secondary: {secondaryRows.filter(Boolean).length}
          </small>
          <div className="d-flex flex-wrap gap-1 mt-1">
            {primaryRows.filter(Boolean).map((item, idx) => (
              <span
                key={`p-${idx}`}
                className="kpi-preview-pill kpi-preview-primary"
              >
                <span className="kpi-preview-num">{idx + 1}</span> {item}
              </span>
            ))}
            {secondaryRows.filter(Boolean).map((item, idx) => (
              <span
                key={`s-${idx}`}
                className="kpi-preview-pill kpi-preview-secondary"
              >
                <span className="kpi-preview-num">{idx + 1}</span> {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const ManageEmployees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [empForm, setEmpForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [salaryModal, setSalaryModal] = useState({
    show: false,
    code: "",
    name: "",
  });
  const [tabsModal, setTabsModal] = useState({
    show: false,
    employee: null,
    selectedTabs: []
  });
  const [savingTabs, setSavingTabs] = useState(false);
  const [role, setRole] = useState(localStorage.getItem("role") || "admin");
  const [globalEsiThreshold, setGlobalEsiThreshold] = useState(21000);
  const [showEsiModal, setShowEsiModal] = useState(false);
  const [esiForm, setEsiForm] = useState({ global_esi_threshold: 21000, apply_to_all: false });
  const [savingEsi, setSavingEsi] = useState(false);

  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [selectedDesignation, setSelectedDesignation] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [quickViewModal, setQuickViewModal] = useState({ show: false, employee: null });

  const isAdmin = role === "admin";
  const isHR = role === "hr" || role === "hrmanager";
  const isManager = role === "manager";
  const isEmployee = role === "employee";
  const canEditKpi = isAdmin || isHR;

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isEmployee) {
      navigate("/dashboard");
      return;
    }
    fetchEmployees();
    fetchGlobalEsi();

    // Re-fetch latest employee records and updated photos whenever the window gains focus
    const handleFocus = () => {
      fetchEmployees(true);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [role]);

  const fetchEmployees = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Query param with timestamp prevents stale HTTP browser cache
      const res = await fetch(`${API}/employees?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache", role },
      });
      const data = await res.json();
      if (data.success) setEmployees(Array.isArray(data.data) ? data.data : []);
      else if (!silent) toast.error("Error fetching employees");
    } catch (e) {
      if (!silent) toast.error("Error: " + e.message);
    }
    if (!silent) setLoading(false);
    else setRefreshing(false);
  };

  const fetchGlobalEsi = async () => {
    try {
      const res = await fetch(`${API}/payroll/settings`, {
        headers: { role, Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      const data = await res.json();
      if (data.success && data.settings?.global_esi_threshold) {
        const val = parseFloat(data.settings.global_esi_threshold) || 21000;
        setGlobalEsiThreshold(val);
        setEsiForm((prev) => ({ ...prev, global_esi_threshold: val }));
      }
    } catch (e) {
      console.warn("Failed to fetch global ESI setting:", e.message);
    }
  };

  const openEsiModal = () => {
    setEsiForm({
      global_esi_threshold: globalEsiThreshold,
      apply_to_all: false,
    });
    setShowEsiModal(true);
  };

  const handleSaveEsiSettings = async () => {
    setSavingEsi(true);
    try {
      const res = await fetch(`${API}/payroll/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role,
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          global_esi_threshold: parseFloat(esiForm.global_esi_threshold) || 21000,
          apply_to_all: !!esiForm.apply_to_all,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Global ESI Slab threshold updated successfully!");
        setGlobalEsiThreshold(parseFloat(esiForm.global_esi_threshold) || 21000);
        setShowEsiModal(false);
        fetchEmployees();
      } else {
        toast.error(data.error || "Failed to update ESI settings");
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setSavingEsi(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isEmailField = name === "email" || name === "work_email" || name === "personal_email";
    const formattedVal = isEmailField ? value.toLowerCase() : value;
    setEmpForm((prev) => ({
      ...prev,
      [name]: formattedVal,
      ...(name === "work_email" ? { email: formattedVal } : {})
    }));
  };

  const handleSalaryFrequencyChange = (newType) => {
    const oldType = empForm.salary_type || "Monthly (In Hand)";
    const val = parseFloat(empForm.current_salary);
    if (isNaN(val) || val <= 0) {
      setEmpForm((prev) => ({ ...prev, salary_type: newType }));
      return;
    }

    let monthlyVal = val;
    if (oldType === "LPA") {
      monthlyVal = (val * 100000) / 12;
    } else if (oldType === "CTC") {
      monthlyVal = val / 12;
    }

    let convertedVal = monthlyVal;
    if (newType === "LPA") {
      convertedVal = parseFloat(((monthlyVal * 12) / 100000).toFixed(2));
    } else if (newType === "CTC") {
      convertedVal = Math.round(monthlyVal * 12);
    } else {
      convertedVal = Math.round(monthlyVal);
    }

    setEmpForm((prev) => ({
      ...prev,
      salary_type: newType,
      current_salary: convertedVal,
    }));
  };

  const openAdd = () => {
    if (isManager || isEmployee) {
      toast.error("Not allowed!");
      return;
    }
    setEditMode(false);
    setEmpForm({
      ...EMPTY_FORM,
      facilities: { advance: true, loan: true, insurance: true, gratuity: true },
      esi_threshold: "",
      esi_slab_type: "global",
    });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    if (isManager || isEmployee) {
      toast.error("Not allowed!");
      return;
    }
    setEditMode(true);

    let salutation = emp.salutation || "Mr.";
    let cleanName = emp.name || "";
    if (cleanName.startsWith("Mr. ")) {
      salutation = "Mr.";
      cleanName = cleanName.replace(/^Mr\.\s+/, "");
    } else if (cleanName.startsWith("Ms. ")) {
      salutation = "Ms.";
      cleanName = cleanName.replace(/^Ms\.\s+/, "");
    } else if (cleanName.startsWith("Mrs. ")) {
      salutation = "Mrs.";
      cleanName = cleanName.replace(/^Mrs\.\s+/, "");
    }

    let fac = { advance: true, loan: true, insurance: true, gratuity: true };
    if (emp.facilities) {
      try {
        fac = typeof emp.facilities === "string" ? JSON.parse(emp.facilities) : emp.facilities;
      } catch (e) {}
    }
    const hasCustomEsi = emp.esi_threshold != null && emp.esi_threshold !== "" && !isNaN(parseFloat(emp.esi_threshold));

    setEmpForm({
      ...emp,
      salutation,
      name: cleanName,
      work_email: emp.work_email || emp.email || "",
      personal_email: emp.personal_email || "",
      email: emp.work_email || emp.email || "",
      pan_no: emp.pan_no || "",
      aadhaar_no: emp.aadhaar_no || "",
      request_documents: emp.document_status === "Pending Upload",
      salary_type: emp.salary_type || "Monthly (In Hand)",
      joining_date: emp.joining_date ? emp.joining_date.split("T")[0] : "",
      password: "User@123",
      kpi: emp.kpi || "",
      employment_type: emp.employment_type || "Permanent",
      tabs_enabled: emp.tabs_enabled || false,
      facilities: fac,
      esi_threshold: hasCustomEsi ? emp.esi_threshold : "",
      esi_slab_type: hasCustomEsi ? "custom" : "global",
      group_name: emp.group_name || "TATA Company",
      company_name: emp.company_name || "TATA Steel",
      work_location: emp.work_location || "Kolkata",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (isManager || isEmployee) {
      toast.error("Not allowed!");
      return;
    }
    const {
      employee_code,
      salutation,
      name,
      dept,
      designation,
      email,
      work_email,
      personal_email,
      current_salary,
      salary_type,
      joining_date,
      reporting_manager,
      phone_no,
    } = empForm;

    const primaryWorkEmail = (work_email || email || "").toLowerCase().trim();
    const primaryPersonalEmail = (personal_email || "").toLowerCase().trim();

    if (
      !employee_code ||
      !name ||
      !dept ||
      !designation ||
      !primaryWorkEmail ||
      !current_salary ||
      !joining_date ||
      !reporting_manager ||
      !phone_no
    ) {
      toast.error("Please fill all required fields (including Work Email)!");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(primaryWorkEmail)) {
      toast.error("Please enter a valid work email address!");
      return;
    }
    if (primaryPersonalEmail && !emailRegex.test(primaryPersonalEmail)) {
      toast.error("Please enter a valid personal email address!");
      return;
    }

    // Ensure full formatted name with title prefix
    const titlePrefix = salutation || "Mr.";
    const cleanName = name.replace(/^(Mr\.|Ms\.|Mrs\.)\s+/, "").trim();
    const formattedFullName = `${titlePrefix} ${cleanName}`;

    // Convert salary to monthly base amount for backend calculation if needed
    const rawVal = parseFloat(current_salary);
    let monthlySalary = rawVal;
    if (salary_type === "LPA") {
      monthlySalary = Math.round((rawVal * 100000) / 12);
    } else if (salary_type === "CTC") {
      monthlySalary = Math.round(rawVal / 12);
    }

    const payload = {
      ...empForm,
      pan_no: empForm.pan_no ? empForm.pan_no.toUpperCase().trim() : "",
      aadhaar_no: empForm.aadhaar_no ? empForm.aadhaar_no.trim() : "",
      request_documents: empForm.request_documents,
      name: formattedFullName,
      salutation: titlePrefix,
      email: primaryWorkEmail,
      work_email: primaryWorkEmail,
      personal_email: primaryPersonalEmail,
      current_salary: monthlySalary,
      salary_type: salary_type || "Monthly (In Hand)",
      facilities: empForm.facilities,
      esi_threshold: empForm.esi_slab_type === "custom" && empForm.esi_threshold !== "" && !isNaN(parseFloat(empForm.esi_threshold))
        ? parseFloat(empForm.esi_threshold)
        : null,
    };

    setSaving(true);
    try {
      const url = editMode ? `${API}/employees/update` : `${API}/employees/add`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", role },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || (editMode ? "Employee updated successfully!" : "Employee added successfully! Login credentials have been sent via email."));
        fetchEmployees();
        setShowModal(false);
      } else {
        toast.error(data.error || "Failed to save employee");
      }
    } catch (e) {
      toast.error(e.message || "Failed to save employee");
    }
    setSaving(false);
  };

  const handleDelete = async (emp) => {
    if (!isAdmin) {
      toast.error("Only Admin can delete!");
      return;
    }
    if (!window.confirm("Delete employee?")) return;
    try {
      const res = await fetch(`${API}/employees/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", role },
        body: JSON.stringify({ employee_code: emp.employee_code }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Employee deleted successfully!");
        fetchEmployees();
      } else {
        toast.error(data.error || "Failed to delete employee");
      }
    } catch (e) {
      toast.error(e.message || "Failed to delete employee");
    }
  };

  const openConfigureTabs = (emp) => {
    let currentTabs = [1, 2, 3, 4, 8, 9, 10, 11, 12, 14, 16]; // default standard tabs
    if (emp.enabled_tabs) {
      let parsed = [];
      if (typeof emp.enabled_tabs === "string") {
        parsed = emp.enabled_tabs.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      } else if (Array.isArray(emp.enabled_tabs)) {
        parsed = emp.enabled_tabs.map(Number).filter(id => !isNaN(id));
      }
      if (parsed.length > 0) currentTabs = parsed;
    } else if (emp.tabs_enabled) {
      currentTabs = ALL_TABS.map(t => t.id);
    }
    setTabsModal({
      show: true,
      employee: emp,
      selectedTabs: currentTabs
    });
  };

  const handleSaveTabs = async () => {
    const empCode = tabsModal.employee?.employee_code;
    if (!empCode) return;
    setSavingTabs(true);
    try {
      const res = await fetch(`${API}/employees/update-tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", role },
        body: JSON.stringify({ employee_code: empCode, enabled_tabs: tabsModal.selectedTabs }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Module permissions updated successfully!");
        setEmployees(prev =>
          prev.map(emp =>
            (emp.employee_code || emp.employee_id) === empCode
              ? { ...emp, enabled_tabs: tabsModal.selectedTabs.join(",") }
              : emp
          )
        );
        fetchEmployees();
        setTabsModal({ show: false, employee: null, selectedTabs: [] });
      } else {
        toast.error(data.error || "Failed to update tabs");
      }
    } catch (e) {
      toast.error(e.message || "Failed to update tabs");
    } finally {
      setSavingTabs(false);
    }
  };

  const handleVerifyDocs = async (employeeCode, status) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/employees/verify-documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "role": role
        },
        body: JSON.stringify({ employee_code: employeeCode, document_status: status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Documents marked as ${status}!`);
        fetchEmployees();
      } else {
        toast.error(data.error || "Failed to verify documents");
      }
    } catch (e) {
      toast.error(e.message || "Failed to verify documents");
    }
  };

  const RING_PALETTE = [
    "#ec4899", // pink
    "#8b5cf6", // purple
    "#0ea5e9", // sky blue
    "#10b981", // teal/emerald
    "#e11d48", // rose
    "#f59e0b", // amber
    "#3b82f6", // royal blue
    "#a855f7", // violet
    "#06b6d4", // cyan
    "#14b8a6", // teal
  ];

  const getRingColor = (str, index) => {
    if (typeof index === "number") return RING_PALETTE[index % RING_PALETTE.length];
    let hash = 0;
    for (let i = 0; i < (str || "").length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return RING_PALETTE[Math.abs(hash) % RING_PALETTE.length];
  };

  const getInitials = (name) => {
    if (!name) return "EM";
    const clean = name.replace(/^(Mr\.|Ms\.|Mrs\.)\s+/, "").trim();
    const parts = clean.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.substring(0, 2).toUpperCase();
  };

  const allDesignations = useMemo(() => {
    const set = new Set();
    employees.forEach((emp) => {
      const d = emp.designation || emp.job_role;
      if (d) set.add(d.trim());
    });
    return ["All", ...Array.from(set)];
  }, [employees]);

  const filteredAndSortedEmployees = useMemo(() => {
    let list = employees.filter((emp) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        emp.name?.toLowerCase().includes(term) ||
        emp.employee_code?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.dept?.toLowerCase().includes(term) ||
        emp.designation?.toLowerCase().includes(term);

      const empDesig = (emp.designation || emp.job_role || "").toLowerCase();
      const matchesDesig =
        selectedDesignation === "All" ||
        empDesig === selectedDesignation.toLowerCase();

      const matchesStatus =
        selectedStatus === "All" ||
        (emp.status || "").toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesDesig && matchesStatus;
    });

    list.sort((a, b) => {
      if (sortBy === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "name-desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      if (sortBy === "salary-high") {
        return (parseFloat(b.current_salary) || 0) - (parseFloat(a.current_salary) || 0);
      }
      if (sortBy === "salary-low") {
        return (parseFloat(a.current_salary) || 0) - (parseFloat(b.current_salary) || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.joining_date || 0) - new Date(b.joining_date || 0);
      }
      // "newest" / default:
      return new Date(b.joining_date || 0) - new Date(a.joining_date || 0);
    });

    return list;
  }, [employees, searchTerm, selectedDesignation, selectedStatus, sortBy]);

  return (
    <div className="emp-page-wrapper py-3 py-md-4">
      <Container fluid className="px-md-4 max-w-7xl">
        {/* Top Control Bar Adaptive Single Line */}
        <div className="emp-controls-card py-2.5 px-3 mb-4 bg-white border rounded-4 shadow-sm">
          <div className="emp-controls-scroll-row d-flex flex-nowrap align-items-center gap-2 w-100">
            {/* Designation Filter */}
            <div className="filter-item flex-shrink-0" style={{ width: "160px" }}>
              <Form.Select
                size="sm"
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="filter-select rounded-3 py-1.5 px-2 fw-semibold text-secondary"
                style={{ fontSize: "13px", borderColor: "#cbd5e1" }}
              >
                <option value="All">Designation : All</option>
                {allDesignations
                  .filter((d) => d !== "All")
                  .map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
              </Form.Select>
            </div>

            {/* Status Filter */}
            <div className="filter-item flex-shrink-0" style={{ width: "150px" }}>
              <Form.Select
                size="sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select rounded-3 py-1.5 px-2 fw-semibold text-secondary"
                style={{ fontSize: "13px", borderColor: "#cbd5e1" }}
              >
                <option value="All">Status : All</option>
                <option value="Active">Status : Active</option>
                <option value="Inactive">Status : Inactive</option>
                <option value="Resigned">Status : Resigned</option>
              </Form.Select>
            </div>

            {/* Sort By Filter */}
            <div className="filter-item flex-shrink-0" style={{ width: "150px" }}>
              <Form.Select
                size="sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select rounded-3 py-1.5 px-2 fw-semibold text-secondary"
                style={{ fontSize: "13px", borderColor: "#cbd5e1" }}
              >
                <option value="newest">Sort : Last 7 Days</option>
                <option value="oldest">Sort : Oldest</option>
                <option value="name-asc">Sort : Name (A - Z)</option>
                <option value="name-desc">Sort : Name (Z - A)</option>
                <option value="salary-high">Sort : Salary (High)</option>
                <option value="salary-low">Sort : Salary (Low)</option>
              </Form.Select>
            </div>

            {/* Search Bar */}
            <div className="filter-item flex-grow-1" style={{ minWidth: "130px" }}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0 text-muted px-2" style={{ borderColor: "#cbd5e1" }}>
                  <LuSearch size={14} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search name, code, dept..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0 py-1.5 ps-1"
                  style={{ fontSize: "13px", borderColor: "#cbd5e1" }}
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="py-1 px-2 border-start-0"
                    style={{ borderColor: "#cbd5e1" }}
                  >
                    <LuX size={13} />
                  </Button>
                )}
              </InputGroup>
            </div>

            {/* Right Controls: Role Switcher, View Switcher & Add Employee */}
            <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-auto">
              {/* Role selector for testing */}
              <div className="d-none d-md-block flex-shrink-0">
                <Form.Select
                  size="sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-3 py-1.5 px-2 fw-semibold text-secondary"
                  style={{ width: "135px", fontSize: "13px", borderColor: "#cbd5e1" }}
                  title="Active Workspace Role"
                >
                  <option value="hr">HR Manager</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Reporting HOD</option>
                </Form.Select>
              </div>

              {/* View Toggle Pill */}
              <button
                type="button"
                className="view-toggle-btn flex-shrink-0"
                onClick={() => fetchEmployees(true)}
                title="Refresh employee list & latest photos"
                style={{ width: "32px", height: "32px" }}
              >
                <LuRefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
              </button>

              <div className="view-toggle-pill flex-shrink-0" style={{ display: "inline-flex", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  style={{ width: "28px", height: "28px" }}
                >
                  <LuLayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="List View"
                  style={{ width: "28px", height: "28px" }}
                >
                  <LuList size={15} />
                </button>
              </div>

              {/* Global ESI Slab Settings Button */}
              {(isAdmin || isHR) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5 py-1.5 px-3 flex-shrink-0 rounded-3 shadow-xs"
                  onClick={openEsiModal}
                  style={{ fontSize: "13px", whiteSpace: "nowrap", fontWeight: 500 }}
                  title="Configure Global ESI Slab & Threshold"
                >
                  <span>⚙️ ESI Slab (₹{globalEsiThreshold.toLocaleString("en-IN")})</span>
                </button>
              )}

              {/* Add Employee Button */}
              {(isAdmin || isHR) && (
                <button
                  type="button"
                  className="btn-add-emp py-1.5 px-3 flex-shrink-0"
                  onClick={openAdd}
                  style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                >
                  <LuPlus size={15} />
                  <span>Add Employee</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2 small">Loading employees...</p>
          </div>
        ) : filteredAndSortedEmployees.length === 0 ? (
          <div className="text-center py-5 bg-white border rounded-4 shadow-sm p-4">
            <div className="fs-1 mb-2">🔍</div>
            <h5 className="fw-bold text-dark">No employees found</h5>
            <p className="text-muted small mb-3">
              {searchTerm || selectedDesignation !== "All"
                ? "Try adjusting your search criteria or designation filter."
                : "No employee records are available in the system yet."}
            </p>
            {(searchTerm || selectedDesignation !== "All") && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDesignation("All");
                  setSelectedStatus("All");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ── GRID VIEW (MATCHING REFERENCE DESIGN - LIGHT THEME) ── */
          <Row xs={1} sm={2} md={3} lg={4} className="g-4">
            {filteredAndSortedEmployees.map((emp, idx) => {
              const ringColor = getRingColor(emp.employee_code || emp.name, idx);
              const isOnline = emp.status === "Active";
              const initials = getInitials(emp.name);
              const avatarSrc = getEmployeeAvatar(emp);

              const tabCount = emp.enabled_tabs
                ? emp.enabled_tabs.split(",").filter(Boolean).length
                : 4;

              return (
                <Col key={emp.employee_code || idx}>
                  <div className="emp-card h-100 bg-white border rounded-4 p-4 text-center position-relative shadow-sm">
                    {/* Top Right Three Dots Action Menu */}
                    <div className="position-absolute top-0 end-0 p-3">
                      <Dropdown align="end">
                        <Dropdown.Toggle as="button" className="emp-dots-btn">
                          <BsThreeDots size={18} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow-lg border-0 rounded-3 py-2">
                          <Dropdown.Item
                            onClick={() => openEdit(emp)}
                            className="d-flex align-items-center gap-2 py-2 fs-7"
                          >
                            <LuPencil size={15} className="text-primary" />
                            <span>Edit Employee</span>
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() =>
                              setSalaryModal({
                                show: true,
                                code: emp.employee_code,
                                name: emp.name,
                              })
                            }
                            className="d-flex align-items-center gap-2 py-2 fs-7"
                          >
                            <LuFileText size={15} className="text-success" />
                            <span>Salary Structure</span>
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => openConfigureTabs(emp)}
                            className="d-flex align-items-center gap-2 py-2 fs-7"
                          >
                            <LuSettings size={15} className="text-info" />
                            <span>Configure Tabs</span>
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => setQuickViewModal({ show: true, employee: emp })}
                            className="d-flex align-items-center gap-2 py-2 fs-7"
                          >
                            <LuEye size={15} className="text-secondary" />
                            <span>View Full Profile</span>
                          </Dropdown.Item>
                          {isHR && emp.document_status === "Pending Verification" && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Item
                                onClick={() => handleVerifyDocs(emp.employee_code, "Verified")}
                                className="text-success d-flex align-items-center gap-2 py-2 fs-7"
                              >
                                <LuCheck size={15} />
                                <span>Approve Documents</span>
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => handleVerifyDocs(emp.employee_code, "Rejected")}
                                className="text-danger d-flex align-items-center gap-2 py-2 fs-7"
                              >
                                <LuX size={15} />
                                <span>Reject Documents</span>
                              </Dropdown.Item>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Item
                                onClick={() => handleDelete(emp)}
                                className="text-danger d-flex align-items-center gap-2 py-2 fs-7"
                              >
                                <LuTrash2 size={15} />
                                <span>Delete Employee</span>
                              </Dropdown.Item>
                            </>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>

                    {/* Circular Avatar with Colorful Border Ring & Status Indicator */}
                    <div
                      className="emp-avatar-ring mx-auto"
                      style={{ borderColor: ringColor }}
                    >
                      <div className="emp-avatar-inner">
                        <img
                          src={avatarSrc}
                          alt={emp.name || "Employee"}
                          className="emp-avatar-img"
                          onError={(e) => {
                            if (!e.currentTarget.src.endsWith("/default-avatar.svg")) {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_USER_AVATAR;
                            }
                          }}
                        />
                      </div>
                      {/* Active Status Dot */}
                      <span
                        className="emp-status-dot"
                        style={{ backgroundColor: emp.status === "Active" ? "#10b981" : emp.status === "Resigned" ? "#f59e0b" : "#94a3b8" }}
                        title={emp.status || (isOnline ? "Active" : "Inactive")}
                      />
                    </div>

                    {/* Employee Name */}
                    <h5
                      className="emp-name fw-bold mb-1 text-dark text-truncate"
                      title={emp.name}
                    >
                      {emp.name}
                    </h5>

                    {/* Role / Designation Pill */}
                    <div className="mb-3">
                      <span className="emp-role-pill text-truncate" title={emp.designation || emp.job_role}>
                        {emp.designation || emp.job_role || "Employee"}
                      </span>
                    </div>

                    {/* 3 Circular Action Icon Buttons */}
                    <div className="emp-actions-row mb-3">
                      <a
                        href={(emp.work_email || emp.email) ? `mailto:${emp.work_email || emp.email}` : "#"}
                        className="emp-action-btn"
                        title={
                          (emp.work_email || emp.email)
                            ? `Work: ${emp.work_email || emp.email}${emp.personal_email ? ` | Personal: ${emp.personal_email}` : ""}`
                            : "No Email Provided"
                        }
                        onClick={(e) => !(emp.work_email || emp.email) && e.preventDefault()}
                      >
                        <LuMail size={16} />
                      </a>
                      <a
                        href={emp.phone_no ? `tel:${emp.phone_no}` : "#"}
                        className="emp-action-btn"
                        title={emp.phone_no ? `Call: ${emp.phone_no}` : "No Phone Provided"}
                        onClick={(e) => !emp.phone_no && e.preventDefault()}
                      >
                        <LuPhone size={16} />
                      </a>
                      <button
                        type="button"
                        className="emp-action-btn"
                        title="View Full Profile & Details"
                        onClick={() => setQuickViewModal({ show: true, employee: emp })}
                      >
                        <LuEye size={16} />
                      </button>
                    </div>

                    {/* Subtle Card Footer with Quick Info Pills (Keeping functionality accessible) */}
                    <div className="emp-card-footer pt-3 mt-1 border-top d-flex align-items-center justify-content-between gap-1">
                      <span
                        className="emp-badge-salary"
                        title="Click to view/edit salary structure"
                        onClick={() =>
                          setSalaryModal({
                            show: true,
                            code: emp.employee_code,
                            name: emp.name,
                          })
                        }
                      >
                        ₹{parseFloat(emp.current_salary || 0).toLocaleString("en-IN")}
                      </span>
                      <span
                        className="emp-badge-tabs"
                        title="Click to configure dashboard tabs"
                        onClick={() => openConfigureTabs(emp)}
                      >
                        {tabCount} Tabs
                      </span>
                    </div>

                    {/* Document Status Notification if pending verification */}
                    {emp.document_status === "Pending Verification" && (
                      <div className="mt-2">
                        <span
                          className="badge bg-warning text-dark px-2 py-1 rounded-pill"
                          style={{ fontSize: "10px", cursor: "pointer" }}
                          onClick={() => setQuickViewModal({ show: true, employee: emp })}
                        >
                          ⏳ Docs Pending Review
                        </span>
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        ) : (
          /* ── LIST VIEW ALTERNATIVE ── */
          <div className="bg-white border rounded-4 shadow-sm overflow-hidden">
            <Table hover responsive className="align-middle mb-0">
              <thead className="bg-light border-bottom text-secondary" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3">Role & Dept</th>
                  <th className="py-3">Contact</th>
                  <th className="py-3">Salary</th>
                  <th className="py-3">Tabs</th>
                  <th className="py-3">Documents</th>
                  <th className="py-3 text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "13.5px" }}>
                {filteredAndSortedEmployees.map((emp, idx) => {
                  const ringColor = getRingColor(emp.employee_code || emp.name, idx);
                  const isOnline = emp.status === "Active";
                  const avatarSrc = getEmployeeAvatar(emp);
                  const tabCount = emp.enabled_tabs
                    ? emp.enabled_tabs.split(",").filter(Boolean).length
                    : 4;

                  return (
                    <tr key={emp.employee_code || idx}>
                      <td className="py-3 px-4">
                        <div className="d-flex align-items-center gap-3">
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "50%",
                              border: `2px solid ${ringColor}`,
                              padding: "2px",
                              flexShrink: 0,
                              position: "relative",
                            }}
                          >
                            <img
                              src={avatarSrc}
                              alt={emp.name}
                              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                            />
                            <span
                              style={{
                                position: "absolute",
                                bottom: "0px",
                                right: "0px",
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                backgroundColor: emp.status === "Active" ? "#10b981" : emp.status === "Resigned" ? "#f59e0b" : "#ef4444",
                                border: "1.5px solid #ffffff",
                              }}
                            />
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <div className="text-muted small d-flex flex-wrap align-items-center gap-1.5" style={{ fontSize: "11px" }}>
                              <span>{emp.employee_code}</span>
                              {emp.company_name && (
                                <span className="badge bg-light text-dark border px-1.5 py-0.5" style={{ fontSize: "10px" }}>
                                  🏢 {emp.company_name} • 📍 {emp.work_location || "Kolkata"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="fw-semibold text-dark">{emp.designation || emp.job_role || "—"}</div>
                        <div className="text-muted small" style={{ fontSize: "11px" }}>{emp.dept || "General"}</div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-2">
                          {(emp.work_email || emp.email) && (
                            <a
                              href={`mailto:${emp.work_email || emp.email}`}
                              className="text-secondary"
                              title={`Work: ${emp.work_email || emp.email}${emp.personal_email ? ` | Personal: ${emp.personal_email}` : ""}`}
                            >
                              <LuMail size={15} />
                            </a>
                          )}
                          {emp.phone_no && (
                            <a href={`tel:${emp.phone_no}`} className="text-secondary" title={emp.phone_no}>
                              <LuPhone size={15} />
                            </a>
                          )}
                          <span className="text-muted small">{emp.work_email || emp.email || emp.phone_no || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          bg="light"
                          text="dark"
                          className="border px-2.5 py-1.5 fw-semibold"
                          style={{ cursor: "pointer", fontSize: "12px" }}
                          onClick={() =>
                            setSalaryModal({
                              show: true,
                              code: emp.employee_code,
                              name: emp.name,
                            })
                          }
                          title="Click to view/edit salary structure"
                        >
                          ₹{parseFloat(emp.current_salary || 0).toLocaleString("en-IN")}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge
                          bg={tabCount > 4 ? "primary" : "warning"}
                          text={tabCount > 4 ? "white" : "dark"}
                          style={{ cursor: "pointer", fontSize: "11px" }}
                          onClick={() => openConfigureTabs(emp)}
                          title="Click to configure tabs"
                        >
                          {tabCount} Tabs
                        </Badge>
                      </td>
                      <td className="py-3">
                        {(() => {
                          switch (emp.document_status) {
                            case "Verified":
                              return <Badge bg="success" style={{ fontSize: "11px" }}>Verified ✅</Badge>;
                            case "Pending Verification":
                              return (
                                <Badge
                                  bg="warning"
                                  text="dark"
                                  style={{ fontSize: "11px", cursor: "pointer" }}
                                  onClick={() => setQuickViewModal({ show: true, employee: emp })}
                                >
                                  Pending ⏳
                                </Badge>
                              );
                            case "Rejected":
                              return <Badge bg="danger" style={{ fontSize: "11px" }}>Rejected ❌</Badge>;
                            default:
                              return <span className="text-muted small">Not Uploaded</span>;
                          }
                        })()}
                      </td>
                      <td className="py-3 text-end px-4">
                        <div className="d-flex justify-content-end gap-1">
                          <Button
                            variant="light"
                            size="sm"
                            className="p-1 text-secondary border"
                            title="View Profile"
                            onClick={() => setQuickViewModal({ show: true, employee: emp })}
                          >
                            <LuEye size={15} />
                          </Button>
                          <Button
                            variant="light"
                            size="sm"
                            className="p-1 text-primary border"
                            title="Edit Employee"
                            onClick={() => openEdit(emp)}
                          >
                            <LuPencil size={15} />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="light"
                              size="sm"
                              className="p-1 text-danger border"
                              title="Delete Employee"
                              onClick={() => handleDelete(emp)}
                            >
                              <LuTrash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        {/* ══ ADD / EDIT MODAL ══ */}
        <Modal
          show={showModal}
          onHide={() => setShowModal(false)}
          size="lg"
          centered
          scrollable
        >
          <Modal.Header closeButton>
            <Modal.Title className="fs-5">
              {editMode ? "Edit Employee" : "Add Employee"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold">
                  Emp ID / Code {!editMode && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Control
                  size="sm"
                  name="employee_code"
                  placeholder="e.g. EMP-001"
                  value={empForm.employee_code}
                  onChange={handleChange}
                  disabled={editMode}
                  required
                />
                {!editMode && (
                  <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                    Emailed to employee for portal login & attendance
                  </div>
                )}
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold">Name</Form.Label>
                <InputGroup size="sm">
                  <Form.Select
                    size="sm"
                    name="salutation"
                    value={empForm.salutation || "Mr."}
                    onChange={handleChange}
                    style={{ maxWidth: "80px", fontWeight: "600" }}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                  </Form.Select>
                  <Form.Control
                    size="sm"
                    name="name"
                    placeholder="Full Name"
                    value={empForm.name}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold">Status</Form.Label>
                <Form.Select size="sm" name="status" value={empForm.status || "Active"} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Resigned">Resigned</option>
                </Form.Select>
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                  Employment Type
                  <Badge bg="primary" style={{ fontSize: "10px", fontWeight: "normal" }}>Facilities</Badge>
                </Form.Label>
                <Form.Select size="sm" name="employment_type" value={empForm.employment_type || "Permanent"} onChange={handleChange}>
                  <option value="Permanent">Permanent (Full Facilities)</option>
                  <option value="Probation">Probation (Under Evaluation)</option>
                  <option value="Intern">Intern (Training)</option>
                </Form.Select>
              </Col>

              {/* Work Email & Personal Email */}
              <Col xs={12} md={6}>
                <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                  Work Email {!editMode && <span className="text-danger">*</span>}
                  <Badge bg="primary" style={{ fontSize: "10px", fontWeight: "normal" }}>Official / Login</Badge>
                </Form.Label>
                <Form.Control
                  size="sm"
                  type="email"
                  name="work_email"
                  placeholder="e.g. employee@company.com"
                  value={empForm.work_email !== undefined ? empForm.work_email : (empForm.email || "")}
                  onChange={handleChange}
                  required
                />
                <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                  Used for portal login credentials & system communication
                </div>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                  Personal Email
                  <Badge bg="secondary" style={{ fontSize: "10px", fontWeight: "normal" }}>Personal Contact</Badge>
                </Form.Label>
                <Form.Control
                  size="sm"
                  type="email"
                  name="personal_email"
                  placeholder="e.g. employee.personal@gmail.com"
                  value={empForm.personal_email || ""}
                  onChange={handleChange}
                />
                <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                  Used for personal communications & employee verification
                </div>
              </Col>
              <Col xs={6} md={4}>
                <Form.Label className="small fw-bold text-primary">
                  System Role
                </Form.Label>
                <Form.Select size="sm" name="job_role" value={empForm.job_role} onChange={handleChange} >
                  <option value="employee">Employee</option>
                  <option value="hod">Reporting Manager (HOD)</option>
                  <option value="hr">HR Manager</option>
                  <option value="accounts">Accounts</option>
                  <option value="manager">Manager</option>
                  <option value="teamlead">Team Lead</option>
                  <option value="payroll">Payroll Specialist</option>
                  <option value="admin">Administrator</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={4}>
                <Form.Label className="small fw-bold text-success">Tabs Access</Form.Label>
                <Form.Select size="sm" name="tabs_enabled" value={empForm.tabs_enabled ? "true" : "false"}
                  onChange={(e) => setEmpForm(prev => ({ ...prev, tabs_enabled: e.target.value === "true" }))}
                >
                  <option value="false">Limited Tabs (New)</option>
                  <option value="true">All Tabs (Joined)</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={4}>
                <Form.Label className="small fw-bold">Dept</Form.Label>
                <Form.Select size="sm" name="dept" value={empForm.dept || ""} onChange={handleChange}>
                  <option value="">Select Department</option>
                  <option value="HR">HR</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HOD">HOD</option>
                  <option value="IT">IT</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold">Designation</Form.Label>
                <Form.Control size="sm" name="designation" value={empForm.designation} onChange={handleChange} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold text-primary">Parent Group</Form.Label>
                <Form.Control
                  size="sm"
                  name="group_name"
                  placeholder="e.g. TATA Company"
                  value={empForm.group_name || ""}
                  onChange={handleChange}
                />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold text-dark">Company / Subsidiary</Form.Label>
                <Form.Control
                  size="sm"
                  name="company_name"
                  placeholder="e.g. TATA Steel, TATA Motors, TCS"
                  value={empForm.company_name || ""}
                  onChange={handleChange}
                />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold text-secondary">Work Location</Form.Label>
                <Form.Control
                  size="sm"
                  name="work_location"
                  placeholder="e.g. Kolkata, Mumbai, Pune"
                  value={empForm.work_location || ""}
                  onChange={handleChange}
                />
              </Col>
              <Col xs={12} md={6}>
                <Form.Label className="small fw-bold">Salary & Frequency</Form.Label>
                <InputGroup size="sm">
                  <Form.Control
                    size="sm"
                    type="number"
                    name="current_salary"
                    placeholder="Amount"
                    value={empForm.current_salary}
                    onChange={handleChange}
                  />
                  <Form.Select
                    size="sm"
                    name="salary_type"
                    value={empForm.salary_type || "Monthly (In Hand)"}
                    onChange={(e) => handleSalaryFrequencyChange(e.target.value)}
                    style={{ maxWidth: "170px", fontWeight: "600" }}
                  >
                    <option value="Monthly (In Hand)">Monthly (In Hand)</option>
                    <option value="LPA">LPA (Lakhs/yr)</option>
                    <option value="CTC">CTC (Annual)</option>
                  </Form.Select>
                </InputGroup>
              </Col>
              <Col xs={6} md={4}>
                <Form.Label className="small fw-bold">Joining Date</Form.Label>
                <Form.Control size="sm" type="date" name="joining_date" value={empForm.joining_date} onChange={handleChange} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold">
                  Reporting Manager
                </Form.Label>
                <Form.Control size="sm" name="reporting_manager" value={empForm.reporting_manager} onChange={handleChange} />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label className="small fw-bold">Phone</Form.Label>
                <Form.Control size="sm" name="phone_no" value={empForm.phone_no} onChange={handleChange} />
              </Col>

              {/* PAN Number & Aadhaar Number */}
              <Col xs={12} md={6}>
                <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                  PAN Number
                  <Badge bg="light" text="dark" className="border" style={{ fontSize: "10px" }}>Tax ID</Badge>
                </Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  name="pan_no"
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  value={empForm.pan_no || ""}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setEmpForm((prev) => ({ ...prev, pan_no: val }));
                  }}
                  style={{ textTransform: "uppercase", letterSpacing: "1px" }}
                />
                <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                  10-character Permanent Account Number
                </div>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label className="small fw-bold d-flex align-items-center gap-1">
                  Aadhaar Number
                  <Badge bg="light" text="dark" className="border" style={{ fontSize: "10px" }}>UIDAI</Badge>
                </Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  name="aadhaar_no"
                  placeholder="e.g. 1234 5678 9012"
                  maxLength={14}
                  value={empForm.aadhaar_no || ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setEmpForm((prev) => ({ ...prev, aadhaar_no: formatted }));
                  }}
                  style={{ letterSpacing: "1px" }}
                />
                <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                  12-digit Indian National Identity Number
                </div>
              </Col>

              {/* Facilities & Statutory Benefits (HR Configuration) */}
              <Col xs={12}>
                <div className="p-3 rounded-3 border bg-white shadow-xs">
                  <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fs-5">🏦</span>
                      <div>
                        <div className="fw-bold small text-dark">Employee Facilities & Statutory Entitlements</div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          Enable or disable specific facilities for this employee. Detailed amounts are calculated in Payroll by Accounts.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 facility checkboxes */}
                  <Row className="g-2 mb-3">
                    <Col xs={6} md={3}>
                      <div className="p-2 rounded border bg-light d-flex align-items-center gap-2">
                        <Form.Check
                          type="checkbox"
                          id="fac-advance"
                          label={<span className="small fw-semibold">Advance Payment</span>}
                          checked={empForm.facilities?.advance !== false}
                          onChange={(e) => setEmpForm((prev) => ({
                            ...prev,
                            facilities: { ...(prev.facilities || {}), advance: e.target.checked }
                          }))}
                        />
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="p-2 rounded border bg-light d-flex align-items-center gap-2">
                        <Form.Check
                          type="checkbox"
                          id="fac-loan"
                          label={<span className="small fw-semibold">Company Loans</span>}
                          checked={empForm.facilities?.loan !== false}
                          onChange={(e) => setEmpForm((prev) => ({
                            ...prev,
                            facilities: { ...(prev.facilities || {}), loan: e.target.checked }
                          }))}
                        />
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="p-2 rounded border bg-light d-flex align-items-center gap-2">
                        <Form.Check
                          type="checkbox"
                          id="fac-insurance"
                          label={<span className="small fw-semibold">Insurance</span>}
                          checked={empForm.facilities?.insurance !== false}
                          onChange={(e) => setEmpForm((prev) => ({
                            ...prev,
                            facilities: { ...(prev.facilities || {}), insurance: e.target.checked }
                          }))}
                        />
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="p-2 rounded border bg-light d-flex align-items-center gap-2">
                        <Form.Check
                          type="checkbox"
                          id="fac-gratuity"
                          label={<span className="small fw-semibold">Gratuity</span>}
                          checked={empForm.facilities?.gratuity !== false}
                          onChange={(e) => setEmpForm((prev) => ({
                            ...prev,
                            facilities: { ...(prev.facilities || {}), gratuity: e.target.checked }
                          }))}
                        />
                      </div>
                    </Col>
                  </Row>

                  {/* ESI Slab Configuration */}
                  <div className="p-2.5 rounded border bg-light-subtle">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="small text-primary">ESI / Mediclaim Slab Configuration</strong>
                      <Badge bg="info" className="fw-normal" style={{ fontSize: "10px" }}>Statutory Cutoff</Badge>
                    </div>
                    <div className="text-muted mb-2" style={{ fontSize: "11px" }}>
                      Define the salary threshold up to which ESI applies (0.75%), beyond which Corporate Mediclaim applies.
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                      <Form.Check
                        type="radio"
                        name="esi_slab_type"
                        id="esi-global"
                        label={<span className="small">Use Global Slab (₹{globalEsiThreshold.toLocaleString("en-IN")})</span>}
                        checked={empForm.esi_slab_type !== "custom"}
                        onChange={() => setEmpForm((prev) => ({ ...prev, esi_slab_type: "global", esi_threshold: "" }))}
                      />
                      <Form.Check
                        type="radio"
                        name="esi_slab_type"
                        id="esi-custom"
                        label={<span className="small">Custom Threshold for this Employee</span>}
                        checked={empForm.esi_slab_type === "custom"}
                        onChange={() => setEmpForm((prev) => ({ ...prev, esi_slab_type: "custom", esi_threshold: prev.esi_threshold || globalEsiThreshold }))}
                      />
                    </div>
                    {empForm.esi_slab_type === "custom" && (
                      <div className="mt-2" style={{ maxWidth: "260px" }}>
                        <InputGroup size="sm">
                          <InputGroup.Text>₹</InputGroup.Text>
                          <Form.Control
                            type="number"
                            placeholder="e.g. 21000"
                            value={empForm.esi_threshold}
                            onChange={(e) => setEmpForm((prev) => ({ ...prev, esi_threshold: e.target.value }))}
                          />
                        </InputGroup>
                        <small className="text-muted" style={{ fontSize: "10.5px" }}>
                          Gross &le; ₹{parseFloat(empForm.esi_threshold || 0).toLocaleString("en-IN")} = ESI, Gross &gt; ₹{parseFloat(empForm.esi_threshold || 0).toLocaleString("en-IN")} = Mediclaim
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              {/* Request Employee to Submit / Upload Documents */}
              <Col xs={12}>
                <div className="p-2.5 rounded-3 border bg-light-subtle d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-start gap-2">
                    <div className="text-primary mt-0.5">📄</div>
                    <div>
                      <div className="fw-semibold small">Request Employee to Submit / Upload Verification Documents</div>
                      <div className="text-muted" style={{ fontSize: "11.5px" }}>
                        Employee will be alerted in their profile to submit PAN, Aadhaar, previous work experience, last company salary slips, and educational certificates.
                      </div>
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    id="request-docs-switch"
                    checked={empForm.request_documents !== false}
                    onChange={(e) => setEmpForm((prev) => ({ ...prev, request_documents: e.target.checked }))}
                    className="fs-5 ms-3"
                  />
                </div>
              </Col>

              <Col xs={12}>
                <KpiPicker
                  kpi={empForm.kpi}
                  onChange={(val) =>
                    setEmpForm((prev) => ({ ...prev, kpi: val }))
                  }
                  canEdit={canEditKpi}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="p-2">
            <Button
              variant="link"
              className="text-muted text-decoration-none"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : editMode ? "Update" : "Save"}
            </Button>
          </Modal.Footer>
        </Modal>

        <SalaryStructureModal
          show={salaryModal.show}
          onHide={() => setSalaryModal({ show: false, code: "", name: "" })}
          employeeCode={salaryModal.code}
          employeeName={salaryModal.name}
          canEdit={isAdmin || isHR}
          role={role}
          onSalaryUpdated={(newSalary, newStructure) => {
            if (salaryModal.code && newSalary != null) {
              const cleanModalCode = String(salaryModal.code).replace(/^#/, "").toLowerCase();
              setEmployees((prev) =>
                prev.map((emp) =>
                  String(emp.employee_code || "").replace(/^#/, "").toLowerCase() === cleanModalCode
                    ? {
                        ...emp,
                        current_salary: parseFloat(newSalary),
                        salary_structure: newStructure || emp.salary_structure,
                      }
                    : emp
                )
              );
            }
            fetchEmployees(true);
          }}
        />

        {/* ══ CONFIGURE TABS MODAL ══ */}
        <Modal
          show={tabsModal.show}
          onHide={() => setTabsModal({ show: false, employee: null, selectedTabs: [] })}
          size="lg"
          centered
        >
          <Modal.Header closeButton className="border-0 pb-0">
            <div>
              <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
                <LuSettings className="text-primary" /> Configure Dashboard Modules
              </Modal.Title>
              <div className="text-muted small mt-0.5">
                Employee: <strong className="text-dark">{tabsModal.employee?.name}</strong> ({tabsModal.employee?.employee_code}) &bull; {tabsModal.employee?.dept || "General"}
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="pt-2">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light p-2.5 rounded-3 mb-3 border">
              <div className="small fw-semibold text-secondary">
                Selected: <span className="badge bg-primary text-white rounded-pill px-2.5 py-1">{tabsModal.selectedTabs.length} of {ALL_TABS.length} Modules</span>
              </div>
              <div className="d-flex gap-1.5">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setTabsModal(prev => ({ ...prev, selectedTabs: ALL_TABS.map(t => t.id) }))}
                  className="py-1 px-2 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setTabsModal(prev => ({ ...prev, selectedTabs: [] }))}
                  className="py-1 px-2 text-xs"
                >
                  Deselect All
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setTabsModal(prev => ({ ...prev, selectedTabs: [1, 2, 3, 4, 8, 9, 10, 11, 12, 14, 16] }))}
                  className="py-1 px-2 text-xs"
                >
                  Standard Default
                </Button>
              </div>
            </div>

            <Row className="g-2">
              {ALL_TABS.map((tab) => {
                const isChecked = tabsModal.selectedTabs.includes(tab.id);
                return (
                  <Col xs={12} sm={6} key={tab.id}>
                    <div
                      onClick={() => {
                        setTabsModal(prev => {
                          const updated = isChecked
                            ? prev.selectedTabs.filter(id => id !== tab.id)
                            : [...prev.selectedTabs, tab.id];
                          return { ...prev, selectedTabs: updated };
                        });
                      }}
                      className={`p-3 rounded-3 border h-100 d-flex align-items-start gap-2.5 transition-all ${isChecked
                        ? "bg-primary-subtle border-primary shadow-xs"
                        : "bg-white border-light-subtle hover:bg-light"
                        }`}
                      style={{ cursor: "pointer", transition: "all 0.15s ease-in-out" }}
                    >
                      <Form.Check
                        type="checkbox"
                        id={`tab-checkbox-${tab.id}`}
                        checked={isChecked}
                        onChange={() => { }} // Controlled by card click
                        className="mt-0.5"
                      />
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-center mb-0.5">
                          <strong className={`small text-truncate ${isChecked ? "text-primary fw-bold" : "text-dark fw-semibold"}`}>
                            {tab.name}
                          </strong>
                          <span className={`badge text-[10px] rounded-pill ${isChecked ? "bg-primary text-white" : "bg-light text-secondary border"}`}>
                            {tab.badge}
                          </span>
                        </div>
                        <p className="text-muted small m-0 text-[12px] line-clamp-1" style={{ lineHeight: "1.25" }}>
                          {tab.desc}
                        </p>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="light"
              size="sm"
              disabled={savingTabs}
              onClick={() => setTabsModal({ show: false, employee: null, selectedTabs: [] })}
              className="px-3"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={savingTabs}
              onClick={handleSaveTabs}
              className="px-4 fw-semibold d-flex align-items-center gap-1.5"
            >
              {savingTabs ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Saving Module Permissions...</span>
                </>
              ) : (
                "Save Module Permissions"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ══ EMPLOYEE QUICK VIEW MODAL ══ */}
        <Modal
          show={quickViewModal.show}
          onHide={() => setQuickViewModal({ show: false, employee: null })}
          size="lg"
          centered
        >
          {quickViewModal.employee && (() => {
            const emp = quickViewModal.employee;
            const ringColor = getRingColor(emp.employee_code || emp.name);
            const isOnline = emp.status === "Active";
            const initials = getInitials(emp.name);
            const avatarSrc = getEmployeeAvatar(emp);
            const { primary, secondary } = parseKpi(emp.kpi);

            return (
              <>
                <Modal.Header closeButton className="border-bottom-0 pb-0">
                  <Modal.Title className="fs-5 fw-bold text-dark">
                    Employee Profile
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-2">
                  {/* Header Card */}
                  <div className="p-3 mb-3 rounded-4 bg-light d-flex flex-wrap align-items-center gap-3">
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        border: `3px solid ${ringColor}`,
                        padding: "2px",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={avatarSrc}
                        alt={emp.name}
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: "1px",
                          right: "1px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: isOnline ? "#10b981" : "#ef4444",
                          border: "2px solid #ffffff",
                        }}
                      />
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="fw-bold mb-1 text-dark">{emp.name}</h5>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <Badge bg="secondary" className="fw-normal">{emp.employee_code}</Badge>
                        <Badge bg="info" className="text-dark fw-semibold">{emp.designation || emp.job_role}</Badge>
                        <Badge bg={emp.status === "Active" ? "success" : emp.status === "Resigned" ? "warning" : "danger"} text={emp.status === "Resigned" ? "dark" : "white"}>{emp.status}</Badge>
                      </div>
                    </div>
                    {(isAdmin || isHR) && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="d-flex align-items-center gap-1"
                        onClick={() => {
                          setQuickViewModal({ show: false, employee: null });
                          openEdit(emp);
                        }}
                      >
                        <LuPencil size={14} /> Edit
                      </Button>
                    )}
                  </div>

                  {/* Details Grid */}
                  <Row className="g-3 mb-3">
                    <Col xs={12} sm={6}>
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <h6 className="fw-bold text-muted small mb-2 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                          Contact & Placement
                        </h6>
                        <InfoRow label="Work Email" value={emp.work_email || emp.email} />
                        <InfoRow label="Personal Email" value={emp.personal_email || "—"} />
                        <InfoRow label="Phone" value={emp.phone_no} />
                        <InfoRow label="PAN Number" value={emp.pan_no} />
                        <InfoRow label="Aadhaar Number" value={emp.aadhaar_no} />
                        <InfoRow label="Department" value={emp.dept} />
                        <InfoRow label="Reporting Manager" value={emp.reporting_manager} />
                        <InfoRow label="Joining Date" value={emp.joining_date ? emp.joining_date.split("T")[0] : "—"} />
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold text-muted small mb-0 text-uppercase" style={{ letterSpacing: "0.5px" }}>
                            Salary & Access
                          </h6>
                          <Button
                            variant="outline-success"
                            size="xs"
                            style={{ fontSize: "11px", padding: "2px 8px" }}
                            onClick={() => {
                              setSalaryModal({
                                show: true,
                                code: emp.employee_code,
                                name: emp.name,
                              });
                            }}
                          >
                            View Breakdown
                          </Button>
                        </div>
                        <InfoRow label="Current Base" value={`₹${parseFloat(emp.current_salary || 0).toLocaleString("en-IN")}`} />
                        <InfoRow label="Pay Frequency" value={emp.salary_type || "Monthly"} />
                        <div className="d-flex justify-content-between align-items-center border-bottom mb-1 pb-1">
                          <small className="text-muted fw-bold text-nowrap me-2">Tabs Enabled:</small>
                          <div className="d-flex align-items-center gap-1">
                            <small className="fw-bold">{emp.enabled_tabs ? emp.enabled_tabs.split(",").filter(Boolean).length : 4} Tabs</small>
                            {(isAdmin || isHR) && (
                              <Button
                                variant="link"
                                size="xs"
                                className="p-0 text-primary ms-1"
                                style={{ fontSize: "11px" }}
                                onClick={() => {
                                  setQuickViewModal({ show: false, employee: null });
                                  openConfigureTabs(emp);
                                }}
                              >
                                Configure
                              </Button>
                            )}
                          </div>
                        </div>
                        <InfoRow label="System Role" value={emp.job_role || "employee"} />
                      </div>
                    </Col>
                  </Row>

                  {/* Verification Documents Section */}
                  <div className="p-3 border rounded-3 bg-white mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold text-dark small mb-0">
                        📁 Verification Documents
                      </h6>
                      <Badge
                        bg={
                          emp.verification_status === "approved"
                            ? "success"
                            : emp.verification_status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                        text={emp.verification_status === "rejected" || emp.verification_status === "approved" ? "white" : "dark"}
                      >
                        {emp.verification_status ? emp.verification_status.toUpperCase() : "NOT UPLOADED"}
                      </Badge>
                    </div>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      {(emp.doc_resume || emp.cv_file) && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_resume || emp.cv_file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary btn-sm py-1 px-2 fw-semibold"
                          style={{ fontSize: "12px" }}
                        >
                          📄 CV / Resume <LuExternalLink size={12} className="ms-1" />
                        </a>
                      )}
                      {emp.doc_pan && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_pan}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary btn-sm py-1 px-2 fw-semibold"
                          style={{ fontSize: "12px" }}
                        >
                          💳 PAN Card <LuExternalLink size={12} className="ms-1" />
                        </a>
                      )}
                      {emp.doc_aadhaar && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_aadhaar}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary btn-sm py-1 px-2 fw-semibold"
                          style={{ fontSize: "12px" }}
                        >
                          🪪 Aadhaar Card <LuExternalLink size={12} className="ms-1" />
                        </a>
                      )}
                      {emp.doc_id && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary btn-sm py-1 px-2 fw-semibold"
                          style={{ fontSize: "12px" }}
                        >
                          🪪 ID Document <LuExternalLink size={12} className="ms-1" />
                        </a>
                      )}
                      {emp.doc_cert && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_cert}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary btn-sm py-1 px-2 fw-semibold"
                          style={{ fontSize: "12px" }}
                        >
                          🎓 Degree / Certificate <LuExternalLink size={12} className="ms-1" />
                        </a>
                      )}
                      {emp.doc_payslips && (() => {
                        try {
                          const slips = JSON.parse(emp.doc_payslips);
                          if (Array.isArray(slips) && slips.length > 0) {
                            return slips.map((s, idx) => (
                              <a
                                key={idx}
                                href={`${UPLOADS_BASE}/${s.filename || s}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-success btn-sm py-1 px-2 fw-semibold"
                                style={{ fontSize: "12px" }}
                              >
                                💵 Salary Slip #{idx + 1} <LuExternalLink size={12} className="ms-1" />
                              </a>
                            ));
                          }
                        } catch { }
                        return null;
                      })()}
                      {emp.doc_exp_cert && (() => {
                        try {
                          const certs = JSON.parse(emp.doc_exp_cert);
                          if (Array.isArray(certs) && certs.length > 0) {
                            return certs.map((c, idx) => (
                              <a
                                key={idx}
                                href={`${UPLOADS_BASE}/${c.filename || c}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-info btn-sm py-1 px-2 fw-semibold"
                                style={{ fontSize: "12px" }}
                              >
                                📜 Exp. Cert #{idx + 1} <LuExternalLink size={12} className="ms-1" />
                              </a>
                            ));
                          }
                        } catch { }
                        return null;
                      })()}
                      {emp.doc_last_company && (() => {
                        try {
                          const docs = JSON.parse(emp.doc_last_company);
                          if (Array.isArray(docs) && docs.length > 0) {
                            return docs.map((d, idx) => (
                              <a
                                key={idx}
                                href={`${UPLOADS_BASE}/${d.filename || d}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-warning btn-sm py-1 px-2 fw-semibold"
                                style={{ fontSize: "12px" }}
                              >
                                🏢 Relieving/Company Doc #{idx + 1} <LuExternalLink size={12} className="ms-1" />
                              </a>
                            ));
                          }
                        } catch { }
                        return null;
                      })()}
                      {!emp.cv_file && !emp.doc_resume && !emp.doc_id && !emp.doc_cert && !emp.doc_pan && !emp.doc_aadhaar && !emp.doc_payslips && !emp.doc_exp_cert && !emp.doc_last_company && (
                        <span className="text-muted small">No documents uploaded yet.</span>
                      )}
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="bg-light border-0 py-2">
                  <Button variant="secondary" size="sm" onClick={() => setQuickViewModal({ show: false, employee: null })}>
                    Close
                  </Button>
                  {(isAdmin || isHR) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setQuickViewModal({ show: false, employee: null });
                        openEdit(emp);
                      }}
                    >
                      Edit Full Profile
                    </Button>
                  )}
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* Modern Light Theme Styles */}
        <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 0.8s linear infinite;
        }
        .emp-page-wrapper {
          background-color: #f8fafc;
          min-height: 100vh;
        }
        .emp-controls-card {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .emp-controls-scroll-row {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .emp-controls-scroll-row::-webkit-scrollbar {
          display: none;
        }
        .emp-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0 !important;
          border-radius: 18px !important;
          padding: 22px 18px 18px 18px !important;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
        }
        .emp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px -6px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03) !important;
          border-color: #cbd5e1 !important;
        }
        .emp-dots-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0;
        }
        .emp-dots-btn:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }
        .emp-dots-btn::after {
          display: none !important;
        }
        .emp-avatar-ring {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          border: 2.5px solid;
          padding: 3px;
          position: relative;
          margin: 4px auto 14px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          flex-shrink: 0;
        }
        .emp-avatar-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .emp-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }
        .emp-status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        .emp-name {
          font-size: 15.5px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .emp-role-pill {
          display: inline-block;
          background-color: #f1f5f9;
          color: #475569;
          font-size: 11.5px;
          font-weight: 500;
          padding: 3px 12px;
          border-radius: 9999px;
          max-width: 90%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .emp-actions-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 12px;
          margin-bottom: 16px;
        }
        .emp-action-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          padding: 0;
        }
        .emp-action-btn:hover {
          background-color: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
          transform: translateY(-1px);
        }
        .emp-card-footer {
          border-top: 1px solid #f1f5f9 !important;
          padding-top: 12px !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .emp-badge-salary {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 3px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .emp-badge-salary:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .emp-badge-tabs {
          font-size: 11.5px;
          font-weight: 600;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 3px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .emp-badge-tabs:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }
        .view-toggle-btn {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .view-toggle-btn.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .btn-add-emp {
          background-color: #2563eb;
          border-color: #2563eb;
          font-weight: 600;
          border-radius: 8px;
          padding: 7px 16px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          transition: all 0.15s ease;
        }
        .btn-add-emp:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
          color: #ffffff;
        }
        @media (max-width: 576px) {
          .emp-controls-card {
            padding: 12px !important;
          }
        }
      `}</style>
        {/* Global ESI Slab Configuration Modal */}
        <Modal show={showEsiModal} onHide={() => setShowEsiModal(false)} centered>
          <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #1e3c72, #2a5298)", color: "white" }}>
            <Modal.Title className="fs-5 d-flex align-items-center gap-2">
              <span>⚙️</span> Global ESI Slab Configuration
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 bg-light">
            <div className="mb-3">
              <label className="fw-semibold small mb-1">Company-wide ESI Salary Threshold (₹)</label>
              <InputGroup>
                <InputGroup.Text>₹</InputGroup.Text>
                <Form.Control
                  type="number"
                  min="0"
                  step="500"
                  value={esiForm.global_esi_threshold}
                  onChange={(e) => setEsiForm((prev) => ({ ...prev, global_esi_threshold: e.target.value }))}
                  placeholder="21000"
                />
              </InputGroup>
              <div className="text-muted mt-1" style={{ fontSize: "11.5px" }}>
                Employees with monthly Gross Salary ≤ this threshold will have <strong>Employee State Insurance (0.75%)</strong> deducted.
                Employees earning above this threshold will have <strong>Corporate Mediclaim Health Policy</strong> applied.
              </div>
            </div>

            <div className="p-3 rounded border bg-white shadow-xs">
              <Form.Check
                type="checkbox"
                id="apply-all-checkbox"
                checked={esiForm.apply_to_all}
                onChange={(e) => setEsiForm((prev) => ({ ...prev, apply_to_all: e.target.checked }))}
                label={
                  <div>
                    <span className="fw-semibold text-danger small">Apply to All Employees</span>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      Check this to override any existing custom individual ESI thresholds and enforce this slab across the entire company.
                    </div>
                  </div>
                }
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-white">
            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowEsiModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEsiSettings} disabled={savingEsi}>
              {savingEsi ? "Saving..." : "Save ESI Slab"}
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </div>
  );
};

export default ManageEmployees;
