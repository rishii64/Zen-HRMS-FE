import React, { useState, useEffect } from "react";
import {
  LuFileSpreadsheet,
  LuDownload,
  LuFileText,
  LuCalendar,
  LuSearch,
  LuPrinter,
  LuShieldCheck,
  LuCircleCheck,
  LuCopy,
  LuRefreshCw,
  LuUsers,
  LuLandmark,
  LuDollarSign,
  LuPercent,
  LuBuilding2,
  LuCheck,
  LuExternalLink,
  LuLock,
  LuLayers,
  LuBadgePercent,
  LuInfo,
  LuSlidersHorizontal,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { getAuthRole, getAuthEmployeeCode } from "../../utils/auth";

// Corporate & Administrative Roles authorized for Statutory Company Returns
const CORPORATE_ROLES = [
  "hr",
  "admin",
  "accounts",
  "payroll",
  "finance",
  "management",
  "ceo",
  "coo",
  "hrmanager",
];

/**
 * Custom Tab-Specific Animated Loader Component
 */
function StatutoryCustomLoader({ activeTab, selectedMonth, selectedFY, selectedQuarter, selectedEmpId }) {
  const getLoaderMeta = () => {
    switch (activeTab) {
      case "pf_ecr":
        return {
          title: "Compiling EPFO Electronic Challan cum Return (ECR) #~# Ledger...",
          subtitle: `Validating 12-digit UANs, capping EPF/EDLI wages at ₹15,000, deriving 12% EE & 8.33% EPS shares from salary structures for ${selectedMonth}...`,
          icon: LuLandmark,
          accentGradient: "from-blue-600 to-indigo-700",
          ringColor: "border-indigo-500",
          step1: "Reading User Salary Structure & Pay Registers",
          step2: "Applying EPFO Statutory Caps & A/c 1/10/21 Rules",
          step3: "Formatting 11-Column Unified Portal #~# File",
        };
      case "esic":
        return {
          title: "Compiling Monthly ESIC Return (Form 5 IP Wage Registers)...",
          subtitle: `Filtering eligible insured persons (Gross Wages ≤ ₹21,000 threshold), mapping 0.75% employee & 3.25% employer contributions for ${selectedMonth}...`,
          icon: LuBuilding2,
          accentGradient: "from-emerald-600 to-teal-700",
          ringColor: "border-emerald-500",
          step1: "Extracting Gross Earnings & Paid Attendance Days",
          step2: "Checking Statutory ₹21,000 Wage Ceiling Eligibility",
          step3: "Computing 0.75% EE & 3.25% ER Portal CSV Output",
        };
      case "form16":
        return {
          title: "Computing Annual Tax Deductions & Reconciling Form 16 (Sec 203)...",
          subtitle: `Aggregating 12-month salary breakdown, standard deduction ₹50,000, Chapter VI-A & OLTAS Part A challans for FY ${selectedFY}...`,
          icon: LuFileText,
          accentGradient: "from-amber-600 to-indigo-700",
          ringColor: "border-amber-500",
          step1: "Mapping Annual Basic, HRA & Allowance Structure",
          step2: "Computing Section 16, 80C/80D Deductions & Tax Slabs",
          step3: "Generating Digitally Verified Part A & Part B Certificate",
        };
      case "form24q":
      default:
        return {
          title: "Aggregating Quarterly Section 192 TDS Challan Records...",
          subtitle: `Building Annexure I corporate deductor challans and Annexure II employee deductee tax ledgers for ${selectedQuarter} (${selectedFY})...`,
          icon: LuFileSpreadsheet,
          accentGradient: "from-purple-600 to-indigo-700",
          ringColor: "border-purple-500",
          step1: "Aggregating Quarterly Salary Disbursements & TDS",
          step2: "Reconciling BSR Code & Challan Serial Deposits",
          step3: "Formatting Section 200(3) Compliance Statement",
        };
    }
  };

  const meta = getLoaderMeta();
  const Icon = meta.icon;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 my-6">
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Animated Icon Orb */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing Outer Rings */}
          <div className="absolute w-28 h-28 rounded-full bg-indigo-50 animate-ping opacity-60"></div>
          <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-indigo-400 animate-spin" style={{ animationDuration: "8s" }}></div>
          <div className="absolute w-20 h-20 rounded-full bg-slate-100 animate-pulse"></div>

          {/* Central Branded Icon */}
          <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-tr ${meta.accentGradient} text-white flex items-center justify-center shadow-lg shadow-indigo-200 z-10 transform transition-transform duration-500`}>
            <Icon className="w-8 h-8" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>Realtime Statutory Pipeline</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {meta.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            {meta.subtitle}
          </p>
        </div>

        {/* Dynamic Animated Steps Bar */}
        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3 text-left">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Execution Milestones</span>
            <span className="text-indigo-600 font-mono">Processing...</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                <LuCircleCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 line-clamp-1">{meta.step1}</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-indigo-50 border border-indigo-200 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                <LuRefreshCw className="w-3.5 h-3.5 animate-spin" />
              </div>
              <span className="text-xs font-semibold text-indigo-900 line-clamp-1">{meta.step2}</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 opacity-60">
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <span className="text-xs font-medium text-slate-400 line-clamp-1">{meta.step3}</span>
            </div>
          </div>

          {/* Animated Gradient Shimmer Bar */}
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 rounded-full animate-pulse w-3/4 transition-all duration-1000"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatutoryReports() {
  const currentRole = (getAuthRole() || "").toLowerCase().trim();
  const currentEmpId = getAuthEmployeeCode() || "EMP001";
  const isCorporateRole = CORPORATE_ROLES.includes(currentRole);

  // Tab State: Non-corporate regular employees are locked to Form 16
  const [activeTab, setActiveTab] = useState(isCorporateRole ? "pf_ecr" : "form16");
  const [loading, setLoading] = useState(false);

  // Filters & Selectors
  const [selectedMonth, setSelectedMonth] = useState("March 2026");
  const [selectedFY, setSelectedFY] = useState("2025-2026");
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedEmpId, setSelectedEmpId] = useState(currentEmpId);
  const [employeeList, setEmployeeList] = useState([]);

  // Data states
  const [pfData, setPfData] = useState(null);
  const [esicData, setEsicData] = useState(null);
  const [form16Data, setForm16Data] = useState(null);
  const [form24qData, setForm24qData] = useState(null);
  const [copiedEcr, setCopiedEcr] = useState(false);

  // Month options for PF and ESIC
  const monthOptions = [
    "March 2026",
    "February 2026",
    "January 2026",
    "December 2025",
    "November 2025",
    "October 2025",
    "September 2025",
    "August 2025",
  ];

  // RBAC safety check: if non-corporate user lands on restricted tab, reroute to Form 16
  useEffect(() => {
    if (!isCorporateRole && activeTab !== "form16") {
      setActiveTab("form16");
    }
  }, [isCorporateRole, activeTab]);

  // Fetch employees list for Form 16 selector (only needed for corporate roles)
  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const res = await api.get("/employees");
        const list = res.data?.data || res.data?.employees || [];
        if (Array.isArray(list) && list.length > 0) {
          setEmployeeList(list);
          if (isCorporateRole && !selectedEmpId) {
            setSelectedEmpId(list[0].employee_id || list[0].employee_code);
          }
        }
      } catch (err) {
        // Fallback or ignore
      }
    };
    if (isCorporateRole) {
      fetchEmps();
    } else {
      setSelectedEmpId(currentEmpId);
    }
  }, [isCorporateRole, currentEmpId]);

  // Fetch PF ECR
  const fetchPfEcr = async () => {
    if (!isCorporateRole) return;
    try {
      setLoading(true);
      const res = await api.get("/statutory/pf-ecr", {
        params: { month: selectedMonth },
      });
      if (res.data?.success) {
        setPfData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load PF ECR report");
    } finally {
      setLoading(false);
    }
  };

  // Fetch ESIC Return
  const fetchEsicReturn = async () => {
    if (!isCorporateRole) return;
    try {
      setLoading(true);
      const res = await api.get("/statutory/esic", {
        params: { month: selectedMonth },
      });
      if (res.data?.success) {
        setEsicData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load ESIC monthly return");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Form 16 Data
  const fetchForm16 = async () => {
    const targetId = isCorporateRole ? (selectedEmpId || currentEmpId) : currentEmpId;
    if (!targetId) return;
    try {
      setLoading(true);
      const res = await api.get(`/statutory/form16/${targetId}`, {
        params: { financial_year: selectedFY },
      });
      if (res.data?.success) {
        setForm16Data(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load Form 16");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Form 24Q Summary
  const fetchForm24Q = async () => {
    if (!isCorporateRole) return;
    try {
      setLoading(true);
      const res = await api.get("/statutory/form24q", {
        params: { quarter: selectedQuarter, financial_year: selectedFY },
      });
      if (res.data?.success) {
        setForm24qData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load Form 24Q summary");
    } finally {
      setLoading(false);
    }
  };

  // Reload when tab or key filters change
  useEffect(() => {
    if (activeTab === "pf_ecr" && isCorporateRole) {
      fetchPfEcr();
    } else if (activeTab === "esic" && isCorporateRole) {
      fetchEsicReturn();
    } else if (activeTab === "form16") {
      fetchForm16();
    } else if (activeTab === "form24q" && isCorporateRole) {
      fetchForm24Q();
    }
  }, [activeTab, selectedMonth, selectedFY, selectedQuarter, selectedEmpId, isCorporateRole]);

  // Copy raw ECR text to clipboard
  const handleCopyEcr = () => {
    if (pfData?.ecr_raw_text) {
      navigator.clipboard.writeText(pfData.ecr_raw_text);
      setCopiedEcr(true);
      toast.success("PF ECR #~# text copied to clipboard!");
      setTimeout(() => setCopiedEcr(false), 2000);
    }
  };

  // Download PF ECR Text File (.txt)
  const handleDownloadPfEcr = () => {
    if (!isCorporateRole) {
      toast.error("Restricted: Download requires Corporate HR or Finance authorization.");
      return;
    }
    const baseURL = api.defaults.baseURL || "/api/auth";
    const downloadUrl = `${baseURL}/statutory/pf-ecr?month=${encodeURIComponent(selectedMonth)}&download=true`;
    window.open(downloadUrl, "_blank");
  };

  // Download ESIC CSV
  const handleDownloadEsicCsv = () => {
    if (!isCorporateRole) {
      toast.error("Restricted: Download requires Corporate HR or Finance authorization.");
      return;
    }
    const baseURL = api.defaults.baseURL || "/api/auth";
    const downloadUrl = `${baseURL}/statutory/esic?month=${encodeURIComponent(selectedMonth)}&download=true`;
    window.open(downloadUrl, "_blank");
  };

  // Download Form 24Q CSV
  const handleDownloadForm24Q = () => {
    if (!isCorporateRole) {
      toast.error("Restricted: Download requires Corporate HR or Finance authorization.");
      return;
    }
    const baseURL = api.defaults.baseURL || "/api/auth";
    const downloadUrl = `${baseURL}/statutory/form24q?quarter=${selectedQuarter}&financial_year=${encodeURIComponent(selectedFY)}&download=true`;
    window.open(downloadUrl, "_blank");
  };

  // Handle Tab Change with RBAC Guard
  const handleTabChange = (targetTab) => {
    if (!isCorporateRole && targetTab !== "form16") {
      toast.error("Access Restricted: Company statutory returns (PF ECR, ESIC, Form 24Q) are reserved for HR & Finance administrators.", {
        icon: "🔒",
      });
      return;
    }
    setActiveTab(targetTab);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Top Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <LuFileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Statutory Compliance & Return Generators
                </h1>
                {isCorporateRole ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Admin / Finance Mode
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Employee Self-Service
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {isCorporateRole
                  ? "EPFO ECR #~# text upload, ESIC monthly returns, Form 16 annual certificates & Form 24Q TDS summaries"
                  : "View and download your official Section 203 Form 16 annual income tax deduction certificate"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === "pf_ecr") fetchPfEcr();
                else if (activeTab === "esic") fetchEsicReturn();
                else if (activeTab === "form16") fetchForm16();
                else fetchForm24Q();
              }}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh Report Data"
            >
              <LuRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* RBAC Notice Banner */}
        {!isCorporateRole ? (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-800">
            <LuInfo className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <strong>Employee Self-Service Mode:</strong> You have direct access to your personal Form 16 annual tax certificate. Company-wide PF ECR (#~#), ESIC monthly returns, and Form 24Q filings are strictly managed by Corporate HR & Finance.
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-2.5">
              <LuShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Corporate Statutory Access Active:</strong> Mapped directly to configured salary structures (Basic 45%, HRA 40%, Conveyance, Medical, Allowances, PF, ESI, PT & TDS).
              </span>
            </div>
            <span className="font-mono text-[11px] text-indigo-600 font-bold shrink-0">
              EPFO: WB/CAL/0045892/000
            </span>
          </div>
        )}

        {/* Tab Navigation & Contextual Filters (Adaptive Dual Row Layout) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-3">
          {/* ROW 1: Tabs across full width */}
          <div className="w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-xl">
              {/* Tab 1: PF ECR */}
              <button
                onClick={() => handleTabChange("pf_ecr")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-center ${activeTab === "pf_ecr"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : isCorporateRole
                    ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    : "text-slate-400 opacity-60 cursor-not-allowed"
                  }`}
              >
                <span>PF ECR Text Format (.txt)</span>
                {!isCorporateRole && <LuLock className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {/* Tab 2: ESIC Return */}
              <button
                onClick={() => handleTabChange("esic")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-center ${activeTab === "esic"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : isCorporateRole
                    ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    : "text-slate-400 opacity-60 cursor-not-allowed"
                  }`}
              >
                <span>ESIC Monthly Return (.csv)</span>
                {!isCorporateRole && <LuLock className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              {/* Tab 3: Form 16 */}
              <button
                onClick={() => handleTabChange("form16")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-center ${activeTab === "form16"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
              >
                <span>{isCorporateRole ? "Form 16 Certificate (Sec 203)" : "My Form 16 Certificate"}</span>
                {!isCorporateRole && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>

              {/* Tab 4: Form 24Q */}
              <button
                onClick={() => handleTabChange("form24q")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition text-center ${activeTab === "form24q"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : isCorporateRole
                    ? "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    : "text-slate-400 opacity-60 cursor-not-allowed"
                  }`}
              >
                <span>Quarterly Form 24Q Summary</span>
                {!isCorporateRole && <LuLock className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* ROW 2: Contextual Filter Bar */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Controls on the Left */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider pr-1">
                <LuSlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Filters:</span>
              </div>

              {/* PF ECR & ESIC Filter */}
              {(activeTab === "pf_ecr" || activeTab === "esic") && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Wage Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium shadow-2xs cursor-pointer hover:border-slate-300 transition"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form 16 Filters */}
              {activeTab === "form16" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Employee:</span>
                    {isCorporateRole ? (
                      <select
                        value={selectedEmpId}
                        onChange={(e) => setSelectedEmpId(e.target.value)}
                        className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium max-w-xs shadow-2xs cursor-pointer hover:border-slate-300 transition"
                      >
                        {employeeList.map((e) => {
                          const empCode = e.employee_id || e.employee_code;
                          const empName = e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || empCode;
                          return (
                            <option key={e.id || empCode} value={empCode}>
                              {empName} ({empCode})
                            </option>
                          );
                        })}
                        {!employeeList.length && (
                          <option value={currentEmpId}>Current User ({currentEmpId})</option>
                        )}
                      </select>
                    ) : (
                      <div className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                        <LuLock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Self ({currentEmpId})</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Financial Year:</span>
                    <select
                      value={selectedFY}
                      onChange={(e) => setSelectedFY(e.target.value)}
                      className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium shadow-2xs cursor-pointer hover:border-slate-300 transition"
                    >
                      <option value="2025-2026">2025-2026 (AY 2026-27)</option>
                      <option value="2024-2025">2024-2025 (AY 2025-26)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Form 24Q Filters */}
              {activeTab === "form24q" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Quarter:</span>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(e.target.value)}
                      className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium shadow-2xs cursor-pointer hover:border-slate-300 transition"
                    >
                      <option value="Q1">Q1 (Apr - Jun)</option>
                      <option value="Q2">Q2 (Jul - Sep)</option>
                      <option value="Q3">Q3 (Oct - Dec)</option>
                      <option value="Q4">Q4 (Jan - Mar)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Financial Year:</span>
                    <select
                      value={selectedFY}
                      onChange={(e) => setSelectedFY(e.target.value)}
                      className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium shadow-2xs cursor-pointer hover:border-slate-300 transition"
                    >
                      <option value="2025-2026">2025-2026</option>
                      <option value="2024-2025">2024-2025</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Contextual Status / Badge on the Right of Row 2 */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {activeTab === "pf_ecr" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">
                  <LuLandmark className="w-3.5 h-3.5 text-indigo-600" />
                  <span>EPFO Portal Upload • #~# 11 Columns</span>
                </span>
              )}
              {activeTab === "esic" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">
                  <LuBuilding2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ESIC Wage Ceiling: ₹21,000 / month</span>
                </span>
              )}
              {activeTab === "form16" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">
                  <LuFileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Section 203 IT Act, 1961 • TAN CALZ01928F</span>
                </span>
              )}
              {activeTab === "form24q" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-600">
                  <LuFileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>Quarterly Section 192 TDS Return</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CUSTOM ANIMATED TAB LOADER: Displayed whenever loading is active for that tab */}
        {loading && (
          <StatutoryCustomLoader
            activeTab={activeTab}
            selectedMonth={selectedMonth}
            selectedFY={selectedFY}
            selectedQuarter={selectedQuarter}
            selectedEmpId={selectedEmpId}
          />
        )}

        {/* =========================================================================
            TAB 1: PF ECR TEXT FORMAT (.txt)
        ========================================================================= */}
        {!loading && activeTab === "pf_ecr" && pfData && (
          <div className="space-y-6">
            {/* EPFO Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Total Members</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">{pfData.summary.total_members}</p>
                <p className="text-xs text-slate-500 mt-1">EPF Eligible Employees</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Employee Share (A/c 1)</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  ₹{Number(pfData.summary.total_ee_share).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">12% of EPF Wages (capped ₹15k)</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Employer EPS (A/c 10)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{Number(pfData.summary.total_eps_share).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">8.33% Pension Share (max ₹1,250)</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-700 to-blue-800 text-white p-5 rounded-2xl shadow-sm">
                <p className="text-xs uppercase font-medium text-indigo-200">Consolidated Challan</p>
                <p className="text-3xl font-extrabold mt-1">
                  ₹{Number(pfData.summary.total_challan_payable).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-indigo-200 mt-1">Includes A/c 1, 2, 10 & 21</p>
              </div>
            </div>

            {/* Action Card: Download Raw ECR & View Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    EPFO Unified Portal ECR File (#~# Text Format)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compliant with Official EPFO 11-column upload specs. Establishment:{" "}
                    <strong>{pfData.company_info.establishment_code}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyEcr}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                  >
                    {copiedEcr ? <LuCheck className="w-4 h-4 text-emerald-600" /> : <LuCopy className="w-4 h-4" />}
                    <span>{copiedEcr ? "Copied" : "Copy Raw Text"}</span>
                  </button>

                  <button
                    onClick={handleDownloadPfEcr}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-indigo-200"
                  >
                    <LuDownload className="w-4 h-4" />
                    <span>Download EPFO ECR Text File (.txt)</span>
                  </button>
                </div>
              </div>

              {/* Raw Text Preview Box */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Raw File Content Preview (First 5 Rows)
                </label>
                <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre border border-slate-800 leading-relaxed shadow-inner">
                  {pfData.rows
                    .slice(0, 5)
                    .map((r) => r.raw_line)
                    .join("\n")}
                  {pfData.rows.length > 5 && `\n... (+ ${pfData.rows.length - 5} more member rows)`}
                </div>
              </div>
            </div>

            {/* Member Breakdown Table with Salary Structure Mapping */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Member Contribution Breakdown (11 Columns)</h4>
                  <p className="text-xs text-slate-500">Mapped according to employee basic salary structures and statutory caps</p>
                </div>
                <span className="text-xs text-slate-500 font-semibold">{pfData.rows.length} Total Records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">UAN</th>
                      <th className="py-2.5 px-3">Member Name</th>
                      <th className="py-2.5 px-3">Gross Wages</th>
                      <th className="py-2.5 px-3">Basic (Structure)</th>
                      <th className="py-2.5 px-3">EPF Wage</th>
                      <th className="py-2.5 px-3 text-indigo-700">EE Share (12%)</th>
                      <th className="py-2.5 px-3 text-blue-700">EPS Share (8.33%)</th>
                      <th className="py-2.5 px-3 text-emerald-700">ER Share (3.67%)</th>
                      <th className="py-2.5 px-3">NCP</th>
                      <th className="py-2.5 px-3 text-right">Data Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pfData.rows.map((r) => (
                      <tr key={r.uan} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{r.uan}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          <div>{r.member_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.employee_id}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <div>₹{Number(r.gross_wages).toLocaleString("en-IN")}</div>
                          <div className="text-[10px] text-slate-400 font-sans font-normal">
                            Basic ₹{Number(r.basic_pay || 0).toLocaleString("en-IN")} + Allowances ₹{Number(Math.max(0, r.gross_wages - (r.basic_pay || 0))).toLocaleString("en-IN")}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">₹{Number(r.basic_pay || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-mono">₹{Number(r.epf_wages).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-700 font-mono">
                          ₹{Number(r.ee_share).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700 font-mono">
                          ₹{Number(r.eps_share).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700 font-mono">
                          ₹{Number(r.er_share).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center">{r.ncp_days}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {r.data_source || "STRUCTURE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ESIC MONTHLY RETURN FORMAT
        ========================================================================= */}
        {!loading && activeTab === "esic" && esicData && (
          <div className="space-y-6">
            {/* ESIC Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Insured Persons (IP)</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">{esicData.summary.total_covered_employees}</p>
                <p className="text-xs text-slate-500 mt-1">Wages ≤ ₹21,000 / Covered</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Employee Contrib (0.75%)</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  ₹{Number(esicData.summary.total_employee_contribution).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Deducted from salary</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Employer Contrib (3.25%)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ₹{Number(esicData.summary.total_employer_contribution).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Company Share</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm">
                <p className="text-xs uppercase font-medium text-emerald-100">Total ESIC Challan (4%)</p>
                <p className="text-3xl font-extrabold mt-1">
                  ₹{Number(esicData.summary.total_challan_amount).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-emerald-100 mt-1">Official monthly remittance</p>
              </div>
            </div>

            {/* ESIC Actions & Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">ESIC Monthly Return Master Sheet</h4>
                  <p className="text-xs text-slate-500">
                    Employer Code: <strong>{esicData.company_info.esic_code}</strong> • {esicData.rows.length} Covered Employees (Wages ≤ ₹21,000)
                  </p>
                </div>

                <button
                  onClick={handleDownloadEsicCsv}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <LuDownload className="w-4 h-4" />
                  <span>Export ESIC Portal CSV (.csv)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">IP Number</th>
                      <th className="py-2.5 px-3">IP Name</th>
                      <th className="py-2.5 px-3">Paid Days</th>
                      <th className="py-2.5 px-3">Monthly Wages (₹)</th>
                      <th className="py-2.5 px-3">Basic (Structure)</th>
                      <th className="py-2.5 px-3">Allowances</th>
                      <th className="py-2.5 px-3 text-emerald-700">EE (0.75%)</th>
                      <th className="py-2.5 px-3 text-blue-700">ER (3.25%)</th>
                      <th className="py-2.5 px-3 font-bold text-slate-900">Total (4.00%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {esicData.rows.map((r) => (
                      <tr key={r.ip_number} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{r.ip_number}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          <div>{r.ip_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.employee_id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{r.paid_days}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">₹{Number(r.monthly_wages).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">₹{Number(r.basic_pay || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">₹{Number(r.allowances || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700 font-mono">
                          ₹{Number(r.employee_contribution).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700 font-mono">
                          ₹{Number(r.employer_contribution).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                          ₹{Number(r.total_contribution).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: FORM 16 ANNUAL CERTIFICATE (SECTION 203)
        ========================================================================= */}
        {!loading && activeTab === "form16" && form16Data && (
          <div className="space-y-6">
            {/* Top Action Bar for Form 16 */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Certificate No: <strong className="font-mono text-slate-800">{form16Data.certificate_info.certificate_number}</strong> • Assessment Year: <strong>{form16Data.certificate_info.assessment_year}</strong>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
              >
                <LuPrinter className="w-4 h-4" />
                <span>Print / Save Form 16 Certificate</span>
              </button>
            </div>

            {/* Official Form 16 Layout */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-lg p-6 sm:p-10 space-y-8 font-sans print:border-none print:shadow-none print:p-0">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-6">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">
                  FORM NO. 16
                </div>
                <div className="text-xs text-slate-500 italic mb-2">[See rule 31(1)(a)]</div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Certificate under section 203 of the Income-tax Act, 1961
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl mx-auto">
                  For tax deducted at source on salary paid to an employee under section 192 or permitted under section 194B
                </p>
              </div>

              {/* Master Parties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                {/* Deductor */}
                <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                    1. Employer / Deductor Details
                  </span>
                  <div className="text-sm font-bold text-slate-900">{form16Data.deductor.company_name}</div>
                  <div className="text-xs text-slate-600">{form16Data.deductor.address}</div>
                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">PAN of Employer:</span>
                      <strong className="font-mono text-slate-800">{form16Data.deductor.pan}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">TAN of Deductor:</span>
                      <strong className="font-mono text-slate-800">{form16Data.deductor.tan}</strong>
                    </div>
                  </div>
                </div>

                {/* Deductee */}
                <div className="space-y-2 md:pl-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                    2. Employee / Deductee Details
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {form16Data.deductee.name} ({form16Data.deductee.employee_id})
                  </div>
                  <div className="text-xs text-slate-600">
                    Designation: {form16Data.deductee.designation} • Dept: {form16Data.deductee.department}
                  </div>
                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">PAN of Employee:</span>
                      <strong className="font-mono text-slate-800">{form16Data.deductee.pan}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Financial Year:</span>
                      <strong className="text-slate-800">{form16Data.certificate_info.financial_year}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* SALARY STRUCTURE DATA MAPPING SECTION */}
              {form16Data.salary_structure_mapping && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <LuLayers className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Salary Structure Mapping (u/s 17(1))
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-700 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">
                      {form16Data.salary_structure_mapping.recorded_payrolls >= 12
                        ? "12-Month Payroll Ledger Mapped"
                        : "Extrapolated from Configured Salary Structure"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Basic (45%)</span>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(form16Data.salary_structure_mapping.annual.basic).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ₹{Number(form16Data.salary_structure_mapping.monthly.basic).toLocaleString("en-IN")}/mo
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">HRA (40%)</span>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(form16Data.salary_structure_mapping.annual.hra).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ₹{Number(form16Data.salary_structure_mapping.monthly.hra).toLocaleString("en-IN")}/mo
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Conveyance</span>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(form16Data.salary_structure_mapping.annual.conveyance).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ₹{Number(form16Data.salary_structure_mapping.monthly.conveyance).toLocaleString("en-IN")}/mo
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Medical</span>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(form16Data.salary_structure_mapping.annual.medical).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ₹{Number(form16Data.salary_structure_mapping.monthly.medical).toLocaleString("en-IN")}/mo
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Special Allowances</span>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(form16Data.salary_structure_mapping.annual.allowance).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ₹{Number(form16Data.salary_structure_mapping.monthly.allowance).toLocaleString("en-IN")}/mo
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200">
                      <span className="text-indigo-800 block text-[10px] uppercase font-bold">Annual Gross (17-1)</span>
                      <span className="font-mono font-extrabold text-indigo-900 text-sm">
                        ₹{Number(form16Data.salary_structure_mapping.annual.gross).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-indigo-600 block">Full Fiscal Payout</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PART A: Quarterly Challan Receipts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                    PART A — Quarterly Summary of Tax Deducted and Deposited (OLTAS Verified)
                  </h3>
                  <span className="text-xs text-indigo-700 font-semibold">BSR Code: {form16Data.deductor.bsr_code}</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Quarter</th>
                        <th className="py-2.5 px-3">Receipt / OLTAS Ref</th>
                        <th className="py-2.5 px-3">Amount Credited</th>
                        <th className="py-2.5 px-3">Tax Deducted</th>
                        <th className="py-2.5 px-3">Tax Deposited</th>
                        <th className="py-2.5 px-3">Challan Date</th>
                        <th className="py-2.5 px-3">Serial No</th>
                        <th className="py-2.5 px-3">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {form16Data.part_a.quarters.map((q) => (
                        <tr key={q.quarter} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{q.quarter}</td>
                          <td className="py-2.5 px-3">{q.receipt_number}</td>
                          <td className="py-2.5 px-3">₹{Number(q.amount_credited).toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-700">
                            ₹{Number(q.tax_deducted).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">
                            ₹{Number(q.tax_deposited).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3">{q.deposit_date}</td>
                          <td className="py-2.5 px-3">{q.challan_serial_no}</td>
                          <td className="py-2.5 px-3 font-sans text-emerald-700 font-medium text-[11px]">
                            {q.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-slate-600">
                          Total Annual Tax Deposited:
                        </td>
                        <td className="py-2.5 px-3 text-indigo-700 font-mono">
                          ₹{Number(form16Data.part_a.total_tax_deducted).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 font-mono">
                          ₹{Number(form16Data.part_a.total_tax_deposited).toLocaleString("en-IN")}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* PART B: Salary Computation & Deductions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                    PART B — Details of Salary Paid and Deductions Computed
                  </h3>
                  <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded font-semibold text-slate-700">
                    Regime: {form16Data.certificate_info.regime_applied}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-slate-50/70 font-semibold">
                        <td className="py-2.5 px-4">1. Gross Salary u/s 17(1)</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-900 text-sm font-bold">
                          ₹{Number(form16Data.part_b.gross_salary_17_1).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-6 text-slate-600">(a) Salary as per provisions contained in section 17(1)</td>
                        <td className="py-2 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.gross_salary_17_1).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4">2. Less: Allowances exempt under section 10 (HRA / Conveyance)</td>
                        <td className="py-2 px-4 text-right font-mono text-slate-700">
                          - ₹{Number(form16Data.part_b.less_allowances_exempt_10).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/40">
                        <td className="py-2 px-4 font-semibold">3. Balance (1 - 2)</td>
                        <td className="py-2 px-4 text-right font-mono font-semibold">
                          ₹{Number(form16Data.part_b.balance_after_exemptions).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4">4. Deductions under section 16:</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6 text-slate-600">(a) Standard deduction under section 16(ia)</td>
                        <td className="py-1.5 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.deductions_under_16.standard_deduction_16_ia).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6 text-slate-600">(b) Tax on employment under section 16(iii) (PT)</td>
                        <td className="py-1.5 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.deductions_under_16.professional_tax_16_iii).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/70 font-semibold">
                        <td className="py-2.5 px-4">5. Income chargeable under the head 'Salaries' (3 - 4)</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(form16Data.part_b.income_chargeable_under_salaries).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4">6. Deductions under Chapter VI-A (Section 80C, 80D, 80CCD):</td>
                        <td className="py-2 px-4 text-right font-mono text-slate-700">
                          - ₹{Number(form16Data.part_b.deductions_chapter_vi_a.total_chapter_vi_a).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr className="bg-indigo-50/50 font-bold">
                        <td className="py-3 px-4 text-indigo-950 text-sm">7. Total Taxable Income (5 - 6)</td>
                        <td className="py-3 px-4 text-right font-mono text-indigo-900 text-sm">
                          ₹{Number(form16Data.part_b.total_taxable_income).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4">8. Tax on Total Income</td>
                        <td className="py-2 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.tax_on_total_income).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4">9. Rebate under section 87A</td>
                        <td className="py-2 px-4 text-right font-mono text-emerald-600">
                          - ₹{Number(form16Data.part_b.rebate_87a).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4">10. Health and Education Cess (4%)</td>
                        <td className="py-2 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.health_and_education_cess).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-extrabold text-slate-900">
                        <td className="py-3 px-4 text-sm">11. Net Tax Payable</td>
                        <td className="py-3 px-4 text-right font-mono text-sm">
                          ₹{Number(form16Data.part_b.net_tax_payable).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr className="font-semibold text-emerald-700">
                        <td className="py-2.5 px-4">12. Total TDS Deducted and Deposited</td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.total_tds_deducted).toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-emerald-900">
                        <td className="py-2.5 px-4">13. Balance Tax Payable / (Refundable)</td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          ₹{Number(form16Data.part_b.balance_tax_payable).toLocaleString("en-IN")} (NIL)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verification & Official Seal */}
              <div className="border border-emerald-200 rounded-2xl p-6 bg-emerald-50/40 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <LuShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>DIGITALLY SIGNED & OFFICIALLY VERIFIED</span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-lg">
                    I, <strong>{form16Data.verification.signatory_name}</strong>, in my capacity as{" "}
                    <strong>{form16Data.verification.signatory_designation}</strong>, certify that a sum of ₹
                    {Number(form16Data.part_a.total_tax_deposited).toLocaleString("en-IN")} has been deducted and
                    deposited to the credit of the Central Government.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Place: {form16Data.verification.place} • Date: {form16Data.verification.date}
                  </p>
                </div>

                <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-200 pt-4 sm:pt-0 sm:pl-6">
                  <div className="font-mono text-xs text-slate-500">Class 3 Corporate DSC</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{form16Data.verification.signatory_name}</div>
                  <div className="text-xs text-slate-500">{form16Data.verification.signatory_designation}</div>
                  <div className="text-[11px] font-semibold text-emerald-700 mt-1">Zentelex Technologies Pvt. Ltd.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: QUARTERLY FORM 24Q SUMMARY (ANNEXURE I & II)
        ========================================================================= */}
        {!loading && activeTab === "form24q" && form24qData && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Total Deductees</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">{form24qData.summary.total_deductees}</p>
                <p className="text-xs text-slate-500 mt-1">Section 192 (Salaries)</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Quarterly Gross Disbursed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{Number(form24qData.summary.total_gross_paid).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Salary Payouts</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs uppercase font-bold text-slate-400">Quarterly TDS Deducted</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  ₹{Number(form24qData.summary.total_tds_deducted).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Income Tax Deducted</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-700 to-blue-800 text-white p-5 rounded-2xl shadow-sm">
                <p className="text-xs uppercase font-medium text-indigo-200">Challan Deposit (TDS+Cess)</p>
                <p className="text-3xl font-extrabold mt-1">
                  ₹{Number(form24qData.summary.total_challan_deposited).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-indigo-200 mt-1">OLTAS Remittance</p>
              </div>
            </div>

            {/* Annexure I: Challan Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Annexure I — Deductor Challan Details (Section 200(3))
                  </h4>
                  <p className="text-xs text-slate-500">
                    Quarter: {form24qData.quarter} ({form24qData.financial_year}) • TAN:{" "}
                    <strong>{form24qData.company_info.tan}</strong>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">BSR Code</th>
                      <th className="py-2.5 px-3">Date of Deposit</th>
                      <th className="py-2.5 px-3">Serial No</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">TDS (₹)</th>
                      <th className="py-2.5 px-3">Cess (4%)</th>
                      <th className="py-2.5 px-3 text-indigo-700 font-bold">Total Deposited</th>
                      <th className="py-2.5 px-3">Bank Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {form24qData.annexure_i.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{c.bsr_code}</td>
                        <td className="py-2.5 px-3">{c.date_of_deposit}</td>
                        <td className="py-2.5 px-3">{c.challan_serial_no}</td>
                        <td className="py-2.5 px-3 font-sans font-medium">{c.section_code}</td>
                        <td className="py-2.5 px-3 font-semibold">₹{Number(c.tds_amount).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3">₹{Number(c.education_cess).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-700">
                          ₹{Number(c.total_challan_deposit).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">{c.bank_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Annexure II: Deductee Details Table with Salary Structure components */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Annexure II — Employee Deductee Records (Section 192)
                  </h4>
                  <p className="text-xs text-slate-500">
                    {form24qData.annexure_ii.length} Deductee Records for {form24qData.quarter} • Mapped from salary structures
                  </p>
                </div>

                <button
                  onClick={handleDownloadForm24Q}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <LuDownload className="w-4 h-4" />
                  <span>Export Form 24Q Annexure CSV (.csv)</span>
                </button>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">PAN</th>
                      <th className="py-2.5 px-3">Deductee Name</th>
                      <th className="py-2.5 px-3">Gross Paid (₹)</th>
                      <th className="py-2.5 px-3">Basic (Structure)</th>
                      <th className="py-2.5 px-3">Rate</th>
                      <th className="py-2.5 px-3 text-indigo-700">TDS (₹)</th>
                      <th className="py-2.5 px-3">Cess</th>
                      <th className="py-2.5 px-3 font-bold text-slate-900">Total Deposited</th>
                      <th className="py-2.5 px-3">Certificate Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {form24qData.annexure_ii.map((d) => (
                      <tr key={d.employee_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400">{d.deductee_code}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{d.pan}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">
                          <div>{d.name}</div>
                          <div className="text-[10px] text-slate-400">{d.employee_id}</div>
                        </td>
                        <td className="py-2 px-3 font-semibold">₹{Number(d.amount_paid).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 text-slate-600">₹{Number(d.basic_component || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 text-center">{d.tds_rate}</td>
                        <td className="py-2 px-3 font-bold text-indigo-700">
                          ₹{Number(d.tax_deducted).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3">₹{Number(d.cess).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          ₹{Number(d.total_tax_deposited).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans">{d.certificate_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
