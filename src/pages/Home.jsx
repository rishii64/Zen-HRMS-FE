import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Card, Table } from "react-bootstrap";
import { Link } from "react-router-dom";

const Home = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const features = [
    {
      title: "Employee Management",
      desc: "Easily manage employee data, designations, departments and records in one place.",
      path: "/admin/dashboard",
      btnText: "Explore Dashboard"
    },
    {
      title: "Leave Management",
      desc: "Apply, track, and approve leaves with a smooth and automated workflow.",
      path: "/employee/leave",
      btnText: "Apply Leave"
    },
    {
      title: "Attendance Tracker",
      desc: "Monitor daily check-ins, office hours, and real-time attendance logs.",
      path: "/attendance",
      btnText: "View Attendance"
    },
    {
      title: "Payroll System",
      desc: "Manage salary structures, payslips, and employee payroll processing.",
      path: "/Payroll",
      btnText: "Manage Payroll"
    },
    {
      title: "Admin Controls",
      desc: "Administrative access for attendance oversight and system settings.",
      path: "/admin/attendance",
      btnText: "Review Logs"
    },
    {
      title: "Leave Approvals",
      desc: "Admin section to review and approve/reject employee leave requests.",
      path: "/admin/leaves",
      btnText: "Manage Requests"
    },

  ];

  // Salary Data Logic
  const salaryData = {
    earnings: [
      { name: "Basic Salary", value: 30000 },
      { name: "HRA", value: 15000 },
      { name: "Conveyance", value: 2000 },
      { name: "Medical", value: 1500 },
      { name: "Special Allowance", value: 6500 }
    ],
    deductions: [
      { name: "PF", value: 3600 },
      { name: "ESI", value: 0 },
      { name: "Professional Tax", value: 200 },
      { name: "TDS", value: 2000 },
      { name: "Others", value: 500 }
    ]
  };

  const grossSalary = salaryData.earnings.reduce((acc, curr) => acc + curr.value, 0);
  const totalDeductions = salaryData.deductions.reduce((acc, curr) => acc + curr.value, 0);
  const netSalary = grossSalary - totalDeductions;

  const getDashboardPath = () => {
    const userRole = (localStorage.getItem("role") || "").toLowerCase();
    if (userRole === "hr" || userRole === "admin" || userRole === "hrmanager") return "/admin/dashboard";
    if (userRole === "hod" || userRole === "manager") return "/hod/dashboard";
    if (userRole === "accounts" || userRole === "payroll") return "/accounts/dashboard";
    return "/employee/dashboard";
  };

  return (
    <div className="overflow-hidden">
      {/* HERO SECTION */}
      <div className="bg-primary text-white py-5 shadow-sm">
        <Container>
          <Row className="align-items-center min-vh-50">
            <Col md={6} className="text-center text-md-start">
              <h1 className="fw-bold display-4">HRMS Management System</h1>
              <p className="mt-3 fs-5 opacity-75">
                Streamline employee management, leave tracking, payroll, and
                attendance with an all-in-one HRMS platform.
              </p>
              <div className="mt-4">
                {isLoggedIn ? (
                  <Button as={Link} to={getDashboardPath()} variant="light" size="lg" className="px-4 shadow-sm fw-bold">
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button as={Link} to="/login" variant="light" size="lg" className="px-4 me-2 shadow-sm fw-bold">
                      Get Started
                    </Button>
                    <Button as={Link} to="/register" variant="outline-light" size="lg" className="px-4 shadow-sm fw-bold">
                      Register Now
                    </Button>
                  </>
                )}
              </div>
            </Col>

            <Col md={6} className="text-center mt-5 mt-md-0">
              <img
                src="https://cdn-icons-png.flaticon.com/512/1256/1256650.png"
                alt="HRMS Hero"
                className="img-fluid"
                style={{ maxWidth: "350px", filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.2))" }}
              />
            </Col>
          </Row>
        </Container>
      </div>

      {/* CORE MODULES SECTION (Visible only after successful login) */}
      {isLoggedIn && (
        <Container className="my-5 py-5">
          <h2 className="text-center mb-5 fw-bold">Our Core Modules</h2>
          <Row className="g-4">
            {features.map((feature, index) => (
              <Col lg={4} md={6} key={index}>
                <Card className="h-100 border-0 shadow-sm hover-shadow transition" style={{ borderRadius: "15px" }}>
                  <Card.Body className="p-4 d-flex flex-column">
                    <h5 className="fw-bold text-primary mb-3">{feature.title}</h5>
                    <Card.Text className="text-muted flex-grow-1">
                      {feature.desc}
                    </Card.Text>
                    <Button
                      as={Link}
                      to={feature.path}
                      variant="outline-primary"
                      className="mt-3 rounded-pill fw-bold btn-sm py-2"
                    >
                      {feature.btnText}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      )}


      {/* ABOUT SECTION */}
      <div className="bg-light py-5">
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="text-center mb-4 mb-md-0">
              <img
                src="https://cdn-icons-png.flaticon.com/512/906/906175.png"
                alt="HR Solutions"
                className="img-fluid"
                style={{ maxWidth: "320px" }}
              />
            </Col>
            <Col md={6}>
              <h3 className="fw-bold display-6 text-center text-md-start">Smart HR Solutions</h3>
              <p className="mt-3 text-secondary leading-relaxed">
                Our HRMS system helps businesses automate daily HR activities
                and improve overall efficiency. Manage employee information,
                leave requests, attendance, and reports effortlessly.
              </p>
              <div className="text-center text-md-start">
                {isLoggedIn ? (
                  <Button as={Link} to={getDashboardPath()} variant="primary" size="lg" className="mt-2 px-4 shadow fw-bold">
                    Access Dashboard
                  </Button>
                ) : (
                  <Button as={Link} to="/login" variant="primary" size="lg" className="mt-2 px-4 shadow fw-bold">
                    Login to Your Account
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <footer className="bg-dark text-white text-center py-4 mt-auto">
        <Container>
          <small className="opacity-75">
            © {new Date().getFullYear()} HRMS System. All Rights Reserved.
          </small>
        </Container>
      </footer>

      <style>{`
        .hover-shadow:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important;
          border: 1px solid #0d6efd !important;
          transition: all 0.3s ease;
        }
        .table-light {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </div>
  );
};

export default Home;