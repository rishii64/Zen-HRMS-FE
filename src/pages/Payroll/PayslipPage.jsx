import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Table,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getApiBaseUrl, getUploadUrl } from "../../api/axios";
import { exportToExcel } from "../../utils/excelExport";
import EsiSlabAuditModal from "./components/EsiSlabAuditModal";

const API = getApiBaseUrl();

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Helper to format currency in INR (₹)
const fmt = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
};

// Clean number formatter for PDF export (avoids non-ASCII UTF-16 character spacing and alignment bugs in jsPDF)
const formatPdfNum = (v) => {
  const num =
    typeof v === "number"
      ? v
      : parseFloat(String(v || 0).replace(/[^\d.-]/g, ""));
  const valid = isNaN(num) ? 0 : num;
  return valid.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Convert number to Indian currency words
const numberToWords = (n) => {
  const num = Math.round(parseFloat(n) || 0);
  if (num === 0) return "Zero Rupees Only";
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const inWords = (num) => {
    let str = "";
    if (num > 9999999) {
      str += inWords(Math.floor(num / 10000000)) + "Crore ";
      num %= 10000000;
    }
    if (num > 99999) {
      str += inWords(Math.floor(num / 100000)) + "Lakh ";
      num %= 100000;
    }
    if (num > 999) {
      str += inWords(Math.floor(num / 1000)) + "Thousand ";
      num %= 1000;
    }
    if (num > 99) {
      str += inWords(Math.floor(num / 100)) + "Hundred ";
      num %= 100;
    }
    if (num > 0) {
      if (num < 20) str += a[num];
      else str += b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : " ");
    }
    return str;
  };
  return inWords(num).trim() + " Rupees Only";
};

const PayslipPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const loggedInEmpCode = (
    localStorage.getItem("employeeCode") ||
    localStorage.getItem("empId") ||
    ""
  ).trim();
  const isRegularEmployee = userRole === "employee";

  // Period state
  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS[new Date().getMonth()]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentMonthYear = `${selectedMonth} ${selectedYear}`;

  // Data state
  const [employees, setEmployees] = useState([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState(loggedInEmpCode || "");
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingSlip, setLoadingSlip] = useState(false);
  const [payrollData, setPayrollData] = useState(null);
  const [allPayrolls, setAllPayrolls] = useState([]);
  const [alertMsg, setAlertMsg] = useState(null);

  // ESI Slab Configuration & Audit Modal state
  const [showEsiAuditModal, setShowEsiAuditModal] = useState(false);
  const [globalEsiThreshold, setGlobalEsiThreshold] = useState(21000);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [viewMode, setViewMode] = useState("split"); // 'split' | 'table'

  // 1. Initial Load: Fetch all employees, all payroll records & ESI settings
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingEmployees(true);
    try {
      const [empRes, payRes, setRes] = await Promise.all([
        fetch(`${API}/employees?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }),
        fetch(`${API}/payroll/all?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }),
        fetch(`${API}/payroll/settings?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }).catch(() => null),
      ]);
      const empJson = await empRes.json();
      const payJson = await payRes.json();
      if (setRes && setRes.ok) {
        try {
          const setJson = await setRes.json();
          if (setJson?.success && setJson?.settings?.esi_threshold) {
            setGlobalEsiThreshold(Number(setJson.settings.esi_threshold));
          }
        } catch { }
      }

      let empList = [];
      if (empJson.success && Array.isArray(empJson.data)) {
        empList = empJson.data;
        setEmployees(empList);
      }
      if (payJson.success && Array.isArray(payJson.records)) {
        setAllPayrolls(payJson.records);
      }

      // Determine default selected employee
      if (isRegularEmployee && loggedInEmpCode) {
        setSelectedEmpCode(loggedInEmpCode.replace(/^#/, "").trim());
      } else if (empList.length > 0) {
        // If url has ?code=..., select that
        const params = new URLSearchParams(location.search);
        const rawCode = params.get("code");
        const codeParam = rawCode ? rawCode.replace(/^#/, "").trim() : "";
        if (codeParam && empList.some((e) => (e.employee_code || "").replace(/^#/, "").trim().toLowerCase() === codeParam.toLowerCase())) {
          setSelectedEmpCode(codeParam);
        } else {
          setSelectedEmpCode((empList[0].employee_code || "").replace(/^#/, "").trim());
        }
      }
    } catch (err) {
      console.error("Error fetching payslip initial data:", err);
    }
    setLoadingEmployees(false);
  };

  // 2. Fetch specific payslip data when selected employee or month/year changes
  useEffect(() => {
    if (selectedEmpCode) {
      fetchEmployeeSlipData(selectedEmpCode, currentMonthYear);
    }
  }, [selectedEmpCode, currentMonthYear]);

  const fetchEmployeeSlipData = async (empCode, monthYear) => {
    setLoadingSlip(true);
    try {
      const cleanCode = (empCode || "").toString().replace(/^#/, "").trim();
      if (!cleanCode) {
        setLoadingSlip(false);
        return;
      }
      const res = await fetch(
        `${API}/payroll/data/${cleanCode}?month=${encodeURIComponent(monthYear)}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        setPayrollData(data);
      } else {
        setPayrollData(null);
      }
    } catch (err) {
      console.error("Error fetching slip data:", err);
      setPayrollData(null);
    }
    setLoadingSlip(false);
  };

  // Currently selected employee object
  const activeEmployee = useMemo(() => {
    if (!selectedEmpCode || !Array.isArray(employees)) return null;
    const cleanSelected = selectedEmpCode.toString().replace(/^#/, "").trim().toLowerCase();
    return (
      employees.find(
        (e) =>
          String(e.employee_code || "").replace(/^#/, "").trim().toLowerCase() === cleanSelected
      ) || null
    );
  }, [selectedEmpCode, employees]);

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e?.dept) set.add(e.dept);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter((emp) => {
      if (!emp) return false;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(emp.name || "").toLowerCase().includes(q) ||
        String(emp.employee_code || "").toLowerCase().includes(q) ||
        String(emp.designation || "").toLowerCase().includes(q) ||
        String(emp.dept || "").toLowerCase().includes(q);

      const matchDept =
        selectedDept === "all" ||
        String(emp.dept || "").toLowerCase() === selectedDept.toLowerCase();

      return matchSearch && matchDept;
    });
  }, [employees, searchQuery, selectedDept]);

  // Active Payslip Breakdown Calculations
  const slipBreakdown = useMemo(() => {
    if (!payrollData) {
      return {
        earnings: [],
        deductions: [],
        gross: 0,
        totalDeds: 0,
        net: 0,
        status: "Draft",
      };
    }

    const sp = payrollData.saved_payroll;
    const hasStructureUpdate = !!payrollData.has_structure_update;
    const isFinal = sp && sp.status === "Finalized" && !hasStructureUpdate;
    const fp = (hasStructureUpdate || !isFinal)
      ? payrollData.latest_salary_structure || payrollData.defaults?.fixed_pay || (sp ? sp.fixed_pay || {} : {})
      : sp.fixed_pay || {};
    const vp = sp ? sp.variable_pay || {} : payrollData.defaults?.variable_pay || {};
    const att = sp ? sp.attendance_summary || {} : payrollData.defaults?.attendance_summary || {};
    const tax = (hasStructureUpdate || !isFinal)
      ? payrollData.defaults?.tax_deductions || sp?.tax_deductions || {}
      : sp.tax_deductions || {};
    const stat = (hasStructureUpdate || !isFinal)
      ? payrollData.latest_salary_structure || payrollData.defaults?.statutory_deductions || sp?.statutory_deductions || {}
      : sp.statutory_deductions || {};
    const adj = sp?.adjustments || payrollData.adjustments || payrollData.defaults?.adjustments || {};
    const empType = (payrollData.employee?.employment_type || adj.employment_type || "Permanent").trim();
    const isPermanent = (adj.is_permanent !== false) && (empType.toLowerCase() === "permanent");

    const effectiveOT =
      (parseFloat(vp.overtime) || 0) > 0
        ? parseFloat(vp.overtime)
        : (parseFloat(vp.overtime_hours) || 0) * (parseFloat(vp.overtime_rate) || 0);

    const curSal = parseFloat(payrollData.employee?.current_salary) || 0;
    const structGross =
      (parseFloat(fp.basic) || 0) +
      (parseFloat(fp.hra) || 0) +
      (parseFloat(fp.conveyance) || 0) +
      (parseFloat(fp.medical) || 0) +
      (parseFloat(fp.allowance) || 0);

    let basicVal = parseFloat(fp.basic) || 0;
    let hraVal = parseFloat(fp.hra) || 0;
    let convVal = parseFloat(fp.conveyance) || 0;
    let medVal = parseFloat(fp.medical) || 0;
    let allowVal = parseFloat(fp.allowance) || 0;

    // Automatically realign if fp components are 0 or differ from current_salary
    if ((hasStructureUpdate || !isFinal) && curSal > 0 && (structGross === 0 || Math.abs(structGross - curSal) > 1)) {
      basicVal = Math.round(curSal * 0.45);
      hraVal = Math.round(curSal * 0.40);
      convVal = Math.round(curSal * 0.05) || 1600;
      medVal = Math.round(curSal * 0.05) || 1250;
      allowVal = Math.max(0, curSal - (basicVal + hraVal + convVal + medVal));
    }

    const totalFixedEarnings = basicVal + hraVal + convVal + medVal + allowVal;

    const lopCalc =
      (parseFloat(att.lop_days) || 0) > 0
        ? Math.round(
          (totalFixedEarnings / (att.total_days || 30)) * parseFloat(att.lop_days)
        )
        : (isFinal && !hasStructureUpdate)
          ? parseFloat(sp.lop_deduction) || 0
          : 0;

    const earnings = [
      { label: "Basic Salary", amount: basicVal },
      { label: "House Rent Allowance (HRA)", amount: hraVal },
      { label: "Conveyance Allowance", amount: convVal },
      { label: "Medical Allowance", amount: medVal },
      { label: "Special Allowance", amount: allowVal },
      { label: "Performance Bonus", amount: parseFloat(vp.bonus) || 0 },
      { label: "Overtime Pay", amount: effectiveOT },
      { label: "Incentive", amount: parseFloat(vp.incentive) || 0 },
      { label: "Reimbursement", amount: parseFloat(vp.reimbursement) || 0 },
    ].filter((item) => item.amount > 0);

    const empEsiThresh = payrollData?.esi_threshold ?? 21000;
    const isEsiEligible = totalFixedEarnings <= empEsiThresh;
    const healthDeduction = isEsiEligible
      ? { label: "Employee State Insurance (ESI)", amount: parseFloat(stat.esi) || 0 }
      : { label: "Mediclaim", amount: parseFloat(stat.mediclaim) || 0 };

    const deductions = [
      { label: "Provident Fund (PF)", amount: parseFloat(stat.pf) || 0 },
      healthDeduction,
      { label: "Professional Tax (PT)", amount: parseFloat(stat.pt) || 0 },
      {
        label: "TDS / Income Tax",
        amount: (parseFloat(tax.tds) || 0) + (parseFloat(tax.other_tax) || 0),
      },
      { label: "Loss of Pay (LOP)", amount: lopCalc },
      { label: "Other Deductions", amount: parseFloat(stat.others) || 0 },
    ];

    if (isPermanent) {
      if (parseFloat(adj.advance_deduction) > 0) {
        deductions.push({
          label: "Advance Payment Recovery",
          amount: parseFloat(adj.advance_deduction) || 0,
        });
      }
      if (parseFloat(adj.loan_emi) > 0) {
        deductions.push({
          label: "Company Loan EMI",
          amount: parseFloat(adj.loan_emi) || 0,
        });
      }
      if (parseFloat(adj.insurance_deduction) > 0) {
        deductions.push({
          label: "Corporate Group Insurance",
          amount: parseFloat(adj.insurance_deduction) || 0,
        });
      }
    }

    const filteredDeductions = deductions.filter((item) => item.amount > 0);
    const gross = earnings.reduce((acc, it) => acc + it.amount, 0);
    const totalDeds = filteredDeductions.reduce((acc, it) => acc + it.amount, 0);
    const net = Math.max(0, gross - totalDeds);
    const status = isFinal ? "Finalized" : "Unpaid";

    return {
      earnings,
      deductions: filteredDeductions,
      gross,
      totalDeds,
      net,
      status,
      attendance: att,
      adjustments: adj,
      isPermanent,
      employment_type: empType,
    };
  }, [payrollData]);

  // Generate Professional PDF Payslip
  const handleDownloadPDF = () => {
    if (!payrollData || !payrollData.employee) return;
    const emp = payrollData.employee;
    const doc = new jsPDF();

    const compName = (emp.company_name || "TATA STEEL").toUpperCase();
    const grpName = (emp.group_name || "TATA COMPANY").toUpperCase();
    const locName = emp.work_location || "Kolkata";

    // 1. Corporate Header Banner
    doc.setFillColor(74, 40, 53); // Deep Burgundy
    doc.rect(0, 0, 210, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(compName, 105, 12, {
      align: "center",
    });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `A Subsidiary of ${grpName} • Location: ${locName} | Confidential Employee Pay Slip`,
      105,
      19,
      { align: "center" }
    );

    // 2. Period Subheader
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`SALARY PAYSLIP FOR ${currentMonthYear.toUpperCase()}`, 14, 35);

    // 3. Employee Metadata Table
    const metaRows = [
      [
        { content: "Employee Name:", styles: { fontStyle: "bold" } },
        emp.name || "N/A",
        { content: "Employee ID:", styles: { fontStyle: "bold" } },
        emp.employee_code || "N/A",
      ],
      [
        { content: "Company / Unit:", styles: { fontStyle: "bold" } },
        emp.company_name || "TATA Steel",
        { content: "Parent Group:", styles: { fontStyle: "bold" } },
        emp.group_name || "TATA Company",
      ],
      [
        { content: "Work Location:", styles: { fontStyle: "bold" } },
        emp.work_location || "Kolkata",
        { content: "Department:", styles: { fontStyle: "bold" } },
        emp.dept || "General",
      ],
      [
        { content: "Designation:", styles: { fontStyle: "bold" } },
        emp.designation || "Staff",
        { content: "Pay Status:", styles: { fontStyle: "bold" } },
        slipBreakdown.status === "Finalized" ? "PAID" : "UNPAID",
      ],
      [
        { content: "Bank Name:", styles: { fontStyle: "bold" } },
        emp.bank_details?.name || "HDFC Bank",
        { content: "Account No:", styles: { fontStyle: "bold" } },
        emp.bank_details?.account || "N/A",
      ],
      [
        { content: "Employment:", styles: { fontStyle: "bold" } },
        emp.employment_type || slipBreakdown.employment_type || "Permanent",
        { content: "Employee Status:", styles: { fontStyle: "bold" } },
        emp.status || "Active",
      ],
      [
        { content: "Work & Present Days:", styles: { fontStyle: "bold" } },
        `${slipBreakdown.attendance?.working_days || 26} Work Days | ${slipBreakdown.attendance?.present_days ?? 0} Present`,
        { content: "Paid Days Breakdown:", styles: { fontStyle: "bold" } },
        `${slipBreakdown.attendance?.present_days ?? 24}P + ${slipBreakdown.attendance?.leave_days || slipBreakdown.attendance?.paid_leaves || 0}L + ${slipBreakdown.attendance?.holiday_days || 0}H + ${slipBreakdown.attendance?.week_offs ?? Math.max(0, (slipBreakdown.attendance?.total_days || 30) - (slipBreakdown.attendance?.working_days || 26))}WO - ${slipBreakdown.attendance?.absent_days || 0}A = ${slipBreakdown.attendance?.paid_days ?? 24} Paid (${slipBreakdown.attendance?.total_days || 30} Days)`,
      ],
    ];

    autoTable(doc, {
      startY: 40,
      margin: { left: 14, right: 14 },
      tableWidth: 182,
      body: metaRows,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 59 },
        2: { cellWidth: 32 },
        3: { cellWidth: 59 },
      },
    });

    // 4. Financial Table: Non-zero Earnings vs Non-zero Deductions
    const maxRows = Math.max(
      slipBreakdown.earnings.length,
      slipBreakdown.deductions.length,
      1
    );
    const combinedRows = [];

    for (let i = 0; i < maxRows; i++) {
      const earn = slipBreakdown.earnings[i];
      const ded = slipBreakdown.deductions[i];
      combinedRows.push([
        earn ? earn.label : "",
        earn ? formatPdfNum(earn.amount) : "",
        ded ? ded.label : "",
        ded ? formatPdfNum(ded.amount) : "",
      ]);
    }

    // Totals Row
    combinedRows.push([
      { content: "Total Gross Earnings", styles: { fontStyle: "bold" } },
      { content: formatPdfNum(slipBreakdown.gross), styles: { fontStyle: "bold", halign: "right" } },
      { content: "Total Deductions", styles: { fontStyle: "bold" } },
      { content: formatPdfNum(slipBreakdown.totalDeds), styles: { fontStyle: "bold", halign: "right" } },
    ]);

    const tableFinalY = doc.lastAutoTable?.finalY || 60;

    autoTable(doc, {
      startY: tableFinalY + 14,
      margin: { left: 14, right: 14 },
      tableWidth: 182,
      head: [
        [
          { content: "EARNINGS", colSpan: 2, styles: { halign: "center" } },
          { content: "DEDUCTIONS", colSpan: 2, styles: { halign: "center" } },
        ],
        ["Component", "Amount (INR)", "Component", "Amount (INR)"],
      ],
      body: combinedRows,
      theme: "grid",
      headStyles: {
        fillColor: [74, 40, 53],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
      },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 56, halign: "left" },
        1: { cellWidth: 35, halign: "right" },
        2: { cellWidth: 56, halign: "left" },
        3: { cellWidth: 35, halign: "right" },
      },
    });

    const finalY = doc.lastAutoTable.finalY || 140;

    // 5. Net Salary Payable Box (Computed according to present work days)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, finalY + 8, 182, 18, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("NET SALARY PAYABLE (FOR PRESENT WORK DAYS):", 22, finalY + 19);

    doc.setFontSize(13);
    doc.setTextColor(22, 101, 52); // Green
    doc.text(`Rs. ${formatPdfNum(slipBreakdown.net)}`, 190, finalY + 19, { align: "right" });

    // Amount in Words
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.text(
      `In words: ${numberToWords(slipBreakdown.net)}`,
      14,
      finalY + 34
    );

    if (slipBreakdown.isPermanent && parseFloat(slipBreakdown.adjustments?.gratuity_accrual) > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.text(
        `* Statutory Note: Monthly Gratuity Accrual is Rs. ${formatPdfNum(slipBreakdown.adjustments.gratuity_accrual)} under Payment of Gratuity Act, 1972.`,
        14,
        finalY + 41
      );
    }

    // 6. Signatures
    const signY = finalY + 54;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, signY, 75, signY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Employee Signature", 32, signY + 5);

    doc.line(135, signY, 190, signY);
    doc.text("Authorized Signatory (HR / Accounts)", 135, signY + 5);

    const safeName = String(emp.name || "Employee").replace(/\s+/g, "_");
    doc.save(`Payslip_${safeName}_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Download Individual Payslip in Excel (.xlsx) with present work days payable salary
  const handleDownloadExcel = () => {
    if (!payrollData || !payrollData.employee) return;
    const emp = payrollData.employee;
    const isPaid = slipBreakdown.status === "Finalized";
    const att = slipBreakdown.attendance || {};
    const bank = emp.bank_details || {};
    const safeName = String(emp.name || "Employee").replace(/\s+/g, "_");

    const maxRows = Math.max(
      slipBreakdown.earnings.length,
      slipBreakdown.deductions.length,
      1
    );
    const finRows = [];
    for (let i = 0; i < maxRows; i++) {
      const earn = slipBreakdown.earnings[i];
      const ded = slipBreakdown.deductions[i];
      finRows.push([
        earn ? earn.label : "",
        earn ? Number(earn.amount) : "",
        ded ? ded.label : "",
        ded ? Number(ded.amount) : "",
      ]);
    }

    const lopDedObj = slipBreakdown.deductions.find((d) => d.label.includes("Loss of Pay"));
    const lopCalc = lopDedObj ? Number(lopDedObj.amount) : 0;
    const earnedGross = Math.max(0, slipBreakdown.gross - lopCalc);
    const statutoryDeds = Math.max(0, slipBreakdown.totalDeds - lopCalc);

    const compName = (emp.company_name || "TATA STEEL").toUpperCase();
    const grpName = (emp.group_name || "TATA COMPANY").toUpperCase();
    const locName = emp.work_location || "Kolkata";

    const rows = [
      [compName],
      [`A Division / Subsidiary of ${grpName} • Location: ${locName} | Confidential Employee Pay Slip`],
      [`SALARY PAYSLIP FOR ${currentMonthYear.toUpperCase()}`],
      [],
      ["EMPLOYEE DETAILS", "", "ORGANIZATION & LOCATION", ""],
      ["Employee Name:", emp.name || "N/A", "Company / Unit:", emp.company_name || "TATA Steel"],
      ["Employee ID:", emp.employee_code || "N/A", "Parent Group:", emp.group_name || "TATA Company"],
      ["Designation:", emp.designation || "Staff", "Work Location:", emp.work_location || "Kolkata"],
      ["Department:", emp.dept || "General", "Employment Type:", emp.employment_type || slipBreakdown.employment_type || "Permanent"],
      ["Pay Period:", currentMonthYear, "Pay Status:", isPaid ? "PAID" : "UNPAID"],
      ["Bank Name:", bank.name || "HDFC Bank", "Account No:", bank.account || "N/A"],
      ["IFSC Code:", bank.ifsc || "N/A", "PAN Number:", bank.pan || emp.pan_no || "N/A"],
      [],
      ["ATTENDANCE SUMMARY", "", "", ""],
      ["Total Days in Month:", att.total_days || 31, "Total Work Days:", att.working_days || 26],
      ["Total Present Days:", att.present_days ?? 0, "Total Leaves:", att.leave_days || att.paid_leaves || 0],
      ["Total Absents (LOP):", att.absent_days || att.lop_days || 0, "Holidays / Week Offs:", `${att.holiday_days || 0} / ${att.week_offs || 5}`],
      ["Total Paid Days:", att.paid_days ?? 0, "Loss of Pay Days:", att.lop_days || 0],
      [],
      ["EARNINGS (FIXED STRUCTURE)", "AMOUNT (INR)", "DEDUCTIONS & COMPLIANCE", "AMOUNT (INR)"],
      ...finRows,
      ["Total Gross Earnings (Monthly CTC)", Number(slipBreakdown.gross), "Total Deductions", Number(slipBreakdown.totalDeds)],
      [],
      ["SALARY COMPUTATION (FOR PRESENT WORK DAYS)", "", "", ""],
      ["Monthly Full CTC Gross:", Number(slipBreakdown.gross), "Loss of Pay (LOP) Deduction:", Number(lopCalc)],
      ["Gross Earned (Present Days):", Number(earnedGross), "Statutory Deductions:", Number(statutoryDeds)],
      ["NET SALARY PAYABLE (PRESENT WORK DAYS):", Number(slipBreakdown.net)],
      ["In Words:", numberToWords(slipBreakdown.net)],
      ["Payment Status:", isPaid ? "Paid" : "Unpaid"],
    ];

    exportToExcel({
      data: rows,
      fileName: `Payslip_${safeName}_${selectedMonth}_${selectedYear}.xlsx`,
      sheetName: "Payslip",
    });
  };

  // Fetch full monthly register from summary-sheet API (with fallback)
  const fetchMonthlyRegister = async () => {
    try {
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const res = await fetch(
        `${API}/payroll/summary-sheet?month=${encodeURIComponent(
          currentMonthYear
        )}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", role: userRole },
        }
      );
      const d = await res.json();
      if (d.success && Array.isArray(d.summary) && d.summary.length > 0) {
        return d.summary;
      }
    } catch (err) {
      console.warn("Could not fetch summary-sheet for payslip register:", err);
    }

    // Fallback: derive from filteredEmployees and allPayrolls
    return (Array.isArray(employees) ? employees : []).map((emp) => {
      let ss = {};
      try {
        ss = typeof emp.salary_structure === "string" ? JSON.parse(emp.salary_structure) : emp.salary_structure || {};
      } catch {}
      const earn = ss.earnings || {};
      const ded = ss.deductions || {};
      const curSal = parseFloat(emp.current_salary) || 25000;
      const gross =
        (parseFloat(earn.basic) || 0) +
        (parseFloat(earn.da) || 0) +
        (parseFloat(earn.hra) || 0) +
        (parseFloat(earn.conveyance) || 0) +
        (parseFloat(earn.medical) || 0) +
        (parseFloat(earn.allowance) || 0) || curSal;
      const statutoryDeds =
        (parseFloat(ded.professional_tax) || 0) +
        (parseFloat(ded.income_tax) || 0) +
        (parseFloat(ded.pf) || 0) +
        (parseFloat(ded.esi) || 0) +
        (parseFloat(ded.mediclaim) || 0) +
        (parseFloat(ded.tds) || 0);

      const totalDays = 30;
      const paidDays = 24;
      const lopDays = Math.max(0, totalDays - paidDays);
      const dailyRate = totalDays > 0 ? (gross / totalDays) : 0;
      const lopAmount = Math.round(lopDays * dailyRate);
      const earnedGross = Math.max(0, gross - lopAmount);
      const payableSalary = Math.max(0, earnedGross - statutoryDeds);

      const isPaid = allPayrolls.some(
        (p) =>
          String(p.employee_id).toLowerCase() === String(emp.employee_code).toLowerCase() &&
          String(p.month_year).toLowerCase() === currentMonthYear.toLowerCase() &&
          p.status === "Finalized"
      );

      const adj = ss.adjustments || {};
      const advAmt = parseFloat(adj.advance_amount) || 0;
      const advDed = parseFloat(adj.advance_deduction) || 0;
      const loanAmt = parseFloat(adj.loan_amount) || 0;
      const loanEmi = parseFloat(adj.loan_emi) || 0;
      const insDed = parseFloat(adj.insurance_deduction) || 0;
      const medDed = parseFloat(ss.deductions?.mediclaim) || parseFloat(adj.mediclaim_deduction) || 0;
      const gratMonthly = Math.round(((parseFloat(ss.earnings?.basic) || Math.round(curSal * 0.45)) * 15) / (26 * 12));

      const advDisp = advAmt > 0 || advDed > 0 ? `Rs. ${advAmt.toLocaleString("en-IN")}${advDed > 0 ? ` (Rec: Rs. ${advDed})` : ""}` : "-";
      const loanDisp = loanAmt > 0 || loanEmi > 0 ? `Rs. ${loanAmt.toLocaleString("en-IN")}${loanEmi > 0 ? ` (EMI: Rs. ${loanEmi})` : ""}` : "-";
      const insDisp = medDed > 0 || insDed > 0 ? `Rs. ${(medDed || insDed).toLocaleString("en-IN")}/mo` : "-";
      const gratDisp = gratMonthly > 0 ? `Rs. ${gratMonthly.toLocaleString("en-IN")}/mo` : "-";

      return {
        employee_code: emp.employee_code || "",
        name: emp.name || "",
        dept: emp.dept || "General",
        designation: emp.designation || "Staff",
        employee_status: emp.status || "Active",
        employment_type: emp.employment_type || "Permanent",
        attendance: {
          total_days: totalDays,
          working_days: 26,
          present_days: 24,
          leave_days: 0,
          absent_days: 0,
          holiday_days: 0,
          week_offs: 4,
          paid_days: paidDays,
          lop_days: lopDays,
        },
        base_pay: gross,
        gross_pay: gross,
        overall_gross: gross,
        earned_gross: earnedGross,
        lop_days: lopDays,
        lop_amount: lopAmount,
        statutory_deductions: statutoryDeds,
        total_deductions: statutoryDeds + lopAmount,
        payable_salary: payableSalary,
        net_salary: payableSalary,
        facilities_taken: "None",
        facility_advance: advDisp,
        facility_loan: loanDisp,
        facility_insurance: insDisp,
        facility_gratuity: gratDisp,
        facilities: {
          advance_amount: advAmt,
          advance_deduction: advDed,
          loan_amount: loanAmt,
          loan_emi: loanEmi,
          insurance_deduction: insDed,
          mediclaim_deduction: medDed,
          gratuity_accrual: gratMonthly,
        },
        group_name: emp.group_name || "TATA Company",
        company_name: emp.company_name || "TATA Steel",
        work_location: emp.work_location || "Kolkata",
        status: isPaid ? "Paid" : "Unpaid",
        is_paid: isPaid,
        bank_name: "HDFC Bank",
        account_no: "N/A",
        ifsc: "N/A",
        pan: emp.pan_no || "N/A",
      };
    });
  };

  // Export all salary slips register to Excel (.xlsx) with separate facility columns
  const handleExportRegisterExcel = async () => {
    try {
      const records = await fetchMonthlyRegister();
      const rows = records.map((emp) => ({
        "Holding Group": emp.group_name || "TATA Company",
        "Company / Subsidiary": emp.company_name || "TATA Steel",
        "Work Location": emp.work_location || "Kolkata",
        "Employee ID": emp.employee_code || "",
        "Employee Name": emp.name || "",
        "Department": emp.dept || "General",
        "Designation / Role": emp.designation || "Staff",
        "Employee Status": emp.employee_status || "Active",
        "Employment Type": emp.employment_type || "Permanent",
        "Total Days in Month": emp.attendance?.total_days ?? 30,
        "Total Work Days": emp.attendance?.working_days ?? 26,
        "Total Present Days": emp.attendance?.present_days ?? 0,
        "Total Leaves": emp.attendance?.leave_days ?? 0,
        "Total Absents / LOP Days": emp.attendance?.absent_days ?? emp.attendance?.lop_days ?? 0,
        "Holidays": emp.attendance?.holiday_days ?? 0,
        "Week Offs": emp.attendance?.week_offs ?? 0,
        "Total Paid Days": emp.attendance?.paid_days ?? 0,
        "Advance Facility": emp.facility_advance || "-",
        "Advance Taken (INR)": parseFloat(emp.facilities?.advance_amount || 0),
        "Advance Monthly Recovery (INR)": parseFloat(emp.facilities?.advance_deduction || 0),
        "Company Loan Facility": emp.facility_loan || "-",
        "Loan Taken (INR)": parseFloat(emp.facilities?.loan_amount || 0),
        "Loan Monthly EMI (INR)": parseFloat(emp.facilities?.loan_emi || 0),
        "Mediclaim / Insurance Facility": emp.facility_insurance || "-",
        "Mediclaim / Insurance Deduction (INR)": parseFloat(emp.facilities?.mediclaim_deduction || emp.facilities?.insurance_deduction || 0),
        "Gratuity Facility": emp.facility_gratuity || "-",
        "Gratuity Monthly Accrual (INR)": parseFloat(emp.facilities?.gratuity_accrual || 0),
        "Monthly Overall CTC / Base (INR)": parseFloat(emp.base_pay || 0),
        "Monthly Overall Gross (INR)": parseFloat(emp.overall_gross || emp.gross_pay || emp.base_pay || 0),
        "Loss of Pay (LOP) Deduction (INR)": parseFloat(emp.lop_amount || 0),
        "Earned Gross for Present Days (INR)": parseFloat(emp.earned_gross || 0),
        "Statutory & Other Deductions (INR)": parseFloat(emp.statutory_deductions || 0),
        "Total Deductions (INR)": parseFloat(emp.total_deductions || 0),
        "Net Payable Salary (According to Present Days) (INR)": parseFloat(emp.payable_salary || emp.net_salary || 0),
        "Payment Status": emp.status || (emp.is_paid ? "Paid" : "Unpaid"),
        "Bank Name": emp.bank_name || "N/A",
        "Account Number": emp.account_no || "N/A",
        "IFSC Code": emp.ifsc || "N/A",
        "PAN Number": emp.pan || "N/A",
      }));

      exportToExcel({
        data: rows,
        fileName: `Salary_Slips_Register_${selectedMonth}_${selectedYear}.xlsx`,
        sheetName: `Salary Slips ${selectedMonth} ${selectedYear}`,
      });
    } catch (err) {
      console.error("Error exporting slips Excel:", err);
      setAlertMsg({ type: "danger", text: "Failed to export salary slips Excel register." });
    }
  };

  // Export all salary slips register to PDF (.pdf) with separate facility columns & present work days payable salary
  const handleExportRegisterPDF = async () => {
    try {
      const records = await fetchMonthlyRegister();
      const firstGrp = records[0]?.group_name || "TATA COMPANY";
      const doc = new jsPDF("landscape");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${firstGrp.toUpperCase()} - SALARY SLIPS REGISTER (${selectedMonth.toUpperCase()} ${selectedYear})`,
        14,
        15
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-IN")} | Consolidated Location-wise Corporate Salary Slips Register Across Subsidiaries`,
        14,
        21
      );

      const rows = records.map((emp) => [
        emp.employee_code || "",
        emp.name || "",
        emp.company_name || "TATA Steel",
        emp.work_location || "Kolkata",
        emp.designation || emp.dept || "Staff",
        emp.employee_status || "Active",
        String(emp.attendance?.working_days ?? 26),
        String(emp.attendance?.present_days ?? 0),
        String(emp.attendance?.paid_days ?? 0),
        emp.facility_advance || (parseFloat(emp.facilities?.advance_amount) > 0 ? `Rs. ${formatPdfNum(emp.facilities.advance_amount)}` : "-"),
        emp.facility_loan || (parseFloat(emp.facilities?.loan_amount) > 0 ? `Rs. ${formatPdfNum(emp.facilities.loan_amount)}` : "-"),
        emp.facility_insurance || (parseFloat(emp.facilities?.mediclaim_deduction || emp.facilities?.insurance_deduction) > 0 ? `Rs. ${formatPdfNum(emp.facilities?.mediclaim_deduction || emp.facilities?.insurance_deduction)}/mo` : "-"),
        formatPdfNum(emp.overall_gross || emp.gross_pay || emp.base_pay),
        formatPdfNum(emp.lop_amount || 0),
        formatPdfNum(emp.payable_salary || emp.net_salary),
        emp.status || (emp.is_paid ? "Paid" : "Unpaid"),
      ]);

      autoTable(doc, {
        startY: 25,
        margin: { left: 8, right: 8 },
        head: [
          [
            "Emp Code",
            "Staff Member",
            "Company",
            "Location",
            "Role",
            "Status",
            "Work Days",
            "Present",
            "Paid Days",
            "Advance",
            "Loan",
            "Mediclaim",
            "Gross (INR)",
            "LOP Ded (INR)",
            "Payable Salary (INR)",
            "Status",
          ],
        ],
        body: rows,
        theme: "grid",
        headStyles: {
          fillColor: [74, 40, 53],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
        },
        styles: { fontSize: 6.8, cellPadding: 2 },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "left" },
          2: { halign: "left" },
          3: { halign: "center" },
          4: { halign: "left" },
          5: { halign: "center" },
          6: { halign: "center" },
          7: { halign: "center" },
          8: { halign: "center" },
          9: { halign: "center" },
          10: { halign: "center" },
          11: { halign: "center" },
          12: { halign: "right" },
          13: { halign: "right" },
          14: { halign: "right", fontStyle: "bold" },
          15: { halign: "center" },
        },
      });

      doc.save(`Salary_Slips_Register_${selectedMonth}_${selectedYear}.pdf`);
    } catch (err) {
      console.error("Error exporting slips PDF:", err);
      setAlertMsg({ type: "danger", text: "Failed to export salary slips PDF register." });
    }
  };

  // Avatar renderer
  const renderAvatar = (emp, size = 38) => {
    if (emp?.profile_photo) {
      const photoUrl = getUploadUrl(emp.profile_photo);
      return (
        <img
          src={photoUrl}
          alt={emp?.name || "Avatar"}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      );
    }
    const initials =
      String(emp?.name || "EM")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "EM";
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "#f1f5f9",
          color: "#475569",
          fontWeight: "600",
          fontSize: Math.max(10, Math.round(size * 0.38)),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className="container-fluid max-w-7xl mt-3 mt-md-4 pb-5 px-2 px-md-4">
      {/* ══ HEADER & TOP NAVIGATION ══ */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.5px" }}>
              {isRegularEmployee ? "My Salary Slip" : "Employee Payslips & Salary Slips"}
            </h3>
            <Badge bg="light" text="dark" className="border fw-normal px-2 py-1">
              INR (₹)
            </Badge>
          </div>
          <p className="text-muted small mb-0">
            {isRegularEmployee
              ? "View and download your monthly salary slips and official compensation records."
              : "Browse everyone's individual salary slips, verify net take-home earnings, and export official PDF slips."}
          </p>
        </div>

        {/* Top Controls: Period selector & Link to Salary Structure */}
        <div className="d-flex flex-wrap justify-end align-items-center gap-2">
          {/* Month & Year Selectors */}
          <div className="d-flex align-items-center bg-white border rounded-3 px-2 py-1 gap-1 shadow-xs">
            <span className="text-muted small ps-1">📅</span>
            <Form.Select
              size="sm"
              className="border-0 bg-transparent py-0 fw-semibold text-dark shadow-none"
              style={{ width: "116px", fontSize: "13px" }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Form.Select>
            <Form.Select
              size="sm"
              className="border-0 bg-transparent py-0 fw-semibold text-dark shadow-none"
              style={{ width: "75px", fontSize: "13px" }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Form.Select>
          </div>

          {/* Quick link to Salary Structure */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs text-dark border"
            onClick={() => navigate("/payroll")}
          >
            <span>💼 Salary Structure</span>
          </Button>

          {/* ESI Slab Configuration & Statutory Cycles (All Roles) */}
          <Button
            variant="outline-primary"
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs border"
            style={{ borderColor: "#2563eb", color: "#1d4ed8" }}
            onClick={() => setShowEsiAuditModal(true)}
            title="View ESI statutory wage ceiling, rates, and past revisions"
          >
            <span>🛡️</span>
            <span>ESI Slab (₹{Number(globalEsiThreshold).toLocaleString("en-IN")})</span>
          </Button>

          {/* Export All Slips Register (Excel & PDF) for HR / Accounts */}
          {!isRegularEmployee && (
            <div className="d-flex align-items-center gap-1.5">
              <Button
                variant="outline-success"
                size="sm"
                className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs border"
                onClick={handleExportRegisterExcel}
                title="Export all salary slips register to Excel (.xlsx) with work days & status"
              >
                <span>📊 Export Excel</span>
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs text-dark border"
                onClick={handleExportRegisterPDF}
                title="Export all salary slips register to PDF (.pdf) with work days & status"
              >
                <span>📄 Export PDF</span>
              </Button>
            </div>
          )}

          {/* View Toggle for HR / Accounts */}
          {!isRegularEmployee && (
            <div className="btn-group btn-group-sm rounded-3 shadow-xs">
              <Button
                variant={viewMode === "split" ? "dark" : "light"}
                className="px-2.5 py-1 border"
                style={viewMode === "split" ? { background: "#4a2835", borderColor: "#4a2835" } : {}}
                onClick={() => setViewMode("split")}
                title="Split Detail View"
              >
                Split View
              </Button>
              <Button
                variant={viewMode === "table" ? "dark" : "light"}
                className="px-2.5 py-1 border"
                style={viewMode === "table" ? { background: "#4a2835", borderColor: "#4a2835" } : {}}
                onClick={() => setViewMode("table")}
                title="All Slips Directory"
              >
                All Slips Table
              </Button>
            </div>
          )}
        </div>
      </div>

      {alertMsg && (
        <Alert
          variant={alertMsg.type}
          dismissible
          onClose={() => setAlertMsg(null)}
          className="shadow-sm rounded-3 mb-4"
        >
          {alertMsg.text}
        </Alert>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ══ VIEW 1: SPLIT VIEW (EMPLOYEE DIRECTORY LEFT + PAYSLIP RIGHT) ══ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "split" && (
        <Row className="g-4">
          {/* LEFT SIDE: Searchable Employee Directory (Hidden or compact for regular employee) */}
          {!isRegularEmployee ? (
            <Col xs={12} lg={4}>
              <Card className="border-0 shadow-sm rounded-4 p-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-dark">Staff Directory</h6>
                  <Badge bg="secondary" className="fw-normal rounded-pill">
                    {filteredEmployees.length} staff
                  </Badge>
                </div>

                {/* Search Bar */}
                <div className="mb-2">
                  <Form.Control
                    type="search"
                    size="sm"
                    placeholder="Search staff or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-3"
                  />
                </div>

                {/* Department Filter Pills */}
                <div className="d-flex gap-1 overflow-x-auto pb-2 mb-2">
                  <Button
                    size="sm"
                    variant={selectedDept === "all" ? "dark" : "light"}
                    className="rounded-pill py-0 px-2 small border"
                    style={
                      selectedDept === "all"
                        ? { background: "#4a2835", borderColor: "#4a2835", fontSize: "11px" }
                        : { fontSize: "11px" }
                    }
                    onClick={() => setSelectedDept("all")}
                  >
                    All
                  </Button>
                  {departments.map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={selectedDept === d ? "dark" : "light"}
                      className="rounded-pill py-0 px-2 small border text-nowrap"
                      style={
                        selectedDept === d
                          ? { background: "#4a2835", borderColor: "#4a2835", fontSize: "11px" }
                          : { fontSize: "11px" }
                      }
                      onClick={() => setSelectedDept(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>

                {/* Employee List Items */}
                <div
                  className="overflow-y-auto pe-1"
                  style={{ maxHeight: "560px" }}
                >
                  {loadingEmployees ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" size="sm" variant="secondary" />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center text-muted py-4 small">
                      No matching staff found.
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const cleanEmpCode = (emp.employee_code || "").toString().replace(/^#/, "").trim();
                      const cleanSelected = (selectedEmpCode || "").toString().replace(/^#/, "").trim();
                      const isSelected = cleanEmpCode.toLowerCase() === cleanSelected.toLowerCase();
                      return (
                        <div
                          key={emp.employee_code}
                          onClick={() => setSelectedEmpCode(cleanEmpCode)}
                          className={`p-2.5 rounded-3 mb-2 d-flex align-items-center justify-content-between cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-light border-dark shadow-xs"
                              : "bg-white border-light hover-bg-light"
                          }`}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="d-flex align-items-center gap-2.5">
                            {renderAvatar(emp, 34)}
                            <div>
                              <div className="fw-semibold text-dark small leading-tight">
                                {emp.name}
                              </div>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                #{emp.employee_code} • {emp.designation || emp.dept || "Staff"}
                              </div>
                            </div>
                          </div>
                          <div className="text-end">
                            <span
                              className="badge rounded-pill fw-normal"
                              style={{
                                background: isSelected ? "#4a2835" : "#f1f5f9",
                                color: isSelected ? "#fff" : "#475569",
                                fontSize: "10px",
                              }}
                            >
                              {isSelected ? "Active" : "View"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </Col>
          ) : null}

          {/* RIGHT SIDE: INDIVIDUAL SALARY SLIP PREVIEW & PDF DOWNLOAD */}
          <Col xs={12} lg={isRegularEmployee ? 12 : 8}>
            <Card className="border-0 shadow-sm rounded-4 p-4 bg-white">
              {loadingSlip ? (
                <div className="text-center py-5">
                  <Spinner animation="border" style={{ color: "#4a2835" }} />
                  <div className="text-muted small mt-2">Loading salary slip...</div>
                </div>
              ) : !payrollData || !payrollData.employee ? (
                <div className="text-center py-5 text-muted">
                  <h5>No Salary Slip Found</h5>
                  <p className="small">
                    No payroll or attendance record is available for this employee for {currentMonthYear}.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Slip Corporate Header Banner */}
                  <div className="border-bottom pb-3 mb-3">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-2">
                      <div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <h4 className="fw-bold text-dark mb-0">
                            {payrollData.employee.company_name || "TATA STEEL"}
                          </h4>
                          <span
                            className="badge px-2.5 py-1 rounded-pill fw-semibold text-uppercase"
                            style={{ background: "#0f172a", color: "#fff", fontSize: "11px" }}
                          >
                            Group: {payrollData.employee.group_name || "TATA Company"}
                          </span>
                          <span
                            className="badge px-2.5 py-1 rounded-pill fw-medium text-uppercase"
                            style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "11px" }}
                          >
                            📍 {payrollData.employee.work_location || "Kolkata"}
                          </span>
                          <span
                            className="badge px-2.5 py-1 rounded-pill fw-semibold"
                            style={{
                              background:
                                slipBreakdown.status === "Finalized"
                                  ? "#dcfce7"
                                  : "#ffe4e6",
                              color:
                                slipBreakdown.status === "Finalized"
                                  ? "#15803d"
                                  : "#e11d48",
                              fontSize: "12px",
                            }}
                          >
                            {slipBreakdown.status === "Finalized" ? "Paid" : "Unpaid"}
                          </span>
                        </div>
                        <div className="text-muted small mt-1">
                          {payrollData.employee.group_name ? `A Division / Subsidiary of ${payrollData.employee.group_name} • ` : ""}Official Work Location: {payrollData.employee.work_location || "Kolkata"}
                        </div>
                      </div>

                      <div className="text-sm-end">
                        <span className="badge bg-light text-dark border px-3 py-1.5 fs-6 fw-semibold">
                          {currentMonthYear}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Employee Metadata Subgrid */}
                  <div
                    className="p-3 rounded-3 mb-4"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                  >
                    <Row className="g-2 small">
                      <Col xs={12} sm={6} md={3}>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          STAFF NAME
                        </div>
                        <div className="fw-bold text-dark fs-6">
                          {payrollData.employee.name}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          EMPLOYEE CODE
                        </div>
                        <div className="fw-bold text-dark">
                          #{payrollData.employee.employee_code}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          COMPANY / SUBSIDIARY
                        </div>
                        <div className="fw-bold text-dark">
                          {payrollData.employee.company_name || "TATA Steel"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          PARENT GROUP
                        </div>
                        <div className="text-dark">
                          {payrollData.employee.group_name || "TATA Company"}
                        </div>
                      </Col>

                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          WORK LOCATION
                        </div>
                        <div className="text-dark fw-medium">
                          📍 {payrollData.employee.work_location || "Kolkata"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          ROLE & DESIGNATION
                        </div>
                        <div className="text-dark">
                          {payrollData.employee.designation || "Staff"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          DEPARTMENT
                        </div>
                        <div className="text-dark">
                          {payrollData.employee.dept || "General"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          BANK NAME
                        </div>
                        <div className="text-dark">
                          {payrollData.employee.bank_details?.name || "HDFC Bank"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          ACCOUNT NO
                        </div>
                        <div className="text-dark">
                          {payrollData.employee.bank_details?.account || "••••••••5010"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          PRESENT DAYS
                        </div>
                        <div className="text-success fw-semibold">
                          {slipBreakdown.attendance?.present_days ?? 24} days
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          UNPAID LEAVES
                        </div>
                        <div className="text-danger fw-semibold">
                          {slipBreakdown.attendance?.lop_days || 0} days
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3} className="pt-2">
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          EMPLOYMENT
                        </div>
                        <div>
                          <Badge
                            bg={slipBreakdown.isPermanent ? "success" : "warning"}
                            className="fw-semibold"
                            style={{ fontSize: "10px" }}
                          >
                            {slipBreakdown.employment_type || "Permanent"}
                          </Badge>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Paid Days Calculation Formula Bar */}
                  <div
                    className="p-3 rounded-3 mb-4 border d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                    style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong className="text-dark small">📅 Paid Days Calculation:</strong>
                        <Badge bg="primary" style={{ fontSize: "10px" }}>Attendance + Leaves + Holidays + Week-offs − Absents</Badge>
                      </div>
                      <div className="text-muted small" style={{ fontSize: "12px" }}>
                        Formula: <strong>{slipBreakdown.attendance?.present_days ?? 0}</strong> (Present) + <strong>{slipBreakdown.attendance?.leave_days || slipBreakdown.attendance?.paid_leaves || 0}</strong> (Leaves) + <strong>{slipBreakdown.attendance?.holiday_days || 0}</strong> (Holidays) + <strong>{slipBreakdown.attendance?.week_offs ?? Math.max(0, (slipBreakdown.attendance?.total_days || 30) - (slipBreakdown.attendance?.working_days || 26))}</strong> (Week-offs) − <strong>{slipBreakdown.attendance?.absent_days || 0}</strong> (Absents) = <strong className="text-success">{slipBreakdown.attendance?.paid_days ?? 0} Paid Days</strong> (out of {slipBreakdown.attendance?.total_days || 30} Days in Month)
                      </div>
                    </div>
                    {slipBreakdown.isPermanent && (parseFloat(slipBreakdown.adjustments?.gratuity_accrual) > 0) && (
                      <div className="text-md-end border-start-md ps-md-3">
                        <div className="text-muted" style={{ fontSize: "10px" }}>GRATUITY ACCRUAL (ACT 1972)</div>
                        <div className="fw-bold text-success small">
                          {fmt(slipBreakdown.adjustments.gratuity_accrual)} / month
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2-Column Financial Table: Earnings vs Deductions */}
                  <Row className="g-4 mb-4">
                    {/* Left: Non-Zero Earnings */}
                    <Col xs={12} md={6}>
                      <div className="p-3 rounded-3 border bg-white h-100">
                        <div className="fw-bold text-success pb-2 mb-2 border-bottom d-flex justify-content-between align-items-center">
                          <span>Monthly Earnings</span>
                          <span className="small text-muted fw-normal">INR (₹)</span>
                        </div>

                        {slipBreakdown.earnings.map((earn, i) => (
                          <div
                            key={i}
                            className="d-flex justify-content-between small text-muted mb-2"
                          >
                            <span>{earn.label}</span>
                            <span className="text-dark fw-semibold">
                              {fmt(earn.amount)}
                            </span>
                          </div>
                        ))}

                        <div className="d-flex justify-content-between small fw-bold text-dark pt-2 border-top mt-auto">
                          <span>Total Gross Earnings</span>
                          <span className="text-success">{fmt(slipBreakdown.gross)}</span>
                        </div>
                      </div>
                    </Col>

                    {/* Right: Non-Zero Deductions */}
                    <Col xs={12} md={6}>
                      <div className="p-3 rounded-3 border bg-white h-100">
                        <div className="fw-bold text-danger pb-2 mb-2 border-bottom d-flex justify-content-between align-items-center">
                          <span>Monthly Deductions</span>
                          <span className="small text-muted fw-normal">INR (₹)</span>
                        </div>

                        {slipBreakdown.deductions.length === 0 ? (
                          <div className="small text-muted fst-italic py-2">
                            No deductions applicable for this period.
                          </div>
                        ) : (
                          slipBreakdown.deductions.map((ded, i) => (
                            <div
                              key={i}
                              className="d-flex justify-content-between align-items-center small text-muted mb-2"
                            >
                              <span className="d-flex align-items-center gap-1.5 flex-wrap">
                                <span>{ded.label}</span>
                                {ded.label.includes("ESI") && (
                                  <Badge
                                    bg="primary"
                                    className="cursor-pointer"
                                    style={{ fontSize: "10px", cursor: "pointer" }}
                                    onClick={() => setShowEsiAuditModal(true)}
                                    title="Click to view statutory ESI wage ceiling & audit history"
                                  >
                                    ₹{Number(globalEsiThreshold).toLocaleString("en-IN")} Ceiling ⓘ
                                  </Badge>
                                )}
                                {ded.label.includes("Mediclaim") && (
                                  <Badge
                                    bg="secondary"
                                    className="cursor-pointer fw-normal"
                                    style={{ fontSize: "10px", cursor: "pointer" }}
                                    onClick={() => setShowEsiAuditModal(true)}
                                    title="Gross exceeds ₹21,000 statutory limit - covered under corporate Mediclaim instead of ESI"
                                  >
                                    Gross &gt; ₹{Number(globalEsiThreshold).toLocaleString("en-IN")} ⓘ
                                  </Badge>
                                )}
                              </span>
                              <span className="text-danger fw-semibold">
                                {fmt(ded.amount)}
                              </span>
                            </div>
                          ))
                        )}

                        <div className="d-flex justify-content-between small fw-bold text-dark pt-2 border-top mt-auto">
                          <span>Total Deductions</span>
                          <span className="text-danger">
                            {fmt(slipBreakdown.totalDeds)}
                          </span>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* Net Salary Payable Highlight Banner */}
                  <div
                    className="p-3.5 rounded-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
                    style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                  >
                    <div>
                      <span className="text-uppercase small fw-bold text-success d-block" style={{ letterSpacing: "0.5px" }}>
                        Net Salary In-Hand (Payable)
                      </span>
                      <span className="small text-muted fst-italic">
                        {numberToWords(slipBreakdown.net)}
                      </span>
                    </div>
                    <div className="text-sm-end">
                      <h2 className="fw-bold mb-0 text-success">
                        {fmt(slipBreakdown.net)}
                      </h2>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
                    <div className="text-muted small">
                      Generated from live database records • Confidential
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="rounded-3 px-3 py-2 fw-semibold d-flex align-items-center gap-1.5 shadow-sm bg-white border"
                        onClick={handleDownloadExcel}
                        title="Download official payslip in Excel (.xlsx) sheet"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="8" y1="13" x2="16" y2="17"></line>
                          <line x1="16" y1="13" x2="8" y2="17"></line>
                        </svg>
                        <span>Download Payslip (Excel)</span>
                      </Button>

                      <Button
                        size="sm"
                        className="rounded-3 px-4 py-2 fw-semibold text-white border-0 d-flex align-items-center gap-1.5 shadow-sm"
                        style={{ background: "#4a2835" }}
                        onClick={handleDownloadPDF}
                        title="Download official payslip in PDF (.pdf) document"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Download Payslip (PDF)</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ══ VIEW 2: ALL SLIPS DIRECTORY TABLE (FOR HR / ACCOUNTS) ══ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "table" && !isRegularEmployee && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="p-3 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div>
              <h6 className="fw-bold mb-0 text-dark">
                Everyone's Individual Salary Slips ({currentMonthYear})
              </h6>
              <small className="text-muted">
                Showing all active employees and their computed salary slips.
              </small>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Form.Control
                type="search"
                size="sm"
                placeholder="Filter employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "200px" }}
              />
              <Button
                variant="outline-success"
                size="sm"
                className="rounded-3 px-3 py-1 fw-semibold d-flex align-items-center gap-1 bg-white shadow-xs border"
                onClick={handleExportRegisterExcel}
                title="Export all salary slips register to Excel (.xlsx) with work days & status"
              >
                <span>📊 Export Excel</span>
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-3 px-3 py-1 fw-semibold d-flex align-items-center gap-1 bg-white shadow-xs text-dark border"
                onClick={handleExportRegisterPDF}
                title="Export all salary slips register to PDF (.pdf) with work days & status"
              >
                <span>📄 Export PDF</span>
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <Table hover className="align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th className="py-2.5 ps-3">Staff Member</th>
                  <th className="py-2.5">Role / Dept</th>
                  <th className="py-2.5 text-end">Gross Pay</th>
                  <th className="py-2.5 text-center">Statutory Cover</th>
                  <th className="py-2.5 text-end">Total Deductions</th>
                  <th className="py-2.5 text-end">Net Take-Home</th>
                  <th className="py-2.5 text-center">Status</th>
                  <th className="py-2.5 text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  let ss = {};
                  try {
                    ss =
                      typeof emp.salary_structure === "string"
                        ? JSON.parse(emp.salary_structure)
                        : emp.salary_structure || {};
                  } catch { }

                  const earn = ss.earnings || {};
                  const ded = ss.deductions || {};
                  const curSal = parseFloat(emp.current_salary) || 25000;

                  const gross =
                    (parseFloat(earn.basic) || 0) +
                    (parseFloat(earn.da) || 0) +
                    (parseFloat(earn.hra) || 0) +
                    (parseFloat(earn.conveyance) || 0) +
                    (parseFloat(earn.medical) || 0) +
                    (parseFloat(earn.allowance) || 0) ||
                    curSal;

                  const totalDeds =
                    (parseFloat(ded.professional_tax) || 0) +
                    (parseFloat(ded.income_tax) || 0) +
                    (parseFloat(ded.pf) || 0) +
                    (parseFloat(ded.esi) || 0) +
                    (parseFloat(ded.tds) || 0) +
                    (parseFloat(ded.lop) || 0);

                  const net =
                    parseFloat(ss.net_salary) ||
                    Math.max(0, gross - totalDeds);

                  // Check if finalized in allPayrolls
                  const isPaid = allPayrolls.some(
                    (p) =>
                      String(p.employee_id).toLowerCase() ===
                      String(emp.employee_code).toLowerCase() &&
                      String(p.month_year).toLowerCase() ===
                      currentMonthYear.toLowerCase() &&
                      p.status === "Finalized"
                  );

                  const isEsiCovered =
                    (parseFloat(ded.esi) || 0) > 0 || gross <= globalEsiThreshold;

                  return (
                    <tr key={emp.employee_code}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2.5">
                          {renderAvatar(emp, 32)}
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <div className="text-muted" style={{ fontSize: "11px" }}>
                              #{emp.employee_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-dark">
                          {emp.designation || "Staff"}
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          {emp.dept || "General"}
                        </div>
                      </td>
                      <td className="text-end fw-semibold text-dark">
                        {fmt(gross)}
                      </td>
                      <td className="text-center">
                        <span
                          className="badge rounded-pill fw-semibold cursor-pointer"
                          style={{
                            background: isEsiCovered ? "#eff6ff" : "#f1f5f9",
                            color: isEsiCovered ? "#1d4ed8" : "#475569",
                            border: isEsiCovered ? "1px solid #bfdbfe" : "1px solid #cbd5e1",
                            fontSize: "10.5px",
                            cursor: "pointer",
                          }}
                          onClick={() => setShowEsiAuditModal(true)}
                          title="Click to view statutory ESI wage ceiling & audit history"
                        >
                          {isEsiCovered ? `🛡️ ESI (≤₹${Number(globalEsiThreshold).toLocaleString("en-IN")})` : "Mediclaim"}
                        </span>
                      </td>
                      <td className="text-end text-danger">
                        {fmt(totalDeds)}
                      </td>
                      <td className="text-end fw-bold text-success fs-6">
                        {fmt(net)}
                      </td>
                      <td className="text-center">
                        <span
                          className="px-2 py-0.5 rounded-pill"
                          style={{
                            background: isPaid ? "#dcfce7" : "#ffe4e6",
                            color: isPaid ? "#15803d" : "#e11d48",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <Button
                          size="sm"
                          variant="outline-dark"
                          className="rounded-pill py-1 px-3 small fw-semibold"
                          onClick={() => {
                            setSelectedEmpCode((emp.employee_code || "").toString().replace(/^#/, "").trim());
                            setViewMode("split");
                          }}
                        >
                          View Slip
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* ══ STATUTORY ESI SLAB CONFIGURATION & AUDIT MODAL ══ */}
      <EsiSlabAuditModal
        show={showEsiAuditModal}
        onHide={() => setShowEsiAuditModal(false)}
        canEdit={["accounts", "admin", "payroll", "hr"].includes(userRole)}
        role={userRole}
        onSaved={async (newThresh) => {
          if (newThresh) setGlobalEsiThreshold(newThresh);
          await fetchInitialData();
          if (selectedEmpCode) {
            fetchEmployeeSlipData(selectedEmpCode, currentMonthYear);
          }
        }}
      />
    </div>
  );
};

export default PayslipPage;
