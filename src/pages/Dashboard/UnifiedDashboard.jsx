import React, { useState, useEffect } from "react";
import { Container, Spinner, Badge } from "react-bootstrap";
import CommonAttendanceTop from "./components/CommonAttendanceTop";
import EmployeeModulesView from "./components/EmployeeModulesView";
import HRAdminDashboardView from "./components/HRAdminDashboardView";
import AccountsDashboardView from "./components/AccountsDashboardView";
import HODDashboardView from "./components/HODDashboardView";
import api, { getUploadUrl } from "../../api/axios";

export default function UnifiedDashboard() {
  const [loader, setLoader] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [tickingTime, setTickingTime] = useState(new Date());

  // Determine role: default from localStorage
  const storedRole = (localStorage.getItem("role") || "employee").toLowerCase();
  const [currentRole, setCurrentRole] = useState(storedRole);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTickingTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employee profile & attendance logs
  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");
    const empId = localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";

    // 1. Fetch Employee Profile
    try {
      const res = await api.get(`/employee/${empId || "me"}`);
      const emp = res.data?.employee || res.data?.data || res.data;
      if (emp && (emp.name || emp.employee_id || emp.email)) {
        const liveStatus = emp.status || "Active";
        localStorage.setItem("status", liveStatus);
        localStorage.setItem("tabs_enabled", emp.tabs_enabled ? "true" : "false");
        localStorage.setItem("reporting_manager", emp.reporting_manager || "");
        if (emp.enabled_tabs !== undefined && emp.enabled_tabs !== null) {
          localStorage.setItem("enabled_tabs", String(emp.enabled_tabs));
        }

        const photoUrl = emp.profile_photo
          ? getUploadUrl(emp.profile_photo)
          : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

        setEmployee({
          name: localStorage.getItem("userName") || emp.name || "Employee",
          empId: emp.employee_id || empId,
          designation: emp.designation || localStorage.getItem("designation") || "Staff",
          email: localStorage.getItem("email") || emp.email || "N/A",
          phone: localStorage.getItem("phone") || emp.phone_no || "N/A",
          department: emp.dept || emp.department || "General",
          joiningDate: emp.joining_date || "N/A",
          reportTo: emp.reporting_manager || null,
          status: liveStatus,
          tabs_enabled: emp.tabs_enabled === true || emp.tabs_enabled === "true",
          enabled_tabs: emp.enabled_tabs !== undefined ? emp.enabled_tabs : localStorage.getItem("enabled_tabs"),
          avatar: photoUrl,
        });
      }
    } catch {
      const cachedPhoto = localStorage.getItem("profile_photo");
      const photoUrl = cachedPhoto
        ? getUploadUrl(cachedPhoto)
        : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

      setEmployee({
        name: localStorage.getItem("userName") || "Employee",
        empId: localStorage.getItem("empId") || "N/A",
        designation: localStorage.getItem("designation") || "Staff",
        email: localStorage.getItem("email") || "N/A",
        phone: localStorage.getItem("phone") || "N/A",
        department: localStorage.getItem("department") || "General",
        joiningDate: localStorage.getItem("joining_date") || "N/A",
        reportTo: localStorage.getItem("reporting_manager") || null,
        status: localStorage.getItem("status") || "Active",
        tabs_enabled: localStorage.getItem("tabs_enabled") === "true",
        enabled_tabs: localStorage.getItem("enabled_tabs") || null,
        avatar: photoUrl,
      });
    } finally {
      setLoader(false);
    }

    // 2. Fetch Personal Attendance Logs for Current Month
    try {
      const res = await api.get("/attendance?range=month&scope=my");
      if (res.data?.success) {
        const logs = res.data.data || res.data.logs || [];
        setAttendanceLogs(logs);
      }
    } catch (err) {
      console.error("Error fetching logs for dashboard:", err);
    }

    // 3. Fetch Pending Leaves count
    try {
      const res = await api.get("/leave");
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        const pending = data.filter((l) => l.status === "Pending").length;
        setPendingLeavesCount(pending);
      }
    } catch {
      setPendingLeavesCount(0);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Determine active view based on role
  const isHrOrAdmin = currentRole === "hr" || currentRole === "admin";
  const isAccounts = currentRole === "accounts" || currentRole === "payroll";
  const isHod = currentRole === "hod" || currentRole === "manager";
  const isEmployee = !isHrOrAdmin && !isAccounts && !isHod;

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
      className="pb-12 pt-4"
    >
      {/* Global Dashboard Styles */}
      <style>{`
        .dash-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          transition: all 0.25s ease;
        }
        .dash-card:hover {
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.05);
        }
        .top-widget-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          transition: all 0.25s ease;
        }
        .top-widget-card:hover {
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.05);
        }
        .hover-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important;
          border-color: rgba(37, 99, 235, 0.2) !important;
        }
        .btn-details {
          font-size: 11px;
          font-weight: 700;
          color: #6366f1;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        .btn-details:hover {
          text-decoration: underline;
        }
        .table-custom {
          margin-bottom: 0;
          font-size: 13px;
        }
        .table-custom thead th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 16px;
        }
        .table-custom tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }
        .role-switch-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .role-switch-btn.active {
          background-color: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }
        .role-switch-btn:not(.active) {
          background-color: #ffffff;
          color: #64748b;
          border-color: #e2e8f0;
        }
        .role-switch-btn:not(.active):hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }
      `}</style>

      <Container fluid className="px-4 max-w-7xl mx-auto">
        {/* ============================================================ */}
        {/* COMMON TOP SECTION (IDENTICAL FOR ALL ROLES)                */}
        {/* ============================================================ */}
        <CommonAttendanceTop
          employee={employee}
          attendanceLogs={attendanceLogs}
          tickingTime={tickingTime}
          onStatusChange={fetchDashboardData}
        />

        {/* ============================================================ */}
        {/* ROLE-BASED OPERATIONAL MODULES (BELOW COMMON TOP SECTION)   */}
        {/* ============================================================ */}

        {/* 1. REGULAR EMPLOYEE: 13 Workspace Modules Grid */}
        {isEmployee && <EmployeeModulesView employee={employee || {}} />}

        {/* 2. HR / ADMIN: 4 KPIs + 2 Analytics Charts + Employee Directory */}
        {isHrOrAdmin && <HRAdminDashboardView />}

        {/* 3. ACCOUNTS / PAYROLL: 4 Financial Cards + Operations Hub */}
        {isAccounts && <AccountsDashboardView />}

        {/* 4. HOD / DEPT HEAD: Approval Center + Team Overview + Shifts + OKRs + Direct Reports */}
        {isHod && <HODDashboardView />}
      </Container>
    </div>
  );
}
