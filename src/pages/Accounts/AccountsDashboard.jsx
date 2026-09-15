import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Button, Table, Spinner } from "react-bootstrap";
import {
  LuWallet,
  LuFileText,
  LuUsers,
  LuCalendar,
  LuClock,
  LuArrowUpRight,
  LuTrendingUp,
  LuCircleCheck,
  LuChevronRight,
  LuDollarSign,
  LuShieldCheck,
  LuLogOut
} from "react-icons/lu";
import TodayClockWidget from "../../components/layout/TodayClockWidget";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

export default function AccountsDashboard() {
  const navigate = useNavigate();
  const [tickingTime, setTickingTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || localStorage.getItem("userName") || "Accounts Manager";
  const userEmpId = storedUser.employee_id || localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";

  // Financial & Payroll Overview State
  const [payrollStats, setPayrollStats] = useState({
    totalEmployees: 0,
    totalPayrollAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    recentPayrolls: [],
  });

  // Ticking live clock
  useEffect(() => {
    const timer = setInterval(() => setTickingTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live payroll and employee overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [payrollRes, empRes] = await Promise.allSettled([
          fetch(`${API}/payroll/all`, { headers }),
          fetch(`${API}/employees`, { headers }),
        ]);

        let allPayrolls = [];
        let allEmployees = [];

        if (payrollRes.status === "fulfilled" && payrollRes.value.ok) {
          const pData = await payrollRes.value.json();
          allPayrolls = Array.isArray(pData.records) ? pData.records : (Array.isArray(pData.data) ? pData.data : (Array.isArray(pData) ? pData : []));
        }

        if (empRes.status === "fulfilled" && empRes.value.ok) {
          const eData = await empRes.value.json();
          allEmployees = Array.isArray(eData.data) ? eData.data : (Array.isArray(eData.employees) ? eData.employees : []);
        }

        // Calculate metrics
        const totalEmp = allEmployees.length || allPayrolls.length || 0;
        let totalAmount = 0;
        let paid = 0;
        let pending = 0;

        allPayrolls.forEach((p) => {
          const gross = parseFloat(p.gross_pay) || 0;
          totalAmount += gross;
          if (p.status === "Finalized" || p.status === "Paid") {
            paid += 1;
          } else {
            pending += 1;
          }
        });

        // Default fallback if no payrolls recorded yet
        if (totalAmount === 0 && totalEmp > 0) {
          totalAmount = totalEmp * 30000;
          pending = totalEmp;
        }

        setPayrollStats({
          totalEmployees: totalEmp,
          totalPayrollAmount: totalAmount,
          paidCount: paid,
          pendingCount: pending,
          recentPayrolls: allPayrolls.slice(0, 5),
        });
      } catch (err) {
        console.error("Error fetching accounts dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const getGreeting = () => {
    const firstName = userName.split(" ")[0] || "Team";
    const hrs = tickingTime.getHours();
    if (hrs < 12) return `Good morning, ${firstName}!`;
    if (hrs < 17) return `Good afternoon, ${firstName}!`;
    return `Good evening, ${firstName}!`;
  };

  const formatCurrency = (amount) => {
    return "₹" + (Number(amount) || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0
    });
  };

  const accountsApps = [
    {
      title: "Payroll Management",
      desc: "Run monthly payroll batches, manage earnings, and process statutory deductions.",
      route: "/payroll",
      icon: <LuWallet size={22} />,
      iconBg: "#ecfdf5",
      iconColor: "#059669",
      badge: "Dedicated Route",
      badgeBg: "bg-emerald-subtle text-emerald-700",
    },
    {
      title: "Salary Slips",
      desc: "View and export confidential payslips with complete salary structure breakdown.",
      route: "/payslip",
      icon: <LuFileText size={22} />,
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      badge: "PDF Export",
      badgeBg: "bg-blue-subtle text-blue-700",
    },
    {
      title: "Attendance & Logs",
      desc: "Verify employee clock-in hours, shift timings, overtime, and late arrivals.",
      route: "/attendance",
      icon: <LuClock size={22} />,
      iconBg: "#fefce8",
      iconColor: "#ca8a04",
      badge: "Live Timesheet",
      badgeBg: "bg-warning-subtle text-warning-emphasis",
    },
    {
      title: "Leave Management",
      desc: "Track unpaid leaves, LOP impacts, and staff paid leave approvals.",
      route: "/admin/leaves",
      icon: <LuCalendar size={22} />,
      iconBg: "#f5f3ff",
      iconColor: "#7c3aed",
      badge: "Payroll Impact",
      badgeBg: "bg-purple-subtle text-purple-700",
    },
    {
      title: "Separation & Dues",
      desc: "Process final settlement clearances, severance payouts, and resignation audits.",
      route: "/resignation",
      icon: <LuLogOut size={22} />,
      iconBg: "#fff1f2",
      iconColor: "#e11d48",
      badge: "Clearance",
      badgeBg: "bg-danger-subtle text-danger-emphasis",
    },
    {
      title: "Staff Directory",
      desc: "Inspect employee job roles, departments, bank details, and active compensations.",
      route: "/admin/manage-employees",
      icon: <LuUsers size={22} />,
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      badge: "Directory",
      badgeBg: "bg-success-subtle text-success",
    },
  ];

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="pb-12 pt-6">
      <Container className="max-w-7xl">
        {/* TOP WELCOME BANNER */}
        <Card className="border-0 shadow-sm rounded-4 p-4 p-md-4 mb-4 bg-white">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h2 className="fw-bold text-dark m-0" style={{ fontSize: "24px", color: "#0f172a" }}>
                  {getGreeting()}
                </h2>
                <Badge bg="emerald" className="px-2.5 py-1 rounded-pill fw-semibold text-xs border" style={{ backgroundColor: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" }}>
                  Finance & Accounts
                </Badge>
              </div>
              <p className="text-muted small m-0">
                Accounts Dashboard • Manage daily attendance clock-out, payroll liabilities, and disbursements.
              </p>
            </div>

            <div className="d-flex align-items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <div className="p-2 rounded-circle bg-white shadow-xs text-primary d-flex align-items-center justify-content-center">
                <LuClock size={18} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Time</div>
                <div className="fw-bold text-slate-800 text-sm">
                  {tickingTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* PRIMARY WORKSPACE GRID: TODAY CLOCK WIDGET + FINANCIAL STATS */}
        <Row className="g-4 mb-4">
          {/* Left Column: Today Clock Widget for Daily Check-In & Check-Out */}
          <Col xs={12} lg={5}>
            <div className="h-100">
              <TodayClockWidget />
            </div>
          </Col>

          {/* Right Column: Key Financial & Payroll Metrics */}
          <Col xs={12} lg={7}>
            <Row className="g-3 h-100">
              <Col xs={12} sm={6}>
                <Card className="border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Payroll</span>
                      <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <LuWallet size={16} />
                      </span>
                    </div>
                    <h3 className="fw-extrabold text-slate-900 mt-1 mb-1" style={{ fontSize: "24px" }}>
                      {loading ? <Spinner animation="border" size="sm" /> : formatCurrency(payrollStats.totalPayrollAmount)}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">Gross Liability This Month</span>
                  </div>
                  <div className="pt-2 border-top mt-3 d-flex justify-content-between align-items-center">
                    <span className="text-[11px] font-bold text-emerald-600 d-flex align-items-center gap-1">
                      <LuTrendingUp size={12} /> Active Cycle
                    </span>
                    <Button
                      variant="link"
                      onClick={() => navigate("/payroll")}
                      className="p-0 text-decoration-none text-xs font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      Manage Payroll →
                    </Button>
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={6}>
                <Card className="border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Headcount</span>
                      <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                        <LuUsers size={16} />
                      </span>
                    </div>
                    <h3 className="fw-extrabold text-slate-900 mt-1 mb-1" style={{ fontSize: "24px" }}>
                      {loading ? <Spinner animation="border" size="sm" /> : `${payrollStats.totalEmployees} Staff`}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">Active Salary Accounts</span>
                  </div>
                  <div className="pt-2 border-top mt-3 d-flex justify-content-between align-items-center">
                    <span className="text-[11px] font-bold text-blue-600">
                      {payrollStats.paidCount} Disbursed
                    </span>
                    <Button
                      variant="link"
                      onClick={() => navigate("/payslip")}
                      className="p-0 text-decoration-none text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      View Slips →
                    </Button>
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={6}>
                <Card className="border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disbursement Status</span>
                      <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                        <LuCircleCheck size={16} />
                      </span>
                    </div>
                    <h3 className="fw-extrabold text-amber-600 mt-1 mb-1" style={{ fontSize: "24px" }}>
                      {loading ? <Spinner animation="border" size="sm" /> : `${payrollStats.pendingCount} Pending`}
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">Batches to Finalize</span>
                  </div>
                  <div className="pt-2 border-top mt-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Disbursement window open until 30th
                    </span>
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={6}>
                <Card className="border-0 shadow-sm rounded-4 p-3.5 bg-white h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Finance Access</span>
                      <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                        <LuShieldCheck size={16} />
                      </span>
                    </div>
                    <div className="fw-bold text-slate-900 mt-1 mb-1" style={{ fontSize: "16px" }}>
                      Root Accounts Level
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Full Payroll & Payslip Authority</span>
                  </div>
                  <div className="pt-2 border-top mt-3">
                    <span className="badge bg-purple-subtle text-purple-700 px-2 py-1 rounded-pill text-[10px] font-bold">
                      Verified Clearance Role
                    </span>
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* ACCOUNTS QUICK ACTION HUBS */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="fw-bold text-slate-900 m-0" style={{ fontSize: "18px" }}>
                Finance & Accounts Operations
              </h5>
              <p className="text-muted small m-0">
                Direct access to specialized payroll, salary slips, and operations consoles.
              </p>
            </div>
          </div>

          <Row className="g-3">
            {accountsApps.map((app, idx) => (
              <Col xs={12} sm={6} lg={4} key={idx}>
                <Card
                  onClick={() => navigate(app.route)}
                  className="border border-slate-200 shadow-xs rounded-4 p-4 bg-white h-100 cursor-pointer transition-all hover:shadow-md hover:border-slate-300"
                  style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div
                      className="p-3 rounded-2xl d-flex align-items-center justify-content-center"
                      style={{ backgroundColor: app.iconBg, color: app.iconColor }}
                    >
                      {app.icon}
                    </div>
                    <span className={`badge ${app.badgeBg} px-2.5 py-1 rounded-pill text-[10px] font-bold border`}>
                      {app.badge}
                    </span>
                  </div>

                  <h6 className="fw-bold text-slate-900 mb-1" style={{ fontSize: "16px" }}>
                    {app.title}
                  </h6>
                  <p className="text-slate-500 text-xs mb-3 flex-grow-1" style={{ lineHeight: "1.5" }}>
                    {app.desc}
                  </p>

                  <div className="d-flex align-items-center gap-1 text-xs font-bold text-slate-700 pt-2 border-top">
                    <span>Open Module</span>
                    <LuChevronRight size={14} className="text-slate-400" />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* PAYROLL DIRECT ACCESS BANNER */}
        <Card
          className="border-0 shadow-sm rounded-4 p-4 text-white position-relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)",
          }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 position-relative z-1">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-white/20 text-white">
                  <LuWallet size={20} />
                </span>
                <h5 className="fw-bold m-0 text-white">Comprehensive Payroll Management Console</h5>
              </div>
              <p className="text-white/80 small m-0">
                Access fixed pay structures, variable allowances, statutory PF/ESI rates, and generate bulk salary slips.
              </p>
            </div>

            <div className="d-flex gap-2">
              <Button
                onClick={() => navigate("/payroll")}
                variant="light"
                className="font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm text-emerald-800 border-0"
              >
                Go to Payroll Console →
              </Button>
              <Button
                onClick={() => navigate("/payslip")}
                variant="outline-light"
                className="font-bold text-xs px-3.5 py-2.5 rounded-xl border-white/40"
              >
                Salary Slips
              </Button>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}
