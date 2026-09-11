import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { CiCircleAlert } from "react-icons/ci";
import { FiMenu, FiX, FiMail, FiLogOut, FiHash, FiGrid, FiChevronDown, FiSearch } from "react-icons/fi";
import {
  LuUser,
  LuTrendingUp,
  LuCalendar,
  LuWallet,
  LuFileText,
  LuCircleHelp,
  LuUsers,
  LuLogOut,
  LuShieldCheck,
  LuClock,
  LuActivity,
  LuGraduationCap,
  LuBriefcase,
  LuBadgeCheck,
  LuFileCheck,
  LuStethoscope,
  LuChartNoAxesColumn,
  LuAward,
  LuClipboardList,
  LuSparkles
} from "react-icons/lu";
import { SiGoogledocs } from "react-icons/si";
import { FaListCheck } from "react-icons/fa6";
import logo from "../../assets/zentelex-logo.png";
import toast from 'react-hot-toast';
import { TbPassword } from "react-icons/tb";


const ALL_APPS = [
  { id: "profile", title: "My Profile", icon: <LuUser className="text-blue-500" />, route: `/employee/profile`, roles: ["employee", "hr", "hod", "accounts"] },
  { id: "progression", title: "Progression", icon: <LuTrendingUp className="text-emerald-500" />, route: "/appraisal", roles: ["employee", "hr", "hod"] },
  { id: "warning", title: "Warning", icon: <CiCircleAlert className="text-amber-500" />, route: "/appraisal", roles: ["hr", "hod"] },
  { id: "schedule", title: "Schedule", icon: <LuCalendar className="text-purple-500" />, route: "/schedule", roles: ["employee", "hr", "hod", "accounts"] },
  { id: "salary_slip", title: "Salary Slip", icon: <LuWallet className="text-emerald-600" />, route: "/payslip", roles: ["employee", "hr", "accounts"] },
  { id: "kt", title: "Kat", icon: <LuFileText className="text-cyan-500" />, route: "/onboarding", roles: ["employee", "hr", "hod"] },
  { id: "question_bank", title: "Question Bank", icon: <SiGoogledocs className="text-indigo-500" />, route: "/interview", roles: ["hr", "hod"] },

  { id: "my_teams", title: "My Teams", icon: <LuUsers className="text-blue-600" />, route: "/admin/manage-employees", roles: ["hr", "hod", "accounts"] },
  { id: "separation", title: "Separation", icon: <LuLogOut className="text-red-500" />, route: "/resignation", roles: ["employee", "hr", "hod", "accounts"] },
  { id: "warning_latam", title: "Warning NA/LATAM", icon: <CiCircleAlert className="text-red-400" />, route: "/appraisal", roles: ["hr"] },
  { id: "leave", title: "Leave Management", icon: <LuCalendar className="text-teal-500" />, route: "/leave", roles: ["employee", "hr", "hod", "accounts"] },
  { id: "holidays", title: "Holiday Calendar", icon: <LuCalendar className="text-rose-500" />, route: "/holidays", roles: ["employee", "hr", "hod", "accounts"] },
  { id: "it_declaration", title: "IT Declaration", icon: <LuFileText className="text-blue-500" />, route: "/payroll", roles: ["employee", "hr", "accounts"] },
  { id: "process_updates", title: "Process Updates", icon: <LuActivity className="text-purple-600" />, route: "/onboarding", roles: ["employee", "hr", "hod"] },
  { id: "pms", title: "PMS", icon: <LuAward className="text-amber-600" />, route: "/appraisal", roles: ["employee", "hr", "hod"] },

  { id: "policies", title: "Policy", icon: <LuShieldCheck className="text-indigo-600" />, route: "/policies", roles: ["employee", "hr", "hod", "accounts"] },
  { id: "confirmation", title: "Confirmation", icon: <LuBadgeCheck className="text-emerald-600" />, route: "/admin/manage-employees", roles: ["hr"] },
  { id: "caf_nte", title: "CAF/NTE/NOD", icon: <LuFileCheck className="text-rose-500" />, route: "/admin/manage-employees", roles: ["hr"] },
  { id: "break_monitor", title: "Break Monitor", icon: <LuClock className="text-sky-500" />, route: "/attendance", roles: ["employee", "hr", "hod"] },
  { id: "mediclaim", title: "Mediclaim Card", icon: <LuStethoscope className="text-rose-600" />, route: "/employee/profile", roles: ["employee", "hr"] },
  { id: "pip", title: "PIP", icon: <FaListCheck className="text-violet-600" />, route: "/appraisal", roles: ["hr", "hod"] },
  { id: "misc_report", title: "Miscellaneous Report", icon: <LuClipboardList className="text-slate-600" />, route: "/admin/dashboard", roles: ["hr", "admin"] },

  { id: "recruitment", title: "Recruitment", icon: <LuBriefcase className="text-amber-600" />, route: "/recruitment", roles: ["hr"] },
  { id: "id_card", title: "ID-Card", icon: <LuUser className="text-teal-600" />, route: "/employee/profile", roles: ["employee", "hr"] },
  { id: "appraisal", title: "Appraisal / Revision", icon: <LuAward className="text-indigo-500" />, route: "/appraisal", roles: ["hr", "hod"] },
  { id: "att_reversal", title: "Attendance Reversal V2", icon: <LuClock className="text-blue-600" />, route: "/attendance", roles: ["hr", "accounts"] },
  { id: "level_up", title: "Level Up", icon: <LuSparkles className="text-yellow-500" />, route: "/appraisal", roles: ["employee", "hr"] },
  { id: "quality_report", title: "Quality Report", icon: <LuClipboardList className="text-slate-700" />, route: "/admin/dashboard", roles: ["hr", "hod"] },
];

const AppNavbar = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState(localStorage.getItem("role"));
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [employeeCode, setEmployeeCode] = useState(localStorage.getItem("empId") || "");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // All Apps Mega Dropdown State
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isMobileAppsOpen, setIsMobileAppsOpen] = useState(false);
  const [appSearch, setAppSearch] = useState("");

  const handleLogout = () => {
    toast.success("Logged out!");
    setTimeout(() => {
      navigate("/login");
    }, 500);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("employeeId");
    localStorage.removeItem("userName");
    localStorage.removeItem("email");
    localStorage.removeItem("empId");

    setRole(null);
    setIsLoggedIn(false);
    setUserName("");
    setEmail("");
    setEmployeeCode("");
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
    setIsAppsOpen(false);
    setIsMobileAppsOpen(false);

    navigate("/login");
  };

  const handleChangePassword = () => {
    navigate('/forgot-password');
  };

  useEffect(() => {
    const checkLogin = () => {
      const currentToken = localStorage.getItem("token");
      const currentRole = localStorage.getItem("role");
      const currentUserName = localStorage.getItem("userName") || "";
      const currentEmail = localStorage.getItem("email") || "";
      const currentEmpCode = localStorage.getItem("employeeCode") || localStorage.getItem("empId") || "";

      setIsLoggedIn(!!currentToken);
      setRole(currentRole);
      setUserName(currentUserName);
      setEmail(currentEmail);
      setEmployeeCode(currentEmpCode);
    };

    const closeDropdowns = (e) => {
      if (!e.target.closest(".profile-dropdown-container")) {
        setIsDropdownOpen(false);
      }
      if (!e.target.closest(".all-apps-container")) {
        setIsAppsOpen(false);
      }
    };

    const interval = setInterval(checkLogin, 1000);
    document.addEventListener("click", closeDropdowns);
    return () => {
      clearInterval(interval);
      document.removeEventListener("click", closeDropdowns);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case "hr":
        return "HR Manager";
      case "employee":
        return "Employee";
      case "accounts":
        return "Finance & Accounts";
      case "hod":
        return "Department Head";
      default:
        return r ? r.toUpperCase() : "User";
    }
  };

  const getRoleColor = (r) => {
    switch (r) {
      case "hr":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
      case "employee":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40";
      case "accounts":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40";
      case "hod":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  // 5 Top Primary Route Tabs per Role
  const getNavLinks = () => {
    const profRoute = employeeCode ? `/employee/profile/${employeeCode}` : "/employee/profile/me";
    switch (role) {
      case "employee":
        return [
          { to: "/employee/dashboard", label: "Dashboard" },
          { to: "/attendance", label: "My Attendance" },
          { to: "/employee/leave", label: "Apply Leave" },
          { to: "/resignation", label: "Resignation" },
          { to: profRoute, label: "My Profile" },
        ];
      case "hr":
        return [
          { to: "/admin/dashboard", label: "HR Dashboard" },
          { to: "/holidays", label: "Holidays" },
          { to: "/onboarding", label: "Onboarding" },
          { to: "/attendance", label: "Attendance" },
          { to: "/admin/leaves", label: "Leaves" },
        ];
      case "accounts":
        return [
          { to: "/payroll", label: "Payroll Dashboard" },
          { to: "/attendance", label: "Attendance" },
          { to: "/admin/leaves", label: "Leaves" },
          { to: "/resignation", label: "Resignation" },
          { to: profRoute, label: "My Profile" },
        ];
      case "hod":
        return [
          { to: "/hod/dashboard", label: "Dashboard" },
          { to: "/interview", label: "Candidate Evaluation" },
          { to: "/appraisal", label: "Team Appraisal" },
          { to: "/resignation", label: "Resignation" },
          { to: "/attendance", label: "Attendance" },
          { to: profRoute, label: "My Profile" },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  // Filter All Apps by Role & Search Keyword
  const filteredApps = ALL_APPS.filter((app) => {
    const matchesSearch = app.title.toLowerCase().includes(appSearch.toLowerCase());
    const matchesRole = !role || app.roles.includes(role);
    return matchesSearch && matchesRole;
  });

  const handleAppClick = (app) => {
    setIsAppsOpen(false);
    let route = app.route;

    // Role-based dynamic route handling for modules
    if (app.id === "profile" || app.id === "id_card" || app.id === "mediclaim") {
      route = `/employee/profile/${employeeCode || "me"}`;
    } else if (app.id === "leave") {
      route = role === "employee" ? "/employee/leave" : "/admin/leaves";
    } else if (app.id === "misc_report" || app.id === "quality_report") {
      route = role === "hr" ? "/admin/dashboard" : "/admin/dashboard";
    }

    navigate(route);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Left: Logo brand */}
          <div className="flex items-center">
            <Link to="/" className="flex flex-shrink-0 items-center">
              <img src={logo} alt="Zentelex" className="h-8 w-auto object-contain transition-transform duration-300 hover:scale-105" />
            </Link>
          </div>

          {/* Center: Desktop 5 Nav Tabs + ALL APPS Dropdown Button */}
          <div className="hidden md:flex md:items-center md:space-x-1 lg:space-x-2">
            {isLoggedIn &&
              navLinks.map((link) => (
                <NavLink key={link.to} to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isActive
                      ? "text-blue-600 no-underline dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/20"
                      : "text-slate-600 no-underline hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

            {/* ALL APPS MEGA DROPDOWN BUTTON (Desktop) */}
            {isLoggedIn && (
              <div className="relative all-apps-container ml-1">
                <button
                  type="button"
                  onClick={() => setIsAppsOpen(!isAppsOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 border ${
                    isAppsOpen
                      ? "bg-slate-100 text-blue-600 border-blue-300 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-800 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                  }`}
                >
                  <FiGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>All Apps</span>
                  <FiChevronDown className={`h-4 w-4 transition-transform duration-200 ${isAppsOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}
          </div>

          {/* Right menu (Desktop): Profile or Login Button */}
          <div className="hidden md:flex md:items-center">
            {isLoggedIn ? (
              <div className="relative group py-2 profile-dropdown-container">
                {/* Profile Trigger Button */}
                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md border-2 border-white dark:border-slate-800 hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                    {getInitials(userName)}
                  </div>
                </button>

                {/* Profile Popup Card */}
                <div className={`absolute right-0 top-full mt-1 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-300 ease-out transform dark:border-slate-800 dark:bg-slate-900 z-50 ${isDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
                  }`}>
                  <div className="flex flex-col items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-base font-bold text-white shadow-inner mb-2">
                      {getInitials(userName)}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-center truncate w-full">
                      {userName || "User"}
                    </h3>
                    <span
                      className={`mt-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getRoleColor(
                        role
                      )}`}
                    >
                      {getRoleLabel(role)}
                    </span>
                  </div>

                  <div className="py-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <FiMail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate" title={email}>
                        {email || "No email linked"}
                      </span>
                    </div>
                    {employeeCode && (
                      <div className="flex items-center gap-2">
                        <FiHash className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">ID: {employeeCode}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-yellow-100 dark:border-slate-800">
                    <button onClick={handleChangePassword}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-yellow-600 transition-colors hover:bg-yellow-50 hover:text-yellow-700 dark:bg-slate-800 dark:text-yellow-400 dark:hover:bg-yellow-950/30 dark:hover:text-yellow-300"
                    >
                      <TbPassword className="h-3.5 w-3.5" />
                      Change Password
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    >
                      <FiLogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm no-underline font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ALL APPS MEGA PANEL (Desktop Only) */}
      {isAppsOpen && (
        <div className="hidden md:flex all-apps-container fixed top-[70px] left-1/2 -translate-x-1/2 w-[min(780px,94vw)] origin-top rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 z-50 flex-col">
          {/* Header Bar: Search Input & Close button */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex-grow max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search App..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                autoFocus
              />
            </div>
            <button
              onClick={() => setIsAppsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Apps Grid */}
          {filteredApps.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No modules found matching "{appSearch}"
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-y-2.5 gap-x-4 max-h-[380px] overflow-y-auto pr-1">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleAppClick(app)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/70 group"
                >
                  <span className="text-base flex-shrink-0 group-hover:scale-110 transition-transform">
                    {app.icon}
                  </span>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400 truncate">
                    {app.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer/Menu Overlay Panel */}
      {isMobileMenuOpen && (
        <div className="fixed top-16 inset-x-0 z-50 md:hidden max-h-[calc(100vh-4.5rem)] overflow-y-auto border-b border-slate-200 bg-white/98 backdrop-blur-md shadow-2xl rounded-b-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/98">
          <div className="space-y-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/98">
            {isLoggedIn ? (
              <>
                {navLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-base font-medium transition-all duration-150 ${isActive
                        ? "text-blue-600 dark:text-blue-400 no-underline bg-blue-50/70 dark:bg-blue-950/30"
                        : "text-slate-600 hover:text-slate-900 no-underline hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}

                {/* Mobile All Apps Accordion Section */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 all-apps-container">
                  <button
                    type="button"
                    onClick={() => setIsMobileAppsOpen(!isMobileAppsOpen)}
                    className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-base font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FiGrid className="text-blue-600 dark:text-blue-400" />
                      All Apps
                    </span>
                    <FiChevronDown className={`transition-transform duration-200 ${isMobileAppsOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isMobileAppsOpen && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="relative mb-2.5">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search App..."
                          value={appSearch}
                          onChange={(e) => setAppSearch(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {filteredApps.length === 0 ? (
                          <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                            No modules found matching "{appSearch}"
                          </div>
                        ) : (
                          filteredApps.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => {
                                handleAppClick(app);
                                setIsMobileMenuOpen(false);
                                setIsMobileAppsOpen(false);
                              }}
                              className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer text-xs transition-colors"
                            >
                              <span className="text-base flex-shrink-0">{app.icon}</span>
                              <span className="truncate text-slate-700 dark:text-slate-200 font-medium">{app.title}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Profile info card */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-sm font-bold text-white shadow">
                      {getInitials(userName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {userName || "User"}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {email}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getRoleColor(
                        role
                      )}`}
                    >
                      {getRoleLabel(role)}
                    </span>
                  </div>

                  {employeeCode && (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400">
                      <FiHash className="h-3.5 w-3.5" />
                      <span>Employee ID: {employeeCode}</span>
                    </div>
                  )}

                  <div className="mt-2 px-3">
                    <button onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <FiLogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="px-3 py-2">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-sm no-underline font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AppNavbar;