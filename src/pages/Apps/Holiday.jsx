import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Modal, Badge, Button } from "react-bootstrap";
import {
  LuCalendar,
  LuList,
  LuChevronLeft,
  LuChevronRight,
  LuMapPin,
  LuGlobe,
  LuBuilding2,
  LuLayers,
  LuSparkles,
  LuInfo,
  LuArrowRight
} from "react-icons/lu";
import holidaysImg from "../../assets/holidays.png";
import { getApiBaseUrl } from "../../api/axios";

const API = getApiBaseUrl();

const BRANCH_CONFIG = [
  { id: "All", label: "All Branches", icon: LuGlobe, tag: "Company-wide", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { id: "Kolkata", label: "Kolkata (HQ)", icon: LuBuilding2, tag: "West Bengal", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Mumbai", label: "Mumbai", icon: LuMapPin, tag: "Maharashtra", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Bengaluru", label: "Bengaluru", icon: LuMapPin, tag: "Karnataka", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Delhi NCR", label: "Delhi NCR", icon: LuMapPin, tag: "Capital Region", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "Odisha", label: "Odisha", icon: LuMapPin, tag: "Eastern Zone", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "International - Dubai", label: "Dubai (UAE)", icon: LuGlobe, tag: "Middle East", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "International - London", label: "London (UK)", icon: LuGlobe, tag: "Europe", color: "bg-indigo-50 text-indigo-700 border-indigo-200" }
];

// Fallback initial Company Holiday List
const HOLIDAYS_LIST = [
  { id: 1, name: "New Year Day", day: "Thursday", date: "January 1", dateStr: "2026-01-01", month: "JAN", dayNum: 1, type: "Public", branch_location: "All" },
  { id: 2, name: "Republic Day", day: "Monday", date: "January 26", dateStr: "2026-01-26", month: "JAN", dayNum: 26, type: "National", branch_location: "All" },
  { id: 3, name: "Holi Festival", day: "Wednesday", date: "March 25", dateStr: "2026-03-25", month: "MAR", dayNum: 25, type: "Festival", branch_location: "All" },
  { id: 4, name: "Independence Day", day: "Saturday", date: "August 15", dateStr: "2026-08-15", month: "AUG", dayNum: 15, type: "National", branch_location: "All" },
  { id: 5, name: "Gandhi Jayanti", day: "Friday", date: "October 2", dateStr: "2026-10-02", month: "OCT", dayNum: 2, type: "National", branch_location: "All" },
  { id: 6, name: "Durga Puja (Maha Saptami)", day: "Saturday", date: "October 17", dateStr: "2026-10-17", month: "OCT", dayNum: 17, type: "Festival", branch_location: "Kolkata" },
  { id: 7, name: "Durga Puja (Maha Ashtami)", day: "Sunday", date: "October 18", dateStr: "2026-10-18", month: "OCT", dayNum: 18, type: "Festival", branch_location: "Kolkata" },
  { id: 8, name: "Durga Puja (Maha Navami)", day: "Tuesday", date: "October 20", dateStr: "2026-10-20", month: "OCT", dayNum: 20, type: "Festival", branch_location: "Kolkata" },
  { id: 9, name: "Durga Puja (Bijoya Dashami)", day: "Wednesday", date: "October 21", dateStr: "2026-10-21", month: "OCT", dayNum: 21, type: "Festival", branch_location: "Kolkata" },
  { id: 10, name: "Diwali / Deepavali", day: "Sunday", date: "November 8", dateStr: "2026-11-08", month: "NOV", dayNum: 8, type: "Festival", branch_location: "All" },
  { id: 11, name: "Christmas Day", day: "Friday", date: "December 25", dateStr: "2026-12-25", month: "DEC", dayNum: 25, type: "Public", branch_location: "All" }
];

// Helper to determine badge styling for a branch
export const getBranchBadgeStyle = (branch) => {
  const b = (branch || "All").toLowerCase();
  if (b.includes("mumbai")) return { bg: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300", label: "Mumbai" };
  if (b.includes("bengaluru") || b.includes("bangalore")) return { bg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300", label: "Bengaluru" };
  if (b.includes("kolkata")) return { bg: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300", label: "Kolkata (HQ)" };
  if (b.includes("odisha")) return { bg: "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300", label: "Odisha" };
  if (b.includes("delhi")) return { bg: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300", label: "Delhi NCR" };
  if (b.includes("dubai")) return { bg: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300", label: "Dubai (UAE)" };
  if (b.includes("london")) return { bg: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300", label: "London (UK)" };
  if (b.includes("international")) return { bg: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300", label: branch };
  return { bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300", label: "All Branches" };
};

// Dynamic Month Generator for any month & year
const getMonthDetails = (year, monthIdx) => {
  const date = new Date(year, monthIdx, 1);
  const monthShort = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const daysCount = new Date(year, monthIdx + 1, 0).getDate();
  const startWeekday = date.getDay(); // 0 = Sun, 1 = Mon ...
  return {
    name: `${monthShort} ${year}`,
    monthIdx,
    year,
    daysCount,
    startWeekday
  };
};

const Holiday = () => {
  const [viewMode, setViewMode] = useState("calendar"); // "list" or "calendar"
  const [holidays, setHolidays] = useState(HOLIDAYS_LIST);
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [userBaseBranch, setUserBaseBranch] = useState("Kolkata");
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [branchSummaries, setBranchSummaries] = useState([]);

  // Detect logged in employee's base location
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const loc = u.work_location || u.location || u.branch || "Kolkata";
        setUserBaseBranch(loc);
      }
    } catch (_) {}
  }, []);

  // Real-time running date & month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const todayDayNum = now.getDate();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  // Initialize pairIdx centered on current running month
  const [pairIdx, setPairIdx] = useState(Math.floor(currentMonthIdx / 2));
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Fetch dynamic holidays from central backend
  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/holidays`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        setHolidays(data.data);
      }
    } catch (err) {
      console.error("Error fetching dynamic holidays:", err);
    }
  };

  // Fetch branch comparison summary
  const fetchBranchSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/holidays/branches`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        setBranchSummaries(data.data);
      }
    } catch (err) {
      console.warn("Could not fetch branch summary:", err.message);
    }
  };

  useEffect(() => {
    fetchHolidays();
    fetchBranchSummary();

    const handleHolidayUpdate = () => {
      fetchHolidays();
      fetchBranchSummary();
    };
    window.addEventListener("holiday-updated", handleHolidayUpdate);

    const handleStorageUpdate = (e) => {
      if (e.key === "holiday_last_updated") {
        fetchHolidays();
        fetchBranchSummary();
      }
    };
    window.addEventListener("storage", handleStorageUpdate);

    const pollInterval = setInterval(fetchHolidays, 8000);

    return () => {
      window.removeEventListener("holiday-updated", handleHolidayUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Filter holidays based on active branch selection
  const filteredHolidays = useMemo(() => {
    if (selectedBranch === "All") {
      return holidays;
    }
    const bLower = selectedBranch.toLowerCase();
    return holidays.filter((h) => {
      const hLoc = (h.branch_location || "All").toLowerCase();
      return (
        hLoc === "all" ||
        hLoc === "all branches" ||
        hLoc === bLower ||
        hLoc.includes(bLower) ||
        bLower.includes(hLoc)
      );
    });
  }, [holidays, selectedBranch]);

  // Generate 12 dynamic months for selectedYear
  const monthsData = Array.from({ length: 12 }, (_, i) => getMonthDetails(selectedYear, i));
  const month1 = monthsData[pairIdx * 2] || monthsData[0];
  const month2 = monthsData[pairIdx * 2 + 1] || monthsData[1];

  const handlePrevPair = () => {
    if (pairIdx > 0) setPairIdx(pairIdx - 1);
    else if (selectedYear > 2020) {
      setSelectedYear(selectedYear - 1);
      setPairIdx(5);
    }
  };

  const handleNextPair = () => {
    if (pairIdx < 5) setPairIdx(pairIdx + 1);
    else {
      setSelectedYear(selectedYear + 1);
      setPairIdx(0);
    }
  };

  // Branch stats
  const universalCount = holidays.filter(h => (h.branch_location || "All") === "All").length;
  const branchSpecificCount = filteredHolidays.filter(h => (h.branch_location || "All") !== "All").length;

  // Dynamic Today & Upcoming Cards Calculator
  const getTodayHolidayInfo = () => {
    const activeDateStr = selectedDateStr || todayStr;
    const isToday = activeDateStr === todayStr;
    const activeHoliday = filteredHolidays.find((h) => h.dateStr === activeDateStr);

    const dObj = new Date(`${activeDateStr}T12:00:00+05:30`);
    const formattedDate = dObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    });

    const prefix = isToday ? "Today" : "Selected";

    if (activeHoliday) {
      const isWorkingDay = Boolean(activeHoliday.is_working_day || activeHoliday.type === "Working Day");
      const branchTag = activeHoliday.branch_location && activeHoliday.branch_location !== "All"
        ? `📍 ${activeHoliday.branch_location} Branch`
        : "🏢 Universal (All Branches)";
      return {
        dateStr: `${prefix} ${formattedDate}`,
        title: activeHoliday.name,
        branchTag,
        notes: activeHoliday.notes || "",
        subtext: isWorkingDay
          ? `Assigned Working Day — ${branchTag} open as scheduled`
          : `Company offices closed today for ${branchTag}`,
        isWorkingDay,
        branchLocation: activeHoliday.branch_location || "All"
      };
    }

    return {
      dateStr: `${prefix} ${formattedDate}`,
      title: "Regular Working Day",
      branchTag: "All Operational Branches",
      subtext: "Standard business hours apply (09:00 AM to 06:00 PM)",
      isWorkingDay: true
    };
  };

  const getUpcomingHolidayInfo = () => {
    const activeDateStr = selectedDateStr || todayStr;
    const activeHoliday = filteredHolidays.find((h) => h.dateStr === activeDateStr);

    const sorted = [...filteredHolidays].sort((a, b) => (a.dateStr || "").localeCompare(b.dateStr || ""));

    let upcoming = sorted.find((h) => {
      if (!h.dateStr) return false;
      if (h.dateStr <= activeDateStr) return false;
      if (activeHoliday && h.dateStr === activeHoliday.dateStr) return false;
      return true;
    });

    if (!upcoming) {
      upcoming = sorted.find((h) => {
        if (!h.dateStr) return false;
        if (h.dateStr <= todayStr) return false;
        if (activeHoliday && h.dateStr === activeHoliday.dateStr) return false;
        return true;
      });
    }

    if (!upcoming && sorted.length > 0) {
      upcoming = sorted.find((h) => {
        if (!h.dateStr) return false;
        if (h.dateStr === activeDateStr) return false;
        if (activeHoliday && h.dateStr === activeHoliday.dateStr) return false;
        return true;
      });
    }

    if (!upcoming) {
      return {
        dateStr: "No Upcoming Holiday",
        title: "All scheduled holidays completed",
        branchTag: "All Branches",
        subtext: "Regular office timings apply"
      };
    }

    const isUpcomingWorkingDay = Boolean(upcoming.is_working_day || upcoming.type === "Working Day");
    const branchTag = upcoming.branch_location && upcoming.branch_location !== "All"
      ? `📍 ${upcoming.branch_location} Branch`
      : "🏢 Universal (All Branches)";

    return {
      dateStr: `Upcoming ${upcoming.date || upcoming.dateStr}`,
      title: upcoming.name,
      branchTag,
      notes: upcoming.notes || "",
      subtext: isUpcomingWorkingDay
        ? `Assigned Working Day (${branchTag})`
        : `Closed for ${branchTag}`,
      isWorkingDay: isUpcomingWorkingDay,
      branchLocation: upcoming.branch_location || "All"
    };
  };

  const todayInfo = getTodayHolidayInfo();
  const upcomingInfo = getUpcomingHolidayInfo();

  // Render calendar grid for a month
  const renderMonthCalendar = (mInfo) => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totalCells = [];

    for (let i = 0; i < mInfo.startWeekday; i++) {
      totalCells.push({ type: "prev", val: 31 - mInfo.startWeekday + i + 1 });
    }

    for (let d = 1; d <= mInfo.daysCount; d++) {
      totalCells.push({ type: "current", val: d });
    }

    const remaining = (7 - (totalCells.length % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      totalCells.push({ type: "next", val: r });
    }

    return (
      <div className="w-full">
        <h3 className="text-sm font-bold tracking-widest text-slate-800 dark:text-slate-100 mb-4 text-center md:text-left">
          {mInfo.name}
        </h3>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mb-2">
          {weekdays.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 text-center text-xs gap-y-2">
          {totalCells.map((cell, idx) => {
            if (cell.type !== "current") {
              return (
                <div key={idx} className="py-1.5 text-slate-300 dark:text-slate-600">
                  {cell.val}
                </div>
              );
            }

            const isToday = mInfo.year === currentYear && mInfo.monthIdx === currentMonthIdx && cell.val === todayDayNum;
            const cellDateStr = `${mInfo.year}-${String(mInfo.monthIdx + 1).padStart(2, "0")}-${String(cell.val).padStart(2, "0")}`;
            const isSelected = selectedDateStr === cellDateStr;
            const matchedHoliday = filteredHolidays.find((h) => {
              if (h.dateStr && h.dateStr === cellDateStr) return true;
              const mName = mInfo.name.split(" ")[0].toUpperCase();
              return (h.month || "").toUpperCase() === mName && Number(h.dayNum) === cell.val;
            });
            const isHoliday = Boolean(matchedHoliday);
            const isAssignedWorkingDay = Boolean(matchedHoliday && (matchedHoliday.is_working_day || matchedHoliday.type === "Working Day"));
            const isBranchSpecific = Boolean(matchedHoliday && matchedHoliday.branch_location && matchedHoliday.branch_location !== "All");

            return (
              <div
                key={idx}
                onClick={() => setSelectedDateStr(cellDateStr)}
                className="py-1.5 flex items-center justify-center relative cursor-pointer group"
              >
                {isToday ? (
                  <span
                    className={`w-7 h-7 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg shadow-sm ${
                      isSelected ? (isAssignedWorkingDay ? "ring-2 ring-emerald-500 ring-offset-1" : "ring-2 ring-blue-500 ring-offset-1") : ""
                    }`}
                    title={matchedHoliday ? `${matchedHoliday.name} (${matchedHoliday.branch_location || "All"})` : "Today"}
                  >
                    {cell.val}
                  </span>
                ) : isSelected ? (
                  <span
                    className={`w-7 h-7 flex items-center justify-center font-bold rounded-lg shadow-xs ${
                      isAssignedWorkingDay
                        ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500"
                        : isHoliday
                        ? "bg-rose-100 text-rose-700 ring-2 ring-rose-500"
                        : "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                    }`}
                    title={matchedHoliday ? `${matchedHoliday.name} (${matchedHoliday.branch_location || "All"})` : undefined}
                  >
                    {cell.val}
                  </span>
                ) : isAssignedWorkingDay ? (
                  <span
                    className="relative font-bold text-emerald-600 hover:text-emerald-700"
                    title={`${matchedHoliday?.name || "Working Day"} (${matchedHoliday?.branch_location || "All"})`}
                  >
                    {cell.val}
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>
                  </span>
                ) : isHoliday ? (
                  <span
                    className={`relative font-bold ${isBranchSpecific ? 'text-amber-600 hover:text-amber-700' : 'text-rose-600 hover:text-rose-700'}`}
                    title={`${matchedHoliday?.name || "Holiday"} [${matchedHoliday?.branch_location || "All"}]`}
                  >
                    {cell.val}
                    <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${isBranchSpecific ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                    {isBranchSpecific && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white">{cell.val}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: "#e2e8f0", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="py-8 px-3 md:px-6 flex items-center justify-center">
      {/* Scoped Styling */}
      <style>{`
        .holiday-card {
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .toggle-btn {
          border-radius: 9999px;
          padding: 3px;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        .toggle-item {
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .toggle-item.active {
          background-color: #1e293b;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(30, 41, 59, 0.15);
        }
        .toggle-item.inactive {
          color: #64748b;
        }
        .toggle-item.inactive:hover {
          color: #0f172a;
        }
        .branch-pill {
          transition: all 0.18s ease;
          cursor: pointer;
        }
        .branch-pill.active {
          background-color: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
        }
        .branch-pill:hover:not(.active) {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }
        .holiday-table-row {
          transition: all 0.2s ease;
          border-radius: 12px;
        }
        .holiday-table-row:hover {
          background-color: #f8fafc;
        }
      `}</style>

      <div className="w-full max-w-6xl holiday-card p-5 md:p-9">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Location-Wise Holiday Calendar
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <LuMapPin size={11} /> Multi-Branch Schedule
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-1 flex items-center gap-2 flex-wrap">
              <span>Branch-specific official holidays & active rosters for {monthsData[currentMonthIdx]?.name}</span>
              {userBaseBranch && (
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Your Base Office: <strong>{userBaseBranch}</strong>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Compare Branches Button */}
            <button
              onClick={() => setShowCompareModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300 text-xs font-semibold transition"
              title="Compare all branch holiday quotas & key festivals"
            >
              <LuLayers size={13} className="text-blue-600" /> Compare Branches
            </button>

            {/* Toggle Pill: List / Calendar */}
            <div className="toggle-btn flex items-center">
              <button
                onClick={() => setViewMode("list")}
                className={`toggle-item flex items-center gap-1.5 ${viewMode === "list" ? "active" : "inactive"}`}
              >
                <LuList className="h-4 w-4" /> List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`toggle-item flex items-center gap-1.5 ${viewMode === "calendar" ? "active" : "inactive"}`}
              >
                <LuCalendar className="h-4 w-4" /> Calendar
              </button>
            </div>
          </div>
        </div>

        {/* BRANCH FILTER BAR */}
        <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <LuBuilding2 size={13} className="text-slate-600" /> Select Branch Location
            </span>
            {selectedBranch !== "All" && (
              <button
                onClick={() => setSelectedBranch("All")}
                className="text-[11px] text-blue-600 font-bold hover:underline"
              >
                Reset to All Branches
              </button>
            )}
          </div>

          {/* Horizontal Branch Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {BRANCH_CONFIG.map((b) => {
              const Icon = b.icon;
              const isActive = selectedBranch === b.id;
              const count = b.id === "All"
                ? holidays.length
                : holidays.filter(h => {
                    const hl = (h.branch_location || "All").toLowerCase();
                    return hl === "all" || hl.includes(b.id.toLowerCase());
                  }).length;

              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b.id)}
                  className={`branch-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "active"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  <Icon size={12} className={isActive ? "text-white" : "text-slate-500"} />
                  <span>{b.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Branch Ribbon Summary */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                Viewing: {BRANCH_CONFIG.find(b => b.id === selectedBranch)?.label || selectedBranch}
              </span>
              <span className="text-slate-400">•</span>
              <span>{filteredHolidays.length} Holidays Scheduled</span>
              {selectedBranch !== "All" && (
                <span className="text-slate-500 text-[11px]">
                  ({universalCount} Universal + {branchSpecificCount} {selectedBranch} Regional)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Universal Company Holiday
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Regional Branch Holiday
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Assigned Working Day
              </span>
            </div>
          </div>
        </div>

        {/* CALENDAR VIEW MODE */}
        {viewMode === "calendar" && (
          <div>
            <div className="bg-slate-50/70 border border-slate-100 rounded-3xl p-6 md:p-8 mb-6">
              <Row className="g-5">
                <Col xs={12} md={6}>
                  {renderMonthCalendar(month1)}
                </Col>
                <Col xs={12} md={6}>
                  {renderMonthCalendar(month2)}
                </Col>
              </Row>
            </div>

            {/* Bottom Section with Today & Upcoming Cards + Nav Arrows */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
              <div className="flex flex-wrap items-center gap-8 w-full md:w-auto">
                {/* Today Card */}
                <div className="flex items-start gap-3">
                  <span className={`h-3 w-3 rounded-full mt-1 ${todayInfo.isWorkingDay ? "bg-emerald-500 shadow-xs" : (todayInfo.title === "Regular Working Day" ? "bg-slate-900" : "bg-rose-500")}`}></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-900">{todayInfo.dateStr}</div>
                      {todayInfo.branchTag && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {todayInfo.branchTag}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">{todayInfo.title}</div>
                    <div className="text-[11px] text-slate-400 italic mt-0.5">{todayInfo.subtext}</div>
                    {todayInfo.notes && (
                      <div className="text-[10px] text-slate-500 mt-0.5">ℹ️ {todayInfo.notes}</div>
                    )}
                  </div>
                </div>

                <div className="hidden md:block h-10 w-[1px] bg-slate-200"></div>

                {/* Upcoming Card */}
                <div className="flex items-start gap-3">
                  <span className={`h-3 w-3 rounded-full mt-1 ${upcomingInfo.isWorkingDay ? "bg-emerald-500 shadow-xs" : "bg-rose-500"}`}></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-900">{upcomingInfo.dateStr}</div>
                      {upcomingInfo.branchTag && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {upcomingInfo.branchTag}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">{upcomingInfo.title}</div>
                    <div className="text-[11px] text-slate-400 italic mt-0.5">{upcomingInfo.subtext}</div>
                    {upcomingInfo.notes && (
                      <div className="text-[10px] text-slate-500 mt-0.5">ℹ️ {upcomingInfo.notes}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPair}
                  className="p-2.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
                  title="Previous Months"
                >
                  <LuChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextPair}
                  className="p-2.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
                  title="Next Months"
                >
                  <LuChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIST VIEW MODE */}
        {viewMode === "list" && (
          <Row className="g-6 items-start">
            {/* Left Column: Image Illustration + Today/Upcoming */}
            <Col xs={12} lg={4} className="flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/80 rounded-3xl p-5 mb-5 flex justify-center border border-slate-100">
                  <img
                    src={holidaysImg}
                    alt="Holiday Illustration"
                    className="w-full max-w-[220px] h-auto object-contain"
                  />
                </div>

                <div className="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                  {/* Today Card */}
                  <div className="flex items-start gap-3">
                    <span className={`h-3 w-3 rounded-full mt-1 ${todayInfo.isWorkingDay ? "bg-emerald-500 shadow-xs" : (todayInfo.title === "Regular Working Day" ? "bg-slate-900" : "bg-rose-500")}`}></span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{todayInfo.dateStr}</div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">{todayInfo.title}</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">{todayInfo.subtext}</div>
                    </div>
                  </div>

                  <div className="h-[1px] w-full bg-slate-200"></div>

                  {/* Upcoming Card */}
                  <div className="flex items-start gap-3">
                    <span className={`h-3 w-3 rounded-full mt-1 ${upcomingInfo.isWorkingDay ? "bg-emerald-500 shadow-xs" : "bg-rose-500"}`}></span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{upcomingInfo.dateStr}</div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">{upcomingInfo.title}</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">{upcomingInfo.subtext}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column: Holiday Table List */}
            <Col xs={12} lg={8}>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
                {/* Table Header */}
                <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 px-3">
                  <div className="col-span-5">HOLIDAY / EVENT</div>
                  <div className="col-span-3 text-center">BRANCH / APPLICABILITY</div>
                  <div className="col-span-2 text-center">DAY</div>
                  <div className="col-span-2 text-right">DATE</div>
                </div>

                {/* Table List Rows */}
                <div className="divide-y divide-slate-100/60 mt-1 max-h-[460px] overflow-y-auto pr-1">
                  {filteredHolidays.length > 0 ? (
                    filteredHolidays
                      .slice()
                      .sort((a, b) => (a.dateStr || "").localeCompare(b.dateStr || ""))
                      .map((h, idx) => {
                        const isUpcomingNext = upcomingInfo.title === h.name;
                        const isWorkingDay = Boolean(h.is_working_day || h.type === "Working Day");
                        const branchStyle = getBranchBadgeStyle(h.branch_location);

                        return (
                          <div
                            key={h.id || idx}
                            onClick={() => h.dateStr && setSelectedDateStr(h.dateStr)}
                            className={`holiday-table-row grid grid-cols-12 items-center py-3 px-3 transition-colors cursor-pointer ${
                              selectedDateStr === h.dateStr
                                ? (isWorkingDay ? "bg-emerald-50/80 rounded-2xl" : "bg-rose-50/80 rounded-2xl")
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="col-span-5 flex items-center gap-2">
                              {isUpcomingNext ? (
                                <div className={`w-1 h-6 rounded-full ${isWorkingDay ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                              ) : (
                                <div className="w-1 h-6"></div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800">{h.name}</span>
                                  {isWorkingDay && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Working Day
                                    </span>
                                  )}
                                </div>
                                {h.notes && (
                                  <div className="text-[10px] text-slate-400 line-clamp-1">
                                    {h.notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="col-span-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${branchStyle.bg}`}>
                                <LuMapPin size={10} /> {branchStyle.label}
                              </span>
                            </div>

                            <div className="col-span-2 text-center text-xs text-slate-500 font-medium">
                              {h.day}
                            </div>

                            <div className="col-span-2 text-right">
                              <div className="text-xs text-slate-700 font-semibold">{h.date}</div>
                              <div className={`text-[10px] font-semibold ${isWorkingDay ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isWorkingDay ? 'Working Day' : (h.type || 'Public')}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs italic">
                      No holidays scheduled for this branch selection.
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </div>

      {/* BRANCH COMPARISON MODAL */}
      <Modal show={showCompareModal} onHide={() => setShowCompareModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-b px-4 py-3">
          <Modal.Title className="text-base font-bold text-slate-900 flex items-center gap-2">
            <LuLayers className="text-blue-600" /> Multi-Branch Holiday Comparison Matrix (2026)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 bg-slate-50/50">
          <p className="text-xs text-slate-500 mb-4">
            Comparison of official holidays across corporate locations. Universal holidays (Republic Day, Independence Day, Gandhi Jayanti, New Year, Christmas) apply to all domestic offices, alongside local state festivals.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {BRANCH_CONFIG.filter(b => b.id !== "All").map((branch) => {
              const bHolidays = holidays.filter(h => {
                const hl = (h.branch_location || "All").toLowerCase();
                return hl === "all" || hl.includes(branch.id.toLowerCase());
              });
              const regionalOnly = bHolidays.filter(h => (h.branch_location || "All") !== "All");
              const isSelected = selectedBranch === branch.id;

              return (
                <div
                  key={branch.id}
                  className={`p-3.5 bg-white rounded-2xl border transition shadow-xs ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                        <LuMapPin size={14} />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{branch.label}</div>
                        <div className="text-[10px] text-slate-400">{branch.tag}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {bHolidays.length} Holidays
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 mb-2">
                    <span className="font-semibold text-slate-700">Key Regional Holidays:</span>{" "}
                    {regionalOnly.length > 0 ? (
                      regionalOnly.map(r => r.name).join(", ")
                    ) : (
                      <span className="italic text-slate-400">Universal schedule only</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {universalCount} Universal + {regionalOnly.length} Regional
                    </span>

                    <button
                      onClick={() => {
                        setSelectedBranch(branch.id);
                        setShowCompareModal(false);
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "Active View" : "View Calendar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-t px-4 py-2.5">
          <Button variant="secondary" size="sm" onClick={() => setShowCompareModal(false)} className="rounded-lg text-xs">
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Holiday;
