import React, { useState } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { LuCalendar, LuList, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import holidaysImg from "../../assets/holidays.png";

// Company Holiday List as requested
const HOLIDAYS_LIST = [
  { id: 1, name: "New Year Day", day: "Thursday", date: "January 1", dateStr: "2026-01-01", month: "JAN", dayNum: 1, type: "Public" },
  { id: 2, name: "Republic Day", day: "Monday", date: "January 26", dateStr: "2026-01-26", month: "JAN", dayNum: 26, type: "National" },
  { id: 3, name: "Holi Festival", day: "Wednesday", date: "March 25", dateStr: "2026-03-25", month: "MAR", dayNum: 25, type: "Festival" },
  { id: 4, name: "Independence Day", day: "Saturday", date: "August 15", dateStr: "2026-08-15", month: "AUG", dayNum: 15, type: "National" },
  { id: 5, name: "Gandhi Jayanti", day: "Friday", date: "October 2", dateStr: "2026-10-02", month: "OCT", dayNum: 2, type: "National" },
  { id: 6, name: "Durga Puja (Maha Saptami)", day: "Thursday", date: "October 8", dateStr: "2026-10-08", month: "OCT", dayNum: 8, type: "Festival" },
  { id: 7, name: "Durga Puja (Maha Ashtami)", day: "Friday", date: "October 9", dateStr: "2026-10-09", month: "OCT", dayNum: 9, type: "Festival" },
  { id: 8, name: "Durga Puja (Vijaya Dashami)", day: "Saturday", date: "October 10", dateStr: "2026-10-10", month: "OCT", dayNum: 10, type: "Festival" },
  { id: 9, name: "Diwali / Deepavali", day: "Sunday", date: "November 8", dateStr: "2026-11-08", month: "NOV", dayNum: 8, type: "Festival" },
  { id: 10, name: "Christmas Day", day: "Friday", date: "December 25", dateStr: "2026-12-25", month: "DEC", dayNum: 25, type: "Public" }
];

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

  // Real-time running date & month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed (6 = July)
  const todayDayNum = now.getDate();

  // Initialize pairIdx centered on current running month (e.g. Jul/Aug = pairIdx 3)
  const [pairIdx, setPairIdx] = useState(Math.floor(currentMonthIdx / 2));
  const [selectedYear, setSelectedYear] = useState(currentYear);

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

  // Dynamic Today & Upcoming Cards Calculator
  const getTodayHolidayInfo = () => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayHoliday = HOLIDAYS_LIST.find((h) => h.dateStr === todayStr);

    const formattedToday = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    });

    if (todayHoliday) {
      return {
        dateStr: `Today ${formattedToday}`,
        title: todayHoliday.name,
        subtext: "Company branches will be closed today for holiday"
      };
    }

    return {
      dateStr: `Today ${formattedToday}`,
      title: "Regular Working Day",
      subtext: "Company branches are open (09:00 AM to 05:00 PM)"
    };
  };

  const getUpcomingHolidayInfo = () => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const sorted = [...HOLIDAYS_LIST].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const upcoming = sorted.find((h) => h.dateStr >= todayStr) || sorted[0];

    return {
      dateStr: `Upcoming ${upcoming.date}`,
      title: upcoming.name,
      subtext: "Company branches will be closed from 09:00 AM to 05:00 PM"
    };
  };

  const todayInfo = getTodayHolidayInfo();
  const upcomingInfo = getUpcomingHolidayInfo();

  // Render a calendar grid for a given month
  const renderMonthCalendar = (mInfo) => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totalCells = [];

    // Empty lead cells
    for (let i = 0; i < mInfo.startWeekday; i++) {
      totalCells.push({ type: "prev", val: 31 - mInfo.startWeekday + i + 1 });
    }

    // Days of current month
    for (let d = 1; d <= mInfo.daysCount; d++) {
      totalCells.push({ type: "current", val: d });
    }

    // Trailing cells
    const remaining = (7 - (totalCells.length % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      totalCells.push({ type: "next", val: r });
    }

    return (
      <div className="w-full">
        <h3 className="text-sm font-bold tracking-widest text-slate-800 mb-4 text-center md:text-left">
          {mInfo.name}
        </h3>

        {/* Weekdays row */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mb-2">
          {weekdays.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 text-center text-xs gap-y-2">
          {totalCells.map((cell, idx) => {
            if (cell.type !== "current") {
              return (
                <div key={idx} className="py-1.5 text-slate-300">
                  {cell.val}
                </div>
              );
            }

            // Check if today or holiday
            const isToday = mInfo.year === currentYear && mInfo.monthIdx === currentMonthIdx && cell.val === todayDayNum;
            const isHoliday = HOLIDAYS_LIST.some((h) => {
              const mName = mInfo.name.split(" ")[0];
              return h.month === mName && h.dayNum === cell.val;
            });

            return (
              <div key={idx} className="py-1.5 flex items-center justify-center relative">
                {isToday ? (
                  <span className="w-7 h-7 flex items-center justify-center bg-slate-900 text-white font-bold rounded-lg shadow-sm">
                    {cell.val}
                  </span>
                ) : isHoliday ? (
                  <span className="relative font-bold text-slate-900 cursor-pointer">
                    {cell.val}
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full"></span>
                  </span>
                ) : (
                  <span className="text-slate-600 font-medium hover:text-slate-900">{cell.val}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: "#e2e8f0", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }} className="py-8 px-4 flex items-center justify-center">
      {/* Custom Scoped CSS */}
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
          padding: 6px 16px;
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
        .holiday-table-row {
          transition: all 0.2s ease;
          border-radius: 12px;
        }
        .holiday-table-row:hover {
          background-color: #f8fafc;
        }
        .active-indicator-bar {
          width: 4px;
          height: 24px;
          background-color: #0f172a;
          border-radius: 4px;
        }
      `}</style>

      <div className="w-full max-w-5xl holiday-card p-6 md:p-10">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight m-0">
              Holiday Calendar
            </h2>
            <p className="text-xs text-slate-400 m-0 mt-1">
              Active schedule for {monthsData[currentMonthIdx]?.name}
            </p>
          </div>

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
                  <span className="h-3 w-3 rounded-full bg-slate-900 mt-1"></span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{todayInfo.dateStr}</div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">{todayInfo.title}</div>
                    <div className="text-[11px] text-slate-400 italic mt-0.5">{todayInfo.subtext}</div>
                  </div>
                </div>

                <div className="hidden md:block h-10 w-[1px] bg-slate-200"></div>

                {/* Upcoming Card */}
                <div className="flex items-start gap-3">
                  <span className="h-3 w-3 rounded-full bg-rose-500 mt-1"></span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{upcomingInfo.dateStr}</div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">{upcomingInfo.title}</div>
                    <div className="text-[11px] text-slate-400 italic mt-0.5">{upcomingInfo.subtext}</div>
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
            <Col xs={12} lg={5} className="flex flex-col justify-between">
              <div>
                <div className="bg-slate-50/80 rounded-3xl p-6 mb-6 flex justify-center border border-slate-100">
                  <img
                    src={holidaysImg}
                    alt="Holiday Illustration"
                    className="w-full max-w-[260px] h-auto object-contain"
                  />
                </div>

                <div className="space-y-5">
                  {/* Today Card */}
                  <div className="flex items-start gap-3">
                    <span className="h-3 w-3 rounded-full bg-slate-900 mt-1"></span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{todayInfo.dateStr}</div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">{todayInfo.title}</div>
                      <div className="text-[11px] text-slate-400 italic mt-0.5">{todayInfo.subtext}</div>
                    </div>
                  </div>

                  <div className="h-[1px] w-full bg-slate-100"></div>

                  {/* Upcoming Card */}
                  <div className="flex items-start gap-3">
                    <span className="h-3 w-3 rounded-full bg-rose-500 mt-1"></span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{upcomingInfo.dateStr}</div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">{upcomingInfo.title}</div>
                      <div className="text-[11px] text-slate-400 italic mt-0.5">{upcomingInfo.subtext}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column: Holiday Table List */}
            <Col xs={12} lg={7}>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
                {/* Table Header */}
                <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 px-3">
                  <div className="col-span-6">HOLIDAY</div>
                  <div className="col-span-3 text-center">DAY</div>
                  <div className="col-span-3 text-right">DATE</div>
                </div>

                {/* Table List Rows */}
                <div className="divide-y divide-slate-100/60 mt-1">
                  {HOLIDAYS_LIST.map((h) => {
                    const isUpcomingNext = upcomingInfo.title === h.name;
                    return (
                      <div
                        key={h.id}
                        className="holiday-table-row grid grid-cols-12 items-center py-3.5 px-3"
                      >
                        <div className="col-span-6 flex items-center gap-2.5">
                          {isUpcomingNext ? (
                            <div className="active-indicator-bar"></div>
                          ) : (
                            <div className="w-1 h-6"></div>
                          )}
                          <span className="text-xs font-bold text-slate-800">{h.name}</span>
                        </div>
                        <div className="col-span-3 text-center text-xs text-slate-500 font-medium">
                          {h.day}
                        </div>
                        <div className="col-span-3 text-right text-xs text-slate-700 font-semibold">
                          {h.date}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
};

export default Holiday;
