import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  isTokenExpired,
  clearAuthSession,
  initTokenExpiryWatcher,
  handleSessionExpired,
  getAuthToken,
  getAuthRole,
  getAuthDesignation,
  isLeadershipDesignation,
  isDepartmentHeadOrManager,
} from "../utils/auth";

// Auth Pages
import UnifiedLogin from "../pages/auth/UnifiedLogin";
import ForgotPassword from "../pages/auth/ForgotPassword";

// HR Pages
import HRDashboard from "../pages/HR/HRDashboard";
import Recruitment from "../pages/HR/Recruitment";
import InterviewForm from "../pages/HR/InterviewForm";
import PerformanceKPI from "../pages/Apps/PerformanceKPI";
import Onboarding from "../pages/HR/onboarding";

// Admin Pages
import AdminDashboard from "../pages/Admin/AdminDashboard";
import LeavesPage from "../pages/Admin/LeavesPage";
import HolidayManager from "../pages/Admin/HolidayManager";
import ManageEmployees from "../pages/Admin/ManageEmployees";
import Register from "../pages/Register";
import Holiday from "../pages/Apps/Holiday";
import Policies from "../pages/Apps/Policies";
import Schedule from "../pages/Apps/Schedule";
import Leave from "../pages/Apps/Leave";
import IT_Declaration from "../pages/Apps/IT_Declaration";
import ID_Card from "../pages/Apps/ID_Card";
import Mediclaim from "../pages/Apps/Mediclaim";
import Profile from "../pages/Apps/Profile";
import Requisition from "../pages/Apps/Requisition";
import HREvents from "../pages/Apps/HREvents";
import Training from "../pages/Apps/Training";

// Employee Pages
import EmployeeDashboard from "../pages/Employee/EmployeeDashboard";
import Separation from "../pages/Apps/Separation";
import MyAttendance from "../components/Attendance/Attendance";

// Accounts Pages
import AccountsDashboard from "../pages/Accounts/AccountsDashboard";

// Payroll Pages
import PayrollManagement from "../pages/Payroll/PayrollManagement";
import PayslipPage from "../pages/Payroll/PayslipPage";

// HOD Pages
import HODDashboard from "../pages/HOD/HODDashboard";

import UnifiedDashboard from "../pages/Dashboard/UnifiedDashboard";

// Home Page
import Home from "../pages/Home";
import Appraisal from "../pages/Apps/Apprasial";
import CandidateOfferAcceptance from "../pages/Apps/CandidateOfferAcceptance";
import ClaimsReimbursement from "../pages/Apps/ClaimsReimbursement";

// ✅ ProtectedRoute — checks token presence, expiry validity, role authorization & designation RBAC
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = getAuthToken() || localStorage.getItem("token");
  const rawRole = getAuthRole() || localStorage.getItem("role") || "";
  let role = rawRole.toLowerCase().trim();
  if (role === "employees") role = "employee";

  // Check if token is absent or has expired
  if (!token || isTokenExpired(token)) {
    if (token) {
      handleSessionExpired();
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const normalizedAllowed = allowedRoles.map((r) => {
      const nr = r.toLowerCase().trim();
      return nr === "employees" ? "employee" : nr;
    });

    let isAuthorized = normalizedAllowed.includes(role);

    // If role is employee (or direct match failed), check designation-based leadership roles
    if (!isAuthorized) {
      const desig = (getAuthDesignation() || "").trim();
      const isLead = isLeadershipDesignation(desig);
      const isHodOrMgr = isDepartmentHeadOrManager();

      if (normalizedAllowed.includes("hod") && isHodOrMgr) isAuthorized = true;
      if (normalizedAllowed.includes("manager") && isHodOrMgr) isAuthorized = true;
      if (normalizedAllowed.includes("teamlead") && isLead) isAuthorized = true;
    }

    if (!isAuthorized) {
      // If not authorized for this role, redirect to Home page
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default function AppRoute() {
  useEffect(() => {
    initTokenExpiryWatcher();
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<UnifiedLogin />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/offer-acceptance/:token" element={<CandidateOfferAcceptance />} />

      {/* Unified Role-Based Dashboard Routes */}
      {/* <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "cto", "cfo", "vp", "secretary", "management", "hrmanager"]}> <UnifiedDashboard /> </ProtectedRoute>} /> */}
      <Route path="/admin/dashboard" element={<Navigate to="/admin/tasks" replace />} />
      <Route path="/admin/tasks" element={<ProtectedRoute allowedRoles={["employee", "admin", "hr", "management", "ceo", "coo", "cto", "cfo", "vp", "secretary", "hrmanager"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/management/dashboard" element={<ProtectedRoute allowedRoles={["management", "ceo", "coo", "cto", "cfo", "vp", "secretary"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/hr/dashboard" element={<ProtectedRoute allowedRoles={["hr", "management", "hrmanager", "ceo", "coo"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "cto", "cfo", "vp", "secretary", "management", "hrmanager"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/accounts/dashboard" element={<ProtectedRoute allowedRoles={["accounts", "payroll", "ceo", "cfo", "management"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={["hod", "manager", "hr", "ceo", "coo", "management"]}> <UnifiedDashboard /> </ProtectedRoute>} />

      {/* HR & Admin Restricted Routes */}
      <Route path="/attendance" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "cto", "cfo", "vp", "secretary", "management", "hrmanager"]}> <MyAttendance /> </ProtectedRoute>} />
      {/* <Route path="/admin/attendance" element={<Navigate to="/attendance" replace />} /> */}
      <Route path="/hr/leaves" element={<ProtectedRoute allowedRoles={["hr", "accounts", "payroll", "ceo", "coo", "management"]}> <LeavesPage /> </ProtectedRoute>} />
      <Route path="/hr/manage-employees" element={<ProtectedRoute allowedRoles={["hr", "accounts", "ceo", "coo", "management"]}> <ManageEmployees /> </ProtectedRoute>} />
      {/* <Route path="/admin/register-employee" element={<ProtectedRoute allowedRoles={["hr", "admin", "ceo", "management"]}> <Register /> </ProtectedRoute>} /> */}

      <Route path="/requisition" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager", "management", "accounts", "payroll", "sales", "operations", "chro", "vphr", "cfo", "cto", "vp"]}> <Requisition /> </ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <Onboarding /> </ProtectedRoute>} />
      <Route path="/onboarding/:id" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <Onboarding /> </ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute allowedRoles={["employee", "hod", "hr", "admin", "manager", "teamlead", "hrmanager", "ceo", "coo", "management"]}> <InterviewForm /> </ProtectedRoute>} />
      <Route path="/interview/:candidateId" element={<ProtectedRoute allowedRoles={["employee", "hod", "hr", "admin", "manager", "teamlead", "hrmanager", "ceo", "coo", "management"]}> <InterviewForm /> </ProtectedRoute>} />
      <Route path="/manage-employee" element={<ProtectedRoute allowedRoles={["hr", "hod", "manager", "accounts", "ceo", "coo", "management"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/admin/manage-employee" element={<ProtectedRoute allowedRoles={["hr", "hod", "manager", "accounts", "ceo", "coo", "management"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/holidaymanager" element={<ProtectedRoute allowedRoles={["hr", "ceo", "management"]}> <HolidayManager /> </ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager", "management"]}> <Holiday /> </ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager", "management"]}> <Policies /> </ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager", "management"]}> <Schedule /> </ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <Leave /> </ProtectedRoute>} />
      <Route path="/hr-events" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager", "management"]}> <HREvents /> </ProtectedRoute>} />
      <Route path="/events" element={<Navigate to="/hr-events" replace />} />
      <Route path="/training" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager", "teamlead", "ceo", "coo", "cto", "cfo", "vp", "secretary", "management", "hrmanager"]}> <Training /> </ProtectedRoute>} />
      <Route path="/Training" element={<Navigate to="/training" replace />} />

      <Route path="/profile/:employeeid" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}><Profile /></ProtectedRoute>} />
      <Route path="/kpi" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <PerformanceKPI /> </ProtectedRoute>} />
      <Route path="/appraisal" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <Appraisal /> </ProtectedRoute>} />
      <Route path="/resignation" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <Separation /> </ProtectedRoute>} />
      <Route path="/it-declaration" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <IT_Declaration /> </ProtectedRoute>} />
      <Route path="/id-card" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <ID_Card /> </ProtectedRoute>} />
      <Route path="/mediclaim" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <Mediclaim /> </ProtectedRoute>} />
      <Route path="/claims" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <ClaimsReimbursement /> </ProtectedRoute>} />
      <Route path="/reimbursement" element={<Navigate to="/claims" replace />} />
      <Route path="/expenses" element={<Navigate to="/claims" replace />} />

      {/* Payroll Management & Salary Slips (Payslips) */}
      <Route path="/payroll" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <PayrollManagement /> </ProtectedRoute>} />
      <Route path="/Payroll" element={<Navigate to="/payroll" replace />} />
      <Route path="/payslip" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo", "management"]}> <PayslipPage /> </ProtectedRoute>} />
      <Route path="/Payslip" element={<Navigate to="/payslip" replace />} />
      <Route path="/payslips" element={<Navigate to="/payslip" replace />} />
      <Route path="/salary-slips" element={<Navigate to="/payslip" replace />} />
      <Route path="/salary-slip" element={<Navigate to="/payslip" replace />} />

      {/* 404 Page */}
      <Route path="*" element={<h2 className="text-center mt-4">Page Not Found</h2>} />
    </Routes>
  );
}
