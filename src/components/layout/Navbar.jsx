import React, { useEffect, useState } from "react";
import logo from '../../assets/zentelex-logo.png';
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { CiCircleAlert } from "react-icons/ci";
import { FiMenu, FiX, FiMail, FiLogOut, FiHash, FiGrid, FiChevronDown, FiSearch, FiClock } from "react-icons/fi";
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
  LuSparkles,
  LuReceipt,
  LuUserCheck,
  LuPartyPopper,
  LuSun,
  LuMoon,
  LuLaptop,
} from "react-icons/lu";
import { SiGoogledocs } from "react-icons/si";
import { FaListCheck } from "react-icons/fa6";
import {
  clearAuthSession,
  getCookie,
  setCookie,
  getAuthToken,
  getAuthRole,
  getAuthUser,
  getAuthDesignation,
  isLeadershipDesignation,
  isDepartmentHeadOrManager
} from "../../utils/auth";
import { getThemeSetting, getActiveTheme, setTheme, cycleTheme } from "../../utils/theme";
import { TbPassword } from "react-icons/tb";
import api, { getUploadUrl } from "../../api/axios";
import ChangePasswordModal from "../common/ChangePasswordModal";
import DailyAttendanceNoticeModal from "../common/DailyAttendanceNoticeModal";

const ALL_STAFF_ROLES = [
  "employee", "hr", "accounts", "payroll", "hod", "admin", "manager", "teamlead", "ceo", "coo", "cto", "cfo", "vp", "secretary", "management", "hrmanager"
];

const ALL_APPS = [
  {
    id: "app_dashboard",
    title: "Dashboard",
    tabId: null,
    icon: <LuTrendingUp className="text-blue-500" />,
    route: "/employee/dashboard",
    roles: ALL_STAFF_ROLES,
    keywords: ["home", "dashboard", "overview", "analytics", "stats"],
  },
  {
    id: "app_attendance",
    title: "Attendance Tracker",
    tabId: 1,
    icon: <LuCalendar className="text-emerald-500" />,
    route: "/attendance",
    roles: ALL_STAFF_ROLES,
    keywords: ["attendance", "tracker", "attendance tracking", "clock in", "check in", "roster", "logs", "timesheet", "checkin"],
  },
  {
    id: "app_leave",
    title: "Leave Requests",
    tabId: 2,
    icon: <LuFileText className="text-teal-500" />,
    route: "/leave",
    roles: ALL_STAFF_ROLES,
    keywords: ["leave", "leaves", "leave requests", "leave management", "apply leave", "vacation", "pto", "holiday leave", "time off", "absence"],
  },
  {
    id: "app_payroll_mgmt",
    title: "Payroll & Salary",
    tabId: 3,
    icon: <LuWallet className="text-emerald-600" />,
    route: "/payroll",
    roles: ALL_STAFF_ROLES,
    keywords: ["payroll", "salary", "payroll management", "tax", "compensation", "salary structure", "ctc"],
  },
  {
    id: "app_profile",
    title: "Profile & Documents",
    tabId: 4,
    icon: <LuUser className="text-indigo-500" />,
    route: "/profile",
    roles: ALL_STAFF_ROLES,
    keywords: ["profile", "my profile", "user", "personal", "account", "details", "info", "documents", "files"],
  },
  {
    id: "app_interview",
    title: "Candidate Evaluation",
    tabId: 5,
    icon: <SiGoogledocs className="text-indigo-600" />,
    route: "/interview",
    roles: ALL_STAFF_ROLES,
    keywords: ["interview", "candidate", "candidate evaluation", "evaluation", "assessment", "question bank", "scorecard"],
  },
  {
    id: "app_appraisal",
    title: "Performance Appraisal",
    tabId: 6,
    icon: <LuTrendingUp className="text-indigo-500" />,
    route: "/appraisal",
    roles: ALL_STAFF_ROLES,
    keywords: ["appraisal", "performance", "performance appraisal", "review", "scorecard", "evaluation", "rating"],
  },
  {
    id: "app_training",
    title: "Training Modules",
    tabId: 7,
    icon: <LuGraduationCap className="text-cyan-600" />,
    route: "/training",
    roles: ALL_STAFF_ROLES,
    keywords: ["training", "learning", "modules", "training modules", "training & development", "induction", "skills", "onboarding courses", "assessments", "certifications"],
  },
  {
    id: "app_it_declaration",
    title: "IT Declaration",
    tabId: 8,
    icon: <LuReceipt className="text-blue-600" />,
    route: "/it-declaration",
    roles: ALL_STAFF_ROLES,
    keywords: ["it declaration", "income tax", "tds", "tax saving", "regime", "80c", "form 16", "investments", "tax"],
  },
  {
    id: "app_id_card",
    title: "ID-Card & Documents",
    tabId: 9,
    icon: <LuBadgeCheck className="text-cyan-600" />,
    route: "/id-card",
    roles: ALL_STAFF_ROLES,
    keywords: ["id", "id card", "id-card", "documents", "identity", "aadhaar", "pan", "badge", "corporate id"],
  },
  {
    id: "app_mediclaim",
    title: "Mediclaim & Health Insurance",
    tabId: 10,
    icon: <LuStethoscope className="text-rose-600" />,
    route: "/mediclaim",
    roles: ALL_STAFF_ROLES,
    keywords: ["mediclaim", "medical", "insurance", "health", "health insurance", "hospital", "claims", "coverage", "card"],
  },
  {
    id: "app_holidays",
    title: "Holiday Calendar",
    tabId: 11,
    icon: <LuCalendar className="text-rose-500" />,
    route: "/holidays",
    roles: ALL_STAFF_ROLES,
    keywords: ["holiday", "calendar", "festival", "off days", "events", "holiday calendar"],
  },
  {
    id: "app_policies",
    title: "Company Policies",
    tabId: 12,
    icon: <LuShieldCheck className="text-blue-600" />,
    route: "/policies",
    roles: ALL_STAFF_ROLES,
    keywords: ["policy", "policies", "rules", "compliance", "handbook", "guidelines", "terms", "company policies"],
  },
  {
    id: "app_resignation",
    title: "Separation & Resignation",
    tabId: 13,
    icon: <LuLogOut className="text-red-500" />,
    route: "/resignation",
    roles: ALL_STAFF_ROLES,
    keywords: ["resignation", "separation", "exit", "quit", "clearance", "separation & resignation"],
  },
  {
    id: "app_payslip",
    title: "Salary Slips (Payslips)",
    tabId: 14,
    icon: <LuFileCheck className="text-purple-600" />,
    route: "/payslip",
    roles: ALL_STAFF_ROLES,
    keywords: ["salary", "slip", "payslip", "payslips", "salary slips", "earnings", "wage", "pay", "slips"],
  },
  {
    id: "app_kpi_hub",
    title: "Performance KPI",
    tabId: 15,
    icon: <LuAward className="text-amber-600" />,
    route: "/kpi",
    roles: ALL_STAFF_ROLES,
    keywords: ["kpi", "goals", "performance kpi", "kpi & goal tracker", "appraisal", "performance", "pms", "progression", "review", "rating", "scorecard", "evaluation"],
  },
  {
    id: "app_schedule",
    title: "Work Schedule & Roster",
    tabId: 16,
    icon: <LuClock className="text-orange-500" />,
    route: "/schedule",
    roles: ALL_STAFF_ROLES,
    keywords: ["schedule", "duty", "roster", "shift", "shift timings", "timetable", "work schedule & roster"],
  },
  {
    id: "app_requisition",
    title: "Job Requisition Desk",
    tabId: 17,
    icon: <LuBriefcase className="text-cyan-600" />,
    route: "/requisition",
    roles: ALL_STAFF_ROLES,
    keywords: ["requisition", "hiring", "cv", "resume", "candidates", "jobs", "desk", "shortlisting", "job requisition desk"],
  },
  {
    id: "app_onboarding",
    title: "Employee Onboarding",
    tabId: 18,
    icon: <LuUserCheck className="text-violet-600" />,
    route: "/onboarding",
    roles: ALL_STAFF_ROLES,
    keywords: ["onboarding", "joining", "induction", "training", "probation", "assets", "documentation", "permanent", "employee onboarding"],
  },
  {
    id: "app_hr_events",
    title: "HR Events & Townhalls",
    tabId: 19,
    icon: <LuPartyPopper className="text-pink-600" />,
    route: "/hr-events",
    roles: ALL_STAFF_ROLES,
    keywords: ["event", "events", "hr events", "townhall", "townhalls", "celebration", "meeting", "gathering", "presentation", "announcements", "hr events & townhalls"],
  },
  {
    id: "app_admin_tasks",
    title: "Admin Tasks & Facilities",
    tabId: 20,
    icon: <FaListCheck className="text-slate-700" />,
    route: "/admin/tasks",
    roles: ALL_STAFF_ROLES,
    keywords: ["admin", "unofficial", "tasks", "office", "maintenance", "facilities", "supplies", "logistics", "courier", "cleaning", "admin tasks & facilities"],
  },
  {
    id: "app_claims",
    title: "Claims & Reimbursement",
    tabId: 21,
    icon: <LuReceipt className="text-emerald-600" />,
    route: "/claims",
    roles: ALL_STAFF_ROLES,
    keywords: ["claim", "claims", "reimbursement", "expenses", "travel claim", "bills", "receipts", "travel expense", "finance claim", "voucher", "claims & reimbursement"],
  },
  {
    id: "app_manage_emp",
    title: "Employee Directory",
    tabId: null,
    icon: <LuUsers className="text-blue-600" />,
    route: "/hr/manage-employees",
    roles: ["hr", "admin", "hod", "manager", "accounts", "ceo", "coo", "management"],
    keywords: ["manage", "employees", "directory", "staff", "team", "people", "my teams"],
  },
  {
    id: "app_accounts_dash",
    title: "Accounts Dashboard",
    tabId: null,
    icon: <LuTrendingUp className="text-emerald-500" />,
    route: "/accounts/dashboard",
    roles: ["accounts", "payroll", "ceo", "management"],
    keywords: ["accounts", "finance", "billing", "dashboard", "ledger"],
  },
];

const HONORIFICS = new Set([
  "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "miss", "dr", "dr.",
  "prof", "prof.", "er", "er.", "mx", "mx.", "shri", "smt", "sir", "madam"
]);

const getCleanNameParts = (name) => {
  if (!name) return [];
  const parts = name.trim().split(/\s+/);
  while (parts.length > 0 && HONORIFICS.has(parts[0].toLowerCase())) {
    parts.shift();
  }
  return parts;
};

// Helpers for daily attendance notice tracking and acknowledgement
const getDailyNoticeUserKey = () => {
  if (typeof window === "undefined") return "user";
  const fromCookie = getCookie("employeeCode");
  if (fromCookie) return String(fromCookie).trim();

  try {
    const u = getAuthUser();
    if (u && (u.employee_code || u.employee_id || u.id)) {
      return String(u.employee_code || u.employee_id || u.id).trim();
    }
  } catch (_) { }

  const fromLocal = localStorage.getItem("employeeCode");
  if (fromLocal) return String(fromLocal).trim();

  return "user";
};

const getTodayISTString = () => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  } catch (_) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
};

const isNoticeAcknowledged = (userKey) => {
  // 1. Check user profile object in auth cookie/session
  try {
    const u = getAuthUser();
    if (u && (u.notice_acknowledged === true || u.notice_acknowledged === "true")) {
      return true;
    }
  } catch (_) { }

  // 2. Check permanent cookie
  const cookieVal = getCookie(`hrms_notice_ack_${userKey}`);
  if (cookieVal === "true") return true;

  // 3. Check localStorage
  try {
    if (localStorage.getItem(`hrms_notice_ack_${userKey}`) === "true") {
      return true;
    }
  } catch (_) { }

  return false;
};

const saveDailyNoticeAcknowledged = (userKey) => {
  // 1. Persist in permanent cookie (10-year expiry)
  try {
    setCookie(`hrms_notice_ack_${userKey}`, "true", { expires: 3650, path: "/" });
  } catch (_) { }

  // 2. Persist in localStorage
  try {
    localStorage.setItem(`hrms_notice_ack_${userKey}`, "true");
  } catch (_) { }

  // 3. Update current user cookie object
  try {
    const u = getAuthUser();
    if (u) {
      u.notice_acknowledged = true;
      setCookie("user", u);
    }
  } catch (_) { }

  // 4. Save to backend database for permanent cross-device persistence
  try {
    api.post("/acknowledge-notice").catch((err) => {
      console.warn("Server notice acknowledge sync:", err?.message);
    });
  } catch (_) { }
};

const isNoticeSessionDismissed = (userKey) => {
  try {
    const sessionKey = `hrms_notice_session_dismissed_${userKey}`;
    return sessionStorage.getItem(sessionKey) === "true";
  } catch (_) {
    return false;
  }
};

const saveDailyNoticeSessionDismissed = (userKey) => {
  try {
    const sessionKey = `hrms_notice_session_dismissed_${userKey}`;
    sessionStorage.setItem(sessionKey, "true");
  } catch (_) { }
};

const AppNavbar = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState(getAuthRole() || localStorage.getItem("role"));
  const [isLoggedIn, setIsLoggedIn] = useState(!!(getAuthToken() || localStorage.getItem("token")));
  const [themeSetting, setThemeSetting] = useState(() => getThemeSetting());
  const [currentTheme, setCurrentTheme] = useState(() => getActiveTheme());

  // Keep theme state synchronized with document and storage events
  useEffect(() => {
    const handleThemeChange = (e) => {
      const setting = e?.detail?.setting || getThemeSetting();
      const resolved = e?.detail?.theme || getActiveTheme();
      setThemeSetting(setting);
      setCurrentTheme(resolved);
    };
    window.addEventListener("hrms-theme-changed", handleThemeChange);
    return () => window.removeEventListener("hrms-theme-changed", handleThemeChange);
  }, []);

  const handleCycleTheme = (e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    const next = cycleTheme();
    setThemeSetting(next);
    setCurrentTheme(getActiveTheme());
  };

  const handleSelectTheme = (mode, e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    setTheme(mode);
    setThemeSetting(mode);
    setCurrentTheme(getActiveTheme());
  };
  const [userName, setUserName] = useState(getCookie("userName") || localStorage.getItem("userName") || "");
  const [email, setEmail] = useState(getCookie("email") || localStorage.getItem("email") || "");
  const [employeeCode, setEmployeeCode] = useState(getCookie("employeeCode") || localStorage.getItem("employeeCode") || "");
  const [profilePhoto, setProfilePhoto] = useState(getCookie("profile_photo") || localStorage.getItem("profile_photo") ||
    (() => {
      try {
        return (getAuthUser() || JSON.parse(localStorage.getItem("user") || "{}")).profile_photo || "";
      } catch (_) {
        return "";
      }
    })()
  );
  const [imgError, setImgError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // All Apps Mega Dropdown State
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isMobileAppsOpen, setIsMobileAppsOpen] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [isDailyNoticeOpen, setIsDailyNoticeOpen] = useState(false);

  // Synced employee tabs state
  const [enabledTabsState, setEnabledTabsState] = useState(() => {
    const rawLocal = localStorage.getItem("enabled_tabs");
    if (rawLocal !== null && rawLocal !== undefined) return rawLocal;
    const userObj = getAuthUser();
    return userObj?.enabled_tabs || null;
  });
  const [tabsEnabledState, setTabsEnabledState] = useState(() => {
    const rawLocal = localStorage.getItem("tabs_enabled");
    if (rawLocal !== null && rawLocal !== undefined) return rawLocal === "true";
    const userObj = getAuthUser();
    return userObj?.tabs_enabled !== undefined
      ? (userObj.tabs_enabled === true || userObj.tabs_enabled === "true")
      : false;
  });

  // Proactively refresh user's latest tab permissions configured by HR
  const refreshEmployeeTabs = async () => {
    const token = getAuthToken() || localStorage.getItem("token");
    if (!token) return;

    try {
      const code = getCookie("employeeCode") || localStorage.getItem("employeeCode") || "me";
      const res = await api.get(`/employee/${code}`);
      const emp = res.data?.employee || res.data?.data || res.data;
      if (emp) {
        if (emp.enabled_tabs !== undefined && emp.enabled_tabs !== null) {
          const tabsStr = String(emp.enabled_tabs);
          setEnabledTabsState(tabsStr);
          localStorage.setItem("enabled_tabs", tabsStr);
        }
        if (emp.tabs_enabled !== undefined) {
          const flag = emp.tabs_enabled === true || emp.tabs_enabled === "true";
          setTabsEnabledState(flag);
          localStorage.setItem("tabs_enabled", flag ? "true" : "false");
        }
      }
    } catch (_) { }
  };

  const location = useLocation();

  // Trigger attendance notice popup on login until explicitly acknowledged with Understood
  useEffect(() => {
    if (!isLoggedIn) return;
    if (typeof window === "undefined") return;

    // Do not show on auth pages
    const path = location.pathname.toLowerCase();
    if (path === "/login" || path === "/register" || path === "/forgot-password") return;

    try {
      const userKey = getDailyNoticeUserKey();
      const acknowledged = isNoticeAcknowledged(userKey);
      const sessionDismissed = isNoticeSessionDismissed(userKey);

      // Once acknowledged, NEVER display on any login!
      if (acknowledged) {
        setIsDailyNoticeOpen(false);
        return;
      }

      // Appears on portal login until acknowledged by clicking the Understood button
      if (!sessionDismissed) {
        // Small delay so page content smoothly renders first
        const timer = setTimeout(() => {
          setIsDailyNoticeOpen(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn("Daily notice check warning:", e);
    }
  }, [isLoggedIn, location.pathname]);

  // Explicitly acknowledged by clicking "Understood & Enter Dashboard"
  const handleAcknowledgeDailyNotice = () => {
    try {
      const userKey = getDailyNoticeUserKey();
      saveDailyNoticeAcknowledged(userKey);
      toast.success("Attendance protocol acknowledged", {
        id: "daily-notice-ack",
        duration: 2500,
      });
    } catch (e) {
      console.warn("Daily notice acknowledge warning:", e);
    }
    setIsDailyNoticeOpen(false);
  };

  // Merely dismissed via "X", Escape, backdrop, or "Skip" without acknowledging
  const handleDismissDailyNotice = () => {
    try {
      const userKey = getDailyNoticeUserKey();
      // Only dismiss for the current browsing session; permanent acknowledgement is NOT recorded!
      saveDailyNoticeSessionDismissed(userKey);
    } catch (e) {
      // ignore
    }
    setIsDailyNoticeOpen(false);
  };

  // Reset image error state whenever profilePhoto string changes
  useEffect(() => {
    setImgError(false);
  }, [profilePhoto]);
  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    try {
      await api.post("/logout");
    } catch (_) { }

    clearAuthSession();

    setRole(null);
    setIsLoggedIn(false);
    setUserName("");
    setEmail("");
    setEmployeeCode("");
    setProfilePhoto("");
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
    setIsAppsOpen(false);
    setIsMobileAppsOpen(false);
    setIsDailyNoticeOpen(false);

    window.dispatchEvent(new Event("authChanged"));
    try {
      toast.success("Logged out!");
    } catch (_) { }

    navigate("/login", { replace: true });
    // Guarantee authoritative navigation to login page
    setTimeout(() => {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }, 100);
  };

  const handleChangePassword = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setIsChangePasswordOpen(true);
  };

  useEffect(() => {
    const checkLogin = () => {
      const currentToken = getAuthToken() || localStorage.getItem("token");
      const currentRole = getAuthRole() || localStorage.getItem("role");
      const currentUserName = getCookie("userName") || localStorage.getItem("userName") || "";
      const currentEmail = getCookie("email") || localStorage.getItem("email") || "";
      const currentEmpCode = getCookie("employeeCode") || localStorage.getItem("employeeCode") || "";
      const currentPhoto = getCookie("profile_photo") || localStorage.getItem("profile_photo") || (() => {
        try {
          return (getAuthUser() || JSON.parse(localStorage.getItem("user") || "{}")).profile_photo || "";
        } catch (_) {
          return "";
        }
      })();

      const nextLoggedIn = !!currentToken;
      setIsLoggedIn((prev) => (prev !== nextLoggedIn ? nextLoggedIn : prev));
      setRole((prev) => (prev !== currentRole ? currentRole : prev));
      setUserName((prev) => (prev !== currentUserName ? currentUserName : prev));
      setEmail((prev) => (prev !== currentEmail ? currentEmail : prev));
      setEmployeeCode((prev) => (prev !== currentEmpCode ? currentEmpCode : prev));
      setProfilePhoto((prev) => (prev !== currentPhoto ? currentPhoto : prev));

      // Synchronize configured dashboard modules
      const localTabs = localStorage.getItem("enabled_tabs");
      const userObj = getAuthUser();
      const currentTabs = localTabs !== null && localTabs !== undefined ? localTabs : userObj?.enabled_tabs;
      const localTabsFlag = localStorage.getItem("tabs_enabled");
      const currentTabsFlag = localTabsFlag !== null && localTabsFlag !== undefined
        ? (localTabsFlag === "true")
        : (userObj?.tabs_enabled === true || userObj?.tabs_enabled === "true");
      setEnabledTabsState((prev) => (prev !== currentTabs ? currentTabs : prev));
      setTabsEnabledState((prev) => (prev !== currentTabsFlag ? currentTabsFlag : prev));
    };

    const handleProfileUpdate = (e) => {
      const p = e.detail?.profile_photo || localStorage.getItem("profile_photo") || "";
      setProfilePhoto(p);
      setImgError(false);
    };

    const handleTabsUpdated = (e) => {
      checkLogin();
      if (e.detail?.enabled_tabs !== undefined) {
        setEnabledTabsState(e.detail.enabled_tabs);
      }
    };

    const closeDropdowns = (e) => {
      if (!e.target.closest(".profile-dropdown-container")) {
        setIsDropdownOpen(false);
      }
      if (!e.target.closest(".all-apps-container")) {
        setIsAppsOpen(false);
      }
    };

    refreshEmployeeTabs();

    const interval = setInterval(checkLogin, 2500);
    document.addEventListener("click", closeDropdowns);
    window.addEventListener("profileUpdated", handleProfileUpdate);
    window.addEventListener("authChanged", checkLogin);
    window.addEventListener("storage", checkLogin);
    window.addEventListener("tabsUpdated", handleTabsUpdated);

    return () => {
      clearInterval(interval);
      document.removeEventListener("click", closeDropdowns);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("authChanged", checkLogin);
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("tabsUpdated", handleTabsUpdated);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = getCleanNameParts(name);
    if (parts.length === 0) return name.trim().charAt(0).toUpperCase() || "U";
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getRoleLabel = (r) => {
    const desig = getAuthDesignation() || "";
    switch (r) {
      case "management":
      case "ceo":
      case "coo":
      case "cto":
      case "cfo":
      case "vp":
      case "chro":
      case "vphr":
      case "secretary":
        return desig || "Management";
      case "admin":
        return "Admin (Operations)";
      case "hr":
      case "hrmanager":
        return desig || "HR Manager";
      case "accounts":
        return desig || "Finance & Accounts";
      case "payroll":
        return desig || "Payroll Specialist";
      case "hod":
        return desig || "Department Head";
      case "manager":
        return desig || "Manager";
      case "teamlead":
        return desig || "Team Lead";
      case "employee":
      case "employees":
        return desig || "Employee";
      default:
        return desig || (r ? r.toUpperCase() : "User");
    }
  };

  const getRoleColor = (r) => {
    const desig = getAuthDesignation() || "";
    if (isLeadershipDesignation(desig)) {
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40";
    }
    switch (r) {
      case "management":
      case "ceo":
      case "coo":
      case "cto":
      case "cfo":
      case "vp":
      case "secretary":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40";
      case "admin":
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
      case "hr":
      case "hrmanager":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
      case "employee":
      case "employees":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40";
      case "accounts":
      case "payroll":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40";
      case "hod":
      case "manager":
      case "teamlead":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  // 5 Top Primary Route Tabs per Role
  const getNavLinks = () => {
    const profRoute = employeeCode ? `/profile/${employeeCode}` : "/profile/me";
    switch (role) {
      case "management":
      case "ceo":
      case "coo":
      case "cto":
      case "cfo":
      case "vp":
      case "secretary":
        return [
          { to: "/management/dashboard", label: "Executive Dashboard" },
          { to: "/attendance", label: "Attendance" },
          { to: "/claims", label: "Claims Oversight" },
          { to: "/requisition", label: "Requisitions" },
          { to: "/payroll", label: "Payroll Overview" },
        ];
      case "admin":
        return [
          { to: "/admin/tasks", label: "Unofficial Tasks" },
          { to: "/attendance", label: "My Attendance" },
          { to: "/leave", label: "Leaves" },
          { to: profRoute, label: "My Profile" },
        ];
      case "hr":
      case "hrmanager":
        return [
          { to: "/hr/dashboard", label: "Dashboard" },
          { to: "/attendance", label: "Attendance" },
          { to: "/hr/manage-employees", label: "Manage Staff" },
          { to: "/requisition", label: "Requisition" },
          // { to: "/hr-events", label: "HR Events" },
          // { to: "/claims", label: "Claims Oversight" },
          // { to: "/onboarding", label: "Onboarding" },
        ];
      case "accounts":
      case "payroll":
        if (isDepartmentHeadOrManager()) {
          return [
            { to: "/accounts/dashboard", label: "Accounts Desk" },
            { to: "/payroll", label: "Payroll" },
            { to: "/attendance", label: "Attendance" },
            { to: "/requisition", label: "Requisition" },
            { to: "/it-declaration", label: "IT Declarations" },
          ];
        }
        return [
          { to: "/accounts/dashboard", label: "Accounts Desk" },
          { to: "/payroll", label: "Payroll" },
          { to: "/attendance", label: "Attendance" },
          { to: "/it-declaration", label: "IT Declarations" },
          // { to: "/claims", label: "Claims & Payouts" },
        ];
      case "employee":
      case "employees":
        // for HOD, TEAM LEAD, MANAGER
        if (isDepartmentHeadOrManager()) {
          return [
            { to: "/hod/dashboard", label: "Dashboard" },
            { to: "/attendance", label: "Attendance" },
            { to: "/requisition", label: "Requisition" },
            // { to: "/schedule", label: "Department Shifts" },
            { to: profRoute, label: "My Profile" },
          ];
        }
        return [
          { to: "/employee/dashboard", label: "Dashboard" },
          { to: "/attendance", label: "My Attendance" },
          { to: "/leave", label: "Leaves" },
          // { to: "/claims", label: "My Claims" },
          { to: profRoute, label: "My Profile" },
        ];
      case "hod":
      case "manager":
      case "teamlead":
        return [
          { to: "/hod/dashboard", label: "Dashboard" },
          { to: "/attendance", label: "Attendance" },
          { to: "/claims", label: "Team Claims" },
          { to: "/requisition", label: "Requisition" },
          { to: "/schedule", label: "Department Shifts" },
          { to: profRoute, label: "My Profile" },
        ];
      default:
        if (isDepartmentHeadOrManager()) {
          return [
            { to: "/hod/dashboard", label: "Dashboard" },
            { to: "/attendance", label: "Attendance" },
            { to: "/requisition", label: "Requisition" },
            { to: "/schedule", label: "Department Shifts" },
            { to: profRoute, label: "My Profile" },
          ];
        }
        return [
          { to: "/employee/dashboard", label: "Dashboard" },
          { to: "/attendance", label: "Attendance" },
          { to: "/leave", label: "Leaves" },
          { to: "/claims", label: "My Claims" },
          { to: profRoute, label: "My Profile" },
        ];
    }
  };

  const navLinks = getNavLinks();

  // Filter All Apps strictly by active Role, Search Keyword & Employee's Configured Tabs
  const rawRole = (role || "").toLowerCase();
  const userRole = rawRole === "employees" ? "employee" : rawRole;
  const searchTrimmed = appSearch.trim().toLowerCase();

  // Retrieve the configured tab IDs set by HR (via enabled_tabs / tabs_enabled)
  const configuredTabIds = (() => {
    // 1. If tabs_enabled is true, full access to all 20 modules
    const isFullAccess =
      tabsEnabledState === true ||
      tabsEnabledState === "true" ||
      (() => {
        const raw = localStorage.getItem("tabs_enabled");
        if (raw !== null && raw !== undefined) return raw === "true";
        const u = getAuthUser();
        return u?.tabs_enabled === true || u?.tabs_enabled === "true";
      })();

    if (isFullAccess) {
      return new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    }

    // 2. Read explicit enabled_tabs set by HR
    let rawTabs = localStorage.getItem("enabled_tabs");
    if (rawTabs === undefined || rawTabs === null) {
      rawTabs = enabledTabsState;
    }
    if (rawTabs === undefined || rawTabs === null) {
      const u = getAuthUser();
      rawTabs =
        u?.enabled_tabs !== undefined && u?.enabled_tabs !== null
          ? u.enabled_tabs
          : null;
    }

    if (rawTabs !== undefined && rawTabs !== null) {
      if (typeof rawTabs === "string") {
        const trimmed = rawTabs.trim();
        if (trimmed === "") return new Set(); // Explicitly cleared by HR
        return new Set(
          trimmed
            .split(",")
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !isNaN(id))
        );
      } else if (Array.isArray(rawTabs)) {
        return new Set(rawTabs.map(Number).filter((id) => !isNaN(id)));
      }
    }

    // 3. Fallback standard default tabs if not explicitly set
    return new Set([1, 2, 3, 4, 8, 9, 10, 11, 12, 14, 16, 21]);
  })();

  const filteredApps = ALL_APPS.filter((app) => {
    // Only display the exact modules configured by HR (matching individual dashboard)
    if (!app.tabId || !configuredTabIds.has(app.tabId)) {
      return false;
    }

    if (!searchTrimmed) return true;
    const matchesTitle = app.title.toLowerCase().includes(searchTrimmed);
    const matchesKeywords = app.keywords ? app.keywords.some((k) => k.toLowerCase().includes(searchTrimmed)) : false;
    return matchesTitle || matchesKeywords;
  });

  const handleAppClick = (app) => {
    setIsAppsOpen(false);
    setIsMobileAppsOpen(false);
    setAppSearch("");

    let route = app.route;

    // Role-based dynamic route resolution
    if (app.id === "app_dashboard") {
      if (["management", "ceo", "coo", "cto", "cfo", "vp", "secretary"].includes(userRole)) route = "/management/dashboard";
      else if (["admin"].includes(userRole)) route = "/admin/tasks";
      else if (["hr", "hrmanager"].includes(userRole)) route = "/hr/dashboard";
      else if (["accounts", "payroll"].includes(userRole)) route = "/accounts/dashboard";
      else if (["hod", "manager", "teamlead"].includes(userRole)) route = "/hod/dashboard";
      else route = "/employee/dashboard";
    } else if (app.id === "app_profile") route = `/profile/${employeeCode || "me"}`;
    else if (app.id === "app_mediclaim") route = "/mediclaim";
    else if (app.id === "app_claims") route = "/claims";
    else if (app.id === "app_leave") {
      route = ["hr", "ceo", "coo", "management"].includes(userRole) ? "/hr/leaves" : "/leave";
    }

    navigate(route);
  };

  if (location.pathname.startsWith("/offer-acceptance")) {
    return null;
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
                  onClick={() => {
                    const next = !isAppsOpen;
                    setIsAppsOpen(next);
                    if (next) refreshEmployeeTabs();
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 border ${isAppsOpen
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

          {/* Right menu (Desktop): Global Theme Toggle + Profile or Login Button */}
          <div className="hidden md:flex md:items-center md:gap-3">
            {/* Global Theme Toggle Button */}
            <button
              type="button"
              onClick={handleCycleTheme}
              aria-label={`Theme: ${themeSetting} mode (currently ${currentTheme})`}
              title={`Theme: ${themeSetting === "system" ? "System Default" : themeSetting === "dark" ? "Dark Mode" : "Light Mode"} (click to cycle)`}
              className="relative flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer group"
            >
              {themeSetting === "system" ? (
                <LuLaptop className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110" />
              ) : currentTheme === "dark" ? (
                <LuMoon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 text-amber-400" />
              ) : (
                <LuSun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 text-amber-500" />
              )}
            </button>

            {isLoggedIn ? (
              <div className="relative group py-2 profile-dropdown-container">
                {/* Profile Trigger Button */}
                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
                >
                  {profilePhoto && !imgError ? (
                    <img
                      src={getUploadUrl(profilePhoto)}
                      alt={userName || "Profile"}
                      className="h-9 w-9 rounded-full object-cover shadow-md border-2 border-white dark:border-slate-800 hover:shadow-lg transition-all duration-200"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md border-2 border-white dark:border-slate-800 hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                      {getInitials(userName)}
                    </div>
                  )}
                </button>

                {/* Profile Popup Card */}
                <div className={`profile-dropdown-card absolute right-0 top-full mt-1 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-300 ease-out transform dark:border-slate-800 dark:!bg-slate-900 z-50 ${isDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
                  }`}>
                  <div className="flex flex-col items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    {profilePhoto && !imgError ? (
                      <img
                        src={getUploadUrl(profilePhoto)}
                        alt={userName || "Profile"}
                        className="h-14 w-14 rounded-full object-cover shadow-inner mb-2 border-2 border-blue-500/20"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-base font-bold text-white shadow-inner mb-2">
                        {getInitials(userName)}
                      </div>
                    )}
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

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Theme Mode Segmented Selector */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 p-1.5 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="flex items-center justify-between px-1.5 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                        <span>Theme</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold lowercase">
                          {themeSetting === "system" ? `auto (${currentTheme})` : themeSetting}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleSelectTheme("light", e)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${themeSetting === "light"
                            ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          title="Light Mode"
                        >
                          <LuSun className="h-3.5 w-3.5 text-amber-500" />
                          <span>Light</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleSelectTheme("dark", e)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${themeSetting === "dark"
                            ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          title="Dark Mode"
                        >
                          <LuMoon className="h-3.5 w-3.5 text-indigo-500 dark:text-amber-400" />
                          <span>Dark</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleSelectTheme("system", e)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${themeSetting === "system"
                            ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          title="System Default (Sync with OS)"
                        >
                          <LuLaptop className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                          <span>Auto</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleChangePassword}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-blue-400"
                    >
                      <TbPassword className="h-3.5 w-3.5" />
                      Change Password
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 cursor-pointer"
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

          {/* Mobile action area: Global Theme Toggle + Hamburger menu */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={handleCycleTheme}
              aria-label={`Theme: ${themeSetting}`}
              title={`Theme: ${themeSetting === "system" ? "System Default" : themeSetting === "dark" ? "Dark Mode" : "Light Mode"}`}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-amber-400 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            >
              {themeSetting === "system" ? (
                <LuLaptop className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : currentTheme === "dark" ? (
                <LuMoon className="h-5 w-5 text-amber-400" />
              ) : (
                <LuSun className="h-5 w-5 text-amber-500" />
              )}
            </button>
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
          {/* Header Bar: Search Input, Role Badge & Close button */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex-grow max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search App or Module..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                autoFocus
              />
              {appSearch && (
                <button
                  type="button"
                  onClick={() => setAppSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Clear search"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {getRoleLabel(role)} ({filteredApps.length})
              </span>
              <button
                onClick={() => {
                  setIsAppsOpen(false);
                  setAppSearch("");
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                title="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Apps Grid */}
          {filteredApps.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No modules found matching "{appSearch}"
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-y-2.5 gap-x-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredApps.map((app) => (
                <div
                  key={app.id} title={app.title}
                  onClick={() => handleAppClick(app)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-400 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80 dark:hover:border-blue-500 group shadow-xs"
                >
                  <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                    {app.icon}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400 truncate">
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
                    onClick={() => {
                      const next = !isMobileAppsOpen;
                      setIsMobileAppsOpen(next);
                      if (next) refreshEmployeeTabs();
                    }}
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
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search App..."
                          value={appSearch}
                          onChange={(e) => setAppSearch(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 pl-8 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {appSearch && (
                          <button
                            type="button"
                            onClick={() => setAppSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            title="Clear search"
                          >
                            <FiX className="h-3.5 w-3.5" />
                          </button>
                        )}
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
                    {profilePhoto && !imgError ? (
                      <img
                        src={getUploadUrl(profilePhoto)}
                        alt={userName || "Profile"}
                        className="h-10 w-10 rounded-full object-cover shadow border border-slate-200"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-sm font-bold text-white shadow">
                        {getInitials(userName)}
                      </div>
                    )}
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

                  <div className="mt-2 px-3 space-y-2">
                    {/* Theme Mode Segmented Selector (Mobile) */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 p-1.5 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="flex items-center justify-between px-1.5 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                        <span>Theme Mode</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold lowercase">
                          {themeSetting === "system" ? `auto (${currentTheme})` : themeSetting}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleSelectTheme("light", e)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${themeSetting === "light"
                            ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          title="Light Mode"
                        >
                          <LuSun className="h-4 w-4 text-amber-500" />
                          <span>Light</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleSelectTheme("dark", e)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${themeSetting === "dark"
                            ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          title="Dark Mode"
                        >
                          <LuMoon className="h-4 w-4 text-indigo-500 dark:text-amber-400" />
                          <span>Dark</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleSelectTheme("system", e)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${themeSetting === "system"
                            ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            }`}
                          title="System Default (Sync with OS)"
                        >
                          <LuLaptop className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          <span>Auto</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleChangePassword}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-blue-400"
                    >
                      <TbPassword className="h-4 w-4" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Daily Attendance Guidelines Modal */}
      <DailyAttendanceNoticeModal
        isOpen={isDailyNoticeOpen}
        onClose={handleDismissDailyNotice}
        onAcknowledge={handleAcknowledgeDailyNotice}
      />
    </nav>
  );
};

export default AppNavbar;