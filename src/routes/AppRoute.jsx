import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { isTokenExpired, clearAuthSession, initTokenExpiryWatcher } from "../utils/auth";

// Auth Pages
import UnifiedLogin from "../pages/auth/UnifiedLogin";
import ForgotPassword from "../pages/auth/ForgotPassword";

// HR Pages
import HRDashboard from "../pages/HR/HRDashboard";
import Recruitment from "../pages/HR/Recruitment";
import Onboarding from "../pages/HR/onboarding";
import InterviewForm from "../pages/HR/InterviewForm";
import Apprasial from "../pages/HR/Appraisal";

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

// ✅ ProtectedRoute — checks token presence, expiry validity, and role authorization
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Check if token is absent or has expired
  if (!token || isTokenExpired(token)) {
    if (token) {
      clearAuthSession();
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If not authorized for this role, redirect to Home page
    return <Navigate to="/" replace />;
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
      {/* <Route path="/accounts-dashboard" element={<Navigate to="/accounts/dashboard" replace />} /> */}
      <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={["hod", "manager", "hr", "admin"]}> <UnifiedDashboard /> </ProtectedRoute>} />
      {/* <Route path="/hod-dashboard" element={<Navigate to="/hod/dashboard" replace />} /> */}

      {/* HR & Admin Restricted Routes */}
      <Route path="/attendance" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <MyAttendance /> </ProtectedRoute>} />
      <Route path="/admin/attendance" element={<Navigate to="/attendance" replace />} />
      <Route path="/admin/leaves" element={<ProtectedRoute allowedRoles={["hr", "admin", "accounts", "payroll"]}> <LeavesPage /> </ProtectedRoute>} />
      <Route path="/admin/manage-employees" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "accounts"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/admin/register-employee" element={<ProtectedRoute allowedRoles={["hr"]}> <Register /> </ProtectedRoute>} />

      <Route path="/hr-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/onboarding" element={<ProtectedRoute allowedRoles={["hr"]}> <Onboarding /> </ProtectedRoute>} />
      <Route path="/recruitment" element={<ProtectedRoute allowedRoles={["hr"]}> <Recruitment /> </ProtectedRoute>} />
      <Route path="/manage-employee" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "accounts"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/admin/manage-employee" element={<ProtectedRoute allowedRoles={["hr", "admin", "hod", "accounts"]}> <ManageEmployees /> </ProtectedRoute>} />
      <Route path="/holidaymanager" element={<ProtectedRoute allowedRoles={["hr"]}> <HolidayManager /> </ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Holiday /> </ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Policies /> </ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Schedule /> </ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Leave /> </ProtectedRoute>} />
      <Route path="/employee/leave" element={<Navigate to="/leave" replace />} />
      
      {/* Profile Routes (Mapped to Apps/Profile.jsx) */}
      <Route path="/employee/profile/:employeeid" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}><Profile /></ProtectedRoute>} />
      <Route path="/appraisal" element={<ProtectedRoute allowedRoles={["hod", "hr"]}> <Apprasial /> </ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute allowedRoles={["hod", "hr"]}> <InterviewForm /> </ProtectedRoute>} />

      {/* Resignation Submission / Clearance Form (Employee can submit, Lead/HOD/HR can clear) */}
      <Route path="/resignation" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Separation /> </ProtectedRoute>} />

      {/* IT Declaration (Income Tax Declaration) for all employees */}
      <Route path="/it-declaration" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <IT_Declaration /> </ProtectedRoute>} />
      <Route path="/apps/it-declaration" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <IT_Declaration /> </ProtectedRoute>} />

      {/* Corporate ID Card & Documents for all employees */}
      <Route path="/id-card" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <ID_Card /> </ProtectedRoute>} />
      <Route path="/apps/id-card" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <ID_Card /> </ProtectedRoute>} />

      {/* Corporate Mediclaim & Health Insurance for all employees and HR/Admin */}
      <Route path="/mediclaim" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Mediclaim /> </ProtectedRoute>} />
      {/* <Route path="/apps/mediclaim" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Mediclaim /> </ProtectedRoute>} /> */}

      {/* Profile Routes Fallbacks */}
      <Route path="/employee/profile" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}><Profile /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}><Profile /></ProtectedRoute>} />

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
