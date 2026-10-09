import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Card,
  Row,
  Col,
  Button,
  Form,
  Spinner,
  Alert,
  Modal,
  Dropdown,
  Badge,
  InputGroup,
} from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getApiBaseUrl, getUploadUrl } from "../../api/axios";
import { exportToExcel } from "../../utils/excelExport";
import FacilitiesWorksheetSection from "./components/FacilitiesWorksheetSection";
import EsiSlabAuditModal from "./components/EsiSlabAuditModal";

const API = getApiBaseUrl();

// Indian Currency Number to Words converter
const numberToWords = (amount) => {
  const num = Math.round(Math.abs(Number(amount) || 0));
  if (num === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
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

  const inWords = (n) => {
    let str = "";
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10) str += " " + a[n % 10];
      }
    }
    return str.trim();
  };

  return inWords(num) + " Rupees Only";
};

// Robust Indian currency formatter
const fmt = (v) => {
  const num =
    typeof v === "number"
      ? v
      : parseFloat(String(v || 0).replace(/[^\d.-]/g, ""));
  const valid = isNaN(num) ? 0 : num;
  return (
    "₹" +
    valid.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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

const FULL_YEAR_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PayrollManagement = () => {
  const navigate = useNavigate();
  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const loggedInEmpCode = (
    localStorage.getItem("employeeCode") ||
    localStorage.getItem("empId") ||
    ""
  ).trim();
  const isRegularEmployee = userRole === "employee";

  // Selection state
  const [employees, setEmployees] = useState([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState(loggedInEmpCode || "");
  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS[new Date().getMonth()]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Loading & notification states
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // All payroll records across the database
  const [allPayrolls, setAllPayrolls] = useState([]);

  // Table controls & selection
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'paid' | 'unpaid'
  const [companyFilter, setCompanyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [parentFilter, setParentFilter] = useState("all"); // 'all' | parent_group_name | 'standalone'
  const [groupViewMode, setGroupViewMode] = useState("grouped"); // 'grouped' (Location-wise with company name under parent group) | 'flat'
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [hoveredChartMonth, setHoveredChartMonth] = useState(
    new Date().getMonth()
  );
  const [showCompanyAssignModal, setShowCompanyAssignModal] = useState(false);
  const [assignModalData, setAssignModalData] = useState({
    employee: null,
    group_name: "TATA Company",
    company_name: "TATA Steel",
    work_location: "Kolkata",
  });
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Modals state
  const [showPayrollDetailsModal, setShowPayrollDetailsModal] = useState(false);
  const [showEditStructureModal, setShowEditStructureModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showAbsencesModal, setShowAbsencesModal] = useState(false);
  const [showEsiAuditModal, setShowEsiAuditModal] = useState(false);
  const [globalEsiThreshold, setGlobalEsiThreshold] = useState(21000);
  const [exportingSummary, setExportingSummary] = useState(false);

  // Accounts vs HR Role access
  const isAccountsUser = ["accounts", "admin", "payroll"].includes(userRole);
  const [activePayrollTab, setActivePayrollTab] = useState("overview");
  const isHRUser = ["hr", "hrmanager"].includes(userRole);

  // Facilities & Statutory Benefits Modal State (Accounts / HR View-Only)
  const [facilitiesModal, setFacilitiesModal] = useState({
    show: false,
    emp: null,
    loading: false,
    saving: false,
    data: null,
    formData: {
      advance_amount: 0,
      advance_deduction: 0,
      loan_amount: 0,
      loan_emi: 0,
      insurance_deduction: 0,
      esi_amount: 0,
      mediclaim_amount: 0,
      esi_threshold: 21000,
      use_global_esi: true,
    },
  });

  const handleOpenFacilitiesModal = async (emp) => {
    if (!emp) return;
    setFacilitiesModal({
      show: true,
      emp,
      loading: true,
      saving: false,
      data: null,
      formData: {
        advance_amount: 0,
        advance_deduction: 0,
        loan_amount: 0,
        loan_emi: 0,
        insurance_deduction: 0,
        esi_amount: 0,
        mediclaim_amount: 0,
        esi_threshold: 21000,
        use_global_esi: true,
      },
    });

    try {
      const empId = emp.employee_code || emp.id;
      const res = await fetch(`${API}/payroll/facilities/${empId}`, {
        headers: {
          role: userRole || "admin",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        const cur = data.current_facilities || {};
        const enabled = data.facilities_enabled || { advance: true, loan: true, insurance: true, gratuity: true };
        const gross = data.gross_salary || 0;
        const threshold = data.esi_threshold || 21000;
        const isEsiEligible = gross <= threshold;

        const defaultEsi = isEsiEligible ? Math.round(gross * 0.0075) : 0;
        const defaultMedi = !isEsiEligible ? (gross > 25000 ? 750 : 500) : 0;

        setFacilitiesModal((prev) => ({
          ...prev,
          loading: false,
          data,
          formData: {
            advance_amount: enabled.advance ? (parseFloat(cur.advance_amount) || 0) : 0,
            advance_deduction: enabled.advance ? (parseFloat(cur.advance_deduction) || 0) : 0,
            loan_amount: enabled.loan ? (parseFloat(cur.loan_amount) || 0) : 0,
            loan_emi: enabled.loan ? (parseFloat(cur.loan_emi) || 0) : 0,
            insurance_deduction: enabled.insurance ? (parseFloat(cur.insurance_deduction) || 0) : 0,
            esi_amount: isEsiEligible ? (parseFloat(cur.esi_amount) || defaultEsi) : 0,
            mediclaim_amount: !isEsiEligible ? (parseFloat(cur.mediclaim_amount) || defaultMedi) : 0,
            esi_threshold: threshold,
            use_global_esi: data.is_global_esi !== false,
          },
        }));
      } else {
        setAlertMsg({ type: "danger", text: data.error || "Failed to load facilities" });
        setFacilitiesModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (e) {
      setAlertMsg({ type: "danger", text: "Error loading facilities: " + e.message });
      setFacilitiesModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSaveFacilities = async () => {
    if (isHRUser && !isAccountsUser) {
      setAlertMsg({
        type: "danger",
        text: "Access Denied: HR has view-only access. Facilities can only be configured by Accounts Department.",
      });
      return;
    }

    const { emp, data, formData } = facilitiesModal;
    if (!emp) return;

    const enabled = data?.facilities_enabled || { advance: true, loan: true, insurance: true, gratuity: true };
    const advAmount = enabled.advance ? (parseFloat(formData.advance_amount) || 0) : 0;
    const loanAmount = enabled.loan ? (parseFloat(formData.loan_amount) || 0) : 0;

    if (enabled.advance && advAmount > 100000) {
      setAlertMsg({
        type: "danger",
        text: "Advance Payment limit exceeded: Maximum allowed is ₹1,00,000 (1 Lakh).",
      });
      return;
    }
    if (enabled.loan && loanAmount > 0 && (loanAmount < 100000 || loanAmount > 1000000)) {
      setAlertMsg({
        type: "danger",
        text: "Company Loan amount must be between ₹1,00,000 and ₹10,00,000 (1 to 10 Lakhs).",
      });
      return;
    }

    setFacilitiesModal((prev) => ({ ...prev, saving: true }));
    try {
      const empId = emp.employee_code || emp.id;
      const res = await fetch(`${API}/payroll/facilities/${empId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role: userRole || "accounts",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          facilities: enabled,
          adjustments: {
            advance_amount: advAmount,
            advance_deduction: enabled.advance ? (parseFloat(formData.advance_deduction) || 0) : 0,
            loan_amount: loanAmount,
            loan_emi: enabled.loan ? (parseFloat(formData.loan_emi) || 0) : 0,
            insurance_deduction: enabled.insurance ? (parseFloat(formData.insurance_deduction) || 0) : 0,
            esi_amount: parseFloat(formData.esi_amount) || 0,
            mediclaim_amount: parseFloat(formData.mediclaim_amount) || 0,
          },
          esi_threshold: formData.use_global_esi ? null : (parseFloat(formData.esi_threshold) || 21000),
          use_global_esi: !!formData.use_global_esi,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setAlertMsg({
          type: "success",
          text: `✅ Facilities & Benefits successfully updated for ${emp.name} and reflected in payroll calculations!`,
        });
        setFacilitiesModal((prev) => ({ ...prev, show: false, saving: false }));
        await fetchEmployees(emp.employee_code);
        await fetchAllPayrolls();
        if (selectedEmpCode === emp.employee_code) {
          await fetchPayrollData(selectedEmpCode, currentMonthYear);
        }
      } else {
        setAlertMsg({ type: "danger", text: resData.error || "Failed to update facilities" });
        setFacilitiesModal((prev) => ({ ...prev, saving: false }));
      }
    } catch (e) {
      setAlertMsg({ type: "danger", text: "Error saving facilities: " + e.message });
      setFacilitiesModal((prev) => ({ ...prev, saving: false }));
    }
  };

  // Salary Structure Editing state
  const [editingEmp, setEditingEmp] = useState(null);
  const [savingStructure, setSavingStructure] = useState(false);
  const [editStructureData, setEditStructureData] = useState({
    basic: 0,
    da: 0,
    hra: 0,
    allowance: 0,
    conveyance: 0,
    medical: 0,
    professional_tax: 200,
    income_tax: 0,
    pf: 0,
    esi: 0,
    tds: 0,
    lop: 0,
  });

  // Employee details state for View Modal
  const [employeeInfo, setEmployeeInfo] = useState({
    name: "Staff",
    employee_code: "",
    dept: "General",
    designation: "Staff",
    email: "",
    joining_date: "2025-01-01",
    bank_details: {},
  });

  // View modal breakdown state
  const [fixedPay, setFixedPay] = useState({
    basic: 0,
    hra: 0,
    conveyance: 0,
    medical: 0,
    allowance: 0,
  });

  const [variablePay, setVariablePay] = useState({
    bonus: 0,
    overtime_hours: 0,
    overtime_rate: 0,
    overtime_amount: 0,
    incentive: 0,
    reimbursement: 0,
  });

  const [attendance, setAttendance] = useState({
    total_days: 30,
    working_days: 26,
    present_days: 24,
    late_days: 0,
    paid_leaves: 0,
    leave_days: 0,
    holiday_days: 0,
    absent_days: 0,
    paid_days: 24,
    lop_days: 0,
    overtime_hours: 0,
    is_custom_lop: false,
    custom_lop_amount: 0,
  });

  const [shiftTiming, setShiftTiming] = useState({
    dateStr: "Today",
    check_in: "09:00",
    check_out: "18:00",
    overtime_mins: 0,
    late_mins: 0,
  });

  const [taxData, setTaxData] = useState({
    tds: 0,
    other_tax: 0,
  });

  const [statutory, setStatutory] = useState({
    pf: 0,
    esi: 0,
    pt: 200,
    others: 0,
  });

  const [payrollStatus, setPayrollStatus] = useState("Draft");
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [itDeclarationInfo, setItDeclarationInfo] = useState(null);
  const [adjustments, setAdjustments] = useState({
    advance_amount: 0,
    advance_deduction: 0,
    loan_amount: 0,
    loan_emi: 0,
    insurance_deduction: 0,
    gratuity_accrual: 0,
    total_gratuity: 0,
    employment_type: "Permanent",
    is_permanent: true,
    calculated_paid_days: 0,
    present_days: 0,
    leave_days: 0,
    holiday_days: 0,
    absent_days: 0,
    working_days: 26,
    days_in_month: 30,
  });

  // Month-Year formatted string
  const currentMonthYear = `${selectedMonth} ${selectedYear}`;

  const fetchGlobalSettings = async () => {
    try {
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const res = await fetch(`${API}/payroll/settings?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          role: userRole,
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await res.json();
      if (data.success && data.settings?.global_esi_threshold) {
        setGlobalEsiThreshold(parseFloat(data.settings.global_esi_threshold) || 21000);
      }
    } catch (err) {
      console.error("Error fetching global settings:", err);
    }
  };

  // 1. Initial Load: fetch employee list, all payroll records & global settings
  useEffect(() => {
    fetchEmployees();
    fetchAllPayrolls();
    fetchGlobalSettings();
  }, []);

  const fetchEmployees = async (codeToPreserve = null) => {
    setLoadingEmployees(true);
    try {
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const res = await fetch(`${API}/employees?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", role: userRole }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setEmployees(data.data);
        const preferred =
          isRegularEmployee && loggedInEmpCode
            ? loggedInEmpCode
            : codeToPreserve || selectedEmpCode;

        const match = data.data.find(
          (emp) =>
            String(emp.employee_code || "").replace(/^#/, "").toLowerCase() ===
            String(preferred || "").replace(/^#/, "").toLowerCase()
        );

        const targetCode = match ? match.employee_code : data.data[0].employee_code;
        setSelectedEmpCode(targetCode);
        fetchPayrollData(targetCode, currentMonthYear);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
    setLoadingEmployees(false);
  };

  const fetchAllPayrolls = async () => {
    try {
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const res = await fetch(`${API}/payroll/all?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", role: userRole }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setAllPayrolls(data.records);
      }
    } catch (err) {
      console.error("Error fetching all payrolls:", err);
    }
  };

  // 2. Fetch specific employee's payroll details when selected for viewing
  const fetchPayrollData = async (empCode, monthYearStr) => {
    setLoadingPayroll(true);
    try {
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const cleanCode = String(empCode || "").replace(/^#/, "").trim();
      const res = await fetch(
        `${API}/payroll/data/${cleanCode}?month=${encodeURIComponent(
          monthYearStr
        )}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", role: userRole }
        }
      );
      const data = await res.json();

      if (data.success) {
        const emp = data.employee;
        const empType = emp.employment_type || data.employment_type || "Permanent";
        const isPerm = emp.is_permanent ?? data.is_permanent ?? (empType.toLowerCase() === "permanent");

        setEmployeeInfo({
          name: emp.name || "Staff",
          employee_code: emp.employee_code || empCode,
          dept: emp.dept || "General",
          designation: emp.designation || "Staff",
          email: emp.email || "",
          joining_date: emp.joining_date || "2025-01-01",
          bank_details: emp.bank_details || {},
          employment_type: empType,
          is_permanent: isPerm,
          group_name: emp.group_name || "TATA Company",
          company_name: emp.company_name || "TATA Steel",
          work_location: emp.work_location || "Kolkata",
        });

        const adj = data.saved_payroll?.adjustments || data.adjustments || data.defaults?.adjustments || {};
        setAdjustments({
          advance_amount: isPerm ? (parseFloat(adj.advance_amount) || 0) : 0,
          advance_deduction: isPerm ? (parseFloat(adj.advance_deduction) || 0) : 0,
          loan_amount: isPerm ? (parseFloat(adj.loan_amount) || 0) : 0,
          loan_emi: isPerm ? (parseFloat(adj.loan_emi) || 0) : 0,
          insurance_deduction: isPerm ? (parseFloat(adj.insurance_deduction) || 0) : 0,
          gratuity_accrual: isPerm ? (parseFloat(adj.gratuity_accrual) || 0) : 0,
          total_gratuity: isPerm ? (parseFloat(adj.total_gratuity) || 0) : 0,
          employment_type: empType,
          is_permanent: isPerm,
          calculated_paid_days: adj.calculated_paid_days || 0,
          present_days: adj.present_days || 0,
          leave_days: adj.leave_days || 0,
          holiday_days: adj.holiday_days || 0,
          absent_days: adj.absent_days || 0,
          working_days: adj.working_days || 26,
          days_in_month: adj.days_in_month || 30,
        });

        if (data.saved_payroll) {
          const sp = data.saved_payroll;
          const useLatest = sp.status !== "Finalized" || data.has_structure_update;
          const fpSource =
            useLatest && data.latest_salary_structure
              ? data.latest_salary_structure
              : sp.fixed_pay || {};

          setFixedPay({
            basic: fpSource.basic || 0,
            hra: fpSource.hra || 0,
            conveyance: fpSource.conveyance || 0,
            medical: fpSource.medical || 0,
            allowance: fpSource.allowance || 0,
          });
          setVariablePay({
            bonus: sp.variable_pay?.bonus || 0,
            overtime_hours:
              sp.variable_pay?.overtime_hours ||
              (data.defaults?.attendance_summary?.overtime_hours || 0),
            overtime_rate: sp.variable_pay?.overtime_rate || 0,
            overtime_amount: sp.variable_pay?.overtime || 0,
            incentive: sp.variable_pay?.incentive || 0,
            reimbursement: sp.variable_pay?.reimbursement || 0,
          });
          const attSum = sp.attendance_summary || data.defaults?.attendance_summary || {};
          const pDays = attSum.present_days ?? 24;
          const lDays = attSum.leave_days || attSum.paid_leaves || 0;
          const hDays = attSum.holiday_days || 0;
          const aDays = attSum.absent_days || 0;
          const tDays = attSum.total_days || (data.defaults?.attendance_summary?.total_days || 30);
          const wDays = attSum.working_days || (data.defaults?.attendance_summary?.working_days || 26);
          const woDays = attSum.week_offs ?? Math.max(0, tDays - wDays);
          const calcPaid = attSum.paid_days != null ? attSum.paid_days : Math.max(0, Math.min(tDays, pDays + lDays + hDays + woDays - aDays));

          setAttendance({
            total_days: tDays,
            working_days: wDays,
            week_offs: woDays,
            present_days: pDays,
            late_days:
              attSum.late_days ??
              (data.defaults?.attendance_summary?.late_days ?? 0),
            paid_leaves: lDays,
            leave_days: lDays,
            holiday_days: hDays,
            absent_days: aDays,
            paid_days: calcPaid,
            lop_days:
              attSum.lop_days ??
              (data.defaults?.attendance_summary?.lop_days ?? Math.max(0, tDays - calcPaid)),
            overtime_hours:
              attSum.overtime_hours ??
              (parseFloat(sp.variable_pay?.overtime_hours) ||
                (data.defaults?.attendance_summary?.overtime_hours ?? 0)),
            is_custom_lop: !useLatest,
            custom_lop_amount: sp.lop_deduction || 0,
          });
          setTaxData({
            tds:
              (useLatest && data.latest_salary_structure
                ? data.latest_salary_structure.tds
                : sp.tax_deductions?.tds) || 0,
            other_tax:
              (useLatest && data.latest_salary_structure
                ? data.latest_salary_structure.it
                : sp.tax_deductions?.other_tax) || 0,
          });
          setStatutory({
            pf:
              (useLatest && data.latest_salary_structure
                ? data.latest_salary_structure.pf
                : sp.statutory_deductions?.pf) || 0,
            esi:
              (useLatest && data.latest_salary_structure
                ? data.latest_salary_structure.esi
                : sp.statutory_deductions?.esi) || 0,
            mediclaim:
              (useLatest && data.latest_salary_structure
                ? data.latest_salary_structure.mediclaim
                : sp.statutory_deductions?.mediclaim) || 0,
            pt:
              (useLatest && data.latest_salary_structure
                ? data.latest_salary_structure.pt
                : sp.statutory_deductions?.pt) || 200,
            others: sp.statutory_deductions?.others || 0,
          });
          setPayrollStatus(sp.status || "Finalized");
          if (data.shift_timing) {
            setShiftTiming(data.shift_timing);
          }
        } else if (data.defaults) {
          const df = data.defaults;
          const fp = data.latest_salary_structure || df.fixed_pay || {};
          setFixedPay({
            basic: fp.basic || 0,
            hra: fp.hra || 0,
            conveyance: fp.conveyance || 0,
            medical: fp.medical || 0,
            allowance: fp.allowance || 0,
          });
          setVariablePay({
            bonus: 0,
            overtime_hours: df.attendance_summary?.overtime_hours || 0,
            overtime_rate: 0,
            overtime_amount: 0,
            incentive: 0,
            reimbursement: 0,
          });
          const attSum = df.attendance_summary || {};
          const pDays = attSum.present_days ?? 24;
          const lDays = attSum.leave_days || 0;
          const hDays = attSum.holiday_days || 0;
          const aDays = attSum.absent_days || 0;
          const tDays = attSum.total_days || 30;
          const wDays = attSum.working_days || 26;
          const woDays = attSum.week_offs ?? Math.max(0, tDays - wDays);
          const calcPaid = attSum.paid_days != null ? attSum.paid_days : Math.max(0, Math.min(tDays, pDays + lDays + hDays + woDays - aDays));

          setAttendance({
            total_days: tDays,
            working_days: wDays,
            week_offs: woDays,
            present_days: pDays,
            late_days: attSum.late_days ?? 0,
            paid_leaves: lDays,
            leave_days: lDays,
            holiday_days: hDays,
            absent_days: aDays,
            paid_days: calcPaid,
            lop_days: attSum.lop_days != null ? attSum.lop_days : Math.max(0, tDays - calcPaid),
            overtime_hours: attSum.overtime_hours || 0,
            is_custom_lop: false,
            custom_lop_amount: 0,
          });
          setTaxData({
            tds: fp.tds || df.tax_deductions?.tds || 0,
            other_tax: fp.it || df.tax_deductions?.other_tax || 0,
          });
          setStatutory({
            pf:
              fp.pf ??
              (df.statutory_deductions?.pf ||
                Math.round((fp.basic || 0) * 0.12)),
            esi: fp.esi ?? (df.statutory_deductions?.esi || 0),
            mediclaim: fp.mediclaim ?? (df.statutory_deductions?.mediclaim || 0),
            pt: fp.pt ?? (df.statutory_deductions?.pt || 200),
            others: 0,
          });
          setPayrollStatus("Draft");
          if (data.shift_timing) {
            setShiftTiming(data.shift_timing);
          }
        }
        setItDeclarationInfo(data.it_declaration || null);
      }
    } catch (err) {
      console.error("Fetch payroll details error:", err);
    }
    setLoadingPayroll(false);
  };

  const fetchPayrollHistory = async (empCode) => {
    try {
      const res = await fetch(`${API}/payroll/history/${empCode}`);
      const data = await res.json();
      if (data.success) {
        setPayrollHistory(data.records || []);
      }
    } catch (err) {
      console.error("Fetch payroll history error:", err);
    }
  };

  // 3. Helper to extract payout metrics for an employee in a specific month
  const getEmployeeRowData = (emp, targetMonthYear = currentMonthYear) => {
    if (!emp)
      return { basePay: 0, commission: 0, totalPayout: 0, isPaid: false };
    const empCode = String(emp.employee_code || "").trim().toLowerCase();

    const saved = Array.isArray(allPayrolls)
      ? allPayrolls.find(
        (r) =>
          r &&
          r.employee_id &&
          String(r.employee_id).trim().toLowerCase() === empCode &&
          String(r.month_year || "").trim().toLowerCase() ===
          targetMonthYear.trim().toLowerCase()
      )
      : null;

    let basePay = 0;
    let commission = 0;
    let totalPayout = 0;
    let isPaid = false;

    if (saved) {
      let fp = {};
      let vp = {};
      try {
        fp =
          typeof saved.fixed_pay === "string"
            ? JSON.parse(saved.fixed_pay)
            : saved.fixed_pay || {};
      } catch { }
      try {
        vp =
          typeof saved.variable_pay === "string"
            ? JSON.parse(saved.variable_pay)
            : saved.variable_pay || {};
      } catch { }

      // Check if employee's salary structure was restructured by HR or Accounts
      let ss = null;
      if (emp.salary_structure) {
        try {
          ss = typeof emp.salary_structure === "string" ? JSON.parse(emp.salary_structure) : emp.salary_structure;
        } catch { }
      }

      const structFixed = ss?.earnings
        ? (parseFloat(ss.earnings.basic) || 0) +
        (parseFloat(ss.earnings.hra) || 0) +
        (parseFloat(ss.earnings.conveyance) || 0) +
        (parseFloat(ss.earnings.medical) || 0) +
        (parseFloat(ss.earnings.allowance) || 0)
        : (parseFloat(emp.current_salary) || 0);

      const savedFixed = parseFloat(fp.total_fixed || fp.basic || 0) || 0;
      const isRestructured = ss && structFixed > 0 && Math.abs(savedFixed - structFixed) > 1;

      if (isRestructured) {
        basePay = structFixed;
        commission =
          parseFloat(
            vp.total_variable ||
            (parseFloat(vp.bonus || 0) +
              parseFloat(vp.overtime || 0) +
              parseFloat(vp.incentive || 0))
          ) || 0;
        const d = ss?.deductions || {};
        const adj = ss?.adjustments || {};
        const totalDeds =
          (parseFloat(d.professional_tax) || 0) +
          (parseFloat(d.income_tax) || 0) +
          (parseFloat(d.pf) || 0) +
          (parseFloat(d.esi) || 0) +
          (parseFloat(d.mediclaim) || 0) +
          (parseFloat(d.tds) || 0) +
          (parseFloat(adj.advance_deduction) || 0) +
          (parseFloat(adj.loan_emi) || 0) +
          (parseFloat(adj.insurance_deduction) || 0);
        totalPayout = parseFloat(ss?.net_salary) || Math.max(0, basePay - totalDeds);
        isPaid = false; // Restructured salary requires reviewing/finalizing
      } else {
        basePay = savedFixed;
        commission =
          parseFloat(
            vp.total_variable ||
            (parseFloat(vp.bonus || 0) +
              parseFloat(vp.overtime || 0) +
              parseFloat(vp.incentive || 0))
          ) || 0;
        totalPayout = parseFloat(saved.net_salary || saved.gross_pay || 0) || 0;
        isPaid = saved.status === "Finalized";
      }
    } else {
      const curSal = parseFloat(emp.current_salary) || 25000;
      if (emp.salary_structure) {
        try {
          const ss =
            typeof emp.salary_structure === "string"
              ? JSON.parse(emp.salary_structure)
              : emp.salary_structure;
          const e = ss?.earnings || {};
          const d = ss?.deductions || {};
          const structGross =
            (parseFloat(e.basic) || 0) +
            (parseFloat(e.hra) || 0) +
            (parseFloat(e.conveyance) || 0) +
            (parseFloat(e.medical) || 0) +
            (parseFloat(e.allowance) || 0);

          if (curSal > 0 && Math.abs(structGross - curSal) > 1) {
            basePay = curSal;
          } else {
            basePay = structGross || curSal;
          }
          commission = 0;
          const adj = ss?.adjustments || {};
          const advDed = parseFloat(adj.advance_deduction) || 0;
          const loanEmi = parseFloat(adj.loan_emi) || 0;
          const insDed = parseFloat(adj.insurance_deduction) || 0;
          const totalDeds =
            (parseFloat(d.professional_tax) || 0) +
            (parseFloat(d.income_tax) || 0) +
            (parseFloat(d.pf) || 0) +
            (parseFloat(d.esi) || 0) +
            (parseFloat(d.mediclaim) || 0) +
            (parseFloat(d.tds) || 0) +
            (parseFloat(d.lop) || 0) +
            advDed +
            loanEmi +
            insDed;

          totalPayout = Math.max(0, basePay - totalDeds);
        } catch {
          basePay = curSal;
          commission = 0;
          totalPayout = curSal;
        }
      } else {
        basePay = curSal;
        commission = 0;
        totalPayout = curSal;
      }
      isPaid = false;
    }

    return {
      basePay: isNaN(basePay) ? 0 : basePay,
      commission: isNaN(commission) ? 0 : commission,
      totalPayout: isNaN(totalPayout) ? 0 : totalPayout,
      isPaid,
    };
  };

  // 4. Real-time badge calculator vs previous month
  const getChangeBadge = (current, previous) => {
    if (!previous || previous === 0) {
      if (current > 0)
        return { text: "+100% vs last month", isPositive: true };
      return { text: "0% vs last month", isPositive: true };
    }
    const diff = ((current - previous) / previous) * 100;
    const rounded = Math.abs(diff).toFixed(1);
    if (diff >= 0) {
      return { text: `+${rounded}% vs last month`, isPositive: true };
    } else {
      return { text: `-${rounded}% vs last month`, isPositive: false };
    }
  };

  // Previous month-year calculation
  const prevMonthIndex =
    MONTHS.indexOf(selectedMonth) === 0 ? 11 : MONTHS.indexOf(selectedMonth) - 1;
  const prevMonthName = MONTHS[prevMonthIndex];
  const prevMonthYear = `${prevMonthName} ${prevMonthIndex === 11 ? selectedYear - 1 : selectedYear
    }`;

  // 5. Aggregated Top 4 KPI Metrics with real-time comparison badges
  const overviewStats = useMemo(() => {
    const totalEmployees =
      Array.isArray(employees) && employees.length > 0 ? employees.length : 17;
    const activeEmployees = Array.isArray(employees)
      ? employees.filter(
        (e) => String(e?.status || "Active").toLowerCase() === "active"
      ).length || 14
      : 14;

    let totalPayroll = 0;
    let totalCommission = 0;
    let upcomingPayouts = 0;

    let prevTotalPayroll = 0;
    let prevTotalCommission = 0;
    let prevUpcomingPayouts = 0;

    if (Array.isArray(employees)) {
      employees.forEach((emp) => {
        if (!emp) return;
        // Current month metrics
        const m = getEmployeeRowData(emp, currentMonthYear);
        totalPayroll += m.totalPayout || 0;
        totalCommission += m.commission || 0;
        if (!m.isPaid) {
          upcomingPayouts += m.totalPayout || 0;
        }

        // Previous month metrics for real-time comparison
        const prevM = getEmployeeRowData(emp, prevMonthYear);
        prevTotalPayroll += prevM.totalPayout || 0;
        prevTotalCommission += prevM.commission || 0;
        if (!prevM.isPaid) {
          prevUpcomingPayouts += prevM.totalPayout || 0;
        }
      });
    }

    // Default fallbacks if database is brand new
    if (totalPayroll === 0) totalPayroll = 202480;
    if (totalCommission === 0) totalCommission = 28410;
    if (upcomingPayouts === 0) upcomingPayouts = 12620;

    if (prevTotalPayroll === 0) prevTotalPayroll = totalPayroll * 1.08;
    if (prevTotalCommission === 0) prevTotalCommission = totalCommission * 0.96;
    if (prevUpcomingPayouts === 0) prevUpcomingPayouts = upcomingPayouts * 0.96;

    const payrollChange = getChangeBadge(totalPayroll, prevTotalPayroll);
    const commissionChange = getChangeBadge(
      totalCommission,
      prevTotalCommission
    );
    const upcomingChange = getChangeBadge(upcomingPayouts, prevUpcomingPayouts);

    return {
      totalEmployees,
      activeEmployees,
      totalPayroll,
      totalCommission,
      upcomingPayouts,
      payrollChange,
      commissionChange,
      upcomingChange,
    };
  }, [employees, allPayrolls, currentMonthYear, prevMonthYear]);

  // 6. LIVE PAYROLL HISTORY CHART FOR THE FULL YEAR (All 12 Months)
  const fullYearChartData = useMemo(() => {
    let yearSum = 0;
    const series = FULL_YEAR_MONTHS.map((mShort, idx) => {
      const fullMonth = MONTHS[idx];
      const mStr = `${fullMonth} ${selectedYear}`;

      // Sum all finalized or estimated net payouts for this specific month in the selected year
      let monthTotal = 0;
      if (Array.isArray(allPayrolls) && allPayrolls.length > 0) {
        const matchingRecords = allPayrolls.filter(
          (r) =>
            r &&
            String(r.month_year || "").toLowerCase() === mStr.toLowerCase()
        );
        if (matchingRecords.length > 0) {
          matchingRecords.forEach((r) => {
            monthTotal += parseFloat(r.net_salary || r.gross_pay || 0);
          });
        }
      }

      // If no finalized record exists yet for that month, calculate based on current staff baseline
      if (monthTotal === 0 && Array.isArray(employees) && employees.length > 0) {
        // Natural curve fluctuation based on seasonal month weights
        const seasonalWeights = [
          0.88, 0.92, 0.85, 1.05, 0.98, 1.02, 1.12, 1.18, 1.15, 1.22, 1.26,
          1.32,
        ];
        const baseMonthly = overviewStats.totalPayroll || 202480;
        monthTotal = Math.round(baseMonthly * (seasonalWeights[idx] || 1.0));
      }

      yearSum += monthTotal;

      return {
        month: mShort,
        monthFull: fullMonth,
        monthIndex: idx,
        total: monthTotal,
        label: fmt(monthTotal),
      };
    });

    // Compute change % vs previous month for each point in series
    const seriesWithChange = series.map((item, i) => {
      const prevTotal = i > 0 ? series[i - 1].total : series[series.length - 1].total;
      const diff = ((item.total - prevTotal) / (prevTotal || 1)) * 100;
      const rounded = Math.abs(diff).toFixed(2);
      const changeStr = diff >= 0 ? `↗ +${rounded}%` : `↘ -${rounded}%`;
      return {
        ...item,
        change: changeStr,
        isPositive: diff >= 0,
      };
    });

    return {
      series: seriesWithChange,
      annualTotal: yearSum,
    };
  }, [allPayrolls, employees, selectedYear, overviewStats.totalPayroll]);

  // Generate SVG Cubic Bézier Path for 12 months
  const splineCoordinates = useMemo(() => {
    const data = fullYearChartData.series;
    if (!data || data.length === 0) return { path: "", area: "", points: [] };

    const totals = data.map((d) => d.total);
    const minVal = Math.min(...totals) * 0.9 || 10000;
    const maxVal = Math.max(...totals) * 1.1 || 100000;

    const chartWidth = 430;
    const startX = 22;
    const endX = 415;
    const stepX = (endX - startX) / (data.length - 1);
    const topY = 25;
    const bottomY = 115;

    const points = data.map((item, idx) => {
      const x = startX + idx * stepX;
      const normalized = (item.total - minVal) / (maxVal - minVal || 1);
      const y = bottomY - normalized * (bottomY - topY);
      return { ...item, x, y };
    });

    // Build Cubic Bézier Spline
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }

    const area = `${path} L ${points[points.length - 1].x},130 L ${points[0].x},130 Z`;

    return { path, area, points };
  }, [fullYearChartData]);

  // 7. Filtered employee list for dashboard table
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter((emp) => {
      if (!emp) return false;
      const search = (tableSearch || "").trim().toLowerCase();
      const empName = String(emp.name || "").toLowerCase();
      const empCode = String(emp.employee_code || "").toLowerCase();
      const dept = String(emp.dept || "").toLowerCase();
      const desig = String(emp.designation || "").toLowerCase();
      const comp = String(emp.company_name || "").toLowerCase();
      const loc = String(emp.work_location || "").toLowerCase();
      const grp = String(emp.group_name || "").toLowerCase();

      const matchSearch =
        !search ||
        empName.includes(search) ||
        empCode.includes(search) ||
        dept.includes(search) ||
        desig.includes(search) ||
        comp.includes(search) ||
        loc.includes(search) ||
        grp.includes(search);

      const metrics = getEmployeeRowData(emp, currentMonthYear);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && metrics.isPaid) ||
        (statusFilter === "unpaid" && !metrics.isPaid);

      const matchCompany =
        companyFilter === "all" ||
        String(emp.company_name || "").toLowerCase() === companyFilter.toLowerCase();

      const matchLocation =
        locationFilter === "all" ||
        String(emp.work_location || "").toLowerCase() === locationFilter.toLowerCase();

      const rawGroup = (emp.group_name || "").trim();
      const isStandalone =
        !rawGroup || ["none", "n/a", "standalone", "-"].includes(rawGroup.toLowerCase());

      let matchParent = true;
      if (parentFilter !== "all") {
        if (parentFilter === "standalone") {
          matchParent = isStandalone;
        } else {
          matchParent = !isStandalone && rawGroup.toLowerCase() === parentFilter.toLowerCase();
        }
      }

      return matchSearch && matchStatus && matchCompany && matchLocation && matchParent;
    });
  }, [employees, allPayrolls, tableSearch, statusFilter, companyFilter, locationFilter, parentFilter, currentMonthYear]);

  // Distinct parent groups, distinct companies, distinct locations, and standalone flag
  const distinctParentGroups = useMemo(() => {
    const set = new Set();
    (Array.isArray(employees) ? employees : []).forEach((e) => {
      if (e && e.group_name) {
        const g = e.group_name.trim();
        if (g && !["none", "n/a", "standalone", "-"].includes(g.toLowerCase())) {
          set.add(g);
        }
      }
    });
    return Array.from(set).sort();
  }, [employees]);

  const hasStandaloneEntities = useMemo(() => {
    return (Array.isArray(employees) ? employees : []).some((e) => {
      if (!e) return false;
      const g = (e.group_name || "").trim().toLowerCase();
      return !g || ["none", "n/a", "standalone", "-"].includes(g);
    });
  }, [employees]);

  const distinctCompanies = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(employees) ? employees : [])
          .map((e) => (e && e.company_name ? e.company_name.trim() : ""))
          .filter(Boolean)
      )
    ).sort();
  }, [employees]);

  const distinctLocations = useMemo(() => {
    return Array.from(
      new Set(
        (Array.isArray(employees) ? employees : [])
          .map((e) => (e && e.work_location ? e.work_location.trim() : ""))
          .filter(Boolean)
      )
    ).sort();
  }, [employees]);

  // Grouped hierarchy: Parent Organization / Standalone Company -> Subsidiary Units (Location + Company) -> Employees
  const parentOrganizations = useMemo(() => {
    const orgMap = new Map();

    filteredEmployees.forEach((emp) => {
      const rawGroup = (emp.group_name || "").trim();
      const isStandalone =
        !rawGroup || ["none", "n/a", "standalone", "-"].includes(rawGroup.toLowerCase());
      const compName =
        (emp.company_name || "").trim() || (isStandalone ? "Standalone Company" : "Subsidiary Company");
      const locName = (emp.work_location || "").trim() || "Kolkata";

      const orgKey = isStandalone ? `standalone___${compName}` : `parent___${rawGroup}`;
      const orgType = isStandalone ? "standalone" : "parent";
      const orgDisplayName = isStandalone ? compName : rawGroup;

      if (!orgMap.has(orgKey)) {
        orgMap.set(orgKey, {
          key: orgKey,
          type: orgType,
          name: orgDisplayName,
          rawGroupName: isStandalone ? null : rawGroup,
          companyName: isStandalone ? compName : null,
          employees: [],
          subsidiariesSet: new Set(),
          locationsSet: new Set(),
          unitsMap: new Map(),
          totalBase: 0,
          totalGross: 0,
          totalNet: 0,
          paidCount: 0,
          unpaidCount: 0,
        });
      }

      const org = orgMap.get(orgKey);
      org.employees.push(emp);
      org.subsidiariesSet.add(compName);
      org.locationsSet.add(locName);

      const metrics = getEmployeeRowData(emp, currentMonthYear);
      const base = metrics.basePay || 0;
      const net = metrics.totalPayout || 0;
      org.totalBase += base;
      org.totalGross += base;
      org.totalNet += net;
      if (metrics.isPaid) org.paidCount += 1;
      else org.unpaidCount += 1;

      // Group into units by location & company
      const unitKey = `${locName}___${compName}`;
      if (!org.unitsMap.has(unitKey)) {
        org.unitsMap.set(unitKey, {
          key: `${orgKey}___${unitKey}`,
          location: locName,
          company_name: compName,
          parent_name: orgDisplayName,
          isStandalone,
          employees: [],
          totalBase: 0,
          totalGross: 0,
          totalNet: 0,
          paidCount: 0,
          unpaidCount: 0,
        });
      }

      const unit = org.unitsMap.get(unitKey);
      unit.employees.push(emp);
      unit.totalBase += base;
      unit.totalGross += base;
      unit.totalNet += net;
      if (metrics.isPaid) unit.paidCount += 1;
      else unit.unpaidCount += 1;
    });

    // Convert map to sorted array
    return Array.from(orgMap.values())
      .map((org) => ({
        ...org,
        subsidiariesCount: org.subsidiariesSet.size,
        locationsCount: org.locationsSet.size,
        units: Array.from(org.unitsMap.values()).sort((a, b) => {
          if (a.location !== b.location) return a.location.localeCompare(b.location);
          return a.company_name.localeCompare(b.company_name);
        }),
      }))
      .sort((a, b) => {
        // Parent groups first, then standalone companies
        if (a.type !== b.type) {
          return a.type === "parent" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [filteredEmployees, allPayrolls, currentMonthYear]);

  // Batch disbursement API helper
  const handleBatchDisburse = async (empCodes) => {
    if (!empCodes || empCodes.length === 0) return;
    setIsDisbursing(true);
    try {
      const res = await fetch(`${API}/payroll/disburse-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_ids: empCodes,
          month: currentMonthYear,
          payment_date: new Date().toISOString().split("T")[0],
          payment_mode: "Bank Transfer",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({
          type: "success",
          text: `Salary disbursement successfully completed for ${data.disbursed_count || empCodes.length} employee(s) via Bank Transfer.`,
        });
        await fetchAllPayrolls();
      } else {
        setAlertMsg({ type: "danger", text: data.error || "Failed to disburse salaries." });
      }
    } catch (err) {
      console.error("Batch disburse error:", err);
      setAlertMsg({ type: "danger", text: "Network error during batch disbursement." });
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleDisburseSection = async (sectionEmployees) => {
    if (!sectionEmployees || sectionEmployees.length === 0) return;
    const unpaidCodes = sectionEmployees
      .filter((e) => {
        const m = getEmployeeRowData(e, currentMonthYear);
        return !m.isPaid;
      })
      .map((e) => e.employee_code);

    if (unpaidCodes.length === 0) {
      setAlertMsg({ type: "info", text: "All staff members in this section are already disbursed." });
      return;
    }
    await handleBatchDisburse(unpaidCodes);
  };

  const handleDisburseOrg = async (orgEmployees) => {
    if (!orgEmployees || orgEmployees.length === 0) return;
    const unpaidCodes = orgEmployees
      .filter((e) => {
        const m = getEmployeeRowData(e, currentMonthYear);
        return !m.isPaid;
      })
      .map((e) => e.employee_code);

    if (unpaidCodes.length === 0) {
      setAlertMsg({ type: "info", text: "All staff members in this organization are already disbursed." });
      return;
    }
    await handleBatchDisburse(unpaidCodes);
  };

  const handleDisburseSelected = async () => {
    if (selectedEmployees.size === 0) return;
    await handleBatchDisburse(Array.from(selectedEmployees));
  };

  const handleOpenAssignModal = (emp) => {
    if (!emp) return;
    setAssignModalData({
      employee: emp,
      group_name: emp.group_name || "",
      company_name: emp.company_name || "",
      work_location: emp.work_location || "Kolkata",
    });
    setShowCompanyAssignModal(true);
  };

  const handleSaveCompanyAssignment = async () => {
    if (!assignModalData.employee) return;
    try {
      const res = await fetch(`${API}/payroll/assign-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: assignModalData.employee.employee_code,
          group_name: assignModalData.group_name,
          company_name: assignModalData.company_name,
          work_location: assignModalData.work_location,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({
          type: "success",
          text: `Updated corporate allocation for ${assignModalData.employee.name} (${assignModalData.company_name} • ${assignModalData.work_location})`,
        });
        setShowCompanyAssignModal(false);
        await fetchEmployees(assignModalData.employee.employee_code);
      } else {
        setAlertMsg({ type: "danger", text: data.error || "Failed to update entity assignment." });
      }
    } catch (err) {
      console.error("Save company assign error:", err);
      setAlertMsg({ type: "danger", text: "Network error saving entity assignment." });
    }
  };

  // Current employee index for modal pagination (e.g. "3 of 5")
  const currentEmpIndex = Array.isArray(employees)
    ? employees.findIndex((e) => e && e.employee_code === selectedEmpCode)
    : -1;

  // Open View Modal (Eye Icon)
  const handleOpenEmployeeModal = async (empCode) => {
    if (!empCode) return;
    setSelectedEmpCode(empCode);
    setShowPayrollDetailsModal(true);
    await fetchPayrollData(empCode, currentMonthYear);
    await fetchPayrollHistory(empCode);
  };

  const handlePrevEmployee = () => {
    if (
      currentEmpIndex > 0 &&
      Array.isArray(employees) &&
      employees[currentEmpIndex - 1]
    ) {
      const prev = employees[currentEmpIndex - 1];
      if (prev?.employee_code) {
        handleOpenEmployeeModal(prev.employee_code);
      }
    }
  };

  const handleNextEmployee = () => {
    if (
      Array.isArray(employees) &&
      currentEmpIndex >= 0 &&
      currentEmpIndex < employees.length - 1 &&
      employees[currentEmpIndex + 1]
    ) {
      const next = employees[currentEmpIndex + 1];
      if (next?.employee_code) {
        handleOpenEmployeeModal(next.employee_code);
      }
    }
  };

  // Open Edit Salary Structure Modal (Pencil Icon)
  const handleOpenEditStructure = async (emp) => {
    if (!emp) return;
    setEditingEmp(emp);
    setShowEditStructureModal(true);

    let ss = {};
    if (typeof emp.salary_structure === "string") {
      try {
        ss = JSON.parse(emp.salary_structure);
      } catch { }
    } else if (emp.salary_structure) {
      ss = emp.salary_structure;
    }

    const earnings = ss.earnings || {};
    const deductions = ss.deductions || {};
    const curSal = parseFloat(emp.current_salary) || 25000;
    const structGross = (earnings.basic != null ? parseFloat(earnings.basic) : 0) +
      (earnings.hra != null ? parseFloat(earnings.hra) : 0) +
      (earnings.allowance != null ? parseFloat(earnings.allowance) : 0) +
      (earnings.conveyance != null ? parseFloat(earnings.conveyance) : 0) +
      (earnings.medical != null ? parseFloat(earnings.medical) : 0);
    const hasValidStruct = structGross > 0 && Math.abs(structGross - curSal) <= 1;

    const initialBasic = hasValidStruct && earnings.basic != null ? parseFloat(earnings.basic) : Math.round(curSal * 0.45);
    const initialHra = hasValidStruct && earnings.hra != null ? parseFloat(earnings.hra) : Math.round(curSal * 0.40);
    const initialConveyance = hasValidStruct && earnings.conveyance != null ? parseFloat(earnings.conveyance) : Math.round(curSal * 0.05);
    const initialMedical = hasValidStruct && earnings.medical != null ? parseFloat(earnings.medical) : Math.round(curSal * 0.05);
    const initialAllowance = hasValidStruct && earnings.allowance != null ? parseFloat(earnings.allowance) : Math.max(0, curSal - (initialBasic + initialHra + initialConveyance + initialMedical));
    const initialGross = initialBasic + initialHra + initialAllowance + initialConveyance + initialMedical || curSal;
    const initialIsEsi = initialGross <= (globalEsiThreshold || 21000);
    const initialEsi = deductions.esi != null ? parseFloat(deductions.esi) : 0;
    const initialMedi = deductions.mediclaim != null ? parseFloat(deductions.mediclaim) : 0;
    const empType = emp.employment_type || "Permanent";

    // Initial populate from cached employee object
    setEditStructureData({
      basic: initialBasic,
      da: 0,
      hra: initialHra,
      allowance: initialAllowance,
      conveyance: initialConveyance,
      medical: initialMedical,
      professional_tax: deductions.professional_tax != null ? parseFloat(deductions.professional_tax) : 200,
      income_tax: deductions.income_tax != null ? parseFloat(deductions.income_tax) : 0,
      pf:
        deductions.pf != null
          ? parseFloat(deductions.pf)
          : Math.round(initialBasic * 0.12),
      esi: initialIsEsi ? initialEsi : 0,
      mediclaim: !initialIsEsi ? initialMedi : 0,
      tds: deductions.tds != null ? parseFloat(deductions.tds) : 0,
      lop: deductions.lop != null ? parseFloat(deductions.lop) : 0,
      employment_type: empType,
    });

    // Fetch live real-time salary structure from database
    try {
      const cleanEmpCode = (emp.employee_code || emp.id || "").toString().replace(/^#/, "").trim();
      if (!cleanEmpCode) return;
      const res = await fetch(`${API}/employees/${cleanEmpCode}/salary?_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }
      });
      const data = await res.json();
      if (data.success && data.salary) {
        const liveEarnings = data.salary.earnings || {};
        const liveDeductions = data.salary.deductions || {};
        const liveCurSal = parseFloat(data.salary.gross_salary || emp.current_salary || curSal);

        let liveBasic = liveEarnings.basic != null ? parseFloat(liveEarnings.basic) : 0;
        let liveHra = liveEarnings.hra != null ? parseFloat(liveEarnings.hra) : 0;
        let liveAllowance = liveEarnings.allowance != null ? parseFloat(liveEarnings.allowance) : 0;
        let liveConveyance = liveEarnings.conveyance != null ? parseFloat(liveEarnings.conveyance) : 0;
        let liveMedical = liveEarnings.medical != null ? parseFloat(liveEarnings.medical) : 0;
        let liveGross = liveBasic + liveHra + liveAllowance + liveConveyance + liveMedical;

        // Auto-realign if mismatch with live current_salary
        if (liveGross === 0 || (liveCurSal > 0 && Math.abs(liveGross - liveCurSal) >= 1)) {
          liveBasic = Math.round(liveCurSal * 0.45);
          liveHra = Math.round(liveCurSal * 0.40);
          liveConveyance = Math.round(liveCurSal * 0.05);
          liveMedical = Math.round(liveCurSal * 0.05);
          liveAllowance = Math.max(0, liveCurSal - (liveBasic + liveHra + liveConveyance + liveMedical));
          liveGross = liveCurSal;
        }

        const threshold = parseFloat(data.salary.esi_threshold || data.esi_threshold) || 21000;
        const liveIsEsi = liveGross <= threshold;
        const liveEsi = liveDeductions.esi != null ? parseFloat(liveDeductions.esi) : 0;
        const liveMedi = liveDeductions.mediclaim != null ? parseFloat(liveDeductions.mediclaim) : 0;
        const liveEmpType = data.salary.employment_type || empType || "Permanent";

        setEditStructureData({
          basic: liveBasic,
          da: 0,
          hra: liveHra,
          allowance: liveAllowance,
          conveyance: liveConveyance,
          medical: liveMedical,
          professional_tax: liveDeductions.professional_tax != null ? parseFloat(liveDeductions.professional_tax) : 0,
          income_tax: liveDeductions.income_tax != null ? parseFloat(liveDeductions.income_tax) : 0,
          pf: liveDeductions.pf != null ? parseFloat(liveDeductions.pf) : 0,
          esi: liveIsEsi ? liveEsi : 0,
          mediclaim: !liveIsEsi ? liveMedi : 0,
          tds: liveDeductions.tds != null ? parseFloat(liveDeductions.tds) : 0,
          lop: liveDeductions.lop != null ? parseFloat(liveDeductions.lop) : 0,
          employment_type: liveEmpType,
        });
      }
    } catch (err) {
      console.warn("Could not fetch live salary structure, using cached:", err);
    }
  };

  // Compute live totals for Salary Structure editing
  const computedEditGross = useMemo(() => {
    return (
      (parseFloat(editStructureData.basic) || 0) +
      (parseFloat(editStructureData.hra) || 0) +
      (parseFloat(editStructureData.conveyance) || 0) +
      (parseFloat(editStructureData.medical) || 0) +
      (parseFloat(editStructureData.allowance) || 0)
    );
  }, [editStructureData]);

  const computedEditDeductions = useMemo(() => {
    const isEsi = computedEditGross <= (globalEsiThreshold || 21000);
    const healthDeduction = isEsi ? (parseFloat(editStructureData.esi) || 0) : (parseFloat(editStructureData.mediclaim) || 0);

    return (
      (parseFloat(editStructureData.professional_tax) || 0) +
      (parseFloat(editStructureData.income_tax) || 0) +
      (parseFloat(editStructureData.pf) || 0) +
      healthDeduction +
      (parseFloat(editStructureData.tds) || 0) +
      (parseFloat(editStructureData.lop) || 0)
    );
  }, [editStructureData, computedEditGross, globalEsiThreshold]);

  const computedEditNet = useMemo(() => {
    return Math.max(0, computedEditGross - computedEditDeductions);
  }, [computedEditGross, computedEditDeductions]);

  // Save Salary Structure via API
  const handleSaveSalaryStructure = async () => {
    if (!editingEmp) return;

    setSavingStructure(true);
    try {
      const cleanEmpCode = (editingEmp.employee_code || editingEmp.id || "").toString().replace(/^#/, "").trim();
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const token = localStorage.getItem("token");
      const isEsi = computedEditGross <= (globalEsiThreshold || 21000);

      const res = await fetch(`${API}/employees/${cleanEmpCode}/salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role: userRole || "admin",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...editStructureData,
          da: 0,
          esi: isEsi ? (parseFloat(editStructureData.esi) || 0) : 0,
          mediclaim: !isEsi ? (parseFloat(editStructureData.mediclaim) || 0) : 0,
          employment_type: editStructureData.employment_type || "Permanent",
          role: userRole || "admin",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMsg({
          type: "success",
          text: `✅ Salary structure updated successfully for ${editingEmp.name}!`,
        });
        setShowEditStructureModal(false);
        const refreshCode = cleanEmpCode || (selectedEmpCode ? selectedEmpCode.toString().replace(/^#/, "").trim() : "");
        await fetchEmployees(refreshCode);
        await fetchAllPayrolls();
        if (refreshCode) {
          await fetchPayrollData(refreshCode, currentMonthYear);
        }
      } else {
        setAlertMsg({
          type: "danger",
          text: data.error || "Failed to update salary structure.",
        });
      }
    } catch (err) {
      console.error("Save salary structure error:", err);
      setAlertMsg({
        type: "danger",
        text: "Network error updating salary structure.",
      });
    }
    setSavingStructure(false);
  };

  // Save / Finalize Payroll for selected employee
  const handleFinalizePayroll = async (targetStatus = "Finalized") => {
    if (!selectedEmpCode) return;
    setSavingPayroll(true);

    const grossCalc =
      (parseFloat(fixedPay.basic) || 0) +
      (parseFloat(fixedPay.hra) || 0) +
      (parseFloat(fixedPay.conveyance) || 0) +
      (parseFloat(fixedPay.medical) || 0) +
      (parseFloat(fixedPay.allowance) || 0);

    const lopCalc =
      attendance.lop_days > 0
        ? Math.round((grossCalc / (attendance.total_days || 30)) * attendance.lop_days)
        : 0;

    const isPermanent = employeeInfo.is_permanent !== false && adjustments.is_permanent !== false;
    const advDed = isPermanent ? (parseFloat(adjustments.advance_deduction) || 0) : 0;
    const loanEmi = isPermanent ? (parseFloat(adjustments.loan_emi) || 0) : 0;
    const insDed = isPermanent ? (parseFloat(adjustments.insurance_deduction) || 0) : 0;

    const deductionsCalc =
      (parseFloat(statutory.pf) || 0) +
      (parseFloat(statutory.esi) || 0) +
      (parseFloat(statutory.pt) || 0) +
      (parseFloat(taxData.tds) || 0) +
      lopCalc +
      advDed +
      loanEmi +
      insDed;

    const netCalc = Math.max(0, grossCalc - deductionsCalc);

    const payload = {
      employee_id: selectedEmpCode,
      month_year: currentMonthYear,
      fixed_pay: {
        basic: parseFloat(fixedPay.basic) || 0,
        hra: parseFloat(fixedPay.hra) || 0,
        conveyance: parseFloat(fixedPay.conveyance) || 0,
        medical: parseFloat(fixedPay.medical) || 0,
        allowance: parseFloat(fixedPay.allowance) || 0,
        total_fixed: grossCalc,
      },
      variable_pay: {
        bonus: parseFloat(variablePay.bonus) || 0,
        overtime_hours: parseFloat(variablePay.overtime_hours) || 0,
        overtime_rate: parseFloat(variablePay.overtime_rate) || 0,
        overtime: parseFloat(variablePay.overtime_amount) || 0,
        incentive: parseFloat(variablePay.incentive) || 0,
        reimbursement: parseFloat(variablePay.reimbursement) || 0,
        total_variable: 0,
      },
      gross_pay: grossCalc,
      attendance_summary: attendance,
      lop_deduction: lopCalc,
      tax_deductions: taxData,
      statutory_deductions: statutory,
      adjustments: {
        ...adjustments,
        is_permanent: isPermanent,
        employment_type: employeeInfo.employment_type || adjustments.employment_type || "Permanent",
        advance_deduction: advDed,
        loan_emi: loanEmi,
        insurance_deduction: insDed,
      },
      other_deductions: {
        advance_deduction: advDed,
        loan_emi: loanEmi,
        insurance_deduction: insDed,
      },
      total_deductions: deductionsCalc,
      net_salary: netCalc,
      status: targetStatus,
      payment_date: new Date().toISOString().split("T")[0],
      payment_mode: "Bank Transfer",
    };

    try {
      const res = await fetch(`${API}/payroll/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setPayrollStatus(targetStatus);
        setAlertMsg({
          type: "success",
          text: `✅ Payroll for ${employeeInfo.name} marked as ${targetStatus}!`,
        });
        fetchAllPayrolls();
      }
    } catch (err) {
      console.error("Finalize error:", err);
    }
    setSavingPayroll(false);
  };

  // Role badge color styling matching design
  const getRoleBadgeStyle = (role = "") => {
    const r = String(role || "").toLowerCase();
    if (
      r.includes("hair") ||
      r.includes("stylist") ||
      r.includes("design") ||
      r.includes("it") ||
      r.includes("engineer")
    ) {
      return { bg: "#ede9fe", color: "#6d28d9" };
    } else if (r.includes("assist") || r.includes("hr")) {
      return { bg: "#dcfce7", color: "#15803d" };
    } else if (
      r.includes("junior") ||
      r.includes("service") ||
      r.includes("peon")
    ) {
      return { bg: "#ffe4e6", color: "#e11d48" };
    } else if (r.includes("account") || r.includes("finance")) {
      return { bg: "#fef3c7", color: "#b45309" };
    } else {
      return { bg: "#e0f2fe", color: "#0369a1" };
    }
  };

  // Avatar renderer with photo or colored initial circle
  const renderAvatar = (emp, size = 36) => {
    if (emp?.profile_photo) {
      const photoUrl = getUploadUrl(emp.profile_photo);
      return (
        <img
          src={photoUrl}
          alt={emp?.name || "Avatar"}
          onError={(e) => {
            e.target.style.display = "none";
            if (e.target.nextSibling)
              e.target.nextSibling.style.display = "flex";
          }}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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

  // Professional PDF Salary Slip generator (REMOVES BLANK / EMPTY DATA)
  const generatePayslipPDF = () => {
    const doc = new jsPDF();

    // 1. Corporate Header Banner
    doc.setFillColor(74, 40, 53); // Deep Burgundy
    doc.rect(0, 0, 210, 26, "F");

    const compTitle = (employeeInfo.company_name || "TATA STEEL").toUpperCase();
    const grpTitle = (employeeInfo.group_name || "TATA Company").toUpperCase();
    const locTitle = employeeInfo.work_location || "Kolkata";

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(compTitle, 105, 12, {
      align: "center",
    });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `A Subsidiary of ${grpTitle} • Location: ${locTitle} | Confidential Employee Pay Slip`,
      105,
      19,
      { align: "center" }
    );

    // 2. Payslip Period Subheader
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`SALARY PAYSLIP FOR ${currentMonthYear.toUpperCase()}`, 14, 35);

    // 3. Employee Metadata Block
    const metaRows = [
      [
        { content: "Employee Name:", styles: { fontStyle: "bold" } },
        employeeInfo.name || "N/A",
        { content: "Employee ID:", styles: { fontStyle: "bold" } },
        employeeInfo.employee_code || "N/A",
      ],
      [
        { content: "Company / Unit:", styles: { fontStyle: "bold" } },
        employeeInfo.company_name || "TATA Steel",
        { content: "Group / Holding:", styles: { fontStyle: "bold" } },
        employeeInfo.group_name || "TATA Company",
      ],
      [
        { content: "Designation:", styles: { fontStyle: "bold" } },
        employeeInfo.designation || "Staff",
        { content: "Work Location:", styles: { fontStyle: "bold" } },
        employeeInfo.work_location || "Kolkata",
      ],
      [
        { content: "Department:", styles: { fontStyle: "bold" } },
        employeeInfo.dept || "General",
        { content: "Employment:", styles: { fontStyle: "bold" } },
        employeeInfo.employment_type || (isPermanentEmp ? "Permanent" : "Probation/Intern"),
      ],
      [
        { content: "Bank / Account:", styles: { fontStyle: "bold" } },
        `${bankInfo?.name || "HDFC Bank"} - ${bankInfo?.account || "N/A"}`,
        { content: "Pay Status:", styles: { fontStyle: "bold" } },
        payrollStatus === "Finalized" ? "PAID" : "UNPAID",
      ],
      [
        { content: "Joining Date:", styles: { fontStyle: "bold" } },
        employeeInfo.joining_date || "2025-01-01",
        { content: "Paid Days:", styles: { fontStyle: "bold" } },
        `${attendance.present_days ?? 0}P + ${attendance.leave_days || 0}L + ${attendance.holiday_days || 0}H + ${attendance.week_offs ?? 5}WO - ${attendance.absent_days || 0}A = ${attendance.paid_days ?? 0} Paid (${attendance.total_days || 30} Days)`,
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

    // 4. Financial Tables: ONLY NON-ZERO & NON-EMPTY ITEMS
    const effectiveOT =
      (parseFloat(variablePay.overtime_amount) || 0) > 0
        ? parseFloat(variablePay.overtime_amount)
        : (parseFloat(variablePay.overtime_hours) || 0) *
        (parseFloat(variablePay.overtime_rate) || 0);

    const lopCalc =
      attendance.lop_days > 0
        ? Math.round(
          (((parseFloat(fixedPay.basic) || 0) +
            (parseFloat(fixedPay.hra) || 0) +
            (parseFloat(fixedPay.conveyance) || 0) +
            (parseFloat(fixedPay.medical) || 0) +
            (parseFloat(fixedPay.allowance) || 0)) /
            (attendance.total_days || 30)) *
          attendance.lop_days
        )
        : 0;

    // Filter positive earnings only (DA removed)
    const earningsList = [
      { label: "Basic Salary", amount: parseFloat(fixedPay.basic) || 0 },
      {
        label: "House Rent Allowance (HRA)",
        amount: parseFloat(fixedPay.hra) || 0,
      },
      {
        label: "Conveyance Allowance",
        amount: parseFloat(fixedPay.conveyance) || 0,
      },
      { label: "Medical Allowance", amount: parseFloat(fixedPay.medical) || 0 },
      {
        label: "Special Allowance",
        amount: parseFloat(fixedPay.allowance) || 0,
      },
      {
        label: "Performance Bonus",
        amount: parseFloat(variablePay.bonus) || 0,
      },
      { label: "Overtime Pay", amount: effectiveOT },
      { label: "Incentive", amount: parseFloat(variablePay.incentive) || 0 },
      {
        label: "Reimbursement",
        amount: parseFloat(variablePay.reimbursement) || 0,
      },
    ].filter((item) => item.amount > 0);

    const totalGross = earningsList.reduce((acc, it) => acc + it.amount, 0);
    const isEsi = totalGross <= (globalEsiThreshold || 21000);
    const isPermanent = employeeInfo.is_permanent !== false && adjustments.is_permanent !== false;

    // Filter positive deductions only
    const deductionsList = [
      { label: "Provident Fund (PF)", amount: parseFloat(statutory.pf) || 0 },
      isEsi
        ? { label: "Employee State Insurance (ESI)", amount: parseFloat(statutory.esi) || 0 }
        : { label: "Mediclaim", amount: parseFloat(statutory.mediclaim) || 0 },
      { label: "Professional Tax (PT)", amount: parseFloat(statutory.pt) || 0 },
      { label: "TDS / Income Tax", amount: parseFloat(taxData.tds) || 0 },
      { label: "Loss of Pay (LOP)", amount: lopCalc },
      ...(isPermanent && parseFloat(adjustments.advance_deduction) > 0
        ? [{ label: "Advance Payment Recovery", amount: parseFloat(adjustments.advance_deduction) || 0 }]
        : []),
      ...(isPermanent && parseFloat(adjustments.loan_emi) > 0
        ? [{ label: "Company Loan EMI", amount: parseFloat(adjustments.loan_emi) || 0 }]
        : []),
      ...(isPermanent && parseFloat(adjustments.insurance_deduction) > 0
        ? [{ label: "Corporate Insurance Premium", amount: parseFloat(adjustments.insurance_deduction) || 0 }]
        : []),
    ].filter((item) => item.amount > 0);
    const totalDeds = deductionsList.reduce((acc, it) => acc + it.amount, 0);
    const netPayable = Math.max(0, totalGross - totalDeds);

    const maxRows = Math.max(earningsList.length, deductionsList.length, 1);
    const combinedRows = [];

    for (let i = 0; i < maxRows; i++) {
      const earn = earningsList[i];
      const ded = deductionsList[i];
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
      { content: formatPdfNum(totalGross), styles: { fontStyle: "bold", halign: "right" } },
      { content: "Total Deductions", styles: { fontStyle: "bold" } },
      { content: formatPdfNum(totalDeds), styles: { fontStyle: "bold", halign: "right" } },
    ]);

    const tableFinalY = doc.lastAutoTable?.finalY;

    autoTable(doc, {
      startY: tableFinalY + 8,
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
    doc.text(`Rs. ${formatPdfNum(netPayable)}`, 190, finalY + 19, { align: "right" });

    // Amount in Words
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.text(`In words: ${numberToWords(netPayable)}`, 14, finalY + 34);

    // 6. Signatures
    const signY = finalY + 54;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, signY, 75, signY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Employee Signature", 32, signY + 5);

    doc.line(135, signY, 190, signY);
    doc.text("Authorized Signatory (HR / Accounts)", 135, signY + 5);

    const safeEmpName = String(employeeInfo?.name || "Employee").replace(
      /\s+/g,
      "_"
    );
    doc.save(`Payslip_${safeEmpName}_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Fetch full monthly payroll & attendance summary from backend API (with fallback)
  const fetchMonthlySummaryRecords = async () => {
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
      const data = await res.json();
      if (data.success && Array.isArray(data.summary) && data.summary.length > 0) {
        return data.summary;
      }
    } catch (err) {
      console.warn("Could not fetch summary-sheet API:", err);
    }

    // Comprehensive fallback if API is not reachable
    return (Array.isArray(employees) ? employees : []).map((emp) => {
      const m = getEmployeeRowData(emp, currentMonthYear);
      const empCode = emp.employee_code || "";
      const saved = Array.isArray(allPayrolls)
        ? allPayrolls.find(
          (r) =>
            r &&
            String(r.employee_id).toLowerCase() === String(empCode).toLowerCase() &&
            String(r.month_year || "").toLowerCase() === currentMonthYear.toLowerCase()
        )
        : null;

      let att = {};
      if (saved && saved.attendance_summary) {
        try {
          att =
            typeof saved.attendance_summary === "string"
              ? JSON.parse(saved.attendance_summary)
              : saved.attendance_summary;
        } catch { }
      }

      const totalDays = att.total_days || 30;
      const workDays = att.working_days || 26;
      const presDays = att.present_days ?? (attendance?.present_days ?? 24);
      const lDays = att.leave_days || 0;
      const abDays = att.absent_days || 0;
      const hDays = att.holiday_days || 0;
      const woDays = att.week_offs || 4;
      const pdDays = att.paid_days ?? Math.max(0, presDays + lDays + hDays + woDays - abDays);
      const lopDays = Math.max(0, totalDays - pdDays);

      let ss = null;
      if (emp.salary_structure) {
        try {
          ss = typeof emp.salary_structure === "string" ? JSON.parse(emp.salary_structure) : emp.salary_structure;
        } catch { }
      }

      const adj = ss?.adjustments || {};
      const advanceAmount = Math.min(100000, Math.max(0, parseFloat(adj.advance_amount) || 0));
      const advanceDeduction = Math.min(advanceAmount, Math.max(0, parseFloat(adj.advance_deduction) || 0));
      const loanAmount = parseFloat(adj.loan_amount) || 0;
      const loanEmi = parseFloat(adj.loan_emi) || 0;
      const insuranceDeduction = parseFloat(adj.insurance_deduction) || 0;
      const mediclaimDeduction = parseFloat(ss?.deductions?.mediclaim) || (parseFloat(adj.mediclaim_deduction) || 0);
      const gratuityMonthly = Math.round(((parseFloat(ss?.earnings?.basic) || Math.round(m.basePay * 0.45)) * 15) / (26 * 12));

      const takenItems = [];
      if (advanceAmount > 0 || advanceDeduction > 0) {
        let str = `Advance: ₹${advanceAmount.toLocaleString("en-IN")}`;
        if (advanceDeduction > 0) str += ` (Rec: ₹${advanceDeduction.toLocaleString("en-IN")}/mo)`;
        takenItems.push(str);
      }
      if (loanAmount > 0 || loanEmi > 0) {
        let str = `Loan: ₹${loanAmount.toLocaleString("en-IN")}`;
        if (loanEmi > 0) str += ` (EMI: ₹${loanEmi.toLocaleString("en-IN")}/mo)`;
        takenItems.push(str);
      }
      if (mediclaimDeduction > 0 || insuranceDeduction > 0) {
        takenItems.push(`Mediclaim: ₹${(mediclaimDeduction || insuranceDeduction).toLocaleString("en-IN")}/mo`);
      }
      if (gratuityMonthly > 0) {
        takenItems.push(`Gratuity: ₹${gratuityMonthly.toLocaleString("en-IN")}/mo`);
      }

      const dailyRate = totalDays > 0 ? (m.basePay / totalDays) : 0;
      const lopAmount = Math.round(lopDays * dailyRate);
      const earnedGross = Math.max(0, Math.round((m.basePay / totalDays) * pdDays));
      const statutoryDeds = Math.max(0, m.basePay - m.totalPayout);
      const payableSalary = Math.max(0, earnedGross - statutoryDeds);

      const advanceDisplay = advanceAmount > 0 || advanceDeduction > 0
        ? `Rs. ${advanceAmount.toLocaleString("en-IN")}${advanceDeduction > 0 ? ` (Rec: Rs. ${advanceDeduction.toLocaleString("en-IN")})` : ""}`
        : "-";
      const loanDisplay = loanAmount > 0 || loanEmi > 0
        ? `Rs. ${loanAmount.toLocaleString("en-IN")}${loanEmi > 0 ? ` (EMI: Rs. ${loanEmi.toLocaleString("en-IN")})` : ""}`
        : "-";
      const insuranceDisplay = mediclaimDeduction > 0 || insuranceDeduction > 0
        ? `Rs. ${(mediclaimDeduction || insuranceDeduction).toLocaleString("en-IN")}/mo`
        : "-";
      const gratuityDisplay = gratuityMonthly > 0
        ? `Rs. ${gratuityMonthly.toLocaleString("en-IN")}/mo`
        : "-";

      return {
        employee_code: empCode,
        name: emp.name || "",
        dept: emp.dept || "General",
        designation: emp.designation || "Staff",
        employee_status: emp.status || "Active",
        employment_type: emp.employment_type || "Permanent",
        attendance: {
          total_days: totalDays,
          working_days: workDays,
          present_days: presDays,
          leave_days: lDays,
          absent_days: abDays,
          holiday_days: hDays,
          week_offs: woDays,
          paid_days: pdDays,
          lop_days: lopDays,
        },
        base_pay: m.basePay,
        gross_pay: m.basePay,
        overall_gross: m.basePay,
        earned_gross: earnedGross,
        lop_days: lopDays,
        lop_amount: lopAmount,
        statutory_deductions: statutoryDeds,
        total_deductions: statutoryDeds + lopAmount,
        payable_salary: payableSalary,
        net_salary: payableSalary,
        status: m.isPaid ? "Paid" : "Unpaid",
        is_paid: m.isPaid,
        has_facilities_taken: takenItems.length > 0,
        facilities_taken: takenItems.length > 0 ? takenItems.join("; ") : "None",
        facility_advance: advanceDisplay,
        facility_loan: loanDisplay,
        facility_insurance: insuranceDisplay,
        facility_gratuity: gratuityDisplay,
        facilities: {
          advance_amount: advanceAmount,
          advance_deduction: advanceDeduction,
          loan_amount: loanAmount,
          loan_emi: loanEmi,
          insurance_deduction: insuranceDeduction,
          mediclaim_deduction: mediclaimDeduction,
          gratuity_accrual: gratuityMonthly,
        },
        bank_name: "HDFC Bank",
        account_no: "N/A",
        ifsc: "N/A",
        pan: emp.pan_no || "N/A",
      };
    });
  };

  // Export summary table as PDF with parent organizations & standalone companies
  const generateSummaryPDF = async () => {
    setExportingSummary(true);
    try {
      const summaryList = await fetchMonthlySummaryRecords();
      const doc = new jsPDF("landscape");

      // Partition summaryList into parent organizations & standalone companies
      const orgMap = new Map();
      summaryList.forEach((emp) => {
        const rawGroup = (emp.group_name || "").trim();
        const isStandalone =
          !rawGroup || ["none", "n/a", "standalone", "-"].includes(rawGroup.toLowerCase());
        const compName =
          (emp.company_name || "").trim() || (isStandalone ? "Standalone Company" : "Subsidiary Company");
        const locName = (emp.work_location || "").trim() || "Kolkata";

        const orgKey = isStandalone ? `standalone___${compName}` : `parent___${rawGroup}`;
        const orgType = isStandalone ? "standalone" : "parent";
        const orgDisplayName = isStandalone ? compName : rawGroup;

        if (!orgMap.has(orgKey)) {
          orgMap.set(orgKey, {
            key: orgKey,
            type: orgType,
            name: orgDisplayName,
            rawGroupName: isStandalone ? null : rawGroup,
            companyName: isStandalone ? compName : null,
            employees: [],
            unitsMap: new Map(),
            totalGross: 0,
            totalDeductions: 0,
            totalNet: 0,
            paidCount: 0,
            unpaidCount: 0,
          });
        }

        const org = orgMap.get(orgKey);
        org.employees.push(emp);
        const gross = parseFloat(emp.overall_gross || emp.gross_pay || emp.base_pay || 0);
        const deds = parseFloat(emp.total_deductions || 0);
        const net = parseFloat(emp.payable_salary || emp.net_salary || 0);
        org.totalGross += gross;
        org.totalDeductions += deds;
        org.totalNet += net;
        if (emp.status === "Paid" || emp.is_paid) org.paidCount += 1;
        else org.unpaidCount += 1;

        const unitKey = `${locName}___${compName}`;
        if (!org.unitsMap.has(unitKey)) {
          org.unitsMap.set(unitKey, {
            key: unitKey,
            location: locName,
            company_name: compName,
            parent_name: orgDisplayName,
            isStandalone,
            employees: [],
            totalGross: 0,
            totalDeductions: 0,
            totalNet: 0,
            paidCount: 0,
            unpaidCount: 0,
          });
        }
        const unit = org.unitsMap.get(unitKey);
        unit.employees.push(emp);
        unit.totalGross += gross;
        unit.totalDeductions += deds;
        unit.totalNet += net;
        if (emp.status === "Paid" || emp.is_paid) unit.paidCount += 1;
        else unit.unpaidCount += 1;
      });

      const parentOrgList = Array.from(orgMap.values())
        .map((org) => ({
          ...org,
          units: Array.from(org.unitsMap.values()).sort((a, b) => {
            if (a.location !== b.location) return a.location.localeCompare(b.location);
            return a.company_name.localeCompare(b.company_name);
          }),
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "parent" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      // 1. Corporate Master Document Banner
      doc.setFillColor(15, 23, 42); // Deep Slate Navy
      doc.rect(0, 0, 297, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(
        "MULTI-ENTERPRISE CORPORATE SALARY DISBURSEMENT REGISTER",
        14,
        10
      );

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(
        `PAYROLL PERIOD: ${selectedMonth.toUpperCase()} ${selectedYear} | PARENT CONGLOMERATES & STANDALONE CORPORATE ENTITIES | GENERATED: ${new Date().toLocaleDateString("en-IN")}`,
        14,
        17
      );

      let currentY = 28;
      let grandGross = 0;
      let grandDeds = 0;
      let grandNet = 0;

      parentOrgList.forEach((org) => {
        grandGross += org.totalGross;
        grandDeds += org.totalDeductions;
        grandNet += org.totalNet;

        // Check page overflow for Org Banner
        if (currentY > 165) {
          doc.addPage();
          currentY = 16;
        }

        // Parent Organization / Standalone Company Header Banner
        const isParent = org.type === "parent";
        if (isParent) {
          doc.setFillColor(30, 41, 59); // Slate 800
          doc.setDrawColor(51, 65, 85);
        } else {
          doc.setFillColor(6, 78, 59); // Emerald 900
          doc.setDrawColor(4, 120, 87);
        }
        doc.roundedRect(8, currentY, 281, 9, 1.2, 1.2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        const headerTitle = isParent
          ? `[PARENT CONGLOMERATE] ${org.name.toUpperCase()} (HOLDING GROUP) • ${org.units.length} Subsidiary Unit${org.units.length === 1 ? "" : "s"}`
          : `[STANDALONE COMPANY] ${org.name.toUpperCase()} (DIRECT ENTITY - NO PARENT GROUP)`;
        doc.text(headerTitle, 12, currentY + 6);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${org.employees.length} Staff • Subtotal Net: Rs. ${formatPdfNum(org.totalNet)} (${org.paidCount} Paid, ${org.unpaidCount} Pending)`,
          285,
          currentY + 6,
          { align: "right" }
        );

        currentY += 12;

        // Subsidiary / Location Units under this Organization
        org.units.forEach((sec) => {
          if (currentY > 170) {
            doc.addPage();
            currentY = 16;
          }

          // Section Sub-header
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(8, currentY, 281, 7, 0.8, 0.8, "FD");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(
            `LOCATION: ${sec.location.toUpperCase()}  |  COMPANY: ${sec.company_name.toUpperCase()}  ${isParent ? `|  PARENT: ${org.name.toUpperCase()}` : "|  STANDALONE"}`,
            12,
            currentY + 4.8
          );

          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(
            `${sec.employees.length} Staff • Subtotal: Rs. ${formatPdfNum(sec.totalNet)}`,
            285,
            currentY + 4.8,
            { align: "right" }
          );

          currentY += 8.5;

          const rows = sec.employees.map((emp) => [
            emp.employee_code || "",
            emp.name || "",
            emp.designation || emp.dept || "Staff",
            `${emp.bank_name || "HDFC Bank"} - ${emp.account_no || "N/A"}`,
            emp.ifsc || "N/A",
            `${emp.attendance?.present_days ?? 0}/${emp.attendance?.working_days ?? 26}`,
            formatPdfNum(emp.overall_gross || emp.gross_pay || emp.base_pay),
            formatPdfNum(emp.total_deductions || 0),
            formatPdfNum(emp.payable_salary || emp.net_salary),
            emp.status || (emp.is_paid ? "Paid" : "Unpaid"),
          ]);

          // Section subtotal row
          rows.push([
            "SUBTOTAL",
            `${sec.employees.length} Staff (${sec.company_name} - ${sec.location})`,
            "",
            "",
            "",
            "",
            formatPdfNum(sec.totalGross),
            formatPdfNum(sec.totalDeductions),
            formatPdfNum(sec.totalNet),
            `${sec.paidCount} Paid / ${sec.unpaidCount} Pending`,
          ]);

          autoTable(doc, {
            startY: currentY,
            margin: { left: 8, right: 8 },
            head: [
              [
                "Emp Code",
                "Staff Member",
                "Role & Dept",
                "Bank & Account No",
                "IFSC",
                "Present",
                "Gross (INR)",
                "Deductions (INR)",
                "Net Payable (INR)",
                "Pay Status",
              ],
            ],
            body: rows,
            theme: "grid",
            headStyles: {
              fillColor: isParent ? [51, 65, 85] : [15, 118, 110],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 7.2,
              halign: "center",
            },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
              0: { halign: "center" },
              1: { halign: "left" },
              2: { halign: "left" },
              3: { halign: "left" },
              4: { halign: "center" },
              5: { halign: "center" },
              6: { halign: "right" },
              7: { halign: "right" },
              8: { halign: "right", fontStyle: "bold" },
              9: { halign: "center" },
            },
            didParseCell: (data) => {
              if (data.row.index === rows.length - 1) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [254, 243, 199];
              }
            },
          });

          currentY = (doc.lastAutoTable?.finalY || currentY) + 5;
        });

        // Parent Org Subtotal Strip if multiple units
        if (org.units.length > 1) {
          if (currentY > 175) {
            doc.addPage();
            currentY = 16;
          }
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(8, currentY, 281, 7, 0.8, 0.8, "FD");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(
            `SUBTOTAL (${org.name.toUpperCase()} TOTAL): ${org.employees.length} STAFF ACROSS ${org.units.length} UNITS`,
            12,
            currentY + 4.8
          );
          doc.text(
            `Gross: Rs. ${formatPdfNum(org.totalGross)}  |  Deductions: Rs. ${formatPdfNum(org.totalDeductions)}  |  Total Net: Rs. ${formatPdfNum(org.totalNet)}`,
            285,
            currentY + 4.8,
            { align: "right" }
          );
          currentY += 10;
        } else {
          currentY += 4;
        }
      });

      // Grand Total Box at end of document
      if (currentY > 175) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(52, 211, 153);
      doc.roundedRect(8, currentY, 281, 12, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(6, 95, 70);
      doc.text(
        `GRAND TOTAL (ALL PARENT GROUPS & STANDALONE ENTITIES): ${summaryList.length} TOTAL EMPLOYEES`,
        12,
        currentY + 7.5
      );

      doc.setFontSize(10);
      doc.text(
        `Gross: Rs. ${formatPdfNum(grandGross)}  |  Total Deductions: Rs. ${formatPdfNum(grandDeds)}  |  Grand Net Disbursement: Rs. ${formatPdfNum(grandNet)}`,
        285,
        currentY + 7.5,
        { align: "right" }
      );

      doc.save(`Salary_Disbursement_Register_${selectedMonth}_${selectedYear}.pdf`);
    } catch (err) {
      console.error("Error generating summary PDF:", err);
      setAlertMsg({ type: "danger", text: "Failed to generate payroll summary PDF." });
    } finally {
      setExportingSummary(false);
    }
  };

  // Export summary table as Excel (.xlsx) sheet grouped by parent organizations and standalone companies
  const generateSummaryExcel = async () => {
    setExportingSummary(true);
    try {
      const summaryList = await fetchMonthlySummaryRecords();

      // Partition summaryList into parent organizations & standalone companies
      const orgMap = new Map();
      summaryList.forEach((emp) => {
        const rawGroup = (emp.group_name || "").trim();
        const isStandalone =
          !rawGroup || ["none", "n/a", "standalone", "-"].includes(rawGroup.toLowerCase());
        const compName =
          (emp.company_name || "").trim() || (isStandalone ? "Standalone Company" : "Subsidiary Company");
        const locName = (emp.work_location || "").trim() || "Kolkata";

        const orgKey = isStandalone ? `standalone___${compName}` : `parent___${rawGroup}`;
        const orgType = isStandalone ? "standalone" : "parent";
        const orgDisplayName = isStandalone ? compName : rawGroup;

        if (!orgMap.has(orgKey)) {
          orgMap.set(orgKey, {
            key: orgKey,
            type: orgType,
            name: orgDisplayName,
            rawGroupName: isStandalone ? null : rawGroup,
            companyName: isStandalone ? compName : null,
            employees: [],
            unitsMap: new Map(),
            totalGross: 0,
            totalDeductions: 0,
            totalNet: 0,
            paidCount: 0,
            unpaidCount: 0,
          });
        }

        const org = orgMap.get(orgKey);
        org.employees.push(emp);
        const gross = parseFloat(emp.overall_gross || emp.gross_pay || emp.base_pay || 0);
        const deds = parseFloat(emp.total_deductions || 0);
        const net = parseFloat(emp.payable_salary || emp.net_salary || 0);
        org.totalGross += gross;
        org.totalDeductions += deds;
        org.totalNet += net;
        if (emp.status === "Paid" || emp.is_paid) org.paidCount += 1;
        else org.unpaidCount += 1;

        const unitKey = `${locName}___${compName}`;
        if (!org.unitsMap.has(unitKey)) {
          org.unitsMap.set(unitKey, {
            key: unitKey,
            location: locName,
            company_name: compName,
            parent_name: orgDisplayName,
            isStandalone,
            employees: [],
            totalGross: 0,
            totalDeductions: 0,
            totalNet: 0,
            paidCount: 0,
            unpaidCount: 0,
          });
        }
        const unit = org.unitsMap.get(unitKey);
        unit.employees.push(emp);
        unit.totalGross += gross;
        unit.totalDeductions += deds;
        unit.totalNet += net;
        if (emp.status === "Paid" || emp.is_paid) unit.paidCount += 1;
        else unit.unpaidCount += 1;
      });

      const parentOrgList = Array.from(orgMap.values())
        .map((org) => ({
          ...org,
          units: Array.from(org.unitsMap.values()).sort((a, b) => {
            if (a.location !== b.location) return a.location.localeCompare(b.location);
            return a.company_name.localeCompare(b.company_name);
          }),
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "parent" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      const rows = [
        ["MULTI-ENTERPRISE CORPORATE SALARY DISBURSEMENT REGISTER"],
        [`PAYROLL PERIOD: ${selectedMonth.toUpperCase()} ${selectedYear} | PARENT CONGLOMERATES & STANDALONE ENTITIES`],
        [],
      ];

      let grandGross = 0;
      let grandDeds = 0;
      let grandNet = 0;

      parentOrgList.forEach((org) => {
        grandGross += org.totalGross;
        grandDeds += org.totalDeductions;
        grandNet += org.totalNet;
        const isParent = org.type === "parent";

        // Organization Header Row
        rows.push([
          `[${isParent ? "PARENT CONGLOMERATE" : "STANDALONE COMPANY"}: ${org.name.toUpperCase()}]  |  ${org.units.length} UNITS  |  ${org.employees.length} STAFF MEMBERS`,
        ]);

        org.units.forEach((sec) => {
          // Unit Header Row
          rows.push([
            `LOCATION: ${sec.location.toUpperCase()}  |  COMPANY: ${sec.company_name.toUpperCase()}  |  ${isParent ? `PARENT GROUP: ${org.name.toUpperCase()}` : "STANDALONE ENTITY"}`,
          ]);

          // Column Headers
          rows.push([
            "Employee ID",
            "Employee Name",
            "Department",
            "Designation / Role",
            "Bank Name",
            "Account Number",
            "IFSC Code",
            "PAN Number",
            "Work Days",
            "Present Days",
            "Paid Days",
            "Monthly Gross (INR)",
            "Total Deductions (INR)",
            "Net Payable Disbursement (INR)",
            "Payment Status",
          ]);

          sec.employees.forEach((emp) => {
            const gross = parseFloat(emp.overall_gross || emp.gross_pay || emp.base_pay || 0);
            const deds = parseFloat(emp.total_deductions || 0);
            const net = parseFloat(emp.payable_salary || emp.net_salary || 0);

            rows.push([
              emp.employee_code || "",
              emp.name || "",
              emp.dept || "General",
              emp.designation || "Staff",
              emp.bank_name || "HDFC Bank",
              emp.account_no || "N/A",
              emp.ifsc || "N/A",
              emp.pan || "N/A",
              emp.attendance?.working_days ?? 26,
              emp.attendance?.present_days ?? 0,
              emp.attendance?.paid_days ?? 0,
              gross,
              deds,
              net,
              emp.status || (emp.is_paid ? "Paid" : "Unpaid"),
            ]);
          });

          // Subtotal row for this unit
          rows.push([
            `SUBTOTAL (${sec.company_name} - ${sec.location})`,
            `${sec.employees.length} Staff Members`,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            sec.totalGross,
            sec.totalDeductions,
            sec.totalNet,
            `${sec.paidCount} Paid / ${sec.unpaidCount} Pending`,
          ]);

          rows.push([]); // blank separator
        });

        // Org Subtotal row
        rows.push([
          `SUBTOTAL (${org.name.toUpperCase()} TOTAL)`,
          `${org.employees.length} Staff Members Across ${org.units.length} Units`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          org.totalGross,
          org.totalDeductions,
          org.totalNet,
          `${org.paidCount} Paid / ${org.unpaidCount} Pending`,
        ]);

        rows.push([]); // blank separator
      });

      // Grand Total Row
      rows.push([
        "GRAND TOTAL (ALL PARENT GROUPS & STANDALONE ENTITIES)",
        `${summaryList.length} Total Staff`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        grandGross,
        grandDeds,
        grandNet,
        "",
      ]);

      exportToExcel({
        data: rows,
        fileName: `Salary_Disbursement_Register_${selectedMonth}_${selectedYear}.xlsx`,
        sheetName: "Disbursement Register",
      });
    } catch (err) {
      console.error("Error generating summary Excel:", err);
      setAlertMsg({ type: "danger", text: "Failed to export payroll Excel sheet." });
    } finally {
      setExportingSummary(false);
    }
  };

  // Individual employee payslip export to Excel (.xlsx) with present work days payable salary
  const generatePayslipExcel = () => {
    if (!employeeInfo) return;
    const safeName = String(employeeInfo.name || "Employee").replace(/\s+/g, "_");
    const isPaid = payrollStatus === "Finalized";
    const lopCalc =
      attendance.lop_days > 0
        ? Math.round(
          (viewGrossTotal / (attendance.total_days || 30)) * attendance.lop_days
        )
        : 0;
    const earnedGross = Math.max(0, viewGrossTotal - lopCalc);
    const statutoryDeds = Math.max(0, viewDeductionsTotal - lopCalc);

    const compName = (employeeInfo.company_name || "TATA STEEL").toUpperCase();
    const grpName = (employeeInfo.group_name || "TATA Company").toUpperCase();
    const locName = employeeInfo.work_location || "Kolkata";

    const rows = [
      [compName],
      [`A Division / Subsidiary of ${grpName} • Location: ${locName} | Confidential Employee Pay Slip`],
      [`SALARY PAYSLIP FOR ${currentMonthYear.toUpperCase()}`],
      [],
      ["EMPLOYEE DETAILS", "", "ORGANIZATION & LOCATION", ""],
      ["Employee Name:", employeeInfo.name || "N/A", "Company / Unit:", employeeInfo.company_name || "TATA Steel"],
      ["Employee ID:", employeeInfo.employee_code || "N/A", "Group / Holding:", employeeInfo.group_name || "TATA Company"],
      ["Designation:", employeeInfo.designation || "Staff", "Work Location:", employeeInfo.work_location || "Kolkata"],
      ["Department:", employeeInfo.dept || "General", "Pay Status:", isPaid ? "PAID" : "UNPAID"],
      ["Bank Name:", bankInfo?.name || "HDFC Bank", "Account No:", bankInfo?.account || "N/A"],
      ["IFSC Code:", bankInfo?.ifsc || "N/A", "PAN Number:", bankInfo?.pan || "N/A"],
      [],
      ["ATTENDANCE SUMMARY", "", "", ""],
      ["Total Days in Month:", attendance.total_days || 31, "Total Work Days:", attendance.working_days || 26],
      ["Total Present Days:", attendance.present_days ?? 0, "Total Leaves:", attendance.leave_days || 0],
      ["Total Absents (LOP):", attendance.absent_days || attendance.lop_days || 0, "Holidays:", attendance.holiday_days || 0],
      ["Week Offs:", attendance.week_offs || 5, "Total Paid Days:", attendance.paid_days ?? 0],
      [],
      ["EARNINGS (FIXED STRUCTURE)", "AMOUNT (INR)", "DEDUCTIONS & COMPLIANCE", "AMOUNT (INR)"],
      ["Basic Salary", parseFloat(fixedPay.basic || 0), "Provident Fund (PF)", parseFloat(statutory.pf || 0)],
      ["House Rent Allowance (HRA)", parseFloat(fixedPay.hra || 0), "ESI", parseFloat(statutory.esi || 0)],
      ["Conveyance Allowance", parseFloat(fixedPay.conveyance || 0), "Mediclaim", parseFloat(statutory.mediclaim || 0)],
      ["Medical Allowance", parseFloat(fixedPay.medical || 0), "Professional Tax (PT)", parseFloat(statutory.pt || 0)],
      ["Special Allowance", parseFloat(fixedPay.allowance || 0), "Income Tax / TDS", parseFloat(taxData.tds || 0)],
      ["Overtime / Bonus", parseFloat(variablePay.total_variable || 0), "Loss of Pay (LOP)", parseFloat(lopCalc || 0)],
      ["Total Gross (Monthly Overall CTC)", parseFloat(viewGrossTotal || 0), "Total Deductions", parseFloat(viewDeductionsTotal || 0)],
      [],
      ["SALARY PAYABLE FOR PRESENT WORK DAYS", "", "", ""],
      ["Monthly Full CTC Gross:", parseFloat(viewGrossTotal || 0), "Loss of Pay (LOP) Deduction:", parseFloat(lopCalc || 0)],
      ["Earned Gross (Present Days):", parseFloat(earnedGross || 0), "Statutory Deductions:", parseFloat(statutoryDeds || 0)],
      ["NET SALARY PAYABLE (PRESENT DAYS):", parseFloat(viewNetSalary || 0)],
      ["In Words:", numberToWords(viewNetSalary || 0)],
      ["Payment Status:", isPaid ? "Paid" : "Unpaid"],
    ];

    exportToExcel({
      data: rows,
      fileName: `Payslip_${safeName}_${selectedMonth}_${selectedYear}.xlsx`,
      sheetName: "Payslip",
    });
  };

  // Calculate non-zero view breakdown items for View Modal (DA removed)
  const viewEarningsItems = useMemo(() => {
    return [
      { label: "Basic Salary", amount: parseFloat(fixedPay.basic) || 0, type: "Base" },
      { label: "House Rent Allowance (HRA)", amount: parseFloat(fixedPay.hra) || 0, type: "Base" },
      { label: "Conveyance Allowance", amount: parseFloat(fixedPay.conveyance) || 0, type: "Fixed" },
      { label: "Medical Allowance", amount: parseFloat(fixedPay.medical) || 0, type: "Fixed" },
      { label: "Special Allowance", amount: parseFloat(fixedPay.allowance) || 0, type: "Fixed" },
      { label: "Performance Bonus", amount: parseFloat(variablePay.bonus) || 0, type: "Variable" },
      { label: "Overtime Pay", amount: parseFloat(variablePay.overtime_amount) || 0, type: "Variable" },
      { label: "Incentive", amount: parseFloat(variablePay.incentive) || 0, type: "Variable" },
      { label: "Reimbursement", amount: parseFloat(variablePay.reimbursement) || 0, type: "Variable" },
    ].filter((it) => it.amount > 0);
  }, [fixedPay, variablePay]);

  const viewGrossTotal = useMemo(() => {
    return viewEarningsItems.reduce((acc, it) => acc + it.amount, 0);
  }, [viewEarningsItems]);

  const viewDeductionsItems = useMemo(() => {
    const isEsi = viewGrossTotal <= (globalEsiThreshold || 21000);
    const isPermanent = employeeInfo.is_permanent !== false && adjustments.is_permanent !== false;

    const lopCalc =
      attendance.lop_days > 0
        ? Math.round(
          (((parseFloat(fixedPay.basic) || 0) +
            (parseFloat(fixedPay.hra) || 0) +
            (parseFloat(fixedPay.conveyance) || 0) +
            (parseFloat(fixedPay.medical) || 0) +
            (parseFloat(fixedPay.allowance) || 0)) /
            (attendance.total_days || 30)) *
          attendance.lop_days
        )
        : 0;

    const items = [
      { label: "Provident Fund (PF)", amount: parseFloat(statutory.pf) || 0 },
      isEsi
        ? { label: "Employee State Insurance (ESI)", amount: parseFloat(statutory.esi) || 0 }
        : { label: "Mediclaim", amount: parseFloat(statutory.mediclaim) || 0 },
      { label: "Professional Tax (PT)", amount: parseFloat(statutory.pt) || 0 },
      { label: "TDS / Income Tax", amount: parseFloat(taxData.tds) || 0 },
      { label: "Loss of Pay (LOP)", amount: lopCalc },
      { label: "Other Deductions", amount: parseFloat(statutory.others) || 0 },
    ];

    if (isPermanent) {
      if (parseFloat(adjustments.advance_deduction) > 0) {
        items.push({
          label: "Advance Payment Recovery",
          amount: parseFloat(adjustments.advance_deduction) || 0,
        });
      }
      if (parseFloat(adjustments.loan_emi) > 0) {
        items.push({
          label: "Company Loan EMI",
          amount: parseFloat(adjustments.loan_emi) || 0,
        });
      }
      if (parseFloat(adjustments.insurance_deduction) > 0) {
        items.push({
          label: "Corporate Group Insurance",
          amount: parseFloat(adjustments.insurance_deduction) || 0,
        });
      }
    }

    return items.filter((it) => it.amount > 0);
  }, [statutory, taxData, attendance, fixedPay, adjustments, employeeInfo, viewGrossTotal]);

  const viewDeductionsTotal = useMemo(() => {
    return viewDeductionsItems.reduce((acc, it) => acc + it.amount, 0);
  }, [viewDeductionsItems]);

  const viewNetSalary = Math.max(0, viewGrossTotal - viewDeductionsTotal);

  // ══ REGULAR EMPLOYEE VIEW: SHOW SALARY STRUCTURE ══
  if (isRegularEmployee) {
    return (
      <div className="container-fluid max-w-7xl mt-3 mt-md-4 pb-5 px-2 px-md-4">
        {/* Top Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h3 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.5px" }}>
                My Salary Structure
              </h3>
              <Badge bg="success" className="px-2.5 py-1 fw-semibold rounded-pill" style={{ fontSize: "11px" }}>
                Active Structure
              </Badge>
            </div>
            <p className="text-muted small mb-0">
              Official compensation breakdown, monthly fixed allowances, and compliance deductions.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Period Selector */}
            <div className="d-flex align-items-center bg-white border rounded-3 px-2 py-1 gap-1 shadow-xs">
              <span className="text-muted small ps-1">📅</span>
              <Form.Select
                size="sm"
                className="border-0 bg-transparent py-0 fw-semibold text-dark shadow-none"
                style={{ width: "115px", fontSize: "13px" }}
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  fetchPayrollData(selectedEmpCode, `${e.target.value} ${selectedYear}`);
                }}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Form.Select>
              <Form.Select
                size="sm"
                className="border-0 bg-transparent py-0 fw-semibold text-dark shadow-none"
                style={{ width: "75px", fontSize: "13px" }}
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  fetchPayrollData(selectedEmpCode, `${selectedMonth} ${e.target.value}`);
                }}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </div>

            {/* Quick Link to Payslips */}
            <Button
              size="sm"
              className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 text-white border-0 shadow-xs"
              style={{ background: "#4a2835" }}
              onClick={() => navigate("/payslip")}
            >
              <span>📄 View My Payslip</span>
            </Button>

            {/* ESI Slab Configuration & Audit Button for Employee */}
            <Button
              size="sm"
              variant="outline-primary"
              className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs border"
              style={{ borderColor: "#2563eb", color: "#1d4ed8" }}
              onClick={() => setShowEsiAuditModal(true)}
              title="View Statutory ESI Slab, Contribution Periods & Past Records"
            >
              <span>🛡️</span>
              <span>ESI Slab (₹{Number(globalEsiThreshold).toLocaleString("en-IN")})</span>
            </Button>
          </div>
        </div>

        {/* Employee Profile Banner */}
        <Card className="border-0 shadow-sm rounded-4 p-3.5 mb-4 bg-white">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
            <div className="d-flex align-items-center gap-3">
              {renderAvatar(employeeInfo, 48)}
              <div>
                <h5 className="fw-bold text-dark mb-0.5">{employeeInfo.name}</h5>
                <div className="d-flex flex-wrap align-items-center gap-2 text-muted small">
                  <span>#{employeeInfo.employee_code}</span>
                  <span>•</span>
                  <span className="text-dark fw-medium">{employeeInfo.designation || "Staff"}</span>
                  <span>•</span>
                  <span>{employeeInfo.dept || "General"}</span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs text-dark border"
                onClick={generatePayslipPDF}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download Slip (PDF)</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Live Attendance & Shift Timing Summary */}
        <Card className="border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0 text-dark">
              Attendance & Shift Summary ({currentMonthYear})
            </h6>
            <Badge bg="light" text="dark" className="border fw-normal">
              {shiftTiming.dateStr ? `${shiftTiming.dateStr} Log` : "Today"}
            </Badge>
          </div>

          <Row className="g-3 text-center">
            <Col xs={6} md={3}>
              <div className="p-3 rounded-3" style={{ background: "#ecfdf5", border: "1px solid #d1fae5" }}>
                <span className="small text-muted d-block">Present Days</span>
                <h4 className="fw-bold text-success mb-0 mt-1">{attendance.present_days ?? 0}</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="p-3 rounded-3" style={{ background: "#fefce8", border: "1px solid #fef08a" }}>
                <span className="small text-muted d-block">Late Days</span>
                <h4 className="fw-bold text-warning mb-0 mt-1">{attendance.late_days ?? 0}</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="p-3 rounded-3" style={{ background: "#fff1f2", border: "1px solid #ffe4e6" }}>
                <span className="small text-muted d-block">Unpaid Leaves (LOP)</span>
                <h4 className="fw-bold text-danger mb-0 mt-1">{attendance.lop_days ?? 0}</h4>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="p-3 rounded-3" style={{ background: "#eff6ff", border: "1px solid #dbeafe" }}>
                <span className="small text-muted d-block">Clock In / Out</span>
                <div className="fw-bold text-primary fs-6 mt-1">
                  {shiftTiming.check_in || "--:--"} - {shiftTiming.check_out || "--:--"}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 2 Detailed Breakdown Cards */}
        <Row className="g-4 mb-4">
          {/* Earnings Card */}
          <Col xs={12} md={6}>
            <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <div className="fw-bold text-success pb-2 mb-3 border-bottom d-flex justify-content-between align-items-center">
                <span className="fs-6">Monthly Earnings (Fixed Pay)</span>
                <span className="small text-muted fw-normal">INR (₹)</span>
              </div>

              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Basic Salary</span>
                  <span className="fw-semibold text-dark">{fmt(fixedPay.basic)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">House Rent Allowance (HRA)</span>
                  <span className="fw-semibold text-dark">{fmt(fixedPay.hra)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Conveyance Allowance</span>
                  <span className="fw-semibold text-dark">{fmt(fixedPay.conveyance)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Medical Allowance</span>
                  <span className="fw-semibold text-dark">{fmt(fixedPay.medical)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Special / Other Allowance</span>
                  <span className="fw-semibold text-dark">{fmt(fixedPay.allowance)}</span>
                </div>
              </div>

              <div className="d-flex justify-content-between fw-bold text-dark pt-3 border-top mt-auto fs-6">
                <span>Total Fixed Earnings</span>
                <span className="text-success">{fmt(viewGrossTotal)}</span>
              </div>
            </Card>
          </Col>

          {/* Deductions Card */}
          <Col xs={12} md={6}>
            <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <div className="fw-bold text-danger pb-2 mb-3 border-bottom d-flex justify-content-between align-items-center">
                <span className="fs-6">Monthly Deductions & Compliance</span>
                <span className="small text-muted fw-normal">INR (₹)</span>
              </div>

              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Provident Fund (PF)</span>
                  <span className="fw-semibold text-danger">{fmt(statutory.pf)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">
                    {viewGrossTotal <= (globalEsiThreshold || 21000) ? "Employee State Insurance (ESI)" : "Mediclaim Health Coverage"}
                  </span>
                  <span className="fw-semibold text-danger">{fmt(statutory.esi || statutory.mediclaim)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Professional Tax (PT)</span>
                  <span className="fw-semibold text-danger">{fmt(statutory.pt)}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center small">
                  <span className="text-muted d-flex align-items-center gap-1.5">
                    TDS / Income Tax (IT)
                    {itDeclarationInfo && (
                      <Badge
                        bg={itDeclarationInfo.status === "Approved" ? "success" : "primary"}
                        style={{ fontSize: "10px" }}
                        title={`IT Declaration: ${itDeclarationInfo.status} (${itDeclarationInfo.regime === "new" ? "New Regime" : "Old Regime"})`}
                      >
                        {itDeclarationInfo.regime === "new" ? "New Regime" : "Old Regime"}
                      </Badge>
                    )}
                  </span>
                  <span className="fw-semibold text-danger">
                    {fmt(parseFloat(taxData.tds) + parseFloat(taxData.other_tax || 0))}
                  </span>
                </div>
                {parseFloat(adjustments.advance_deduction) > 0 && (
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Advance Payment Recovery</span>
                    <span className="fw-semibold text-danger">{fmt(adjustments.advance_deduction)}</span>
                  </div>
                )}
                {parseFloat(adjustments.loan_emi) > 0 && (
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Company Loan EMI</span>
                    <span className="fw-semibold text-danger">{fmt(adjustments.loan_emi)}</span>
                  </div>
                )}
                {parseFloat(adjustments.insurance_deduction) > 0 && (
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Corporate Group Insurance</span>
                    <span className="fw-semibold text-danger">{fmt(adjustments.insurance_deduction)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Loss of Pay (LOP Policy)</span>
                  <span className="fw-semibold text-muted">Applicable on unpaid absence</span>
                </div>
              </div>

              <div className="d-flex justify-content-between fw-bold text-dark pt-3 border-top mt-auto fs-6">
                <span>Total Deductions</span>
                <span className="text-danger">{fmt(viewDeductionsTotal)}</span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 4 Summary Stat Metric Cards */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <span className="text-muted small fw-medium">Annual CTC</span>
              <h4 className="fw-bold text-dark mt-2 mb-1">{fmt(viewGrossTotal * 12)}</h4>
              <span className="text-muted" style={{ fontSize: "11px" }}>Total Cost to Company / Year</span>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <span className="text-muted small fw-medium">Monthly Gross</span>
              <h4 className="fw-bold text-dark mt-2 mb-1">{fmt(viewGrossTotal)}</h4>
              <span className="text-success" style={{ fontSize: "11px" }}>100% Fixed Base + Allowances</span>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <span className="text-muted small fw-medium">Monthly Deductions</span>
              <h4 className="fw-bold text-danger mt-2 mb-1">{fmt(viewDeductionsTotal)}</h4>
              <span className="text-muted" style={{ fontSize: "11px" }}>PF, ESI, PT, Taxes</span>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-sm rounded-4 p-3 h-100" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div className="d-flex justify-content-between align-items-start">
                <span className="text-success small fw-bold">Net In-Hand Pay</span>
                <span className="badge bg-success-subtle text-success px-2 py-0.5 rounded-pill" style={{ fontSize: "10px" }}>
                  Take Home
                </span>
              </div>
              <h4 className="fw-bold text-success mt-2 mb-1">{fmt(viewNetSalary)}</h4>
              <span className="text-muted" style={{ fontSize: "11px" }}>Monthly Take-Home</span>
            </Card>
          </Col>
        </Row>

        {/* Net Take-Home Highlight Banner */}
        <div
          className="p-4 rounded-4 text-white d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4 shadow-sm"
          style={{ background: "#4a2835" }}
        >
          <div>
            <span className="small text-uppercase opacity-75 fw-semibold d-block" style={{ letterSpacing: "0.5px" }}>
              Net Take-Home Salary (Monthly Credited)
            </span>
            <span className="small opacity-90 mt-1 d-block">
              {numberToWords(viewNetSalary)}
            </span>
          </div>
          <div className="text-sm-end">
            <h2 className="fw-bold mb-0 text-white">{fmt(viewNetSalary)}</h2>
          </div>
        </div>

        {/* ESI Statutory Coverage Status Banner for Employee */}
        <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-primary mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div className="d-flex align-items-center gap-2.5">
            <span className="fs-5">🛡️</span>
            <div>
              <div className="fw-semibold text-dark small">
                Statutory ESI Coverage Status ({currentMonthYear})
              </div>
              <div className="text-muted" style={{ fontSize: "11.5px" }}>
                {viewGrossTotal <= (globalEsiThreshold || 21000)
                  ? `Your gross salary (₹${viewGrossTotal.toLocaleString("en-IN")}) is within the statutory ESI ceiling of ₹${(globalEsiThreshold || 21000).toLocaleString("en-IN")}. You are enrolled in ESIC medical & cash benefits (0.75% deduction).`
                  : `Your gross salary (₹${viewGrossTotal.toLocaleString("en-IN")}) exceeds the statutory ESI ceiling of ₹${(globalEsiThreshold || 21000).toLocaleString("en-IN")}. You are covered under Corporate Mediclaim.`}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline-primary"
            className="rounded-pill px-3 py-1 text-nowrap fw-semibold"
            style={{ fontSize: "11.5px" }}
            onClick={() => setShowEsiAuditModal(true)}
          >
            <span>ESI Details & Cycles ➔</span>
          </Button>
        </div>

        {/* ══ DETAILED ESI SLAB & STATUTORY AUDIT MODAL (FOR EMPLOYEES) ══ */}
        <EsiSlabAuditModal
          show={showEsiAuditModal}
          onHide={() => setShowEsiAuditModal(false)}
          canEdit={false}
          role={userRole}
        />

      </div>
    );
  }

  return (
    <div className="container-fluid max-w-7xl mt-3 mt-md-4 pb-5 px-2 px-md-4">
      {/* ══ HEADER & TOP CONTROLS (MATCHING DESIGN) ══ */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3
            className="fw-bold mb-0 text-dark"
            style={{ letterSpacing: "-0.5px" }}
          >
            Payroll Overview
          </h3>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Export to Excel (.xlsx) Button */}
          <Button
            variant="outline-success"
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs border hover:!text-black"
            onClick={generateSummaryExcel}
            title="Export Monthly Payroll Summary in Excel (.xlsx) sheet with attendance & full details"
            disabled={exportingSummary}
          >
            <svg
              width="14"
              height="14"
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
            <span>{exportingSummary ? "Exporting..." : "Export Excel"}</span>
          </Button>

          {/* Export PDF Button */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs text-dark border hover:!text-red-700"
            onClick={generateSummaryPDF}
            title="Export Monthly Payroll Summary in PDF (.pdf) format with full employee details"
            disabled={exportingSummary}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>{exportingSummary ? "Exporting..." : "Export PDF"}</span>
          </Button>

          {/* Date Period Selector Pill: "15 Feb - 15 Mar 2025" style */}
          <div className="d-flex align-items-center bg-white border rounded-3 px-2 py-1 gap-1 shadow-xs">
            <span className="text-muted small ps-1">📅</span>
            <Form.Select
              size="sm"
              className="border-0 bg-transparent py-0 fw-semibold text-dark shadow-none"
              style={{ width: "115px", fontSize: "13px" }}
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

          {/* ESI Slab Configuration & Audit Button - Visible to all roles */}
          <Button
            size="sm"
            variant="outline-primary"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs border"
            style={{ borderColor: "#2563eb", color: "#1d4ed8" }}
            onClick={() => setShowEsiAuditModal(true)}
            title="Configure / View Global ESI Slab, Statutory Cycles & Audit History"
          >
            <span>🛡️</span>
            <span>ESI Slab & Cycles (₹{Number(globalEsiThreshold).toLocaleString("en-IN")})</span>
          </Button>

          {/* Customize Widget Button (Burgundy matching image) */}
          {/* <Button
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 text-white border-0 shadow-xs"
            style={{ background: "#4a2835" }}
            onClick={() => setShowCustomizeModal(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Customize Widget</span>
          </Button> */}
        </div>
      </div>

      {/* ══ SECTION SWITCHER TABS (MONTHLY PAYROLL VS FACILITIES & STATUTORY BENEFITS EXCEL WORKSHEET) ══ */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4 p-1.5 bg-light rounded-4 border w-fit">
        <button
          className={`btn btn-sm px-3.5 py-2 fw-semibold rounded-pill d-flex align-items-center gap-2 transition-all ${activePayrollTab === "overview"
            ? "text-white shadow-xs"
            : "text-secondary border-0 bg-transparent"
            }`}
          style={{ background: activePayrollTab === "overview" ? "#4a2835" : "transparent" }}
          onClick={() => setActivePayrollTab("overview")}
        >
          <span>💼</span>
          <span>Monthly Payroll & Payouts</span>
        </button>

        <button
          className={`btn btn-sm px-3.5 py-2 fw-semibold rounded-pill d-flex align-items-center gap-2 transition-all ${activePayrollTab === "facilities"
            ? "text-white shadow-xs"
            : "text-secondary border-0 bg-transparent"
            }`}
          style={{ background: activePayrollTab === "facilities" ? "#4a2835" : "transparent" }}
          onClick={() => setActivePayrollTab("facilities")}
        >
          <span>🏦</span>
          <span>Facilities & Statutory Benefits</span>
          <span
            className={`badge rounded-pill px-2 py-0.5 ${activePayrollTab === "facilities"
              ? "bg-white text-dark"
              : "bg-primary-subtle text-primary"
              }`}
            style={{ fontSize: "10px" }}
          >
            Excel Grid
          </span>
        </button>

        {/* <button
          className={`btn btn-sm px-3.5 py-2 fw-semibold rounded-pill d-flex align-items-center gap-2 transition-all ${
            activePayrollTab === "esi"
              ? "text-white shadow-xs"
              : "text-secondary border-0 bg-transparent"
          }`}
          style={{ background: activePayrollTab === "esi" ? "#4a2835" : "transparent" }}
          onClick={() => setActivePayrollTab("esi")}
        >
          <span>🛡️</span>
          <span>ESI Slab & Statutory Cycles</span>
          <span
            className={`badge rounded-pill px-2 py-0.5 ${
              activePayrollTab === "esi"
                ? "bg-white text-dark"
                : "bg-primary-subtle text-primary"
            }`}
            style={{ fontSize: "10px" }}
          >
            ₹{Number(globalEsiThreshold).toLocaleString("en-IN")}
          </span>
        </button> */}
      </div>

      {activePayrollTab === "facilities" && (
        <FacilitiesWorksheetSection
          onFacilitiesUpdated={() => {
            fetchEmployees();
            fetchAllPayrolls();
            if (selectedEmpCode) {
              fetchPayrollData(selectedEmpCode, currentMonthYear);
            }
          }}
        />
      )}

      {activePayrollTab === "esi" && (
        <EsiSlabAuditModal
          inline={true}
          canEdit={isAccountsUser || isHRUser}
          role={userRole}
          onSaved={async (newThresh) => {
            if (newThresh) setGlobalEsiThreshold(newThresh);
            const refreshCode = selectedEmpCode ? selectedEmpCode.toString().replace(/^#/, "").trim() : "";
            await fetchEmployees(refreshCode);
            await fetchAllPayrolls();
            if (refreshCode) {
              await fetchPayrollData(refreshCode, currentMonthYear);
            }
          }}
          onHide={() => setActivePayrollTab("overview")}
        />
      )}

      {activePayrollTab === "overview" && (
        <>
          {/* ══ STATUTORY ESI COMPLIANCE & SLAB INFO BANNER ══ */}
          <div className="p-3 bg-white rounded-3 shadow-xs border border-start-4 border-start-primary mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-3 bg-primary-subtle text-primary fs-5">
                🛡️
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>
                    Statutory ESI Slab: ₹{Number(globalEsiThreshold).toLocaleString("en-IN")} / month
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "10.5px" }}>
                    Active ESIC Regulation 4
                  </span>
                </div>
                <small className="text-muted" style={{ fontSize: "12px" }}>
                  Employees with monthly Gross ≤ ₹{Number(globalEsiThreshold).toLocaleString("en-IN")} are covered under statutory ESI (0.75% EE / 3.25% ER). Current Cycle: <strong>1st Oct – 31st Mar</strong> ➔ Cash Benefits: <strong>1st Jul – 31st Dec</strong>.
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                className="fw-semibold text-nowrap rounded-3 px-3 py-1.5"
                onClick={() => setShowEsiAuditModal(true)}
              >
                <span>View Cycles & Audit History ➔</span>
              </Button>
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
          {/* ══ TOP ROW: LIVE KPI CARDS (LEFT) + LIVE FULL YEAR CHART (RIGHT) ══ */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <Row className="g-3 mb-4">
            {/* Left: 4 Live KPI Cards in a 2x2 Grid */}
            <Col xs={12} lg={7}>
              <Row className="g-3">
                {/* 1. Total Employee */}
                <Col xs={12} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                    <span className="text-muted small fw-medium">Total Employee</span>
                    <div className="d-flex align-items-baseline gap-1 mt-2">
                      <h2 className="fw-bold text-dark mb-0">
                        {overviewStats.activeEmployees}
                      </h2>
                      <span className="text-muted fs-5 fw-normal">
                        /{overviewStats.totalEmployees}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span
                        className="badge bg-light text-secondary rounded-pill px-2.5 py-1.5 border small fw-normal"
                        style={{ fontSize: "11px", cursor: "pointer" }}
                        onClick={() => setShowAbsencesModal(true)}
                      >
                        See Today's Absences &rsaquo;
                      </span>
                    </div>
                  </Card>
                </Col>

                {/* 2. Total Monthly Payroll */}
                <Col xs={12} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                    <span className="text-muted small fw-medium">
                      Total Monthly Payroll
                    </span>
                    <div className="d-flex align-items-baseline gap-1 mt-2">
                      <h2 className="fw-bold text-dark mb-0">
                        {fmt(overviewStats.totalPayroll)}
                      </h2>
                    </div>
                    <div className="mt-3">
                      <span
                        className="badge rounded-pill px-2.5 py-1 small fw-semibold"
                        style={{
                          background: overviewStats.payrollChange.isPositive
                            ? "#dcfce7"
                            : "#fee2e2",
                          color: overviewStats.payrollChange.isPositive
                            ? "#16a34a"
                            : "#ef4444",
                          fontSize: "11px",
                        }}
                      >
                        {overviewStats.payrollChange.text}
                      </span>
                    </div>
                  </Card>
                </Col>

                {/* 3. Commission Paid / Variable Pay */}
                <Col xs={12} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                    <span className="text-muted small fw-medium">Commission Paid</span>
                    <div className="d-flex align-items-baseline gap-1 mt-2">
                      <h2 className="fw-bold text-dark mb-0">
                        {fmt(overviewStats.totalCommission)}
                      </h2>
                    </div>
                    <div className="mt-3">
                      <span
                        className="badge rounded-pill px-2.5 py-1 small fw-semibold"
                        style={{
                          background: overviewStats.commissionChange.isPositive
                            ? "#dcfce7"
                            : "#fee2e2",
                          color: overviewStats.commissionChange.isPositive
                            ? "#16a34a"
                            : "#ef4444",
                          fontSize: "11px",
                        }}
                      >
                        {overviewStats.commissionChange.text}
                      </span>
                    </div>
                  </Card>
                </Col>

                {/* 4. Upcoming Payouts */}
                <Col xs={12} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                    <span className="text-muted small fw-medium">Upcoming Payouts</span>
                    <div className="d-flex align-items-baseline gap-1 mt-2">
                      <h2 className="fw-bold text-dark mb-0">
                        {fmt(overviewStats.upcomingPayouts)}
                      </h2>
                    </div>
                    <div className="mt-3">
                      <span
                        className="badge rounded-pill px-2.5 py-1 small fw-semibold"
                        style={{
                          background: overviewStats.upcomingChange.isPositive
                            ? "#dcfce7"
                            : "#fee2e2",
                          color: overviewStats.upcomingChange.isPositive
                            ? "#16a34a"
                            : "#ef4444",
                          fontSize: "11px",
                        }}
                      >
                        {overviewStats.upcomingChange.text}
                      </span>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Col>

            {/* Right: Payroll History Live Spline Chart (Full 12 Months) */}
            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white position-relative overflow-hidden">
                <span className="text-muted small fw-medium">Payroll History</span>
                <div className="mt-1">
                  <h3 className="fw-bold text-dark mb-0">
                    {fmt(fullYearChartData.annualTotal)}
                  </h3>
                  <div className="text-muted small" style={{ fontSize: "12px" }}>
                    current year on year payroll ({selectedYear})
                  </div>
                </div>

                {/* Interactive 12-Month Spline Chart */}
                <div className="mt-3 position-relative" style={{ height: "160px" }}>
                  {/* Floating Tooltip for Hovered Month */}
                  {hoveredChartMonth !== null &&
                    fullYearChartData.series[hoveredChartMonth] && (
                      <div
                        style={{
                          position: "absolute",
                          top: "0px",
                          right: "15px",
                          backgroundColor: "#ffffff",
                          borderRadius: "10px",
                          boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
                          padding: "6px 12px",
                          border: "1px solid #f1f5f9",
                          zIndex: 5,
                          pointerEvents: "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {fullYearChartData.series[hoveredChartMonth].monthFull}{" "}
                          Revenue
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#0f172a",
                          }}
                        >
                          {fullYearChartData.series[hoveredChartMonth].label}{" "}
                          <span
                            style={{
                              color: fullYearChartData.series[hoveredChartMonth]
                                .isPositive
                                ? "#16a34a"
                                : "#ef4444",
                              fontSize: "11px",
                            }}
                          >
                            {fullYearChartData.series[hoveredChartMonth].change}
                          </span>
                        </div>
                      </div>
                    )}

                  <svg
                    viewBox="0 0 430 145"
                    style={{ width: "100%", height: "100%", overflow: "visible" }}
                  >
                    <defs>
                      <linearGradient
                        id="splineAreaGradFull"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#f472b6" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#f472b6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area Under Curve */}
                    {splineCoordinates.area && (
                      <path
                        d={splineCoordinates.area}
                        fill="url(#splineAreaGradFull)"
                      />
                    )}

                    {/* Smooth Bézier Curve */}
                    {splineCoordinates.path && (
                      <path
                        d={splineCoordinates.path}
                        fill="none"
                        stroke="#f472b6"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Data Points and 12-Month Labels */}
                    {splineCoordinates.points.map((pt, idx) => {
                      const isHovered = hoveredChartMonth === idx;
                      return (
                        <g
                          key={pt.month}
                          onMouseEnter={() => setHoveredChartMonth(idx)}
                          style={{ cursor: "pointer" }}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : 3.2}
                            fill="#ec4899"
                            stroke="#ffffff"
                            strokeWidth={isHovered ? 2.5 : 1.5}
                          />
                          <text
                            x={pt.x}
                            y={140}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight={isHovered ? "bold" : "normal"}
                            fill={isHovered ? "#0f172a" : "#94a3b8"}
                          >
                            {pt.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </Card>
            </Col>
          </Row>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* ══ SECTION: EMPLOYEE PAY DETAILS TABLE (NO COMMISSION COLUMN) ══ */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            {/* Top Controls Bar */}
            <div className="d-flex flex-col items-center gap-3 mb-4 pb-3 border-bottom">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="fw-bold mb-0 text-dark">Corporate Payroll & Salary Disbursement</h5>
                  <Badge bg="primary" className="fw-normal px-2.5 py-1" style={{ fontSize: "11px" }}>
                    {parentFilter === "all"
                      ? "Enterprise Group View"
                      : parentFilter === "standalone"
                        ? "Standalone Companies View"
                        : `${parentFilter} View`}
                  </Badge>
                </div>
                <div className="text-muted small mt-1">
                  {distinctParentGroups.length} Parent Conglomerate{distinctParentGroups.length === 1 ? "" : "s"}
                  {hasStandaloneEntities ? " • Standalone Companies" : ""} •{" "}
                  {distinctCompanies.length} Operating Compan{distinctCompanies.length === 1 ? "y" : "ies"} •{" "}
                  {distinctLocations.length} Work Location{distinctLocations.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Search Input */}
                <div
                  className="d-flex align-items-center bg-light border rounded-pill px-3 py-1"
                  style={{ minWidth: "190px" }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search staff, code, dept, company..."
                    className="border-0 bg-transparent ps-2 small text-dark shadow-none w-100"
                    style={{ outline: "none", fontSize: "13px" }}
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                  />
                </div>

                {/* Parent Group / Organization Filter Dropdown */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="light"
                    size="sm"
                    className="border rounded-pill px-3 py-1.5 fw-medium !text-xs d-flex align-items-center gap-1.5 text-secondary bg-white shadow-xs"
                  >
                    <span>
                      🏛️{" "}
                      {parentFilter === "all"
                        ? "All Organizations"
                        : parentFilter === "standalone"
                          ? "Standalone Only"
                          : parentFilter}
                    </span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-1 !text-xs">
                    <Dropdown.Item
                      active={parentFilter === "all"}
                      onClick={() => setParentFilter("all")}
                    >
                      All Organizations (Conglomerates & Standalone)
                    </Dropdown.Item>
                    {distinctParentGroups.map((pg) => (
                      <Dropdown.Item
                        key={pg}
                        active={parentFilter === pg}
                        onClick={() => setParentFilter(pg)}
                      >
                        🏛️ {pg} (Parent Conglomerate)
                      </Dropdown.Item>
                    ))}
                    {hasStandaloneEntities && (
                      <Dropdown.Item
                        active={parentFilter === "standalone"}
                        onClick={() => setParentFilter("standalone")}
                      >
                        🏢 Standalone Companies (No Parent Group)
                      </Dropdown.Item>
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Company Filter Dropdown */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="light"
                    size="sm"
                    className="border rounded-pill px-3 py-1.5 !text-xs fw-medium d-flex align-items-center gap-1.5 text-secondary bg-white shadow-xs"
                  >
                    <span>🏢 {companyFilter === "all" ? "All Companies" : companyFilter}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-1 !text-xs">
                    <Dropdown.Item
                      active={companyFilter === "all"}
                      onClick={() => setCompanyFilter("all")}
                    >
                      All Companies
                    </Dropdown.Item>
                    {distinctCompanies.map((c) => (
                      <Dropdown.Item
                        key={c}
                        active={companyFilter === c}
                        onClick={() => setCompanyFilter(c)}
                      >
                        {c}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Location Filter Dropdown */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="light"
                    size="sm"
                    className="border rounded-pill px-3 py-1.5 fw-medium !text-xs d-flex align-items-center gap-1.5 text-secondary bg-white shadow-xs"
                  >
                    <span>📍 {locationFilter === "all" ? "All Locations" : locationFilter}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-1 !text-xs">
                    <Dropdown.Item
                      active={locationFilter === "all"}
                      onClick={() => setLocationFilter("all")}
                    >
                      All Locations
                    </Dropdown.Item>
                    {distinctLocations.map((loc) => (
                      <Dropdown.Item
                        key={loc}
                        active={locationFilter === loc}
                        onClick={() => setLocationFilter(loc)}
                      >
                        {loc}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Status Filter Dropdown */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="light"
                    size="sm"
                    className="border rounded-pill px-3 py-1.5 fw-medium !text-xs d-flex align-items-center gap-1.5 text-secondary bg-white shadow-xs"
                  >
                    <span>
                      Filter:{" "}
                      {statusFilter === "all"
                        ? "All"
                        : statusFilter === "paid"
                          ? "Paid"
                          : "Unpaid"}
                    </span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-1 !text-xs">
                    <Dropdown.Item
                      active={statusFilter === "all"}
                      onClick={() => setStatusFilter("all")}
                    >
                      All Statuses
                    </Dropdown.Item>
                    <Dropdown.Item
                      active={statusFilter === "paid"}
                      onClick={() => setStatusFilter("paid")}
                    >
                      Paid Only
                    </Dropdown.Item>
                    <Dropdown.Item
                      active={statusFilter === "unpaid"}
                      onClick={() => setStatusFilter("unpaid")}
                    >
                      Unpaid Only
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>

                {/* View Mode Toggle: Grouped vs Flat */}
                <div className="btn-group border rounded-pill p-0.5 bg-light" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-2 py-1 ${groupViewMode === "grouped" ? "btn-primary shadow-xs fw-semibold" : "btn-light text-muted"}`}
                    style={{ fontSize: "11px" }}
                    onClick={() => setGroupViewMode("grouped")}
                    title="View employees grouped by Company & Work Location under each Parent Group"
                  >
                    🏢 Group List
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-2 py-1 ${groupViewMode === "flat" ? "btn-primary shadow-xs fw-semibold" : "btn-light text-muted"}`}
                    style={{ fontSize: "11px" }}
                    onClick={() => setGroupViewMode("flat")}
                    title="View employees grouped by Parent Organization in Flat Table lists"
                  >
                    📋 Flat List
                  </button>
                </div>

                {/* Bulk Action: Disburse Selected */}
                {selectedEmployees.size > 0 && (
                  <Button
                    variant="success"
                    size="sm"
                    className="rounded-pill px-2 py-1.5 fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
                    onClick={handleDisburseSelected}
                    disabled={isDisbursing}
                  >
                    {isDisbursing ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        <span>Disbursing...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Disburse Selected ({selectedEmployees.size})</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Export Summary Registers */}
                <Button
                  variant="outline-success"
                  size="sm"
                  className="rounded-pill px-2 py-1.5 !text-xs fw-semibold bg-white shadow-xs d-flex align-items-center gap-1"
                  onClick={generateSummaryExcel}
                  disabled={exportingSummary}
                  title="Export parent-wise & company-wise salary register to Excel (.xlsx)"
                >
                  <span>📊 Export Excel</span>
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill px-2 py-1.5 !text-xs fw-semibold bg-white text-dark shadow-xs d-flex align-items-center gap-1"
                  onClick={generateSummaryPDF}
                  disabled={exportingSummary}
                  title="Export parent-wise & company-wise salary register to PDF (.pdf)"
                >
                  <span>📄 Export PDF</span>
                </Button>
              </div>
            </div>



            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* ══ MULTI-PARENT & STANDALONE COMPANY ORGANIZATION DISPLAY ══ */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {parentOrganizations.length === 0 ? (
              <div className="text-center text-muted py-5 border rounded-4 bg-light">
                {loadingEmployees
                  ? "Loading payroll records..."
                  : "No employee payroll records match the criteria."}
              </div>
            ) : groupViewMode === "grouped" ? (
              /* ══════════════════════════════════════════════════════════════════════ */
              /* ══ VIEW MODE 1: GROUPED BY PARENT/STANDALONE -> SUBSIDIARY UNITS ══ */
              /* ══════════════════════════════════════════════════════════════════════ */
              <div>
                {parentOrganizations.map((org) => (
                  <div key={org.key} className="mb-5">
                    {/* Organization Banner (Holding Conglomerate or Standalone Company) */}
                    <div
                      className="rounded-4 p-3 mb-3 text-white shadow-sm d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3"
                      style={{
                        background:
                          org.type === "parent"
                            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)"
                            : "linear-gradient(135deg, #064e3b 0%, #065f46 60%, #022c22 100%)",
                        border:
                          org.type === "parent"
                            ? "1px solid #334155"
                            : "1px solid #047857",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: "48px",
                            height: "48px",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: "22px" }}>
                            {org.type === "parent" ? "🏛️" : "🏢"}
                          </span>
                        </div>
                        <div>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="fw-bold fs-5 tracking-tight">
                              {org.name}
                            </span>
                            <span
                              className="badge px-2.5 py-1 rounded-pill fw-semibold text-uppercase"
                              style={{
                                fontSize: "11px",
                                background:
                                  org.type === "parent"
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : "rgba(16, 185, 129, 0.2)",
                                color:
                                  org.type === "parent" ? "#93c5fd" : "#6ee7b7",
                                border:
                                  org.type === "parent"
                                    ? "1px solid rgba(147, 197, 253, 0.3)"
                                    : "1px solid rgba(110, 231, 183, 0.3)",
                              }}
                            >
                              {org.type === "parent"
                                ? "Holding Conglomerate"
                                : "Standalone Company"}
                            </span>
                          </div>
                          <div
                            className="text-white-50 small mt-0.5"
                            style={{ fontSize: "12px" }}
                          >
                            {org.type === "parent"
                              ? `Consolidated multi-subsidiary salary disbursement register for ${currentMonthYear}`
                              : `Independent direct entity payroll register (No parent group) for ${currentMonthYear}`}
                          </div>
                        </div>
                      </div>

                      {/* Header metrics & quick disburse button */}
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        {org.type === "parent" && (
                          <div
                            className="px-2 py-1.5 rounded-3 text-center"
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <div
                              className="text-white-50 text-uppercase"
                              style={{ fontSize: "10px", letterSpacing: "0.5px" }}
                            >
                              Subsidiaries
                            </div>
                            <div className="fw-bold fs-6">
                              {org.subsidiariesCount}
                            </div>
                          </div>
                        )}
                        <div
                          className="px-2 py-1.5 rounded-3 text-center"
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <div
                            className="text-white-50 text-uppercase"
                            style={{ fontSize: "10px", letterSpacing: "0.5px" }}
                          >
                            Locations
                          </div>
                          <div className="fw-bold fs-6">
                            {org.locationsCount}
                          </div>
                        </div>
                        <div
                          className="px-2 py-1.5 rounded-3 text-center"
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <div
                            className="text-white-50 text-uppercase"
                            style={{ fontSize: "10px", letterSpacing: "0.5px" }}
                          >
                            Total Staff
                          </div>
                          <div className="fw-bold fs-6">
                            {org.employees.length}
                          </div>
                        </div>
                        <div
                          className="px-2 py-1.5 rounded-3 text-center"
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          <div
                            className="text-uppercase fw-semibold"
                            style={{
                              fontSize: "10px",
                              letterSpacing: "0.5px",
                              color: "#6ee7b7",
                            }}
                          >
                            Total Net Payout
                          </div>
                          <div
                            className="fw-bold fs-6"
                            style={{ color: "#34d399" }}
                          >
                            {fmt(org.totalNet)}
                          </div>
                        </div>

                        {org.unpaidCount > 0 && (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={isDisbursing}
                            className="rounded-pill px-2 py-1.5 fw-semibold shadow-xs d-flex align-items-center gap-1 ms-1"
                            style={{ fontSize: "12px" }}
                            onClick={() => handleDisburseOrg(org.employees)}
                            title={`Disburse salary for all pending staff in ${org.name}`}
                          >
                            <span>
                              ⚡ Disburse {org.type === "parent" ? "Group" : "Company"}
                            </span>
                            <span className="badge bg-white text-success rounded-pill ms-1">
                              {org.unpaidCount}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Subsidiary Units for this Organization */}
                    {org.units.map((sec) => (
                      <div
                        key={sec.key}
                        className="mb-3 border rounded-4 overflow-hidden shadow-xs bg-white"
                        style={{ borderColor: "#e2e8f0" }}
                      >
                        {/* Section Header Bar */}
                        <div
                          className="px-3 py-2.5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
                          style={{
                            background: "linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <span
                              className="badge px-2.5 py-1 rounded-pill fw-semibold text-uppercase"
                              style={{
                                background: "#e0e7ff",
                                color: "#3730a3",
                                fontSize: "11.5px",
                              }}
                            >
                              📍 {sec.location}
                            </span>
                            <span
                              className="badge px-2.5 py-1 rounded-pill fw-semibold text-uppercase"
                              style={{
                                background: "#0f172a",
                                color: "#ffffff",
                                fontSize: "11.5px",
                              }}
                            >
                              🏢 {sec.company_name}
                            </span>
                            <span className="text-muted small" style={{ fontSize: "11.5px" }}>
                              {sec.isStandalone ? (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-0.5">
                                  Standalone Entity
                                </span>
                              ) : (
                                <>
                                  (Group: <strong>{sec.parent_name}</strong>)
                                </>
                              )}
                            </span>
                            <span
                              className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-0.5 fw-normal"
                              style={{ fontSize: "11px" }}
                            >
                              {sec.employees.length} Staff Member
                              {sec.employees.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <div className="d-flex align-items-center gap-2 me-1">
                              <span className="small text-muted" style={{ fontSize: "12px" }}>
                                Subtotal Net:
                              </span>
                              <strong className="text-dark fs-6">{fmt(sec.totalNet)}</strong>
                            </div>

                            <span
                              className="badge rounded-pill px-2.5 py-1 fw-semibold"
                              style={{
                                background: sec.unpaidCount === 0 ? "#dcfce7" : "#fef3c7",
                                color: sec.unpaidCount === 0 ? "#15803d" : "#b45309",
                                fontSize: "11px",
                              }}
                            >
                              {sec.paidCount} Paid • {sec.unpaidCount} Pending
                            </span>

                            {/* Section Quick Disbursement Action */}
                            <Button
                              size="sm"
                              variant={sec.unpaidCount > 0 ? "success" : "light"}
                              disabled={sec.unpaidCount === 0 || isDisbursing}
                              className="rounded-pill px-2 py-1 fw-semibold shadow-xs d-flex align-items-center gap-1"
                              style={{ fontSize: "11.5px" }}
                              onClick={() => handleDisburseSection(sec.employees)}
                              title={`Disburse salary for all pending staff in ${sec.company_name} (${sec.location})`}
                            >
                              <span>⚡ Disburse Unit</span>
                              {sec.unpaidCount > 0 && (
                                <span className="badge bg-white text-success rounded-pill ms-1">
                                  {sec.unpaidCount}
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Section Employees Table */}
                        <div className="table-responsive">
                          <Table
                            hover
                            className="align-middle mb-0"
                            style={{ borderColor: "#f1f5f9" }}
                          >
                            <thead>
                              <tr
                                style={{
                                  color: "#64748b",
                                  fontSize: "11.5px",
                                  backgroundColor: "#fafafa",
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                              >
                                <th style={{ width: "36px" }}>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={
                                      sec.employees.length > 0 &&
                                      sec.employees.every((e) =>
                                        selectedEmployees.has(e.employee_code)
                                      )
                                    }
                                    onChange={() => {
                                      const allSelected = sec.employees.every((e) =>
                                        selectedEmployees.has(e.employee_code)
                                      );
                                      setSelectedEmployees((prev) => {
                                        const next = new Set(prev);
                                        sec.employees.forEach((e) => {
                                          if (allSelected) next.delete(e.employee_code);
                                          else next.add(e.employee_code);
                                        });
                                        return next;
                                      });
                                    }}
                                  />
                                </th>
                                <th>Staff Member</th>
                                <th>Role & Dept</th>
                                <th>Bank & A/C Details</th>
                                <th>Base Pay</th>
                                <th>Net Disbursement</th>
                                <th>Status</th>
                                <th className="text-end">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.employees.map((emp) => {
                                const metrics = getEmployeeRowData(emp, currentMonthYear);
                                const roleBadge = getRoleBadgeStyle(
                                  emp.designation || emp.dept || ""
                                );
                                const isSelected = selectedEmployees.has(emp.employee_code);
                                const bInfo = emp.bank_details || {};
                                const bankName =
                                  emp.bank_name || bInfo.bank_name || "HDFC Bank";
                                const accNo =
                                  emp.account_no || bInfo.account_no || "•••• 4821";
                                const ifscCode =
                                  emp.ifsc || bInfo.ifsc || "HDFC0001234";

                                return (
                                  <tr key={emp.employee_code} style={{ fontSize: "13px" }}>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={isSelected}
                                        onChange={() => {
                                          const s = new Set(selectedEmployees);
                                          if (s.has(emp.employee_code))
                                            s.delete(emp.employee_code);
                                          else s.add(emp.employee_code);
                                          setSelectedEmployees(s);
                                        }}
                                      />
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center gap-2.5">
                                        {renderAvatar(emp, 34)}
                                        <div>
                                          <div className="fw-semibold text-dark">
                                            {emp.name}
                                          </div>
                                          <div
                                            className="text-muted"
                                            style={{ fontSize: "11px" }}
                                          >
                                            #{emp.employee_code}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column gap-1">
                                        <span
                                          className="badge rounded-pill px-2.5 py-0.5 fw-normal align-self-start"
                                          style={{
                                            background: roleBadge.bg,
                                            color: roleBadge.color,
                                            fontSize: "11px",
                                          }}
                                        >
                                          {emp.designation || "Staff"}
                                        </span>
                                        <span
                                          className="text-muted"
                                          style={{ fontSize: "11px" }}
                                        >
                                          {emp.dept || "General"}
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: "12px" }}>
                                        <div className="fw-semibold text-dark">
                                          {bankName}
                                        </div>
                                        <div
                                          className="text-muted"
                                          style={{ fontSize: "11px" }}
                                        >
                                          A/C:{" "}
                                          <span className="font-monospace text-secondary">
                                            {accNo}
                                          </span>{" "}
                                          • IFSC:{" "}
                                          <span className="font-monospace text-secondary">
                                            {ifscCode}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="text-dark fw-medium">
                                      {fmt(metrics.basePay)}
                                    </td>
                                    <td className="fw-bold text-success fs-6">
                                      {fmt(metrics.totalPayout)}
                                    </td>
                                    <td>
                                      <span
                                        className="badge rounded-pill px-2.5 py-1 fw-semibold"
                                        style={{
                                          background: metrics.isPaid
                                            ? "#dcfce7"
                                            : "#ffe4e6",
                                          color: metrics.isPaid
                                            ? "#16a34a"
                                            : "#e11d48",
                                          fontSize: "11.5px",
                                        }}
                                      >
                                        {metrics.isPaid ? "Paid" : "Unpaid"}
                                      </span>
                                    </td>
                                    <td className="text-end">
                                      <div className="d-flex align-items-center justify-content-end gap-1">
                                        {/* Quick Disburse Button if Unpaid */}
                                        {!metrics.isPaid && (
                                          <button
                                            className="btn btn-sm btn-outline-success px-2 py-0.5 rounded-pill fw-semibold me-1"
                                            style={{ fontSize: "11px" }}
                                            title="Pay / Disburse salary now via Bank Transfer"
                                            disabled={isDisbursing}
                                            onClick={() =>
                                              handleBatchDisburse([emp.employee_code])
                                            }
                                          >
                                            ⚡ Pay
                                          </button>
                                        )}

                                        {/* ASSIGN COMPANY / LOCATION ICON */}
                                        <button
                                          className="btn btn-sm btn-link p-1 text-primary opacity-80"
                                          title="Assign Group, Company & Work Location"
                                          onClick={() => handleOpenAssignModal(emp)}
                                        >
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          >
                                            <path d="M3 21h18"></path>
                                            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                            <line x1="9" y1="13" x2="9.01" y2="13"></line>
                                            <line x1="15" y1="13" x2="15.01" y2="13"></line>
                                            <line x1="9" y1="17" x2="9.01" y2="17"></line>
                                            <line x1="15" y1="17" x2="15.01" y2="17"></line>
                                          </svg>
                                        </button>

                                        {/* PENCIL ICON: OPENS EDIT SALARY STRUCTURE MODAL */}
                                        <button
                                          className="btn btn-sm btn-link p-1 text-muted opacity-75"
                                          title="Edit Salary Structure"
                                          onClick={() => handleOpenEditStructure(emp)}
                                        >
                                          <svg
                                            width="15"
                                            height="15"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          >
                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                          </svg>
                                        </button>

                                        {/* EYE ICON: OPENS VIEW PAYROLL DETAILS & SALARY SLIP MODAL */}
                                        <button
                                          className="btn btn-sm btn-link p-1 text-secondary"
                                          title="View Payroll Details & Salary Slip"
                                          onClick={() =>
                                            handleOpenEmployeeModal(emp.employee_code)
                                          }
                                        >
                                          <svg
                                            width="17"
                                            height="17"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                          >
                                            <path d="M1 12s4-8 11-8 4 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>

                        {/* Section Subtotal Footer Strip */}
                        <div
                          className="px-3 py-2 bg-light d-flex flex-column flex-sm-row justify-content-between align-items-sm-center text-muted small"
                          style={{ borderTop: "1px solid #f1f5f9", fontSize: "11.5px" }}
                        >
                          <div>
                            Subtotal for <strong>{sec.company_name}</strong> (
                            {sec.location}) • {sec.employees.length} Staff Member
                            {sec.employees.length === 1 ? "" : "s"}
                          </div>
                          <div className="d-flex align-items-center gap-3 mt-1 mt-sm-0">
                            <span>
                              Base Pay:{" "}
                              <strong className="text-dark">
                                {fmt(sec.totalBase)}
                              </strong>
                            </span>
                            <span>
                              Net Disbursement:{" "}
                              <strong className="text-success">
                                {fmt(sec.totalNet)}
                              </strong>
                            </span>
                            <span>
                              Disbursed:{" "}
                              <strong className="text-primary">
                                {sec.paidCount}/{sec.employees.length}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Organization Subtotal Summary Strip */}
                    <div
                      className="p-2.5 px-3 rounded-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
                      style={{
                        background: org.type === "parent" ? "#f1f5f9" : "#ecfdf5",
                        border:
                          org.type === "parent"
                            ? "1px solid #cbd5e1"
                            : "1px solid #a7f3d0",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <span className="fw-bold text-dark">
                          Subtotal ({org.name})
                        </span>
                        <span className="text-muted ms-2">
                          {org.type === "parent"
                            ? `Across ${org.subsidiariesCount} Subsidiaries & ${org.locationsCount} Locations • ${org.employees.length} Staff`
                            : `Direct Entity • ${org.locationsCount} Locations • ${org.employees.length} Staff`}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <span>
                          Base Pay:{" "}
                          <strong className="text-dark">{fmt(org.totalBase)}</strong>
                        </span>
                        <span>
                          Net Disbursement:{" "}
                          <strong className="text-success fw-bold">
                            {fmt(org.totalNet)}
                          </strong>
                        </span>
                        <span>
                          Disbursed:{" "}
                          <strong className="text-primary fw-semibold">
                            {org.paidCount}/{org.employees.length}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ══════════════════════════════════════════════════════════════════════ */
              /* ══ VIEW MODE 2: FLAT LIST VIEW GROUPED BY PARENT / STANDALONE ══ */
              /* ══════════════════════════════════════════════════════════════════════ */
              <div>
                {parentOrganizations.map((org) => (
                  <div key={org.key} className="mb-5">
                    {/* Organization Banner (Holding Conglomerate or Standalone Company) */}
                    <div
                      className="rounded-4 p-3 mb-3 text-white shadow-sm d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3"
                      style={{
                        background:
                          org.type === "parent"
                            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)"
                            : "linear-gradient(135deg, #064e3b 0%, #065f46 60%, #022c22 100%)",
                        border:
                          org.type === "parent"
                            ? "1px solid #334155"
                            : "1px solid #047857",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: "48px",
                            height: "48px",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: "22px" }}>
                            {org.type === "parent" ? "🏛️" : "🏢"}
                          </span>
                        </div>
                        <div>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="fw-bold fs-5 tracking-tight">
                              {org.name}
                            </span>
                            <span
                              className="badge px-2.5 py-1 rounded-pill fw-semibold text-uppercase"
                              style={{
                                fontSize: "11px",
                                background:
                                  org.type === "parent"
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : "rgba(16, 185, 129, 0.2)",
                                color:
                                  org.type === "parent" ? "#93c5fd" : "#6ee7b7",
                                border:
                                  org.type === "parent"
                                    ? "1px solid rgba(147, 197, 253, 0.3)"
                                    : "1px solid rgba(110, 231, 183, 0.3)",
                              }}
                            >
                              {org.type === "parent"
                                ? "Holding Conglomerate"
                                : "Standalone Company"}
                            </span>
                          </div>
                          <div
                            className="text-white-50 small mt-0.5"
                            style={{ fontSize: "12px" }}
                          >
                            {org.type === "parent"
                              ? `Consolidated multi-subsidiary salary disbursement register for ${currentMonthYear}`
                              : `Independent direct entity payroll register (No parent group) for ${currentMonthYear}`}
                          </div>
                        </div>
                      </div>

                      {/* Header metrics & quick disburse button */}
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        {org.type === "parent" && (
                          <div
                            className="px-3 py-1.5 rounded-3 text-center"
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <div
                              className="text-white-50 text-uppercase"
                              style={{ fontSize: "10px", letterSpacing: "0.5px" }}
                            >
                              Subsidiaries
                            </div>
                            <div className="fw-bold fs-6">
                              {org.subsidiariesCount}
                            </div>
                          </div>
                        )}
                        <div
                          className="px-3 py-1.5 rounded-3 text-center"
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <div
                            className="text-white-50 text-uppercase"
                            style={{ fontSize: "10px", letterSpacing: "0.5px" }}
                          >
                            Locations
                          </div>
                          <div className="fw-bold fs-6">
                            {org.locationsCount}
                          </div>
                        </div>
                        <div
                          className="px-3 py-1.5 rounded-3 text-center"
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <div
                            className="text-white-50 text-uppercase"
                            style={{ fontSize: "10px", letterSpacing: "0.5px" }}
                          >
                            Total Staff
                          </div>
                          <div className="fw-bold fs-6">
                            {org.employees.length}
                          </div>
                        </div>
                        <div
                          className="px-3 py-1.5 rounded-3 text-center"
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          <div
                            className="text-uppercase fw-semibold"
                            style={{
                              fontSize: "10px",
                              letterSpacing: "0.5px",
                              color: "#6ee7b7",
                            }}
                          >
                            Total Net Payout
                          </div>
                          <div
                            className="fw-bold fs-6"
                            style={{ color: "#34d399" }}
                          >
                            {fmt(org.totalNet)}
                          </div>
                        </div>

                        {org.unpaidCount > 0 && (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={isDisbursing}
                            className="rounded-pill px-2 py-1.5 fw-semibold shadow-xs d-flex align-items-center gap-1 ms-1"
                            style={{ fontSize: "12px" }}
                            onClick={() => handleDisburseOrg(org.employees)}
                            title={`Disburse salary for all pending staff in ${org.name}`}
                          >
                            <span>
                              ⚡ Disburse {org.type === "parent" ? "Group" : "Company"}
                            </span>
                            <span className="badge bg-white text-success rounded-pill ms-1">
                              {org.unpaidCount}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Flat Table for this Organization's employees */}
                    <div className="table-responsive border rounded-4 overflow-hidden mb-3 bg-white">
                      <Table
                        hover
                        className="align-middle mb-0"
                        style={{ borderColor: "#f1f5f9" }}
                      >
                        <thead>
                          <tr
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                              backgroundColor: "#fafafa",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <th style={{ width: "36px" }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={
                                  org.employees.length > 0 &&
                                  org.employees.every((e) =>
                                    selectedEmployees.has(e.employee_code)
                                  )
                                }
                                onChange={() => {
                                  const allOrgSelected = org.employees.every((e) =>
                                    selectedEmployees.has(e.employee_code)
                                  );
                                  setSelectedEmployees((prev) => {
                                    const next = new Set(prev);
                                    org.employees.forEach((e) => {
                                      if (allOrgSelected)
                                        next.delete(e.employee_code);
                                      else next.add(e.employee_code);
                                    });
                                    return next;
                                  });
                                }}
                              />
                            </th>
                            <th>Staff member</th>
                            <th>Company & Group</th>
                            <th>Location</th>
                            <th>Role & Dept</th>
                            <th>Base Pay</th>
                            <th>Total Payout</th>
                            <th>Status</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {org.employees.map((emp) => {
                            const metrics = getEmployeeRowData(emp, currentMonthYear);
                            const roleBadge = getRoleBadgeStyle(
                              emp.designation || emp.dept || ""
                            );
                            const isSelected = selectedEmployees.has(emp.employee_code);

                            return (
                              <tr key={emp.employee_code} style={{ fontSize: "13px" }}>
                                <td>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={isSelected}
                                    onChange={() => {
                                      const s = new Set(selectedEmployees);
                                      if (s.has(emp.employee_code))
                                        s.delete(emp.employee_code);
                                      else s.add(emp.employee_code);
                                      setSelectedEmployees(s);
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="d-flex align-items-center gap-2.5">
                                    {renderAvatar(emp, 34)}
                                    <div>
                                      <div className="fw-semibold text-dark">
                                        {emp.name}
                                      </div>
                                      <div
                                        className="text-muted"
                                        style={{ fontSize: "11px" }}
                                      >
                                        #{emp.employee_code}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <span className="fw-semibold text-dark">
                                      {emp.company_name || org.name}
                                    </span>
                                    <div
                                      className="text-muted"
                                      style={{ fontSize: "11px" }}
                                    >
                                      {org.type === "parent"
                                        ? org.name
                                        : "Standalone Company"}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className="badge rounded-pill px-2 py-0.5 fw-medium"
                                    style={{
                                      background: "#e0e7ff",
                                      color: "#3730a3",
                                      fontSize: "11px",
                                    }}
                                  >
                                    📍 {emp.work_location || "Kolkata"}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className="badge rounded-pill px-2.5 py-1 fw-normal"
                                    style={{
                                      background: roleBadge.bg,
                                      color: roleBadge.color,
                                      fontSize: "12px",
                                    }}
                                  >
                                    {emp.designation || emp.dept || "Staff"}
                                  </span>
                                </td>
                                <td className="text-dark fw-medium">
                                  {fmt(metrics.basePay)}
                                </td>
                                <td className="fw-bold text-dark">
                                  {fmt(metrics.totalPayout)}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      color: metrics.isPaid ? "#16a34a" : "#e11d48",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                    }}
                                  >
                                    {metrics.isPaid ? "Paid" : "Unpaid"}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <div className="d-flex align-items-center justify-content-end gap-1">
                                    {!metrics.isPaid && (
                                      <button
                                        className="btn btn-sm btn-outline-success px-2 py-0.5 rounded-pill fw-semibold me-1"
                                        style={{ fontSize: "11px" }}
                                        title="Pay / Disburse salary now via Bank Transfer"
                                        disabled={isDisbursing}
                                        onClick={() =>
                                          handleBatchDisburse([emp.employee_code])
                                        }
                                      >
                                        ⚡ Pay
                                      </button>
                                    )}

                                    <button
                                      className="btn btn-sm btn-link p-1 text-primary opacity-80"
                                      title="Assign Group, Company & Work Location"
                                      onClick={() => handleOpenAssignModal(emp)}
                                    >
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M3 21h18"></path>
                                        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                        <line x1="9" y1="13" x2="9.01" y2="13"></line>
                                        <line x1="15" y1="13" x2="15.01" y2="13"></line>
                                        <line x1="9" y1="17" x2="9.01" y2="17"></line>
                                        <line x1="15" y1="17" x2="15.01" y2="17"></line>
                                      </svg>
                                    </button>

                                    <button
                                      className="btn btn-sm btn-link p-1 text-muted opacity-75"
                                      title="Edit Salary Structure"
                                      onClick={() => handleOpenEditStructure(emp)}
                                    >
                                      <svg
                                        width="15"
                                        height="15"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                      </svg>
                                    </button>

                                    <button
                                      className="btn btn-sm btn-link p-1 text-secondary"
                                      title="View Payroll Details & Salary Slip"
                                      onClick={() =>
                                        handleOpenEmployeeModal(emp.employee_code)
                                      }
                                    >
                                      <svg
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M1 12s4-8 11-8 4 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>

                    {/* Organization Subtotal Summary Strip */}
                    <div
                      className="p-2.5 px-3 rounded-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
                      style={{
                        background: org.type === "parent" ? "#f1f5f9" : "#ecfdf5",
                        border:
                          org.type === "parent"
                            ? "1px solid #cbd5e1"
                            : "1px solid #a7f3d0",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <span className="fw-bold text-dark">
                          Subtotal ({org.name})
                        </span>
                        <span className="text-muted ms-2">
                          {org.type === "parent"
                            ? `Across ${org.subsidiariesCount} Subsidiaries & ${org.locationsCount} Locations • ${org.employees.length} Staff`
                            : `Direct Entity • ${org.locationsCount} Locations • ${org.employees.length} Staff`}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <span>
                          Base Pay:{" "}
                          <strong className="text-dark">{fmt(org.totalBase)}</strong>
                        </span>
                        <span>
                          Net Disbursement:{" "}
                          <strong className="text-success fw-bold">
                            {fmt(org.totalNet)}
                          </strong>
                        </span>
                        <span>
                          Disbursed:{" "}
                          <strong className="text-primary fw-semibold">
                            {org.paidCount}/{org.employees.length}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Consolidated Grand Total Box Across All Parent Groups & Standalone Companies */}
            <div
              className="mt-4 p-3 rounded-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
              style={{ background: "#f8fafc", border: "1.5px dashed #94a3b8" }}
            >
              <div>
                <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                  <span>Consolidated Grand Total</span>
                  <span
                    className="badge bg-dark rounded-pill px-2 py-0.5"
                    style={{ fontSize: "11px" }}
                  >
                    {parentOrganizations.length} Organization
                    {parentOrganizations.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="text-muted small mt-0.5">
                  Across all {distinctCompanies.length} Subsidiaries / Operating Entities & {distinctLocations.length} Work Locations
                </div>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-3">
                <span className="small text-muted">
                  Total Staff:{" "}
                  <strong className="text-dark fs-6">
                    {filteredEmployees.length}
                  </strong>
                </span>
                <span className="small text-muted">
                  Total Base:{" "}
                  <strong className="text-dark fs-6">
                    {fmt(
                      filteredEmployees.reduce(
                        (sum, e) =>
                          sum +
                          (getEmployeeRowData(e, currentMonthYear).basePay || 0),
                        0
                      )
                    )}
                  </strong>
                </span>
                <span className="small text-muted">
                  Grand Net Disbursement:{" "}
                  <strong className="text-success fs-5 fw-bold">
                    {fmt(
                      filteredEmployees.reduce(
                        (sum, e) =>
                          sum +
                          (getEmployeeRowData(e, currentMonthYear).totalPayout || 0),
                        0
                      )
                    )}
                  </strong>
                </span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ══ MODAL 1: EDIT SALARY STRUCTURE (PENCIL ICON ✏️) ══ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        show={showEditStructureModal}
        onHide={() => setShowEditStructureModal(false)}
        size="lg"
        centered
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <Modal.Header className="px-4 py-3 border-bottom bg-white d-flex align-items-center justify-content-between">
          <div>
            <h5 className="fw-bold mb-0 text-dark">
              ✏️ Edit Salary Structure
            </h5>
            <small className="text-muted">
              {editingEmp?.name} (#{editingEmp?.employee_code}) -{" "}
              {editingEmp?.designation || editingEmp?.dept}
            </small>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <label className="small fw-semibold text-muted mb-0">Status:</label>
              <Form.Select
                size="sm"
                className="fw-bold"
                style={{
                  width: "135px",
                  borderColor: (editStructureData.employment_type || "Permanent").toLowerCase() === "permanent" ? "#10b981" : "#f59e0b",
                  color: (editStructureData.employment_type || "Permanent").toLowerCase() === "permanent" ? "#065f46" : "#b45309",
                  background: (editStructureData.employment_type || "Permanent").toLowerCase() === "permanent" ? "#ecfdf5" : "#fffbeb",
                }}
                value={editStructureData.employment_type || "Permanent"}
                onChange={(e) =>
                  setEditStructureData({
                    ...editStructureData,
                    employment_type: e.target.value,
                  })
                }
              >
                <option value="Permanent">Permanent</option>
                <option value="Probation">Probation</option>
                <option value="Intern">Intern</option>
              </Form.Select>
            </div>
            <button
              className="btn btn-sm btn-light border rounded p-1"
              onClick={() => setShowEditStructureModal(false)}
            >
              ✕
            </button>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4 bg-light bg-opacity-50">
          <Row className="g-3">
            {/* Left: Earnings Breakdown */}
            <Col xs={12} md={6}>
              <Card className="border-0 shadow-xs rounded-3 p-3 bg-white h-100">
                <div className="fw-bold text-success mb-2 pb-1 border-bottom d-flex justify-content-between align-items-center">
                  <span>Monthly Earnings (Fixed)</span>
                  <span className="small text-muted fw-normal">INR (₹)</span>
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Basic Salary
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.basic === 0 ? 0 : (editStructureData.basic ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        basic: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    House Rent Allowance (HRA)
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.hra === 0 ? 0 : (editStructureData.hra ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        hra: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Conveyance Allowance
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.conveyance === 0 ? 0 : (editStructureData.conveyance ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        conveyance: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Medical Allowance
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.medical === 0 ? 0 : (editStructureData.medical ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        medical: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Special / Other Allowance
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.allowance === 0 ? 0 : (editStructureData.allowance ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        allowance: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 mt-auto border-top fw-bold text-dark">
                  <span>Gross Earnings</span>
                  <span className="text-success">{fmt(computedEditGross)}</span>
                </div>
              </Card>
            </Col>

            {/* Right: Deductions Breakdown */}
            <Col xs={12} md={6}>
              <Card className="border-0 shadow-xs rounded-3 p-3 bg-white h-100">
                <div className="fw-bold text-danger mb-2 pb-1 border-bottom d-flex justify-content-between align-items-center">
                  <span>Monthly Deductions</span>
                  <span className="small text-muted fw-normal">INR (₹)</span>
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Provident Fund (PF)
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.pf === 0 ? 0 : (editStructureData.pf ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        pf: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                {computedEditGross <= (globalEsiThreshold || 21000) ? (
                  <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label small text-muted mb-0">
                        Employee State Insurance (ESI)
                      </label>
                      <Badge bg="info" className="fw-normal" style={{ fontSize: "9px" }}>
                        Total Salary ≤ ₹{(globalEsiThreshold || 21000).toLocaleString("en-IN")}
                      </Badge>
                    </div>
                    <Form.Control
                      type="number"
                      size="sm"
                      className="fw-semibold"
                      value={editStructureData.esi === 0 ? 0 : (editStructureData.esi || editStructureData.mediclaim || "")}
                      onChange={(e) =>
                        setEditStructureData({
                          ...editStructureData,
                          esi: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                          mediclaim: 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label small text-muted mb-0">
                        Mediclaim
                      </label>
                      <Badge bg="primary" className="fw-normal" style={{ fontSize: "9px" }}>
                        Total Salary &gt; ₹{(globalEsiThreshold || 21000).toLocaleString("en-IN")}
                      </Badge>
                    </div>
                    <Form.Control
                      type="number"
                      size="sm"
                      className="fw-semibold"
                      value={editStructureData.mediclaim === 0 ? 0 : (editStructureData.mediclaim || editStructureData.esi || "")}
                      onChange={(e) =>
                        setEditStructureData({
                          ...editStructureData,
                          mediclaim: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                          esi: 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Professional Tax (PT)
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.professional_tax === 0 ? 0 : (editStructureData.professional_tax ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        professional_tax: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    TDS / Income Tax (IT)
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.tds === 0 ? 0 : (editStructureData.tds ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        tds: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                        income_tax: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Loss of Pay (LOP) per day rate
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.lop === 0 ? 0 : (editStructureData.lop ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        lop: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 mt-auto border-top fw-bold text-dark">
                  <span>Total Deductions</span>
                  <span className="text-danger">
                    {fmt(computedEditDeductions)}
                  </span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Bottom Live Net Salary Highlight Strip */}
          <div
            className="mt-3 p-3 rounded-3 text-white d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
            style={{ background: "#4a2835" }}
          >
            <div>
              <span className="small text-uppercase opacity-75 fw-semibold d-block">
                Net Take-Home Salary (Monthly)
              </span>
              <span className="small opacity-90">
                {numberToWords(computedEditNet)}
              </span>
            </div>
            <h3 className="fw-bold mb-0 text-white">{fmt(computedEditNet)}</h3>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-white border-top px-4 py-2.5">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3"
            onClick={() => setShowEditStructureModal(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-3 px-4 fw-semibold text-white border-0"
            style={{ background: "#4a2835" }}
            disabled={savingStructure}
            onClick={handleSaveSalaryStructure}
          >
            {savingStructure ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Saving...
              </>
            ) : (
              "Save Salary Structure"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ══ MODAL 2: VIEW PAYROLL DETAILS & PROFESSIONAL SALARY SLIP (EYE 👁️) ══ */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        show={showPayrollDetailsModal}
        onHide={() => setShowPayrollDetailsModal(false)}
        size="xl"
        centered
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <Modal.Header className="px-4 py-3 border-bottom bg-white d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold mb-0 text-dark">Payroll Details</h5>
            <span
              className="px-2.5 py-0.5 rounded-pill small fw-semibold"
              style={{
                background:
                  payrollStatus === "Finalized" ? "#dcfce7" : "#ffe4e6",
                color: payrollStatus === "Finalized" ? "#15803d" : "#e11d48",
                fontSize: "12px",
              }}
            >
              {payrollStatus === "Finalized" ? "Paid" : "Unpaid"}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">
              {currentEmpIndex >= 0 ? currentEmpIndex + 1 : 1} of{" "}
              {Array.isArray(employees) ? employees.length : 0}
            </span>
            {/* Up arrow */}
            <button
              className="btn btn-sm btn-light border rounded p-1 d-flex align-items-center justify-content-center"
              style={{ width: "28px", height: "28px" }}
              disabled={currentEmpIndex <= 0}
              onClick={handlePrevEmployee}
              title="Previous employee"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            {/* Down arrow */}
            <button
              className="btn btn-sm btn-light border rounded p-1 d-flex align-items-center justify-content-center"
              style={{ width: "28px", height: "28px" }}
              disabled={
                !Array.isArray(employees) ||
                currentEmpIndex >= employees.length - 1
              }
              onClick={handleNextEmployee}
              title="Next employee"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {/* Close Button */}
            <button
              className="btn btn-sm btn-light border rounded p-1 d-flex align-items-center justify-content-center ms-1"
              style={{ width: "28px", height: "28px" }}
              onClick={() => setShowPayrollDetailsModal(false)}
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </Modal.Header>

        <Modal.Body className="p-4 bg-light bg-opacity-25">
          <Row className="g-4">
            {/* LEFT COLUMN: Employee details, attendance metrics, timing, breakdown */}
            <Col xs={12} lg={6}>
              {/* Employee Top Profile Card */}
              <div className="bg-white rounded-3 p-3 border shadow-xs d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-3">
                  {renderAvatar(employeeInfo, 44)}
                  <div>
                    <h6 className="fw-bold text-dark mb-0">
                      {employeeInfo.name}
                    </h6>
                    <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                      <span className="text-muted small">
                        #{employeeInfo.employee_code}
                      </span>
                      <span
                        className="badge rounded-pill fw-normal"
                        style={{
                          background: "#ecfdf5",
                          color: "#16a34a",
                          fontSize: "11px",
                        }}
                      >
                        {employeeInfo.designation ||
                          employeeInfo.dept ||
                          "Staff"}
                      </span>
                      <span
                        className="badge rounded-pill fw-semibold text-uppercase"
                        style={{ background: "#0f172a", color: "#fff", fontSize: "10.5px" }}
                      >
                        🏢 {employeeInfo.company_name || "TATA Steel"}
                      </span>
                      <span
                        className="badge rounded-pill fw-medium text-uppercase"
                        style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "10.5px" }}
                      >
                        📍 {employeeInfo.work_location || "Kolkata"}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill px-3 py-1 small fw-semibold"
                  onClick={() => {
                    const emp = employees.find(
                      (e) => e.employee_code === employeeInfo.employee_code
                    );
                    if (emp) {
                      setShowPayrollDetailsModal(false);
                      handleOpenEditStructure(emp);
                    }
                  }}
                >
                  Edit Structure
                </Button>
              </div>

              {/* 4 Pastel Attendance Cards */}
              <Row className="g-2 mb-3">
                <Col xs={6}>
                  <div
                    className="p-3 rounded-3"
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #d1fae5",
                    }}
                  >
                    <div
                      className="small"
                      style={{ color: "#065f46", fontSize: "13px" }}
                    >
                      Present
                    </div>
                    <div className="mt-1" style={{ color: "#065f46" }}>
                      <span className="fs-3 fw-bold">
                        {attendance.present_days ?? 0}
                      </span>{" "}
                      <span className="small">{(attendance.present_days ?? 0) === 1 ? "day" : "days"}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={6}>
                  <div
                    className="p-3 rounded-3"
                    style={{
                      background: "#fefce8",
                      border: "1px solid #fef08a",
                    }}
                  >
                    <div
                      className="small"
                      style={{ color: "#854d0e", fontSize: "13px" }}
                    >
                      Late
                    </div>
                    <div className="mt-1" style={{ color: "#854d0e" }}>
                      <span className="fs-3 fw-bold">
                        {attendance.late_days ?? 0}
                      </span>{" "}
                      <span className="small">{(attendance.late_days ?? 0) === 1 ? "day" : "days"}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={6}>
                  <div
                    className="p-3 rounded-3"
                    style={{
                      background: "#fff1f2",
                      border: "1px solid #ffe4e6",
                    }}
                  >
                    <div
                      className="small"
                      style={{ color: "#9f1239", fontSize: "13px" }}
                    >
                      Unpaid Leave
                    </div>
                    <div className="mt-1" style={{ color: "#9f1239" }}>
                      <span className="fs-3 fw-bold">
                        {attendance.lop_days ?? 0}
                      </span>{" "}
                      <span className="small">{(attendance.lop_days ?? 0) === 1 ? "day" : "days"}</span>
                    </div>
                  </div>
                </Col>

                <Col xs={6}>
                  <div
                    className="p-3 rounded-3"
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #dbeafe",
                    }}
                  >
                    <div
                      className="small"
                      style={{ color: "#1e40af", fontSize: "13px" }}
                    >
                      Overtime
                    </div>
                    <div className="mt-1" style={{ color: "#1e40af" }}>
                      <span className="fs-3 fw-bold">
                        {parseFloat(attendance.overtime_hours).toFixed(2) || (parseFloat(variablePay.overtime_hours) > 0 ? parseFloat(variablePay.overtime_hours) : 0)}
                      </span>{" "}
                      <span className="small">hrs</span>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Paid Days Calculation Card */}
              <div className="bg-white rounded-3 p-3 border shadow-xs mb-3">
                <div className="d-flex flex-col justify-content-between align-items-center mb-2 pb-1 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold small text-dark">📅 Paid Days Calculation</span>
                    <Badge bg="primary" style={{ fontSize: "10px" }}>Formula Driven</Badge>
                  </div>
                  <span className="small text-muted" style={{ fontSize: "11px" }}>
                    Attendance + Leaves + Holidays + Week-offs − Absents
                  </span>
                </div>

                <div className="p-2.5 rounded-2 bg-light mb-2 font-monospace text-center small text-dark fw-bold border">
                  Paid Days = {attendance.present_days ?? 0} (Present) + {attendance.leave_days || attendance.paid_leaves || 0} (Leaves) + {attendance.holiday_days || 0} (Holidays) + {attendance.week_offs ?? Math.max(0, (attendance.total_days || 30) - (attendance.working_days || 26))} (Week-offs) − {attendance.absent_days || 0} (Absents)
                </div>

                <Row className="g-2 text-center row-cols-5">
                  <Col>
                    <div className="p-1 rounded bg-success bg-opacity-10 border border-success border-opacity-25">
                      <div className="text-muted" style={{ fontSize: "10px" }}>PRESENT</div>
                      <div className="fw-bold text-success fs-6">{attendance.present_days ?? 0}</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-1 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25">
                      <div className="text-muted" style={{ fontSize: "10px" }}>LEAVES</div>
                      <div className="fw-bold text-primary fs-6">{attendance.leave_days || attendance.paid_leaves || 0}</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-1 rounded bg-info bg-opacity-10 border border-info border-opacity-25">
                      <div className="text-muted" style={{ fontSize: "10px" }}>HOLIDAYS</div>
                      <div className="fw-bold text-info fs-6">{attendance.holiday_days || 0}</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-1 rounded bg-warning bg-opacity-10 border border-warning border-opacity-25">
                      <div className="text-muted" style={{ fontSize: "10px" }}>WEEK-OFFS</div>
                      <div className="fw-bold text-warning-emphasis fs-6">{attendance.week_offs ?? Math.max(0, (attendance.total_days || 30) - (attendance.working_days || 26))}</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-1 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
                      <div className="text-muted" style={{ fontSize: "10px" }}>ABSENTS</div>
                      <div className="fw-bold text-danger fs-6">{attendance.absent_days || 0}</div>
                    </div>
                  </Col>
                </Row>

                <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center small">
                  <div>
                    <span className="text-muted">Total Paid Days: </span>
                    <strong className="text-success fs-6">
                      {attendance.paid_days != null
                        ? attendance.paid_days
                        : Math.max(0, (attendance.present_days ?? 0) + (attendance.leave_days || attendance.paid_leaves || 0) + (attendance.holiday_days || 0) + (attendance.week_offs ?? Math.max(0, (attendance.total_days || 30) - (attendance.working_days || 26))) - (attendance.absent_days || 0))}
                    </strong>
                    <span className="text-muted"> / {attendance.total_days || 30} Total Days</span>
                  </div>
                  <div>
                    <span className="text-muted">LOP Deduction: </span>
                    <strong className="text-danger">
                      {attendance.lop_days || 0} {(attendance.lop_days || 0) === 1 ? "day" : "days"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Facilities & Benefits Card (Permanent Staff Only) */}
              <div className="bg-white rounded-3 p-3 border shadow-xs mb-3">
                <div className="d-flex flex-col justify-content-between align-items-center mb-2 pb-1 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold small text-dark">🏦 Facilities & Statutory Benefits</span>
                    <Badge
                      bg={employeeInfo.is_permanent !== false && adjustments.is_permanent !== false ? "success" : "warning"}
                      style={{ fontSize: "10px" }}
                    >
                      {employeeInfo.is_permanent !== false && adjustments.is_permanent !== false
                        ? "Permanent Staff"
                        : "Locked: " + (employeeInfo.employment_type || "Probation/Intern")}
                    </Badge>
                  </div>
                  <span className="small text-muted" style={{ fontSize: "11px" }}>
                    Advance • Loan • Insurance • Gratuity
                  </span>
                </div>

                {employeeInfo.is_permanent === false || adjustments.is_permanent === false ? (
                  <Alert variant="warning" className="mb-0 py-2 small d-flex align-items-center gap-2">
                    <span>⚠️</span>
                    <div>
                      Advance Payment, Company Loan, Insurance, and Gratuity facilities are strictly reserved for <strong>Permanent Employees</strong>. This employee is on <strong>{employeeInfo.employment_type || "Probation / Intern"}</strong>.
                    </div>
                  </Alert>
                ) : (
                  <Row className="g-2 small">
                    <Col xs={6}>
                      <div className="p-2 rounded bg-light border" style={{ fontSize: "11px" }}>
                        <div className="text-muted" >Advance Payment (≤ ₹1L)</div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-secondary">Principal: {fmt(adjustments.advance_amount)}</span>
                          <span className="fw-semibold text-danger">Recovery: {fmt(adjustments.advance_deduction)}</span>
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-2 rounded bg-light border" style={{ fontSize: "11px" }}>
                        <div className="text-muted">Company Loan (₹1L - ₹10L)</div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-secondary">Loan: {fmt(adjustments.loan_amount)}</span>
                          <span className="fw-semibold text-danger">EMI: {fmt(adjustments.loan_emi)}</span>
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-2 rounded bg-light border" style={{ fontSize: "11px" }}>
                        <div className="text-muted">Corporate Group Insurance</div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-secondary">Coverage Active</span>
                          <span className="fw-semibold text-danger">Deduction: {fmt(adjustments.insurance_deduction)}</span>
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-2 rounded bg-light border" style={{ fontSize: "11px" }}>
                        <div className="text-muted">Gratuity Accrual (Act 1972)</div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="fw-semibold text-success">Monthly: {fmt(adjustments.gratuity_accrual)}</span>
                          <span className="text-secondary">Total: {fmt(adjustments.total_gratuity)}</span>
                        </div>
                      </div>
                    </Col>
                  </Row>
                )}
              </div>

              {/* Attendance Shift Timing Card */}
              <div className="bg-white rounded-3 p-3 border shadow-xs mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-medium">
                    {shiftTiming.dateStr ? `${shiftTiming.dateStr} Shift Timing` : "Latest Shift Timing Log"}
                  </span>
                  <span className="badge bg-light text-muted border fw-normal" style={{ fontSize: "10px" }}>
                    Live Log
                  </span>
                </div>
                <div className="d-flex justify-content-between text-center">
                  <div>
                    <div className="fw-bold text-dark fs-5">{shiftTiming.check_in || "--:--"}</div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      Clock in
                    </div>
                  </div>
                  <div>
                    <div className="fw-bold text-dark fs-5">{shiftTiming.check_out || "--:--"}</div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      Clock out
                    </div>
                  </div>
                  <div>
                    <div className="fw-bold text-dark fs-5">
                      {shiftTiming.overtime_mins || 0} <span className="small fw-normal">mins</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      Overtime
                    </div>
                  </div>
                  <div>
                    <div className="fw-bold text-dark fs-5">
                      {shiftTiming.late_mins || 0} <span className="small fw-normal">mins</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: "11px" }}>
                      Late
                    </div>
                  </div>
                </div>
              </div>

              {/* Service / Non-Zero Breakdown */}
              <div className="bg-white rounded-3 p-3 border shadow-xs">
                <h6 className="fw-bold text-dark mb-2">Earnings Breakdown</h6>
                <div className="table-responsive">
                  <Table className="mb-0 small align-middle" borderless>
                    <thead style={{ background: "#f8fafc", color: "#64748b" }}>
                      <tr>
                        <th className="py-2">Component</th>
                        <th className="py-2">Category</th>
                        <th className="py-2 text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewEarningsItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="fw-medium">{item.label}</td>
                          <td className="text-muted">{item.type}</td>
                          <td className="text-end fw-semibold">
                            {fmt(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </Col>

            {/* RIGHT COLUMN: PROFESSIONAL MINIMALIST SALARY SLIP (NO BLANK / ZERO ROWS) */}
            <Col xs={12} lg={6}>
              <div className="bg-white rounded-4 p-4 border shadow-sm h-100 d-flex flex-column justify-content-between">
                <div>
                  {/* Slip Header */}
                  <div className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="fw-bold text-dark mb-0">
                          {employeeInfo.company_name || "TATA STEEL"}
                        </h5>
                        <div
                          className="text-muted small"
                          style={{ fontSize: "12px" }}
                        >
                          {employeeInfo.group_name ? `A Division of ${employeeInfo.group_name} • ` : ""}Location: {employeeInfo.work_location || "Kolkata"}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-light text-dark border px-2 py-1 small fw-semibold">
                          {currentMonthYear}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Employee Details Subgrid (only populated data) */}
                  <div
                    className="p-2.5 rounded-3 mb-3"
                    style={{ background: "#f8fafc", fontSize: "12px" }}
                  >
                    <Row className="g-1">
                      <Col xs={6}>
                        <span className="text-muted">Staff: </span>
                        <strong className="text-dark">
                          {employeeInfo.name}
                        </strong>
                      </Col>
                      <Col xs={6}>
                        <span className="text-muted">Code: </span>
                        <strong className="text-dark">
                          #{employeeInfo.employee_code}
                        </strong>
                      </Col>
                      <Col xs={6}>
                        <span className="text-muted">Company: </span>
                        <strong className="text-dark">
                          {employeeInfo.company_name || "TATA Steel"}
                        </strong>
                      </Col>
                      <Col xs={6}>
                        <span className="text-muted">Group: </span>
                        <span className="text-dark">
                          {employeeInfo.group_name || "TATA Company"}
                        </span>
                      </Col>
                      <Col xs={6}>
                        <span className="text-muted">Location: </span>
                        <span className="text-dark">
                          {employeeInfo.work_location || "Kolkata"}
                        </span>
                      </Col>
                      <Col xs={6}>
                        <span className="text-muted">Dept: </span>
                        <span className="text-dark">
                          {employeeInfo.dept || "General"}
                        </span>
                      </Col>
                    </Row>
                  </div>

                  {/* Earnings (Only Non-Zero Items) */}
                  <div className="mb-3">
                    <div className="fw-bold text-success small mb-1">
                      Earnings
                    </div>
                    {viewEarningsItems.map((earn, i) => (
                      <div
                        key={i}
                        className="d-flex justify-content-between small text-muted mb-1"
                      >
                        <span>{earn.label}</span>
                        <span className="text-dark fw-medium">
                          {fmt(earn.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="d-flex justify-content-between small fw-bold text-dark pt-1 border-top mt-1">
                      <span>Total Earnings</span>
                      <span>{fmt(viewGrossTotal)}</span>
                    </div>
                  </div>

                  {/* Deductions (Only Non-Zero Items) */}
                  <div className="mb-3">
                    <div className="fw-bold text-danger small mb-1">
                      Deductions
                    </div>
                    {viewDeductionsItems.length === 0 ? (
                      <div className="small text-muted fst-italic">
                        No deductions applicable for this period.
                      </div>
                    ) : (
                      viewDeductionsItems.map((ded, i) => (
                        <div
                          key={i}
                          className="d-flex justify-content-between small text-muted mb-1"
                        >
                          <span>{ded.label}</span>
                          <span className="text-danger fw-medium">
                            {fmt(ded.amount)}
                          </span>
                        </div>
                      ))
                    )}
                    <div className="d-flex justify-content-between small fw-bold text-dark pt-1 border-top border-danger border-opacity-25 mt-1">
                      <span>Total Deductions</span>
                      <span className="text-danger">
                        {fmt(viewDeductionsTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Total Net Salary Highlight */}
                  <div className="d-flex justify-content-between align-items-baseline mb-2 pt-2 border-top">
                    <span className="fw-bold text-dark fs-6">
                      Net Salary In-Hand
                    </span>
                    <span className="fw-bold fs-3 text-success">
                      {fmt(viewNetSalary)}
                    </span>
                  </div>

                  <div className="small text-muted mb-4 fst-italic">
                    {numberToWords(viewNetSalary)}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-success"
                      className="flex-fill rounded-3 py-2 fw-semibold small bg-white border d-flex align-items-center justify-content-center gap-1"
                      onClick={generatePayslipExcel}
                      title="Export this employee's salary slip to Excel (.xlsx)"
                    >
                      <span>📊 Export Excel</span>
                    </Button>
                    <Button
                      variant="outline-secondary"
                      className="flex-fill rounded-3 py-2 fw-semibold small bg-white text-dark border d-flex align-items-center justify-content-center gap-1"
                      onClick={generatePayslipPDF}
                      title="Export this employee's salary slip to PDF (.pdf)"
                    >
                      <span>📄 Export PDF</span>
                    </Button>
                    <Button
                      className="flex-fill rounded-3 py-2 fw-semibold small text-white border-0"
                      style={{ background: "#4a2835" }}
                      disabled={savingPayroll}
                      onClick={() => handleFinalizePayroll("Finalized")}
                    >
                      {savingPayroll ? "Processing..." : "Pay Payroll"}
                    </Button>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* ══ MODAL 3: CUSTOMIZE WIDGET MODAL ══ */}
      {/* <Modal
        show={showCustomizeModal}
        onHide={() => setShowCustomizeModal(false)}
        centered
        size="sm"
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <Modal.Header closeButton className="border-bottom px-3 py-2.5">
          <Modal.Title className="fs-6 fw-bold">Customize Widgets</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <Form.Check
            type="switch"
            id="kpi-total-emp"
            label="Total Employee Card"
            defaultChecked
            className="mb-2 small"
          />
          <Form.Check
            type="switch"
            id="kpi-monthly-pay"
            label="Total Monthly Payroll Card"
            defaultChecked
            className="mb-2 small"
          />
          <Form.Check
            type="switch"
            id="kpi-comm-paid"
            label="Commission / Variable Paid Card"
            defaultChecked
            className="mb-2 small"
          />
          <Form.Check
            type="switch"
            id="kpi-up-payouts"
            label="Upcoming Payouts Card"
            defaultChecked
            className="mb-2 small"
          />
          <Form.Check
            type="switch"
            id="chart-history"
            label="12-Month History Spline Chart"
            defaultChecked
            className="small"
          />
        </Modal.Body>
        <Modal.Footer className="border-top px-3 py-2">
          <Button
            size="sm"
            className="w-100 text-white rounded-3 border-0"
            style={{ background: "#4a2835" }}
            onClick={() => setShowCustomizeModal(false)}
          >
            Apply Settings
          </Button>
        </Modal.Footer>
      </Modal> */}

      {/* ══ MODAL 4: TODAY'S ABSENCES MODAL ══ */}
      <Modal
        show={showAbsencesModal}
        onHide={() => setShowAbsencesModal(false)}
        centered
        size="md"
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <Modal.Header closeButton className="border-bottom px-4 py-3">
          <Modal.Title className="fs-6 fw-bold text-dark">
            📅 Today's Absences & Unpaid Status
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <div className="text-muted small mb-3">
            {overviewStats.totalEmployees - overviewStats.activeEmployees} of{" "}
            {overviewStats.totalEmployees} staff members are absent or on unpaid
            leave today.
          </div>
          <Table hover size="sm" className="mb-0 small align-middle">
            <thead className="table-light">
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees
                .filter(
                  (e) => (e.status || "Active").toLowerCase() !== "active"
                )
                .map((emp) => (
                  <tr key={emp.employee_code}>
                    <td>
                      <div className="fw-semibold text-dark">{emp.name}</div>
                      <div className="text-muted" style={{ fontSize: "11px" }}>
                        #{emp.employee_code}
                      </div>
                    </td>
                    <td>{emp.designation || emp.dept || "Staff"}</td>
                    <td>
                      <span className="badge bg-danger-subtle text-danger">
                        {emp.status || "Absent"}
                      </span>
                    </td>
                  </tr>
                ))}
              {employees.filter(
                (e) => (e.status || "Active").toLowerCase() !== "active"
              ).length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center text-muted py-3">
                      🎉 All staff members are currently active and present!
                    </td>
                  </tr>
                )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
      {/* ══════════════════════════════════════════════════════════
          FACILITIES & STATUTORY BENEFITS MODAL (ACCOUNTS / HR)
         ══════════════════════════════════════════════════════════ */}
      <Modal
        show={facilitiesModal.show}
        onHide={() => setFacilitiesModal((prev) => ({ ...prev, show: false }))}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header
          closeButton
          style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", color: "white" }}
        >
          <div className="w-100 d-flex justify-content-between align-items-center pe-3">
            <Modal.Title className="fs-5 d-flex align-items-center gap-2">
              <span>🏦</span> Facilities & Statutory Benefits
              {isAccountsUser ? (
                <Badge bg="primary" className="fw-normal px-2.5 py-1" style={{ fontSize: "11px" }}>
                  ⚡ Accounts Edit Mode
                </Badge>
              ) : (
                <Badge bg="secondary" className="fw-normal px-2.5 py-1" style={{ fontSize: "11px" }}>
                  🔒 HR View-Only Mode
                </Badge>
              )}
            </Modal.Title>
          </div>
        </Modal.Header>

        <Modal.Body className="p-3 p-md-4" style={{ backgroundColor: "#f8fafc" }}>
          {facilitiesModal.loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 small">Loading facilities data...</p>
            </div>
          ) : (
            (() => {
              const data = facilitiesModal.data || {};
              const enabled = data.facilities_enabled || { advance: true, loan: true, insurance: true, gratuity: true };
              const form = facilitiesModal.formData || {};
              const gross = data.gross_salary || 0;
              const basic = data.basic || 0;
              const tenure = data.tenure_years || 0;
              const isPerm = data.is_permanent !== false;

              // Statutory Gratuity calculations (Act 1972)
              const gratuityMonthly = isPerm && enabled.gratuity ? Math.round((basic * 15) / (26 * 12)) : 0;
              const gratuityTotal = isPerm && enabled.gratuity ? Math.round((15 * basic * tenure) / 26) : 0;

              // ESI vs Mediclaim check
              const threshold = form.esi_threshold || globalEsiThreshold || 21000;
              const isEsi = gross <= threshold;

              // Live total facilities deduction
              const totalFacDeductions =
                (enabled.advance ? (parseFloat(form.advance_deduction) || 0) : 0) +
                (enabled.loan ? (parseFloat(form.loan_emi) || 0) : 0) +
                (enabled.insurance ? (parseFloat(form.insurance_deduction) || 0) : 0) +
                (isEsi ? (parseFloat(form.esi_amount) || 0) : (parseFloat(form.mediclaim_amount) || 0));

              return (
                <>
                  {/* Employee & Access Header */}
                  <div className="bg-white p-3 rounded-3 shadow-xs border mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <h5 className="mb-0 fw-bold text-dark">{data.name || facilitiesModal.emp?.name}</h5>
                      <small className="text-muted">
                        Employee ID: <strong className="text-primary">#{data.employee_code || facilitiesModal.emp?.employee_code}</strong> • Type: <Badge bg={isPerm ? "success" : "warning"} className="fw-normal">{data.employment_type || "Permanent"}</Badge>
                      </small>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">Monthly Gross Salary</div>
                      <h5 className="mb-0 fw-bold text-success">{fmt(gross)}</h5>
                    </div>
                  </div>

                  {/* HR Enabled Facilities Bar */}
                  <div className="p-2.5 rounded-3 bg-white border shadow-xs mb-3">
                    <div className="small fw-semibold text-muted mb-1.5 d-flex align-items-center gap-1.5">
                      <span>⚙️ Facility Eligibility (Configured by HR):</span>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg={enabled.advance ? "success" : "secondary"} className="px-2.5 py-1.5 fw-normal">
                        {enabled.advance ? "✓ Advance Payment: Active" : "✕ Advance Payment: Disabled"}
                      </Badge>
                      <Badge bg={enabled.loan ? "success" : "secondary"} className="px-2.5 py-1.5 fw-normal">
                        {enabled.loan ? "✓ Company Loans: Active" : "✕ Company Loans: Disabled"}
                      </Badge>
                      <Badge bg={enabled.insurance ? "success" : "secondary"} className="px-2.5 py-1.5 fw-normal">
                        {enabled.insurance ? "✓ Group Insurance: Active" : "✕ Group Insurance: Disabled"}
                      </Badge>
                      <Badge bg={enabled.gratuity ? "success" : "secondary"} className="px-2.5 py-1.5 fw-normal">
                        {enabled.gratuity ? "✓ Gratuity: Active" : "✕ Gratuity: Disabled"}
                      </Badge>
                    </div>
                  </div>

                  {!isAccountsUser && (
                    <Alert variant="info" className="py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                      <span>🔒</span>
                      <div>
                        <strong>HR View-Only Mode:</strong> HR can view enabled facilities and calculation summaries. All modifications, calculations, and amount configurations are restricted to the Accounts Department.
                      </div>
                    </Alert>
                  )}

                  {/* Facilities Cards Grid */}
                  <Row className="g-3">
                    {/* 1. Advance Payment */}
                    <Col xs={12} md={6}>
                      <Card className="h-100 shadow-xs border-0">
                        <Card.Header className="bg-light py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                          <span className="text-primary">💳 Advance Payment</span>
                          <Badge bg={enabled.advance ? "info" : "secondary"} style={{ fontSize: "10px" }}>
                            {enabled.advance ? "Max ₹1 Lakh" : "Disabled by HR"}
                          </Badge>
                        </Card.Header>
                        <Card.Body className="p-3 bg-white">
                          <div className="text-muted small mb-2" style={{ fontSize: "11px" }}>
                            Salary advance granted to employee with monthly recovery.
                          </div>
                          <Row className="g-2">
                            <Col xs={6}>
                              <Form.Label className="small text-muted mb-1" style={{ fontSize: "11px" }}>Principal Advance</Form.Label>
                              <InputGroup size="sm">
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  max="100000"
                                  disabled={!isAccountsUser || !enabled.advance}
                                  value={form.advance_amount || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                    setFacilitiesModal((prev) => ({
                                      ...prev,
                                      formData: { ...prev.formData, advance_amount: val },
                                    }));
                                  }}
                                  placeholder="0.00"
                                />
                              </InputGroup>
                            </Col>
                            <Col xs={6}>
                              <Form.Label className="small text-muted mb-1" style={{ fontSize: "11px" }}>Monthly Recovery</Form.Label>
                              <InputGroup size="sm">
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  disabled={!isAccountsUser || !enabled.advance}
                                  value={form.advance_deduction || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                    setFacilitiesModal((prev) => ({
                                      ...prev,
                                      formData: { ...prev.formData, advance_deduction: val },
                                    }));
                                  }}
                                  placeholder="0.00"
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* 2. Company Loan */}
                    <Col xs={12} md={6}>
                      <Card className="h-100 shadow-xs border-0">
                        <Card.Header className="bg-light py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                          <span className="text-primary">🏦 Company Loan</span>
                          <Badge bg={enabled.loan ? "primary" : "secondary"} style={{ fontSize: "10px" }}>
                            {enabled.loan ? "₹1L – ₹10L" : "Disabled by HR"}
                          </Badge>
                        </Card.Header>
                        <Card.Body className="p-3 bg-white">
                          <div className="text-muted small mb-2" style={{ fontSize: "11px" }}>
                            Company sanctioned employee loan with monthly EMI deduction.
                          </div>
                          <Row className="g-2">
                            <Col xs={6}>
                              <Form.Label className="small text-muted mb-1" style={{ fontSize: "11px" }}>Loan Principal</Form.Label>
                              <InputGroup size="sm">
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  min="100000"
                                  max="1000000"
                                  disabled={!isAccountsUser || !enabled.loan}
                                  value={form.loan_amount || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                    setFacilitiesModal((prev) => ({
                                      ...prev,
                                      formData: { ...prev.formData, loan_amount: val },
                                    }));
                                  }}
                                  placeholder="0.00"
                                />
                              </InputGroup>
                            </Col>
                            <Col xs={6}>
                              <Form.Label className="small text-muted mb-1" style={{ fontSize: "11px" }}>Monthly EMI</Form.Label>
                              <InputGroup size="sm">
                                <InputGroup.Text>₹</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  disabled={!isAccountsUser || !enabled.loan}
                                  value={form.loan_emi || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                    setFacilitiesModal((prev) => ({
                                      ...prev,
                                      formData: { ...prev.formData, loan_emi: val },
                                    }));
                                  }}
                                  placeholder="0.00"
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* 3. Corporate Group Insurance */}
                    <Col xs={12} md={6}>
                      <Card className="h-100 shadow-xs border-0">
                        <Card.Header className="bg-light py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                          <span className="text-primary">🛡️ Group Insurance</span>
                          <Badge bg={enabled.insurance ? "success" : "secondary"} style={{ fontSize: "10px" }}>
                            {enabled.insurance ? "Active" : "Disabled by HR"}
                          </Badge>
                        </Card.Header>
                        <Card.Body className="p-3 bg-white">
                          <div className="text-muted small mb-2" style={{ fontSize: "11px" }}>
                            Monthly premium deduction for corporate health and life insurance.
                          </div>
                          <div>
                            <Form.Label className="small text-muted mb-1" style={{ fontSize: "11px" }}>Monthly Premium Deduction</Form.Label>
                            <InputGroup size="sm">
                              <InputGroup.Text>₹</InputGroup.Text>
                              <Form.Control
                                type="number"
                                min="0"
                                disabled={!isAccountsUser || !enabled.insurance}
                                value={form.insurance_deduction || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                  setFacilitiesModal((prev) => ({
                                    ...prev,
                                    formData: { ...prev.formData, insurance_deduction: val },
                                  }));
                                }}
                                placeholder="0.00"
                              />
                            </InputGroup>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* 4. Gratuity (Act 1972) */}
                    <Col xs={12} md={6}>
                      <Card className="h-100 shadow-xs border-0">
                        <Card.Header className="bg-light py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                          <span className="text-primary">📜 Gratuity (Act 1972)</span>
                          <Badge bg={enabled.gratuity ? "secondary" : "secondary"} style={{ fontSize: "10px" }}>
                            {enabled.gratuity ? "Statutory CTC" : "Disabled by HR"}
                          </Badge>
                        </Card.Header>
                        <Card.Body className="p-3 bg-white">
                          <div className="text-muted small mb-2" style={{ fontSize: "11px" }}>
                            Formula: (15 × Basic) / (26 × 12) • Tenure: {tenure} years.
                          </div>
                          <Row className="g-2 pt-1">
                            <Col xs={6}>
                              <div className="small text-muted" style={{ fontSize: "11px" }}>Monthly Accrual:</div>
                              <div className="fw-bold text-success fs-6 mt-0.5">{fmt(gratuityMonthly)}</div>
                            </Col>
                            <Col xs={6}>
                              <div className="small text-muted" style={{ fontSize: "11px" }}>Total Entitlement:</div>
                              <div className="fw-bold text-dark fs-6 mt-0.5">{fmt(gratuityTotal)}</div>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* 5. Statutory ESI & Corporate Mediclaim */}
                    <Col xs={12}>
                      <Card className="shadow-xs border-0">
                        <Card.Header className="bg-light py-2 px-3 fw-bold small d-flex justify-content-between align-items-center">
                          <span className="text-primary">🏥 Statutory ESI & Corporate Mediclaim Benefit</span>
                          <Badge bg={isEsi ? "info" : "primary"} style={{ fontSize: "10px" }}>
                            {isEsi ? "Subject to ESI (Gross ≤ ₹" + threshold.toLocaleString("en-IN") + ")" : "Subject to Mediclaim (Gross > ₹" + threshold.toLocaleString("en-IN") + ")"}
                          </Badge>
                        </Card.Header>
                        <Card.Body className="p-3 bg-white">
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom">
                            <div>
                              <span className="small text-muted">Applicable Cutoff Slab: </span>
                              <strong className="text-dark">₹{threshold.toLocaleString("en-IN")}</strong>
                              <small className="text-muted ms-2">({form.use_global_esi ? "Global Standard Slab" : "Employee Custom Slab"})</small>
                            </div>
                            <div className="small text-muted">
                              Current Gross: <strong className="text-dark">{fmt(gross)}</strong>
                            </div>
                          </div>

                          <Row className="g-3">
                            <Col xs={12} md={6}>
                              <div className={`p-2.5 rounded border ${isEsi ? "bg-light-subtle border-primary" : "bg-light opacity-75"}`}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="small fw-semibold">Employee State Insurance (ESI - 0.75%)</span>
                                  {isEsi && <Badge bg="success" style={{ fontSize: "9px" }}>Active</Badge>}
                                </div>
                                <InputGroup size="sm">
                                  <InputGroup.Text>₹</InputGroup.Text>
                                  <Form.Control
                                    type="number"
                                    min="0"
                                    disabled={!isAccountsUser || !isEsi}
                                    value={form.esi_amount || ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                      setFacilitiesModal((prev) => ({
                                        ...prev,
                                        formData: { ...prev.formData, esi_amount: val },
                                      }));
                                    }}
                                    placeholder={isEsi ? Math.round(gross * 0.0075) : "0"}
                                  />
                                </InputGroup>
                                <small className="text-muted mt-0.5 d-block" style={{ fontSize: "10px" }}>
                                  Applies when total monthly gross is ₹{threshold.toLocaleString("en-IN")} or less.
                                </small>
                              </div>
                            </Col>

                            <Col xs={12} md={6}>
                              <div className={`p-2.5 rounded border ${!isEsi ? "bg-light-subtle border-primary" : "bg-light opacity-75"}`}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="small fw-semibold">Corporate Health Mediclaim</span>
                                  {!isEsi && <Badge bg="primary" style={{ fontSize: "9px" }}>Active</Badge>}
                                </div>
                                <InputGroup size="sm">
                                  <InputGroup.Text>₹</InputGroup.Text>
                                  <Form.Control
                                    type="number"
                                    min="0"
                                    disabled={!isAccountsUser || isEsi}
                                    value={form.mediclaim_amount || ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? "" : parseFloat(e.target.value) || 0;
                                      setFacilitiesModal((prev) => ({
                                        ...prev,
                                        formData: { ...prev.formData, mediclaim_amount: val },
                                      }));
                                    }}
                                    placeholder={!isEsi ? (gross > 25000 ? 750 : 500) : "0"}
                                  />
                                </InputGroup>
                                <small className="text-muted mt-0.5 d-block" style={{ fontSize: "10px" }}>
                                  Applies when total monthly gross is above ₹{threshold.toLocaleString("en-IN")}.
                                </small>
                              </div>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Summary Bar */}
                  <div
                    className="mt-3 p-3 rounded-3 text-white d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
                    style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}
                  >
                    <div>
                      <span className="small text-uppercase opacity-75 fw-semibold d-block">
                        Total Facilities Deductions
                      </span>
                      <small className="opacity-90">
                        Advance ({fmt(form.advance_deduction)}) + Loan ({fmt(form.loan_emi)}) + Ins ({fmt(form.insurance_deduction)}) + {isEsi ? "ESI" : "Mediclaim"} ({fmt(isEsi ? form.esi_amount : form.mediclaim_amount)})
                      </small>
                    </div>
                    <h3 className="fw-bold mb-0 text-danger">{fmt(totalFacDeductions)}</h3>
                  </div>
                </>
              );
            })()
          )}
        </Modal.Body>

        <Modal.Footer className="bg-white border-top px-4 py-2.5">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3"
            onClick={() => setFacilitiesModal((prev) => ({ ...prev, show: false }))}
          >
            Close
          </Button>
          {isAccountsUser ? (
            <Button
              size="sm"
              variant="primary"
              className="rounded-3 px-3 fw-semibold shadow-xs"
              onClick={handleSaveFacilities}
              disabled={facilitiesModal.saving || facilitiesModal.loading}
            >
              {facilitiesModal.saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1.5" />
                  Saving...
                </>
              ) : (
                "Save & Apply to Payroll"
              )}
            </Button>
          ) : (
            <span className="text-muted small">
              🔒 View-only mode for HR
            </span>
          )}
        </Modal.Footer>
      </Modal>

      {/* ══ DETAILED ESI SLAB CONFIGURATION & STATUTORY AUDIT MODAL ══ */}
      <EsiSlabAuditModal
        show={showEsiAuditModal}
        onHide={() => setShowEsiAuditModal(false)}
        canEdit={isAccountsUser || isHRUser}
        role={userRole}
        onSaved={async (newThresh) => {
          if (newThresh) setGlobalEsiThreshold(newThresh);
          const refreshCode = selectedEmpCode ? selectedEmpCode.toString().replace(/^#/, "").trim() : "";
          await fetchEmployees(refreshCode);
          await fetchAllPayrolls();
          if (refreshCode) {
            await fetchPayrollData(refreshCode, currentMonthYear);
          }
        }}
      />

      {/* ══ ASSIGN COMPANY & LOCATION MODAL ══ */}
      <Modal
        show={showCompanyAssignModal}
        onHide={() => setShowCompanyAssignModal(false)}
        centered
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <Modal.Header closeButton className="px-4 py-3 bg-light border-bottom">
          <Modal.Title className="fs-6 fw-bold text-dark d-flex align-items-center gap-2">
            <span>🏢</span> Allocate Corporate Entity & Work Location
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {assignModalData.employee && (
            <div className="mb-3 p-3 bg-light rounded-3 d-flex align-items-center gap-3">
              {renderAvatar(assignModalData.employee, 40)}
              <div>
                <div className="fw-bold text-dark">{assignModalData.employee.name}</div>
                <div className="text-muted small">
                  #{assignModalData.employee.employee_code} • {assignModalData.employee.designation || assignModalData.employee.dept || "Staff"}
                </div>
              </div>
            </div>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-secondary">
                Parent Group Organization
              </Form.Label>
              <Form.Control
                type="text"
                value={assignModalData.group_name}
                onChange={(e) =>
                  setAssignModalData((prev) => ({ ...prev, group_name: e.target.value }))
                }
                placeholder="e.g. TATA Company"
              />
              <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                Master conglomerate/parent holding company name.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-secondary">
                Company / Subsidiary Unit
              </Form.Label>
              <Form.Control
                type="text"
                value={assignModalData.company_name}
                onChange={(e) =>
                  setAssignModalData((prev) => ({ ...prev, company_name: e.target.value }))
                }
                placeholder="e.g. TATA Steel, TATA Motors, TCS, TATA Power"
              />
              <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                The legal operating subsidiary company for salary disbursement & slips.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-secondary">
                Work Location / Branch City
              </Form.Label>
              <Form.Control
                type="text"
                value={assignModalData.work_location}
                onChange={(e) =>
                  setAssignModalData((prev) => ({ ...prev, work_location: e.target.value }))
                }
                placeholder="e.g. Kolkata, Mumbai, Pune, Jamshedpur"
              />
              <Form.Text className="text-muted" style={{ fontSize: "11px" }}>
                Specific branch/plant/office work location city.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="px-4 py-2.5 bg-light border-top">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3"
            onClick={() => setShowCompanyAssignModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-3 px-4 fw-semibold"
            onClick={handleSaveCompanyAssignment}
          >
            Save Allocation
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default PayrollManagement;