import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, Badge, Table, Spinner, Alert, InputGroup, Card, Tab, Nav } from "react-bootstrap";
import { getApiBaseUrl } from "../../../api/axios";

const API = getApiBaseUrl();

// Currency formatter
const fmt = (v) => {
  const num = typeof v === "number" ? v : parseFloat(String(v || 0).replace(/[^\d.-]/g, ""));
  return "₹" + (isNaN(num) ? 0 : num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export default function EsiSlabAuditModal({ show, onHide, onSaved, canEdit = true, role = "accounts", inline = false }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Active settings state
  const [globalThreshold, setGlobalThreshold] = useState(21000);
  const [applyToAll, setApplyToAll] = useState(false);
  const [notes, setNotes] = useState("");

  // Detailed ESI Data from backend
  const [settingsData, setSettingsData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [affectedEmployees, setAffectedEmployees] = useState([]);
  const [stats, setStats] = useState({ total_employees: 0, esi_eligible_count: 0, mediclaim_count: 0 });
  const [activeTab, setActiveTab] = useState("overview");

  // Load real-time settings and history from backend
  const loadEsiSettings = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch(`${API}/payroll/settings?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          role: role || "accounts",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSettingsData(data.settings || {});
        setGlobalThreshold(parseFloat(data.settings?.global_esi_threshold) || 21000);
        setHistoryList(Array.isArray(data.esi_history) ? data.esi_history : []);
        setAffectedEmployees(Array.isArray(data.affected_employees) ? data.affected_employees : []);
        if (data.stats) setStats(data.stats);
      } else {
        setFeedback({ type: "danger", message: data.error || "Failed to load ESI settings." });
      }
    } catch (err) {
      console.error("Load ESI settings error:", err);
      setFeedback({ type: "danger", message: "Failed to connect to backend server." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show || inline) {
      loadEsiSettings();
      setApplyToAll(false);
      setNotes("");
    }
  }, [show, inline]);

  // Save new ESI slab configuration
  const handleSaveSlab = async () => {
    if (!canEdit) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API}/payroll/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role: role || "accounts",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          global_esi_threshold: parseFloat(globalThreshold) || 21000,
          apply_to_all: !!applyToAll,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Global ESI Slab updated to ${fmt(globalThreshold)} successfully!`,
        });
        await loadEsiSettings();
        if (onSaved) {
          onSaved(parseFloat(globalThreshold) || 21000);
        }
      } else {
        setFeedback({ type: "danger", message: data.error || "Failed to update ESI slab." });
      }
    } catch (err) {
      console.error("Save ESI slab error:", err);
      setFeedback({ type: "danger", message: "Error updating ESI settings: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const activeCycle = settingsData?.active_cycle;

  const modalBodyContent = (
    <>
      {feedback && (
        <Alert variant={feedback.type} dismissible onClose={() => setFeedback(null)} className="py-2 px-3 small shadow-xs mb-3 color-white">
          {feedback.message}
        </Alert>
      )}

        {/* ══ TOP METRIC PILLS ══ */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-primary h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px" }}>Active ESI Wage Ceiling</span>
              <h4 className="fw-bold text-primary mt-1 mb-0">{fmt(globalThreshold)}</h4>
              <span className="text-muted small" style={{ fontSize: "11px" }}>Current Company Slab</span>
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-success h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px" }}>ESI Beneficiaries</span>
              <h4 className="fw-bold text-success mt-1 mb-0">{stats.esi_eligible_count} Employees</h4>
              <span className="text-muted small" style={{ fontSize: "11px" }}>Gross ≤ {fmt(globalThreshold)}</span>
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-info h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px" }}>Corporate Mediclaim</span>
              <h4 className="fw-bold text-info mt-1 mb-0">{stats.mediclaim_count} Employees</h4>
              <span className="text-muted small" style={{ fontSize: "11px" }}>Gross &gt; {fmt(globalThreshold)}</span>
            </div>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-warning h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px" }}>Statutory Rate (4.00%)</span>
              <h4 className="fw-bold text-dark mt-1 mb-0">0.75% / 3.25%</h4>
              <span className="text-muted small" style={{ fontSize: "11px" }}>Employee / Employer</span>
            </div>
          </Col>
        </Row>

        {/* ══ NAVIGATION TABS ══ */}
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Nav variant="pills" className="bg-white p-1.5 rounded-3 border mb-3 shadow-xs gap-1 text-xs flex justify-around">
            <Nav.Item>
              <Nav.Link eventKey="overview" className="rounded-pill py-1.5 px-3 fw-semibold small d-flex align-items-center gap-1.5">
                <span>⚙️</span>
                <span>Configure ESI Slab</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="periods" className="rounded-pill py-1.5 px-3 fw-semibold small d-flex align-items-center gap-1.5">
                <span>📅</span>
                <span>Contribution & Benefit Periods ("When to When")</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="history" className="rounded-pill py-1.5 px-3 fw-semibold small d-flex align-items-center gap-1.5">
                <span>📜</span>
                <span>Past Records & Gazette History ({historyList.length})</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="employees" className="rounded-pill py-1.5 px-3 fw-semibold small d-flex align-items-center gap-1.5">
                <span>👥</span>
                <span>Employee Coverage Roster ({affectedEmployees.length})</span>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            {/* ══ TAB 1: CONFIGURE ESI SLAB ══ */}
            <Tab.Pane eventKey="overview">
              <Card className="border-0 shadow-xs rounded-3 p-4 bg-white">
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <span>⚙️</span>
                  <span>Set Global Company ESI Wage Ceiling Threshold</span>
                </h6>
                <p className="text-muted small mb-3" style={{ fontSize: "12.5px" }}>
                  The global ESI slab governs statutory employee classification. Staff members whose monthly Gross Salary is within this threshold are enrolled in Employee State Insurance (0.75% employee deduction + 3.25% company contribution). Staff earning above this slab are covered under the Corporate Health Mediclaim policy.
                </p>

                <Row className="g-3 align-items-center">
                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">
                        Global ESI Threshold Cutoff Amount (₹ / month)
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="bg-light fw-bold">₹</InputGroup.Text>
                        <Form.Control
                          type="number"
                          min="0"
                          step="500"
                          disabled={!canEdit || saving}
                          value={globalThreshold}
                          onChange={(e) => setGlobalThreshold(parseFloat(e.target.value) || 0)}
                          className="fw-bold fs-6"
                        />
                      </InputGroup>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <span className="small text-muted" style={{ fontSize: "11px" }}>Quick Standard Presets:</span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="py-0 px-2 rounded-pill small"
                          style={{ fontSize: "11px" }}
                          onClick={() => setGlobalThreshold(21000)}
                        >
                          ₹21,000 (Central Statutory)
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="py-0 px-2 rounded-pill small"
                          style={{ fontSize: "11px" }}
                          onClick={() => setGlobalThreshold(25000)}
                        >
                          ₹25,000 (Company Standard)
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="py-0 px-2 rounded-pill small"
                          style={{ fontSize: "11px" }}
                          onClick={() => setGlobalThreshold(30000)}
                        >
                          ₹30,000 (Proposed)
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">
                        Revision Notes / Authorization Reference
                      </Form.Label>
                      <Form.Control
                        type="text"
                        disabled={!canEdit || saving}
                        placeholder="e.g. Annual wage slab revision per Board / Gazette approval"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ fontSize: "13px" }}
                      />
                      <Form.Text className="text-muted small" style={{ fontSize: "11px" }}>
                        Recorded in the permanent audit trail for compliance and accounts inspection.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="p-3 bg-light rounded-3 mt-3 border">
                  <Form.Check
                    type="checkbox"
                    id="apply-all-esi-checkbox"
                    disabled={!canEdit || saving}
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    label={
                      <div>
                        <strong className="text-danger small">Enforce & Apply to All Employees</strong>
                        <div className="text-muted" style={{ fontSize: "11.5px" }}>
                          Check this option to override individual custom employee thresholds and uniformly apply {fmt(globalThreshold)} company-wide across User and Employee databases.
                        </div>
                      </div>
                    }
                  />
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  {/* <Button variant="outline-secondary" size="sm" onClick={onHide}>
                    Close
                  </Button> */}
                  {canEdit && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="px-4 fw-semibold shadow-xs"
                      disabled={saving || !globalThreshold}
                      onClick={handleSaveSlab}
                    >
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-1" />
                          Saving Slab...
                        </>
                      ) : (
                        "Save & Apply ESI Slab"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            </Tab.Pane>

            {/* ══ TAB 2: DETAILED CONTRIBUTION & BENEFIT PERIODS ("WHEN TO WHEN") ══ */}
            <Tab.Pane eventKey="periods">
              <Card className="border-0 shadow-xs rounded-3 p-4 mb-3 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <span>📅</span>
                    <span>ESIC Statutory Contribution Periods vs Cash Benefit Periods</span>
                  </h6>
                  <Badge bg="success" className="px-2.5 py-1">
                    {activeCycle?.status || "Active Ongoing Cycle"}
                  </Badge>
                </div>

                <p className="text-muted small mb-3" style={{ fontSize: "12.5px" }}>
                  Under <strong>ESIC Regulation 4 of the ESI (General) Regulations, 1950</strong>, statutory deductions are tied to 6-month contribution cycles. Deductions made during an active contribution cycle directly fund the employee's entitlement during the corresponding future benefit period.
                </p>

                {/* Active Ongoing Cycle Highlight */}
                {activeCycle && (
                  <div className="p-3 rounded-3 mb-4 border border-2 border-primary bg-primary-subtle d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div>
                      <div className="badge bg-primary text-white rounded-pill px-2 py-0.5 small mb-1">
                        Currently In Effect (Today: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})
                      </div>
                      <h6 className="fw-bold text-primary mb-1">{activeCycle.period_name}</h6>
                      <div className="small text-dark">
                        <strong>Active Contribution Window:</strong> {activeCycle.contribution_period}
                      </div>
                      <div className="small text-dark">
                        <strong>Corresponding Cash Benefit Window:</strong> {activeCycle.benefit_period}
                      </div>
                    </div>
                    <div className="text-md-end">
                      <span className="badge bg-white text-dark border px-3 py-2 fs-6 fw-bold">
                        Wage Ceiling: {fmt(globalThreshold)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2 Statutory Contribution Cycles Table */}
                <h6 className="fw-bold text-dark mb-2 small text-uppercase">Statutory Cycle Roadmap (When to When)</h6>
                <Table bordered hover responsive className="align-middle small mb-3">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: "80px" }}>Cycle</th>
                      <th>Statutory Contribution Period (Deductions Active)</th>
                      <th>Corresponding Cash Benefit Period (Benefits Disbursed)</th>
                      <th>Benefit Entitlements Covered</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: activeCycle?.period_name?.includes("1st") ? "#f0fdf4" : "transparent" }}>
                      <td className="fw-bold text-center">Cycle 1</td>
                      <td>
                        <strong className="text-success">1st April to 30th September</strong> (6 months)
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          Covers all wages paid across April, May, June, July, August, September.
                        </div>
                      </td>
                      <td>
                        <strong className="text-primary">1st January to 30th June</strong> (Subsequent calendar year)
                      </td>
                      <td className="text-muted" style={{ fontSize: "11.5px" }}>
                        Sickness Benefit, Maternity Benefit, Disablement Benefit, and Family Dependent Cash Allowance.
                      </td>
                    </tr>
                    <tr style={{ background: activeCycle?.period_name?.includes("2nd") ? "#f0fdf4" : "transparent" }}>
                      <td className="fw-bold text-center">Cycle 2</td>
                      <td>
                        <strong className="text-success">1st October to 31st March</strong> (6 months)
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          Covers all wages paid across October, November, December, January, February, March.
                        </div>
                      </td>
                      <td>
                        <strong className="text-primary">1st July to 31st December</strong> (Subsequent calendar year)
                      </td>
                      <td className="text-muted" style={{ fontSize: "11.5px" }}>
                        Sickness Benefit, Maternity Benefit, Disablement Benefit, and Medical Care at ESIC Dispensaries.
                      </td>
                    </tr>
                  </tbody>
                </Table>

                {/* Rule 50: Wage Ceiling Continuation Rule */}
                <div className="p-3 bg-warning-subtle border border-warning rounded-3 small">
                  <div className="fw-bold text-warning-emphasis d-flex align-items-center gap-1.5 mb-1">
                    <span>⚠️</span>
                    <span>Statutory Mid-Period Ceiling Rule (Rule 50 of ESI Central Rules):</span>
                  </div>
                  <p className="mb-0 text-dark" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                    If an employee's gross monthly wage exceeds the ceiling threshold (e.g. ₹21,000 / ₹25,000) <strong>after the beginning of a contribution period</strong> (for example, receiving an annual appraisal or promotion in July), the employee <strong>continues to be covered and ESI deductions continue uninterrupted until the expiry of that contribution period</strong> (i.e. until 30th September). The employee transitions out to Corporate Mediclaim only with the start of the next cycle (1st October).
                  </p>
                </div>
              </Card>
            </Tab.Pane>

            {/* ══ TAB 3: PAST RECORDS & GAZETTE HISTORY ══ */}
            <Tab.Pane eventKey="history">
              <Card className="border-0 shadow-xs rounded-3 p-4 mb-3 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <span>📜</span>
                    <span>Permanent ESI Slab History & Gazette Ceilings (Past Records)</span>
                  </h6>
                  <span className="text-muted small">{historyList.length} Archived Records</span>
                </div>

                <p className="text-muted small mb-3" style={{ fontSize: "12.5px" }}>
                  Official historical log of wage ceiling limits, statutory gazette revisions, and internal company policy amendments.
                </p>

                <Table bordered hover responsive className="align-middle small mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: "60px" }}>#</th>
                      <th>Effective Period (When to When)</th>
                      <th>Wage Ceiling / Slab</th>
                      <th>Contribution Window</th>
                      <th>Corresponding Benefit Window</th>
                      <th>Authorized By / Authority</th>
                      <th>Notes & Remarks</th>
                      <th>Staff Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          No past records found in history table.
                        </td>
                      </tr>
                    ) : (
                      historyList.map((hist, idx) => {
                        const isCurrent = hist.effective_to === "Present";
                        return (
                          <tr key={hist.id || idx} style={{ background: isCurrent ? "#f0fdf4" : "transparent" }}>
                            <td className="text-center fw-bold">{hist.id || idx + 1}</td>
                            <td>
                              <strong>{hist.effective_from}</strong> to <strong>{hist.effective_to}</strong>
                              {isCurrent && (
                                <span className="badge bg-success ms-1.5" style={{ fontSize: "10px" }}>
                                  Active Slab
                                </span>
                              )}
                            </td>
                            <td className="fw-bold text-primary fs-6">{fmt(hist.threshold)}</td>
                            <td className="text-muted" style={{ fontSize: "11.5px" }}>{hist.contribution_period || "1st Apr-30th Sep / 1st Oct-31st Mar"}</td>
                            <td className="text-muted" style={{ fontSize: "11.5px" }}>{hist.benefit_period || "1st Jan-30th Jun / 1st Jul-31st Dec"}</td>
                            <td>
                              <Badge bg={isCurrent ? "primary" : "secondary"} className="fw-normal">
                                {hist.changed_by || "Statutory Gazette"}
                              </Badge>
                            </td>
                            <td className="text-muted" style={{ fontSize: "11.5px", maxWidth: "260px" }}>
                              {hist.notes || "Statutory Ceiling Update"}
                            </td>
                            <td className="text-center fw-semibold">
                              {hist.affected_count || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </Card>
            </Tab.Pane>

            {/* ══ TAB 4: EMPLOYEE COVERAGE ROSTER ══ */}
            <Tab.Pane eventKey="employees">
              <Card className="border-0 shadow-xs rounded-3 p-4 mb-3 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                      <span>👥</span>
                      <span>Real-Time Employee Coverage Roster</span>
                    </h6>
                    <span className="text-muted small" style={{ fontSize: "12px" }}>
                      Active status of all staff members against the {fmt(globalThreshold)} slab threshold
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <Badge bg="success" className="px-2.5 py-1.5">
                      {stats.esi_eligible_count} Under ESI (≤ {fmt(globalThreshold)})
                    </Badge>
                    <Badge bg="info" className="px-2.5 py-1.5">
                      {stats.mediclaim_count} Corporate Mediclaim (&gt; {fmt(globalThreshold)})
                    </Badge>
                  </div>
                </div>

                <Table bordered hover responsive className="align-middle small mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Employee Code</th>
                      <th>Staff Name</th>
                      <th>Department & Role</th>
                      <th style={{ textAlign: "right" }}>Gross Salary</th>
                      <th>Coverage Classification</th>
                      <th style={{ textAlign: "right" }}>Employee ESI (0.75%)</th>
                      <th style={{ textAlign: "right" }}>Employer ESI (3.25%)</th>
                      <th>Active Contribution Window</th>
                      <th>Benefit Window</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affectedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          {loading ? "Loading staff records..." : "No employees found."}
                        </td>
                      </tr>
                    ) : (
                      affectedEmployees.map((emp) => {
                        const isEsi = emp.is_esi_eligible;
                        return (
                          <tr key={emp.employee_code} style={{ background: isEsi ? "#f0fdf4" : "transparent" }}>
                            <td className="fw-bold text-dark">#{emp.employee_code}</td>
                            <td className="fw-semibold text-dark">{emp.name}</td>
                            <td>
                              <div>{emp.designation}</div>
                              <span className="text-muted" style={{ fontSize: "11px" }}>{emp.dept}</span>
                            </td>
                            <td style={{ textAlign: "right" }} className="fw-bold text-dark">
                              {fmt(emp.current_salary)}
                            </td>
                            <td>
                              <span
                                className={`badge rounded-pill px-2.5 py-1 ${
                                  isEsi ? "bg-success-subtle text-success border border-success" : "bg-info-subtle text-info border border-info"
                                }`}
                                style={{ fontSize: "11px" }}
                              >
                                {isEsi ? "✅ ESI Covered (≤ Slab)" : "🏥 Corporate Mediclaim (> Slab)"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }} className="fw-semibold text-danger">
                              {isEsi ? fmt(emp.monthly_esi_employee) : "—"}
                            </td>
                            <td style={{ textAlign: "right" }} className="fw-semibold text-primary">
                              {isEsi ? fmt(emp.monthly_esi_employer) : "—"}
                            </td>
                            <td className="text-muted" style={{ fontSize: "11px" }}>
                              {isEsi ? emp.active_period : "N/A"}
                            </td>
                            <td className="text-muted" style={{ fontSize: "11px" }}>
                              {isEsi ? emp.benefit_period : "N/A"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </Card>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
    </>
  );

  if (inline) {
    return (
      <div className="bg-white rounded-4 shadow-sm border overflow-hidden mb-4">
        <div className="p-3.5 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white" }}>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "22px" }}>🛡️</span>
              <h5 className="fs-5 fw-bold mb-0 text-white">
                Global ESI Slab Configuration & Statutory Contribution Audit
              </h5>
            </div>
            <div className="small text-slate-300 opacity-75 mt-1" style={{ fontSize: "12px" }}>
              Under Employees' State Insurance Act, 1948 • Managed by Accounts & HR Department
            </div>
          </div>
          {onHide && (
            <Button variant="outline-light" size="sm" className="rounded-pill px-3" onClick={onHide}>
              Close
            </Button>
          )}
        </div>
        <div className="p-4 bg-light">
          {modalBodyContent}
        </div>
        <div className="bg-white px-4 py-2.5 border-top d-flex justify-content-between align-items-center">
          <span className="small text-muted" style={{ fontSize: "11.5px" }}>
            Statutory Compliance: Ministry of Labour & Employment • The Employees' State Insurance Act, 1948
          </span>
          {onHide && (
            <Button variant="outline-secondary" size="sm" onClick={onHide}>
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white" }}>
        <div>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <Modal.Title className="fs-5 fw-bold mb-0">
              Global ESI Slab Configuration & Statutory Contribution Audit
            </Modal.Title>
          </div>
          <div className="small text-slate-300 opacity-75 mt-1" style={{ fontSize: "12px" }}>
            Under Employees' State Insurance Act, 1948 • Managed by Accounts & HR Department
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4 bg-light">
        {modalBodyContent}
      </Modal.Body>

      <Modal.Footer className="bg-white px-4 py-2.5 border-top d-flex justify-content-between align-items-center">
        <span className="small text-muted" style={{ fontSize: "11.5px" }}>
          Statutory Compliance: Ministry of Labour & Employment • The Employees' State Insurance Act, 1948
        </span>
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
