import React, { useState, useEffect, useMemo } from "react";
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
  Tabs,
  Tab,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LuReceipt,
  LuShieldCheck,
  LuCalculator,
  LuDownload,
  LuUpload,
  LuFileText,
  LuTrash2,
  LuCircleCheck,
  LuClock,
  LuSearch,
  LuEye,
  LuBuilding,
  LuSparkles,
  LuCheck,
  LuRefreshCw,
  LuUserCheck,
} from "react-icons/lu";
import api, { getUploadUrl } from "../../api";
import { calculateTax } from "../../utils/taxCalculator";

const fmt = (v) => {
  const num = typeof v === "number" ? v : parseFloat(String(v || 0).replace(/[^\d.-]/g, ""));
  const valid = isNaN(num) ? 0 : num;
  return (
    "₹" +
    valid.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
};

const fmtPdf = (v) => {
  const num = typeof v === "number" ? v : parseFloat(String(v || 0).replace(/[^\d.-]/g, ""));
  const valid = isNaN(num) ? 0 : num;
  return (
    "Rs. " +
    valid.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
};

const FY_OPTIONS = ["2025-2026", "2026-2027", "2024-2025"];

export default function IT_Declaration() {
  const navigate = useNavigate();

  // Active user auth info
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "employee").toLowerCase();
  const isAdminRole = ["hr", "accounts", "admin", "payroll"].includes(role);

  // View mode tab for Admin/HR/Accounts: "my" vs "admin_desk"
  const [activeTab, setActiveTab] = useState(isAdminRole ? "admin_desk" : "my");

  // Selected Financial Year
  const [financialYear, setFinancialYear] = useState("2025-2026");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Employee details from API
  const [employeeInfo, setEmployeeInfo] = useState({
    name: localStorage.getItem("userName") || "Employee",
    employee_id: localStorage.getItem("empId") || "N/A",
    dept: "Engineering",
    designation: "Software Engineer",
    pan: "",
    current_salary: 0,
    annual_gross: 0,
    annual_basic: 0,
    annual_hra: 0,
  });

  // Chosen Regime: "new" or "old"
  const [regime, setRegime] = useState("new");
  const [declarationStatus, setDeclarationStatus] = useState("Draft");
  const [submissionDate, setSubmissionDate] = useState(null);
  const [declarationId, setDeclarationId] = useState(null);
  const [reviewerRemarks, setReviewerRemarks] = useState("");

  // Section 80C form items
  const [sec80C, setSec80C] = useState({
    lic: 0,
    ppf: 0,
    epf_vpf: 0,
    elss: 0,
    nsc: 0,
    ssy: 0,
    ulip: 0,
    tax_saving_fd: 0,
    tuition_fees: 0,
    home_loan_principal: 0,
    stamp_duty: 0,
  });

  // Section 80CCD(1B) NPS
  const [sec80CCD, setSec80CCD] = useState({
    nps_additional: 0,
  });

  // Section 80D Health Insurance
  const [sec80D, setSec80D] = useState({
    self_spouse_children: 0,
    self_senior: false,
    parents: 0,
    parents_senior: false,
    preventive_health_checkup: 0,
  });

  // Section 24(b) Home Loan Interest
  const [sec24, setSec24] = useState({
    interest_paid: 0,
    property_type: "self_occupied",
    lender_name: "",
    lender_pan: "",
  });

  // Section 10(13A) House Rent Allowance
  const [secHRA, setSecHRA] = useState({
    annual_rent_paid: 0,
    monthly_rent: 0,
    city_type: "non_metro",
    landlord_name: "",
    landlord_pan: "",
    rental_address: "",
  });

  // Other Chapter VI-A Deductions
  const [otherDeductions, setOtherDeductions] = useState({
    sec_80e_edu_loan: 0,
    sec_80g_donations: 0,
    sec_80tta_savings_interest: 0,
    sec_80u_disability: 0,
    sec_80dd_dependent_disability: 0,
  });

  // Other Income / Previous Employer
  const [otherIncome, setOtherIncome] = useState({
    previous_employer_income: 0,
    previous_employer_tds: 0,
    savings_interest_income: 0,
    other_sources_income: 0,
  });

  // Proof Attachments
  const [proofs, setProofs] = useState([]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofCategory, setProofCategory] = useState("Section 80C");
  const [selectedProofFile, setSelectedProofFile] = useState(null);

  // Admin Desk State
  const [adminDeclarations, setAdminDeclarations] = useState([]);
  const [adminStats, setAdminStats] = useState({
    total_employees: 0,
    total_declared: 0,
    submitted: 0,
    approved: 0,
    drafts: 0,
    pending_review: 0,
    new_regime_count: 0,
    old_regime_count: 0,
  });
  const [adminSearch, setAdminSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regimeFilter, setRegimeFilter] = useState("all");
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Admin Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeclForReview, setSelectedDeclForReview] = useState(null);
  const [reviewActionRemarks, setReviewActionRemarks] = useState("");
  const [reviewingAction, setReviewingAction] = useState(false);

  // Live Tax Calculation Engine
  const liveCalculation = useMemo(() => {
    return calculateTax({
      annualGrossSalary: employeeInfo.annual_gross || 0,
      annualBasicSalary: employeeInfo.annual_basic || 0,
      annualHRA: employeeInfo.annual_hra || 0,
      section80c: sec80C,
      section80ccd: sec80CCD,
      section80d: sec80D,
      section24: sec24,
      hraDetails: secHRA,
      otherDeductions,
      otherIncome,
      financialYear,
    });
  }, [
    employeeInfo.annual_gross,
    employeeInfo.annual_basic,
    employeeInfo.annual_hra,
    sec80C,
    sec80CCD,
    sec80D,
    sec24,
    secHRA,
    otherDeductions,
    otherIncome,
    financialYear,
  ]);

  // Total 80C sum
  const total80CSum = useMemo(() => {
    return Object.values(sec80C).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [sec80C]);

  // Load My Declaration
  const fetchMyDeclaration = async (fy) => {
    try {
      setLoading(true);
      const res = await api.get(`/it-declaration/my?financial_year=${fy}`);
      if (res.data.success) {
        const d = res.data;
        setEmployeeInfo((prev) => ({
          ...prev,
          ...d.employee,
          pan: d.employee?.pan || prev.pan,
        }));

        if (d.declaration) {
          const decl = d.declaration;
          setDeclarationId(decl.id);
          setRegime(decl.regime || "new");
          setDeclarationStatus(decl.status || "Draft");
          setSubmissionDate(decl.submission_date);
          setReviewerRemarks(decl.remarks || "");

          if (decl.section_80c) setSec80C((prev) => ({ ...prev, ...decl.section_80c }));
          if (decl.section_80ccd_1b) setSec80CCD((prev) => ({ ...prev, ...decl.section_80ccd_1b }));
          if (decl.section_80d) setSec80D((prev) => ({ ...prev, ...decl.section_80d }));
          if (decl.section_24_home_loan) setSec24((prev) => ({ ...prev, ...decl.section_24_home_loan }));
          if (decl.section_hra) setSecHRA((prev) => ({ ...prev, ...decl.section_hra }));
          if (decl.other_deductions) setOtherDeductions((prev) => ({ ...prev, ...decl.other_deductions }));
          if (decl.other_income) setOtherIncome((prev) => ({ ...prev, ...decl.other_income }));
          if (decl.proof_attachments) setProofs(decl.proof_attachments || []);
        } else {
          setDeclarationId(null);
          setDeclarationStatus("Draft");
          setSubmissionDate(null);
          setReviewerRemarks("");
          setProofs([]);
        }
      }
    } catch (err) {
      console.error("Failed to load IT declaration:", err);
      toast.error("Failed to load your IT Declaration data");
    } finally {
      setLoading(false);
    }
  };

  // Load Admin Desk Declarations
  const fetchAdminDeclarations = async (fy) => {
    try {
      setLoadingAdmin(true);
      const res = await api.get(`/it-declaration/all?financial_year=${fy}`);
      if (res.data.success) {
        setAdminDeclarations(res.data.declarations || []);
        setAdminStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch admin declarations:", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchMyDeclaration(financialYear);
    if (isAdminRole) {
      fetchAdminDeclarations(financialYear);
    }
  }, [financialYear]);

  // Handle saving draft or submission
  const handleSave = async (actionType) => {
    try {
      setSaving(true);
      const payload = {
        financial_year: financialYear,
        regime,
        action: actionType, // "draft" | "submit"
        section_80c: sec80C,
        section_80ccd_1b: sec80CCD,
        section_80d: sec80D,
        section_24_home_loan: sec24,
        section_hra: secHRA,
        other_deductions: otherDeductions,
        other_income: otherIncome,
      };

      const res = await api.post("/it-declaration/save", payload);
      if (res.data.success) {
        toast.success(res.data.message || "Declaration saved successfully");
        setDeclarationStatus(res.data.declaration?.status || (actionType === "submit" ? "Submitted" : "Draft"));
        if (actionType === "submit") {
          setSubmissionDate(new Date());
        }
        if (res.data.declaration?.id) {
          setDeclarationId(res.data.declaration.id);
        }
        if (isAdminRole) {
          fetchAdminDeclarations(financialYear);
        }
      }
    } catch (err) {
      console.error("Error saving declaration:", err);
      toast.error(err.response?.data?.error || "Failed to save declaration");
    } finally {
      setSaving(false);
    }
  };

  // Proof Document Upload Handler
  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!selectedProofFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append("proof_file", selectedProofFile);
      formData.append("category", proofCategory);
      formData.append("declaration_id", declarationId || "");

      const res = await api.post("/it-declaration/upload-proof", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Proof document attached successfully");
        setProofs(res.data.proofs || []);
        setSelectedProofFile(null);
        // Reset file input
        const fileInput = document.getElementById("proofFileInput");
        if (fileInput) fileInput.value = "";
      }
    } catch (err) {
      console.error("Proof upload failed:", err);
      toast.error("Failed to upload proof document");
    } finally {
      setUploadingProof(false);
    }
  };

  // Delete Proof Document Handler
  const handleDeleteProof = async (proofId) => {
    if (!declarationId) return;
    if (!window.confirm("Are you sure you want to delete this proof document?")) return;

    try {
      const res = await api.delete(`/it-declaration/delete-proof/${declarationId}/${proofId}`);
      if (res.data.success) {
        toast.success("Proof document deleted");
        setProofs(res.data.proofs || []);
      }
    } catch (err) {
      console.error("Failed to delete proof:", err);
      toast.error("Could not delete proof document");
    }
  };

  // Admin Review / Verify Handler
  const handleAdminReview = async (newStatus) => {
    if (!selectedDeclForReview) return;
    try {
      setReviewingAction(true);
      const res = await api.patch(`/it-declaration/${selectedDeclForReview.id}/review`, {
        status: newStatus,
        remarks: reviewActionRemarks,
      });

      if (res.data.success) {
        toast.success(`Declaration marked as ${newStatus}`);
        setReviewModalOpen(false);
        setSelectedDeclForReview(null);
        fetchAdminDeclarations(financialYear);
      }
    } catch (err) {
      console.error("Review action error:", err);
      toast.error("Failed to update declaration review status");
    } finally {
      setReviewingAction(false);
    }
  };

  // Download Declaration Summary PDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const currentTaxInfo = regime === "old" ? liveCalculation.old_regime : liveCalculation.new_regime;

      // Header Banner
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 30, "F");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text("ZENTELEX - INCOME TAX DECLARATION FORM", 14, 14);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(203, 213, 225);
      doc.text(`Financial Year: ${financialYear} (AY: ${parseInt(financialYear) + 1}-${parseInt(financialYear.split("-")[1]) + 1})`, 14, 22);
      doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 196, 22, { align: "right" });

      // Employee Information Box
      autoTable(doc, {
        startY: 36,
        theme: "plain",
        margin: { left: 14, right: 14 },
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
          textColor: [51, 65, 85],
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: "bold", textColor: [100, 116, 139] },
          1: { cellWidth: 53, fontStyle: "normal", textColor: [15, 23, 42] },
          2: { cellWidth: 38, fontStyle: "bold", textColor: [100, 116, 139] },
          3: { cellWidth: 53, fontStyle: "normal", textColor: [15, 23, 42] },
        },
        body: [
          [
            "Employee Code:",
            employeeInfo.employee_id || "N/A",
            "Employee Name:",
            employeeInfo.name || "N/A",
          ],
          [
            "Department:",
            employeeInfo.dept || "N/A",
            "Designation:",
            employeeInfo.designation || "N/A",
          ],
          [
            "PAN Card Number:",
            employeeInfo.pan || "Not Available",
            "Selected Tax Regime:",
            `${regime.toUpperCase()} REGIME`,
          ],
          [
            "Estimated Gross CTC:",
            fmtPdf(employeeInfo.annual_gross),
            "Declaration Status:",
            declarationStatus.toUpperCase(),
          ],
        ],
      });

      // Draw subtle border around employee details box
      const empTableFinalY = doc.lastAutoTable.finalY;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, 34, 182, empTableFinalY - 32, 2, 2, "S");

      // Section title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Tax Computation & TDS Estimation Overview", 14, empTableFinalY + 8);

      // Tax Computation Overview Table
      const tableBody = [
        ["Annual Gross Salary", fmtPdf(employeeInfo.annual_gross)],
        ["Less: Standard Deduction", fmtPdf(currentTaxInfo.standard_deduction)],
        ["Less: HRA Exemption u/s 10(13A)", regime === "old" ? fmtPdf(currentTaxInfo.hra_exemption) : "Not Applicable in New Regime"],
        ["Less: Section 24 Home Loan Interest", regime === "old" ? fmtPdf(currentTaxInfo.section_24_home_loan) : "Not Applicable in New Regime"],
        ["Less: Section 80C Investments (Capped at 1.5 Lakh)", regime === "old" ? fmtPdf(currentTaxInfo.section_80c) : "Not Applicable in New Regime"],
        ["Less: Section 80CCD(1B) NPS (Capped at 50k)", regime === "old" ? fmtPdf(currentTaxInfo.section_80ccd_1b) : "Not Applicable in New Regime"],
        ["Less: Section 80D Health Insurance", regime === "old" ? fmtPdf(currentTaxInfo.section_80d) : "Not Applicable in New Regime"],
        ["Less: Other Chapter VI-A Deductions", regime === "old" ? fmtPdf(currentTaxInfo.other_chapter_vi_a) : "Not Applicable in New Regime"],
        [
          { content: "Total Eligible Deductions & Exemptions", styles: { fontStyle: "bold", fillColor: [248, 250, 252] } },
          { content: fmtPdf(currentTaxInfo.total_deductions), styles: { fontStyle: "bold", fillColor: [248, 250, 252] } }
        ],
        [
          { content: "Net Taxable Income", styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
          { content: fmtPdf(currentTaxInfo.net_taxable_income), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } }
        ],
        ["Calculated Income Tax (Before Rebate)", fmtPdf(currentTaxInfo.slab_tax)],
        ["Less: Rebate u/s 87A", fmtPdf(currentTaxInfo.rebate_87a)],
        ["Add: Health & Education Cess (4%)", fmtPdf(currentTaxInfo.cess)],
        [
          { content: "Total Annual Tax Liability", styles: { fontStyle: "bold", textColor: [185, 28, 28], fillColor: [254, 242, 242] } },
          { content: fmtPdf(currentTaxInfo.total_annual_tax), styles: { fontStyle: "bold", textColor: [185, 28, 28], fillColor: [254, 242, 242] } }
        ],
        [
          { content: "Estimated Monthly TDS Deduction", styles: { fontStyle: "bold", textColor: [29, 78, 216], fillColor: [239, 246, 255] } },
          { content: fmtPdf(currentTaxInfo.monthly_tds), styles: { fontStyle: "bold", textColor: [29, 78, 216], fillColor: [239, 246, 255] } }
        ],
      ];

      autoTable(doc, {
        startY: empTableFinalY + 11,
        theme: "striped",
        margin: { left: 14, right: 14 },
        head: [["Tax Computation Component", "Declared Amount (INR)"]],
        body: tableBody,
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        },
        columnStyles: {
          0: { cellWidth: 124, halign: "left" },
          1: { cellWidth: 58, halign: "right" },
        },
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // Section 80C Breakdown if Old Regime
      if (regime === "old" && total80CSum > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 6,
          theme: "grid",
          margin: { left: 14, right: 14 },
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 124, halign: "left" },
            1: { cellWidth: 58, halign: "right" },
          },
          styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2 },
          head: [["Section 80C Investment Item", "Amount Declared (INR)"]],
          body: [
            ["Life Insurance Premium (LIC)", fmtPdf(sec80C.lic)],
            ["Public Provident Fund (PPF)", fmtPdf(sec80C.ppf)],
            ["Employee / Voluntary PF (EPF/VPF)", fmtPdf(sec80C.epf_vpf)],
            ["ELSS Mutual Funds", fmtPdf(sec80C.elss)],
            ["National Savings Certificate (NSC)", fmtPdf(sec80C.nsc)],
            ["Sukanya Samriddhi Yojana (SSY)", fmtPdf(sec80C.ssy)],
            ["Tax-Saving 5-Year Fixed Deposit", fmtPdf(sec80C.tax_saving_fd)],
            ["Children Tuition Fees", fmtPdf(sec80C.tuition_fees)],
            ["Home Loan Principal Repayment", fmtPdf(sec80C.home_loan_principal)],
            ["Stamp Duty & Registration", fmtPdf(sec80C.stamp_duty)],
            [{ content: "Total Section 80C Declared", styles: { fontStyle: "bold" } }, { content: fmtPdf(total80CSum), styles: { fontStyle: "bold" } }],
            [{ content: "Eligible Deduction (Capped u/s 80CCE)", styles: { fontStyle: "bold" } }, { content: fmtPdf(Math.min(150000, total80CSum)), styles: { fontStyle: "bold" } }],
          ],
        });
      }

      // Legal Declaration & Signature Box
      let finalY = doc.lastAutoTable.finalY + 8;
      const pageHeight = doc.internal.pageSize.getHeight();
      if (finalY + 42 > pageHeight - 10) {
        doc.addPage();
        finalY = 15;
      }

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, finalY, 182, 38, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Declaration: I hereby declare that the information provided above is true and correct to the best of my knowledge and belief. I understand that TDS will be deducted from my monthly salary based on this declaration in accordance with the provisions of the Income Tax Act, 1961. I undertake to submit requisite investment proofs / receipts when called upon by the company.",
        18,
        finalY + 6,
        { maxWidth: 174, lineHeightFactor: 1.3 }
      );

      doc.setDrawColor(203, 213, 225);
      doc.line(18, finalY + 28, 80, finalY + 28);
      doc.line(116, finalY + 28, 178, finalY + 28);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Employee Signature", 18, finalY + 33);
      doc.text("HR / Payroll Verification", 116, finalY + 33);

      doc.save(`IT_Declaration_${employeeInfo.employee_id || "Employee"}_${financialYear}.pdf`);
      toast.success("IT Declaration PDF downloaded successfully");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate declaration PDF");
    }
  };

  // Filtered Admin Declarations
  const filteredAdminDeclarations = useMemo(() => {
    return adminDeclarations.filter((d) => {
      const matchSearch =
        !adminSearch.trim() ||
        d.employee_id.toLowerCase().includes(adminSearch.toLowerCase()) ||
        d.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        d.dept.toLowerCase().includes(adminSearch.toLowerCase());

      const matchStatus = statusFilter === "all" || d.status.toLowerCase() === statusFilter.toLowerCase();
      const matchRegime = regimeFilter === "all" || d.regime.toLowerCase() === regimeFilter.toLowerCase();

      return matchSearch && matchStatus && matchRegime;
    });
  }, [adminDeclarations, adminSearch, statusFilter, regimeFilter]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-sm font-medium text-slate-600">Loading IT Declaration...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 pt-4 text-slate-800">
      <Container fluid className="max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top Header & Breadcrumb */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-2 bg-blue-600 text-white rounded-xl shadow-md">
                <LuReceipt className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Income Tax Declaration
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Submit planned investments and eligible deductions to optimize monthly TDS deductions.
                </p>
              </div>
            </div>
          </div>

          {/* Actions & Financial Year Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FY:</span>
              <Form.Select
                size="sm"
                className="border-0 bg-transparent font-semibold text-slate-800 focus:ring-0 cursor-pointer text-xs"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
              >
                {FY_OPTIONS.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </Form.Select>
            </div>

            {isAdminRole && (
              <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("admin_desk")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === "admin_desk"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Admin Desk
                  {adminStats.pending_review > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
                      {adminStats.pending_review}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("my")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === "my"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  My Declaration
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: ADMIN DESK TAB (For HR, Accounts, Admin, Payroll)                 */}
        {/* ========================================================================= */}
        {isAdminRole && activeTab === "admin_desk" ? (
          <div>
            {/* Stats Metrics Cards */}
            <Row className="g-3 mb-6">
              <Col xs={6} md={3}>
                <Card className="border-0 shadow-sm rounded-2xl p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Total Employees</p>
                      <h3 className="text-xl font-bold text-slate-800">{adminStats.total_employees || 0}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 mb-0">Active in system</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <LuBuilding className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card className="border-0 shadow-sm rounded-2xl p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Submitted</p>
                      <h3 className="text-xl font-bold text-slate-800">{adminStats.submitted || 0}</h3>
                      <p className="text-[11px] text-amber-600 font-medium mt-1 mb-0">Awaiting verification</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <LuClock className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card className="border-0 shadow-sm rounded-2xl p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Approved</p>
                      <h3 className="text-xl font-bold text-emerald-600">{adminStats.approved || 0}</h3>
                      <p className="text-[11px] text-emerald-600 font-medium mt-1 mb-0">TDS synced to payroll</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <LuCircleCheck className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card className="border-0 shadow-sm rounded-2xl p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Regime Ratio</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          New: {adminStats.new_regime_count || 0}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                          Old: {adminStats.old_regime_count || 0}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <LuCalculator className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Filter & Search Bar */}
            <Card className="border-0 shadow-sm rounded-2xl p-4 mb-4 bg-white">
              <Row className="g-3 items-center">
                <Col md={5}>
                  <div className="relative">
                    <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Form.Control
                      type="text"
                      placeholder="Search employee by code, name, department..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="pl-10 text-xs rounded-xl border-slate-200 py-2 focus:border-blue-500 focus:ring-blue-100"
                    />
                  </div>
                </Col>
                <Col sm={6} md={3}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                    <Form.Select
                      size="sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs rounded-xl border-slate-200"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Approved">Approved</option>
                      <option value="Draft">Draft</option>
                      <option value="Rejected">Rejected</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col sm={6} md={3}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Regime:</span>
                    <Form.Select
                      size="sm"
                      value={regimeFilter}
                      onChange={(e) => setRegimeFilter(e.target.value)}
                      className="text-xs rounded-xl border-slate-200"
                    >
                      <option value="all">All Regimes</option>
                      <option value="new">New Tax Regime</option>
                      <option value="old">Old Tax Regime</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col md={1} className="text-end">
                  <Button
                    variant="light"
                    size="sm"
                    className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                    onClick={() => fetchAdminDeclarations(financialYear)}
                    title="Refresh List"
                  >
                    <LuRefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Declarations Table */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table hover responsive className="mb-0 align-middle text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Employee</th>
                      <th className="py-3 px-3 font-semibold">Department</th>
                      <th className="py-3 px-3 font-semibold">Tax Regime</th>
                      <th className="py-3 px-3 font-semibold text-end">Annual Gross</th>
                      <th className="py-3 px-3 font-semibold text-end">Net Taxable</th>
                      <th className="py-3 px-3 font-semibold text-end">Est. Monthly TDS</th>
                      <th className="py-3 px-3 font-semibold text-center">Proofs</th>
                      <th className="py-3 px-3 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAdmin ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8">
                          <Spinner animation="border" size="sm" variant="primary" />
                          <p className="mt-2 text-xs text-slate-400">Loading declarations...</p>
                        </td>
                      </tr>
                    ) : filteredAdminDeclarations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-slate-400">
                          No employee IT declarations found for this criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminDeclarations.map((decl) => (
                        <tr key={decl.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{decl.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{decl.employee_id}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{decl.dept}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${decl.regime === "new"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                            >
                              {decl.regime === "new" ? "New Regime" : "Old Regime"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-end font-medium text-slate-700">
                            {fmt(decl.current_salary * 12)}
                          </td>
                          <td className="py-3 px-3 text-end font-medium text-slate-700">
                            {fmt(decl.taxable_income)}
                          </td>
                          <td className="py-3 px-3 text-end font-bold text-blue-700">
                            {fmt(decl.monthly_tds)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                              {decl.proofs_count || 0} files
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${decl.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : decl.status === "Submitted"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : decl.status === "Rejected"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                            >
                              {decl.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="rounded-lg text-xs py-1 px-2.5 font-medium mx-auto"
                              onClick={async () => {
                                try {
                                  const res = await api.get(`/it-declaration/${decl.id}`);
                                  if (res.data.success) {
                                    setSelectedDeclForReview(res.data.declaration);
                                    setReviewActionRemarks(res.data.declaration.remarks || "");
                                    setReviewModalOpen(true);
                                  }
                                } catch (e) {
                                  toast.error("Could not fetch declaration details");
                                }
                              }}
                            >
                              {/* <LuEye className="w-3.5 h-3.5" /> */}
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: EMPLOYEE SELF-SERVICE IT DECLARATION FORM                         */
          /* ========================================================================= */
          <div>
            {/* Status Header Banner */}
            <Card className="border-0 shadow-sm rounded-2xl mb-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 sm:p-6">
              <Row className="items-center g-4">
                <Col md={8}>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${declarationStatus === "Approved"
                          ? "bg-emerald-500 text-white"
                          : declarationStatus === "Submitted"
                            ? "bg-amber-400 text-slate-950"
                            : declarationStatus === "Rejected"
                              ? "bg-rose-500 text-white"
                              : "bg-slate-600 text-slate-200"
                        }`}
                    >
                      Status: {declarationStatus}
                    </span>
                    {submissionDate && (
                      <span className="text-xs text-slate-300">
                        Submitted on {new Date(submissionDate).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 text-white">
                    {employeeInfo.name} ({employeeInfo.employee_id})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mb-0">
                    PAN: <span className="font-mono text-amber-300">{employeeInfo.pan || "Not linked"}</span> • Department: {employeeInfo.dept} • CTC: {fmt(employeeInfo.annual_gross)}/yr
                  </p>
                  {reviewerRemarks && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/10 text-xs border border-white/10 text-amber-200">
                      <strong>HR/Payroll Remark:</strong> {reviewerRemarks}
                    </div>
                  )}
                </Col>

                <Col md={4} className="text-md-end flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline-light"
                    size="sm"
                    className="rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1.5"
                    onClick={handleDownloadPDF}
                  >
                    {/* <LuDownload className="w-3.5 h-3.5" /> */}
                    Download PDF
                  </Button>

                  <Button
                    variant="light"
                    size="sm"
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    disabled={saving || declarationStatus === "Approved"}
                    onClick={() => handleSave("draft")}
                  >
                    {saving ? <Spinner animation="border" size="sm" /> : "Save Draft"}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-xl px-4 py-2 text-xs font-bold bg-blue-500 hover:bg-blue-600 border-0 shadow-md"
                    disabled={saving || declarationStatus === "Approved"}
                    onClick={() => handleSave("submit")}
                  >
                    {saving ? <Spinner animation="border" size="sm" /> : "Submit Declaration"}
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* REGIME COMPARISON & SELECTION WIDGET */}
            <Card className="border-0 shadow-sm rounded-2xl mb-6 bg-white overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LuSparkles className="text-amber-500 w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-800 mb-0">
                    Tax Regime Recommendation & Comparison
                  </h3>
                </div>
                {liveCalculation.comparison?.savings > 0 && (
                  <Badge bg="success" className="px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-600">
                    🎉 You save {fmt(liveCalculation.comparison.savings)} with the{" "}
                    {liveCalculation.comparison.recommended_regime.toUpperCase()} Regime!
                  </Badge>
                )}
              </div>

              <Card.Body className="p-4 sm:p-6">
                <Row className="g-4">
                  {/* NEW REGIME CARD */}
                  <Col md={6}>
                    <div
                      onClick={() => setRegime("new")}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${regime === "new"
                          ? "border-blue-600 bg-blue-50/40 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="taxRegime"
                            checked={regime === "new"}
                            onChange={() => setRegime("new")}
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                          />
                          <h4 className="text-sm font-bold text-slate-900 mb-0">
                            New Tax Regime (u/s 115BAC)
                          </h4>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Default
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 mb-4 border-t border-b border-slate-200/60 py-3">
                        <div className="flex justify-between">
                          <span>Standard Deduction:</span>
                          <span className="font-semibold text-slate-800">{fmt(liveCalculation.new_regime?.standard_deduction)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chapter VI-A Deductions:</span>
                          <span className="text-slate-400">Not Allowed</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Taxable Income:</span>
                          <span className="font-semibold text-slate-800">{fmt(liveCalculation.new_regime?.net_taxable_income)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rebate u/s 87A (Nil tax up to ₹7L):</span>
                          <span className="font-semibold text-emerald-600">-{fmt(liveCalculation.new_regime?.rebate_87a)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0 font-medium">Estimated Monthly TDS</p>
                          <h3 className="text-lg font-bold text-blue-700 mb-0">{fmt(liveCalculation.new_regime?.monthly_tds)} / mo</h3>
                        </div>
                        <div className="text-end">
                          <p className="text-[11px] text-slate-500 mb-0">Total Annual Tax</p>
                          <span className="text-sm font-bold text-slate-800">{fmt(liveCalculation.new_regime?.total_annual_tax)}</span>
                        </div>
                      </div>
                    </div>
                  </Col>

                  {/* OLD REGIME CARD */}
                  <Col md={6}>
                    <div
                      onClick={() => setRegime("old")}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${regime === "old"
                          ? "border-purple-600 bg-purple-50/40 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="taxRegime"
                            checked={regime === "old"}
                            onChange={() => setRegime("old")}
                            className="w-4 h-4 text-purple-600 cursor-pointer"
                          />
                          <h4 className="text-sm font-bold text-slate-900 mb-0">
                            Old Tax Regime
                          </h4>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          Supports 80C & HRA
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 mb-4 border-t border-b border-slate-200/60 py-3">
                        <div className="flex justify-between">
                          <span>Standard Deduction:</span>
                          <span className="font-semibold text-slate-800">{fmt(liveCalculation.old_regime?.standard_deduction)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Eligible 80C + 80D + HRA Deductions:</span>
                          <span className="font-semibold text-emerald-600">
                            {fmt((liveCalculation.old_regime?.total_deductions || 0) - (liveCalculation.old_regime?.standard_deduction || 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Taxable Income:</span>
                          <span className="font-semibold text-slate-800">{fmt(liveCalculation.old_regime?.net_taxable_income)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rebate u/s 87A (Nil tax up to ₹5L):</span>
                          <span className="font-semibold text-emerald-600">-{fmt(liveCalculation.old_regime?.rebate_87a)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
                        <div>
                          <p className="text-[11px] text-slate-500 mb-0 font-medium">Estimated Monthly TDS</p>
                          <h3 className="text-lg font-bold text-purple-700 mb-0">{fmt(liveCalculation.old_regime?.monthly_tds)} / mo</h3>
                        </div>
                        <div className="text-end">
                          <p className="text-[11px] text-slate-500 mb-0">Total Annual Tax</p>
                          <span className="text-sm font-bold text-slate-800">{fmt(liveCalculation.old_regime?.total_annual_tax)}</span>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* ACCORDION / SECTIONS FOR TAX-SAVING INVESTMENTS */}
            <div className="space-y-6">
              {/* SECTION 1: 80C INVESTMENTS */}
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      80C
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-0">
                        Section 80C, 80CCC & 80CCD(1) Investments
                      </h4>
                      <p className="text-xs text-slate-400 mb-0">
                        Maximum deductible limit: ₹1,50,000 per financial year.
                      </p>
                    </div>
                  </div>

                  <div className="text-sm-end min-w-[200px]">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Declared: {fmt(total80CSum)}</span>
                      <span className="text-emerald-700">Eligible: {fmt(Math.min(150000, total80CSum))}</span>
                    </div>
                    <ProgressBar
                      now={Math.min(100, Math.round((total80CSum / 150000) * 100))}
                      variant={total80CSum >= 150000 ? "success" : "info"}
                      className="h-2 rounded-full"
                    />
                  </div>
                </div>

                <Card.Body className="p-4 sm:p-6">
                  <Row className="g-3 text-xs">
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Life Insurance Premium (LIC)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.lic || ""}
                        onChange={(e) => setSec80C({ ...sec80C, lic: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 25000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Public Provident Fund (PPF)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.ppf || ""}
                        onChange={(e) => setSec80C({ ...sec80C, ppf: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 50000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Employee / Voluntary PF (EPF/VPF)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.epf_vpf || ""}
                        onChange={(e) => setSec80C({ ...sec80C, epf_vpf: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 43200"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">ELSS Mutual Funds (Tax-Saver)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.elss || ""}
                        onChange={(e) => setSec80C({ ...sec80C, elss: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 30000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Children Tuition Fees (Up to 2 children)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.tuition_fees || ""}
                        onChange={(e) => setSec80C({ ...sec80C, tuition_fees: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 40000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Home Loan Principal Repayment</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.home_loan_principal || ""}
                        onChange={(e) => setSec80C({ ...sec80C, home_loan_principal: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 60000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Tax Saving 5-Year FD</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.tax_saving_fd || ""}
                        onChange={(e) => setSec80C({ ...sec80C, tax_saving_fd: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 20000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">National Savings Certificate (NSC)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.nsc || ""}
                        onChange={(e) => setSec80C({ ...sec80C, nsc: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 15000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={4}>
                      <Form.Label className="font-semibold text-slate-700">Stamp Duty & Property Registration</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={sec80C.stamp_duty || ""}
                        onChange={(e) => setSec80C({ ...sec80C, stamp_duty: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 50000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* SECTION 2: HRA EXEMPTION (SEC 10(13A)) */}
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
                      HRA
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-0">
                        House Rent Allowance (HRA) Exemption u/s 10(13A)
                      </h4>
                      <p className="text-xs text-slate-400 mb-0">
                        Calculated as the lowest of actual HRA, 50%/40% of basic, or rent paid minus 10% of basic.
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="text-xs font-semibold text-slate-500">Calculated Exemption: </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {fmt(liveCalculation.old_regime?.hra_exemption)}
                    </span>
                  </div>
                </div>

                <Card.Body className="p-4 sm:p-6">
                  <Row className="g-3 text-xs">
                    <Col sm={6} md={3}>
                      <Form.Label className="font-semibold text-slate-700">Annual Rent Paid (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={secHRA.annual_rent_paid || ""}
                        onChange={(e) => setSecHRA({ ...secHRA, annual_rent_paid: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 180000"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={3}>
                      <Form.Label className="font-semibold text-slate-700">Rental City Type</Form.Label>
                      <Form.Select
                        value={secHRA.city_type}
                        onChange={(e) => setSecHRA({ ...secHRA, city_type: e.target.value })}
                        className="rounded-xl text-xs py-2"
                      >
                        <option value="non_metro">Non-Metro (40% Basic Cap)</option>
                        <option value="metro">Metro: Delhi, Mumbai, Kolkata, Chennai (50% Cap)</option>
                      </Form.Select>
                    </Col>
                    <Col sm={6} md={3}>
                      <Form.Label className="font-semibold text-slate-700">Landlord Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={secHRA.landlord_name || ""}
                        onChange={(e) => setSecHRA({ ...secHRA, landlord_name: e.target.value })}
                        placeholder="Landlord full name"
                        className="rounded-xl text-xs py-2"
                      />
                    </Col>
                    <Col sm={6} md={3}>
                      <Form.Label className="font-semibold text-slate-700">
                        Landlord PAN {secHRA.annual_rent_paid > 100000 && <span className="text-rose-500">*</span>}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={secHRA.landlord_pan || ""}
                        onChange={(e) => setSecHRA({ ...secHRA, landlord_pan: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        className="rounded-xl text-xs py-2 font-mono uppercase"
                      />
                    </Col>
                    <Col xs={12}>
                      <Form.Label className="font-semibold text-slate-700">Rental Property Address</Form.Label>
                      <Form.Control
                        type="text"
                        value={secHRA.rental_address || ""}
                        onChange={(e) => setSecHRA({ ...secHRA, rental_address: e.target.value })}
                        placeholder="House / Flat number, Street, City, State, Pincode"
                        className="rounded-xl text-xs py-2"
                      />
                      {secHRA.annual_rent_paid > 100000 && !secHRA.landlord_pan && (
                        <p className="text-[11px] text-amber-600 mt-1.5 mb-0 font-medium">
                          ⚠️ As per CBDT rules, Landlord's PAN is mandatory if annual rent exceeds ₹1,00,000.
                        </p>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* SECTION 3: 80D HEALTH INSURANCE & SECTION 24 HOME LOAN */}
              <Row className="g-4">
                {/* 80D Medical Insurance */}
                <Col md={6}>
                  <Card className="border-0 shadow-sm rounded-2xl bg-white h-100">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-10 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                          80D
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-0">Health Insurance (80D)</h4>
                          <p className="text-[11px] text-slate-400 mb-0">Self, Family & Parents coverage</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">
                        {fmt(liveCalculation.old_regime?.section_80d)}
                      </span>
                    </div>

                    <Card.Body className="p-4 text-xs space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Form.Label className="font-semibold text-slate-700 mb-0">
                            Self, Spouse & Children Premium (₹)
                          </Form.Label>
                          <Form.Check
                            type="switch"
                            id="self-senior-switch"
                            label={<span className="text-[11px] text-slate-500">Senior (60+)</span>}
                            checked={sec80D.self_senior}
                            onChange={(e) => setSec80D({ ...sec80D, self_senior: e.target.checked })}
                          />
                        </div>
                        <Form.Control
                          type="number"
                          min="0"
                          value={sec80D.self_spouse_children || ""}
                          onChange={(e) => setSec80D({ ...sec80D, self_spouse_children: parseFloat(e.target.value) || 0 })}
                          placeholder={sec80D.self_senior ? "Max ₹50,000" : "Max ₹25,000"}
                          className="rounded-xl text-xs py-2"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Form.Label className="font-semibold text-slate-700 mb-0">
                            Parents Medical Premium (₹)
                          </Form.Label>
                          <Form.Check
                            type="switch"
                            id="parents-senior-switch"
                            label={<span className="text-[11px] text-slate-500">Senior (60+)</span>}
                            checked={sec80D.parents_senior}
                            onChange={(e) => setSec80D({ ...sec80D, parents_senior: e.target.checked })}
                          />
                        </div>
                        <Form.Control
                          type="number"
                          min="0"
                          value={sec80D.parents || ""}
                          onChange={(e) => setSec80D({ ...sec80D, parents: parseFloat(e.target.value) || 0 })}
                          placeholder={sec80D.parents_senior ? "Max ₹50,000" : "Max ₹25,000"}
                          className="rounded-xl text-xs py-2"
                        />
                      </div>

                      <div>
                        <Form.Label className="font-semibold text-slate-700">
                          Preventive Health Checkup (Max ₹5,000 within cap)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={sec80D.preventive_health_checkup || ""}
                          onChange={(e) => setSec80D({ ...sec80D, preventive_health_checkup: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 5000"
                          className="rounded-xl text-xs py-2"
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Section 24 Home Loan & 80CCD NPS */}
                <Col md={6}>
                  <Card className="border-0 shadow-sm rounded-2xl bg-white h-100">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-14 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          Sec 24
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-0">Home Loan Interest & NPS</h4>
                          <p className="text-[11px] text-slate-400 mb-0">Housing loan loss & additional NPS</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">
                        {fmt((liveCalculation.old_regime?.section_24_home_loan || 0) + (liveCalculation.old_regime?.section_80ccd_1b || 0))}
                      </span>
                    </div>

                    <Card.Body className="p-4 text-xs space-y-3">
                      <div>
                        <Form.Label className="font-semibold text-slate-700">
                          Home Loan Interest Paid u/s 24(b) (Max ₹2,00,000)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={sec24.interest_paid || ""}
                          onChange={(e) => setSec24({ ...sec24, interest_paid: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 150000"
                          className="rounded-xl text-xs py-2"
                        />
                      </div>

                      <Row className="g-2">
                        <Col sm={6}>
                          <Form.Label className="font-semibold text-slate-700">Lender Bank Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={sec24.lender_name || ""}
                            onChange={(e) => setSec24({ ...sec24, lender_name: e.target.value })}
                            placeholder="e.g. SBI, HDFC"
                            className="rounded-xl text-xs py-2"
                          />
                        </Col>
                        <Col sm={6}>
                          <Form.Label className="font-semibold text-slate-700">Lender PAN</Form.Label>
                          <Form.Control
                            type="text"
                            value={sec24.lender_pan || ""}
                            onChange={(e) => setSec24({ ...sec24, lender_pan: e.target.value.toUpperCase() })}
                            placeholder="Bank PAN"
                            className="rounded-xl text-xs py-2 uppercase font-mono"
                          />
                        </Col>
                      </Row>

                      <div>
                        <Form.Label className="font-semibold text-slate-700">
                          Section 80CCD(1B) - Additional NPS Contribution (Max ₹50,000)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={sec80CCD.nps_additional || ""}
                          onChange={(e) => setSec80CCD({ nps_additional: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g. 50000"
                          className="rounded-xl text-xs py-2"
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* SECTION 4: PROOF DOCUMENT ATTACHMENTS */}
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs">
                      <LuUpload className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-0">Investment Proofs & Receipts</h4>
                      <p className="text-xs text-slate-400 mb-0">
                        Attach rent receipts, insurance premium receipts, or loan interest certificates.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {proofs.length} Documents Attached
                  </span>
                </div>

                <Card.Body className="p-4 sm:p-6">
                  {/* Upload Form */}
                  <form onSubmit={handleUploadProof} className="mb-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <Row className="g-3 items-end">
                      <Col sm={4}>
                        <Form.Label className="font-semibold text-slate-700 text-xs">Document Category</Form.Label>
                        <Form.Select
                          size="sm"
                          value={proofCategory}
                          onChange={(e) => setProofCategory(e.target.value)}
                          className="rounded-xl text-xs"
                        >
                          <option value="Section 80C">Section 80C (LIC / PPF / ELSS)</option>
                          <option value="Section 80D">Section 80D (Health Insurance)</option>
                          <option value="HRA Rent Receipts">HRA Rent Receipts / Agreement</option>
                          <option value="Home Loan Certificate">Home Loan Interest Certificate</option>
                          <option value="NPS Tier 1">NPS 80CCD(1B) Statement</option>
                          <option value="Other Deductions">Other Exemptions / 80G</option>
                        </Form.Select>
                      </Col>

                      <Col sm={5}>
                        <Form.Label className="font-semibold text-slate-700 text-xs">Select File (PDF, PNG, JPG)</Form.Label>
                        <Form.Control
                          id="proofFileInput"
                          type="file"
                          size="sm"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setSelectedProofFile(e.target.files[0] || null)}
                          className="rounded-xl text-xs"
                        />
                      </Col>

                      <Col sm={3}>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          className="w-full rounded-xl text-xs py-2 font-semibold bg-blue-600 hover:bg-blue-700 border-0 flex items-center justify-center gap-1.5"
                          disabled={uploadingProof || !selectedProofFile}
                        >
                          {uploadingProof ? <Spinner animation="border" size="sm" /> : <>Attach Proof</>}
                        </Button>
                      </Col>
                    </Row>
                  </form>

                  {/* List of Attached Proofs */}
                  {proofs.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No proofs attached yet. You can attach proofs now or submit declarations initially and attach proofs before the tax verification deadline.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table hover responsive className="mb-0 align-middle text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">File Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3">Uploaded Date</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proofs.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2.5 px-3 font-medium text-slate-800 flex items-center gap-2">
                                <LuFileText className="text-blue-500 w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-[200px]" title={p.original_name}>
                                  {p.original_name}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                  {p.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {p.size ? (p.size / 1024).toFixed(0) + " KB" : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {p.upload_date ? new Date(p.upload_date).toLocaleDateString("en-IN") : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={getUploadUrl(p.filename)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-blue-600 hover:text-blue-800"
                                    title="View Proof"
                                  >
                                    <LuEye className="w-4 h-4" />
                                  </a>
                                  {declarationStatus !== "Approved" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProof(p.id)}
                                      className="p-1 text-rose-500 hover:text-rose-700"
                                      title="Delete Proof"
                                    >
                                      <LuTrash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        )}
      </Container>

      {/* ========================================================================= */}
      {/* ADMIN REVIEW & VERIFICATION MODAL                                         */}
      {/* ========================================================================= */}
      <Modal
        show={reviewModalOpen}
        onHide={() => setReviewModalOpen(false)}
        size="lg"
        centered
        className="rounded-2xl"
      >
        <Modal.Header closeButton className="border-slate-100 bg-slate-50 px-6 py-4">
          <Modal.Title className="text-base font-bold text-slate-900 flex items-center gap-2">
            <LuUserCheck className="text-blue-600 w-5 h-5" />
            Review IT Declaration: {selectedDeclForReview?.name} ({selectedDeclForReview?.employee_id})
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-6 text-xs text-slate-700 space-y-4">
          {selectedDeclForReview && (
            <>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Department</span>
                  <p className="text-xs font-bold text-slate-800 mb-0">{selectedDeclForReview.dept}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Regime</span>
                  <p className="text-xs font-bold text-purple-700 mb-0 uppercase">{selectedDeclForReview.regime} Regime</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Current Status</span>
                  <p className="text-xs font-bold text-slate-800 mb-0">{selectedDeclForReview.status}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Monthly TDS</span>
                  <p className="text-xs font-bold text-blue-700 mb-0">
                    {fmt(selectedDeclForReview.tax_computation?.new_regime?.monthly_tds || selectedDeclForReview.tax_computation?.old_regime?.monthly_tds || 0)}
                  </p>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h5 className="text-xs font-bold text-slate-800 mb-2">Uploaded Proof Attachments</h5>
                {(!selectedDeclForReview.proof_attachments || selectedDeclForReview.proof_attachments.length === 0) ? (
                  <p className="text-slate-400 italic">No proof attachments provided by employee.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDeclForReview.proof_attachments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center gap-2">
                          <LuFileText className="text-blue-600 w-4 h-4" />
                          <div>
                            <span className="font-semibold text-slate-800">{p.original_name}</span>
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{p.category}</span>
                          </div>
                        </div>
                        <a
                          href={getUploadUrl(p.filename)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs flex items-center gap-1"
                        >
                          <LuEye className="w-3.5 h-3.5" /> View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <Form.Label className="font-semibold text-slate-700">Reviewer Remarks / Feedback to Employee</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={reviewActionRemarks}
                  onChange={(e) => setReviewActionRemarks(e.target.value)}
                  placeholder="e.g. Verified and approved. Monthly TDS will be adjusted in next payroll run."
                  className="rounded-xl text-xs"
                />
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="border-slate-100 bg-slate-50 px-6 py-3 flex justify-between">
          {/* <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-xl text-xs font-medium"
            onClick={() => setReviewModalOpen(false)}
          >
            Close
          </Button> */}

          <div className="flex gap-2">
            <Button
              variant="outline-danger"
              size="sm"
              className="rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
              disabled={reviewingAction}
              onClick={() => handleAdminReview("Rejected")}
            >
              Reject / Request Revision
            </Button>
            <Button
              variant="success"
              size="sm"
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border-0 flex items-center gap-1.5"
              disabled={reviewingAction}
              onClick={() => handleAdminReview("Approved")}
            >
              {reviewingAction ? <Spinner animation="border" size="sm" /> : "Approve & Sync TDS"}

            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
