import { Routes, Route, Navigate } from "react-router-dom";

// Auth Pages
import UnifiedLogin from "../pages/auth/UnifiedLogin";
import UnifiedRegister from "../pages/auth/UnifiedRegister";
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
import AdminAttendance from "../pages/Admin/AdminAttendance";
import HolidayManager from "../pages/Admin/HolidayManager";
import ManageEmployee from "../pages/Admin/ManageEmployee";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Holiday from "../pages/Apps/Holiday";
import Policies from "../pages/Apps/Policies";
import Schedule from "../pages/Apps/Schedule";
import Leave from "../pages/Apps/Leave";

// Employee Pages
import EmployeeDashboard from "../pages/Employee/EmployeeDashboard";
import EmployeeLeaveForm from "../pages/Employee/EmployeeLeave";
import EmployeeForm from "../pages/Employee/EmployeeForm";
import Employee from "../pages/Employee/Employee";
import Separation from "../pages/Apps/Separation";
import MyAttendance from "../components/Attendance/Attendance";

// Payroll Pages
import PayrollManagement from "../pages/Payroll/PayrollManagement";
import PayslipPage from "../pages/Payroll/PayslipPage";

// HOD Pages
import HODDashboard from "../pages/HOD/HODDashboard";

// Home Page
import Home from "../pages/Home";

// ✅ ProtectedRoute — checks both token presence and role authorization
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If not authorized for this role, redirect to Home page
    return <Navigate to="/" />;
  }

  return children;
};

export default function AppRoute() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<UnifiedLogin />} />
      <Route path="/register" element={<UnifiedRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* HR & Admin Restricted Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["hr"]}> <AdminDashboard /> </ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <MyAttendance /> </ProtectedRoute>} />
      <Route path="/admin/leaves" element={<ProtectedRoute allowedRoles={["hr", "admin", "accounts", "payroll"]}> <LeavesPage /> </ProtectedRoute>} />
      <Route path="/admin/manage-employees" element={<ProtectedRoute allowedRoles={["hr"]}> <Login /> </ProtectedRoute>} />
      <Route path="/admin/register-employee" element={<ProtectedRoute allowedRoles={["hr"]}> <Register /> </ProtectedRoute>} />

      <Route path="/hr-dashboard" element={<ProtectedRoute allowedRoles={["hr"]}> <HRDashboard /> </ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute allowedRoles={["hr"]}> <Onboarding /> </ProtectedRoute>} />
      <Route path="/recruitment" element={<ProtectedRoute allowedRoles={["hr"]}> <Recruitment /> </ProtectedRoute>} />
      <Route path="/manage-employee" element={<ProtectedRoute allowedRoles={["hr"]}> <ManageEmployee /> </ProtectedRoute>} />
      <Route path="/holidaymanager" element={<ProtectedRoute allowedRoles={["hr"]}> <HolidayManager /> </ProtectedRoute>} />
      <Route path="/holidays" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Holiday /> </ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Policies /> </ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Schedule /> </ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Leave /> </ProtectedRoute>} />
      
      {/* Employee Protected Routes */}
      <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={["employee"]}> <EmployeeDashboard /> </ProtectedRoute>} />
      <Route path="/employee/create" element={<ProtectedRoute allowedRoles={["employee"]}> <EmployeeForm /> </ProtectedRoute>} />
      <Route path="/employee/leave" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Leave /> </ProtectedRoute>} />
      <Route path="/employee/profile/:employeeid" element={<ProtectedRoute allowedRoles={["employee", "hr", "hod", "accounts"]}> <Employee /> </ProtectedRoute>} />

      {/* Accounts / Payroll Route (Accessible by Accounts, HR, Admin, and Employee) */}
      <Route path="/payroll" element={<ProtectedRoute allowedRoles={["accounts", "hr", "admin", "payroll", "employee"]}> <PayrollManagement /> </ProtectedRoute>} />
      
      {/* Payslip Route (Accessible by Everyone: HR/Accounts see all slips, Employees see their own slips) */}
      <Route path="/payslip" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "accounts", "payroll", "hod", "manager"]}> <PayslipPage /> </ProtectedRoute>} />

      {/* Departmental Head (HOD) Protected Routes (HOD and HR can review) */}
      <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={["hod", "manager", "hr"]}> <HODDashboard /> </ProtectedRoute>} />
      {/* <Route path="/hod-dashboard" element={<ProtectedRoute allowedRoles={["hod", "manager", "hr"]}> <HODDashboard /> </ProtectedRoute>} /> */}
      <Route path="/appraisal" element={<ProtectedRoute allowedRoles={["hod", "hr"]}> <Apprasial /> </ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute allowedRoles={["hod", "hr"]}> <InterviewForm /> </ProtectedRoute>} />

      {/* Resignation Submission / Clearance Form (Employee can submit, Lead/HOD/HR can clear) */}
      <Route path="/resignation" element={<ProtectedRoute allowedRoles={["employee", "hr", "admin", "hod", "manager", "teamlead", "accounts", "payroll", "hrmanager"]}> <Separation /> </ProtectedRoute>} />

      {/* 404 Page */}
      <Route path="*" element={<h2 className="text-center mt-4">Page Not Found</h2>} />
    </Routes>
  );
}
