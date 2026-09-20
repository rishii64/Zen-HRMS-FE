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
} from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getApiBaseUrl, getUploadUrl } from "../../api/axios";

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
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [hoveredChartMonth, setHoveredChartMonth] = useState(
    new Date().getMonth()
  );

  // Modals state
  const [showPayrollDetailsModal, setShowPayrollDetailsModal] = useState(false);
  const [showEditStructureModal, setShowEditStructureModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showAbsencesModal, setShowAbsencesModal] = useState(false);

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
    da: 0,
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

  // Month-Year formatted string
  const currentMonthYear = `${selectedMonth} ${selectedYear}`;

  // 1. Initial Load: fetch employee list & all payroll records
  useEffect(() => {
    fetchEmployees();
    fetchAllPayrolls();
  }, []);

  const fetchEmployees = async (codeToPreserve = null) => {
    setLoadingEmployees(true);
    try {
      const res = await fetch(`${API}/employees`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setEmployees(data.data);
        const preferred =
          isRegularEmployee && loggedInEmpCode
            ? loggedInEmpCode
            : codeToPreserve || selectedEmpCode;

        const match = data.data.find(
          (emp) =>
            String(emp.employee_code || "").toLowerCase() ===
            preferred.toLowerCase()
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
      const res = await fetch(`${API}/payroll/all`);
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
      const res = await fetch(
        `${API}/payroll/data/${empCode}?month=${encodeURIComponent(
          monthYearStr
        )}`
      );
      const data = await res.json();

      if (data.success) {
        const emp = data.employee;
        setEmployeeInfo({
          name: emp.name || "Staff",
          employee_code: emp.employee_code || empCode,
          dept: emp.dept || "General",
          designation: emp.designation || "Staff",
          email: emp.email || "",
          joining_date: emp.joining_date || "2025-01-01",
          bank_details: emp.bank_details || {},
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
            da: fpSource.da || 0,
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
          setAttendance({
            total_days:
              sp.attendance_summary?.total_days ||
              (data.defaults?.attendance_summary?.total_days || 30),
            working_days:
              sp.attendance_summary?.working_days ||
              (data.defaults?.attendance_summary?.working_days || 26),
            present_days:
              sp.attendance_summary?.present_days ??
              (data.defaults?.attendance_summary?.present_days ?? 24),
            late_days:
              sp.attendance_summary?.late_days ??
              (data.defaults?.attendance_summary?.late_days ?? 0),
            paid_leaves: sp.attendance_summary?.paid_leaves || 0,
            lop_days:
              sp.attendance_summary?.lop_days ??
              (data.defaults?.attendance_summary?.lop_days ?? 0),
            overtime_hours:
              sp.attendance_summary?.overtime_hours ??
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
            da: fp.da || 0,
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
          setAttendance({
            total_days: df.attendance_summary?.total_days || 30,
            working_days: df.attendance_summary?.working_days || 26,
            present_days: df.attendance_summary?.present_days ?? 24,
            late_days: df.attendance_summary?.late_days ?? 0,
            paid_leaves: 0,
            lop_days: df.attendance_summary?.lop_days || 0,
            overtime_hours: df.attendance_summary?.overtime_hours || 0,
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
            pt: fp.pt ?? (df.statutory_deductions?.pt || 200),
            others: 0,
          });
          setPayrollStatus("Draft");
          if (data.shift_timing) {
            setShiftTiming(data.shift_timing);
          }
        }
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

      basePay = parseFloat(fp.total_fixed || fp.basic || 0) || 0;
      commission =
        parseFloat(
          vp.total_variable ||
          (parseFloat(vp.bonus || 0) +
            parseFloat(vp.overtime || 0) +
            parseFloat(vp.incentive || 0))
        ) || 0;
      totalPayout = parseFloat(saved.net_salary || saved.gross_pay || 0) || 0;
      isPaid = saved.status === "Finalized";
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
          basePay =
            (parseFloat(e.basic) || 0) +
            (parseFloat(e.da) || 0) +
            (parseFloat(e.hra) || 0) +
            (parseFloat(e.conveyance) || 0) +
            (parseFloat(e.medical) || 0) +
            (parseFloat(e.allowance) || 0);
          commission = 0;
          const totalDeds =
            (parseFloat(d.professional_tax) || 0) +
            (parseFloat(d.income_tax) || 0) +
            (parseFloat(d.pf) || 0) +
            (parseFloat(d.esi) || 0) +
            (parseFloat(d.tds) || 0) +
            (parseFloat(d.lop) || 0);
          totalPayout =
            parseFloat(ss?.net_salary) ||
            Math.max(0, basePay - totalDeds) ||
            parseFloat(ss?.gross_salary) ||
            curSal;
        } catch {
          basePay = Math.round(curSal * 0.85);
          commission = 0;
          totalPayout = curSal;
        }
      } else {
        basePay = Math.round(curSal * 0.85);
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

      const matchSearch =
        !search ||
        empName.includes(search) ||
        empCode.includes(search) ||
        dept.includes(search) ||
        desig.includes(search);

      const metrics = getEmployeeRowData(emp, currentMonthYear);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && metrics.isPaid) ||
        (statusFilter === "unpaid" && !metrics.isPaid);

      return matchSearch && matchStatus;
    });
  }, [employees, allPayrolls, tableSearch, statusFilter, currentMonthYear]);

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

    // Initial populate from cached employee object
    setEditStructureData({
      basic: earnings.basic != null ? parseFloat(earnings.basic) : Math.round(curSal * 0.4),
      da: earnings.da != null ? parseFloat(earnings.da) : Math.round(curSal * 0.1),
      hra: earnings.hra != null ? parseFloat(earnings.hra) : Math.round(curSal * 0.2),
      allowance: earnings.allowance != null ? parseFloat(earnings.allowance) : Math.round(curSal * 0.1),
      conveyance: earnings.conveyance != null ? parseFloat(earnings.conveyance) : 1600,
      medical: earnings.medical != null ? parseFloat(earnings.medical) : 1250,
      professional_tax: deductions.professional_tax != null ? parseFloat(deductions.professional_tax) : 200,
      income_tax: deductions.income_tax != null ? parseFloat(deductions.income_tax) : 0,
      pf:
        deductions.pf != null
          ? parseFloat(deductions.pf)
          : Math.round((earnings.basic != null ? parseFloat(earnings.basic) : curSal * 0.4) * 0.12),
      esi: deductions.esi != null ? parseFloat(deductions.esi) : 0,
      tds: deductions.tds != null ? parseFloat(deductions.tds) : 0,
      lop: deductions.lop != null ? parseFloat(deductions.lop) : 0,
    });

    // Fetch live real-time salary structure from database
    try {
      const empId = emp.employee_code || emp.id;
      const res = await fetch(`${API}/employees/${empId}/salary`);
      const data = await res.json();
      if (data.success && data.salary) {
        const liveEarnings = data.salary.earnings || {};
        const liveDeductions = data.salary.deductions || {};
        setEditStructureData({
          basic: liveEarnings.basic != null ? parseFloat(liveEarnings.basic) : 0,
          da: liveEarnings.da != null ? parseFloat(liveEarnings.da) : 0,
          hra: liveEarnings.hra != null ? parseFloat(liveEarnings.hra) : 0,
          allowance: liveEarnings.allowance != null ? parseFloat(liveEarnings.allowance) : 0,
          conveyance: liveEarnings.conveyance != null ? parseFloat(liveEarnings.conveyance) : 0,
          medical: liveEarnings.medical != null ? parseFloat(liveEarnings.medical) : 0,
          professional_tax: liveDeductions.professional_tax != null ? parseFloat(liveDeductions.professional_tax) : 0,
          income_tax: liveDeductions.income_tax != null ? parseFloat(liveDeductions.income_tax) : 0,
          pf: liveDeductions.pf != null ? parseFloat(liveDeductions.pf) : 0,
          esi: liveDeductions.esi != null ? parseFloat(liveDeductions.esi) : 0,
          tds: liveDeductions.tds != null ? parseFloat(liveDeductions.tds) : 0,
          lop: liveDeductions.lop != null ? parseFloat(liveDeductions.lop) : 0,
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
      (parseFloat(editStructureData.da) || 0) +
      (parseFloat(editStructureData.hra) || 0) +
      (parseFloat(editStructureData.conveyance) || 0) +
      (parseFloat(editStructureData.medical) || 0) +
      (parseFloat(editStructureData.allowance) || 0)
    );
  }, [editStructureData]);

  const computedEditDeductions = useMemo(() => {
    return (
      (parseFloat(editStructureData.professional_tax) || 0) +
      (parseFloat(editStructureData.income_tax) || 0) +
      (parseFloat(editStructureData.pf) || 0) +
      (parseFloat(editStructureData.esi) || 0) +
      (parseFloat(editStructureData.tds) || 0) +
      (parseFloat(editStructureData.lop) || 0)
    );
  }, [editStructureData]);

  const computedEditNet = useMemo(() => {
    return Math.max(0, computedEditGross - computedEditDeductions);
  }, [computedEditGross, computedEditDeductions]);

  // Save Salary Structure via API
  const handleSaveSalaryStructure = async () => {
    if (!editingEmp) return;
    setSavingStructure(true);
    try {
      const empId = editingEmp.employee_code || editingEmp.id;
      const userRole = (localStorage.getItem("role") || "admin").toLowerCase();
      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/employees/${empId}/salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          role: userRole || "admin",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...editStructureData,
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
        await fetchEmployees(editingEmp.employee_code);
        await fetchAllPayrolls();
        if (selectedEmpCode === editingEmp.employee_code) {
          await fetchPayrollData(selectedEmpCode, currentMonthYear);
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
      (parseFloat(fixedPay.da) || 0) +
      (parseFloat(fixedPay.hra) || 0) +
      (parseFloat(fixedPay.conveyance) || 0) +
      (parseFloat(fixedPay.medical) || 0) +
      (parseFloat(fixedPay.allowance) || 0);

    const lopCalc =
      attendance.lop_days > 0
        ? Math.round((grossCalc / (attendance.total_days || 30)) * attendance.lop_days)
        : 0;

    const deductionsCalc =
      (parseFloat(statutory.pf) || 0) +
      (parseFloat(statutory.esi) || 0) +
      (parseFloat(statutory.pt) || 0) +
      (parseFloat(taxData.tds) || 0) +
      lopCalc;

    const netCalc = Math.max(0, grossCalc - deductionsCalc);

    const payload = {
      employee_id: selectedEmpCode,
      month_year: currentMonthYear,
      fixed_pay: {
        basic: parseFloat(fixedPay.basic) || 0,
        da: parseFloat(fixedPay.da) || 0,
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

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ZENTELEX IT SOLUTIONS PRIVATE LIMITED", 105, 12, {
      align: "center",
    });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Reg. Office: Kolkata, West Bengal, India | Confidential Employee Pay Slip",
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
        { content: "Designation:", styles: { fontStyle: "bold" } },
        employeeInfo.designation || "Staff",
        { content: "Department:", styles: { fontStyle: "bold" } },
        employeeInfo.dept || "General",
      ],
      [
        { content: "Joining Date:", styles: { fontStyle: "bold" } },
        employeeInfo.joining_date || "2025-01-01",
        { content: "Pay Status:", styles: { fontStyle: "bold" } },
        payrollStatus === "Finalized" ? "PAID" : "UNPAID",
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
            (parseFloat(fixedPay.da) || 0) +
            (parseFloat(fixedPay.hra) || 0)) /
            (attendance.total_days || 30)) *
          attendance.lop_days
        )
        : 0;

    // Filter positive earnings only
    const earningsList = [
      { label: "Basic Salary", amount: parseFloat(fixedPay.basic) || 0 },
      { label: "Dearness Allowance (DA)", amount: parseFloat(fixedPay.da) || 0 },
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

    // Filter positive deductions only
    const deductionsList = [
      { label: "Provident Fund (PF)", amount: parseFloat(statutory.pf) || 0 },
      {
        label: "Employee State Insurance (ESI)",
        amount: parseFloat(statutory.esi) || 0,
      },
      { label: "Professional Tax (PT)", amount: parseFloat(statutory.pt) || 0 },
      { label: "TDS / Income Tax", amount: parseFloat(taxData.tds) || 0 },
      { label: "Loss of Pay (LOP)", amount: lopCalc },
    ].filter((item) => item.amount > 0);

    const totalGross = earningsList.reduce((acc, it) => acc + it.amount, 0);
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

    // 5. Net Salary Payable Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, finalY + 8, 182, 18, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("NET SALARY PAYABLE:", 22, finalY + 19);

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

  // Export summary table as PDF
  const generateSummaryPDF = () => {
    const doc = new jsPDF("landscape");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`Payroll Summary - ${selectedMonth} ${selectedYear}`, 14, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-IN")} | Zentelex HRMS`,
      14,
      25
    );

    const rows = (Array.isArray(employees) ? employees : []).map((emp) => {
      const m = getEmployeeRowData(emp, currentMonthYear);
      return [
        emp?.employee_code || "",
        emp?.name || "",
        emp?.designation || emp?.dept || "Staff",
        formatPdfNum(m.basePay),
        formatPdfNum(m.totalPayout),
        m.isPaid ? "Paid" : "Unpaid",
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Emp Code",
          "Staff Member",
          "Role",
          "Base Pay (INR)",
          "Total Payout (INR)",
          "Status",
        ],
      ],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: [74, 40, 53],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });

    doc.save(`Payroll_Summary_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Calculate non-zero view breakdown items for View Modal
  const viewEarningsItems = useMemo(() => {
    return [
      { label: "Basic Salary", amount: parseFloat(fixedPay.basic) || 0, type: "Base" },
      { label: "Dearness Allowance (DA)", amount: parseFloat(fixedPay.da) || 0, type: "Base" },
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

  const viewDeductionsItems = useMemo(() => {
    const lopCalc =
      attendance.lop_days > 0
        ? Math.round(
          (((parseFloat(fixedPay.basic) || 0) +
            (parseFloat(fixedPay.da) || 0) +
            (parseFloat(fixedPay.hra) || 0)) /
            (attendance.total_days || 30)) *
          attendance.lop_days
        )
        : 0;

    return [
      { label: "Provident Fund (PF)", amount: parseFloat(statutory.pf) || 0 },
      { label: "Employee State Insurance (ESI)", amount: parseFloat(statutory.esi) || 0 },
      { label: "Professional Tax (PT)", amount: parseFloat(statutory.pt) || 0 },
      { label: "TDS / Income Tax", amount: parseFloat(taxData.tds) || 0 },
      { label: "Loss of Pay (LOP)", amount: lopCalc },
      { label: "Other Deductions", amount: parseFloat(statutory.others) || 0 },
    ].filter((it) => it.amount > 0);
  }, [statutory, taxData, attendance, fixedPay]);

  const viewGrossTotal = viewEarningsItems.reduce((acc, it) => acc + it.amount, 0);
  const viewDeductionsTotal = viewDeductionsItems.reduce((acc, it) => acc + it.amount, 0);
  const viewNetSalary = Math.max(0, viewGrossTotal - viewDeductionsTotal);

  // ══ REGULAR EMPLOYEE VIEW: SHOW SALARY STRUCTURE ══
  if (isRegularEmployee) {
    return (
      <div className="container-fluid max-w-6xl mt-3 mt-md-4 pb-5 px-2 px-md-4">
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
                  <span className="text-muted">Dearness Allowance (DA)</span>
                  <span className="fw-semibold text-dark">{fmt(fixedPay.da)}</span>
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
                  <span className="text-muted">Employee State Insurance (ESI)</span>
                  <span className="fw-semibold text-danger">{fmt(statutory.esi)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Professional Tax (PT)</span>
                  <span className="fw-semibold text-danger">{fmt(statutory.pt)}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">TDS / Income Tax (IT)</span>
                  <span className="fw-semibold text-danger">
                    {fmt(parseFloat(taxData.tds) + parseFloat(taxData.other_tax || 0))}
                  </span>
                </div>
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


      </div>
    );
  }

  return (
    <div className="container-fluid max-w-6xl mt-3 mt-md-4 pb-5 px-2 px-md-4">
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
          {/* Export PDF Button */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs text-dark border"
            onClick={generateSummaryPDF}
            title="Export Monthly Payroll Summary PDF"
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
            <span>Export</span>
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

          {/* Customize Widget Button (Burgundy matching image) */}
          <Button
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
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
          <h5 className="fw-bold mb-0 text-dark">Employee Pay Details</h5>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Search Input */}
            <div
              className="d-flex align-items-center bg-light border rounded-pill px-3 py-1"
              style={{ width: "220px" }}
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
                placeholder="Search"
                className="border-0 bg-transparent ps-2 small text-dark shadow-none w-100"
                style={{ outline: "none", fontSize: "13px" }}
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>

            {/* Filter Dropdown with Options */}
            <Dropdown>
              <Dropdown.Toggle
                variant="light"
                size="sm"
                className="border rounded-pill px-3 py-1.5 fw-medium d-flex align-items-center gap-1.5 text-secondary bg-white shadow-xs"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <span>
                  Filter:{" "}
                  {statusFilter === "all"
                    ? "All"
                    : statusFilter === "paid"
                      ? "Paid"
                      : "Unpaid"}
                </span>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-1">
                <Dropdown.Item
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                >
                  All Employees
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

            {/* + Add Employee Button (Burgundy matching image) */}
            <Button
              size="sm"
              className="text-white rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1 border-0 shadow-xs"
              style={{ background: "#4a2835" }}
              onClick={() => {
                window.location.href = "/admin/manage-employee";
              }}
            >
              <span>+</span>
              <span>Add Employee</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <Table
            hover
            className="align-middle mb-0"
            style={{ borderColor: "#f1f5f9" }}
          >
            <thead>
              <tr
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <th style={{ width: "36px" }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={
                      Array.isArray(employees) &&
                      employees.length > 0 &&
                      selectedEmployees.size === employees.length
                    }
                    onChange={() => {
                      if (
                        Array.isArray(employees) &&
                        selectedEmployees.size === employees.length
                      ) {
                        setSelectedEmployees(new Set());
                      } else {
                        setSelectedEmployees(
                          new Set(
                            (Array.isArray(employees) ? employees : [])
                              .filter((e) => e && e.employee_code)
                              .map((e) => e.employee_code)
                          )
                        );
                      }
                    }}
                  />
                </th>
                <th>Staff member</th>
                <th>Role</th>
                <th>Base Pay</th>
                {/* Commission column is removed as requested */}
                <th>Total Payout</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    {loadingEmployees
                      ? "Loading employees..."
                      : "No employee payroll records match the criteria."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
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
                          {/* Trash Icon: Reset / Clear */}
                          <button
                            className="btn btn-sm btn-link p-1 text-muted opacity-75"
                            title="Reset / clear draft"
                            onClick={() => {
                              setSelectedEmployees((prev) => {
                                const next = new Set(prev);
                                next.delete(emp.employee_code);
                                return next;
                              });
                              setAlertMsg({
                                type: "info",
                                text: `Employee ${emp.name} selection cleared.`,
                              });
                            }}
                          >
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>

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
          <button
            className="btn btn-sm btn-light border rounded p-1"
            onClick={() => setShowEditStructureModal(false)}
          >
            ✕
          </button>
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
                    Dearness Allowance (DA)
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.da === 0 ? 0 : (editStructureData.da ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        da: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
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

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">
                    Employee State Insurance (ESI)
                  </label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="fw-semibold"
                    value={editStructureData.esi === 0 ? 0 : (editStructureData.esi ?? "")}
                    onChange={(e) =>
                      setEditStructureData({
                        ...editStructureData,
                        esi: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0),
                      })
                    }
                  />
                </div>

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
                    <div className="d-flex align-items-center gap-2 mt-1">
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
                        {attendance.overtime_hours || (variablePay.overtime_hours > 0 ? variablePay.overtime_hours : 0)}
                      </span>{" "}
                      <span className="small">hrs</span>
                    </div>
                  </div>
                </Col>
              </Row>

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
                        <h5 className="fw-bold text-dark mb-0">Payroll Slip</h5>
                        <div
                          className="text-muted small"
                          style={{ fontSize: "12px" }}
                        >
                          Zentelex IT Solutions Pvt. Ltd.
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
                        <span className="text-muted">Role: </span>
                        <span className="text-dark">
                          {employeeInfo.designation || "Staff"}
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
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      className="w-50 rounded-3 py-2 fw-semibold small bg-white text-dark border"
                      onClick={generatePayslipPDF}
                    >
                      Export PDF
                    </Button>
                    <Button
                      className="w-50 rounded-3 py-2 fw-semibold small text-white border-0"
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
      <Modal
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
      </Modal>

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
    </div>
  );
};

export default PayrollManagement;