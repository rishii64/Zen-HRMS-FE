import React, { useEffect, useRef } from "react";
import { Row, Col, Card, Badge } from "react-bootstrap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  BarController,
  DoughnutController,
  LineController
} from "chart.js";
import {
  LuTrendingUp,
  LuUsers,
  LuBuilding2,
  LuWallet,
  LuCalendar,
  LuCircleCheck,
  LuClock
} from "react-icons/lu";

// Register all required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  BarController,
  DoughnutController,
  LineController
);

const formatCurrency = (val) => {
  if (!val) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

const VisualAnalyticsDashboard = ({ analyticsData }) => {
  const deptHeadcountRef = useRef(null);
  const deptDonutRef = useRef(null);
  const rankLadderRef = useRef(null);
  const attendanceTrendRef = useRef(null);
  const deptComplianceRef = useRef(null);
  const payrollCostRef = useRef(null);
  const deductionsDonutRef = useRef(null);

  const chartInstances = useRef({});

  useEffect(() => {
    if (!analyticsData) return;

    // Helper to safely recreate charts
    const createOrUpdateChart = (key, canvas, config) => {
      if (chartInstances.current[key]) {
        chartInstances.current[key].destroy();
      }
      if (canvas) {
        chartInstances.current[key] = new ChartJS(canvas, config);
      }
    };

    const { workforce, attendance, payroll } = analyticsData;

    // 1. Department Headcount Bar Chart
    if (workforce?.department_headcount && deptHeadcountRef.current) {
      createOrUpdateChart("deptHeadcount", deptHeadcountRef.current, {
        type: "bar",
        data: {
          labels: workforce.department_headcount.labels,
          datasets: [
            {
              label: "Headcount",
              data: workforce.department_headcount.data,
              backgroundColor: workforce.department_headcount.colors || "#3b82f6",
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.raw} Employees`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: "#64748b" },
              grid: { color: "#f1f5f9" },
            },
            x: {
              ticks: { color: "#475569", font: { size: 11 } },
              grid: { display: false },
            },
          },
        },
      });
    }

    // 2. Department Share Doughnut Chart
    if (workforce?.department_headcount && deptDonutRef.current) {
      createOrUpdateChart("deptDonut", deptDonutRef.current, {
        type: "doughnut",
        data: {
          labels: workforce.department_headcount.labels,
          datasets: [
            {
              data: workforce.department_headcount.data,
              backgroundColor: workforce.department_headcount.colors || [
                "#3b82f6",
                "#10b981",
                "#8b5cf6",
                "#f59e0b",
                "#ec4899",
              ],
              borderWidth: 2,
              borderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 10.5 }, color: "#475569" },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} staff`,
              },
            },
          },
        },
      });
    }

    // 3. 11-Tier Rank Ladder Chart
    if (workforce?.rank_distribution && rankLadderRef.current) {
      const rankColors = [
        "#94a3b8", // L1
        "#60a5fa", // L2
        "#38bdf8", // L3
        "#34d399", // L4
        "#2dd4bf", // L5
        "#818cf8", // L6
        "#a78bfa", // L7
        "#c084fc", // L8
        "#f472b6", // L9
        "#fb7185", // L10
        "#fbbf24", // L11
      ];

      createOrUpdateChart("rankLadder", rankLadderRef.current, {
        type: "bar",
        data: {
          labels: workforce.rank_distribution.labels,
          datasets: [
            {
              label: "Employees per Grade",
              data: workforce.rank_distribution.data,
              backgroundColor: rankColors,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.raw} Employees in ${ctx.label}`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: "#64748b" },
              grid: { color: "#f1f5f9" },
            },
            x: {
              ticks: { color: "#475569", font: { size: 10 } },
              grid: { display: false },
            },
          },
        },
      });
    }

    // 4. 14-Day Attendance Dynamics (Area / Line Chart)
    if (attendance?.daily_trends && attendanceTrendRef.current) {
      createOrUpdateChart("attendanceTrend", attendanceTrendRef.current, {
        type: "line",
        data: {
          labels: attendance.daily_trends.labels,
          datasets: [
            {
              label: "On-Time Present",
              data: attendance.daily_trends.present,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointRadius: 3,
            },
            {
              label: "Late Present",
              data: attendance.daily_trends.late,
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 3,
            },
            {
              label: "Absent",
              data: attendance.daily_trends.absent,
              borderColor: "#ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 2.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { boxWidth: 12, font: { size: 11 }, color: "#475569" },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 2, color: "#64748b" },
              grid: { color: "#f1f5f9" },
            },
            x: {
              ticks: { color: "#64748b", font: { size: 10.5 } },
              grid: { display: false },
            },
          },
        },
      });
    }

    // 5. Department Attendance Compliance Rate
    if (attendance?.department_compliance && deptComplianceRef.current) {
      createOrUpdateChart("deptCompliance", deptComplianceRef.current, {
        type: "bar",
        data: {
          labels: attendance.department_compliance.labels,
          datasets: [
            {
              label: "Attendance Rate (%)",
              data: attendance.department_compliance.data,
              backgroundColor: attendance.department_compliance.data.map((v) =>
                v >= 90 ? "#10b981" : v >= 75 ? "#f59e0b" : "#ef4444"
              ),
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Compliance: ${ctx.raw}%`,
              },
            },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { callback: (v) => `${v}%`, color: "#64748b" },
              grid: { color: "#f1f5f9" },
            },
            x: {
              ticks: { color: "#475569", font: { size: 10.5 } },
              grid: { display: false },
            },
          },
        },
      });
    }

    // 6. Department Payroll Budget
    if (payroll?.department_costs && payrollCostRef.current) {
      createOrUpdateChart("payrollCost", payrollCostRef.current, {
        type: "bar",
        data: {
          labels: payroll.department_costs.labels,
          datasets: [
            {
              label: "Monthly Budget",
              data: payroll.department_costs.data,
              backgroundColor: payroll.department_costs.colors || "#6366f1",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Budget: ${formatCurrency(ctx.raw)}/mo`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
                color: "#64748b",
              },
              grid: { color: "#f1f5f9" },
            },
            x: {
              ticks: { color: "#475569", font: { size: 10.5 } },
              grid: { display: false },
            },
          },
        },
      });
    }

    // 7. Deductions Overview Doughnut Chart
    if (payroll?.deductions_overview && deductionsDonutRef.current) {
      createOrUpdateChart("deductionsDonut", deductionsDonutRef.current, {
        type: "doughnut",
        data: {
          labels: payroll.deductions_overview.labels,
          datasets: [
            {
              data: payroll.deductions_overview.data,
              backgroundColor: payroll.deductions_overview.colors,
              borderWidth: 2,
              borderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 10.5 }, color: "#475569" },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
              },
            },
          },
        },
      });
    }

    return () => {
      Object.values(chartInstances.current).forEach((inst) => inst?.destroy());
    };
  }, [analyticsData]);

  if (!analyticsData) {
    return <div className="text-center py-5 text-slate-400">Loading visual analytics...</div>;
  }

  const { summary } = analyticsData;

  return (
    <div className="visual-analytics-dashboard">
      {/* KPI Cards Row */}
      <Row className="g-3 mb-4">
        <Col sm={6} md={3}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-3 border border-blue-200">
                <LuUsers size={22} />
              </div>
              <div>
                <span className="text-2xs uppercase text-slate-400 font-bold tracking-wider d-block">
                  Active Workforce
                </span>
                <h4 className="fw-bold text-slate-900 mb-0">{summary?.total_employees || 0}</h4>
                <span className="text-3xs text-emerald-600 font-medium">100% active staff</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} md={3}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-3 border border-purple-200">
                <LuBuilding2 size={22} />
              </div>
              <div>
                <span className="text-2xs uppercase text-slate-400 font-bold tracking-wider d-block">
                  Total Departments
                </span>
                <h4 className="fw-bold text-slate-900 mb-0">{summary?.total_departments || 0}</h4>
                <span className="text-3xs text-slate-500">Configured entities</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} md={3}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-3 border border-emerald-200">
                <LuCircleCheck size={22} />
              </div>
              <div>
                <span className="text-2xs uppercase text-slate-400 font-bold tracking-wider d-block">
                  Attendance Rate
                </span>
                <h4 className="fw-bold text-emerald-700 mb-0">
                  {summary?.overall_attendance_rate || 95}%
                </h4>
                <span className="text-3xs text-slate-500">30-day corporate average</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} md={3}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-3 border border-indigo-200">
                <LuWallet size={22} />
              </div>
              <div>
                <span className="text-2xs uppercase text-slate-400 font-bold tracking-wider d-block">
                  Monthly Payroll Cost
                </span>
                <h5 className="fw-bold text-indigo-800 mb-0">
                  {formatCurrency(summary?.monthly_payroll_run_rate || 0)}
                </h5>
                <span className="text-3xs text-slate-500 font-medium">
                  Avg: {formatCurrency(summary?.avg_monthly_salary || 0)}/emp
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 1: Headcount Distribution */}
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5 d-flex align-items-center justify-content-between">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuUsers className="text-blue-600" /> Department Headcount Distribution
              </div>
              <Badge bg="light" text="dark" className="border text-3xs font-medium">
                Live Data
              </Badge>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "260px" }}>
                <canvas ref={deptHeadcountRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuBuilding2 className="text-emerald-600" /> Department Workforce Share
              </div>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "260px" }}>
                <canvas ref={deptDonutRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 2: 11-Tier Job Grade Ladder */}
      <Row className="g-3 mb-4">
        <Col lg={12}>
          <Card className="border border-slate-200 shadow-2xs">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5 d-flex align-items-center justify-content-between">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuTrendingUp className="text-purple-600" /> Talent Distribution Across 11-Tier Job Grade Ladder (L1 - L11)
              </div>
              <span className="text-3xs text-slate-500">From Entry Intern to C-Suite Executive</span>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "240px" }}>
                <canvas ref={rankLadderRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Attendance Analytics */}
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5 d-flex align-items-center justify-content-between">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuClock className="text-emerald-600" /> 14-Day Attendance Dynamic Trends
              </div>
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs">
                Present vs Late vs Absent
              </span>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "260px" }}>
                <canvas ref={attendanceTrendRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuCircleCheck className="text-amber-600" /> Department Attendance Compliance (%)
              </div>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "260px" }}>
                <canvas ref={deptComplianceRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 4: Payroll & Compensation Analytics */}
      <Row className="g-3">
        <Col lg={7}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5 d-flex align-items-center justify-content-between">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuWallet className="text-indigo-600" /> Monthly Payroll Expenditure by Department
              </div>
              <span className="text-3xs text-slate-500 font-mono">In INR (₹)</span>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "260px" }}>
                <canvas ref={payrollCostRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border border-slate-200 shadow-2xs h-100">
            <Card.Header className="bg-slate-50/60 border-bottom border-slate-200 py-2.5 px-3.5">
              <div className="fw-bold text-slate-900 fs-6 d-flex align-items-center gap-2">
                <LuTrendingUp className="text-rose-600" /> Gross vs Deductions Structure
              </div>
            </Card.Header>
            <Card.Body className="p-3">
              <div style={{ height: "260px" }}>
                <canvas ref={deductionsDonutRef} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default VisualAnalyticsDashboard;
