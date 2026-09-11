import React, { useState, useEffect } from "react";
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
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "../api/axios";

const API = getApiBaseUrl();
const UPLOADS_BASE = "http://localhost:5001/uploads";

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
      alert("❌ Access denied: Only HR can edit the salary structure.");
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

  const isAdmin = role === "admin";
  const isHR = role === "hr" || role === "hrmanager";
  const isManager = role === "manager";
  const isEmployee = role === "employee";
  const canEditKpi = isAdmin || isHR;

  useEffect(() => {
    if (isEmployee) navigate("/dashboard");
    else fetchEmployees();
  }, [role]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/employees`, { headers: { role } });
      const data = await res.json();
      if (data.success) setEmployees(Array.isArray(data.data) ? data.data : []);
      else alert("Error fetching employees");
    } catch (e) {
      alert("Error: " + e.message);
    }
    setLoading(false);
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
    if (isManager || isEmployee) return alert("❌ Not allowed!");
    setEditMode(false);
    setEmpForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (emp) => {
    if (isManager || isEmployee) return alert("❌ Not allowed!");
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
    if (isManager || isEmployee) return alert("❌ Not allowed!");
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
    )
      return alert("❌ Fill all fields!");

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
        alert("✅ Saved!");
        fetchEmployees();
        setShowModal(false);
      } else alert("❌ " + data.error);
    } catch (e) {
      alert("❌ " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (emp) => {
    if (!isAdmin) return alert("❌ Only Admin can delete!");
    if (!window.confirm("Delete employee?")) return;
    try {
      const res = await fetch(`${API}/employees/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", role },
        body: JSON.stringify({ employee_code: emp.employee_code }),
      });
      const data = await res.json();
      if (data.success) fetchEmployees();
      else alert(data.error);
    } catch (e) {
      alert(e.message);
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
        fetchEmployees();
        setTabsModal({ show: false, employee: null, selectedTabs: [] });
      } else {
        alert("❌ " + data.error);
      }
    } catch (e) {
      alert("❌ " + e.message);
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
        alert(`✅ Documents marked as ${status}!`);
        fetchEmployees();
      } else {
        alert("❌ " + data.error);
      }
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  const filtered = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Container className="mt-3 mt-md-4">
      <Row className="mb-3 align-items-center">
        <Col xs={12} md={6} className="mb-2 mb-md-0">
          <h2 className="fs-3 fw-bold mb-1">👥 Employee Management</h2>
          <Badge bg="dark">Role: {role}</Badge>
        </Col>
        <Col
          xs={12}
          md={6}
          className="text-md-end d-flex gap-2 justify-content-md-end"
        >
          <Form.Select
            size="sm"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
            }}
            style={{ width: 140 }}
          >
            <option value="hr">HR Manager</option>
            <option value="admin">Admin</option>
            <option value="manager">Reporting Manager</option>
          </Form.Select>
          {(isAdmin || isHR) && (
            <Button size="sm" onClick={openAdd}>
              + Add
            </Button>
          )}
        </Col>
      </Row>

      <InputGroup className="mb-4 shadow-sm">
        <InputGroup.Text>🔍</InputGroup.Text>
        <Form.Control
          placeholder="Search by name or ID..."
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted">No employees found.</p>
      ) : (
        filtered.map((emp, i) => {
          const { primary, secondary } = parseKpi(emp.kpi);
          return (
            <div
              key={i}
              className="p-3 mb-3 border rounded shadow-sm bg-white card-custom"
            >
              <div className="d-flex flex-wrap align-items-center mb-2">
                <h5 className="mb-0 me-2 fs-6 fw-bold">{emp.name}</h5>
                <div className="d-flex flex-wrap gap-1 mt-1 mt-sm-0">
                  <Badge bg="info" style={{ fontSize: "10px" }}>
                    {emp.job_role}
                  </Badge>
                  <Badge
                    bg={emp.status === "Active" ? "success" : "secondary"}
                    style={{ fontSize: "10px" }}
                  >
                    {emp.status}
                  </Badge>
                  <Badge
                    bg={emp.enabled_tabs && emp.enabled_tabs.split(",").filter(Boolean).length > 4 ? "primary" : "warning"}
                    text={emp.enabled_tabs && emp.enabled_tabs.split(",").filter(Boolean).length > 4 ? "white" : "dark"}
                    style={{ fontSize: "10px" }}
                  >
                    {(() => {
                      const count = emp.enabled_tabs ? emp.enabled_tabs.split(",").filter(Boolean).length : 4;
                      return `${count} Tabs Enabled`;
                    })()}
                  </Badge>
                </div>
              </div>

              <div className="mb-2">
                <Badge
                  bg="warning"
                  text="dark"
                  className="p-2 w-100 w-sm-auto text-start"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setSalaryModal({
                      show: true,
                      code: emp.employee_code,
                      name: emp.name,
                    })
                  }
                >
                  💰 ₹
                  {parseFloat(emp.current_salary || 0).toLocaleString("en-IN")}
                  <small className="opacity-75 ms-1">(View Structure)</small>
                </Badge>
              </div>

              <Row className="g-2">
                <Col xs={12} sm={6}>
                  <InfoRow label="ID" value={emp.employee_code} />
                  <InfoRow label="Dept" value={emp.dept} />
                  <InfoRow label="Email" value={emp.email} />
                </Col>
                <Col xs={12} sm={6}>
                  <InfoRow label="Role" value={emp.designation} />
                  <InfoRow label="Phone" value={emp.phone_no} />
                  <InfoRow label="Manager" value={emp.reporting_manager} />
                </Col>
              </Row>

              {/* Document verification status and link viewing */}
              {(isAdmin || isHR) && (
                <div className="mt-2 p-2 rounded-3 border bg-light">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-1 mb-1">
                    <small className="fw-bold text-dark" style={{ fontSize: "12px" }}>
                      📁 Verification Documents:
                    </small>
                    {(() => {
                      switch (emp.document_status) {
                        case "Verified":
                          return <Badge bg="success" style={{ fontSize: "9px" }}>Verified ✅</Badge>;
                        case "Pending Verification":
                          return <Badge bg="warning" text="dark" style={{ fontSize: "9px" }}>Pending Verification ⏳</Badge>;
                        case "Rejected":
                          return <Badge bg="danger" style={{ fontSize: "9px" }}>Rejected ❌</Badge>;
                        default:
                          return <Badge bg="secondary" style={{ fontSize: "9px" }}>Not Uploaded 📄</Badge>;
                      }
                    })()}
                  </div>

                  {(emp.doc_resume || emp.doc_id || emp.doc_cert) ? (
                    <div className="d-flex flex-wrap gap-2 my-1">
                      {emp.doc_resume && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_resume}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary py-0 px-2 fw-semibold"
                          style={{ fontSize: "10px", lineHeight: "1.8" }}
                        >
                          📄 CV / Resume
                        </a>
                      )}
                      {emp.doc_id && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary py-0 px-2 fw-semibold"
                          style={{ fontSize: "10px", lineHeight: "1.8" }}
                        >
                          📄 National ID
                        </a>
                      )}
                      {emp.doc_cert && (
                        <a
                          href={`${UPLOADS_BASE}/${emp.doc_cert}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-secondary py-0 px-2 fw-semibold"
                          style={{ fontSize: "10px", lineHeight: "1.8" }}
                        >
                          📄 Educational Certs
                        </a>
                      )}
                    </div>
                  ) : (
                    <small className="text-muted d-block my-1" style={{ fontSize: "11px" }}>
                      No documents uploaded yet.
                    </small>
                  )}

                  {isHR && emp.document_status === "Pending Verification" && (
                    <div className="d-flex gap-2 mt-2 pt-1 border-top">
                      <Button
                        size="xs"
                        variant="success"
                        style={{ fontSize: "10px", padding: "2px 8px" }}
                        onClick={() => handleVerifyDocs(emp.employee_code, "Verified")}
                      >
                        Verify / Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="danger"
                        style={{ fontSize: "10px", padding: "2px 8px" }}
                        onClick={() => handleVerifyDocs(emp.employee_code, "Rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* KPI on card */}
              {/* KPI on card */}
              {(primary.length > 0 || secondary.length > 0) && (
                <div className="mt-2 p-2 rounded-3 kpi-card-section">
                  <small
                    className="fw-bold d-block mb-1"
                    style={{ color: "#0d6efd" }}
                  >
                    🎯 Job Role / Responsibilities
                  </small>

                  {/* Primary Pills */}
                  {primary.length > 0 && (
                    <div className="mb-1">
                      <small
                        className="text-muted fw-bold me-1"
                        style={{ fontSize: "10px" }}
                      >
                        PRIMARY:
                      </small>
                      <div className="d-inline-flex flex-wrap gap-1">
                        {primary.map((item, idx) => (
                          <span
                            key={`p-${idx}`}
                            className="kpi-display-pill kpi-display-primary"
                          >
                            <span className="kpi-pill-num">{idx + 1}</span>{" "}
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Secondary Pills */}
                  {secondary.length > 0 && (
                    <div>
                      <small
                        className="text-muted fw-bold me-1"
                        style={{ fontSize: "10px" }}
                      >
                        SECONDARY:
                      </small>
                      <div className="d-inline-flex flex-wrap gap-1">
                        {secondary.map((item, idx) => (
                          <span
                            key={`s-${idx}`}
                            className="kpi-display-pill kpi-display-secondary"
                          >
                            <span className="kpi-pill-num">{idx + 1}</span>{" "}
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 d-flex gap-2 flex-wrap">
                {(isAdmin || isHR) && (
                  <Button
                    size="sm"
                    variant="outline-info"
                    className="flex-grow-1 fw-bold text-nowrap"
                    onClick={() => openConfigureTabs(emp)}
                  >
                    ⚙️ Configure Tabs
                  </Button>
                )}
                {(isAdmin || isHR) && (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="flex-grow-1"
                    onClick={() => openEdit(emp)}
                  >
                    Edit
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline-danger"
                    className="flex-grow-1"
                    onClick={() => handleDelete(emp)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })
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
              <Form.Label className="small fw-bold">Emp ID</Form.Label>
              <Form.Control
                size="sm"
                name="employee_code"
                value={empForm.employee_code}
                onChange={handleChange}
                disabled={editMode}
              />
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
            className="text-muted"
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

      <style>{`
        .container { max-width: 900px; }
        .card-custom { transition: all 0.2s; }
        .card-custom:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important; }

        /* Card KPI */
        .kpi-card-section { background: #f0f4ff; border-left: 3px solid #0d6efd; }
        .kpi-display-pill {
          display: inline-flex; align-items: center; gap: 4px;
          border-radius: 20px; padding: 2px 10px;
          font-size: 11px; font-weight: 500; white-space: nowrap;
        }
        .kpi-display-primary  { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
        .kpi-display-secondary{ background: #f1f5f9; color: #475569;  border: 1px solid #cbd5e1; }
        .kpi-pill-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 16px; height: 16px; border-radius: 50%;
          font-size: 9px; font-weight: 700; flex-shrink: 0;
        }
        .kpi-display-primary  .kpi-pill-num { background: #1d4ed8; color: white; }
        .kpi-display-secondary .kpi-pill-num { background: #64748b; color: white; }

        /* Picker */
        .kpi-picker-wrapper { background: linear-gradient(135deg,#f0f4ff,#eaf0ff); border: 1px solid #c7d9ff; }
        .kpi-box { background: #fff; }
        .kpi-primary-box   { border: 1.5px solid #93c5fd; background: #f0f9ff !important; }
        .kpi-secondary-box { border: 1.5px solid #cbd5e1; background: #f8fafc !important; }
        .kpi-box-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 10px; }
        .primary-badge   { background: #1d4ed8; color: white; }
        .secondary-badge { background: #64748b; color: white; }

        /* Numbered input row */
        .kpi-numbered-row {
          display: flex; align-items: center; gap: 6px; position: relative;
        }
        .kpi-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 50%;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .primary-num   { background: #1d4ed8; color: white; }
        .secondary-num { background: #64748b; color: white; }
        .kpi-input { font-size: 12px !important; flex: 1; }
        .kpi-input:focus { box-shadow: none; border-color: #93c5fd; }
        .kpi-input:disabled { background: #f1f5f9; cursor: not-allowed; }
        .kpi-clear-btn {
          font-size: 11px; color: #9ca3af; cursor: pointer;
          flex-shrink: 0; padding: 0 2px; line-height: 1;
        }
        .kpi-clear-btn:hover { color: #ef4444; }

        /* Preview pills */
        .kpi-preview-pill {
          display: inline-flex; align-items: center; gap: 4px;
          border-radius: 20px; padding: 2px 10px;
          font-size: 11px; font-weight: 500;
        }
        .kpi-preview-primary  { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
        .kpi-preview-secondary{ background: #f1f5f9; color: #475569;  border: 1px solid #cbd5e1; }
        .kpi-preview-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 15px; height: 15px; border-radius: 50%;
          font-size: 8px; font-weight: 700;
        }
        .kpi-preview-primary  .kpi-preview-num { background: #1d4ed8; color: white; }
        .kpi-preview-secondary .kpi-preview-num { background: #64748b; color: white; }

        @media (max-width: 576px) {
          h2 { font-size: 1.25rem !important; }
          .badge { font-size: 0.7rem; }
        }
      `}</style>
    </Container>
  );
};

export default ManageEmployees;
