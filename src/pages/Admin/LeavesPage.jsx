import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  Form, Button, Card, Container, Row, Col,
  Badge, Table, Nav, Tab, ProgressBar, Alert, Spinner
} from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { getApiBaseUrl, getBackendBaseUrl } from "../../api";

const API_BASE = getApiBaseUrl();
const UPLOAD_API = `${API_BASE}/leave/apply`;
const FILE_BASE = getBackendBaseUrl();

const LEAVE_POLICY = [
  { code: "CL", name: "Casual Leave", maxDays: 5, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All" },
  { code: "SL", name: "Sick Leave", maxDays: 5, isPaid: true, requiresDoc: true, docThreshold: 3, gender: "All" },
  { code: "EL", name: "Earned Leave", maxDays: 12, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All" },
  { code: "HL", name: "Holidays", maxDays: 10, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All" },
  { code: "LOP", name: "Loss of Pay", maxDays: 0, isPaid: false, requiresDoc: false, docThreshold: 0, gender: "All" },
  { code: "ML", name: "Maternity Leave", maxDays: 90, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "Female" },
  { code: "PL", name: "Paternity Leave", maxDays: 5, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "Male" },
  { code: "CO", name: "Comp Off", maxDays: 0, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All" },
  { code: "BL", name: "Bereavement Leave", maxDays: 5, isPaid: true, requiresDoc: false, docThreshold: 0, gender: "All" },
];

const WORKING_DAYS = 26;
const calcLOPDays = (taken, balance) => Math.max(0, taken - balance);
const calcPerDay = (gross, wd) => gross / wd;
const calcLOPDeduction = (gross, wd, lop) => parseFloat(((gross / wd) * lop).toFixed(2));
const calcNetSalary = (gross, lopAmt) => parseFloat((gross - lopAmt).toFixed(2));
const getBalanceByCode = (list, code) => list.find(b => b.leave_code === code)?.balance ?? 0;

const MONTHLY_SUMMARY = [{ month: "March 2026", totalLeaves: 5, paidLeaves: 4, lop: 1, workingDays: WORKING_DAYS }];

const APPROVAL_WORKFLOW = [
  { step: 1, action: "Employee applies leave" },
  { step: 2, action: "Manager approves/rejects" },
  { step: 3, action: "HR reviews request" },
  { step: 4, action: "System updates balance" },
  { step: 5, action: "Payroll calculates LOP" },
];

const ADMIN_REPORTS = {
  totalEmployees: 45, onLeaveToday: 4,
  departmentWise: [
    { dept: "Engineering", taken: 15, total: 50 },
    { dept: "Marketing", taken: 8, total: 30 },
    { dept: "HR", taken: 2, total: 10 },
  ],
};

// ── Mobile responsive CSS injected once ──────────────────────
(() => {
  if (document.getElementById("lm-mobile-styles")) return;
  const style = document.createElement("style");
  style.id = "lm-mobile-styles";
  style.textContent = `
    /* Header */
    @media (max-width: 576px) {
      .lm-header-wrap { flex-direction: column !important; align-items: flex-start !important; }
      .lm-header-actions { flex-direction: column !important; width: 100% !important; }
      .lm-header-actions .form-control { width: 100% !important; }
      .lm-header-actions .btn { width: 100% !important; }
    }
    /* Tables — horizontal scroll, scrollbar hidden */
    .lm-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    /* Hide scrollbar everywhere on mobile */
    .lm-table-wrap::-webkit-scrollbar,
    .lm-scroll-hide::-webkit-scrollbar { display: none; }
    .lm-table-wrap,
    .lm-scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
    /* Approval cards */
    @media (max-width: 576px) {
      .lm-appr-inner { flex-direction: column !important; align-items: flex-start !important; }
      .lm-appr-actions { width: 100%; }
      .lm-appr-actions .btn { flex: 1; }
    }
    /* Workflow — vertical on mobile */
    @media (max-width: 576px) {
      .lm-workflow { flex-direction: column !important; align-items: center !important; }
      .lm-workflow-arrow { transform: rotate(90deg); margin: 0 !important; }
    }
  `;
  document.head.appendChild(style);
})();

// ── LocalImagePreview ─────────────────────────────────────────
const LocalImagePreview = ({ src, name }) => {
  const [preview, setPreview] = useState(null);
  return (
    <>
      <img
        src={src} alt={name || "preview"} onClick={() => setPreview(src)}
        style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "2px solid #86efac", cursor: "pointer", display: "block", transition: "transform 0.15s" }}
        onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
      />
      {preview && ReactDOM.createPortal(
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, backdropFilter: "blur(4px)" }}>
          <button onClick={e => { e.stopPropagation(); setPreview(null); }} style={{ position: "fixed", top: 16, right: 20, background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", color: "#fff", fontSize: 18, fontWeight: "bold", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <img src={preview} alt="full preview" onClick={e => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 60px rgba(0,0,0,0.7)" }} />
        </div>, document.body
      )}
    </>
  );
};

// ── DocViewModal ──────────────────────────────────────────────
const DocViewModal = ({ url, isPDF, onClose }) =>
  ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483647, backdropFilter: "blur(4px)" }}>
      <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ position: "fixed", top: 16, right: 20, background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", color: "#fff", fontSize: 18, fontWeight: "bold", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      {isPDF
        ? <div onClick={e => e.stopPropagation()} style={{ width: "92vw", height: "90vh", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 60px rgba(0,0,0,0.7)" }}>
          <iframe src={url} title="Document" width="100%" height="100%" style={{ border: "none" }} />
        </div>
        : <img src={url} alt="preview" onClick={e => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 60px rgba(0,0,0,0.7)" }} />
      }
    </div>, document.body
  );

// ── DocCell ───────────────────────────────────────────────────
const DocCell = ({ docPath }) => {
  const [broken, setBroken] = useState(false);
  const [preview, setPreview] = useState(null);
  if (!docPath) return <span className="text-muted" style={{ fontSize: 10 }}>—</span>;
  const cleanPath = docPath.replace(/\.jpg\.jpeg$/i, ".jpg").replace(/\.jpeg\.jpeg$/i, ".jpeg").replace(/\.png\.jpeg$/i, ".png");
  const isImage = /\.(jpg|jpeg|png)$/i.test(cleanPath);
  const isPDF = /\.pdf$/i.test(cleanPath);
  const url = `${FILE_BASE}${cleanPath}`;
  if (isImage && !broken) {
    return (
      <>
        <img src={url} alt="doc" onClick={() => setPreview(url)} onError={() => setBroken(true)}
          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "2px solid #c7d2fe", cursor: "pointer", display: "block", transition: "transform 0.15s" }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"} />
        {preview && <DocViewModal url={preview} isPDF={false} onClose={() => setPreview(null)} />}
      </>
    );
  }
  return (
    <>
      <button onClick={() => setPreview(url)} className="btn btn-sm rounded-pill px-2 py-0 fw-bold"
        style={{ fontSize: 10, background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer" }}>
        📄 View File
      </button>
      {preview && <DocViewModal url={preview} isPDF={isPDF || broken} onClose={() => setPreview(null)} />}
    </>
  );
};

// ── PDF Generator ─────────────────────────────────────────────
const generatePDF = (formData, grossSalary, balanceList) => {
  const doc = new jsPDF();
  const sal = parseFloat(grossSalary) || 0;
  const lopD = parseInt(formData.lop_days) || 0;
  const lopAmt = sal > 0 ? calcLOPDeduction(sal, WORKING_DAYS, lopD) : 0;
  const netSal = sal > 0 ? calcNetSalary(sal, lopAmt) : sal;
  const perDay = sal > 0 ? calcPerDay(sal, WORKING_DAYS).toFixed(2) : 0;
  doc.setFillColor(30, 58, 95); doc.rect(0, 0, 220, 38, "F");
  doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
  doc.text("ZENTELEX PVT. LTD.", 105, 16, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("Leave Application — Salary Slip", 105, 28, { align: "center" });
  autoTable(doc, { startY: 44, head: [["Employee Details", ""]], body: [["Employee Name", formData.employee_name || "—"], ["Employee Code", formData.employee_code || "—"], ["Department", formData.department || "—"], ["Designation", formData.designation || "—"], ["Joining Date", formData.joining_date || "—"]], theme: "grid", headStyles: { fillColor: [30, 58, 95], fontSize: 11 }, styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } } });
  const leaveRows = [];
  if (formData.leave_type) leaveRows.push(["Leave Type", `${formData.leave_type} (${formData.leave_code})`]);
  if (formData.from_date) leaveRows.push(["From Date", formData.from_date]);
  if (formData.to_date) leaveRows.push(["To Date", formData.to_date]);
  if (formData.total_days) leaveRows.push(["Total Days", String(formData.total_days)]);
  if (formData.reason) leaveRows.push(["Reason", formData.reason]);
  leaveRows.push(["LOP Days", lopD > 0 ? `${lopD} Day(s)` : "None (Fully Paid)"]);
  leaveRows.push(["Leave Status", formData.status || "Pending"]);
  if (formData.doc_original_name) { leaveRows.push(["Supporting Document", formData.doc_original_name]); leaveRows.push(["Document Status", "Uploaded & Saved to Server"]); }
  else leaveRows.push(["Supporting Document", "Not Uploaded"]);
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [["Leave Details", ""]], body: leaveRows, theme: "grid", headStyles: { fillColor: [34, 197, 94], fontSize: 11 }, styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } } });
  if (sal > 0) autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [["Payroll Impact", ""]], body: [["Gross Salary", `INR ${sal.toLocaleString("en-IN")}/-`], ["Working Days", String(WORKING_DAYS)], ["Per Day Salary", `INR ${perDay}/-`], ["LOP Days", `${lopD} Day(s)`], ["LOP Deduction", lopD > 0 ? `INR ${lopAmt.toLocaleString("en-IN")}/-` : "NIL"], ["Net Payable Salary", `INR ${netSal.toLocaleString("en-IN")}/-`], ["Salary Impact", lopD > 0 ? "LOP Deduction Applied" : "No Deduction (Paid Leave)"]], theme: "grid", headStyles: { fillColor: [245, 158, 11], fontSize: 11 }, styles: { fontSize: 10 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } } });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [["Leave Type", "Opening", "Accrued", "Availed", "Closing Balance"]], body: balanceList.map(b => [b.leave_type, String(b.opening), String(b.accrued), String(b.availed), String(b.balance)]), theme: "striped", headStyles: { fillColor: [78, 115, 223] }, styles: { fontSize: 10 } });
  const y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text("Formulas Used:", 20, y);
  doc.text("• Closing Balance = Opening + Accrued – Availed", 20, y + 5);
  doc.text("• LOP Days = Total Days Taken – Eligible Balance", 20, y + 10);
  doc.text("• Per Day Salary = Gross Salary / Working Days", 20, y + 15);
  doc.text("• LOP Deduction = Per Day Salary x LOP Days", 20, y + 20);
  doc.text("• Net Salary = Gross Salary – LOP Deduction", 20, y + 25);
  if (sal > 0 && lopD > 0) doc.text(`• LOP Calc: (${sal} / ${WORKING_DAYS}) x ${lopD} = INR ${lopAmt}`, 20, y + 30);
  doc.text("This is a system-generated document. — ZENTELEX PVT. LTD.", 20, y + 38);
  doc.save(`Leave_Slip_${formData.employee_name}_${formData.from_date || "2026"}.pdf`);
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const LeavesPage = () => {
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (localStorage.getItem("role") || storedUser.role || "employee").toLowerCase();

  const [activeTab, setActiveTab] = useState("apply");
  const [allLeaves, setAllLeaves] = useState([]);
  const [balanceList, setBalanceList] = useState([]);
  const [balanceLoad, setBalanceLoad] = useState(true);
  const [salary, setSalary] = useState("");
  const [lastForm, setLastForm] = useState(null);

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllLeaves(data.data);
      } else if (Array.isArray(data)) {
        setAllLeaves(data);
      }
    } catch (e) {
      console.error("Error fetching leaves:", e);
    }
  }, [token]);

  const fetchBalance = useCallback(async () => {
    setBalanceLoad(true);
    try {
      const res = await fetch(`${API_BASE}/leave/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const b = data.data;
        const list = [
          { leave_type: "Casual Leave", leave_code: "CL", opening: b.casual?.total || 5, balance: b.casual?.remaining ?? 5, accrued: 5, availed: b.casual?.used || 0 },
          { leave_type: "Sick Leave", leave_code: "SL", opening: b.sick?.total || 5, balance: b.sick?.remaining ?? 5, accrued: 5, availed: b.sick?.used || 0 },
          { leave_type: "Earned Leave", leave_code: "EL", opening: b.earned?.total || 12, balance: b.earned?.remaining ?? 12, accrued: 12, availed: b.earned?.used || 0 },
          { leave_type: "Holidays", leave_code: "HL", opening: b.holidays?.total || 10, balance: b.holidays?.remaining ?? 10, accrued: 10, availed: b.holidays?.used || 0 },
          { leave_type: "Maternity Leave", leave_code: "ML", opening: b.maternity?.total || 90, balance: b.maternity?.remaining ?? 90, accrued: 90, availed: b.maternity?.used || 0 },
          { leave_type: "Paternity Leave", leave_code: "PL", opening: b.paternity?.total || 5, balance: b.paternity?.remaining ?? 5, accrued: 5, availed: b.paternity?.used || 0 }
        ];
        setBalanceList(list);
      }
    } catch (e) {
      console.error("Error fetching balance:", e);
    } finally {
      setBalanceLoad(false);
    }
  }, [token]);

  useEffect(() => { fetchLeaves(); fetchBalance(); }, [fetchLeaves, fetchBalance]);

  const handleDownloadPDF = () => { if (!lastForm) { alert("Please submit a leave application first."); return; } generatePDF(lastForm, salary, balanceList); };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this leave record?")) return;
    try {
      await fetch(`${API_BASE}/leave/${id}/cancel`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLeaves();
      fetchBalance();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await fetch(`${API_BASE}/leave/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchLeaves();
      fetchBalance();
    } catch (e) {
      console.error(e);
    }
  };

  const pendingLeaves = allLeaves.filter(l => l.status === "Pending");
  const sal = parseFloat(salary) || 0;
  const march = MONTHLY_SUMMARY[0];
  const lopAmt = sal > 0 ? calcLOPDeduction(sal, WORKING_DAYS, march.lop) : 0;
  const netSal = sal > 0 ? calcNetSalary(sal, lopAmt) : 0;
  const perDay = sal > 0 ? calcPerDay(sal, WORKING_DAYS).toFixed(2) : 0;

  const uniqueBalance = balanceList.filter((item, index, self) =>
    index === self.findIndex((t) => t.leave_type === item.leave_type)
  );

  return (
    <div style={{ backgroundColor: "#f0f4ff", minHeight: "100vh" }}>
      <Container className="py-3 py-md-4">

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 lm-header-wrap">
          <div>
            <h2 className="fw-bold mb-0" style={{ color: "#1e3a5f", fontSize: "clamp(18px,5vw,24px)" }}>Leave Management</h2>
            <p className="text-muted small mb-0">India HR Policy · LOP Auto Calculation</p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap lm-header-actions">
            <Form.Control
              type="number" min="0" placeholder="Gross Monthly Salary (INR)"
              value={salary} onChange={e => setSalary(e.target.value)}
              className="rounded-pill px-3"
              style={{ width: 240, fontSize: 13, border: "1px solid #c7d2fe" }}
            />
            <Button onClick={handleDownloadPDF} className="rounded-pill px-4 fw-bold"
              style={{ background: "#1e3a5f", border: "none" }}>
              Download PDF
            </Button>
          </div>
        </div>

        <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k)}>
          <Row className="g-3">

            {/* ── Sidebar ── */}
            <Col lg={3} xs={12}>

              {/* Mobile: horizontal scrollable pill nav */}
              <div className="d-lg-none mb-3">
                <div className="lm-scroll-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <Nav variant="pills" className="flex-row flex-nowrap gap-2 pb-1 fw-bold" style={{ minWidth: "max-content" }}>
                    {[
                      { key: "apply", label: "Apply Leave" },
                      { key: "history", label: "Leave History" },
                      { key: "approvals", label: "Approvals", badge: pendingLeaves.length },
                      { key: "reports", label: "Admin Reports" },
                    ].map(({ key, label, badge }) => (
                      <Nav.Item key={key}>
                        <Nav.Link eventKey={key} className="rounded-pill d-flex align-items-center gap-1"
                          style={{ whiteSpace: "nowrap", fontSize: 13, padding: "8px 16px" }}>
                          {label}
                          {badge > 0 && <Badge bg="danger" pill>{badge}</Badge>}
                        </Nav.Link>
                      </Nav.Item>
                    ))}
                  </Nav>
                </div>
              </div>

              {/* Desktop: vertical nav */}
              <Card className="border-0 shadow-sm p-3 rounded-4 bg-white d-none d-lg-block">
                <Nav variant="pills" className="flex-column gap-2 fw-bold">
                  {[
                    { key: "apply", label: "Apply Leave" },
                    { key: "history", label: "Leave History" },
                    { key: "approvals", label: "Approvals", badge: pendingLeaves.length },
                    { key: "reports", label: "Admin Reports" },
                  ].map(({ key, label, badge }) => (
                    <Nav.Item key={key}>
                      <Nav.Link eventKey={key} className="rounded-3 py-3 d-flex justify-content-between">
                        <span>{label}</span>
                        {badge > 0 && <Badge bg="danger" pill>{badge}</Badge>}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
              </Card>

              {/* Desktop: leave balance card (vertical progress bars) */}
              <Card className="border-0 shadow-sm mt-3 p-3 rounded-4 bg-white d-none d-lg-block">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="small fw-bold mb-0" style={{ color: "#1e3a5f" }}>Leave Balance</h6>
                  {balanceLoad ? <Spinner animation="border" size="sm" /> : <small className="text-success" style={{ fontSize: 10 }}>● Live</small>}
                </div>
                {uniqueBalance.map((b) => (
                  <div key={`${b.employee_code}_${b.leave_code}`} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center small mb-1">
                      <span className="fw-bold">{b.leave_type}</span>
                      <div className="d-flex align-items-center">
                        <span className="text-muted me-2" style={{ fontSize: "0.8rem" }}>{b.balance}/{b.opening}</span>
                        <button className="btn btn-sm p-0 border-0 text-danger" onClick={() => handleDelete(b.leave_code)} style={{ lineHeight: 1 }}>
                          <i className="bi bi-trash" style={{ fontSize: "0.9rem" }}></i>
                        </button>
                      </div>
                    </div>
                    <ProgressBar now={b.opening > 0 ? (b.balance / b.opening) * 100 : 0} style={{ height: 6 }}
                      variant={b.balance <= 2 ? "danger" : b.balance <= 5 ? "warning" : "success"}
                      className="rounded-pill shadow-sm" />
                  </div>
                ))}
              </Card>

              {/* Mobile: leave balance as horizontal chips */}
              <Card className="border-0 shadow-sm p-3 rounded-4 bg-white d-lg-none">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="small fw-bold mb-0" style={{ color: "#1e3a5f" }}>Leave Balance</h6>
                  {balanceLoad ? <Spinner animation="border" size="sm" /> : <small className="text-success" style={{ fontSize: 10 }}>● Live</small>}
                </div>
                <div className="lm-scroll-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <div className="d-flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
                    {uniqueBalance.map((b) => (
                      <div key={`mob_${b.leave_code}`} className="rounded-3 px-3 py-2 text-center flex-shrink-0"
                        style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", minWidth: 72 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#1e3a5f" }}>{b.leave_type}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: b.balance <= 2 ? "#dc2626" : b.balance <= 5 ? "#d97706" : "#16a34a" }}>{b.balance}</div>
                        <div style={{ fontSize: 9, color: "#6b7280" }}>/ {b.opening}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Col>

            {/* ── Main Content ── */}
            <Col lg={9} xs={12}>
              <Tab.Content>

                {/* APPLY */}
                <Tab.Pane eventKey="apply">
                  <EmployeeLeaveForm
                    salary={salary} balanceList={balanceList}
                    onSubmitSuccess={fd => { setLastForm(fd); fetchLeaves(); fetchBalance(); }}
                  />
                </Tab.Pane>

                {/* HISTORY */}
                <Tab.Pane eventKey="history">
                  <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Header className="bg-white fw-bold py-3 border-0" style={{ color: "#1e3a5f" }}>
                      All Leave Records <Badge bg="secondary" className="ms-2">{allLeaves.length}</Badge>
                    </Card.Header>
                    <div className="lm-table-wrap">
                      <Table hover className="mb-0 small" style={{ minWidth: 900 }}>
                        <thead className="bg-light">
                          <tr>
                            <th>#</th><th>Name</th><th>Code</th><th>Type</th><th>From</th><th>To</th>
                            <th>Days</th><th>LOP</th><th>Reason</th><th>Medical Document</th><th>Status</th><th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allLeaves.length === 0
                            ? <tr><td colSpan={12} className="text-center text-muted py-4">No records found.</td></tr>
                            : allLeaves.map((l, i) => (
                              <tr key={l.id}>
                                <td>{i + 1}</td>
                                <td className="fw-bold">{l.name || l.employee_name || "Employee"}</td>
                                <td><Badge bg="secondary" className="fw-normal">{l.employee_id || l.employee_code || "EMP"}</Badge></td>
                                <td>{l.leave_type}</td>
                                <td>{(l.start_date || l.from_date || "").slice(0, 10)}</td>
                                <td>{(l.end_date || l.to_date || "").slice(0, 10)}</td>
                                <td>{l.total_days}</td>
                                <td><Badge bg={l.lop_days > 0 ? "danger" : "success"}>{l.lop_days > 0 ? `${l.lop_days}d LOP` : "Paid"}</Badge></td>
                                <td className="text-muted">{l.reason || "—"}</td>
                                <td><DocCell docPath={l.doc_url || l.doc_path} /></td>
                                <td><Badge bg={l.status === "Approved" ? "success" : l.status === "Rejected" ? "danger" : "warning"}>{l.status}</Badge></td>
                                <td>
                                  <Button variant="outline-danger" size="sm" className="rounded-pill px-2 py-0" style={{ fontSize: 11 }}
                                    onClick={() => handleDelete(l.id)}>Cancel</Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card>
                </Tab.Pane>

                {/* APPROVALS */}
                <Tab.Pane eventKey="approvals">
                  <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4">
                    <h5 className="fw-bold mb-4" style={{ color: "#1e3a5f" }}>
                      Pending Leave Requests
                      {pendingLeaves.length > 0 && <Badge bg="danger" className="ms-2">{pendingLeaves.length}</Badge>}
                    </h5>
                    {pendingLeaves.length === 0
                      ? <Alert variant="success" className="rounded-4 border-0">No pending leave requests.</Alert>
                      : pendingLeaves.map(req => (
                        <div key={req.id} className="p-3 border rounded-4 bg-light mb-3">
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 lm-appr-inner">
                            <div className="d-flex align-items-start gap-3">
                              <div className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                style={{ width: 45, height: 45, background: "#1e3a5f", fontSize: 14 }}>
                                {(req.name || req.employee_name || "EM").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="mb-0 fw-bold">
                                  {req.name || req.employee_name}
                                  <Badge bg="secondary" className="ms-2 fw-normal" style={{ fontSize: 10 }}>{req.employee_id || req.employee_code}</Badge>
                                  <span className="ms-2 text-muted fw-normal" style={{ fontSize: 11 }}>({req.dept || "General"})</span>
                                </p>
                                <small className="text-muted">
                                  {req.leave_type} &bull; {req.total_days} Day(s) &bull; {(req.start_date || req.from_date || "").slice(0, 10)} &rarr; {(req.end_date || req.to_date || "").slice(0, 10)}
                                </small>
                                {req.reason && <div className="small text-secondary mt-1">Reason: "{req.reason}"</div>}
                                {(req.doc_url || req.doc_path) && (
                                  <div className="mt-2 d-flex align-items-center gap-2">
                                    <span className="small text-muted">Document:</span>
                                    <DocCell docPath={req.doc_url || req.doc_path} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="d-flex gap-2 lm-appr-actions">
                              <Button variant="success" size="sm" className="rounded-pill px-3"
                                onClick={() => handleApprove(req.id, "Approved")}>Approve</Button>
                              <Button variant="outline-danger" size="sm" className="rounded-pill px-3"
                                onClick={() => handleApprove(req.id, "Rejected")}>Reject</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </Card>
                </Tab.Pane>

                {/* REPORTS */}
                <Tab.Pane eventKey="reports">
                  <Row className="g-3 mb-4 text-center">
                    {[
                      { label: "Total Staff", value: ADMIN_REPORTS.totalEmployees, color: "dark" },
                      { label: "On Leave Today", value: ADMIN_REPORTS.onLeaveToday, color: "danger" },
                      { label: "Pending Approvals", value: pendingLeaves.length, color: "warning" },
                    ].map(({ label, value, color }) => (
                      <Col xs={12} sm={4} key={label}>
                        <Card className="border-0 shadow-sm rounded-4 p-3">
                          <div className="text-muted small fw-bold text-uppercase">{label}</div>
                          <h3 className={`fw-bold text-${color} m-0`}>{value}</h3>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  {sal > 0 && (
                    <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4">
                      <h5 className="fw-bold mb-3" style={{ color: "#1e3a5f" }}>LOP Calculation Breakdown</h5>
                      <div className="lm-table-wrap">
                        <Table bordered size="sm" className="small mb-2" style={{ minWidth: 400 }}>
                          <tbody>
                            <tr className="table-light"><td className="fw-bold">Gross Salary</td><td>INR {sal.toLocaleString("en-IN")}/-</td><td className="text-muted">Entered by user</td></tr>
                            <tr><td className="fw-bold">Working Days</td><td>{WORKING_DAYS} days</td><td className="text-muted">Standard month</td></tr>
                            <tr className="table-light"><td className="fw-bold">Per Day Salary</td><td>INR {perDay}/-</td><td className="text-muted">= {sal} / {WORKING_DAYS}</td></tr>
                            <tr><td className="fw-bold">LOP Days</td><td>{march.lop} Day(s)</td><td className="text-muted">= Total Taken – Eligible Balance</td></tr>
                            <tr className="table-danger"><td className="fw-bold">LOP Deduction</td><td className="fw-bold text-danger">INR {lopAmt.toLocaleString("en-IN")}/-</td><td className="text-muted">= {perDay} x {march.lop}</td></tr>
                            <tr className="table-success"><td className="fw-bold">Net Payable Salary</td><td className="fw-bold text-success">INR {netSal.toLocaleString("en-IN")}/-</td><td className="text-muted">= {sal} – {lopAmt}</td></tr>
                          </tbody>
                        </Table>
                      </div>
                      <small className="text-muted">Paid Leave = No deduction &nbsp;|&nbsp; LOP = Salary deduction applied</small>
                    </Card>
                  )}

                  <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <h5 className="fw-bold mb-0" style={{ fontSize: "clamp(13px,3vw,17px)" }}>Leave Balance (Closing = Opening + Accrued – Availed)</h5>
                      <div className="d-flex align-items-center gap-2">
                        {balanceLoad && <Spinner animation="border" size="sm" />}
                        <small className="text-success fw-bold" style={{ fontSize: 11 }}>Saved in Database</small>
                        <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={fetchBalance}>Refresh</Button>
                      </div>
                    </div>
                    <div className="lm-table-wrap">
                      <Table bordered hover size="sm" className="small mb-0" style={{ minWidth: 450 }}>
                        <thead className="table-dark">
                          <tr><th>Emp Code</th><th>Leave Type</th><th>Opening</th><th>Accrued</th><th>Availed</th><th>Closing Balance</th></tr>
                        </thead>
                        <tbody>
                          {balanceList.length === 0
                            ? <tr><td colSpan={6} className="text-center text-muted py-3">Loading...</td></tr>
                            : uniqueBalance.map((b) => (
                              <tr key={`${b.employee_code}_${b.leave_code}`}>
                                <td><Badge bg="secondary" className="fw-normal">{b.employee_code}</Badge></td>
                                <td className="fw-bold">{b.leave_type}</td>
                                <td>{b.opening}</td><td>{b.accrued}</td><td>{b.availed}</td>
                                <td><Badge bg={b.balance <= 2 ? "danger" : b.balance <= 5 ? "warning" : "success"}>{b.balance}</Badge></td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                    <small className="text-muted mt-2 d-block">
                      Formula: <strong>Closing Balance = Opening + Accrued – Availed</strong>
                      &nbsp;|&nbsp; Availed updates automatically on leave submission.
                    </small>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4">
                    <h5 className="fw-bold mb-3">Monthly Leave Summary</h5>
                    <div className="lm-table-wrap">
                      <Table hover className="mb-0 small" style={{ minWidth: 360 }}>
                        <thead className="bg-light">
                          <tr><th>Month</th><th>Total Leaves</th><th>Paid Leaves</th><th>LOP</th><th>Working Days</th></tr>
                        </thead>
                        <tbody>
                          {MONTHLY_SUMMARY.map((row, i) => (
                            <tr key={i}>
                              <td className="fw-bold">{row.month}</td>
                              <td>{row.totalLeaves}</td><td>{row.paidLeaves}</td>
                              <td><Badge bg={row.lop > 0 ? "danger" : "success"}>{row.lop}</Badge></td>
                              <td>{row.workingDays}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4">
                    <h5 className="fw-bold mb-3">Payroll Impact</h5>
                    <div className="d-flex gap-3 flex-wrap">
                      <div className="p-3 rounded-3 flex-fill text-center" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                        <div className="small text-muted fw-bold">Approved Paid Leave</div>
                        <div className="fw-bold text-success mt-1">No Salary Deduction</div>
                      </div>
                      <div className="p-3 rounded-3 flex-fill text-center" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
                        <div className="small text-muted fw-bold">Loss of Pay (LOP)</div>
                        <div className="fw-bold text-danger mt-1">Salary Deduction Applied</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4">
                    <h5 className="fw-bold mb-4">Departmental Leave Utilization</h5>
                    {ADMIN_REPORTS.departmentWise.map((dept, i) => (
                      <div key={i} className="mb-4">
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-bold">{dept.dept}</span>
                          <span className="text-muted">{dept.taken}/{dept.total} Days ({Math.round((dept.taken / dept.total) * 100)}%)</span>
                        </div>
                        <ProgressBar now={(dept.taken / dept.total) * 100} style={{ height: 8 }} className="rounded-pill" />
                      </div>
                    ))}
                  </Card>

                  <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4">
                    <h5 className="fw-bold mb-3">Leave Approval Workflow</h5>
                    <div className="d-flex align-items-start flex-wrap gap-2 lm-workflow">
                      {APPROVAL_WORKFLOW.map((w, i) => (
                        <React.Fragment key={w.step}>
                          <div className="text-center" style={{ minWidth: 90 }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 fw-bold text-white"
                              style={{ width: 36, height: 36, background: "#1e3a5f", fontSize: 14 }}>
                              {w.step}
                            </div>
                            <div style={{ fontSize: 11, color: "#6c757d", lineHeight: 1.3 }}>{w.action}</div>
                          </div>
                          {i < APPROVAL_WORKFLOW.length - 1 && (
                            <div className="lm-workflow-arrow" style={{ marginTop: 17, color: "#ced4da", fontWeight: 700, fontSize: 18 }}>&rarr;</div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </Card>
                </Tab.Pane>

              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </Container>
    </div>
  );
};

// ============================================================
// Employee Leave Form
// ============================================================
const EmployeeLeaveForm = ({ salary, balanceList, onSubmitSuccess }) => {
  const [empName, setEmpName] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [leaveCode, setLeaveCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [totalDays, setTotalDays] = useState(0);
  const [lopDays, setLopDays] = useState(0);
  const [docFile, setDocFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);

  useEffect(() => {
    if (leaveCode && totalDays > 0) {
      const eligBal = getBalanceByCode(balanceList, leaveCode);
      setLopDays(calcLOPDays(totalDays, eligBal));
    } else { setLopDays(0); }
  }, [totalDays, leaveCode, balanceList]);

  const showDocField = leaveCode === "SL";
  const isDocRequired = leaveCode === "SL" && totalDays > 3;

  useEffect(() => { setDocFile(null); setUploadStatus(null); setLocalPreview(null); }, [leaveCode]);

  const sal = parseFloat(salary) || 0;
  const eligBal = getBalanceByCode(balanceList, leaveCode);
  const lopAmt = sal > 0 && lopDays > 0 ? calcLOPDeduction(sal, WORKING_DAYS, lopDays) : 0;
  const netSal = sal > 0 ? calcNetSalary(sal, lopAmt) : 0;
  const perDay = sal > 0 ? calcPerDay(sal, WORKING_DAYS).toFixed(2) : 0;

  const handleDateChange = (field, value) => {
    const from = field === "from" ? value : fromDate;
    const to = field === "to" ? value : toDate;
    if (field === "from") setFromDate(value); else setToDate(value);
    if (from && to) { const diff = Math.floor((new Date(to) - new Date(from)) / 86400000) + 1; setTotalDays(diff > 0 ? diff : 0); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocFile(file); setUploadStatus(null); setUploading(true); setError(null); setLocalPreview(null);
    const isImage = /\.(jpg|jpeg|png)$/i.test(file.name);
    if (isImage) { const reader = new FileReader(); reader.onload = (ev) => setLocalPreview(ev.target.result); reader.readAsDataURL(file); }
    try {
      const fd = new FormData(); fd.append("document", file);
      const res = await fetch(UPLOAD_API, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadStatus({ filename: data.filename, path: data.path, originalname: data.originalname });
    } catch (err) { setError("File upload failed: " + err.message); setDocFile(null); setLocalPreview(null); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    if (!empName.trim()) { setError("Employee name is required."); return; }
    if (isDocRequired && !uploadStatus) { alert("Please upload a medical certificate for Sick Leave exceeding 3 days."); return; }
    const leaveType = LEAVE_POLICY.find(p => p.code === leaveCode)?.name || leaveCode;
    const formData = {
      employee_name: empName.trim(), employee_code: empCode.trim() || "EMP001",
      department: department.trim() || "Engineering", designation: designation.trim() || "—",
      joining_date: joiningDate || "—", leave_code: leaveCode, leave_type: leaveType,
      from_date: fromDate, to_date: toDate, total_days: totalDays, reason: reason,
      lop_days: lopDays, doc_filename: uploadStatus?.filename || null,
      doc_path: uploadStatus?.path || null, doc_original_name: uploadStatus?.originalname || null,
      monthly_salary: sal, status: "Pending",
    };
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("leave_type", leaveType);
      fd.append("day_type", "Full Day");
      fd.append("start_date", fromDate);
      fd.append("end_date", toDate);
      fd.append("total_days", totalDays);
      fd.append("reason", reason);
      if (docFile) {
        fd.append("doc_url", docFile);
      }

      const res = await fetch(`${API_BASE}/leave/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to submit leave application");
      setSubmitted(true); onSubmitSuccess(formData);
      setTimeout(() => {
        setSubmitted(false); setEmpName(""); setEmpCode(""); setDepartment(""); setDesignation("");
        setJoiningDate(""); setLeaveCode(""); setFromDate(""); setToDate("");
        setReason(""); setTotalDays(0); setLopDays(0); setDocFile(null); setUploadStatus(null); setLocalPreview(null);
      }, 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <Card className="p-3 p-md-4 shadow-sm border-0 rounded-4 bg-white">
      <h5 className="mb-3 fw-bold" style={{ color: "#1e3a5f" }}>Apply for Leave</h5>

      <Alert variant="info" className="border-0 rounded-4 py-2 small mb-3">
        <strong>Current Balance:</strong>{" "}
        {balanceList.length === 0 ? "Loading..." : balanceList.map((b, i) => (
          <span key={`${b.employee_code}_${b.leave_code}`}>
            {b.leave_type}: <strong>{b.balance}</strong>d{i < balanceList.length - 1 ? " · " : ""}
          </span>
        ))}
      </Alert>

      {submitted && <Alert variant="success" className="border-0 rounded-4 small">✅ Leave application submitted successfully and saved to the database.</Alert>}
      {error && <Alert variant="danger" className="border-0 rounded-4 small">❌ Error: {error}</Alert>}

      {leaveCode && totalDays > 0 && (
        <Alert variant={lopDays > 0 ? "warning" : "success"} className="border-0 rounded-4 small">
          {lopDays > 0 ? (
            <>
              <strong>LOP Warning:</strong> Available Balance = {eligBal}d &nbsp;|&nbsp;
              Days Applied = {totalDays}d &nbsp;|&nbsp;
              LOP = {totalDays} – {eligBal} = <strong>{lopDays} Day(s)</strong>
              {sal > 0 && <> &nbsp;|&nbsp; Deduction: <strong>INR {lopAmt.toLocaleString("en-IN")}/-</strong> &nbsp;|&nbsp; Net Salary: <strong>INR {netSal.toLocaleString("en-IN")}/-</strong></>}
            </>
          ) : <>✅ Within available balance ({eligBal}d remaining) — Paid leave. No salary deduction.</>}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          <Col xs={12} md={6}>
            <Form.Label className="small fw-bold">Employee Name <span className="text-danger">*</span></Form.Label>
            <Form.Control value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full name" required className="rounded-3 bg-light border-0" />
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="small fw-bold">Employee Code</Form.Label>
            <Form.Control value={empCode} onChange={e => setEmpCode(e.target.value)} placeholder="e.g. EMP001" className="rounded-3 bg-light border-0" />
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="small fw-bold">Department</Form.Label>
            <Form.Select value={department} onChange={e => setDepartment(e.target.value)} className="rounded-3 bg-light border-0">
              <option value="">Select Department...</option>
              {["Engineering", "Marketing", "HR", "Finance", "Operations"].map(d => <option key={d}>{d}</option>)}
            </Form.Select>
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="small fw-bold">Designation</Form.Label>
            <Form.Control value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Software Developer" className="rounded-3 bg-light border-0" />
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="small fw-bold">Joining Date</Form.Label>
            <Form.Control type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className="rounded-3 bg-light border-0" />
          </Col>
          <Col xs={12} md={6}>
            <Form.Label className="small fw-bold">Leave Type <span className="text-danger">*</span></Form.Label>
            <Form.Select value={leaveCode} onChange={e => setLeaveCode(e.target.value)} required className="rounded-3 bg-light border-0 py-2">
              <option value="">Select Leave Type...</option>
              {LEAVE_POLICY.filter(p => p.gender === "All").map(t => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.code}){t.maxDays > 0 ? ` — max ${t.maxDays}d` : ""} | Balance: {getBalanceByCode(balanceList, t.code)}d
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={12} sm={5}>
            <Form.Label className="small fw-bold">From Date</Form.Label>
            <Form.Control type="date" value={fromDate} onChange={e => handleDateChange("from", e.target.value)} required className="rounded-3 bg-light border-0" />
          </Col>
          <Col xs={12} sm={5}>
            <Form.Label className="small fw-bold">To Date</Form.Label>
            <Form.Control type="date" value={toDate} onChange={e => handleDateChange("to", e.target.value)} required className="rounded-3 bg-light border-0" />
          </Col>
          <Col xs={12} sm={2}>
            <Form.Label className="small fw-bold">Days</Form.Label>
            <Form.Control readOnly value={totalDays} className="rounded-3 bg-light border-0 text-center fw-bold" style={{ color: "#1e3a5f" }} />
          </Col>
          <Col xs={12}>
            <Form.Label className="small fw-bold">Reason <span className="text-danger">*</span></Form.Label>
            <Form.Control as="textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Briefly explain the reason for leave..." required className="rounded-3 bg-light border-0" />
          </Col>

          {showDocField && isDocRequired && (
            <Col xs={12}>
              <div className="p-3 rounded-3" style={{ background: "#fff8e1", border: "1px solid #ffc107" }}>
                <Form.Label className="small fw-bold" style={{ color: "#b45309" }}>
                  Supporting Document / Medical Certificate
                  <span className="text-danger ms-1">* (Required — SL exceeds 3 days)</span>
                </Form.Label>
                <Form.Control type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange}
                  className="rounded-3 bg-white border-0 small mt-1" required={isDocRequired} />
                {uploading && (
                  <div className="mt-2 small text-primary d-flex align-items-center gap-2">
                    <Spinner animation="border" size="sm" /> Uploading file...
                  </div>
                )}
                {uploadStatus && !uploading && (
                  <div className="mt-2 p-2 rounded-2 small" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                    <strong style={{ color: "#15803d" }}>✅ File uploaded successfully</strong>
                    <div className="mt-2 d-flex align-items-center gap-3">
                      {localPreview ? <LocalImagePreview src={localPreview} name={uploadStatus.originalname} /> : <DocCell docPath={uploadStatus.path} />}
                      <span className="text-muted">{uploadStatus.originalname}</span>
                    </div>
                  </div>
                )}
                {uploading && localPreview && (
                  <div className="mt-2 d-flex align-items-center gap-3">
                    <img src={localPreview} alt="preview" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: "2px solid #93c5fd", opacity: 0.7 }} />
                    <span className="small text-muted">Uploading...</span>
                  </div>
                )}
                {!uploadStatus && !uploading && docFile === null && <small className="text-muted mt-1 d-block">PDF, JPG, JPEG, PNG — max 5MB</small>}
              </div>
            </Col>
          )}

          {leaveCode && totalDays > 0 && sal > 0 && (
            <Col xs={12}>
              <div className="p-3 rounded-3 small" style={{ background: lopDays > 0 ? "#fff3cd" : "#f0fdf4", border: `1px solid ${lopDays > 0 ? "#fcd34d" : "#86efac"}` }}>
                <strong>LOP Calculation Summary:</strong>
                <div className="mt-1">Eligible Balance: {eligBal}d &nbsp;|&nbsp; Days Applied: {totalDays}d &nbsp;|&nbsp; LOP Days: <strong>{lopDays}d</strong></div>
                <div className="mt-1">Per Day Salary: INR {perDay} &nbsp;|&nbsp; LOP Deduction: INR {lopAmt.toLocaleString("en-IN")} &nbsp;|&nbsp; Net Salary: <strong>INR {netSal.toLocaleString("en-IN")}/-</strong></div>
              </div>
            </Col>
          )}
        </Row>

        <Button type="submit" disabled={loading || uploading}
          className="w-100 mt-4 py-2 fw-bold rounded-pill shadow-sm"
          style={{ background: "#1e3a5f", border: "none" }}>
          {loading ? "Submitting..." : uploading ? "Uploading file..." : "Submit Application"}
        </Button>
      </Form>
    </Card>
  );
};

export default LeavesPage;