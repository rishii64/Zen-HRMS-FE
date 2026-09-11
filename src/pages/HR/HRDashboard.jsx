import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import {
  LuUsers,
  LuCalendar,
  LuGraduationCap,
  LuShieldCheck,
  LuClock,
  LuArrowUpRight,
  LuArrowDownRight,
  LuArrowRight,
  LuActivity
} from "react-icons/lu";
import TodayClockWidget from "../../components/layout/TodayClockWidget";

const navItems = [
  {
    key: "employees",
    label: "Employee List",
    desc: "View and manage all employee records across departments",
    icon: <LuUsers size={22} />,
    iconBg: "rgba(2, 132, 199, 0.08)",
    iconColor: "#0284c7",
    accentColor: "#3b82f6",
    route: "/admin/manage-employees",
    pills: [
      { label: "124 records", bg: "#dbeafe", color: "#1e40af" },
      { label: "12 new", bg: "#dcfce7", color: "#166534" },
    ],
  },
  {
    key: "leave",
    label: "Leave Portal",
    desc: "Approve and track employee leave requests efficiently",
    icon: <LuCalendar size={22} />,
    iconBg: "rgba(22, 163, 74, 0.08)",
    iconColor: "#16a34a",
    accentColor: "#22c55e",
    route: "/admin/leaves",
    pills: [
      { label: "8 pending", bg: "#fef9c3", color: "#854d0e" },
      { label: "5 approved", bg: "#dcfce7", color: "#166534" },
    ],
  },
  {
    key: "training",
    label: "Training & Awareness",
    desc: "Schedule and manage training programs and events",
    icon: <LuGraduationCap size={22} />,
    iconBg: "rgba(234, 88, 12, 0.08)",
    iconColor: "#ea580c",
    accentColor: "#f59e0b",
    route: "/onboarding",
    pills: [
      { label: "3 active", bg: "#fef9c3", color: "#854d0e" },
      { label: "Next: Mon", bg: "#e0e7ff", color: "#3730a3" },
    ],
  },
  {
    key: "portal",
    label: "Employee Portal Activation",
    desc: "Activate and control employee portal access",
    icon: <LuShieldCheck size={22} />,
    iconBg: "rgba(109, 40, 217, 0.08)",
    iconColor: "#6d28d9",
    accentColor: "#8b5cf6",
    route: "/loginPage",
    pills: [
      { label: "98 active", bg: "#ede9fe", color: "#5b21b6" },
      { label: "26 inactive", bg: "#fee2e2", color: "#991b1b" },
    ],
  },
];

export default function HRDashboard() {
  const navigate = useNavigate();
  const [tickingTime, setTickingTime] = useState(new Date());

  const userName = localStorage.getItem("userName") || "HR Manager";
  const avatarText = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Ticking clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTickingTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const firstName = userName.split(" ")[0];
    const hrs = tickingTime.getHours();
    if (hrs < 12) return `Good morning, ${firstName}!`;
    if (hrs < 17) return `Good afternoon, ${firstName}!`;
    return `Good evening, ${firstName}!`;
  };

  const formatCurrentTimeFormatted = (d) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const monthName = months[d.getMonth()] || "Jul";
    const day = d.getDate();
    const year = d.getFullYear();
    let hrs = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${day} ${monthName} ${year}, ${hrs}:${mins} ${ampm}`;
  };

  const stats = [
    {
      label: "Total Employees",
      value: "124",
      change: "↑ 4 this month",
      isPositive: true,
      color: "#0284c7"
    },
    {
      label: "Pending Leaves",
      value: "8",
      change: "↓ 2 from last week",
      isPositive: false,
      color: "#ea580c"
    },
    {
      label: "Active Trainings",
      value: "3",
      change: "↑ 1 new session",
      isPositive: true,
      color: "#16a34a"
    },
    {
      label: "Portal Active Users",
      value: "98",
      change: "26 inactive accounts",
      isPositive: true,
      color: "#6d28d9"
    }
  ];

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: "#0a1628", padding: "0 2rem", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", fontWeight: 600, fontSize: "15px" }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyCenter: "center" }}>
            <LuActivity size={18} style={{ color: "#ffffff" }} />
          </div>
          HR Management Portal
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{userName} · HR</div>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "white", border: "2px solid rgba(255,255,255,0.2)" }}>
            {avatarText}
          </div>
        </div>
      </nav>

      <Container fluid className="px-4 py-4" style={{ maxWidth: "1200px" }}>
        {/* CSS Styling */}
        <style>{`
          .hr-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .hr-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important;
            border-color: rgba(30, 58, 138, 0.15) !important;
          }
          .action-card {
            cursor: pointer;
          }
        `}</style>

        {/* TOP HEADER & GREETINGS ROW */}
        <Row className="mb-4 align-items-center g-3">
          <Col xs={12} md={8}>
            <div className="d-inline-flex align-items-center gap-2 px-2.5 py-1 mb-2 rounded-pill bg-white border" style={{ fontSize: "12px", color: "#64748b" }}>
              <span className="rounded-circle d-inline-block" style={{ width: "8px", height: "8px", backgroundColor: "#22c55e" }}></span>
              HR System Active
            </div>
            <h2 className="fw-bold m-0" style={{ color: "#0f172a", fontSize: "28px", letterSpacing: "-0.5px" }}>
              {getGreeting()}
            </h2>
            <p className="text-muted mb-0 mt-1" style={{ color: "#64748b", fontSize: "14px" }}>
              Here's your HR workspace overview for today.
            </p>
          </Col>
          <Col xs={12} md={4} className="d-flex justify-content-md-end">
            <Card className="border-0 shadow-sm rounded-4 px-3 py-2 bg-white d-flex flex-row align-items-center gap-3">
              <div>
                <div className="text-muted" style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8" }}>
                  CURRENT TIME
                </div>
                <div className="fw-bold" style={{ fontSize: "14px", color: "#1e293b" }}>
                  {formatCurrentTimeFormatted(tickingTime)}
                </div>
              </div>
              <div className="p-2 bg-light rounded-circle text-primary d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px", border: "1px dashed #cbd5e1" }}>
                <LuClock size={18} style={{ color: "#1e293b" }} />
              </div>
            </Card>
          </Col>
        </Row>

        {/* STATS & TODAY CLOCK ROW */}
        <Row className="g-4 mb-4">
          <Col xs={12} lg={5}>
            <TodayClockWidget />
          </Col>
          <Col xs={12} lg={7}>
            <Row className="g-3 h-100">
              {stats.map((st, idx) => (
                <Col xs={6} key={idx}>
                  <Card className="hr-card p-3 shadow-sm h-100 d-flex flex-column justify-content-between">
                    <div className="text-muted" style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {st.label}
                    </div>
                    <div className="fw-bold mt-2" style={{ fontSize: "28px", color: "#0f172a", lineHeight: "1" }}>
                      {st.value}
                    </div>
                    <div className="d-flex align-items-center gap-1 mt-2" style={{ fontSize: "12px", color: st.isPositive ? "#16a34a" : "#dc2626" }}>
                      {st.isPositive ? <LuArrowUpRight size={14} /> : <LuArrowDownRight size={14} />}
                      <span>{st.change}</span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>

        {/* WORKSPACE QUICK ACTION MODULES */}
        <div className="mb-3">
          <h5 className="fw-bold text-dark m-0" style={{ color: "#0f172a", fontSize: "18px" }}>HR Quick Actions</h5>
          <p className="text-muted small mb-0" style={{ fontSize: "13px" }}>Select an operation card below to manage records</p>
        </div>

        <Row className="g-3">
          {navItems.map((item) => (
            <Col xs={12} md={6} key={item.key}>
              <Card
                className="hr-card action-card shadow-sm p-4 h-100 d-flex flex-column justify-content-between"
                onClick={() => navigate(item.route)}
              >
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="p-3 rounded-3 d-flex align-items-center justify-content-center" style={{ background: item.iconBg, color: item.iconColor }}>
                      {item.icon}
                    </div>
                    <div className="p-2 bg-light rounded-circle text-muted d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px" }}>
                      <LuArrowRight size={16} />
                    </div>
                  </div>

                  <h5 className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "18px" }}>{item.label}</h5>
                  <p className="text-muted mb-3" style={{ fontSize: "13px", lineHeight: "1.4" }}>{item.desc}</p>
                </div>

                <div className="d-flex align-items-center gap-2 pt-3 border-top" style={{ borderColor: "#f1f5f9" }}>
                  {item.pills.map((pill, i) => (
                    <Badge
                      key={i}
                      pill
                      style={{
                        backgroundColor: pill.bg,
                        color: pill.color,
                        padding: "5px 12px",
                        fontSize: "11px",
                        fontWeight: "600"
                      }}
                    >
                      {pill.label}
                    </Badge>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}