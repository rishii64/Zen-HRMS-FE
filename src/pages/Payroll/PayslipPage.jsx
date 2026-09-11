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

const API = "http://localhost:5001/api/auth";

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [viewMode, setViewMode] = useState("split"); // 'split' | 'table'

  // 1. Initial Load: Fetch all employees & all payroll records
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingEmployees(true);
    try {
      const [empRes, payRes] = await Promise.all([
        fetch(`${API}/employees`),
        fetch(`${API}/payroll/all`),
      ]);
      const empJson = await empRes.json();
      const payJson = await payRes.json();

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
        setSelectedEmpCode(loggedInEmpCode);
      } else if (empList.length > 0) {
        // If url has ?code=..., select that
        const params = new URLSearchParams(location.search);
        const codeParam = params.get("code");
        if (codeParam && empList.some((e) => e.employee_code === codeParam)) {
          setSelectedEmpCode(codeParam);
        } else {
          setSelectedEmpCode(empList[0].employee_code);
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
      const res = await fetch(
        `${API}/payroll/data/${empCode}?month=${encodeURIComponent(monthYear)}`
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
    return (
      employees.find(
        (e) =>
          String(e.employee_code || "").toLowerCase() ===
          selectedEmpCode.toLowerCase()
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
    const isFinal = sp && sp.status === "Finalized";
    const fp = isFinal
      ? sp.fixed_pay || {}
      : payrollData.latest_salary_structure || payrollData.defaults?.fixed_pay || {};
    const vp = sp ? sp.variable_pay || {} : payrollData.defaults?.variable_pay || {};
    const att = isFinal
      ? sp.attendance_summary || {}
      : payrollData.defaults?.attendance_summary || {};
    const tax = isFinal
      ? sp.tax_deductions || {}
      : payrollData.defaults?.tax_deductions || {};
    const stat = isFinal
      ? sp.statutory_deductions || {}
      : payrollData.defaults?.statutory_deductions || {};

    const effectiveOT =
      (parseFloat(vp.overtime) || 0) > 0
        ? parseFloat(vp.overtime)
        : (parseFloat(vp.overtime_hours) || 0) * (parseFloat(vp.overtime_rate) || 0);

    const lopCalc =
      (parseFloat(att.lop_days) || 0) > 0
        ? Math.round(
          (((parseFloat(fp.basic) || 0) +
            (parseFloat(fp.da) || 0) +
            (parseFloat(fp.hra) || 0)) /
            (att.total_days || 30)) *
          parseFloat(att.lop_days)
        )
        : isFinal
          ? parseFloat(sp.lop_deduction) || 0
          : 0;

    const earnings = [
      { label: "Basic Salary", amount: parseFloat(fp.basic) || 0 },
      { label: "Dearness Allowance (DA)", amount: parseFloat(fp.da) || 0 },
      { label: "House Rent Allowance (HRA)", amount: parseFloat(fp.hra) || 0 },
      { label: "Conveyance Allowance", amount: parseFloat(fp.conveyance) || 0 },
      { label: "Medical Allowance", amount: parseFloat(fp.medical) || 0 },
      { label: "Special Allowance", amount: parseFloat(fp.allowance) || 0 },
      { label: "Performance Bonus", amount: parseFloat(vp.bonus) || 0 },
      { label: "Overtime Pay", amount: effectiveOT },
      { label: "Incentive", amount: parseFloat(vp.incentive) || 0 },
      { label: "Reimbursement", amount: parseFloat(vp.reimbursement) || 0 },
    ].filter((item) => item.amount > 0);

    const deductions = [
      { label: "Provident Fund (PF)", amount: parseFloat(stat.pf) || 0 },
      { label: "Employee State Insurance (ESI)", amount: parseFloat(stat.esi) || 0 },
      { label: "Professional Tax (PT)", amount: parseFloat(stat.pt) || 0 },
      {
        label: "TDS / Income Tax",
        amount: (parseFloat(tax.tds) || 0) + (parseFloat(tax.other_tax) || 0),
      },
      { label: "Loss of Pay (LOP)", amount: lopCalc },
      { label: "Other Deductions", amount: parseFloat(stat.others) || 0 },
    ].filter((item) => item.amount > 0);

    const gross = earnings.reduce((acc, it) => acc + it.amount, 0);
    const totalDeds = deductions.reduce((acc, it) => acc + it.amount, 0);
    const net = Math.max(0, gross - totalDeds);
    const status = isFinal ? "Finalized" : "Unpaid";

    return {
      earnings,
      deductions,
      gross,
      totalDeds,
      net,
      status,
      attendance: att,
    };
  }, [payrollData]);

  // Generate Professional PDF Payslip
  const handleDownloadPDF = () => {
    if (!payrollData || !payrollData.employee) return;
    const emp = payrollData.employee;
    const doc = new jsPDF();

    // 1. Corporate Header Banner
    doc.setFillColor(74, 40, 53); // Deep Burgundy
    doc.rect(0, 0, 210, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("ZENTELEX IT SOLUTIONS PRIVATE LIMITED", 105, 12, {
      align: "center",
    });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Corporate Office: Kolkata, West Bengal, India | Employee Pay Slip",
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
        { content: "Designation:", styles: { fontStyle: "bold" } },
        emp.designation || "Staff",
        { content: "Department:", styles: { fontStyle: "bold" } },
        emp.dept || "General",
      ],
      [
        { content: "Bank Name:", styles: { fontStyle: "bold" } },
        emp.bank_details?.name || "HDFC Bank",
        { content: "Account No:", styles: { fontStyle: "bold" } },
        emp.bank_details?.account || "N/A",
      ],
      [
        { content: "Pay Period:", styles: { fontStyle: "bold" } },
        currentMonthYear,
        { content: "Pay Status:", styles: { fontStyle: "bold" } },
        slipBreakdown.status === "Finalized" ? "PAID" : "UNPAID",
      ],
    ];

    autoTable(doc, {
      startY: 40,
      body: metaRows,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 65 },
        2: { cellWidth: 32 },
        3: { cellWidth: 65 },
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
        earn ? fmt(earn.amount) : "",
        ded ? ded.label : "",
        ded ? fmt(ded.amount) : "",
      ]);
    }

    // Totals Row
    combinedRows.push([
      { content: "Total Gross Earnings", styles: { fontStyle: "bold" } },
      { content: fmt(slipBreakdown.gross), styles: { fontStyle: "bold" } },
      { content: "Total Deductions", styles: { fontStyle: "bold" } },
      { content: fmt(slipBreakdown.totalDeds), styles: { fontStyle: "bold" } },
    ]);

    autoTable(doc, {
      startY: 68,
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
        1: { halign: "right" },
        3: { halign: "right" },
      },
    });

    const finalY = doc.lastAutoTable.finalY || 140;

    // 5. Net Salary Payable Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY + 8, 182, 18, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("NET SALARY PAYABLE:", 22, finalY + 19);

    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52); // Green
    doc.text(fmt(slipBreakdown.net), 188, finalY + 19, { align: "right" });

    // Amount in Words
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.text(
      `In words: ${numberToWords(slipBreakdown.net)}`,
      14,
      finalY + 34
    );

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

  // Avatar renderer
  const renderAvatar = (emp, size = 38) => {
    if (emp?.profile_photo) {
      const photoUrl = emp.profile_photo.startsWith("http")
        ? emp.profile_photo
        : `${API}/uploads/${emp.profile_photo}`;
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
    <div className="container-fluid max-w-6xl mt-3 mt-md-4 pb-5 px-2 px-md-4">
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
        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Month & Year Selectors */}
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

          {/* Quick link to Salary Structure */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-3 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5 bg-white shadow-xs text-dark border"
            onClick={() => navigate("/payroll")}
          >
            <span>💼 Salary Structure</span>
          </Button>

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
                      const isSelected = emp.employee_code === selectedEmpCode;
                      return (
                        <div
                          key={emp.employee_code}
                          onClick={() => setSelectedEmpCode(emp.employee_code)}
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
                        <div className="d-flex align-items-center gap-2">
                          <h4 className="fw-bold text-dark mb-0">Salary Pay Slip</h4>
                          <span
                            className="px-2.5 py-0.5 rounded-pill small fw-semibold"
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
                        <div className="text-muted small mt-0.5">
                          Zentelex IT Solutions Pvt. Ltd. • Kolkata, India
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
                          ROLE & DESIGNATION
                        </div>
                        <div className="text-dark">
                          {payrollData.employee.designation || "Staff"}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={3}>
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
                    </Row>
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
                              className="d-flex justify-content-between small text-muted mb-2"
                            >
                              <span>{ded.label}</span>
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
                        size="sm"
                        className="rounded-3 px-4 py-2 fw-semibold text-white border-0 d-flex align-items-center gap-1.5 shadow-sm"
                        style={{ background: "#4a2835" }}
                        onClick={handleDownloadPDF}
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
            </div>
          </div>

          <div className="table-responsive">
            <Table hover className="align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th className="py-2.5 ps-3">Staff Member</th>
                  <th className="py-2.5">Role / Dept</th>
                  <th className="py-2.5 text-end">Gross Pay</th>
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
                            setSelectedEmpCode(emp.employee_code);
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
    </div>
  );
};

export default PayslipPage;
