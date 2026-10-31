import React, { useState, useEffect, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Spinner,
  Form,
  Modal,
  Alert
} from "react-bootstrap";
import toast from "react-hot-toast";
import {
  LuReceipt,
  LuFileText,
  LuFileCheck,
  LuDownload,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuFilter,
  LuCalendar,
  LuUserCheck,
  LuBuilding2,
  LuIndianRupee,
  LuShieldCheck,
  LuClock,
  LuCircleAlert,
  LuTrash2,
  LuEye,
  LuBriefcase,
  LuSend
} from "react-icons/lu";
import { getApiBaseUrl } from "../../../api/axios";
import {
  formatINR,
  amountInWords,
  formatDateStr,
  generateRelievingLetterPDF,
  generateExperienceCertificatePDF,
  generateFnfSettlementSlipPDF
} from "../../../utils/exitLetterGenerators";

const API = getApiBaseUrl();

export default function FnfSettlementDesk({ token, isEmployeeOnly = false }) {
  // Data States
  const [settlements, setSettlements] = useState([]);
  const [eligibleResignations, setEligibleResignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Employee Self-Service State
  const [mySettlement, setMySettlement] = useState(null);
  const [myLoading, setMyLoading] = useState(false);

  // Modal: Create / Edit Settlement
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedResignationId, setSelectedResignationId] = useState("");

  // Settlement Form State
  const [form, setForm] = useState({
    id: null,
    resignation_id: null,
    employee_id: "",
    employee_name: "",
    dept: "General",
    designation: "Staff",
    joining_date: "",
    resignation_date: "",
    last_working_date: "",
    settlement_date: new Date().toISOString().split("T")[0],
    status: "Draft",
    monthly_gross: 50000,
    monthly_basic: 25000,
    per_day_rate: 1923.08,
    notice_period_days: 30,
    notice_served_days: 30,
    notice_shortfall_days: 0,
    notice_waiver_granted: false,
    notice_recovery_amount: 0,
    unpaid_salary_days: 0,
    unpaid_salary_amount: 0,
    leave_encashment_days: 0,
    leave_encashment_rate: 961.54,
    leave_encashment_amount: 0,
    gratuity_eligible: false,
    tenure_years: 0,
    gratuity_amount: 0,
    bonus_incentive_amount: 0,
    reimbursement_amount: 0,
    other_earnings: 0,
    other_earnings_remarks: "",
    total_earnings: 0,
    loan_outstanding_recovery: 0,
    advance_salary_recovery: 0,
    asset_damage_recovery: 0,
    statutory_pf: 1800,
    statutory_esi: 0,
    statutory_pt: 200,
    tax_tds_deduction: 0,
    other_deductions: 0,
    other_deductions_remarks: "",
    total_deductions: 2000,
    net_payable_amount: 0,
    settlement_type: "PAYABLE_TO_EMPLOYEE",
    payment_status: "Pending",
    payment_mode: "Bank Transfer",
    bank_name: "State Bank of India",
    bank_account_no: "",
    ifsc_code: "",
    remarks: "Automated F&F settlement calculated per statutory norms.",
    conduct_remarks: "Exemplary"
  });

  // Modal: Disburse Payment
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disburseForm, setDisburseForm] = useState({
    id: null,
    employee_name: "",
    net_payable_amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "Bank Transfer",
    payment_reference: "",
    remarks: "Full & final settlement credited to employee registered account."
  });
  const [disbursing, setDisbursing] = useState(false);

  // Fetch all settlements (for HR)
  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/fnf?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSettlements(data.data);
      }
    } catch (err) {
      console.error("Fetch settlements error:", err);
      toast.error("Failed to load F&F settlements");
    } finally {
      setLoading(false);
    }
  };

  // Fetch eligible resignations (for HR new settlement dropdown)
  const fetchEligibleResignations = async () => {
    try {
      const res = await fetch(`${API}/fnf/eligible-resignations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEligibleResignations(data.data);
      }
    } catch (err) {
      console.error("Fetch eligible resignations error:", err);
    }
  };

  // Fetch my settlement (for employee self-service)
  const fetchMySettlement = async () => {
    setMyLoading(true);
    try {
      const res = await fetch(`${API}/fnf/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMySettlement(data.data);
      }
    } catch (err) {
      console.error("Fetch my settlement error:", err);
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    if (isEmployeeOnly) {
      fetchMySettlement();
    } else {
      fetchSettlements();
      fetchEligibleResignations();
      fetchMySettlement();
    }
  }, [token, statusFilter, isEmployeeOnly]);

  // Handle Resignation Selection in Create Modal -> Auto Fetch Preview
  const handleSelectResignation = async (rId) => {
    setSelectedResignationId(rId);
    if (!rId) return;

    setPreviewLoading(true);
    try {
      const res = await fetch(`${API}/fnf/preview/${rId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setForm(data.preview);
      } else {
        toast.error(data.error || "Failed to calculate preview");
      }
    } catch (err) {
      console.error("Fetch preview error:", err);
      toast.error("Error generating settlement preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto Recalculate Totals on form input changes
  const recalculateForm = (updatedFields) => {
    const updated = { ...form, ...updatedFields };

    const monthlyGross = parseFloat(updated.monthly_gross || 0);
    const monthlyBasic = parseFloat(updated.monthly_basic || monthlyGross * 0.5);
    const perDayRate = parseFloat(updated.per_day_rate || (monthlyGross > 0 ? monthlyGross / 26 : 0));
    const basicPerDayRate = parseFloat(updated.leave_encashment_rate || (monthlyBasic > 0 ? monthlyBasic / 26 : 0));

    // Notice Recovery
    const shortfall = parseInt(updated.notice_shortfall_days || 0, 10);
    const noticeRecovery = updated.notice_waiver_granted ? 0 : parseFloat((shortfall * perDayRate).toFixed(2));

    // Unpaid salary
    const unpaidDays = parseFloat(updated.unpaid_salary_days || 0);
    const unpaidSalary = parseFloat((unpaidDays * perDayRate).toFixed(2));

    // Leave encashment
    const encashDays = parseFloat(updated.leave_encashment_days || 0);
    const encashAmount = parseFloat((encashDays * basicPerDayRate).toFixed(2));

    // Gratuity
    let gratuity = parseFloat(updated.gratuity_amount || 0);
    if (updated.gratuity_eligible && gratuity === 0) {
      gratuity = parseFloat(((15 * monthlyBasic * Math.round(parseFloat(updated.tenure_years || 0))) / 26).toFixed(2));
    }

    const bonus = parseFloat(updated.bonus_incentive_amount || 0);
    const reimbursement = parseFloat(updated.reimbursement_amount || 0);
    const otherEarn = parseFloat(updated.other_earnings || 0);

    const totalEarn = parseFloat((unpaidSalary + encashAmount + gratuity + bonus + reimbursement + otherEarn).toFixed(2));

    // Deductions
    const loanRec = parseFloat(updated.loan_outstanding_recovery || 0);
    const advRec = parseFloat(updated.advance_salary_recovery || 0);
    const assetDmg = parseFloat(updated.asset_damage_recovery || 0);
    const pf = parseFloat(updated.statutory_pf || 0);
    const esi = parseFloat(updated.statutory_esi || 0);
    const pt = parseFloat(updated.statutory_pt || 0);
    const tds = parseFloat(updated.tax_tds_deduction || 0);
    const otherDed = parseFloat(updated.other_deductions || 0);

    const totalDed = parseFloat((noticeRecovery + loanRec + advRec + assetDmg + pf + esi + pt + tds + otherDed).toFixed(2));
    const netPay = parseFloat((totalEarn - totalDed).toFixed(2));
    const setType = netPay >= 0 ? "PAYABLE_TO_EMPLOYEE" : "RECOVERABLE_FROM_EMPLOYEE";

    setForm({
      ...updated,
      monthly_gross: monthlyGross,
      monthly_basic: monthlyBasic,
      per_day_rate: perDayRate,
      leave_encashment_rate: basicPerDayRate,
      notice_recovery_amount: noticeRecovery,
      unpaid_salary_amount: unpaidSalary,
      leave_encashment_amount: encashAmount,
      gratuity_amount: gratuity,
      total_earnings: totalEarn,
      total_deductions: totalDed,
      net_payable_amount: netPay,
      settlement_type: setType
    });
  };

  // Open modal for new settlement
  const handleOpenNewModal = () => {
    setSelectedResignationId("");
    setForm({
      id: null,
      resignation_id: null,
      employee_id: "",
      employee_name: "",
      dept: "General",
      designation: "Staff",
      joining_date: "",
      resignation_date: "",
      last_working_date: "",
      settlement_date: new Date().toISOString().split("T")[0],
      status: "Draft",
      monthly_gross: 50000,
      monthly_basic: 25000,
      per_day_rate: 1923.08,
      notice_period_days: 30,
      notice_served_days: 30,
      notice_shortfall_days: 0,
      notice_waiver_granted: false,
      notice_recovery_amount: 0,
      unpaid_salary_days: 0,
      unpaid_salary_amount: 0,
      leave_encashment_days: 0,
      leave_encashment_rate: 961.54,
      leave_encashment_amount: 0,
      gratuity_eligible: false,
      tenure_years: 0,
      gratuity_amount: 0,
      bonus_incentive_amount: 0,
      reimbursement_amount: 0,
      other_earnings: 0,
      other_earnings_remarks: "",
      total_earnings: 0,
      loan_outstanding_recovery: 0,
      advance_salary_recovery: 0,
      asset_damage_recovery: 0,
      statutory_pf: 1800,
      statutory_esi: 0,
      statutory_pt: 200,
      tax_tds_deduction: 0,
      other_deductions: 0,
      other_deductions_remarks: "",
      total_deductions: 2000,
      net_payable_amount: 0,
      settlement_type: "PAYABLE_TO_EMPLOYEE",
      payment_status: "Pending",
      payment_mode: "Bank Transfer",
      bank_name: "State Bank of India",
      bank_account_no: "",
      ifsc_code: "",
      remarks: "Automated F&F settlement calculated per statutory norms.",
      conduct_remarks: "Exemplary"
    });
    setShowModal(true);
  };

  // Open modal to view / edit existing settlement
  const handleOpenEditModal = (settlement) => {
    setSelectedResignationId(settlement.resignation_id || "");
    setForm({ ...settlement });
    setShowModal(true);
  };

  // Submit Save Settlement (Draft or Approved)
  const handleSaveSettlement = async (statusToSave = "Draft") => {
    if (!form.employee_id) {
      toast.error("Please select an employee / resignation");
      return;
    }
    if (!form.last_working_date) {
      toast.error("Last working date is required");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, status: statusToSave };
      const res = await fetch(`${API}/fnf/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`F&F Settlement saved as ${statusToSave}`);
        setShowModal(false);
        fetchSettlements();
        fetchEligibleResignations();
      } else {
        toast.error(data.error || "Failed to save settlement");
      }
    } catch (err) {
      console.error("Save settlement error:", err);
      toast.error("Error saving settlement");
    } finally {
      setSaving(false);
    }
  };

  // Finalize Settlement (Marks as Finalized and auto-generates official letter references)
  const handleFinalizeSettlement = async (id) => {
    if (!window.confirm("Are you sure you want to finalize this F&F settlement? This will lock the calculation and generate official Relieving & Experience letter references.")) {
      return;
    }

    try {
      const res = await fetch(`${API}/fnf/${id}/finalize`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "F&F Settlement finalized successfully!");
        fetchSettlements();
        if (showModal) setShowModal(false);
      } else {
        toast.error(data.error || "Finalize failed");
      }
    } catch (err) {
      console.error("Finalize error:", err);
      toast.error("Error finalizing settlement");
    }
  };

  // Open Disburse Modal
  const handleOpenDisburse = (settlement) => {
    setDisburseForm({
      id: settlement.id,
      employee_name: settlement.employee_name,
      net_payable_amount: settlement.net_payable_amount,
      payment_date: new Date().toISOString().split("T")[0],
      payment_mode: "Bank Transfer",
      payment_reference: `PAY-FNF-${settlement.id}`,
      remarks: "Full & Final Settlement disbursement completed via net banking."
    });
    setShowDisburseModal(true);
  };

  // Submit Disbursement
  const handleSubmitDisburse = async (e) => {
    e.preventDefault();
    setDisbursing(true);
    try {
      const res = await fetch(`${API}/fnf/${disburseForm.id}/disburse`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(disburseForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Settlement marked as Disbursed / Paid!");
        setShowDisburseModal(false);
        fetchSettlements();
      } else {
        toast.error(data.error || "Disbursement update failed");
      }
    } catch (err) {
      console.error("Disburse error:", err);
      toast.error("Error updating disbursement");
    } finally {
      setDisbursing(false);
    }
  };

  // Delete Draft Settlement
  const handleDeleteDraft = async (id) => {
    if (!window.confirm("Are you sure you want to delete this draft settlement?")) return;
    try {
      const res = await fetch(`${API}/fnf/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Draft settlement removed");
        fetchSettlements();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error deleting settlement");
    }
  };

  // Filtered settlements list for HR table
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.employee_name && s.employee_name.toLowerCase().includes(q)) ||
        (s.employee_id && s.employee_id.toLowerCase().includes(q)) ||
        (s.dept && s.dept.toLowerCase().includes(q));

      const matchStatus = statusFilter === "All" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [settlements, searchQuery, statusFilter]);

  // Summary Metrics
  const totalSettledCount = settlements.length;
  const finalizedCount = settlements.filter((s) => s.status === "Finalized" || s.status === "Paid").length;
  const totalDisbursedAmt = settlements
    .filter((s) => s.payment_status === "Paid")
    .reduce((sum, s) => sum + Math.max(0, parseFloat(s.net_payable_amount || 0)), 0);

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════ */}
      {/* 1. EMPLOYEE SELF-SERVICE VIEW (IF EMPLOYEE IS SEPARATED) */}
      {/* ════════════════════════════════════════════════════════ */}
      {isEmployeeOnly && !mySettlement && !loading && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <LuReceipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Full &amp; Final (F&amp;F) Settlement Desk</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            No finalized exit settlement statement has been published for your account yet. Once your separation clearance is completed by HR and Accounts, your Full &amp; Final statement, Relieving Letter, and Experience Certificate will be available for download here.
          </p>
        </div>
      )}

      {mySettlement && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 mb-2">
                <LuFileCheck className="w-4 h-4" /> Official Separation &amp; F&amp;F Settlement Record
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white m-0">
                Your Full &amp; Final Exit Settlement
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                Your official exit account statement and corporate relieving documentation have been prepared. You can inspect your settlement breakdown and download authenticated PDF letters below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="light"
                size="sm"
                onClick={() => generateRelievingLetterPDF(mySettlement)}
                className="font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <LuDownload className="w-3.5 h-3.5 text-indigo-600" /> Relieving Letter (PDF)
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={() => generateExperienceCertificatePDF(mySettlement)}
                className="font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <LuDownload className="w-3.5 h-3.5 text-emerald-600" /> Experience Certificate (PDF)
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 shadow-xs flex items-center gap-1.5"
                size="sm"
                onClick={() => generateFnfSettlementSlipPDF(mySettlement)}
              >
                <LuDownload className="w-3.5 h-3.5" /> F&amp;F Statement Slip (PDF)
              </Button>
            </div>
          </div>

          <Row className="g-3 pt-3 border-t border-indigo-800/60">
            <Col xs={6} md={3}>
              <div className="text-[11px] text-indigo-300 font-semibold">Net Settlement Amount</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {formatINR(mySettlement.net_payable_amount)}
              </div>
              <div className="text-[10px] text-indigo-200">{mySettlement.settlement_type?.replace(/_/g, " ")}</div>
            </Col>

            <Col xs={6} md={3}>
              <div className="text-[11px] text-indigo-300 font-semibold">Last Working Date</div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatDateStr(mySettlement.last_working_date)}
              </div>
              <div className="text-[10px] text-indigo-200">Joined: {formatDateStr(mySettlement.joining_date)}</div>
            </Col>

            <Col xs={6} md={3}>
              <div className="text-[11px] text-indigo-300 font-semibold">Leave Encashment</div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatINR(mySettlement.leave_encashment_amount)}
              </div>
              <div className="text-[10px] text-indigo-200">{mySettlement.leave_encashment_days} EL/PL Days Encashed</div>
            </Col>

            <Col xs={6} md={3}>
              <div className="text-[11px] text-indigo-300 font-semibold">Payment Status</div>
              <div className="mt-1">
                <span className={`px-2.5 py-1 text-xs font-black rounded-full ${
                  mySettlement.payment_status === "Paid"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                }`}>
                  {mySettlement.payment_status}
                </span>
              </div>
              {mySettlement.payment_date && (
                <div className="text-[10px] text-indigo-200 mt-1">Paid on: {formatDateStr(mySettlement.payment_date)}</div>
              )}
            </Col>
          </Row>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* 2. HR MANAGEMENT DESK                                  */}
      {/* ════════════════════════════════════════════════════════ */}
      {!isEmployeeOnly && (
        <>
          {/* Header Action Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-1">
                <LuReceipt className="w-3.5 h-3.5" /> Payroll Exit Clearance &amp; Statutory Settlement
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 m-0">
                Full &amp; Final (F&amp;F) Settlement &amp; Exit Letters
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Automated calculation of final month unpaid salary, unutilized Earned/Privilege leave encashment, statutory gratuity, notice period shortfall recovery/waivers, and instant generation of Relieving and Experience letters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="light"
                onClick={fetchSettlements}
                className="text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5"
              >
                <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
              </Button>
              <Button
                onClick={handleOpenNewModal}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border-0 shadow-sm flex items-center gap-1.5"
              >
                <LuPlus className="w-4 h-4" /> Calculate New Settlement
              </Button>
            </div>
          </div>

          {/* Metric Cards */}
          <Row className="g-3">
            <Col xs={6} md={3}>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 font-semibold">Total Settlements</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalSettledCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Recorded in System</div>
              </div>
            </Col>

            <Col xs={6} md={3}>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs text-indigo-600 font-semibold">Finalized / Certified</div>
                <div className="text-2xl font-black text-indigo-900 mt-1">{finalizedCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Letters Issued</div>
              </div>
            </Col>

            <Col xs={6} md={3}>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs text-emerald-600 font-semibold">Total Disbursed</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{formatINR(totalDisbursedAmt)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Paid Out to Exited Staff</div>
              </div>
            </Col>

            <Col xs={6} md={3}>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs text-amber-600 font-semibold">Eligible Resignations</div>
                <div className="text-2xl font-black text-amber-800 mt-1">{eligibleResignations.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pending Exit Settlement</div>
              </div>
            </Col>
          </Row>

          {/* Table Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, ID or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-xl py-1.5"
                style={{ width: "150px" }}
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Finalized">Finalized</option>
                <option value="Paid">Paid</option>
              </Form.Select>
            </div>
          </div>

          {/* Settlements Master Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table hover responsive className="mb-0 align-middle">
                <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Exit Dates</th>
                    <th className="py-3 px-3 text-center">Gross Pay</th>
                    <th className="py-3 px-3 text-center">Leave Encashment</th>
                    <th className="py-3 px-3 text-center">Gratuity</th>
                    <th className="py-3 px-3 text-center">Deductions</th>
                    <th className="py-3 px-3 text-center">Net Settlement</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-end">Letters &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                        Loading F&amp;F settlements...
                      </td>
                    </tr>
                  ) : filteredSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <LuCircleAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <div className="font-bold text-slate-600">No F&amp;F Settlement Records Found</div>
                        <div className="text-xs mt-1">Click &quot;Calculate New Settlement&quot; to initiate a full &amp; final exit statement.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredSettlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{s.employee_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {s.employee_id} • {s.dept}
                          </div>
                          <div className="text-[10px] text-slate-400">{s.designation}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-[11px] font-semibold text-slate-800">
                            LWD: {formatDateStr(s.last_working_date)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Joined: {formatDateStr(s.joining_date)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Tenure: {s.tenure_years || "—"} Yrs
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-slate-800">{formatINR(s.monthly_gross)}</div>
                          <div className="text-[10px] text-slate-400">{formatINR(s.per_day_rate)}/d</div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-purple-700">{formatINR(s.leave_encashment_amount)}</div>
                          <div className="text-[10px] text-slate-500">{s.leave_encashment_days} EL/PL Days</div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-indigo-700">{formatINR(s.gratuity_amount)}</div>
                          <div className="text-[10px] text-slate-400">
                            {s.gratuity_eligible ? "Eligible (5+ Yrs)" : "Not Eligible"}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-rose-700">-{formatINR(s.total_deductions)}</div>
                          <div className="text-[10px] text-slate-400">
                            Notice: {s.notice_waiver_granted ? "Waived" : formatINR(s.notice_recovery_amount)}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xl inline-block shadow-2xs">
                            {formatINR(s.net_payable_amount)}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                            {s.settlement_type === "PAYABLE_TO_EMPLOYEE" ? "Payable" : "Recoverable"}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                            s.status === "Paid"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : s.status === "Finalized"
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : s.status === "Approved"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {s.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-end">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {/* Letters PDF Dropdown or direct buttons */}
                            {(s.status === "Finalized" || s.status === "Paid") && (
                              <>
                                <button
                                  onClick={() => generateRelievingLetterPDF(s)}
                                  className="p-1.5 text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                                  title="Download Relieving Letter (PDF)"
                                >
                                  <LuFileText className="w-4 h-4 text-indigo-600" />
                                </button>
                                <button
                                  onClick={() => generateExperienceCertificatePDF(s)}
                                  className="p-1.5 text-slate-700 hover:text-emerald-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                                  title="Download Experience Certificate (PDF)"
                                >
                                  <LuFileCheck className="w-4 h-4 text-emerald-600" />
                                </button>
                                <button
                                  onClick={() => generateFnfSettlementSlipPDF(s)}
                                  className="p-1.5 text-slate-700 hover:text-purple-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                                  title="Download Full & Final Settlement Slip (PDF)"
                                >
                                  <LuReceipt className="w-4 h-4 text-purple-600" />
                                </button>
                              </>
                            )}

                            {/* View / Edit */}
                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className="px-2 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                              title="Inspect & Adjust Settlement"
                            >
                              Edit / Review
                            </button>

                            {/* Disburse */}
                            {s.status === "Finalized" && s.payment_status !== "Paid" && (
                              <button
                                onClick={() => handleOpenDisburse(s)}
                                className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                title="Mark Payment as Disbursed"
                              >
                                Disburse
                              </button>
                            )}

                            {/* Delete Draft */}
                            {s.status === "Draft" && (
                              <button
                                onClick={() => handleDeleteDraft(s.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Draft"
                              >
                                <LuTrash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* 3. MODAL: CREATE / REVIEW / EDIT F&F SETTLEMENT          */}
      {/* ════════════════════════════════════════════════════════ */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
            <LuReceipt className="text-indigo-600 w-5 h-5" />
            <span>Full &amp; Final (F&amp;F) Exit Settlement Calculator</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 max-h-[82vh] overflow-y-auto">
          {/* Select Resignation from Eligible List */}
          {!form.id && (
            <div className="mb-4 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200">
              <Form.Label className="text-xs font-bold text-indigo-950 mb-1">
                Select Approved Resignation / Exited Employee
              </Form.Label>
              <Form.Select
                value={selectedResignationId}
                onChange={(e) => handleSelectResignation(e.target.value)}
                className="text-xs rounded-xl"
              >
                <option value="">-- Choose Approved Resignation to Calculate F&amp;F --</option>
                {eligibleResignations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.employee_id}) — {r.dept} (LWD: {formatDateStr(r.last_working_date)}) {r.has_fnf ? `[${r.fnf_status}]` : "[Pending F&F]"}
                  </option>
                ))}
              </Form.Select>
              <div className="text-[11px] text-indigo-700 mt-1">
                ℹ️ Selecting an employee automatically retrieves their master salary, unutilized leave allocation (EL/PL balance), tenure, and notice period shortfall.
              </div>
            </div>
          )}

          {previewLoading ? (
            <div className="py-12 text-center text-slate-500">
              <Spinner animation="border" variant="primary" className="mb-2" />
              <div className="text-xs font-bold">Computing live settlement preview &amp; statutory entitlements...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Employee Summary Strip */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Name</span>
                  <span className="font-extrabold text-slate-900">{form.employee_name || "—"}</span>
                  <span className="text-slate-500 text-[10px] block font-mono">{form.employee_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dept &amp; Designation</span>
                  <span className="font-bold text-slate-800">{form.dept || "General"}</span>
                  <span className="text-slate-500 text-[10px] block">{form.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dates (Joining → LWD)</span>
                  <span className="font-bold text-slate-800">{formatDateStr(form.joining_date)} → {formatDateStr(form.last_working_date)}</span>
                  <span className="text-indigo-600 font-bold text-[10px] block">Tenure: {form.tenure_years} Years</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Salary Baseline</span>
                  <span className="font-extrabold text-slate-900">Gross: {formatINR(form.monthly_gross)}</span>
                  <span className="text-slate-500 text-[10px] block">Daily Rate: {formatINR(form.per_day_rate)}</span>
                </div>
              </div>

              {/* Notice Period & Waiver Section */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <LuClock className="w-4 h-4 text-amber-600" /> Notice Period &amp; Shortfall Recovery
                  </span>
                  <Form.Check
                    type="switch"
                    id="waiverSwitch"
                    label="Waive Notice Period Shortfall (Management Discretion)"
                    checked={form.notice_waiver_granted}
                    onChange={(e) => recalculateForm({ notice_waiver_granted: e.target.checked })}
                    className="font-bold text-amber-900 cursor-pointer text-xs"
                  />
                </div>
                <Row className="g-2">
                  <Col xs={4}>
                    <Form.Label className="text-[10px] text-slate-600 font-bold">Required Days</Form.Label>
                    <Form.Control
                      type="number"
                      size="sm"
                      value={form.notice_period_days}
                      onChange={(e) => recalculateForm({ notice_period_days: parseInt(e.target.value) || 0 })}
                      className="text-xs rounded-lg"
                    />
                  </Col>
                  <Col xs={4}>
                    <Form.Label className="text-[10px] text-slate-600 font-bold">Days Served</Form.Label>
                    <Form.Control
                      type="number"
                      size="sm"
                      value={form.notice_served_days}
                      onChange={(e) => {
                        const s = parseInt(e.target.value) || 0;
                        const req = form.notice_period_days || 30;
                        recalculateForm({ notice_served_days: s, notice_shortfall_days: Math.max(0, req - s) });
                      }}
                      className="text-xs rounded-lg"
                    />
                  </Col>
                  <Col xs={4}>
                    <Form.Label className="text-[10px] text-slate-600 font-bold">Shortfall Recovery Amount</Form.Label>
                    <div className="font-extrabold text-rose-700 pt-1">
                      {form.notice_waiver_granted ? "₹0.00 (WAIVED)" : formatINR(form.notice_recovery_amount)}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 2-Column Earnings & Deductions Grid */}
              <Row className="g-3">
                {/* Column A: Earnings & Entitlements */}
                <Col md={6}>
                  <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        A. Earnings &amp; Entitlements
                      </span>
                      <span className="text-xs font-black text-emerald-800">
                        Total: {formatINR(form.total_earnings)}
                      </span>
                    </div>

                    {/* Unpaid salary */}
                    <div>
                      <Row className="g-2 items-center">
                        <Col xs={7}>
                          <Form.Label className="text-[11px] font-bold text-slate-700 m-0">
                            Worked Days in Exit Month (Unpaid)
                          </Form.Label>
                          <div className="text-[10px] text-slate-400">Prorated @ {formatINR(form.per_day_rate)}/day</div>
                        </Col>
                        <Col xs={5}>
                          <Form.Control
                            type="number"
                            step="0.5"
                            size="sm"
                            value={form.unpaid_salary_days}
                            onChange={(e) => recalculateForm({ unpaid_salary_days: e.target.value })}
                            className="text-xs rounded-lg font-bold"
                          />
                        </Col>
                      </Row>
                      <div className="text-end text-[11px] font-extrabold text-emerald-800 mt-1">
                        Amount: {formatINR(form.unpaid_salary_amount)}
                      </div>
                    </div>

                    {/* Leave Encashment */}
                    <div className="pt-2 border-t border-emerald-100">
                      <Row className="g-2 items-center">
                        <Col xs={7}>
                          <Form.Label className="text-[11px] font-bold text-slate-700 m-0">
                            EL &amp; PL Encashment Days
                          </Form.Label>
                          <div className="text-[10px] text-slate-400">Basic Rate: {formatINR(form.leave_encashment_rate)}/day</div>
                        </Col>
                        <Col xs={5}>
                          <Form.Control
                            type="number"
                            step="0.5"
                            size="sm"
                            value={form.leave_encashment_days}
                            onChange={(e) => recalculateForm({ leave_encashment_days: e.target.value })}
                            className="text-xs rounded-lg font-bold"
                          />
                        </Col>
                      </Row>
                      <div className="text-end text-[11px] font-extrabold text-emerald-800 mt-1">
                        Amount: {formatINR(form.leave_encashment_amount)}
                      </div>
                    </div>

                    {/* Statutory Gratuity */}
                    <div className="pt-2 border-t border-emerald-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">Statutory Gratuity Settlement</span>
                        <Form.Check
                          type="checkbox"
                          id="gratuityCheck"
                          label="Eligible (5+ Yrs)"
                          checked={form.gratuity_eligible}
                          onChange={(e) => recalculateForm({ gratuity_eligible: e.target.checked })}
                          className="text-[10px] font-bold text-slate-600 cursor-pointer"
                        />
                      </div>
                      <Form.Control
                        type="number"
                        step="1"
                        size="sm"
                        value={form.gratuity_amount}
                        onChange={(e) => recalculateForm({ gratuity_amount: parseFloat(e.target.value) || 0 })}
                        className="text-xs rounded-lg font-bold"
                        disabled={!form.gratuity_eligible}
                      />
                    </div>

                    {/* Bonus & Reimbursements */}
                    <div className="pt-2 border-t border-emerald-100">
                      <Row className="g-2">
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Performance Bonus</Form.Label>
                          <Form.Control
                            type="number"
                            step="100"
                            size="sm"
                            value={form.bonus_incentive_amount}
                            onChange={(e) => recalculateForm({ bonus_incentive_amount: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Reimbursements</Form.Label>
                          <Form.Control
                            type="number"
                            step="100"
                            size="sm"
                            value={form.reimbursement_amount}
                            onChange={(e) => recalculateForm({ reimbursement_amount: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Other additions */}
                    <div className="pt-2 border-t border-emerald-100">
                      <Row className="g-2">
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Other Additions</Form.Label>
                          <Form.Control
                            type="number"
                            step="100"
                            size="sm"
                            value={form.other_earnings}
                            onChange={(e) => recalculateForm({ other_earnings: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Addition Remarks</Form.Label>
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="e.g. Special Allowance"
                            value={form.other_earnings_remarks}
                            onChange={(e) => setForm({ ...form, other_earnings_remarks: e.target.value })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Col>

                {/* Column B: Deductions & Recoveries */}
                <Col md={6}>
                  <div className="border border-rose-200 bg-rose-50/30 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                      <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                        B. Deductions &amp; Recoveries
                      </span>
                      <span className="text-xs font-black text-rose-800">
                        Total: {formatINR(form.total_deductions)}
                      </span>
                    </div>

                    {/* Notice Recovery Summary */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Notice Shortfall Deduction</span>
                        <span className="text-rose-700 font-extrabold">{formatINR(form.notice_recovery_amount)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {form.notice_waiver_granted ? "Waived by Management" : `${form.notice_shortfall_days} days shortfall @ ${formatINR(form.per_day_rate)}`}
                      </div>
                    </div>

                    {/* Loan & Advance Recovery */}
                    <div className="pt-2 border-t border-rose-100">
                      <Row className="g-2">
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Outstanding Loan</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.loan_outstanding_recovery}
                            onChange={(e) => recalculateForm({ loan_outstanding_recovery: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Advance Salary</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.advance_salary_recovery}
                            onChange={(e) => recalculateForm({ advance_salary_recovery: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Asset Damage */}
                    <div className="pt-2 border-t border-rose-100">
                      <Form.Label className="text-[10px] font-bold text-slate-600">
                        Asset Damage / Unreturned Equipment Recovery
                      </Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        value={form.asset_damage_recovery}
                        onChange={(e) => recalculateForm({ asset_damage_recovery: parseFloat(e.target.value) || 0 })}
                        className="text-xs rounded-lg"
                      />
                    </div>

                    {/* Statutory PF, ESI, PT, TDS */}
                    <div className="pt-2 border-t border-rose-100">
                      <div className="text-[10px] font-extrabold text-slate-600 uppercase mb-1">Statutory Deductions</div>
                      <Row className="g-2">
                        <Col xs={3}>
                          <Form.Label className="text-[9px] font-bold text-slate-500">PF</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.statutory_pf}
                            onChange={(e) => recalculateForm({ statutory_pf: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={3}>
                          <Form.Label className="text-[9px] font-bold text-slate-500">ESI</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.statutory_esi}
                            onChange={(e) => recalculateForm({ statutory_esi: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={3}>
                          <Form.Label className="text-[9px] font-bold text-slate-500">PT</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.statutory_pt}
                            onChange={(e) => recalculateForm({ statutory_pt: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={3}>
                          <Form.Label className="text-[9px] font-bold text-slate-500">TDS</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.tax_tds_deduction}
                            onChange={(e) => recalculateForm({ tax_tds_deduction: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Other deductions */}
                    <div className="pt-2 border-t border-rose-100">
                      <Row className="g-2">
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Other Deductions</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            value={form.other_deductions}
                            onChange={(e) => recalculateForm({ other_deductions: parseFloat(e.target.value) || 0 })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="text-[10px] font-bold text-slate-600">Deduction Reason</Form.Label>
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="e.g. Penalty"
                            value={form.other_deductions_remarks}
                            onChange={(e) => setForm({ ...form, other_deductions_remarks: e.target.value })}
                            className="text-xs rounded-lg"
                          />
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Net Settlement Banner */}
              <div className={`p-4 rounded-2xl border ${
                form.net_payable_amount >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"
              } flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    {form.net_payable_amount >= 0 ? "Net Settlement Payable To Employee" : "Net Recoverable From Employee"}
                  </div>
                  <div className="text-xs text-slate-500 italic mt-0.5">
                    {amountInWords(form.net_payable_amount)}
                  </div>
                </div>

                <div className={`text-2xl font-black ${form.net_payable_amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatINR(form.net_payable_amount)}
                </div>
              </div>

              {/* Bank & Conduct Remarks */}
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label className="text-xs font-bold text-slate-700">Bank Name</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="text-xs font-bold text-slate-700">Bank Account No.</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={form.bank_account_no}
                    onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                    className="text-xs rounded-xl font-mono"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="text-xs font-bold text-slate-700">IFSC Code</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={form.ifsc_code}
                    onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
                    className="text-xs rounded-xl font-mono"
                  />
                </Col>
              </Row>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="text-xs font-bold text-slate-700">Conduct Remarks (For Experience Certificate)</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.conduct_remarks}
                    onChange={(e) => setForm({ ...form, conduct_remarks: e.target.value })}
                    className="text-xs rounded-xl"
                  >
                    <option value="Exemplary">Exemplary — Highly Recommended</option>
                    <option value="Commendable">Commendable — Good Performance</option>
                    <option value="Satisfactory">Satisfactory — Standard Exit</option>
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label className="text-xs font-bold text-slate-700">Settlement Remarks</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setShowModal(false)} className="text-xs font-bold rounded-xl">
            Cancel
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => handleSaveSettlement("Draft")}
            disabled={saving}
            className="text-xs font-bold rounded-xl"
          >
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={() => handleSaveSettlement("Approved")}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl border-0"
          >
            {saving ? "Processing..." : "Approve Settlement"}
          </Button>
          {form.id && form.status !== "Finalized" && form.status !== "Paid" && (
            <Button
              variant="success"
              onClick={() => handleFinalizeSettlement(form.id)}
              className="text-xs font-bold rounded-xl"
            >
              Finalize &amp; Issue Letters
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* ════════════════════════════════════════════════════════ */}
      {/* 4. MODAL: DISBURSE SETTLEMENT                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <Modal show={showDisburseModal} onHide={() => setShowDisburseModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-base font-black text-slate-900 flex items-center gap-2">
            <LuIndianRupee className="text-emerald-600 w-5 h-5" /> Disburse Settlement Payment
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitDisburse}>
          <Modal.Body className="space-y-3 pt-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
              <div className="text-slate-500">Employee: <strong>{disburseForm.employee_name}</strong></div>
              <div className="text-emerald-800 font-extrabold text-base mt-1">
                Net Payable: {formatINR(disburseForm.net_payable_amount)}
              </div>
            </div>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Payment Date</Form.Label>
              <Form.Control
                type="date"
                value={disburseForm.payment_date}
                onChange={(e) => setDisburseForm({ ...disburseForm, payment_date: e.target.value })}
                required
                className="text-xs rounded-xl"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Payment Mode</Form.Label>
              <Form.Select
                value={disburseForm.payment_mode}
                onChange={(e) => setDisburseForm({ ...disburseForm, payment_mode: e.target.value })}
                className="text-xs rounded-xl"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="Cheque">Cheque</option>
                <option value="Direct Credit">Direct Payroll Credit</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Transaction / UTR Reference No.</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. UTR1234567890"
                value={disburseForm.payment_reference}
                onChange={(e) => setDisburseForm({ ...disburseForm, payment_reference: e.target.value })}
                required
                className="text-xs rounded-xl font-mono"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-xs font-bold text-slate-700">Disbursement Remarks</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={disburseForm.remarks}
                onChange={(e) => setDisburseForm({ ...disburseForm, remarks: e.target.value })}
                className="text-xs rounded-xl"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowDisburseModal(false)} className="text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={disbursing} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl border-0">
              {disbursing ? "Disbursing..." : "Confirm & Mark Paid"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

