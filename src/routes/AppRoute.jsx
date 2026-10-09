import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  isTokenExpired,
  clearAuthSession,
  initTokenExpiryWatcher,
  handleSessionExpired,
  getAuthToken,
  getAuthRole,
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

// ✅ ProtectedRoute — checks token presence, expiry validity, and role authorization
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = getAuthToken() || localStorage.getItem("token");
  const rawRole = getAuthRole() || localStorage.getItem("role") || "";
  const role = rawRole.toLowerCase().trim();

  // Check if token is absent or has expired
  if (!token || isTokenExpired(token)) {
    if (token) {
      handleSessionExpired();
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());
    if (!normalizedAllowed.includes(role)) {
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

      {/* Unified Role-Based Dashboard Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["hr", "admin"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/accounts/dashboard" element={<ProtectedRoute allowedRoles={["accounts", "payroll", "admin"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={["hod", "manager", "hr", "admin"]}> <UnifiedDashboard /> </ProtectedRoute>} />

      {/* HR & Admin Restricted Routes */}
      <Route path="/attendance" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <MyAttendance /> </ProtectedRoute>} />
      <Route path="/admin/attendance" element={<Navigate to="/attendance" replace />} />
      <Route path="/admin/leaves" element={<ProtectedRoute allowedRoles={["hr", "admin", "accounts", "payroll"]}> <LeavesPage /> </ProtectedRoute>} />
      <Route path="/admin/manage-employees" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "accounts"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/admin/register-employee" element={<ProtectedRoute allowedRoles={["hr"]}> <Register /> </ProtectedRoute>} />

      <Route path="/requisition" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager"]}> <Requisition /> </ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo"]}> <Onboarding /> </ProtectedRoute>} />
      <Route path="/onboarding/:id" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager", "ceo", "coo"]}> <Onboarding /> </ProtectedRoute>} />
      {/* <Route path="/recruitment" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "manager", "teamlead", "ceo", "coo", "hrmanager"]}> <Recruitment /> </ProtectedRoute>} /> */}
      <Route path="/interview" element={<ProtectedRoute allowedRoles={["employee", "hod", "hr", "admin", "manager", "hrmanager"]}> <InterviewForm /> </ProtectedRoute>} />
      <Route path="/interview/:candidateId" element={<ProtectedRoute allowedRoles={["employee", "hod", "hr", "admin", "manager", "hrmanager"]}> <InterviewForm /> </ProtectedRoute>} />
      <Route path="/manage-employee" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "accounts"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/admin/manage-employee" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "accounts"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/holidaymanager" element={<ProtectedRoute allowedRoles={["hr"]}> <HolidayManager /> </ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Holiday /> </ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Policies /> </ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Schedule /> </ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Leave /> </ProtectedRoute>} />

      <Route path="/profile/:employeeid" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}><Profile /></ProtectedRoute>} />
      <Route path="/kpi" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <PerformanceKPI /> </ProtectedRoute>} />
      <Route path="/appraisal" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Appraisal /> </ProtectedRoute>} />
      <Route path="/resignation" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Separation /> </ProtectedRoute>} />
      <Route path="/it-declaration" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <IT_Declaration /> </ProtectedRoute>} />
      <Route path="/id-card" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <ID_Card /> </ProtectedRoute>} />
      <Route path="/mediclaim" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Mediclaim /> </ProtectedRoute>} />

      {/* Payroll Management & Salary Slips (Payslips) */}
      <Route path="/payroll" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <PayrollManagement /> </ProtectedRoute>} />
      <Route path="/Payroll" element={<Navigate to="/payroll" replace />} />
      <Route path="/payslip" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <PayslipPage /> </ProtectedRoute>} />
      <Route path="/Payslip" element={<Navigate to="/payslip" replace />} />
      <Route path="/payslips" element={<Navigate to="/payslip" replace />} />
      <Route path="/salary-slips" element={<Navigate to="/payslip" replace />} />
      <Route path="/salary-slip" element={<Navigate to="/payslip" replace />} />

      {/* 404 Page */}
      <Route path="*" element={<h2 className="text-center mt-4">Page Not Found</h2>} />
    </Routes>
  );
}
