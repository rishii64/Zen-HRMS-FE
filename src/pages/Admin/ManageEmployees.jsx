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
import { getApiBaseUrl, getBackendBaseUrl, getUploadUrl } from "../../api/axios";

const API = getApiBaseUrl();
const UPLOADS_BASE = `${getBackendBaseUrl()}/uploads`;

const DEFAULT_USER_AVATAR = "/default-avatar.svg";

const getEmployeeAvatar = (emp) => {
  const photo = emp?.profile_photo || emp?.profile_pic || emp?.avatar;
  if (photo && typeof photo === "string" && photo.trim() !== "") {
    return getUploadUrl(photo.trim());
  }
  return DEFAULT_USER_AVATAR;
};

const ALL_TABS = [
  { id: 1, name: "Attendance" },
  { id: 2, name: "Leave Request" },
  { id: 3, name: "Payroll & Salary" },
  { id: 4, name: "Holiday List" },
  { id: 5, name: "Resignation" },
  { id: 6, name: "Appraisal" },
  { id: 7, name: "Training & Awareness" },
  { id: 8, name: "Recruitment" },
  { id: 9, name: "Leave Approval" }
];

const EMPTY_FORM = {
  employee_code: "",
  salutation: "Mr.",
  name: "",
  dept: "",
  designation: "",
  email: "",
  job_role: "employee",
  status: "Active",
  current_salary: "",
  salary_type: "Monthly (In Hand)",
  reporting_manager: "",
  joining_date: "",
  phone_no: "",
  password: "User@123",
  kpi: "",
  tabs_enabled: false,
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
    da: 0,
    hra: 0,
    allowance: 0,
    conveyance: 0,
    medical: 0,
    professional_tax: 0,
    income_tax: 0,
    pf: 0,
    esi: 0,
    tds: 0,
    lop: 0,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [quickGross, setQuickGross] = useState("");

  // Determine if editing is allowed (HR or Admin)
  const isHRUser =
    canEdit ||
    ["hr", "hrmanager", "admin"].includes(
      (role || localStorage.getItem("role") || "").toLowerCase()
    );

  useEffect(() => {
    if (show && employeeCode) {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      fetch(`${API}/employees/${employeeCode}/salary`, {
        headers: { role: role || "hr" },
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.salary) {
            const e = res.salary.earnings || {};
            const d = res.salary.deductions || {};
            const loaded = {
              basic: parseFloat(e.basic) || 0,
              da: parseFloat(e.da) || 0,
              hra: parseFloat(e.hra) || 0,
              allowance: parseFloat(e.allowance) || 0,
              conveyance: parseFloat(e.conveyance) || 0,
              medical: parseFloat(e.medical) || 0,
              professional_tax: parseFloat(d.professional_tax) || 0,
              income_tax: parseFloat(d.income_tax) || 0,
              pf: parseFloat(d.pf) || 0,
              esi: parseFloat(d.esi) || 0,
              tds: parseFloat(d.tds) || 0,
              lop: parseFloat(d.lop) || 0,
            };
            setFormData(loaded);
            setQuickGross(res.salary.gross_salary || "");
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
    const num = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  // Calculations
  const numBasic = parseFloat(formData.basic) || 0;
  const numDa = parseFloat(formData.da) || 0;
  const numHra = parseFloat(formData.hra) || 0;
  const numAllowance = parseFloat(formData.allowance) || 0;
  const numConveyance = parseFloat(formData.conveyance) || 0;
  const numMedical = parseFloat(formData.medical) || 0;

  const grossSalary =
    numBasic + numDa + numHra + numAllowance + numConveyance + numMedical;

  const numPT = parseFloat(formData.professional_tax) || 0;
  const numIT = parseFloat(formData.income_tax) || 0;
  const numPf = parseFloat(formData.pf) || 0;
  const numEsi = parseFloat(formData.esi) || 0;
  const numTds = parseFloat(formData.tds) || 0;
  const numLop = parseFloat(formData.lop) || 0;

  const totalDeductions =
    numPT + numIT + numPf + numEsi + numTds + numLop;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Quick auto-distribution formula for HR
  const handleAutoDistribute = (amount) => {
    const gross = parseFloat(amount);
    if (isNaN(gross) || gross <= 0) return;

    const basic = Math.round(gross * 0.40);
    const da = Math.round(gross * 0.10);
    const hra = Math.round(gross * 0.40);
    const conveyance = Math.round(gross * 0.05) || 1600;
    const medical = Math.round(gross * 0.05) || 1250;
    const assigned = basic + da + hra + conveyance + medical;
    const allowance = Math.max(0, gross - assigned);

    const pf = Math.round(basic * 0.12);
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const pt = gross > 15000 ? 200 : 0;

    setFormData({
      basic,
      da,
      hra,
      allowance,
      conveyance,
      medical,
      professional_tax: pt,
      income_tax: 0,
      pf,
      esi,
      tds: 0,
      lop: 0,
    });
  };

  const handleSave = async () => {
    if (!isHRUser) {
      toast.error("Access denied: Only HR can edit the salary structure.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API}/employees/${employeeCode}/salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role: role || "hr",
        },
        body: JSON.stringify({
          basic: numBasic,
          da: numDa,
          hra: numHra,
          allowance: numAllowance,
          conveyance: numConveyance,
          medical: numMedical,
          professional_tax: numPT,
          income_tax: numIT,
          pf: numPf,
          esi: numEsi,
          tds: numTds,
          lop: numLop,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Salary structure updated and saved successfully!");
        if (onSalaryUpdated) {
          onSalaryUpdated(data.current_salary || grossSalary);
        }
        setTimeout(() => setSuccessMsg(null), 3000);
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
          <div className="text-end mt-2 mt-sm-0">
            <span className="badge bg-light text-dark border px-2 py-1">
              {isHRUser ? "HR has full edit rights" : "View-only access"}
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
                        Enter target Gross Salary to auto-populate standard percentages (40% Basic, 10% DA, 40% HRA, 5% Conveyance, 5% Medical & PF).
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

                      {/* DA */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Dearness Allowance (DA)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>Cost of Living</small>
                        </div>
                        {isHRUser ? (
                          <InputGroup size="sm">
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={formData.da}
                              onChange={(e) => handleChange("da", e.target.value)}
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.da)}</div>
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

                      {/* ESI */}
                      <div>
                        <div className="d-flex justify-content-between">
                          <Form.Label className="small fw-semibold mb-1">Employee State Insurance (ESI)</Form.Label>
                          <small className="text-muted" style={{ fontSize: "10px" }}>State Insurance</small>
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
                            />
                          </InputGroup>
                        ) : (
                          <div className="fw-bold text-end p-1 border-bottom">{fmt(formData.esi)}</div>
                        )}
                      </div>

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
  const [role, setRole] = useState(localStorage.getItem("role") || "admin");

  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [selectedDesignation, setSelectedDesignation] = useState("All");
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
      const res = await fetch(`${API}/employees?_t=${Date.now()}`, { headers: { role } });
      const data = await res.json();
      if (data.success) setEmployees(Array.isArray(data.data) ? data.data : []);
      else if (!silent) toast.error("Error fetching employees");
    } catch (e) {
      if (!silent) toast.error("Error: " + e.message);
    }
    if (!silent) setLoading(false);
    else setRefreshing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpForm((prev) => ({ ...prev, [name]: value }));
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
    setEmpForm(EMPTY_FORM);
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

    setEmpForm({
      ...emp,
      salutation,
      name: cleanName,
      salary_type: emp.salary_type || "Monthly (In Hand)",
      joining_date: emp.joining_date ? emp.joining_date.split("T")[0] : "",
      password: "User@123",
      kpi: emp.kpi || "",
      tabs_enabled: emp.tabs_enabled || false,
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
      current_salary,
      salary_type,
      joining_date,
      reporting_manager,
      phone_no,
    } = empForm;
    if (
      !employee_code ||
      !name ||
      !dept ||
      !designation ||
      !email ||
      !current_salary ||
      !joining_date ||
      !reporting_manager ||
      !phone_no
    ) {
      toast.error("Please fill all required fields!");
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
      name: formattedFullName,
      salutation: titlePrefix,
      current_salary: monthlySalary,
      salary_type: salary_type || "Monthly (In Hand)",
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
    let currentTabs = [1, 2, 3, 4]; // default limited tabs
    if (emp.enabled_tabs) {
      if (typeof emp.enabled_tabs === "string") {
        currentTabs = emp.enabled_tabs.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      } else if (Array.isArray(emp.enabled_tabs)) {
        currentTabs = emp.enabled_tabs.map(Number);
      }
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
    try {
      const res = await fetch(`${API}/employees/update-tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", role },
        body: JSON.stringify({ employee_code: empCode, enabled_tabs: tabsModal.selectedTabs }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Tab permissions updated successfully!");
        fetchEmployees();
        setTabsModal({ show: false, employee: null, selectedTabs: [] });
      } else {
        toast.error(data.error || "Failed to update tabs");
      }
    } catch (e) {
      toast.error(e.message || "Failed to update tabs");
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

      return matchesSearch && matchesDesig;
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
  }, [employees, searchTerm, selectedDesignation, sortBy]);

  return (
    <div className="emp-page-wrapper py-3 py-md-4">
      <Container fluid className="max-w-6xl">
        {/* Top Control Bar Matching Screenshot */}
        <div className="emp-controls-card p-3 mb-4 bg-white border rounded-4 shadow-sm">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Left Filters Group */}
            <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
              {/* Designation Filter */}
              <div className="filter-item">
                <Form.Select
                  size="sm"
                  value={selectedDesignation}
                  onChange={(e) => setSelectedDesignation(e.target.value)}
                  className="filter-select rounded-3 py-2 px-3 fw-semibold text-secondary"
                  style={{ minWidth: "160px", borderColor: "#cbd5e1" }}
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

              {/* Sort By Filter */}
              <div className="filter-item">
                <Form.Select
                  size="sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select rounded-3 py-2 px-3 fw-semibold text-secondary"
                  style={{ minWidth: "185px", borderColor: "#cbd5e1" }}
                >
                  <option value="newest">Sort By : Last 7 Days</option>
                  <option value="oldest">Sort By : Oldest</option>
                  <option value="name-asc">Sort By : Name (A - Z)</option>
                  <option value="name-desc">Sort By : Name (Z - A)</option>
                  <option value="salary-high">Sort By : Salary (High - Low)</option>
                  <option value="salary-low">Sort By : Salary (Low - High)</option>
                </Form.Select>
              </div>

              {/* Search Bar */}
              <div className="filter-item flex-grow-1" style={{ maxWidth: "320px", minWidth: "200px" }}>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-white border-end-0 text-muted" style={{ borderColor: "#cbd5e1" }}>
                    <LuSearch size={15} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search name, code, dept..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0 py-2"
                    style={{ borderColor: "#cbd5e1" }}
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      style={{ borderColor: "#cbd5e1" }}
                    >
                      <LuX size={14} />
                    </Button>
                  )}
                </InputGroup>
              </div>
            </div>

            {/* Right Controls: Role Switcher, View Switcher & Add Employee */}
            <div className="d-flex align-items-center gap-3">
              {/* Role selector for admin/HR testing */}
              <div className="d-none d-md-block">
                <Form.Select
                  size="sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-3 fw-semibold text-secondary"
                  style={{ width: "135px", borderColor: "#cbd5e1" }}
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
                className="view-toggle-btn"
                onClick={() => fetchEmployees(true)}
                title="Refresh employee list & latest photos"
                style={{ width: "32px", height: "32px" }}
              >
                <LuRefreshCw size={15} className={refreshing ? "spin-animation" : ""} />
              </button>

              <div className="view-toggle-pill">
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LuLayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  title="List View"
                >
                  <LuList size={16} />
                </button>
              </div>

              {/* Add Employee Button */}
              {(isAdmin || isHR) && (
                <button type="button" className="btn-add-emp" onClick={openAdd}>
                  <LuPlus size={16} />
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
                        style={{ backgroundColor: isOnline ? "#10b981" : "#94a3b8" }}
                        title={isOnline ? "Active" : "Inactive"}
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
                        href={emp.email ? `mailto:${emp.email}` : "#"}
                        className="emp-action-btn"
                        title={emp.email ? `Email: ${emp.email}` : "No Email Provided"}
                        onClick={(e) => !emp.email && e.preventDefault()}
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
                                backgroundColor: isOnline ? "#10b981" : "#ef4444",
                                border: "1.5px solid #ffffff",
                              }}
                            />
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <div className="text-muted small" style={{ fontSize: "11px" }}>{emp.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="fw-semibold text-dark">{emp.designation || emp.job_role || "—"}</div>
                        <div className="text-muted small" style={{ fontSize: "11px" }}>{emp.dept || "General"}</div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-2">
                          {emp.email && (
                            <a href={`mailto:${emp.email}`} className="text-secondary" title={emp.email}>
                              <LuMail size={15} />
                            </a>
                          )}
                          {emp.phone_no && (
                            <a href={`tel:${emp.phone_no}`} className="text-secondary" title={emp.phone_no}>
                              <LuPhone size={15} />
                            </a>
                          )}
                          <span className="text-muted small">{emp.email || emp.phone_no || "—"}</span>
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
                <Form.Label className="small fw-bold">Email</Form.Label>
                <Form.Control size="sm" name="email" value={empForm.email} onChange={handleChange} />
              </Col>
              <Col xs={6} md={4}>
                <Form.Label className="small fw-bold">Status</Form.Label>
                <Form.Select size="sm" name="status" value={empForm.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
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
                    style={{ maxWidth: "165px", fontWeight: "600" }}
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
          onSalaryUpdated={(newSalary) => {
            fetchEmployees();
          }}
        />

        {/* ══ CONFIGURE TABS MODAL ══ */}
        <Modal
          show={tabsModal.show}
          onHide={() => setTabsModal({ show: false, employee: null, selectedTabs: [] })}
          size="md"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title className="fs-5 fw-bold">
              ⚙️ Configure Tabs for {tabsModal.employee?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted small mb-3">
              Select the dashboard tabs you want to enable for this employee.
            </p>
            <div className="d-flex flex-column gap-2">
              {ALL_TABS.map((tab) => {
                const isChecked = tabsModal.selectedTabs.includes(tab.id);
                return (
                  <Form.Check
                    key={tab.id}
                    type="checkbox"
                    id={`tab-checkbox-${tab.id}`}
                    label={tab.name}
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTabsModal(prev => {
                        const updated = checked
                          ? [...prev.selectedTabs, tab.id]
                          : prev.selectedTabs.filter(id => id !== tab.id);
                        return { ...prev, selectedTabs: updated };
                      });
                    }}
                    className="fw-semibold text-secondary"
                    style={{ fontSize: "14px" }}
                  />
                );
              })}
            </div>
          </Modal.Body>
          <Modal.Footer className="p-2">
            <Button
              variant="link"
              className="text-muted text-decoration-none"
              onClick={() => setTabsModal({ show: false, employee: null, selectedTabs: [] })}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleSaveTabs}
            >
              Save Changes
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
                        <Badge bg={isOnline ? "success" : "danger"}>{emp.status}</Badge>
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
                        <InfoRow label="Email" value={emp.email} />
                        <InfoRow label="Phone" value={emp.phone_no} />
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
                      {!emp.cv_file && !emp.doc_id && !emp.doc_cert && (
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
      </Container>
    </div>
  );
};

export default ManageEmployees;
