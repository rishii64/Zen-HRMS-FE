import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Spinner,
  Alert,
  Modal,
  Table,
} from "react-bootstrap";
import { getApiBaseUrl } from "../../../api/axios";
import EsiSlabAuditModal from "./EsiSlabAuditModal";

const API = getApiBaseUrl();

// Currency formatter
const fmt = (v) => {
  const num = typeof v === "number" ? v : parseFloat(String(v || 0).replace(/[^\d.-]/g, ""));
  return "₹" + (isNaN(num) ? 0 : num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

// Mediclaim Role Tier definitions matching company rules
export const MEDICLAIM_TIERS = [
  { tier: 7, keywords: ["ceo", "chief executive", "managing director", "md", "founder", "director", "president"], limit: 2000000, label: "CEO", maxAmountStr: "20 Lakhs" },
  { tier: 6, keywords: ["vice president", "vp", "svp", "avp"], limit: 700000, label: "Vice President", maxAmountStr: "7 Lakhs" },
  { tier: 5, keywords: ["general manager", "gm"], exclude: ["deputy", "dy", "assistant", "asst"], limit: 600000, label: "General Manager", maxAmountStr: "6 Lakhs" },
  { tier: 4, keywords: ["deputy general manager", "dgm", "dy. general manager", "dy general manager", "agm"], limit: 500000, label: "Deputy General Manager", maxAmountStr: "5 Lakhs" },
  { tier: 3, keywords: ["manager", "lead", "team lead", "tech lead", "hod", "head"], exclude: ["assistant", "asst", "associate", "deputy", "general"], limit: 400000, label: "Manager", maxAmountStr: "4 Lakhs" },
  { tier: 2, keywords: ["assistant manager", "asst manager", "asst. manager", "associate manager", "deputy manager"], limit: 300000, label: "Assistant Manager", maxAmountStr: "3 Lakhs" },
  { tier: 1, keywords: [], limit: 200000, label: "Executive", maxAmountStr: "2 Lakhs" },
];

export const getMediclaimRoleLimit = (designation, role) => {
  const text = `${designation || ""} ${role || ""}`.toLowerCase().trim();

  // Tier 7: CEO (20 Lakhs)
  if (text.includes("ceo") || text.includes("chief executive") || text.includes("managing director") || (text.includes("president") && !text.includes("vice"))) {
    return { limit: 2000000, label: "CEO", maxAmountStr: "20 Lakhs", tier: 7 };
  }
  // Tier 6: Vice President (7 Lakhs)
  if (text.includes("vice president") || text.includes("vp") || text.includes("svp") || text.includes("avp")) {
    return { limit: 700000, label: "Vice President", maxAmountStr: "7 Lakhs", tier: 6 };
  }
  // Tier 4: Deputy General Manager (5 Lakhs)
  if (text.includes("deputy general manager") || text.includes("dgm") || text.includes("agm") || text.includes("dy. general manager") || text.includes("dy general manager")) {
    return { limit: 500000, label: "Deputy General Manager", maxAmountStr: "5 Lakhs", tier: 4 };
  }
  // Tier 5: General Manager (6 Lakhs)
  if (text.includes("general manager") || text.includes("gm")) {
    return { limit: 600000, label: "General Manager", maxAmountStr: "6 Lakhs", tier: 5 };
  }
  // Tier 2: Assistant Manager (3 Lakhs)
  if (text.includes("assistant manager") || text.includes("asst manager") || text.includes("asst. manager") || text.includes("associate manager") || text.includes("deputy manager")) {
    return { limit: 300000, label: "Assistant Manager", maxAmountStr: "3 Lakhs", tier: 2 };
  }
  // Tier 3: Manager (4 Lakhs)
  if (text.includes("manager") || text.includes("lead") || text.includes("tech lead") || text.includes("team lead") || text.includes("hod") || text.includes("head")) {
    return { limit: 400000, label: "Manager", maxAmountStr: "4 Lakhs", tier: 3 };
  }
  // Tier 1: Upto Executive (2 Lakhs)
  return { limit: 200000, label: "Executive", maxAmountStr: "2 Lakhs", tier: 1 };
};

// Calculate EMI with annual interest rate and tenure
const calculateEMI = (principal, annualRate, tenureMonths) => {
  const p = parseFloat(principal) || 0;
  const n = parseInt(tenureMonths) || 24;
  const rate = parseFloat(annualRate) || 0;
  if (p <= 0 || n <= 0) return 0;
  if (rate <= 0) return Math.round(p / n);
  const r = rate / 12 / 100;
  const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
};

export default function FacilitiesWorksheetSection({ onFacilitiesUpdated }) {
  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const isAccountsUser = ["accounts", "admin", "payroll"].includes(userRole);
  const isHRUser = ["hr", "hrmanager"].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [savingBatch, setSavingBatch] = useState(false);
  const [records, setRecords] = useState([]);
  const [editedRows, setEditedRows] = useState({}); // empCode -> updated fields
  const [rowSaving, setRowSaving] = useState({}); // empCode -> boolean

  // Filters
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'enabled' | 'disabled'

  // Settings Modal (Global ESI & Loan Interest)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEsiAuditModal, setShowEsiAuditModal] = useState(false);
  const [globalEsiThreshold, setGlobalEsiThreshold] = useState(21000);
  const [companyInterestRate, setCompanyInterestRate] = useState(8.5);
  const [savingSettings, setSavingSettings] = useState(false);

  // Status & Feedback alerts
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'danger'|'info', message: '' }

  // Load records from backend
  const fetchFacilitiesData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/payroll/facilities`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          role: userRole || "admin",
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records);
        if (data.global_esi_threshold) setGlobalEsiThreshold(data.global_esi_threshold);
        if (data.company_interest_rate) setCompanyInterestRate(data.company_interest_rate);
      } else {
        setFeedback({ type: "warning", message: data.error || "Unable to load facilities records." });
      }
    } catch (err) {
      console.error("Fetch facilities worksheet error:", err);
      setFeedback({ type: "danger", message: "Failed to connect to backend server." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilitiesData();
  }, []);

  // Unique departments for dropdown
  const departments = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.department) set.add(r.department.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Handle cell edit in local draft
  const handleCellChange = (empCode, fieldPath, value) => {
    if (!isAccountsUser) return; // Read-only for HR

    setEditedRows((prev) => {
      const existing = prev[empCode] || {};
      const updated = { ...existing };

      if (fieldPath.includes(".")) {
        const [parent, child] = fieldPath.split(".");
        updated[parent] = { ...(existing[parent] || {}), [child]: value };
      } else {
        updated[fieldPath] = value;
      }

      return { ...prev, [empCode]: updated };
    });
  };

  // Get active value (draft or original)
  const getValue = (record, fieldPath) => {
    const draft = editedRows[record.employee_code];
    if (fieldPath.includes(".")) {
      const [parent, child] = fieldPath.split(".");
      if (draft?.[parent]?.[child] !== undefined) {
        return draft[parent][child];
      }
      return record[parent]?.[child];
    }
    if (draft?.[fieldPath] !== undefined) {
      return draft[fieldPath];
    }
    return record[fieldPath];
  };

  // Strict Condition Validators
  const validateRecord = (record) => {
    const empCode = record.employee_code;
    const advAmount = parseFloat(getValue(record, "advance.amount")) || 0;
    const advDeduction = parseFloat(getValue(record, "advance.deduction")) || 0;
    const loanAmount = parseFloat(getValue(record, "loan.amount")) || 0;
    const mediCoverage = parseFloat(getValue(record, "mediclaim.coverage")) || 0;

    const mediTier = getMediclaimRoleLimit(record.designation, record.employment_type);

    const errors = [];

    // 1. Advance: Upto 1 Lakh
    if (advAmount > 100000) {
      errors.push(`Advance Payment exceeds ₹1,00,000 maximum policy limit.`);
    }
    if (advAmount < 0) {
      errors.push(`Advance Payment cannot be negative.`);
    }
    if (advDeduction > advAmount) {
      errors.push(`Monthly recovery (₹${advDeduction}) cannot exceed advance principal.`);
    }

    // 2. Loan: 1 to 10 Lakhs
    if (loanAmount > 0) {
      if (loanAmount < 100000) {
        errors.push(`Company Loan must be at least ₹1,00,000 (1 Lakh).`);
      }
      if (loanAmount > 1000000) {
        errors.push(`Company Loan cannot exceed ₹10,00,000 (10 Lakhs).`);
      }
    }

    // 3. Mediclaim: Role Condition checks
    if (mediCoverage > mediTier.limit) {
      errors.push(`Mediclaim coverage (₹${mediCoverage}) exceeds maximum allowed limit of ₹${mediTier.maxAmountStr} for ${mediTier.label} (${record.designation}).`);
    }

    return errors;
  };

  // Save single employee row
  const handleSaveRow = async (record) => {
    if (!isAccountsUser) return;
    const empCode = record.employee_code;

    const validationErrors = validateRecord(record);
    if (validationErrors.length > 0) {
      setFeedback({ type: "danger", message: `Validation Error for #${empCode}: ${validationErrors[0]}` });
      return;
    }

    const advEnabled = !!getValue(record, "facilities.advance");
    const loanEnabled = !!getValue(record, "facilities.loan");
    const insEnabled = !!getValue(record, "facilities.insurance");
    const gratEnabled = !!getValue(record, "facilities.gratuity");

    const payload = {
      facilities: {
        advance: advEnabled,
        loan: loanEnabled,
        insurance: insEnabled,
        gratuity: gratEnabled,
      },
      adjustments: {
        advance_amount: advEnabled ? (parseFloat(getValue(record, "advance.amount")) || 0) : 0,
        advance_deduction: advEnabled ? (parseFloat(getValue(record, "advance.deduction")) || 0) : 0,
        loan_amount: loanEnabled ? (parseFloat(getValue(record, "loan.amount")) || 0) : 0,
        loan_interest_rate: parseFloat(getValue(record, "loan.interest_rate")) || companyInterestRate,
        loan_tenure: parseInt(getValue(record, "loan.tenure_months")) || 24,
        loan_emi: loanEnabled ? (parseFloat(getValue(record, "loan.emi")) || 0) : 0,
        insurance_deduction: insEnabled ? (parseFloat(getValue(record, "insurance.deduction")) || 0) : 0,
        mediclaim_coverage: parseFloat(getValue(record, "mediclaim.coverage")) || 200000,
        mediclaim_deduction: parseFloat(getValue(record, "mediclaim.deduction")) || 0,
        esi_amount: parseFloat(getValue(record, "esi.amount")) || 0,
      },
      esi_threshold: getValue(record, "esi.threshold"),
      use_global_esi: !!getValue(record, "esi.use_global"),
    };

    setRowSaving((prev) => ({ ...prev, [empCode]: true }));

    try {
      const res = await fetch(`${API}/payroll/facilities/${empCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          role: userRole || "admin",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", message: `Saved facilities for ${record.name} (#${empCode})! Reflected in payroll.` });
        setEditedRows((prev) => {
          const next = { ...prev };
          delete next[empCode];
          return next;
        });
        if (onFacilitiesUpdated) onFacilitiesUpdated();
        fetchFacilitiesData();
      } else {
        setFeedback({ type: "danger", message: data.error || "Failed to save facilities." });
      }
    } catch (err) {
      console.error("Save facilities row error:", err);
      setFeedback({ type: "danger", message: "Failed to connect to backend server." });
    } finally {
      setRowSaving((prev) => ({ ...prev, [empCode]: false }));
    }
  };

  // Batch save all dirty rows
  const handleSaveAll = async () => {
    if (!isAccountsUser) return;
    const dirtyCodes = Object.keys(editedRows);
    if (dirtyCodes.length === 0) {
      setFeedback({ type: "info", message: "No pending modifications to save." });
      return;
    }

    for (const code of dirtyCodes) {
      const rec = records.find((r) => r.employee_code === code);
      if (rec) {
        const errors = validateRecord(rec);
        if (errors.length > 0) {
          setFeedback({ type: "danger", message: `Validation Error on #${code}: ${errors[0]}` });
          return;
        }
      }
    }

    setSavingBatch(true);
    const updates = dirtyCodes.map((code) => {
      const rec = records.find((r) => r.employee_code === code) || {};
      const advEnabled = !!getValue(rec, "facilities.advance");
      const loanEnabled = !!getValue(rec, "facilities.loan");
      const insEnabled = !!getValue(rec, "facilities.insurance");
      const gratEnabled = !!getValue(rec, "facilities.gratuity");

      return {
        employee_code: code,
        facilities: {
          advance: advEnabled,
          loan: loanEnabled,
          insurance: insEnabled,
          gratuity: gratEnabled,
        },
        adjustments: {
          advance_amount: advEnabled ? (parseFloat(getValue(rec, "advance.amount")) || 0) : 0,
          advance_deduction: advEnabled ? (parseFloat(getValue(rec, "advance.deduction")) || 0) : 0,
          loan_amount: loanEnabled ? (parseFloat(getValue(rec, "loan.amount")) || 0) : 0,
          loan_interest_rate: parseFloat(getValue(rec, "loan.interest_rate")) || companyInterestRate,
          loan_tenure: parseInt(getValue(rec, "loan.tenure_months")) || 24,
          loan_emi: loanEnabled ? (parseFloat(getValue(rec, "loan.emi")) || 0) : 0,
          insurance_deduction: insEnabled ? (parseFloat(getValue(rec, "insurance.deduction")) || 0) : 0,
          mediclaim_coverage: parseFloat(getValue(rec, "mediclaim.coverage")) || 200000,
          mediclaim_deduction: parseFloat(getValue(rec, "mediclaim.deduction")) || 0,
          esi_amount: parseFloat(getValue(rec, "esi.amount")) || 0,
        },
        esi_threshold: getValue(rec, "esi.threshold"),
        use_global_esi: !!getValue(rec, "esi.use_global"),
      };
    });

    try {
      const res = await fetch(`${API}/payroll/facilities/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          role: userRole || "admin",
        },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: `Successfully saved ${data.updatedCount} employee facilities! Reflected in Payroll.`,
        });
        setEditedRows({});
        if (onFacilitiesUpdated) onFacilitiesUpdated();
        fetchFacilitiesData();
      } else {
        setFeedback({ type: "danger", message: data.error || "Batch update failed." });
      }
    } catch (err) {
      console.error("Batch save facilities error:", err);
      setFeedback({ type: "danger", message: "Failed to connect to backend server." });
    } finally {
      setSavingBatch(false);
    }
  };

  // Save Settings Modal
  const handleSaveSettings = async () => {
    if (!isAccountsUser) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${API}/payroll/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          role: userRole || "admin",
        },
        body: JSON.stringify({
          global_esi_threshold: globalEsiThreshold,
          apply_to_all: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", message: `Global settings updated successfully!` });
        setShowSettingsModal(false);
        fetchFacilitiesData();
      } else {
        setFeedback({ type: "danger", message: data.error || "Failed to update settings" });
      }
    } catch (err) {
      console.error("Update settings error:", err);
      setFeedback({ type: "danger", message: "Server connection failed" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      "Employee Code",
      "Employee Name",
      "Department",
      "Designation",
      "Salary",
      "Mediclaim Coverage",
      "Mediclaim Deduction",
      "ESI Status",
      "ESI Deduction",
      "Advance Principal (Max 1L)",
      "Advance Monthly Recovery",
      "Loan Principal (1-10L)",
      "Loan Interest Rate %",
      "Loan Monthly EMI",
      "Insurance Premium",
      "Gratuity Entitlement",
      "Applicable Amount",
      "Total Monthly Deduction",
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.employee_code}"`,
      `"${r.name}"`,
      `"${r.department}"`,
      `"${r.designation}"`,
      getValue(r, "salary") || 0,
      getValue(r, "mediclaim.coverage") || 0,
      getValue(r, "mediclaim.deduction") || 0,
      getValue(r, "esi.is_eligible") ? "Eligible" : "Exempt",
      getValue(r, "esi.amount") || 0,
      getValue(r, "advance.amount") || 0,
      getValue(r, "advance.deduction") || 0,
      getValue(r, "loan.amount") || 0,
      getValue(r, "loan.interest_rate") || companyInterestRate,
      getValue(r, "loan.emi") || 0,
      getValue(r, "insurance.deduction") || 0,
      getValue(r, "gratuity.total_entitlement") || 0,
      getValue(r, "applicable_contribution") || 0,
      getValue(r, "total_deductions") || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Facilities_Statutory_Benefits_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering records based on Dept, Category, Search, and Status
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedDept !== "all" && (r.department || "").toLowerCase().trim() !== selectedDept.toLowerCase().trim()) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (r.employee_code || "").toLowerCase();
        const name = (r.name || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }

      if (selectedCategory !== "all") {
        const advActive = !!getValue(r, "facilities.advance");
        const loanActive = !!getValue(r, "facilities.loan");
        const insActive = !!getValue(r, "facilities.insurance");
        const gratActive = !!getValue(r, "facilities.gratuity");
        const isEsi = !!getValue(r, "esi.is_eligible");

        switch (selectedCategory) {
          case "advance":
            if (!advActive) return false;
            break;
          case "loan":
            if (!loanActive) return false;
            break;
          case "insurance":
            if (!insActive) return false;
            break;
          case "gratuity":
            if (!gratActive) return false;
            break;
          case "esi":
            if (!isEsi) return false;
            break;
          case "mediclaim":
            if (isEsi) return false;
            break;
          default:
            break;
        }
      }

      if (statusFilter === "enabled") {
        const anyActive =
          getValue(r, "facilities.advance") ||
          getValue(r, "facilities.loan") ||
          getValue(r, "facilities.insurance") ||
          getValue(r, "facilities.gratuity");
        if (!anyActive) return false;
      } else if (statusFilter === "disabled") {
        const allDisabled =
          !getValue(r, "facilities.advance") &&
          !getValue(r, "facilities.loan") &&
          !getValue(r, "facilities.insurance") &&
          !getValue(r, "facilities.gratuity");
        if (!allDisabled) return false;
      }

      return true;
    });
  }, [records, selectedDept, selectedCategory, searchQuery, statusFilter, editedRows]);

  // Aggregate KPI stats
  const kpiStats = useMemo(() => {
    let totalEmployees = filteredRecords.length;
    let totalAdvancesDisbursed = 0;
    let totalAdvanceRecovery = 0;
    let totalLoansDisbursed = 0;
    let totalLoanEMI = 0;
    let totalMediclaimCoverage = 0;
    let totalESIBeneficiaries = 0;
    let totalMonthlyDeductions = 0;

    filteredRecords.forEach((r) => {
      const advActive = !!getValue(r, "facilities.advance");
      const loanActive = !!getValue(r, "facilities.loan");
      const insActive = !!getValue(r, "facilities.insurance");
      const isEsi = !!getValue(r, "esi.is_eligible");

      if (advActive) {
        totalAdvancesDisbursed += parseFloat(getValue(r, "advance.amount")) || 0;
        totalAdvanceRecovery += parseFloat(getValue(r, "advance.deduction")) || 0;
      }
      if (loanActive) {
        totalLoansDisbursed += parseFloat(getValue(r, "loan.amount")) || 0;
        totalLoanEMI += parseFloat(getValue(r, "loan.emi")) || 0;
      }
      if (insActive && !isEsi) {
        totalMediclaimCoverage += parseFloat(getValue(r, "mediclaim.coverage")) || 0;
      }
      if (isEsi) {
        totalESIBeneficiaries += 1;
      }

      totalMonthlyDeductions +=
        (advActive ? (parseFloat(getValue(r, "advance.deduction")) || 0) : 0) +
        (loanActive ? (parseFloat(getValue(r, "loan.emi")) || 0) : 0) +
        (insActive ? (parseFloat(getValue(r, "insurance.deduction")) || 0) : 0) +
        (isEsi
          ? (parseFloat(getValue(r, "esi.amount")) || 0)
          : (insActive ? (parseFloat(getValue(r, "mediclaim.deduction")) || 0) : 0));
    });

    return {
      totalEmployees,
      totalAdvancesDisbursed,
      totalAdvanceRecovery,
      totalLoansDisbursed,
      totalLoanEMI,
      totalMediclaimCoverage,
      totalESIBeneficiaries,
      totalMonthlyDeductions,
    };
  }, [filteredRecords, editedRows]);

  const dirtyCount = Object.keys(editedRows).length;

  // Compute column toggle state across currently filtered/visible records
  const getColumnToggleStatus = (facilityKey) => {
    const eligibleRecords = filteredRecords.filter((r) => {
      if (facilityKey === "gratuity") {
        return r.employment_type?.toLowerCase() === "permanent";
      }
      return true;
    });

    if (eligibleRecords.length === 0) {
      return { allOn: false, noneOn: true, someOn: false, activeCount: 0, totalEligible: 0 };
    }

    let activeCount = 0;
    eligibleRecords.forEach((r) => {
      if (getValue(r, `facilities.${facilityKey}`)) {
        activeCount++;
      }
    });

    return {
      allOn: activeCount === eligibleRecords.length,
      noneOn: activeCount === 0,
      someOn: activeCount > 0 && activeCount < eligibleRecords.length,
      activeCount,
      totalEligible: eligibleRecords.length,
    };
  };

  // Set or toggle all visible eligible employees for a facility column
  const handleSetColumnAll = (facilityKey, enable) => {
    if (!isAccountsUser) return;
    const eligibleRecords = filteredRecords.filter((r) => {
      if (facilityKey === "gratuity") {
        return r.employment_type?.toLowerCase() === "permanent";
      }
      return true;
    });

    if (eligibleRecords.length === 0) return;

    setEditedRows((prev) => {
      const updated = { ...prev };
      eligibleRecords.forEach((r) => {
        const empCode = r.employee_code;
        const existing = updated[empCode] || {};
        const facilities = { ...(r.facilities || {}), ...(existing.facilities || {}) };
        facilities[facilityKey] = enable;

        updated[empCode] = {
          ...existing,
          facilities,
        };
      });
      return updated;
    });

    const labels = {
      advance: "Advanced Pay",
      loan: "Company Loan",
      insurance: "Group Insurance",
      gratuity: "Gratuity",
    };

    setFeedback({
      type: "info",
      message: `${enable ? "Enabled" : "Disabled"} ${labels[facilityKey] || facilityKey} for all ${eligibleRecords.length} visible staff. Click "Save All Changes" to persist.`,
    });
  };

  const handleToggleColumnAll = (facilityKey) => {
    const status = getColumnToggleStatus(facilityKey);
    handleSetColumnAll(facilityKey, !status.allOn);
  };

  return (
    <div className="facilities-worksheet-section mb-5">
      {/* ══ EMBEDDED MATERIAL DESIGN & NO-WRAP STYLES ══ */}
      <style>{`
        .excel-grid-table th,
        .excel-grid-table td,
        .excel-grid-table span,
        .excel-grid-table div,
        .excel-grid-table label {
          white-space: nowrap !important;
        }
        .excel-grid-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          color: #475569;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0 !important;
          padding: 10px 12px !important;
          vertical-align: middle;
        }
        .excel-grid-table td {
          font-size: 12px;
          color: #1e293b;
          padding: 8px 12px !important;
          vertical-align: middle;
          border-color: #e2e8f0 !important;
        }
        .mat-cell-input {
          height: 28px;
          font-size: 12px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          padding: 2px 6px;
          background-color: #ffffff;
          color: #1e293b;
          outline: none;
          transition: all 0.15s ease-in-out;
          white-space: nowrap !important;
        }
        .mat-cell-input:focus {
          border-color: #1976d2;
          box-shadow: 0 0 0 2px rgba(25,118,210,0.15);
        }
        .mat-cell-input:disabled {
          background-color: #f1f5f9;
          color: #94a3b8;
          border-color: #e2e8f0;
          cursor: not-allowed;
        }
        .mat-chip {
          display: inline-flex;
          align-items: center;
          font-size: 10.5px;
          font-weight: 500;
          border-radius: 12px;
          padding: 2px 8px;
          white-space: nowrap !important;
          line-height: 1.4;
        }
        .mat-btn {
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          padding: 5px 12px;
          white-space: nowrap !important;
          transition: all 0.15s ease-in-out;
        }
      `}</style>

      {/* ══ HEADER & ACTIONS BAR ══ */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>
              Facilities & Statutory Benefits
            </h4>
            {isAccountsUser ? (
              <span className="mat-chip" style={{ background: "#e8f0fe", color: "#1976d2", border: "1px solid #bfdbfe" }}>
                ⚡ Accounts Full Access
              </span>
            ) : (
              <span className="mat-chip" style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" }}>
                🔒 HR View-Only
              </span>
            )}
          </div>
          <small className="text-muted" style={{ whiteSpace: "nowrap" }}>
            Excel worksheet grid for employee facilities, corporate loans, salary advances, and statutory compliance.
          </small>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Global ESI Slab & Cycles (Visible to all users on Facilities worksheet) */}
          {/* <button
            type="button"
            className="btn btn-sm mat-btn bg-white border text-primary shadow-xs d-flex align-items-center gap-1.5"
            style={{ borderColor: "#93c5fd" }}
            onClick={() => setShowEsiAuditModal(true)}
            title="Configure Global ESI Slab, View Statutory Contribution Periods & Audit History"
          >
            <span>🛡️</span>
            <span className="fw-semibold">ESI Slab & Cycles (₹{fmt(globalEsiThreshold).replace("₹", "")})</span>
          </button> */}

          {/* Global Settings Modal (Accounts Only) */}
          {isAccountsUser && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mat-btn bg-white border text-dark shadow-xs d-flex align-items-center gap-1.5"
              onClick={() => setShowSettingsModal(true)}
              title="Configure Global ESI Slab & Company Loan Interest Rate"
            >
              <span>⚙️</span>
              <span>Company Rules</span>
            </button>
          )}

          {/* Export to CSV */}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mat-btn bg-white border text-dark shadow-xs d-flex align-items-center gap-1.5"
            onClick={handleExportCSV}
            title="Download CSV Spreadsheet"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export CSV</span>
          </button>

          {/* Save All Changes Button (Accounts Only) */}
          {isAccountsUser && (
            <button
              type="button"
              className="btn btn-sm text-white mat-btn border-0 shadow-sm d-flex align-items-center gap-1.5"
              style={{ background: dirtyCount > 0 ? "#1976d2" : "#334155" }}
              disabled={dirtyCount === 0 || savingBatch}
              onClick={handleSaveAll}
            >
              {savingBatch ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Saving All...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save All Changes</span>
                  {dirtyCount > 0 && (
                    <span className="badge rounded-pill bg-white text-dark ms-1">
                      {dirtyCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ══ HR VIEW-ONLY NOTICE ══ */}
      {!isAccountsUser && (
        <Alert variant="info" className="py-2 px-3 rounded-3 small d-flex align-items-center gap-2 mb-3 shadow-xs" style={{ whiteSpace: "nowrap" }}>
          <span>🔒</span>
          <span>
            <strong>HR View-Only Mode:</strong> Facilities, corporate loans, advances, and statutory benefits calculations are managed exclusively by the Accounts Department.
          </span>
        </Alert>
      )}

      {/* ══ NOTIFICATION FEEDBACK ══ */}
      {feedback && (
        <Alert
          variant={feedback.type}
          dismissible
          onClose={() => setFeedback(null)}
          className="py-2 px-3 rounded-3 small mb-3 shadow-xs d-flex align-items-center justify-content-between"
          style={{ whiteSpace: "nowrap" }}
        >
          <span>{feedback.message}</span>
        </Alert>
      )}

      {/* ══ KPI SUMMARY CARDS (MATERIAL CLEAN DESIGN) ══ */}
      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} md={selectedCategory === "all" ? 2 : 3}>
          <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-primary h-100">
            <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Staff Count</span>
            <h5 className="fw-bold text-dark mt-1 mb-0" style={{ whiteSpace: "nowrap" }}>{kpiStats.totalEmployees}</h5>
            <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>{departments.length} Departments</span>
          </div>
        </Col>

        {(selectedCategory === "all" || selectedCategory === "advance") && (
          <Col xs={12} sm={6} md={selectedCategory === "all" ? 2 : 3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-info h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Advances (Max ₹1L)</span>
              <h5 className="fw-bold text-info mt-1 mb-0" style={{ whiteSpace: "nowrap" }}>{fmt(kpiStats.totalAdvancesDisbursed)}</h5>
              <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Rec: {fmt(kpiStats.totalAdvanceRecovery)}/mo</span>
            </div>
          </Col>
        )}

        {(selectedCategory === "all" || selectedCategory === "loan") && (
          <Col xs={12} sm={6} md={selectedCategory === "all" ? 3 : 3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-warning h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Loans (1L–10L)</span>
              <h5 className="fw-bold text-dark mt-1 mb-0" style={{ whiteSpace: "nowrap" }}>{fmt(kpiStats.totalLoansDisbursed)}</h5>
              <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>EMI: {fmt(kpiStats.totalLoanEMI)}/mo @ {companyInterestRate}%</span>
            </div>
          </Col>
        )}

        {(selectedCategory === "all" || selectedCategory === "mediclaim" || selectedCategory === "esi") && (
          <Col xs={12} sm={6} md={selectedCategory === "all" ? 3 : 3}>
            <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-success h-100">
              <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Mediclaim / ESI</span>
              <h5 className="fw-bold text-success mt-1 mb-0" style={{ whiteSpace: "nowrap" }}>
                {kpiStats.totalESIBeneficiaries} ESI / {fmt(kpiStats.totalMediclaimCoverage)}
              </h5>
              <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Role-Based Tiers (2L–20L)</span>
            </div>
          </Col>
        )}

        <Col xs={12} sm={6} md={selectedCategory === "all" ? 2 : 3}>
          <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-danger h-100">
            <span className="text-muted fw-semibold small text-uppercase" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Total Monthly Deductions</span>
            <h5 className="fw-bold text-danger mt-1 mb-0" style={{ whiteSpace: "nowrap" }}>{fmt(kpiStats.totalMonthlyDeductions)}</h5>
            <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Payroll Deduction Sum</span>
          </div>
        </Col>
      </Row>

      {/* ══ MATERIAL FILTER TOOLBAR ══ */}
      <div className="p-3 bg-white rounded-3 shadow-xs border mb-3">
        <Row className="g-2.5 align-items-center">
          {/* Department */}
          <Col xs={12} sm={6} md={3}>
            <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
              Department
            </label>
            <Form.Select
              size="sm"
              className="mat-cell-input w-100"
              style={{ height: "34px", fontSize: "12px", whiteSpace: "nowrap" }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">All Departments ({records.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Form.Select>
          </Col>

          {/* Facility Category */}
          <Col xs={12} sm={6} md={3}>
            <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
              Facility Category
            </label>
            <Form.Select
              size="sm"
              className="mat-cell-input w-100"
              style={{ height: "34px", fontSize: "12px", whiteSpace: "nowrap" }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories (Master Grid)</option>
              <option value="advance">Advanced Payment (Upto 1 Lakh)</option>
              <option value="loan">Loans (1 to 10 Lakhs)</option>
              <option value="insurance">Group Insurance</option>
              <option value="gratuity">Gratuity (Act 1972)</option>
              <option value="esi">ESI (Salary ≤ Slab)</option>
              <option value="mediclaim">Mediclaim (Role Tier 2L–20L)</option>
            </Form.Select>
          </Col>

          {/* Search */}
          <Col xs={12} sm={6} md={3}>
            <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
              Employee Search
            </label>
            <div className="d-flex align-items-center border rounded-2 px-2 bg-white" style={{ height: "34px" }}>
              <input
                type="text"
                placeholder="Search by code or name..."
                className="border-0 bg-transparent small text-dark shadow-none w-100"
                style={{ outline: "none", fontSize: "12px", whiteSpace: "nowrap" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-muted border-0"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </Col>

          {/* Status */}
          <Col xs={12} sm={6} md={3}>
            <label className="form-label small fw-semibold text-muted mb-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
              Facility Status
            </label>
            <Form.Select
              size="sm"
              className="mat-cell-input w-100"
              style={{ height: "34px", fontSize: "12px", whiteSpace: "nowrap" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled Facilities Only</option>
              <option value="disabled">Disabled Facilities Only</option>
            </Form.Select>
          </Col>
        </Row>
      </div>

      {/* ══ EXCEL SPREADSHEET TABLE (NO TEXT WRAP, CLEAN MATERIAL) ══ */}
      <div className="bg-white rounded-3 shadow-xs border overflow-hidden">
        <div className="p-2.5 border-bottom bg-light d-flex justify-content-between align-items-center" style={{ whiteSpace: "nowrap" }}>
          <span className="fw-semibold text-dark small" style={{ whiteSpace: "nowrap" }}>
            Showing {filteredRecords.length} Employees Matching Criteria
          </span>
          <span className="small text-muted" style={{ whiteSpace: "nowrap" }}>
            {isAccountsUser ? "Edit cells inline • Save per row or batch save" : "🔒 Read-only mode for HR"}
          </span>
        </div>

        <div className="table-responsive" style={{ maxHeight: "650px", overflowX: "auto" }}>
          <Table hover bordered className="align-middle mb-0 excel-grid-table" style={{ minWidth: "2280px" }}>
            <thead className="sticky-top" style={{ zIndex: 6 }}>
              <tr>
                {/* 1. Frozen Code (Exact 130px) */}
                <th style={{ minWidth: "130px", position: "sticky", left: 0, background: "#f8fafc", zIndex: 7 }} className="border-end">
                  Employee Code
                </th>

                {/* 2. Frozen Name (Exact 180px, left: 130px) */}
                <th
                  style={{
                    width: "180px",
                    minWidth: "180px",
                    maxWidth: "180px",
                    position: "sticky",
                    left: "130px",
                    background: "#f8fafc",
                    zIndex: 7,
                    boxShadow: "2px 0 4px -1px rgba(0,0,0,0.1)",
                  }}
                  className="border-end"
                >
                  Employee Name
                </th>

                {/* 3. Department */}
                <th style={{ width: "130px", minWidth: "130px" }} className="border-end">
                  Department
                </th>

                {/* 4. Designation */}
                <th style={{ width: "170px", minWidth: "170px" }} className="border-end">
                  Designation
                </th>

                {/* 5. Salary (Gross) */}
                <th style={{ width: "120px", minWidth: "120px", textAlign: "right" }} className="border-end">
                  Salary (Gross)
                </th>

                {/* 6. Mediclaim (2L-20L Tier) */}
                <th style={{ width: "220px", minWidth: "220px", background: "#f0fdf4" }} className="border-end">
                  Mediclaim (2L–20L Tier)
                </th>

                {/* 7. ESI */}
                <th style={{ width: "160px", minWidth: "160px", background: "#eff6ff" }} className="border-end">
                  ESI (≤ ₹{fmt(globalEsiThreshold).replace("₹", "")} Slab)
                </th>

                {/* 8. Advanced Payment */}
                <th style={{ width: "235px", minWidth: "235px", background: "#fefce8" }} className="border-end">
                  <div className="d-flex align-items-center justify-content-between gap-1 mb-1" style={{ whiteSpace: "nowrap" }}>
                    <span>Advanced Pay (Upto 1L)</span>
                  </div>
                  {isAccountsUser && (() => {
                    const status = getColumnToggleStatus("advance");
                    return (
                      <div className="d-flex align-items-center gap-1 mt-1" style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.allOn
                              ? "btn-primary text-white"
                              : "btn-outline-primary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleColumnAll("advance");
                          }}
                          title={status.allOn ? "Click to toggle OFF for all" : "Click to toggle ON for all"}
                        >
                          {status.allOn ? "Toggle Off" : "Toggle All"}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.noneOn
                              ? "btn-secondary text-white"
                              : "btn-outline-secondary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetColumnAll("advance", false);
                          }}
                          title="Turn OFF for all employees"
                        >
                          All Off
                        </button>
                        <span className="text-muted fw-normal" style={{ fontSize: "9.5px", whiteSpace: "nowrap" }}>
                          ({status.activeCount}/{status.totalEligible})
                        </span>
                      </div>
                    );
                  })()}
                </th>

                {/* 9. Loan */}
                <th style={{ width: "235px", minWidth: "235px", background: "#fdf2f8" }} className="border-end">
                  <div className="d-flex align-items-center justify-content-between gap-1 mb-1" style={{ whiteSpace: "nowrap" }}>
                    <span>Company Loan (1L–10L)</span>
                  </div>
                  {isAccountsUser && (() => {
                    const status = getColumnToggleStatus("loan");
                    return (
                      <div className="d-flex align-items-center gap-1 mt-1" style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.allOn
                              ? "btn-primary text-white"
                              : "btn-outline-primary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleColumnAll("loan");
                          }}
                          title={status.allOn ? "Click to toggle OFF for all" : "Click to toggle ON for all"}
                        >
                          {status.allOn ? "Toggle Off" : "Toggle All"}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.noneOn
                              ? "btn-secondary text-white"
                              : "btn-outline-secondary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetColumnAll("loan", false);
                          }}
                          title="Turn OFF for all employees"
                        >
                          All Off
                        </button>
                        <span className="text-muted fw-normal" style={{ fontSize: "9.5px", whiteSpace: "nowrap" }}>
                          ({status.activeCount}/{status.totalEligible})
                        </span>
                      </div>
                    );
                  })()}
                </th>

                {/* 10. Interest % */}
                <th style={{ width: "130px", minWidth: "130px", background: "#fff7ed" }} className="border-end">
                  Interest Rate %
                </th>

                {/* 11. Insurance */}
                <th style={{ width: "190px", minWidth: "190px", background: "#f5f3ff" }} className="border-end">
                  <div className="d-flex align-items-center justify-content-between gap-1 mb-1" style={{ whiteSpace: "nowrap" }}>
                    <span>Group Insurance</span>
                  </div>
                  {isAccountsUser && (() => {
                    const status = getColumnToggleStatus("insurance");
                    return (
                      <div className="d-flex align-items-center gap-1 mt-1" style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.allOn
                              ? "btn-primary text-white"
                              : "btn-outline-primary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleColumnAll("insurance");
                          }}
                          title={status.allOn ? "Click to toggle OFF for all" : "Click to toggle ON for all"}
                        >
                          {status.allOn ? "Toggle Off" : "Toggle All"}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.noneOn
                              ? "btn-secondary text-white"
                              : "btn-outline-secondary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetColumnAll("insurance", false);
                          }}
                          title="Turn OFF for all employees"
                        >
                          All Off
                        </button>
                        <span className="text-muted fw-normal" style={{ fontSize: "9.5px", whiteSpace: "nowrap" }}>
                          ({status.activeCount}/{status.totalEligible})
                        </span>
                      </div>
                    );
                  })()}
                </th>

                {/* 12. Gratuity */}
                <th style={{ width: "210px", minWidth: "210px", background: "#f8fafc" }} className="border-end">
                  <div className="d-flex align-items-center justify-content-between gap-1 mb-1" style={{ whiteSpace: "nowrap" }}>
                    <span>Gratuity (Act 1972)</span>
                  </div>
                  {isAccountsUser && (() => {
                    const status = getColumnToggleStatus("gratuity");
                    return (
                      <div className="d-flex align-items-center gap-1 mt-1" style={{ whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.allOn
                              ? "btn-primary text-white"
                              : "btn-outline-primary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleColumnAll("gratuity");
                          }}
                          title={status.allOn ? "Click to toggle OFF for all permanent staff" : "Click to toggle ON for all permanent staff"}
                        >
                          {status.allOn ? "Toggle Off" : "Toggle All"}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs py-0 px-1.5 rounded fw-semibold ${
                            status.noneOn
                              ? "btn-secondary text-white"
                              : "btn-outline-secondary bg-white"
                          }`}
                          style={{ fontSize: "9.5px", height: "20px", whiteSpace: "nowrap" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetColumnAll("gratuity", false);
                          }}
                          title="Turn OFF for all permanent staff"
                        >
                          All Off
                        </button>
                        <span className="text-muted fw-normal" style={{ fontSize: "9.5px", whiteSpace: "nowrap" }}>
                          ({status.activeCount}/{status.totalEligible})
                        </span>
                      </div>
                    );
                  })()}
                </th>

                {/* 13. Applicable Amount */}
                <th style={{ width: "130px", minWidth: "130px", textAlign: "right", background: "#ecfdf5" }} className="border-end">
                  Applicable Amt
                </th>

                {/* 14. Total Deduction */}
                <th style={{ width: "130px", minWidth: "130px", textAlign: "right", background: "#fff1f2" }} className="border-end">
                  Total Deduction
                </th>

                {/* 15. Action */}
                <th style={{ width: "95px", minWidth: "95px", textAlign: "center" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="15" className="text-center py-5 text-muted" style={{ whiteSpace: "nowrap" }}>
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    Loading Facilities & Statutory Benefits Worksheet...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="15" className="text-center py-5 text-muted" style={{ whiteSpace: "nowrap" }}>
                    No employees matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const empCode = r.employee_code;
                  const isDirty = !!editedRows[empCode];
                  const saving = !!rowSaving[empCode];

                  const salary = getValue(r, "salary") || 0;
                  const advEnabled = !!getValue(r, "facilities.advance");
                  const advAmount = parseFloat(getValue(r, "advance.amount")) || 0;
                  const advDeduction = parseFloat(getValue(r, "advance.deduction")) || 0;

                  const loanEnabled = !!getValue(r, "facilities.loan");
                  const loanAmount = parseFloat(getValue(r, "loan.amount")) || 0;
                  const loanInterest = parseFloat(getValue(r, "loan.interest_rate")) || companyInterestRate;
                  const loanTenure = parseInt(getValue(r, "loan.tenure_months")) || 24;
                  const loanEmi = parseFloat(getValue(r, "loan.emi")) || 0;

                  const insEnabled = !!getValue(r, "facilities.insurance");
                  const insDeduction = parseFloat(getValue(r, "insurance.deduction")) || 0;

                  const gratEnabled = !!getValue(r, "facilities.gratuity");
                  const gratAccrual = parseFloat(getValue(r, "gratuity.monthly_accrual")) || 0;
                  const gratTotal = parseFloat(getValue(r, "gratuity.total_entitlement")) || 0;

                  const threshold = getValue(r, "esi.threshold") || globalEsiThreshold;
                  const isEsiEligible = salary <= threshold;
                  const esiAmount = isEsiEligible ? (parseFloat(getValue(r, "esi.amount")) || Math.round(salary * 0.0075)) : 0;

                  const mediTier = getMediclaimRoleLimit(r.designation, r.employment_type);
                  const mediCoverage = parseFloat(getValue(r, "mediclaim.coverage")) || mediTier.limit;
                  const mediDeduction = !isEsiEligible ? (parseFloat(getValue(r, "mediclaim.deduction")) || (salary > 25000 ? 750 : 500)) : 0;

                  const liveTotalDeductions =
                    (advEnabled ? advDeduction : 0) +
                    (loanEnabled ? loanEmi : 0) +
                    (insEnabled ? insDeduction : 0) +
                    (isEsiEligible ? esiAmount : (insEnabled ? mediDeduction : 0));

                  const liveApplicableContribution =
                    (advEnabled ? advAmount : 0) +
                    (loanEnabled ? loanAmount : 0) +
                    (gratEnabled ? gratAccrual : 0) +
                    (insEnabled ? mediCoverage : 0);

                  const advExceeds = advAmount > 100000;
                  const advRecoveryInvalid = advDeduction > advAmount;
                  const loanInvalid = loanAmount > 0 && (loanAmount < 100000 || loanAmount > 1000000);
                  const mediExceeds = mediCoverage > mediTier.limit;

                  const rowBg = isDirty ? "#f0f7ff" : "#ffffff";

                  return (
                    <tr key={empCode} style={{ background: rowBg }}>
                      {/* 1. Frozen Code (Exact 130px, left: 0) */}
                      <td
                        style={{
                          width: "130px",
                          minWidth: "130px",
                          maxWidth: "130px",
                          position: "sticky",
                          left: 0,
                          background: rowBg,
                          zIndex: 5,
                          whiteSpace: "nowrap",
                        }}
                        className="border-end fw-semibold text-dark"
                      >
                        #{empCode}
                        {isDirty && <span className="ms-1 text-primary">•</span>}
                      </td>

                      {/* 2. Frozen Name (Exact 180px, left: 130px) */}
                      <td
                        style={{
                          width: "180px",
                          minWidth: "180px",
                          maxWidth: "180px",
                          position: "sticky",
                          left: "130px",
                          background: rowBg,
                          zIndex: 5,
                          boxShadow: "2px 0 4px -1px rgba(0,0,0,0.1)",
                          whiteSpace: "nowrap",
                        }}
                        className="border-end fw-medium text-dark"
                        title={r.name}
                      >
                        {r.name}
                      </td>

                      {/* 3. Department */}
                      <td style={{ width: "130px", minWidth: "130px", whiteSpace: "nowrap" }} className="border-end text-secondary">
                        {r.department}
                      </td>

                      {/* 4. Designation with Role Badge */}
                      <td style={{ width: "170px", minWidth: "170px", whiteSpace: "nowrap" }} className="border-end">
                        <div className="d-flex align-items-center gap-1.5" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-dark fw-medium" style={{ whiteSpace: "nowrap" }}>{r.designation}</span>
                          <span className="mat-chip" style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                            {mediTier.label}
                          </span>
                        </div>
                      </td>

                      {/* 5. Salary (Gross) */}
                      <td style={{ width: "120px", minWidth: "120px", textAlign: "right", whiteSpace: "nowrap" }} className="border-end fw-bold text-dark">
                        {fmt(salary)}
                      </td>

                      {/* 6. Mediclaim (2L-20L Strict Role Conditions) */}
                      <td style={{ width: "220px", minWidth: "220px", whiteSpace: "nowrap" }} className={`border-end ${mediExceeds ? "bg-danger-subtle" : ""}`}>
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className="mat-chip"
                            style={{
                              background: isEsiEligible ? "#f1f5f9" : "#e6f4ea",
                              color: isEsiEligible ? "#64748b" : "#137333",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {isEsiEligible ? "ESI Active" : `Max ₹${mediTier.maxAmountStr}`}
                          </span>
                          <Form.Check
                            type="switch"
                            id={`medi-sw-${empCode}`}
                            checked={insEnabled}
                            disabled={!isAccountsUser}
                            className="ms-1"
                            onChange={(e) => handleCellChange(empCode, "facilities.insurance", e.target.checked)}
                          />
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Cov:</span>
                          <input
                            type="number"
                            className="mat-cell-input"
                            style={{ width: "85px", borderColor: mediExceeds ? "#ef4444" : "#cbd5e1" }}
                            disabled={!isAccountsUser || isEsiEligible || !insEnabled}
                            value={mediCoverage || ""}
                            onChange={(e) => handleCellChange(empCode, "mediclaim.coverage", parseFloat(e.target.value) || 0)}
                            title={`Max allowed for ${mediTier.label}: ₹${mediTier.maxAmountStr}`}
                          />
                          {!isEsiEligible && (
                            <>
                              <span className="text-muted small ms-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Ded:</span>
                              <input
                                type="number"
                                className="mat-cell-input"
                                style={{ width: "55px" }}
                                disabled={!isAccountsUser || !insEnabled}
                                value={mediDeduction || ""}
                                onChange={(e) => handleCellChange(empCode, "mediclaim.deduction", parseFloat(e.target.value) || 0)}
                              />
                            </>
                          )}
                        </div>
                        {mediExceeds && (
                          <div className="text-danger small mt-0.5" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                            Exceeds cap ₹{mediTier.maxAmountStr}
                          </div>
                        )}
                      </td>

                      {/* 7. ESI */}
                      <td style={{ width: "150px", minWidth: "150px", whiteSpace: "nowrap" }} className="border-end">
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className="mat-chip"
                            style={{
                              background: isEsiEligible ? "#eff6ff" : "#f8fafc",
                              color: isEsiEligible ? "#1d4ed8" : "#94a3b8",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {isEsiEligible ? "Eligible (0.75%)" : "Exempt (> Slab)"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-muted small" style={{ fontSize: "11px" }}>₹</span>
                          <input
                            type="number"
                            className="mat-cell-input w-100"
                            disabled={!isAccountsUser || !isEsiEligible}
                            value={esiAmount || ""}
                            onChange={(e) => handleCellChange(empCode, "esi.amount", parseFloat(e.target.value) || 0)}
                            placeholder={isEsiEligible ? Math.round(salary * 0.0075) : "0"}
                          />
                        </div>
                      </td>

                      {/* 8. Advanced Payment (Upto 1L Strict Check) */}
                      <td style={{ width: "220px", minWidth: "220px", whiteSpace: "nowrap" }} className={`border-end ${advExceeds || advRecoveryInvalid ? "bg-danger-subtle" : ""}`}>
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className="mat-chip"
                            style={{
                              background: advEnabled ? "#eff6ff" : "#f1f5f9",
                              color: advEnabled ? "#1d4ed8" : "#64748b",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {advEnabled ? "Max ₹1L" : "Disabled"}
                          </span>
                          <Form.Check
                            type="switch"
                            id={`adv-sw-${empCode}`}
                            checked={advEnabled}
                            disabled={!isAccountsUser}
                            className="ms-1"
                            onChange={(e) => handleCellChange(empCode, "facilities.advance", e.target.checked)}
                          />
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Amt:</span>
                          <input
                            type="number"
                            min="0"
                            max="100000"
                            className="mat-cell-input"
                            style={{ width: "75px", borderColor: advExceeds ? "#ef4444" : "#cbd5e1" }}
                            disabled={!isAccountsUser || !advEnabled}
                            value={advAmount || ""}
                            onChange={(e) => handleCellChange(empCode, "advance.amount", parseFloat(e.target.value) || 0)}
                            placeholder="≤ 100k"
                          />
                          <span className="text-muted small ms-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Rec:</span>
                          <input
                            type="number"
                            min="0"
                            className="mat-cell-input"
                            style={{ width: "65px", borderColor: advRecoveryInvalid ? "#ef4444" : "#cbd5e1" }}
                            disabled={!isAccountsUser || !advEnabled}
                            value={advDeduction || ""}
                            onChange={(e) => handleCellChange(empCode, "advance.deduction", parseFloat(e.target.value) || 0)}
                            placeholder="Monthly"
                          />
                        </div>
                        {advExceeds && (
                          <div className="text-danger small mt-0.5" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                            Max ₹1,00,000 allowed
                          </div>
                        )}
                        {advRecoveryInvalid && (
                          <div className="text-danger small mt-0.5" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                            Recovery &gt; Principal
                          </div>
                        )}
                      </td>

                      {/* 9. Loan (1L to 10L Strict Check) */}
                      <td style={{ width: "220px", minWidth: "220px", whiteSpace: "nowrap" }} className={`border-end ${loanInvalid ? "bg-warning-subtle" : ""}`}>
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className="mat-chip"
                            style={{
                              background: loanEnabled ? "#fef7e0" : "#f1f5f9",
                              color: loanEnabled ? "#b06000" : "#64748b",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {loanEnabled ? "1L–10L" : "Disabled"}
                          </span>
                          <Form.Check
                            type="switch"
                            id={`loan-sw-${empCode}`}
                            checked={loanEnabled}
                            disabled={!isAccountsUser}
                            className="ms-1"
                            onChange={(e) => handleCellChange(empCode, "facilities.loan", e.target.checked)}
                          />
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Amt:</span>
                          <input
                            type="number"
                            min="100000"
                            max="1000000"
                            className="mat-cell-input"
                            style={{ width: "75px", borderColor: loanInvalid ? "#f59e0b" : "#cbd5e1" }}
                            disabled={!isAccountsUser || !loanEnabled}
                            value={loanAmount || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleCellChange(empCode, "loan.amount", val);
                              if (val > 0) {
                                const newEmi = calculateEMI(val, loanInterest, loanTenure);
                                handleCellChange(empCode, "loan.emi", newEmi);
                              }
                            }}
                            placeholder="1L-10L"
                          />
                          <span className="text-muted small ms-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>EMI:</span>
                          <input
                            type="number"
                            className="mat-cell-input"
                            style={{ width: "65px" }}
                            disabled={!isAccountsUser || !loanEnabled}
                            value={loanEmi || ""}
                            onChange={(e) => handleCellChange(empCode, "loan.emi", parseFloat(e.target.value) || 0)}
                            placeholder="EMI"
                          />
                        </div>
                        {loanInvalid && (
                          <div className="text-warning text-dark small mt-0.5" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                            Must be ₹1L to ₹10L
                          </div>
                        )}
                      </td>

                      {/* 10. Interest % */}
                      <td style={{ width: "130px", minWidth: "130px", whiteSpace: "nowrap" }} className="border-end">
                        <div className="d-flex align-items-center gap-1 mb-1" style={{ whiteSpace: "nowrap" }}>
                          <input
                            type="number"
                            step="0.1"
                            className="mat-cell-input"
                            style={{ width: "55px" }}
                            disabled={!isAccountsUser || !loanEnabled}
                            value={loanInterest}
                            onChange={(e) => {
                              const r = parseFloat(e.target.value) || 0;
                              handleCellChange(empCode, "loan.interest_rate", r);
                              if (loanAmount > 0) {
                                const newEmi = calculateEMI(loanAmount, r, loanTenure);
                                handleCellChange(empCode, "loan.emi", newEmi);
                              }
                            }}
                          />
                          <span className="text-muted small" style={{ fontSize: "11px" }}>%</span>
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-muted small" style={{ fontSize: "10px", whiteSpace: "nowrap" }}>Tenure:</span>
                          <input
                            type="number"
                            className="mat-cell-input"
                            style={{ width: "45px" }}
                            disabled={!isAccountsUser || !loanEnabled}
                            value={loanTenure}
                            onChange={(e) => {
                              const t = parseInt(e.target.value) || 24;
                              handleCellChange(empCode, "loan.tenure_months", t);
                              if (loanAmount > 0) {
                                const newEmi = calculateEMI(loanAmount, loanInterest, t);
                                handleCellChange(empCode, "loan.emi", newEmi);
                              }
                            }}
                          />
                          <span className="text-muted small" style={{ fontSize: "10px" }}>mo</span>
                        </div>
                      </td>

                      {/* 11. Insurance */}
                      <td style={{ width: "150px", minWidth: "150px", whiteSpace: "nowrap" }} className="border-end">
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className="mat-chip"
                            style={{
                              background: insEnabled ? "#e6f4ea" : "#f1f5f9",
                              color: insEnabled ? "#137333" : "#64748b",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {insEnabled ? "Active" : "Disabled"}
                          </span>
                          <Form.Check
                            type="switch"
                            id={`ins-sw-${empCode}`}
                            checked={insEnabled}
                            disabled={!isAccountsUser}
                            className="ms-1"
                            onChange={(e) => handleCellChange(empCode, "facilities.insurance", e.target.checked)}
                          />
                        </div>
                        <div className="d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                          <span className="text-muted small" style={{ fontSize: "11px" }}>₹</span>
                          <input
                            type="number"
                            className="mat-cell-input w-100"
                            disabled={!isAccountsUser || !insEnabled}
                            value={insDeduction || ""}
                            onChange={(e) => handleCellChange(empCode, "insurance.deduction", parseFloat(e.target.value) || 0)}
                            placeholder="Premium"
                          />
                        </div>
                      </td>

                      {/* 12. Gratuity (Act 1972) */}
                      <td style={{ width: "180px", minWidth: "180px", whiteSpace: "nowrap" }} className="border-end">
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ whiteSpace: "nowrap" }}>
                          <span
                            className="mat-chip"
                            style={{
                              background: r.employment_type?.toLowerCase() === "permanent" ? "#f1f5f9" : "#fff7ed",
                              color: r.employment_type?.toLowerCase() === "permanent" ? "#1e293b" : "#c2410c",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {r.employment_type || "Permanent"}
                          </span>
                          <Form.Check
                            type="switch"
                            id={`grat-sw-${empCode}`}
                            checked={gratEnabled}
                            disabled={!isAccountsUser || r.employment_type?.toLowerCase() !== "permanent"}
                            className="ms-1"
                            onChange={(e) => handleCellChange(empCode, "facilities.gratuity", e.target.checked)}
                          />
                        </div>
                        <div className="d-flex justify-content-between small text-muted" style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>
                          <span>Monthly Accrual:</span>
                          <strong className="text-success">{fmt(gratAccrual)}</strong>
                        </div>
                        <div className="d-flex justify-content-between small text-muted" style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>
                          <span>Entitlement:</span>
                          <strong className="text-dark">{fmt(gratTotal)}</strong>
                        </div>
                      </td>

                      {/* 13. Applicable Amount */}
                      <td style={{ width: "130px", minWidth: "130px", textAlign: "right", whiteSpace: "nowrap" }} className="border-end fw-semibold text-primary">
                        {fmt(liveApplicableContribution)}
                      </td>

                      {/* 14. Total Deduction */}
                      <td style={{ width: "130px", minWidth: "130px", textAlign: "right", whiteSpace: "nowrap" }} className="border-end fw-bold text-danger">
                        {fmt(liveTotalDeductions)}
                      </td>

                      {/* 15. Action */}
                      <td style={{ width: "95px", minWidth: "95px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {isAccountsUser ? (
                          <button
                            type="button"
                            className="btn btn-sm mat-btn shadow-xs"
                            style={{
                              background: isDirty ? "#1976d2" : "#ffffff",
                              color: isDirty ? "#ffffff" : "#475569",
                              border: isDirty ? "1px solid #1976d2" : "1px solid #cbd5e1",
                              padding: "3px 10px",
                              fontSize: "11px",
                            }}
                            disabled={saving}
                            onClick={() => handleSaveRow(r)}
                          >
                            {saving ? <Spinner animation="border" size="sm" /> : isDirty ? "Save" : "Saved"}
                          </button>
                        ) : (
                          <span className="text-muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                            🔒 View
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* ══ MODAL: GLOBAL ESI & COMPANY LOAN INTEREST SETTINGS ══ */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} centered size="md">
        <Modal.Header closeButton className="px-4 py-3 border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark" style={{ whiteSpace: "nowrap" }}>
            Company Facilities & Statutory Rules
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-dark">
              1. Global ESI Threshold Slab (₹)
            </Form.Label>
            <div className="d-flex align-items-center border rounded-2 px-2 bg-white" style={{ height: "36px" }}>
              <span className="text-muted me-1">₹</span>
              <input
                type="number"
                className="border-0 bg-transparent w-100"
                style={{ outline: "none", fontSize: "13px" }}
                value={globalEsiThreshold}
                onChange={(e) => setGlobalEsiThreshold(parseFloat(e.target.value) || 21000)}
              />
            </div>
            <Form.Text className="text-muted small !text-xs">
              Employees with monthly gross salary up to this cutoff are subject to statutory ESI (0.75%). Beyond this cutoff, corporate Mediclaim is applicable.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-dark">
              2. Company Standard Loan Interest Rate (% p.a.)
            </Form.Label>
            <div className="d-flex align-items-center border rounded-2 px-2 bg-white" style={{ height: "36px" }}>
              <input
                type="number"
                step="0.1"
                className="border-0 bg-transparent w-100"
                style={{ outline: "none", fontSize: "13px" }}
                value={companyInterestRate}
                onChange={(e) => setCompanyInterestRate(parseFloat(e.target.value) || 8.5)}
              />
              <span className="text-muted ms-1">%</span>
            </div>
            <Form.Text className="text-muted small !text-xs">
              Standard annual company interest rate for employee loans. Used to auto-calculate monthly EMI.
            </Form.Text>
          </Form.Group>

          <div className="p-3 bg-light rounded-3 small">
            <div className="fw-semibold text-dark mb-1">Mediclaim Role Tier Conditions:</div>
            <ul className="mb-0 ps-3 text-muted" style={{ fontSize: "11px" }}>
              <li>Executive / Associate: <strong>2 Lakhs (₹2,00,000)</strong></li>
              <li>Assistant Manager: <strong>3 Lakhs (₹3,00,000)</strong></li>
              <li>Manager / Team Lead: <strong>4 Lakhs (₹4,00,000)</strong></li>
              <li>Deputy General Manager: <strong>5 Lakhs (₹5,00,000)</strong></li>
              <li>General Manager: <strong>6 Lakhs (₹6,00,000)</strong></li>
              <li>Vice President: <strong>7 Lakhs (₹7,00,000)</strong></li>
              <li>CEO / Managing Director: <strong>20 Lakhs (₹20,00,000)</strong></li>
            </ul>
            <Button
              size="sm"
              variant="outline-primary"
              className="w-100 mt-2.5 d-flex align-items-center justify-content-center gap-1.5"
              onClick={() => {
                setShowSettingsModal(false);
                setShowEsiAuditModal(true);
              }}
            >
              <span>🛡️</span>
              <span>Open Detailed ESI Slab & Contribution Periods Audit</span>
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer className="px-4 py-2.5 border-top">
          <Button variant="outline-secondary" size="sm" onClick={() => setShowSettingsModal(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={savingSettings}
            onClick={handleSaveSettings}
          >
            {savingSettings ? "Updating..." : "Save Company Rules"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══ DETAILED ESI SLAB CONFIGURATION & STATUTORY AUDIT MODAL ══ */}
      <EsiSlabAuditModal
        show={showEsiAuditModal}
        onHide={() => setShowEsiAuditModal(false)}
        canEdit={isAccountsUser}
        role={userRole}
        onSaved={async (newThresh) => {
          if (newThresh) setGlobalEsiThreshold(newThresh);
          await fetchFacilitiesData();
          if (onFacilitiesUpdated) onFacilitiesUpdated();
        }}
      />
    </div>
  );
}
