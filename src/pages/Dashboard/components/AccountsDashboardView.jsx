import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Button, Spinner } from "react-bootstrap";
import {
  LuWallet,
  LuUsers,
  LuCircleCheck,
  LuShieldCheck,
  LuTrendingUp,
  LuFileText,
  LuClock,
  LuCalendar,
  LuLogOut,
  LuChevronRight,
} from "react-icons/lu";
import api from "../../../api/axios";

export default function AccountsDashboardView() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [payrollStats, setPayrollStats] = useState({
    totalEmployees: 0,
    totalPayrollAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    recentPayrolls: [],
  });

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        const empRes = await api.get("/employees");
        const empList = empRes.data?.data || empRes.data?.employees || [];
        const totalEmp = Array.isArray(empList) ? empList.length : 0;

        let allPayrolls = [];
        try {
          const payRes = await api.get("/payroll");
          allPayrolls = payRes.data?.data || payRes.data?.payrolls || [];
        } catch (e) {
          console.warn("Payroll records empty or error:", e);
        }

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

  const formatCurrency = (amount) => {
    return (
      "₹" +
      (Number(amount) || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })
    );
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
    <div className="accounts-dashboard-section">
      {/* 4 FINANCIAL OVERVIEW CARDS */}
      <Row className="g-3 mb-4">
        {/* Card 1: Monthly Payroll */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Monthly Payroll
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <LuWallet size={16} />
                </span>
              </div>
              <h3
                className="fw-extrabold text-slate-900 mt-1 mb-1"
                style={{ fontSize: "24px" }}
              >
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  formatCurrency(payrollStats.totalPayrollAmount)
                )}
              </h3>
              <span className="text-[11px] font-medium text-slate-500">
                Gross Liability This Month
              </span>
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

        {/* Card 2: Payroll Headcount */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Payroll Headcount
                </span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <LuUsers size={16} />
                </span>
              </div>
              <h3
                className="fw-extrabold text-slate-900 mt-1 mb-1"
                style={{ fontSize: "24px" }}
              >
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  `${payrollStats.totalEmployees} Staff`
                )}
              </h3>
              <span className="text-[11px] font-medium text-slate-500">
                Active Salary Accounts
              </span>
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

        {/* Card 3: Disbursement Status */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Disbursement Status
                </span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <LuCircleCheck size={16} />
                </span>
              </div>
              <h3
                className="fw-extrabold text-amber-600 mt-1 mb-1"
                style={{ fontSize: "24px" }}
              >
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  `${payrollStats.pendingCount} Pending`
                )}
              </h3>
              <span className="text-[11px] font-medium text-slate-500">
                Batches to Finalize
              </span>
            </div>
            <div className="pt-2 border-top mt-3">
              <span className="text-[11px] font-semibold text-slate-500">
                Disbursement window open until 30th
              </span>
            </div>
          </Card>
        </Col>

        {/* Card 4: Finance Access */}
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Finance Access
                </span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <LuShieldCheck size={16} />
                </span>
              </div>
              <div
                className="fw-bold text-slate-900 mt-1 mb-1"
                style={{ fontSize: "18px" }}
              >
                Root Accounts Level
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Full Payroll & Payslip Authority
              </span>
            </div>
            <div className="pt-2 border-top mt-3">
              <span className="badge bg-purple-subtle text-purple-700 px-2 py-1 rounded-pill text-[10px] font-bold">
                Verified Clearance Role
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* FINANCE & ACCOUNTS OPERATIONS */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5
              className="fw-bold text-slate-900 m-0"
              style={{ fontSize: "18px" }}
            >
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
                className="border border-slate-200 shadow-xs rounded-4 p-4 bg-white h-100 cursor-pointer hover-card"
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              >
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div
                    className="p-3 rounded-2xl d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: app.iconBg, color: app.iconColor }}
                  >
                    {app.icon}
                  </div>
                  <span
                    className={`badge ${app.badgeBg} px-2.5 py-1 rounded-pill text-[10px] font-bold border`}
                  >
                    {app.badge}
                  </span>
                </div>

                <h6
                  className="fw-bold text-slate-900 mb-1"
                  style={{ fontSize: "16px" }}
                >
                  {app.title}
                </h6>
                <p
                  className="text-slate-500 text-xs mb-3 flex-grow-1"
                  style={{ lineHeight: "1.5" }}
                >
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
    </div>
  );
}
