import React from "react";
import { Row, Col, Card, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  LuFingerprint,
  LuCalendar,
  LuWallet,
  LuShieldCheck,
  LuUsers,
  LuTrendingUp,
  LuGraduationCap,
  LuReceipt,
  LuBadgeCheck,
  LuStethoscope,
  LuLogOut,
  LuArrowRight,
} from "react-icons/lu";

export default function EmployeeModulesView({ employee = {} }) {
  const navigate = useNavigate();

  const quickActions = [
    {
      id: 1,
      title: "Attendance Tracker",
      desc: "Track daily shift times, logs, and check-in history.",
      btnText: "Open Roster",
      icon: <LuFingerprint size={24} />,
      iconBg: "rgba(2, 132, 199, 0.08)",
      iconColor: "#0284c7",
      onClick: () => navigate("/attendance"),
    },
    {
      id: 2,
      title: "Leave Requests",
      desc: "Apply for leaves, view balances, and check status.",
      btnText: "Apply Leave",
      icon: <LuCalendar size={24} />,
      iconBg: "rgba(22, 163, 74, 0.08)",
      iconColor: "#16a34a",
      isLink: true,
      linkTo: "/employee/leave",
    },
    {
      id: 3,
      title: "Payroll & Salary",
      desc: "Review monthly salary slips, tax records, and allowances.",
      btnText: "View Payroll",
      icon: <LuWallet size={24} />,
      iconBg: "rgba(234, 88, 12, 0.08)",
      iconColor: "#ea580c",
      onClick: () => navigate("/payroll"),
    },
    {
      id: 4,
      title: "Profile & Documents",
      desc: "Update personal records and upload files for HR review.",
      btnText: "Manage Profile",
      icon: <LuShieldCheck size={24} />,
      iconBg: "rgba(109, 40, 217, 0.08)",
      iconColor: "#6d28d9",
      isLink: true,
      linkTo: `/employee/profile/${employee.empId || ""}`,
    },
    {
      id: 5,
      title: "Interviews",
      desc: "Manage schedules and view candidate interview panels.",
      btnText: "View Schedule",
      icon: <LuUsers size={24} />,
      iconBg: "rgba(219, 39, 119, 0.08)",
      iconColor: "#db2777",
      onClick: () => navigate("/interviews"),
    },
    {
      id: 6,
      title: "Performance Appraisal",
      desc: "Review appraisals, feedback loops, and rating scorecards.",
      btnText: "Appraisals",
      icon: <LuTrendingUp size={24} />,
      iconBg: "rgba(79, 70, 229, 0.08)",
      iconColor: "#4f46e5",
      onClick: () => navigate("/appraisal"),
    },
    {
      id: 7,
      title: "Training modules",
      desc: "Access training modules and onboarding tasks.",
      btnText: "Open Modules",
      icon: <LuGraduationCap size={24} />,
      iconBg: "rgba(8, 145, 178, 0.08)",
      iconColor: "#0891b2",
      onClick: () => navigate("/onboarding"),
    },
    {
      id: 8,
      title: "IT Declaration",
      desc: "Declare tax investments, 80C/80D deductions, and choose tax regime.",
      btnText: "Declare Taxes",
      icon: <LuReceipt size={24} />,
      iconBg: "rgba(37, 99, 235, 0.08)",
      iconColor: "#2563eb",
      isLink: true,
      linkTo: "/it-declaration",
    },
    {
      id: 9,
      title: "ID-Card & Documents",
      desc: "Preview official corporate badge, upload ID proofs, and download digital ID.",
      btnText: "Open ID Card",
      icon: <LuBadgeCheck size={24} />,
      iconBg: "rgba(6, 182, 212, 0.08)",
      iconColor: "#0891b2",
      isLink: true,
      linkTo: "/id-card",
    },
    {
      id: 10,
      title: "Mediclaim & Health Insurance",
      desc: "Access digital health E-card, manage covered dependents, and submit medical claims.",
      btnText: "Open Mediclaim",
      icon: <LuStethoscope size={24} />,
      iconBg: "rgba(225, 29, 72, 0.08)",
      iconColor: "#e11d48",
      isLink: true,
      linkTo: "/mediclaim",
    },
    {
      id: 11,
      title: "Holiday Calendar",
      desc: "View company holiday list, festival breaks, and official days off.",
      btnText: "View Holidays",
      icon: <LuCalendar size={24} />,
      iconBg: "rgba(244, 63, 94, 0.08)",
      iconColor: "#f43f5e",
      isLink: true,
      linkTo: "/holidays",
    },
    {
      id: 12,
      title: "Company Policies",
      desc: "Access company policies, code of conduct, and employee handbook.",
      btnText: "Read Policies",
      icon: <LuShieldCheck size={24} />,
      iconBg: "rgba(37, 99, 235, 0.08)",
      iconColor: "#2563eb",
      isLink: true,
      linkTo: "/policies",
    },
    {
      id: 13,
      title: "Separation & Clearance",
      desc: "Submit formal resignation notice, track department clearances, and exit tasks.",
      btnText: "Open Separation",
      icon: <LuLogOut size={24} />,
      iconBg: "rgba(239, 68, 68, 0.08)",
      iconColor: "#ef4444",
      isLink: true,
      linkTo: "/resignation",
    },
  ];

  const enabledTabIds = (() => {
    // 1. Check employee.enabled_tabs or localStorage
    const rawTabs =
      employee && employee.enabled_tabs !== undefined && employee.enabled_tabs !== null
        ? employee.enabled_tabs
        : localStorage.getItem("enabled_tabs");

    if (rawTabs !== undefined && rawTabs !== null) {
      if (typeof rawTabs === "string") {
        const trimmed = rawTabs.trim();
        if (trimmed === "") return []; // Explicitly cleared by HR
        return trimmed
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id));
      } else if (Array.isArray(rawTabs)) {
        return rawTabs.map(Number).filter((id) => !isNaN(id));
      }
    }

    // 2. If tabs_enabled is true, all 13 modules are granted
    if (employee?.tabs_enabled || localStorage.getItem("tabs_enabled") === "true") {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    }

    // 3. Standard default modules
    return [1, 2, 3, 4, 8, 9, 10, 11, 12];
  })();

  const visibleActions = quickActions.filter((action) =>
    enabledTabIds.includes(action.id)
  );

  return (
    <div className="employee-workspace-section">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold text-dark m-0">My Workspace Modules</h4>
          <p className="text-dark mb-0 mt-1 text-[14px] font-medium">
            Select a section below to manage your operations
          </p>
        </div>
        <Badge
          bg="primary-subtle"
          className="text-primary px-3 py-2 rounded-pill fw-semibold"
          style={{ fontSize: "11px" }}
        >
          {visibleActions.length} Modules Available
        </Badge>
      </div>

      {visibleActions.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <div className="text-muted mb-2" style={{ fontSize: "36px" }}>
            🔒
          </div>
          <h5 className="fw-bold text-dark mb-1">No Modules Configured</h5>
          <p className="text-muted small mb-0">
            No dashboard modules have been enabled by HR / Admin for your profile.
          </p>
        </Card>
      ) : (
        <Row className="g-3">
        {visibleActions.map((action, index) => (
          <Col xs={12} sm={6} lg={4} key={action.id}>
            <Card className="h-100 shadow-sm border-0 rounded-4 hover-card bg-white">
              <Card.Body className="d-flex flex-column p-4 justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="p-2.5 rounded-3 d-flex align-items-center justify-content-center"
                      style={{
                        background: action.iconBg,
                        color: action.iconColor,
                      }}
                    >
                      {action.icon}
                    </div>
                    <span
                      className="text-slate-800 fw-bold font-monospace small"
                      style={{ fontSize: "18px" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h5 className="fw-bold text-dark mb-1">{action.title}</h5>
                  <p
                    className="text-muted font-semibold small mb-4"
                    style={{ lineHeight: "1.4" }}
                  >
                    {action.desc}
                  </p>
                </div>

                {action.isLink ? (
                  <Link
                    to={action.linkTo}
                    className="btn btn-outline-primary rounded-3 w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-1.5"
                    style={{ fontSize: "13px" }}
                  >
                    <span>{action.btnText}</span>
                    <LuArrowRight size={14} />
                  </Link>
                ) : (
                  <Button
                    variant="outline-primary"
                    className="rounded-3 w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-1.5"
                    style={{ fontSize: "13px" }}
                    onClick={action.onClick}
                  >
                    <span>{action.btnText}</span>
                    <LuArrowRight size={14} />
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      )}
    </div>
  );
}
